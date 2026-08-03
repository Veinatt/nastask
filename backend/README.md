# NasTask Backend

Express + SQLite + Telegraf + node-cron.

Настройки пользователя хранятся отдельно от reminders.

## Стек

- Node.js 20+
- Express
- better-sqlite3
- Telegraf
- node-cron
- date-fns

## API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | healthcheck |
| GET | `/api/settings/:userId` | настройки (создаёт дефолт, если нет) |
| PUT | `/api/settings` | обновить настройки (+ recalc только при смене графика/лидов) |
| POST | `/api/reminders` | upsert reminder |
| PUT | `/api/reminders/:taskId` | upsert reminder |
| DELETE | `/api/reminders/:taskId` | удалить reminder |

Все `/api/*` требуют заголовок `Authorization: tma <initData>` (подпись Telegram Mini App),
кроме локального режима `AUTH_DEV_BYPASS=true`.

### Settings

```json
PUT /api/settings
{
  "userId": 123456789,
  "workSchedule": { "monday": { "enabled": true, "start": "09:00", "end": "18:00" } },
  "exceptions": [{ "date": "2026-08-15", "isOff": true }],
  "newTaskReminder": { "enabled": false, "interval": "1h" },
  "reminderLeadTime": 1
}
```

### Reminder upsert

Лишние поля (`workSchedule`, …) игнорируются — schedule берётся из `user_settings`.

```json
{
  "taskId": "uuid",
  "userId": 123456789,
  "title": "Баннеры",
  "interval": "1h",
  "startTime": "2026-08-03T10:00:00.000Z",
  "deadline": null
}
```

Время в БД — Unix **seconds** (UTC).

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run dev
```

В `.env` для разработки без Telegram WebView оставь `AUTH_DEV_BYPASS=true`.
В проде — `AUTH_DEV_BYPASS=false` или удали переменную.

Сервер: `http://localhost:5000`. Нужен `/start` у бота хотя бы раз.

## Сборка / Render

```bash
npm run build
npm start
```

### Чеклист продакшена

1. `AUTH_DEV_BYPASS=false` (или переменная удалена) — обязательна проверка `initData`.
2. Persistent Disk для SQLite (`DATABASE_PATH`), иначе reminders/tasks пропадут при редеплое.
3. `BOT_TOKEN` и `WEBAPP_URL` (HTTPS фронта Mini App).
4. Часовой пояс хоста или поле `timezone` пользователя (см. настройки) — рабочие окна считаются в TZ пользователя.
5. Пользователь один раз пишет боту `/start`.

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/tasks` | задачи текущего пользователя |
| POST | `/api/tasks` | создать задачу (+ reminder если active) |
| PUT | `/api/tasks/:id` | обновить |
| POST | `/api/tasks/:id/complete` | завершить |
| DELETE | `/api/tasks/:id` | удалить |
