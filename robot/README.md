# Robot — Excel → Word → REST upload

Python робот, который:
1. Читает Excel-файлы с нагрузкой преподавателей из `input/`.
2. Группирует строки по `teacher_email`, генерирует индивидуальный Word-документ на каждого преподавателя по шаблону `templates/workload_template.docx`.
3. Загружает сгенерированные документы в backend через REST (`/api/generated-documents/upload`), привязывая их к преподавателю по email.
4. Регистрирует запуск через `/api/robot/runs/start` и `/finish` — статистика виден админу в UI на `/admin/robot-runs`.

Робот запускается отдельно от Spring Boot (standalone Python-приложение). Связь только через REST + JWT.

## Установка

Требования: Python 3.10+.

```bash
cd robot
python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# отредактируй .env
```

## Конфигурация (.env)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `BACKEND_URL` | Базовый URL Spring Boot бэкенда | `http://localhost:8080` |
| `ROBOT_USERNAME` | Логин технического пользователя (ROLE_ROBOT) | `robot` |
| `ROBOT_PASSWORD` | Пароль (синхронизирован с backend `app.robot.password` / env `ROBOT_PASSWORD`) | `robot_change_me_2026` |
| `INPUT_DIR` | Папка с входящими Excel | `./input` |
| `OUTPUT_DIR` | Папка для сгенерированных Word | `./output` |
| `TEMPLATE_PATH` | Путь к шаблону docxtpl | `./templates/workload_template.docx` |
| `LOG_LEVEL` | DEBUG / INFO / WARNING / ERROR | `INFO` |

При старте `Config` валидирует обязательные переменные (`BACKEND_URL`, `ROBOT_USERNAME`, `ROBOT_PASSWORD`) — без них робот сразу завершается с ошибкой.

## Структура входного Excel

Файлы должны быть в формате `.xlsx`. Первый лист, первая строка — заголовок.

Обязательные колонки (имена нечувствительны к регистру и пробелам):

| teacher_email | full_name | subject | hours | semester | group_count | additional_info |
|---------------|-----------|---------|-------|----------|-------------|-----------------|
| ivanov@univ.kz | Ivanov I.I. | Algorithms | 64 | Fall 2025 | 3 | Stream 102 |
| ivanov@univ.kz | Ivanov I.I. | Databases | 32 | Fall 2025 | 2 | |
| petrov@univ.kz | Petrov P.P. | Operating Systems | 48 | Fall 2025 | 2 | Lab+Lect |

Правила:
- Пустые строки и строки без `teacher_email` / `subject` пропускаются.
- Email валидируется по простому regex; невалидные строки логируются и пропускаются.
- Несколько строк на одного `teacher_email` объединяются в один Word-документ.
- `hours` и `group_count` приводятся к int (пустое → 0).

## Запуск

```bash
source venv/bin/activate
python main.py
```

Что произойдёт:
1. Робот логинится в backend (`POST /api/login`), получает JWT.
2. Для каждого `*.xlsx` в `INPUT_DIR` создаёт `RobotRun`, обрабатывает строки, генерирует и загружает .docx, закрывает run.
3. Обработанный Excel перемещается в `input/processed/{timestamp}_{filename}`.

Если в `INPUT_DIR` нет файлов — робот пишет `No files to process` и выходит.

## Расписание

**Linux/macOS (cron, понедельник 02:00):**
```cron
0 2 * * 1 cd /path/to/robot && /path/to/robot/venv/bin/python main.py >> robot.cron.log 2>&1
```

**Windows (Task Scheduler):**
1. Открой Task Scheduler → Create Basic Task.
2. Trigger: Weekly, Monday 02:00.
3. Action: Start a program.
   - Program: `C:\path\to\robot\venv\Scripts\python.exe`
   - Arguments: `main.py`
   - Start in: `C:\path\to\robot`

## Логи

Все события пишутся одновременно в `robot.log` (файл) и stdout. Формат:
```
2026-05-10 02:00:01 [INFO] robot: Robot starting up. Backend=http://localhost:8080
2026-05-10 02:00:02 [INFO] robot: Logged in as 'robot'
2026-05-10 02:00:02 [INFO] robot: Started robot run id=42 for file=workload_fall_2025.xlsx
...
```

Уровень настраивается через `LOG_LEVEL` в `.env`.

## Шаблон Word

Если `templates/workload_template.docx` отсутствует, при первом запуске `WordGenerator` создаёт его автоматически. Шаблон использует [docxtpl](https://docxtpl.readthedocs.io/) (синтаксис похожий на Jinja2):

```
INDIVIDUAL WORKLOAD REPORT
Teacher: {{teacher_name}}
Academic year: {{academic_year}}
Semester: {{semester}}

Subjects:
{%p for subj in subjects %}- {{subj.name}} | Hours: {{subj.hours}} | Groups: {{subj.group_count}}{%p endfor %}

Total hours: {{total_hours}}
```

> Используется `{%p for ... %}` (повтор параграфа), а не `{%tr ... %}` — последний работает только внутри таблиц.

Шаблон можно отредактировать вручную в Word — главное сохранить тэги `{{...}}` и `{%p ... %}`.

## Troubleshooting

| Симптом | Причина | Решение |
|---------|---------|---------|
| `Config error: Missing required env vars` | Не создан `.env` или забыли поле | `cp .env.example .env`, заполни все обязательные |
| `Login failed: HTTP 401` | Не совпадает пароль / нет robot-пользователя | Проверь `ROBOT_PASSWORD` в `.env` и в backend `application.yaml` (env `ROBOT_PASSWORD`); robot создаётся в `DataInitializer` при старте Spring Boot |
| `find_user_by_email failed: HTTP 403` | ROBOT не имеет доступа к endpoint | Убедись, что в `SecurityConfig` есть `requestMatchers(GET, "/api/users/by-email/**").hasAnyRole("ADMIN","ROBOT")` |
| `User not found for email: ...` | В системе нет пользователя с таким email | Создай преподавателя в админке /admin/users или исправь Excel |
| `Missing required columns` | Неверные заголовки в Excel | Сверь имена колонок со списком выше |
| `Network error ... Retrying` | Backend временно недоступен | Робот сам ретраит 3 раза с backoff 1/2/4с; если не помогло — проверь, что backend запущен |

## Ссылки

- Backend endpoints: `/api/login`, `/api/users/by-email/{email}`, `/api/robot/runs/start`, `/api/robot/runs/{id}/finish`, `/api/generated-documents/upload`.
- Admin UI для запусков: `http://localhost:8080/...` → фронт `/admin/robot-runs`.
- Сгенерированные документы у преподавателя: фронт `/generated-documents`.
