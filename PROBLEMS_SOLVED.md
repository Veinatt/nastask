# NasTask — решённые проблемы (лог)

Журнал инцидентов сессии запуска Mini App и стабилизации (**~2026-08-05**).  
Для агента / разработчика: симптом → причина → решение.

См. также актуальный этап в [`CONTEXT.md`](CONTEXT.md).

---

## 1. `better-sqlite3` не ставится на Windows

**Симптом:** `npm i` в `backend/` падает на native build `better-sqlite3@13` (node-gyp / неполный VS C++ Build Tools).

**Причина:** жёсткая зависимость от свежей major-версии с требовательной сборкой на Windows.

**Решение:** откат на `better-sqlite3@^12.11.1` (+ при необходимости `allowScripts` в `package.json`). На Linux/Railway сборка обычно ок.

---

## 2. Локальный backend с prod-путями / занятый порт

**Симптом:** бэкенд не стартует или пишет не туда; `EADDRINUSE :5000`.

**Причина:** в `.env` остались prod-значения (`PORT=10000`, `/data/...`); висел старый Node-процесс.

**Решение:** локально `PORT=5000`, `DATABASE_PATH=./data/nastask.sqlite`, `AUTH_DEV_BYPASS=true`; убить процесс на порту, дать nodemon подняться.

---

## 3. Blank / «не открывается» Mini App, нет initData

**Симптом:** пустой экран или `missing Telegram initData`; на tdesktop `window.Telegram.WebApp` может отсутствовать.

**Причина (несколько слоёв):**
- init SDK / `useSignal` на module level → крэш до UI;
- клиент не слал `Authorization: tma …`;
- initData часто лежит в **hash** (`#tgWebAppData=…`), не только в `Telegram.WebApp.initData`.

**Решение:**
- отложенный / safe init в `useTelegram.ts`;
- `WebApp.ready()` (+ ранний вызов из `index.html`);
- ErrorBoundary + boot error UI в `main.tsx`;
- fallback чтения initData из hash / SDK при сборке заголовка в `api/client.ts`.

Временный `InitDataDebugPanel` на Home использовали для диагностики, затем **удалили**.

---

## 4. `initData hash mismatch` (401 на API)

**Симптом:** auth вроде шлёт header, сервер отвергает подпись.

**Причина:** в `validateInitData.ts` из query перед HMAC **удаляли и `hash`, и `signature`**. В актуальном Telegram WebApp `signature` **входит** в data-check-string; убирать нужно **только `hash`**.

**Решение:** `params.delete('hash')` only; не трогать `signature`. Нужен redeploy backend на Railway.

---

## 5. Вкладки / свайп не работают в Mini App

**Симптом:** клики по Navigation и swipe не меняют экран внутри Telegram; в обычном браузере могло казаться ок.

**Причина:** Telegram кладёт launch-параметры в `location.hash`. `BrowserRouter` (и попытки с `MemoryRouter`) конфликтуют с этим hash / WebView history — смена «роута» молча ломается.

**Решение:** убрать Router для основных вкладок. Состояние вкладки в React:
- `AppTabProvider` / `AppTabContext.tsx`
- `Navigation` → `button` + `setTab`
- `AppLayout` рендерит page по `tab`
- `useSwipeNavigation` → `setTabIndex`

---

## 6. Splash: моргание, прыжок заголовка, blank beige, залипание

**Симптом:** после заставки двойной title / прыжок; логотип `opacity: 0` и пустой бежевый экран в TG WebView; `animate-page-in` после splash.

**Причина:**
- `data-splash` выставлялся в `useEffect` слишком поздно → кадр без лого и со скрытым `#home-brand-title`;
- неверный FLIP-target (h1 на всю ширину);
- CSS fill-mode / timing в WebView.

**Решение (итог):**
- синхронно ставить `document.documentElement.dataset.splash = 'done'` в `onComplete` / `finish` splash;
- `#home-brand-title` с `w-fit`; morph по реальным метрикам;
- `AppLayout` пропускает первый `animate-page-in` после splash;
- временно отключали splash флагом для отладки blank screen, затем **вернули**.

Убран placeholder «NasTask loading…» из `index.html` (мешал восприятию старта).

---

## 7. Railway: `could not load /app/.env`

**Симптом:** в логах `ENOENT … /app/.env`, `injected env (0) from .env`.

**Причина:** в Docker-образе файла `.env` нет. Переменные задаются в **Railway Variables** и попадают в `process.env`.

**Решение:** ничего чинить не нужно, если в логах есть `DATABASE_PATH=/data/...`, `Telegram initData auth enabled`, `[auth] ok`. Критично: Volume + `BOT_TOKEN`, **без** `AUTH_DEV_BYPASS` на проде.

---

## 8. Главная на телефоне ≠ Главная на ПК, Статистика одинаковая

**Симптом:** на телефоне в «Сегодня завершено» лишние короткие интервалы; на ПК их нет; вкладка Статистика на обоих устройствах совпадает (только серверные completed).

**Причина:**
- Home → Dexie live query;
- Stats → `GET /api/intervals/completed` (сервер);
- sync делал `replaceActive`, а completed только **upsert** → локальные сироты на устройстве, где complete ушёл в offline/failed path, оставались навсегда;
- `flushPendingOps` останавливал всю очередь на первой ошибке.

В логах Railway при этом видны `GET …/completed`, `UPDATE`, но нет `COMPLETE` для «призраков» — на сервер они не попадали.

**Решение:**
- `intervalsLocal.replaceCompletedForDate(date, serverRows, keepPendingIds)` в `pullAll`;
- flush: на 400/404/409 дропать мёртвую op и продолжать очередь; при 404 complete/manual — удалить локальный ghost;
- после успешного apply — `putEntry` ответа сервера.

---

## 9. UI таймера / статистики (не блокеры)

| Симптом | Причина | Решение |
|---------|---------|---------|
| Градиентные карточки в статистике | `surface-tint` на части MetricCard | Все → `surface-panel` |
| Running выглядел «брендовым градиентом» | gradient primary | Flat emerald, паттерн как у pause (янтарный flat) |
| Кнопки прыгают pause↔resume | Разный текст («Паўза» / «Працягнуць») | Текст всегда «Пауза»; меняются иконка и фон |
| Корзина «улетает» вниз | `flex-wrap` + `ml-auto` на одной оси | Actions слева, trash `shrink-0` справа в `justify-between` |

---

## 10. Чеклист, если снова «не синхронится»

1. Сравнить Home и Stats: если Stats ок, а Home нет → смотреть Dexie / pending_ops / последний `pullAll`.
2. Railway: есть ли `PUT …/complete` или только локальные записи.
3. Auth: `[auth] ok` vs hash mismatch → `validateInitData`.
4. Навигация: не возвращать BrowserRouter для табов без учёта `#tgWebAppData`.

---

## Связанные файлы (быстрый индекс)

| Тема | Где правили |
|------|-------------|
| initData HMAC | `backend/src/auth/validateInitData.ts` |
| Tabs без router | `App.tsx`, `AppTabContext.tsx`, `AppLayout.tsx`, `Navigation.tsx` |
| Sync reconcile | `hooks/useSync.ts`, `api/intervalsLocal.ts`, `api/pendingOps.ts` |
| Splash | `components/splash/*`, `App.tsx`, `index.css` (`data-splash`) |
| Timer UI | `components/intervals/TimerCard.tsx` |
| Telegram boot | `hooks/useTelegram.ts`, `api/client.ts`, `index.html` |
