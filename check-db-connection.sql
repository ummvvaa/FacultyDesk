-- Скрипт для проверки подключения к PostgreSQL
-- Используйте этот скрипт для проверки пароля и создания базы данных

-- Подключитесь к PostgreSQL как суперпользователь:
-- psql -U postgres

-- Или если нужен пароль:
-- PGPASSWORD=ваш_пароль psql -U postgres -h localhost

-- 1. Проверка подключения (должно вывести информацию о подключении)
SELECT version();

-- 2. Проверка существования базы данных task_app
SELECT datname FROM pg_database WHERE datname = 'task_app';

-- 3. Создание базы данных (если её нет)
CREATE DATABASE task_app;

-- 4. Создание пользователя postgres с паролем 0000 (если нужно)
-- ALTER USER postgres WITH PASSWORD '0000';

-- 5. Предоставление прав (если нужно)
-- GRANT ALL PRIVILEGES ON DATABASE task_app TO postgres;

