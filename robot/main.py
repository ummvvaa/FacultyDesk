import argparse
import shutil
import sys
import traceback
from datetime import datetime
from pathlib import Path

from api_client import ApiClient, ApiError
from config import Config, ConfigError
from excel_parser import ExcelParseError, ExcelParser, TeacherWorkload
from logger import setup_logger
from word_generator import WordGenerator


DOCUMENT_TYPE = "INDIVIDUAL_WORKLOAD"


def discover_excel_files(input_dir: str) -> list[Path]:
    return sorted(p for p in Path(input_dir).glob("*.xlsx") if p.is_file())


def move_processed(file_path: Path, input_dir: str) -> Path:
    processed_dir = Path(input_dir) / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = processed_dir / f"{timestamp}_{file_path.name}"
    shutil.move(str(file_path), str(target))
    return target


def _output_filename(workload: TeacherWorkload) -> str:
    last_name = workload.teacher_fio.split()[0] if workload.teacher_fio else "teacher"
    safe_last = "".join(c if c.isalnum() or c in "_-" else "_" for c in last_name)
    date_str = datetime.now().strftime("%d_%m_%Y")
    return f"F-28_I-05_{date_str}_{safe_last}.docx"


def process_file(
    excel_path: Path,
    api: ApiClient,
    parser: ExcelParser,
    generator: WordGenerator,
    config: Config,
    run_id: int | None,
    logger,
) -> tuple[int, int, int, list[str]]:
    processed = 0
    errors = 0
    generated = 0
    error_log: list[str] = []

    try:
        workload = parser.parse(str(excel_path))
    except ExcelParseError as e:
        logger.error("Excel parse failed for %s: %s", excel_path.name, e)
        return 0, 1, 0, [f"Excel parse failed: {e}"]

    logger.info(
        "Parsed workload for: %s, total hours: %.2f, rows: %d",
        workload.teacher_fio, workload.total_hours_year, len(workload.load_rows),
    )

    try:
        user = api.find_teacher_by_full_name(workload.teacher_fio)
        if not user:
            msg = (
                f"Teacher not found in DB by full name: '{workload.teacher_fio}'. "
                "Admin should create user (lastName/firstName) before running."
            )
            logger.warning(msg)
            return 0, 1, 0, [msg]

        out_dir = Path(config.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / _output_filename(workload)

        generator.generate(
            workload=workload,
            template_path=Path(config.template_path),
            output_path=out_path,
        )
        generated = 1

        title = (
            f"Индивидуальный план — {workload.teacher_fio} "
            f"({datetime.now().year})"
        )
        api.upload_document(
            file_path=str(out_path),
            teacher_id=user["id"],
            doc_type=DOCUMENT_TYPE,
            source_excel=excel_path.name,
            title=title,
            run_id=run_id,
        )
        processed = 1
        logger.info(
            "Processed teacher %s (id=%s, username=%s)",
            workload.teacher_fio, user.get("id"), user.get("username"),
        )
    except (ApiError, OSError) as e:
        errors = 1
        msg = f"{workload.teacher_fio}: {e}"
        error_log.append(msg)
        logger.error("Error processing %s: %s", workload.teacher_fio, e)
    except Exception as e:
        errors = 1
        msg = f"{workload.teacher_fio}: unexpected error: {e}"
        error_log.append(msg)
        logger.exception("Unexpected error processing %s", workload.teacher_fio)

    return processed, errors, generated, error_log


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Robot document generator")
    parser.add_argument("--input", type=str, default=None,
                        help="Path to a specific .xlsx file to process (overrides INPUT_DIR discovery)")
    return parser.parse_args()


def run() -> int:
    args = parse_args()

    try:
        config = Config()
    except ConfigError as e:
        print(f"Config error: {e}", file=sys.stderr)
        return 2

    logger = setup_logger(level=config.log_level)
    logger.info("Robot starting up. Backend=%s", config.backend_url)

    if args.input:
        input_path = Path(args.input)
        if not input_path.exists() or not input_path.is_file():
            logger.error("--input file not found: %s", args.input)
            return 1
        files = [input_path]
        logger.info("Processing single file from --input: %s", input_path)
    else:
        files = discover_excel_files(config.input_dir)

    if not files:
        logger.info("No files to process in %s", config.input_dir)
        return 0

    try:
        api = ApiClient(config, logger=logger)
    except ApiError as e:
        logger.error("Failed to authenticate: %s", e)
        return 3

    parser = ExcelParser(logger=logger)
    generator = WordGenerator(logger=logger)
    overall_status = 0

    for excel_path in files:
        logger.info("=== Processing %s ===", excel_path.name)
        run_id = None
        try:
            run_id = api.start_run(source_file=excel_path.name)
        except ApiError as e:
            logger.error("Could not start run for %s: %s", excel_path.name, e)
            overall_status = 1
            continue

        try:
            processed, errors, generated, error_log = process_file(
                excel_path, api, parser, generator, config, run_id, logger
            )
        except Exception as e:
            logger.error("Fatal error processing %s: %s", excel_path.name, e)
            logger.error(traceback.format_exc())
            try:
                api.finish_run(
                    run_id=run_id, status="FAILED",
                    processed=0, errors=1, generated=0,
                    error_log=str(e), summary=f"Fatal error in {excel_path.name}",
                )
            except ApiError as fe:
                logger.error("finish_run also failed: %s", fe)
            overall_status = 1
            continue

        if errors == 0 and processed > 0:
            status = "SUCCESS"
        elif processed == 0 and errors > 0:
            status = "FAILED"
        elif errors > 0:
            status = "PARTIAL"
        else:
            status = "SUCCESS"

        summary = (
            f"File {excel_path.name}: processed={processed}, "
            f"generated={generated}, errors={errors}"
        )
        try:
            api.finish_run(
                run_id=run_id, status=status,
                processed=processed, errors=errors, generated=generated,
                error_log="\n".join(error_log) if error_log else None,
                summary=summary,
            )
        except ApiError as e:
            logger.error("finish_run failed for run %s: %s", run_id, e)
            overall_status = 1

        try:
            moved = move_processed(excel_path, config.input_dir)
            logger.info("Moved %s -> %s", excel_path.name, moved)
        except OSError as e:
            logger.error("Could not move %s: %s", excel_path.name, e)
            overall_status = 1

    logger.info("Robot done. Files: %d", len(files))
    return overall_status


if __name__ == "__main__":
    sys.exit(run())
