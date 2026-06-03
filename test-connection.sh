#!/bin/bash
# Скрипт для проверки подключения к базе данных

echo "🔍 Проверка подключения к PostgreSQL..."

# Путь к psql (PostgreSQL 17)
PSQL_PATH="/Library/PostgreSQL/17/bin/psql"

# Параметры подключения
DB_USER="postgres"
DB_PASSWORD="0000"
DB_NAME="task_app"

# Проверка существования psql
if [ ! -f "$PSQL_PATH" ]; then
    echo "❌ psql не найден по пути: $PSQL_PATH"
    echo "Попробуйте найти psql: find /Library/PostgreSQL -name psql"
    exit 1
fi

echo "✅ psql найден: $PSQL_PATH"

# Проверка подключения
export PGPASSWORD=$DB_PASSWORD
echo "🔐 Попытка подключения к базе данных '$DB_NAME'..."

$PSQL_PATH -U $DB_USER -d $DB_NAME -c "SELECT 'Подключение успешно!' as status, current_database() as database;" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Подключение к базе данных успешно!"
    echo ""
    echo "📊 Проверка таблиц:"
    $PSQL_PATH -U $DB_USER -d $DB_NAME -c "\dt" 2>&1
else
    echo "❌ Ошибка подключения к базе данных"
    exit 1
fi

unset PGPASSWORD

