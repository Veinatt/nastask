# NasTask Backend

Express + SQLite HTTP API для трекера времени (без бота и cron).

## Стек

- Node.js 20+
- Express 5
- better-sqlite3
- date-fns / date-fns-tz

## API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | healthcheck |
| POST | `/api/intervals/start` | старт таймера |
| POST | `/api/intervals/manual` | ручной интервал + workItems |
| PUT | `/api/intervals/:id/pause\|resume\|complete` | пауза / продолжение / завершение |
| GET | `/api/intervals/active` | активные интервалы |
| GET | `/api/intervals/completed?date=YYYY-MM-DD` | завершённые за день |
| GET | `/api/intervals/report/salary\|tax` | отчёты за месяц |
| PUT/DELETE | `/api/intervals/:id` | правка / удаление |
| GET/POST/DELETE | `/api/categories\|descriptions\|units` | справочники |
| GET/PUT | `/api/settings` | ставка, налог, валюта, timezone |

Все `/api/*` требуют `Authorization: tma <initData>`, кроме локального `AUTH_DEV_BYPASS=true` (+ `X-User-Id`).

## Локальный запуск

```bash
cp .env.example .env   # если есть
npm install
npm run dev
```

Ключевые переменные: `PORT`, `DATABASE_PATH`, `AUTH_DEV_BYPASS`, `BOT_TOKEN` (для prod initData), `INIT_DATA_MAX_AGE_SEC`, `MEMORY_EXPORT_KEY` (для `GET /api/memory/export`).

### Memory quiz (NasTale)

Тексты вопросов живут на клиенте (локали). Сервер хранит только ответы.

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/memory/questions` | tma — `{ id }[]` (whitelist) |
| GET/POST | `/api/memory/answers` | tma — per user |
| GET | `/api/memory/export?userId=` | header `X-Export-Key` |

Таблица `memory_quiz`: `userId`, `questionId`, `answer`, `answeredAt`, `updatedAt` (UNIQUE userId+questionId).

```bash
curl -H "X-Export-Key: $MEMORY_EXPORT_KEY" \
  "https://<host>/api/memory/export"
# optional filter:
curl -H "X-Export-Key: $MEMORY_EXPORT_KEY" \
  "https://<host>/api/memory/export?userId=123456789"
```

После правки `.env` локально — полный рестарт процесса (nodemon `.env` не смотрит). В логе: `MEMORY_EXPORT_KEY=set`.

БД по умолчанию: `./data/nastask.sqlite`. При старте legacy-таблицы `tasks`/`reminders` удаляются; создаётся схема трекера времени + `memory_quiz`.
