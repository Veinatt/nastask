# NasTask

Персональный трекер задач для фрилансера-дизайнера (Telegram Mini App).

## Стек

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Dexie (IndexedDB)
- react-hook-form + zod
- xlsx
- `@telegram-apps/sdk-react`

## Локальный запуск

```bash
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:5173`. Вне Telegram тема берётся из `prefers-color-scheme`.

## Сборка

```bash
npm run build
npm run preview
```

## Деплой (Vercel)

1. Импортируйте папку `frontend` как проект на Vercel (Root Directory = `frontend`).
2. Framework Preset: Vite.
3. После деплоя скопируйте URL.

## Telegram Mini App

1. Создайте бота через [@BotFather](https://t.me/BotFather).
2. `/newapp` → укажите URL задеплоенного фронтенда.
3. Откройте Mini App из бота.

## Уведомления

Клиентские Web Notifications отключены. При создании/изменении/завершении/удалении активной задачи фронт отправляет reminder на бэкенд (`POST/PUT/DELETE /api/reminders`). Push в Telegram делает сервер.

URL API задаётся в `.env.local`:

```bash
VITE_API_URL=http://localhost:5000
```

Без Telegram `userId` запросы на sync пропускаются (см. консоль).

## Структура данных

Задачи и настройки хранятся локально в IndexedDB (`nastask`). Reminder-синхронизация с бэкендом — fire-and-forget и не блокирует UI.
