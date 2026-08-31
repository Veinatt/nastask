# NasTask (share)

Telegram Mini App — трекер рабочего времени для фрилансера.

**Ветка `share`** — версия для демонстрации: без личного раздела NasTale и без стартовой заставки с анимацией.

## Возможности

- Интервалы: старт, пауза, завершение, ручной ввод
- Работы при завершении (категория, описание, количество, единица)
- Справочники с autocomplete
- Настройки: ставка, налог, валюта, тема, язык (ru/be)
- Отчёты: зарплата, налог, расходы, экспорт Excel
- Offline-first: IndexedDB (Dexie) + очередь синхронизации

## Стек

| Часть | Технологии |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind, shadcn/ui, Dexie |
| Backend | Express 5, SQLite (better-sqlite3) |

## Быстрый старт

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: `http://localhost:5000`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

UI: `http://localhost:5173`

В dev-режиме без Telegram используется фейковый `userId` из `VITE_DEV_USER_ID`; на бэкенде включите `AUTH_DEV_BYPASS=true`.

## Деплой

- Frontend → Vercel (Root Directory: `frontend`)
- Backend → Railway / любой Node-хостинг с persistent volume для SQLite

## Структура

```
frontend/src/
  pages/       Home, Stats, Reports, Settings
  hooks/       useIntervals, useSync, useTelegram, …
  api/         *Local.ts (Dexie) + *Remote.ts (HTTP)
  db/          схема IndexedDB

backend/src/
  routes/      intervals, dicts, settings, expenses, export
  db/          SQLite migrations
```

Подробнее: `frontend/README.md`, `backend/README.md`, `refactoring.md`.
