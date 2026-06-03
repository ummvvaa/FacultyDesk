import logging
import time
from pathlib import Path
from typing import Any, Callable, Optional

import requests


class ApiError(Exception):
    pass


class ApiClient:
    RETRY_ATTEMPTS = 3
    RETRY_BACKOFFS = (1, 2, 4)

    def __init__(self, config, logger: Optional[logging.Logger] = None):
        self.config = config
        self.logger = logger or logging.getLogger("robot")
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.user: Optional[dict] = None
        self.login()

    def _retry(self, func: Callable[[], requests.Response]) -> requests.Response:
        last_exc: Optional[Exception] = None
        for attempt in range(self.RETRY_ATTEMPTS):
            try:
                response = func()
                if 500 <= response.status_code < 600:
                    raise requests.HTTPError(
                        f"Server {response.status_code}: {response.text[:200]}",
                        response=response,
                    )
                return response
            except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as e:
                last_exc = e
                if attempt < self.RETRY_ATTEMPTS - 1:
                    backoff = self.RETRY_BACKOFFS[attempt]
                    self.logger.warning(
                        "Network error (attempt %d/%d): %s. Retrying in %ds",
                        attempt + 1, self.RETRY_ATTEMPTS, e, backoff,
                    )
                    time.sleep(backoff)
        raise ApiError(f"Request failed after {self.RETRY_ATTEMPTS} attempts: {last_exc}")

    def _auth_headers(self) -> dict:
        if not self.token:
            raise ApiError("Not authenticated. Call login() first.")
        return {"Authorization": f"Bearer {self.token}"}

    def login(self) -> None:
        url = f"{self.config.backend_url}/api/login"
        params = {
            "username": self.config.robot_username,
            "password": self.config.robot_password,
        }
        response = self._retry(lambda: self.session.post(url, params=params, timeout=15))
        if response.status_code != 200:
            raise ApiError(f"Login failed: HTTP {response.status_code} — {response.text[:200]}")
        data = response.json()
        token = data.get("token")
        if not token:
            raise ApiError(f"Login response missing token: {data}")
        self.token = token
        self.user = data.get("user")
        self.logger.info("Logged in as '%s'", self.config.robot_username)

    def find_user_by_email(self, email: str) -> Optional[dict]:
        url = f"{self.config.backend_url}/api/users/by-email/{email}"
        response = self._retry(
            lambda: self.session.get(url, headers=self._auth_headers(), timeout=15)
        )
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            raise ApiError(f"find_user_by_email failed: HTTP {response.status_code} — {response.text[:200]}")
        return response.json()

    def find_teacher_by_full_name(self, full_name: str) -> Optional[dict]:
        """Найти teacher в БД по полному ФИО (Фамилия Имя [Отчество]).

        Backend поле middleName отсутствует, поэтому match идёт по
        lastName + firstName (case-insensitive). Если firstName в БД содержит
        пробел ("Жанерке Ерлановна") — match сравнивается с полным ФИО из Excel.
        Возвращает первого найденного teacher или None.
        """
        parts = full_name.strip().split()
        if not parts:
            return None
        last_name = parts[0]
        first_name = parts[1] if len(parts) > 1 else ""
        middle_name = " ".join(parts[2:]) if len(parts) > 2 else ""

        url = f"{self.config.backend_url}/api/users"
        response = self._retry(
            lambda: self.session.get(url, headers=self._auth_headers(), timeout=20)
        )
        if response.status_code != 200:
            raise ApiError(
                f"find_teacher_by_full_name failed: HTTP {response.status_code} — "
                f"{response.text[:200]}"
            )
        users = response.json()
        if not isinstance(users, list):
            return None

        target_full = " ".join(p for p in [last_name, first_name, middle_name] if p).lower()
        target_short = f"{last_name} {first_name}".strip().lower()

        teachers_only = [u for u in users if u.get("role") == "ROLE_TEACHER"]

        # 1. Точный match по lastName + firstName
        for user in teachers_only:
            u_last = (user.get("lastName") or "").strip().lower()
            u_first = (user.get("firstName") or "").strip().lower()
            if not u_last or not u_first:
                continue
            stored_full = f"{u_last} {u_first}".strip()
            if stored_full == target_full or stored_full == target_short:
                return user
            if u_last == last_name.lower() and u_first.startswith(first_name.lower()):
                return user

        # 2. Fallback: lastName/firstName в БД пустые — match по username
        #    (если username совпадает с любой частью ФИО — фамилией или именем).
        name_parts_lower = {p.lower() for p in parts}
        for user in teachers_only:
            uname = (user.get("username") or "").strip().lower()
            if not uname:
                continue
            if uname in name_parts_lower:
                self.logger.info(
                    "Teacher matched by username fallback: '%s' (username=%s, id=%s)",
                    full_name, uname, user.get("id"),
                )
                return user

        self.logger.warning(
            "Teacher not found by full name: '%s' (parsed: last='%s', first='%s'). "
            "Teachers in DB: %d",
            full_name, last_name, first_name, len(teachers_only),
        )
        return None

    def start_run(self, source_file: str) -> int:
        url = f"{self.config.backend_url}/api/robot/runs/start"
        response = self._retry(
            lambda: self.session.post(
                url, json={"sourceFile": source_file},
                headers=self._auth_headers(), timeout=15,
            )
        )
        if response.status_code != 200:
            raise ApiError(f"start_run failed: HTTP {response.status_code} — {response.text[:200]}")
        run_id = response.json().get("id")
        if run_id is None:
            raise ApiError(f"start_run response missing id: {response.text[:200]}")
        self.logger.info("Started robot run id=%s for file=%s", run_id, source_file)
        return int(run_id)

    def finish_run(
        self,
        run_id: int,
        status: str,
        processed: int,
        errors: int,
        generated: int,
        error_log: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> dict:
        url = f"{self.config.backend_url}/api/robot/runs/{run_id}/finish"
        body: dict[str, Any] = {
            "status": status,
            "processedCount": processed,
            "errorCount": errors,
            "generatedCount": generated,
        }
        if error_log is not None:
            body["errorLog"] = error_log
        if summary is not None:
            body["summary"] = summary
        response = self._retry(
            lambda: self.session.put(
                url, json=body, headers=self._auth_headers(), timeout=15
            )
        )
        if response.status_code != 200:
            raise ApiError(f"finish_run failed: HTTP {response.status_code} — {response.text[:200]}")
        self.logger.info("Finished robot run id=%s status=%s", run_id, status)
        return response.json()

    def upload_document(
        self,
        file_path: str,
        teacher_id: int,
        doc_type: str,
        source_excel: str,
        title: str,
        run_id: Optional[int] = None,
    ) -> dict:
        url = f"{self.config.backend_url}/api/generated-documents/upload"
        path = Path(file_path)
        if not path.exists():
            raise ApiError(f"File not found: {file_path}")

        def do_upload():
            with path.open("rb") as f:
                files = {
                    "file": (
                        path.name,
                        f,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    )
                }
                data = {
                    "teacherId": str(teacher_id),
                    "documentType": doc_type,
                    "sourceExcelFile": source_excel,
                    "title": title,
                }
                if run_id is not None:
                    data["robotRunId"] = str(run_id)
                return self.session.post(
                    url, files=files, data=data,
                    headers=self._auth_headers(), timeout=60,
                )

        response = self._retry(do_upload)
        if response.status_code != 200:
            raise ApiError(f"upload_document failed: HTTP {response.status_code} — {response.text[:200]}")
        return response.json()
