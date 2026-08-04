# NasTask — контекст проекта (handoff)

Документ для продолжения работы на другом ПК / в новом чате с агентом.  
Обновлено: 2026-08-04.

---

## 1. Что это

**NasTask** — персональный **трекер времени** для фрилансера как **Telegram Mini App**.

Возможности:
- интервалы: старт / пауза / продолжение / завершение, ручной ввод;
- работы (`work_items`) при complete / edit / manual: категория, описание, количество, единица;
- справочники (категории, описания, единицы) с autocomplete и create-on-select;
- настройки: ставка, налог, валюта, timezone;
- отчёты: зарплата и налог за месяц + Excel;
- статистика: часы за день/месяц, топы, список по дням;
- offline-очередь `pending_ops` + баннер синхронизации.

Спека рефакторинга: [`refactoring.md`](refactoring.md).  
Старый домен (задачи + Telegram-напоминания + cron) **удалён без миграции данных**.

---

## 2. Стек и структура репо

```
nastask/
  frontend/     React + TS + Vite + Dexie + shadcn + @telegram-apps/sdk-react
  backend/      Express + SQLite (better-sqlite3) — HTTP API only
  refactoring.md
  CONTEXT.md    ← этот файл
```

| Часть | Технологии |
|-------|------------|
| Frontend | React 19, Vite, Dexie v3 (кеш + pending_ops), xlsx |
| Backend | Express 5, SQLite; **без** Telegraf/cron |
| Деплой (план) | Frontend → Vercel, Backend → Render или Railway (**после** локальной готовности) |

---

## 3. Архитектура данных

```
Mini App
  ├── Dexie: timeEntries, workItems, dicts, settings, pending_ops
  └── API (initData auth / DEV bypass)
        ├── /api/intervals
        ├── /api/categories|descriptions|units
        └── /api/settings
```

- **Источник истины** — SQLite на бэкенде.
- Id везде **UUID (TEXT)**, клиент генерирует (`crypto.randomUUID()`).
- Активный интервал ⇔ `end IS NULL`; пауза через `pauseStartedAt`.
- ЗП интервала: `(total_seconds/3600) * coefficient * hourlyRate`.
- «Платит работодатель»: `monthSum * (1 + taxRate/100)`.

---

## 4. На каком мы этапе

### Сделано (этот рефакторинг)
- Backend: новая схема, repos, routes intervals/dicts/settings; wipe legacy tasks/reminders/cron/bot.
- Frontend: 4 вкладки (Главная / Статистика / Отчёты / Настройки), таймеры, справочники, отчёты + Excel, sync.

### Дальше
- Локальный чеклист из `refactoring.md`.
- Деплой Vercel + Render/Railway; BotFather Menu Button после HTTPS URL.
- Вне скоупа: Google Sheets, тяжёлые chart-библиотеки, миграция старых задач.

---

## 5. Локальный запуск

### Backend (`backend/`)
`.env`:
```env
PORT=5000
BOT_TOKEN=<токен>          # нужен для prod initData; локально можно с bypass
DATABASE_PATH=./data/nastask.sqlite
AUTH_DEV_BYPASS=true
INIT_DATA_MAX_AGE_SEC=86400
```

```bash
cd backend && npm install && npm run dev
```

### Frontend (`frontend/`)
`.env.local`:
```env
VITE_API_URL=http://localhost:5000
VITE_DEV_USER_ID=<твой Telegram numeric id>
```

```bash
cd frontend && npm install && npm run dev
```

После смены домена IndexedDB: Dexie version **3** (старые `tasks` сбрасываются).

---

## 6. Ключевые пути

| Область | Файлы |
|---------|--------|
| Auth | `backend/src/auth/validateInitData.ts`, `middleware/telegramAuth.ts` |
| Schema | `backend/src/db/migrate.ts` |
| Intervals | `backend/src/routes/intervals.ts`, `db/intervalsRepo.ts` |
| Dicts | `backend/src/routes/dicts.ts`, `db/dictRepo.ts` |
| Settings | `backend/src/routes/settings.ts`, `db/settingsRepo.ts` |
| Frontend DB | `frontend/src/db/index.ts`, `types.ts` |
| Sync | `frontend/src/hooks/useSync.ts`, `api/pendingOps.ts` |
| UI | `pages/HomePage.tsx`, `StatsPage.tsx`, `ReportsPage.tsx`, `SettingsPage.tsx` |
| Telegram | `frontend/src/hooks/useTelegram.ts`, `api/client.ts` |

---

## 7. API (кратко)

Все `/api/*` требуют `Authorization: tma <initData>`, кроме `AUTH_DEV_BYPASS` (+ `X-User-Id`).

| Method | Path |
|--------|------|
| GET | `/health` |
| POST | `/api/intervals/start`, `/manual` |
| PUT | `/api/intervals/:id/pause\|resume\|complete`, `/api/intervals/:id` |
| GET | `/api/intervals/active`, `/completed?date=`, `/report/salary\|tax` |
| DELETE | `/api/intervals/:id` |
| CRUD-ish | `/api/categories`, `/descriptions`, `/units` (GET/POST/DELETE) |
| GET/PUT | `/api/settings` |

Удаление справочника при наличии `work_items` → **409**.

---

## 8. Промпт для нового чата

> Проект NasTask в `e:\minipets\nastask`.  
> Прочитай `CONTEXT.md` и `refactoring.md`.  
> Сейчас нужно: [локальный чеклист | деплой | фича X].

---

## 9. История решений

1. Полная замена домена задач → трекер времени (wipe, без миграции).
2. Бот/cron на бэке не нужны — только HTTP API; Mini App через BotFather позже.
3. Работы только при complete / edit / manual.
4. UUID с клиента; сервер — источник истины по секундам.
5. Деплой отложен до локальной готовности.
