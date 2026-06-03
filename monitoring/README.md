# Monitoring Stack

ELK (Elasticsearch + Kibana + Filebeat) + Grafana для мониторинга backend.

## Запуск

```bash
cd monitoring
docker-compose up -d
```

Первый старт: Elasticsearch поднимается ~30-60 сек. Дождись healthcheck'а перед началом работы.

## Доступ

| Сервис | URL | Логин |
|--------|-----|-------|
| Grafana | http://localhost:3001 | admin / admin123 |
| Kibana | http://localhost:5601 | — (без auth) |
| Elasticsearch | http://localhost:9200 | — (xpack.security=false) |
| Backend health | http://localhost:8080/actuator/health | — |

## Что мониторится

**Логи (Elasticsearch index `logs-faculty-YYYY.MM.dd`):**
- Все INFO/WARN/ERROR логи backend в JSON формате
- Логи запускаются через Filebeat → Elasticsearch
- Kibana Discover: создай index pattern `logs-faculty-*` → поле времени `@timestamp`

**Метрики (Elasticsearch index `metrics-faculty*`):**
- HTTP request latency (p50/p95/p99), error rate, request count
- Micrometer → micrometer-registry-elastic → ES каждые 10 сек

**Grafana dashboard `Faculty Logs Overview`:**
- Log Count by Level (INFO/WARN/ERROR timeseries)
- Recent Errors (последние 50)
- Robot Run Events
- AI Requests (Groq/AiService)

## Kibana — первый вход

1. Открой http://localhost:5601
2. Management → Stack Management → Index Patterns → Create
3. Index pattern: `logs-faculty-*` → Time field: `@timestamp` → Create
4. Discover → видны логи backend

## Проверка работы

```bash
# Elasticsearch cluster health
curl http://localhost:9200/_cluster/health

# Количество логов
curl "http://localhost:9200/logs-faculty-*/_count"

# Количество метрик (появляются через 10 сек после старта backend)
curl "http://localhost:9200/metrics-faculty*/_count"
```

## Остановка

```bash
docker-compose down
```

## Удаление с данными

```bash
docker-compose down -v
```

## Troubleshooting

### Логи не попадают в Elasticsearch
- Убедись что backend запущен и папка `logs/` существует (создаётся автоматически при первом логе)
- Filebeat логи: `docker logs faculty-filebeat`
- Filebeat монтирует `../logs` (относительно monitoring/), то есть корень проекта `logs/`

### Elasticsearch не стартует
- Проверь `docker logs faculty-elasticsearch`
- Для macOS: `sysctl -w vm.max_map_count=262144` (иначе ES падает с bootstrap check)
- Добавь в /etc/sysctl.conf: `vm.max_map_count=262144`

### Grafana datasource ошибка
- Elasticsearch datasource provisioning: `grafana/provisioning/datasources/elasticsearch.yml`
- Grafana → Data Sources → Elasticsearch-Logs → "Save & test" → должно показать `Data source is working`

### PostgreSQL datasource не работает
- Пароль в `grafana/provisioning/datasources/postgres.yml` должен совпадать с `application.yaml`

## Порты (memo)

| Порт | Сервис |
|------|--------|
| 3000 | React frontend |
| 3001 | **Grafana** |
| 5432 | PostgreSQL |
| 5601 | **Kibana** |
| 8080 | Spring Boot backend |
| 9200 | **Elasticsearch** |
