-- Power BI Views for task_app database
-- Run manually via psql/DBeaver or auto-executed by DataInitializer on startup
-- Connect Power BI Desktop: Get Data → PostgreSQL → localhost:5432 / task_app

CREATE OR REPLACE VIEW vw_teacher_workload_summary AS
SELECT u.id AS teacher_id, u.username, u.email,
       u.academic_degree, u.position, u.employment_rate,
       COUNT(DISTINCT gd.id) AS generated_docs_count,
       MAX(gd.generation_date) AS last_doc_date
FROM users u
LEFT JOIN generated_documents gd ON gd.teacher_id = u.id
WHERE u.role = 'ROLE_TEACHER'
GROUP BY u.id, u.username, u.email, u.academic_degree, u.position, u.employment_rate;

CREATE OR REPLACE VIEW vw_publication_statistics AS
SELECT u.id AS teacher_id, u.username,
       p.publication_year,
       p.database_type,
       p.publication_type,
       p.quartile,
       p.status,
       COUNT(*) AS pub_count
FROM publications p
JOIN users u ON u.id = p.author_id
GROUP BY u.id, u.username, p.publication_year, p.database_type, p.publication_type, p.quartile, p.status;

CREATE OR REPLACE VIEW vw_report_status_summary AS
SELECT u.id AS teacher_id, u.username,
       r.status,
       r.category_id,
       c.name AS category_name,
       COUNT(*) AS report_count,
       DATE_TRUNC('month', r.created_at::timestamp) AS month
FROM records r
JOIN users u ON u.id = r.author_id
LEFT JOIN categories c ON c.id = r.category_id
GROUP BY u.id, u.username, r.status, r.category_id, c.name, DATE_TRUNC('month', r.created_at::timestamp);

CREATE OR REPLACE VIEW vw_robot_execution_summary AS
SELECT id, started_at, finished_at,
       EXTRACT(EPOCH FROM (finished_at - started_at)) AS duration_seconds,
       status, source_file,
       processed_count, error_count, generated_count,
       DATE_TRUNC('day', started_at) AS day,
       DATE_TRUNC('month', started_at) AS month
FROM robot_runs;

CREATE OR REPLACE VIEW vw_kkk_readiness AS
SELECT u.id AS teacher_id, u.username, u.email,
       u.academic_degree, u.position,
       k.status AS kkk_status,
       k.completion_percentage,
       k.submitted_at,
       k.checked_at,
       (SELECT COUNT(*) FROM publications p WHERE p.author_id = u.id AND p.publication_year >= EXTRACT(YEAR FROM CURRENT_DATE) - 5) AS pubs_last_5_years,
       (SELECT COUNT(*) FROM qualification_courses qc WHERE qc.user_id = u.id AND qc.year >= EXTRACT(YEAR FROM CURRENT_DATE) - 3) AS courses_last_3_years
FROM users u
LEFT JOIN kkk_profiles k ON k.teacher_id = u.id
WHERE u.role = 'ROLE_TEACHER';
