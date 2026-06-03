# Power BI Integration Guide

## Overview

Power BI Desktop connects directly to the PostgreSQL database `task_app` via the native PostgreSQL connector (ODBC). The application creates five pre-built views on startup for common reporting scenarios.

---

## Connecting Power BI Desktop to PostgreSQL

1. Open **Power BI Desktop**
2. Click **Get Data** → **More…** → search for **PostgreSQL database** → **Connect**
3. Enter connection details:
   - **Server:** `localhost:5432`
   - **Database:** `task_app`
4. Select **Database** authentication tab:
   - **User name:** `postgres` (or your configured DB user)
   - **Password:** (your DB password)
5. Click **Connect**
6. In the **Navigator**, expand `task_app` → `public` and select the views listed below
7. Click **Transform Data** to open Power Query Editor, or **Load** to import directly

> **Note:** You may need to install the [npgsql PostgreSQL ODBC driver](https://www.npgsql.org/) if it is not already available.

---

## Available Views

### `vw_teacher_workload_summary`

Summarises generated document activity per teacher.

| Column | Type | Description |
|---|---|---|
| teacher_id | bigint | Teacher's user ID |
| username | varchar | Username |
| email | varchar | Email address |
| academic_degree | varchar | Academic degree (e.g. PhD) |
| position | varchar | Position title |
| employment_rate | decimal | Employment rate (0.5 – 2.0) |
| generated_docs_count | bigint | Total generated documents |
| last_doc_date | timestamp | Date of most recent generated document |

**Suggested visualisation:** Card showing `generated_docs_count` average; Table with all teachers sorted by `last_doc_date` desc.

---

### `vw_publication_statistics`

Publication counts grouped by teacher, year, database type, type, quartile and status.

| Column | Type | Description |
|---|---|---|
| teacher_id | bigint | Author's user ID |
| username | varchar | Author username |
| publication_year | int | Year of publication |
| database_type | varchar | SCOPUS / WEB_OF_SCIENCE / KOKSON / LOCAL / OTHER |
| publication_type | varchar | JOURNAL_ARTICLE / CONFERENCE_PAPER / etc. |
| quartile | varchar | Q1 / Q2 / Q3 / Q4 / NONE |
| status | varchar | DRAFT / SUBMITTED / VERIFIED / REJECTED |
| pub_count | bigint | Count matching this combination |

**Suggested visualisation:**
- **Stacked Bar Chart** — X-axis: `publication_year`, Values: `pub_count`, Legend: `database_type`
- **Slicer** on `status` = VERIFIED for verified publications only
- **Matrix** — Rows: `username`, Columns: `database_type`, Values: `SUM(pub_count)`

---

### `vw_report_status_summary`

Report (record) counts per teacher, status, category and month.

| Column | Type | Description |
|---|---|---|
| teacher_id | bigint | Author's user ID |
| username | varchar | Author username |
| status | varchar | PENDING / APPROVED / REJECTED / RETURNED |
| category_id | bigint | Category ID |
| category_name | varchar | Category name |
| report_count | bigint | Count for this combination |
| month | timestamp | Month bucket (first day of month) |

**Suggested visualisation:**
- **100% Stacked Column Chart** — X-axis: `month`, Values: `report_count`, Legend: `status`
- **Slicer** on `username` for per-teacher drill-down

---

### `vw_robot_execution_summary`

Robot run history with timing and outcome metrics.

| Column | Type | Description |
|---|---|---|
| id | bigint | Robot run ID |
| started_at | timestamp | Start time |
| finished_at | timestamp | Finish time |
| duration_seconds | float | Run duration in seconds |
| status | varchar | RUNNING / SUCCESS / FAILED / PARTIAL |
| source_file | varchar | Source Excel file name |
| processed_count | int | Rows processed |
| error_count | int | Rows with errors |
| generated_count | int | Documents generated |
| day | timestamp | Day bucket |
| month | timestamp | Month bucket |

**Suggested visualisation:**
- **Time-series Line Chart** — X-axis: `started_at`, Y-axis: `generated_count`, with `error_count` as second line
- **Conditional formatting** on `status` column: SUCCESS = green, FAILED = red, PARTIAL = orange

---

### `vw_kkk_readiness`

KKK (qualification portfolio) readiness per teacher, including related publication and course counts.

| Column | Type | Description |
|---|---|---|
| teacher_id | bigint | Teacher's user ID |
| username | varchar | Username |
| email | varchar | Email |
| academic_degree | varchar | Academic degree |
| position | varchar | Position |
| kkk_status | varchar | NOT_STARTED / SUBMITTED / CHECKED / READY / RETURNED_FOR_CORRECTION |
| completion_percentage | int | Portfolio completion 0–100 |
| submitted_at | timestamp | Submission date |
| checked_at | timestamp | Review date |
| pubs_last_5_years | bigint | Publication count (last 5 years) |
| courses_last_3_years | bigint | Qualification course count (last 3 years) |

**Suggested visualisation:**
- **Card** — Average `completion_percentage` across all teachers
- **Horizontal Bar Chart** — Y-axis: `username`, X-axis: `completion_percentage` (sorted desc)
- **KPI** — `kkk_status` = READY vs total teachers

---

## Scheduled Refresh

To keep Power BI reports up to date:

1. Publish the `.pbix` report to **Power BI Service** (requires Pro licence)
2. Go to **Dataset settings** → **Scheduled refresh**
3. Set refresh frequency: **Daily** (e.g. 07:00)
4. Configure an **On-premises data gateway** pointing to the PostgreSQL server

> For local development without Power BI Service, simply click **Refresh** manually in Power BI Desktop.

---

## TODO

- [ ] Add screenshot: Stacked Bar Chart — Publications by Year
- [ ] Add screenshot: Horizontal Bar — KKK Readiness
- [ ] Add screenshot: Time-series — Robot Execution
- [ ] Add screenshot: 100% Stacked Column — Report Status
