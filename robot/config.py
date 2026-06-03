import os
from dotenv import load_dotenv


class ConfigError(Exception):
    pass


class Config:
    REQUIRED = ("BACKEND_URL", "ROBOT_USERNAME", "ROBOT_PASSWORD")

    def __init__(self):
        load_dotenv()
        self.backend_url = os.getenv("BACKEND_URL", "").rstrip("/")
        self.robot_username = os.getenv("ROBOT_USERNAME", "")
        self.robot_password = os.getenv("ROBOT_PASSWORD", "")
        self.input_dir = os.getenv("INPUT_DIR", "./input")
        self.output_dir = os.getenv("OUTPUT_DIR", "./output")
        self.template_path = os.getenv("TEMPLATE_PATH", "./templates/teacher_workload_template.docx")
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self._validate()

    def _validate(self):
        missing = []
        if not self.backend_url:
            missing.append("BACKEND_URL")
        if not self.robot_username:
            missing.append("ROBOT_USERNAME")
        if not self.robot_password:
            missing.append("ROBOT_PASSWORD")
        if missing:
            raise ConfigError(
                "Missing required env vars: " + ", ".join(missing)
                + ". Copy .env.example to .env and fill it in."
            )
