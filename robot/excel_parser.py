import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

import openpyxl


class ExcelParseError(Exception):
    pass


@dataclass
class LoadRow:
    """Одна строка нагрузки преподавателя (одна дисциплина/группа)."""
    num: Optional[str]
    department_code: Optional[str]
    discipline_code: Optional[str]
    discipline_name: str
    groups: str
    lecture_stream: float
    practical_stream: float
    srsp_hours: float
    lecture_hours: float
    practical_hours: float
    lab_hours: float
    norm_hours: float
    semester_1: float
    semester_2: float
    rk_hours: float
    exam_hours: float
    total_hours: float
    program: Optional[str]
    degree: Optional[str]
    contingent: Optional[int]
    contingent_recorded: Optional[int]
    op_department: Optional[str]
    teacher_fio: str
    position: str
    payment_form: str
    staff_hours: float
    rate_total: float
    staff_load_hours: float
    hourly_load_hours: float
    rate_staff: float
    rate_hourly: float


@dataclass
class TeacherWorkload:
    """Агрегированная нагрузка одного преподавателя (один Excel = один препод)."""
    teacher_fio: str
    position: str
    op_department: str
    payment_form: str = ""
    load_rows: List[LoadRow] = field(default_factory=list)

    total_hours_year: float = 0.0
    total_lecture_hours: float = 0.0
    total_practical_hours: float = 0.0
    total_lab_hours: float = 0.0
    total_srsp_hours: float = 0.0
    total_rk_hours: float = 0.0
    total_exam_hours: float = 0.0

    semester_1_total: float = 0.0
    semester_2_total: float = 0.0

    bachelor_disciplines: List[str] = field(default_factory=list)
    master_disciplines: List[str] = field(default_factory=list)
    diploma_supervisions: List[Dict] = field(default_factory=list)


def _to_float(val) -> float:
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s:
        return 0.0
    try:
        return float(s.replace(",", "."))
    except (ValueError, TypeError):
        return 0.0


def _to_str(val) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _to_int_opt(val) -> Optional[int]:
    if val is None or str(val).strip() == "":
        return None
    try:
        return int(_to_float(val))
    except (ValueError, TypeError):
        return None


def _safe_index(row: tuple, idx: int):
    return row[idx] if idx < len(row) else None


class ExcelParser:
    """Парсер реального формата Excel нагрузки кафедры IT.

    Структура: один Excel = один преподаватель. Лист "Лист1", 34 колонки,
    строки R1-R3 — многоуровневые заголовки (пропускаются), данные с R4.
    """

    HEADER_ROWS = 3
    MIN_COLUMNS = 28  # минимум: до колонки "Форма оплаты"

    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or logging.getLogger("robot")

    def parse(self, file_path: str) -> TeacherWorkload:
        path = Path(file_path)
        if not path.exists():
            raise ExcelParseError(f"File not found: {file_path}")

        try:
            wb = openpyxl.load_workbook(path, data_only=True)
        except Exception as e:
            raise ExcelParseError(f"Failed to read {path.name}: {e}") from e

        ws = wb.active
        rows: List[LoadRow] = []
        teacher_fio: Optional[str] = None
        position: Optional[str] = None
        op_department = "КИ"
        payment_form: Optional[str] = None

        for row_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if row_idx <= self.HEADER_ROWS:
                continue
            if all(c is None or str(c).strip() == "" for c in row):
                continue
            disc_name = _to_str(_safe_index(row, 3))
            if not disc_name:
                continue

            load_row = LoadRow(
                num=_to_str(_safe_index(row, 0)),
                department_code=_to_str(_safe_index(row, 1)),
                discipline_code=_to_str(_safe_index(row, 2)),
                discipline_name=disc_name,
                groups=_to_str(_safe_index(row, 4)) or "",
                lecture_stream=_to_float(_safe_index(row, 5)),
                practical_stream=_to_float(_safe_index(row, 6)),
                srsp_hours=_to_float(_safe_index(row, 7)),
                lecture_hours=_to_float(_safe_index(row, 8)),
                practical_hours=_to_float(_safe_index(row, 9)),
                lab_hours=_to_float(_safe_index(row, 10)),
                norm_hours=_to_float(_safe_index(row, 11)),
                semester_1=_to_float(_safe_index(row, 12)),
                semester_2=_to_float(_safe_index(row, 13)),
                rk_hours=_to_float(_safe_index(row, 14)),
                exam_hours=_to_float(_safe_index(row, 15)),
                total_hours=_to_float(_safe_index(row, 16)),
                program=_to_str(_safe_index(row, 20)),
                degree=_to_str(_safe_index(row, 21)),
                contingent=_to_int_opt(_safe_index(row, 22)),
                contingent_recorded=_to_int_opt(_safe_index(row, 23)),
                op_department=_to_str(_safe_index(row, 24)),
                teacher_fio=_to_str(_safe_index(row, 25)) or "",
                position=_to_str(_safe_index(row, 26)) or "",
                payment_form=_to_str(_safe_index(row, 27)) or "",
                staff_hours=_to_float(_safe_index(row, 28)),
                rate_total=_to_float(_safe_index(row, 29)),
                staff_load_hours=_to_float(_safe_index(row, 30)),
                hourly_load_hours=_to_float(_safe_index(row, 31)),
                rate_staff=_to_float(_safe_index(row, 32)),
                rate_hourly=_to_float(_safe_index(row, 33)),
            )
            rows.append(load_row)

            if not teacher_fio and load_row.teacher_fio:
                teacher_fio = load_row.teacher_fio
            if not position and load_row.position:
                position = load_row.position
            if not payment_form and load_row.payment_form:
                payment_form = load_row.payment_form
            if load_row.op_department:
                op_department = load_row.op_department

        if not teacher_fio:
            raise ExcelParseError(
                f"Не найдено ФИО преподавателя в {path.name}. "
                "Проверьте колонку 26 (ФИО ППС)."
            )
        if not rows:
            raise ExcelParseError(
                f"Не найдено ни одной строки нагрузки в {path.name}."
            )

        workload = TeacherWorkload(
            teacher_fio=teacher_fio,
            position=position or "",
            op_department=op_department,
            payment_form=payment_form or "",
            load_rows=rows,
        )

        for r in rows:
            workload.total_hours_year += r.total_hours
            workload.total_lecture_hours += r.lecture_hours
            workload.total_practical_hours += r.practical_hours
            workload.total_lab_hours += r.lab_hours
            workload.total_srsp_hours += r.srsp_hours
            workload.total_rk_hours += r.rk_hours
            workload.total_exam_hours += r.exam_hours
            workload.semester_1_total += r.semester_1
            workload.semester_2_total += r.semester_2

            if r.degree == "бак" and r.discipline_name not in workload.bachelor_disciplines:
                workload.bachelor_disciplines.append(r.discipline_name)
            if r.degree == "маг" and r.discipline_name not in workload.master_disciplines:
                workload.master_disciplines.append(r.discipline_name)

            disc_lower = r.discipline_name.lower()
            if "руководство магистерской" in disc_lower or "магистрант" in disc_lower:
                workload.diploma_supervisions.append({
                    "student": r.groups,
                    "type": r.discipline_name,
                    "hours": r.total_hours,
                })

        self.logger.info(
            "Parsed Excel %s: teacher=%s, rows=%d, total_hours=%.2f",
            path.name, workload.teacher_fio, len(rows), workload.total_hours_year,
        )
        return workload
