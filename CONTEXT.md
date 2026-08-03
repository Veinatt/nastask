# NasTask — контекст проекта (handoff)

Документ для продолжения работы на другом ПК / в новом чате с агентом.  
Обновлено: 2026-08-03.

---

## 1. Что это

**NasTask** — персональный трекер задач для фрилансера-дизайнера как **Telegram Mini App**.

Возможности:
- задачи: название, количество, коэффициент, интервал напоминаний, старт, дедлайн;
- настройки рабочего времени (по дням + исключения), упреждение старта/дедлайна, «проверьте новые задачи»;
- push в Telegram через бота (не Web Notifications);
- отчёты: список / календарь, Excel-экспорт;
- светлая/тёмная тема через Telegram SDK.

Исходный продуктовый план: [`mainplan.md`](mainplan.md).  
Backend README: [`backend/README.md`](backend/README.md).

---

## 2. Стек и структура репо

```
nastask/
  frontend/     React + TS + Vite + Dexie + shadcn + @telegram-apps/sdk-react
  backend/      Express + SQLite (better-sqlite3) + Telegraf + node-cron + date-fns-tz
  mainplan.md
  CONTEXT.md    ← этот файл
```

| Часть | Технологии |
|-------|------------|
| Frontend | React 19, Vite, Dexie (кеш + offline queue), react-hook-form + zod, xlsx |
| Backend | Express 5, SQLite, Telegraf (long polling), cron каждую минуту |
| Деплой (план) | Frontend → Vercel, Backend → Render (ещё **не** выкатывали в прод) |

---

## 3. Архитектура данных (важно)

```
Mini App (телефон/браузер)
  ├── Dexie: кеш задач + settings + pending_ops (офлайн-очередь)
  └── API (initData auth / DEV bypass)
        ├── /api/tasks      → таблица tasks (+ sync reminders)
        ├── /api/settings   → user_settings
        └── /api/reminders  → legacy/совместимость (основной путь — через tasks)

Cron (backend)
  → close-reminders, deadline warn/complete, new-task reminders
  → Telegraf sendMessage(userId)
```

- **Источник истины задач** — SQLite на бэкенде (`tasks`).
- Dexie — кеш UI + очередь мутаций при офлайне.
- Настройки пользователя — `user_settings` (график, лиды, new-task, timezone).
- Reminder-расписание — таблица `reminders` (slim: без JSON графика на каждой задаче).

---

## 4. На каком мы этапе

### Сделано и локально протестировано
- MVP UI: задачи, настройки, отчёты, календарь, Excel.
- Backend: auth через Telegram `initData` (`Authorization: tma …`).
- Локально: `AUTH_DEV_BYPASS=true` + заголовок `X-User-Id` из `VITE_DEV_USER_ID`.
- Задачи на сервере; reminder создаётся/удаляется вместе с task API.
- Дедлайн: cron завершает задачу на сервере + пуш.
- Упреждение дедлайна; продление рабочего дня → recalc reminders.
- New-task reminders; backoff при ошибках отправки (1м→5м→15м→1ч).
- Timezone пользователя (IANA с клиента) в расчёте рабочих окон.
- Offline `pending_ops` + баннер «Не синхронизировано».
- Баннер `/start` **убран** по просьбе (пользователь сам пишет боту).
- Локальные e2e-сценарии пушей пользователь прогнал успешно.

### Отложено (следующий крупный шаг)
- Деплой: backend → **Render.com**, frontend → **Vercel**, запуск чисто с телефона из Mini App.
- Не гонять локальный bot polling и Render с одним `BOT_TOKEN` одновременно.

---

## 5. Локальный запуск

### Backend (`backend/`)
`.env` (не коммитить):
```env
PORT=5000
BOT_TOKEN=<токен>
WEBAPP_URL=          # локально можно пусто
DATABASE_PATH=./data/nastask.sqlite
AUTH_DEV_BYPASS=true
INIT_DATA_MAX_AGE_SEC=86400
```

```bash
cd backend && npm install && npm run dev
```

БД: `backend/data/nastask.sqlite`.

### Frontend (`frontend/`)
`.env.local`:
```env
VITE_API_URL=http://localhost:5000
VITE_DEV_USER_ID=<твой Telegram numeric id>
```

```bash
cd frontend && npm install && npm run dev
```

Схема теста: ПК = UI + API + бот; телефон = только чат с ботом (пуши).  
Один раз `/start` боту с того же аккаунта, чей id в `VITE_DEV_USER_ID`.

---

## 6. Ключевые пути в коде

| Область | Файлы |
|---------|--------|
| Auth | `backend/src/auth/validateInitData.ts`, `middleware/telegramAuth.ts` |
| Tasks API | `backend/src/routes/tasks.ts`, `db/tasksRepo.ts`, `services/syncTaskReminder.ts` |
| Settings | `backend/src/routes/settings.ts`, `db/settingsRepo.ts` |
| Cron / пуши | `backend/src/jobs/reminderCron.ts`, `bot/telegram.ts` |
| Расписание / TZ | `backend/src/utils/getNextNotifyTime.ts` |
| Frontend API | `frontend/src/api/client.ts`, `tasksApi.ts`, `tasksRemote.ts`, `pendingOps.ts` |
| Sync | `frontend/src/hooks/useTasksSync.ts`, `useSettingsSync.ts` |
| Telegram user | `frontend/src/hooks/useTelegram.ts` (DEV fake user) |

---

## 7. API (кратко)

Все `/api/*` требуют `Authorization: tma <initData>`, кроме локального `AUTH_DEV_BYPASS` (+ `X-User-Id` / body `userId`).

| Method | Path |
|--------|------|
| GET | `/health` |
| GET/POST | `/api/tasks` |
| PUT/DELETE | `/api/tasks/:id` |
| POST | `/api/tasks/:id/complete` |
| GET | `/api/settings/:userId` |
| PUT | `/api/settings` |
| POST/PUT/DELETE | `/api/reminders` (legacy) |

---

## 8. Что сделать дальше (бэклог)

### P0 — прод / телефон
1. Задеплоить frontend на Vercel (`VITE_API_URL` = URL Render).
2. Задеплоить backend на Render:
   - Persistent Disk → `DATABASE_PATH=/data/nastask.sqlite`
   - `AUTH_DEV_BYPASS` выключить
   - `BOT_TOKEN`, `WEBAPP_URL` = HTTPS фронта
3. BotFather: Menu Button / Web App = URL Vercel.
4. Прогнать сценарии уже из Mini App на телефоне.
5. Учесть sleep бесплатного Render (cron не тикает, пока сервис спит).

### P1 — продукт / UX
- Итог заработка (`quantity × coefficient`) в отчётах/Excel (было в плане, убрано из UI).
- Онбординг `/start` (опционально вернуть мягко).
- Улучшить Excel в Telegram WebView (часто ломается скачивание).
- Валидация: deadline &lt; start, start ≥ end в графике.

### P2 — надёжность
- Не оставлять orphan reminders, если delete/complete не дошёл (уже есть offline queue — следить в проде).
- Webhook вместо long polling при масштабировании.
- Allowlist user ids, если бот только для узкого круга.

---

## 9. Известные нюансы

- **GET `/api/tasks` в DEV** раньше падал без `userId` — починено через `X-User-Id`.
- Удаление только в IndexedDB без успешного API → пуши продолжаются; чистить `reminders` в SQLite или удалять файл БД.
- Bootstrap локальных задач: `localStorage` ключ `nastask.tasksBootstrapped`.
- Сообщение бота при дедлайне: задача **уже завершена** на сервере.
- Не читать и не коммитить `.env` / `.env.local` с токенами.

---

## 10. Промпт для нового чата с агентом

Скопируй примерно так:

> Проект NasTask в `e:\minipets\nastask` (или актуальный путь).  
> Прочитай `CONTEXT.md` и продолжай с того места.  
> Сейчас нужно: [деплой на Render/Vercel | фича X | баг Y].

---

## 11. История решений (кратко)

1. Напоминания только через Telegram-бота, не браузер.
2. Настройки вынесены из `reminders` в `user_settings`.
3. Задачи перенесены на бэкенд (фаза 1 плана bugfix).
4. Auth через `initData`; локально bypass + `X-User-Id`.
5. Recalc close-reminders только при реальной смене графика/лидов (не на каждый open).
6. Баннер `/start` удалён по запросу пользователя.
7. Прод-деплой отложен; локальные тесты пройдены.
