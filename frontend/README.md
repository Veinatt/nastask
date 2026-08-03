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

## Уведомления (MVP)

Используется браузерный Notification API. Разрешение запрашивается при первом запуске.  
Для работы нужны `localhost` или HTTPS. Уведомления отправляются только в настроенное рабочее время.

## Структура данных

Данные хранятся локально в IndexedDB (`nastask`). Синхронизация между устройствами — на следующем этапе с backend.
