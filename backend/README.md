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

Ключевые переменные: `PORT`, `DATABASE_PATH`, `AUTH_DEV_BYPASS`, `BOT_TOKEN` (для prod initData), `INIT_DATA_MAX_AGE_SEC`.

БД по умолчанию: `./data/nastask.sqlite`. При старте legacy-таблицы `tasks`/`reminders` удаляются; создаётся схема трекера времени.
