# NasTask — контекст проекта (handoff)

Документ для продолжения работы на другом ПК / в новом чате с агентом.  
Обновлено: **2026-08-05**.

Читать вместе с:
- [`PROBLEMS_SOLVED.md`](PROBLEMS_SOLVED.md) — разбор багов, причин и фиксов (сессия запуска Mini App);
- [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) — UX/i18n/темы/деплой-чеклист (2026-08-04);
- [`refactoring.md`](refactoring.md) — спека домена трекера.

---

## 1. Что это

**NasTask** — персональный **трекер времени** для фрилансера как **Telegram Mini App**.

Возможности:
- интервалы: старт / пауза / продолжение / завершение, ручной ввод;
- работы (`work_items`) при complete / edit / manual: категория, описание, количество, единица;
- справочники (категории, описания, единицы) с autocomplete и create-on-select;
- настройки: ставка, налог, валюта, timezone;
- отчёты: зарплата и налог за месяц + Excel;
- статистика: метрики + список завершённых;
- offline-очередь `pending_ops` + баннер синхронизации;
- splash-заставка (логотип → коты сердцем → morph в `#home-brand-title`).

Спека рефакторинга: [`refactoring.md`](refactoring.md).  
Старый домен (задачи + Telegram-напоминания + cron) **удалён без миграции данных**.

---

## 2. Стек и структура репо

```
nastask/
  frontend/          React + TS + Vite + Dexie + shadcn + @telegram-apps/sdk-react
  backend/           Express + SQLite (better-sqlite3) — HTTP API only
  refactoring.md
  CONTEXT.md         ← этот файл
  SESSION_HANDOFF.md
  PROBLEMS_SOLVED.md
```

| Часть | Технологии |
|-------|------------|
| Frontend | React 19, Vite, Dexie v3 (кеш + pending_ops), xlsx |
| Backend | Express 5, SQLite; **без** Telegraf/cron |
| Деплой | Frontend → **Vercel** (`nastask.vercel.app`), Backend → **Railway** (`nastask-production.up.railway.app`) |

---

## 3. Архитектура данных

```
Mini App
  ├── Dexie: timeEntries, workItems, dicts, settings, pending_ops
  └── API (initData auth; локально AUTH_DEV_BYPASS)
        ├── /api/intervals
        ├── /api/categories|descriptions|units
        └── /api/settings
```

- **Источник истины** — SQLite на бэкенде.
- Id везде **UUID (TEXT)**, клиент генерирует (`crypto.randomUUID()`).
- Активный интервал ⇔ `end IS NULL`; пауза через `pauseStartedAt`.
- ЗП интервала: `(total_seconds/3600) * coefficient * hourlyRate`.
- «Платит работодатель»: `monthSum * (1 + taxRate/100)`.

**Важно (Home vs Stats):**
- **Главная** читает completed/active из **локального Dexie** (`useLiveQuery`).
- **Статистика** читает completed с **API** (`listAllCompleted`).
- Sync (`useSync` → `pullAll`) после flush: `replaceActive` + `replaceCompletedForDate` (сегодня/вчера) — локальные completed-сироты без pending удаляются.

---

## 4. На каком мы этапе (2026-08-05)

### Статус: **прод запущен, пользователь подтвердил — критичных багов нет, пауза**

Работает в Telegram Mini App (телефон + desktop). Интервалы, навигация, auth, статистика согласованы после фикса sync.

### Сделано ранее (рефакторинг + UX 08-04)
- Backend: схема трекера, repos, routes; wipe legacy tasks/reminders.
- Frontend: 4 вкладки, таймеры, справочники, отчёты + Excel, i18n ru/be, темы, свайпы.
- Деплой Vercel + Railway (volume `/data`, `BOT_TOKEN`, bypass off).

### Сделано в сессии запуска / стабилизации (08-05) — кратко

| Область | Итог |
|---------|------|
| Локальный Windows | `better-sqlite3@12` (сборка `@13` ломалась на node-gyp) |
| Auth Telegram | HMAC: в data-check-string **нельзя** удалять `signature`, только `hash` |
| Клиент auth | Отложенный safe init SDK; `WebApp.ready()`; fallback initData из hash; ErrorBoundary |
| Навигация | **Убран React Router** для вкладок → `AppTabProvider` + state (hash `#tgWebAppData` ломал BrowserRouter/MemoryRouter) |
| Sync Home | Reconcile completed today/yesterday; flush не стопорится на мёртвых 4xx |
| Splash | Включён снова (`SplashScreen` + `data-splash`) |
| UI | Статистика без градиентных карточек; running-таймер = flat emerald «как пауза»; кнопка паузы — фиксированный текст «Пауза», меняются иконка/фон; корзина не в `flex-wrap`+`ml-auto` |
| Debug | Убраны `InitDataDebugPanel` и «NasTask loading…» из `index.html` |

Подробности багов → [`PROBLEMS_SOLVED.md`](PROBLEMS_SOLVED.md).

### Что сознательно **не** трогаем сейчас
- Пользователь: «пока багов нет, на этом остановимся».
- Не начинать крупные фичи без нового запроса.
- Railway warning `could not load /app/.env` — **норма** (env из Variables, не из файла в образе).

### Возможное дальше (когда попросят)
- Чеклист из `refactoring.md`, полировка splash, harden pending queue, тесты.
- Не в скоупе: Google Sheets, тяжёлые charts, миграция старых задач.

---

## 5. Локальный запуск

### Backend (`backend/`)
`.env` (локально, **не** копировать bypass на прод):
```env
PORT=5000
BOT_TOKEN=<токен>
DATABASE_PATH=./data/nastask.sqlite
AUTH_DEV_BYPASS=true
INIT_DATA_MAX_AGE_SEC=86400
```

```bash
cd backend && npm install && npm run dev
```

На Windows при ошибке native build — смотри `better-sqlite3` версию в `backend/package.json` (**^12**, не 13).

### Frontend (`frontend/`)
`.env.local`:
```env
VITE_API_URL=http://localhost:5000
VITE_DEV_USER_ID=<твой Telegram numeric id>
```

На проде Vercel: `VITE_API_URL=https://nastask-production.up.railway.app` (без `/` в конце).

```bash
cd frontend && npm install && npm run dev
```

---

## 6. Прод-окружение (актуально)

| Сервис | URL / заметка |
|--------|----------------|
| Frontend | `https://nastask.vercel.app` |
| Backend | `https://nastask-production.up.railway.app` |
| Volume | `/data` → `DATABASE_PATH=/data/nastask.sqlite` |
| Auth | `BOT_TOKEN` задан; `AUTH_DEV_BYPASS` **выключен**; `[auth] ok` в логах |
| BotFather | Menu Button / Web App → Vercel URL |

Локальный `.env` с `AUTH_DEV_BYPASS=true` и `PORT=5000` — только для разработки.

---

## 7. Ключевые пути

| Область | Файлы |
|---------|--------|
| Auth | `backend/src/auth/validateInitData.ts`, `middleware/telegramAuth.ts` |
| Schema | `backend/src/db/migrate.ts` |
| Intervals | `backend/src/routes/intervals.ts`, `db/intervalsRepo.ts` |
| Tabs (без Router) | `frontend/src/components/layout/AppTabContext.tsx`, `AppLayout.tsx`, `Navigation.tsx`, `useSwipeNavigation.ts` |
| Sync | `frontend/src/hooks/useSync.ts`, `api/pendingOps.ts`, `api/intervalsLocal.ts` |
| Splash | `frontend/src/components/splash/SplashScreen.tsx`, `App.tsx`, `SplashDoneContext.tsx` |
| UI Home/Timer | `pages/HomePage.tsx`, `components/intervals/TimerCard.tsx` |
| Telegram | `frontend/src/hooks/useTelegram.ts`, `api/client.ts` |

---

## 8. API (кратко)

Все `/api/*` требуют `Authorization: tma <initData>`, кроме `AUTH_DEV_BYPASS` (+ `X-User-Id`).

| Method | Path |
|--------|------|
| GET | `/health` |
| POST | `/api/intervals/start`, `/manual` |
| PUT | `/api/intervals/:id/pause\|resume\|complete`, `/api/intervals/:id` |
| GET | `/api/intervals/active`, `/completed?date=`, `/report/salary\|tax` |
| DELETE | `/api/intervals/:id` |
| CRUD-ish | `/api/categories`, `/descriptions`, `/units` |
| GET/PUT | `/api/settings` |

---

## 9. Промпт для нового чата

> Проект NasTask в `nastask/`.  
> Сначала прочитай `CONTEXT.md` (этап на 2026-08-05) и `PROBLEMS_SOLVED.md`.  
> При необходимости — `SESSION_HANDOFF.md`, `refactoring.md`.  
> Сейчас: критичных багов нет, пользователь поставил паузу. Нужно: [задача].

---

## 10. История решений (накопительно)

1. Полная замена домена задач → трекер времени (wipe, без миграции).
2. Бот/cron на бэке не нужны — только HTTP API.
3. Работы только при complete / edit / manual.
4. UUID с клиента; сервер — источник истины по секундам.
5. Деплой: Vercel + Railway.
6. **Вкладки без React Router** — Telegram кладёт launch params в `location.hash`.
7. **initData HMAC**: из check-string убирать только `hash`, `signature` оставлять.
8. **Home = Dexie, Stats = API** → sync обязан reconcile completed, не только upsert.
