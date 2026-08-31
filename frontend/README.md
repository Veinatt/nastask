# NasTask

Telegram Mini App — трекер рабочего времени (offline-first).

## Стек

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Dexie (IndexedDB)
- xlsx
- `@telegram-apps/sdk-react`

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run dev
```

Откройте `http://localhost:5173`. Вне Telegram тема берётся из `prefers-color-scheme`.

Переменные окружения — см. `.env.example`. Backend должен быть запущен на `VITE_API_URL`.

## Сборка

```bash
npm run build
npm run preview
```

## Telegram Mini App

1. Создайте бота через [@BotFather](https://t.me/BotFather).
2. `/newapp` → укажите URL задеплоенного фронтенда.
3. Откройте Mini App из бота.

## Архитектура данных

Задачи и настройки хранятся локально в IndexedDB (`nastask`). Синхронизация с бэкендом — через offline-очередь `pending_ops`; UI не блокируется при ошибках сети.
