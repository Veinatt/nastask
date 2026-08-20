# NasTask — контекст проекта (handoff)

Документ для продолжения работы на другом ПК / в новом чате с агентом.  
Обновлено: **2026-08-20**.

Читать вместе с:
- [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) — **актуальный handoff сессии 2026-08-20** (NasTale, деплой, next);
- [`PROBLEMS_SOLVED.md`](PROBLEMS_SOLVED.md) — разбор багов и фиксов;
- [`refactoring.md`](refactoring.md) — спека домена трекера;
- [`FEATURES_FOR_USERS.md`](FEATURES_FOR_USERS.md) — пользовательские формулировки фич.

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
- splash-заставка (логотип → коты → morph в `#app-logo`);
- **секретный раздел NasTale** — личный квиз (тетрадный UI), вход **тройным тапом** по логотипу NasTask (`#app-logo`); не в нижней навигации.

Спека рефакторинга: [`refactoring.md`](refactoring.md).  
Старый домен (задачи + Telegram-напоминания + cron) **удалён без миграции данных**.

---

## 2. Стек и структура репо

```
nastask/
  frontend/          React + TS + Vite + Dexie + shadcn + @telegram-apps/sdk-react
  backend/           Express + SQLite (better-sqlite3) — HTTP API only
  CONTEXT.md         ← этот файл
  SESSION_HANDOFF.md
  PROBLEMS_SOLVED.md
  refactoring.md
```

| Часть | Технологии |
|-------|------------|
| Frontend | React 19, Vite, Dexie (кеш + pending_ops), xlsx |
| Backend | Express 5, SQLite; **без** Telegraf/cron |
| Деплой | Frontend → **Vercel** (`nastask.vercel.app`), Backend → **Railway** (`nastask-production.up.railway.app`) |

---

## 3. Архитектура данных

```
Mini App
  ├── Dexie: timeEntries, workItems, dicts, settings, memoryQuiz, pending_ops
  └── API (initData auth; локально AUTH_DEV_BYPASS)
        ├── /api/intervals
        ├── /api/categories|descriptions|units
        ├── /api/settings
        └── /api/memory (questions ids, answers; export по X-Export-Key)
```

- **Источник истины** — SQLite на бэкенде.
- Id везде **UUID (TEXT)** (или составной `userId:questionId` для memory).
- Активный интервал ⇔ `end IS NULL`; пауза через `pauseStartedAt`.
- ЗП интервала: `(total_seconds/3600) * coefficient * hourlyRate`.

### NasTale (память / квиз)

| | Клиент | Сервер |
|--|--------|--------|
| Тексты вопросов | `locales/ru.ts`, `be.ts` (`memory.q.*`) | не хранятся |
| Список id | `frontend/.../memoryQuestions.ts` | тот же список в `backend/.../memoryQuestions.ts` |
| Ответы | Dexie `memoryQuiz` | `memory_quiz`: `userId`, `questionId`, `answer`, даты |
| Scope | устройство + sync | **per Telegram `userId`** (не общие) |

- Overlay `MemoryQuizPage` через `MemoryOpenProvider` (не React Router).
- Dexie schema **v6** + `pending_ops` тип `memory_upsert`.
- Export: `GET /api/memory/export` + `X-Export-Key` = `MEMORY_EXPORT_KEY`; опционально `?userId=`.
- Язык UI меняет формулировки вопросов, не тексты ответов.

**Порядок id (15):**  
`time-period` → `time-place` → `memory-day` → `memory-detail` → `feelings-body` → `feelings-spark` → `music-repeat` → `music-where` → `books-screen` → `people-near` → `time-evenings` → `time-lost` → `now-bridge` → `now-piece` → `open-add`.

**Сохранение ответов:** «Дальше»/«Назад» → `saveAnswer`; выход по логотипу NasTale → `saveAll` (с защитой от затирания пустым draft).

**Важно (Home vs Stats):**
- **Главная** — completed/active из **Dexie**.
- **Статистика** — completed с **API**.
- Sync: `replaceActive` + reconcile completed + pull memory answers.

---

## 4. На каком мы этапе (2026-08-20)

### Статус: **NasTale готов локально; изменения ждут commit + push**

Трекер на проде работает (последний remote: `77af3ac` nastale v0.9).  
Доработки NasTale за 20.08 (тексты, splash, тетрадь, i18n, фикс wipe ответов) — **в working tree, не на origin**.

### Сделано ранее
- Рефакторинг трекера, UX/i18n/темы (08-04), стабилизация Mini App (08-05) — см. `PROBLEMS_SOLVED.md`.
- Каркас «Воспоминания» (08-19): API + overlay + Dexie.

### Сделано 2026-08-20
- Бренд **NasTale**; тексты в локалях; 3 новых вопроса (`people-near`, `now-bridge`, `open-add`); be синхронизирован.
- Бэк хранит только id+answer (колонка `question` снята миграцией).
- Splash enter/exit: typewriter в центре → FLIP как boot splash (`useTypewriterSwap`).
- Тетрадь: линовка 32px, кнопки на фиксированной нижней строке, отступ ×12.
- Фикс: draft/`saveAll` больше не затирают ответы пустыми строками при re-enter.
- Кнопка финиша: «Посмотреть ответы».

### Next
1. Commit + push на `main`.
2. Railway: `MEMORY_EXPORT_KEY` задан.
3. Смоук в Telegram: ответить → выйти → зайти → ответы на месте + export.

### Возможное дальше (когда попросят)
- PIN на вход в NasTale, доп. полировка splash, автотесты.
- Не в скоупе: Google Sheets, тяжёлые charts, миграция старых задач.

---

## 5. Локальный запуск

### Backend (`backend/`)
```env
PORT=5000
BOT_TOKEN=<токен>
DATABASE_PATH=./data/nastask.sqlite
AUTH_DEV_BYPASS=true
INIT_DATA_MAX_AGE_SEC=86400
MEMORY_EXPORT_KEY=<секрет>
```

```bash
cd backend && npm install && npm run dev
```

После правки `.env` — **полный рестарт** (nodemon не смотрит `.env`). В логе старта должно быть `MEMORY_EXPORT_KEY=set`.

Windows / `better-sqlite3`: версия **^12**, не 13.

### Frontend (`frontend/`)
```env
VITE_API_URL=http://localhost:5000
VITE_DEV_USER_ID=<telegram numeric id>
```

```bash
cd frontend && npm install && npm run dev
```

Вход в NasTale: тройной тап по логотипу NasTask.

Export:
```bash
curl -H "X-Export-Key: $MEMORY_EXPORT_KEY" \
  "http://localhost:5000/api/memory/export?userId=<id>"
```

---

## 6. Прод-окружение

| Сервис | URL / заметка |
|--------|----------------|
| Frontend | `https://nastask.vercel.app` |
| Backend | `https://nastask-production.up.railway.app` |
| Volume | `/data` → `DATABASE_PATH=/data/nastask.sqlite` |
| Auth | `BOT_TOKEN`; `AUTH_DEV_BYPASS` **выкл** |
| Memory export | `MEMORY_EXPORT_KEY` в Railway Variables |
| BotFather | Menu Button / Web App → Vercel URL |

Деплой: `git push origin main` → автосборки Vercel + Railway.

---

## 7. Ключевые пути

| Область | Файлы |
|---------|--------|
| Auth | `backend/src/auth/validateInitData.ts`, `middleware/telegramAuth.ts` |
| Schema | `backend/src/db/migrate.ts` |
| Intervals | `backend/src/routes/intervals.ts`, `db/intervalsRepo.ts` |
| Tabs | `AppTabContext.tsx`, `AppLayout.tsx`, `Navigation.tsx`, `useSwipeNavigation.ts` |
| Sync | `hooks/useSync.ts`, `api/pendingOps.ts` |
| NasTale | `pages/memory/*`, `components/memory/*`, `hooks/useMemoryQuiz.ts`, `hooks/useTypewriterSwap.ts`, `locales/ru.ts`/`be.ts`, `memory/memoryQuestions.ts` (front+back), `routes/memory.ts`, `db/memoryRepo.ts` |
| Splash boot | `components/splash/SplashScreen.tsx` |
| CSS тетрадь | `index.css` (`.notebook-*`) |

---

## 8. API (кратко)

Все `/api/*` — `Authorization: tma <initData>`, кроме bypass и **`GET /api/memory/export`** (`X-Export-Key`).

| Method | Path |
|--------|------|
| GET | `/health` |
| * | `/api/intervals…`, dicts, settings, expenses, work-templates, export |
| GET | `/api/memory/questions` (список `{ id }`) |
| GET/POST | `/api/memory/answers` |
| GET | `/api/memory/export` (`X-Export-Key`) |

---

## 9. Промпт для нового чата

> Проект NasTask в `nastask/`.  
> Сначала: `CONTEXT.md` (этап **2026-08-20**) и `SESSION_HANDOFF.md`.  
> При багах — `PROBLEMS_SOLVED.md`.  
> Проверь `git status`: доработки NasTale могли ещё не быть на remote.  
> Нужно: [задача]. Не коммить `.env`.

---

## 10. История решений (накопительно)

1. Полная замена домена задач → трекер времени (wipe).
2. Бот/cron на бэке не нужны — только HTTP API.
3. UUID с клиента; сервер — источник истины по секундам.
4. Деплой: Vercel + Railway.
5. Вкладки без React Router (`#tgWebAppData` в hash).
6. initData HMAC: убирать только `hash`, `signature` оставлять.
7. Home = Dexie, Stats = API → sync reconcile completed.
8. **NasTale:** тексты на клиенте; в БД только ответы по `(userId, questionId)`; draft не должен saveAll-ить пустые плейсхолдеры.
