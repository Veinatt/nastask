# Из Дневника → NasTask: скачивание через бота + стили модалок

Референс: проект `d:\dnevnik` (коммиты вокруг `a281a18` / `0aec925`).  
В NasTask сейчас: `frontend/src/utils/downloadFile.ts` + `backend/src/routes/download.ts` через `Telegram.WebApp.downloadFile`.

---

## 1. Скачивание файла через бота (`sendDocument`)

### Зачем

В Дневнике `downloadFile` часто сохранял **маленький `.txt`** (тело JSON-ошибки / устаревший токен), а не PDF.  
Надёжный обход в Mini App: бэкенд сам шлёт файл пользователю через Bot API `sendDocument` → файл появляется в **чате с ботом** с кнопкой «Открыть».

В браузере вне Telegram по-прежнему можно отдавать ссылку / blob.

### Схема

```
Mini App                          Backend                         Telegram Bot API
   |                                 |                                    |
   | POST /api/download/send         |                                    |
   | Authorization: tma <initData>   |                                    |
   | { kind / from / to / ... }      |                                    |
   |-------------------------------->|                                    |
   |                                 | проверить initData → userId        |
   |                                 | собрать файл (xlsx/csv/pdf/json)   |
   |                                 | multipart sendDocument             |
   |                                 |----------------------------------->|
   |                                 | chat_id = userId                   |
   |                                 | document = Blob + fileName         |
   |<--------------------------------| { success, via: "telegram" }       |
   | showAlert / banner: «файл в чате»                                    |
```

Важно: `chat_id` = Telegram `userId` из **валидированного** `initData` (как в `telegramAuth`). Пользователь должен хотя бы раз нажать Start у бота.

### Backend (как в Дневнике)

Файл-образец: `dnevnik/backend/src/services/telegramSend.ts`

```ts
import { config } from '../config'

export async function sendDocumentToUser(input: {
  userId: number
  fileName: string
  bytes: Buffer
  caption?: string
}): Promise<void> {
  const token = config.botToken
  if (!token) throw new Error('BOT_TOKEN is not configured')

  const form = new FormData()
  form.append('chat_id', String(input.userId))
  const bytes = new Uint8Array(input.bytes)
  form.append(
    'document',
    new Blob([bytes], { type: mimeFor(input.fileName) }),
    input.fileName,
  )
  if (input.caption) form.append('caption', input.caption)

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendDocument`,
    { method: 'POST', body: form },
  )
  const payload = (await response.json()) as { ok?: boolean; description?: string }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `sendDocument failed (${response.status})`)
  }
}

function mimeFor(fileName: string): string {
  if (fileName.endsWith('.pdf')) return 'application/pdf'
  if (fileName.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (fileName.endsWith('.csv')) return 'text/csv; charset=utf-8'
  if (fileName.endsWith('.json')) return 'application/json'
  return 'application/octet-stream'
}
```

Node 20+: глобальные `FormData` / `Blob` достаточно. `BOT_TOKEN` — тот же, что для проверки `initData`.

Роут (образец: `dnevnik/backend/src/routes/download.ts`):

```ts
// POST /api/download/send  + telegramAuth
downloadRouter.post('/send', telegramAuth, async (req, res) => {
  const userId = req.telegramUserId
  if (userId == null) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  try {
    // 1) Разобрать kind / year / month так же, как в POST /token
    // 2) Собрать Buffer файла тем же кодом, что GET /file
    const { bytes, fileName, caption } = await buildDownloadFile(userId, req.body)

    await sendDocumentToUser({ userId, fileName, bytes, caption })
    res.json({ success: true, via: 'telegram', fileName })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send failed'
    res.status(500).json({ success: false, error: message })
  }
})
```

В NasTask логично **переиспользовать** сборку файла из текущего `GET /api/download/file` (те же `kind`: `json-backup` | `tax-csv` | `tax-xlsx`), только без выдачи в HTTP — сразу `sendDocument`.

Существующий `POST /token` + `GET /file` оставь для браузера / запасного пути.

### Frontend (как в Дневнике)

Образец: `dnevnik/frontend/src/lib/download.ts`

Идея для NasTask — поменять `requestApiDownload` в `frontend/src/utils/downloadFile.ts`:

```ts
export async function requestApiDownload(
  kind: ApiDownloadKind,
  params?: { year?: number; month?: number; groupBy?: string },
): Promise<{ via: 'telegram' | 'browser' }> {
  try {
    if (isTelegramMiniApp()) {
      const res = await apiFetch<{ success: true; via: string; fileName: string }>(
        '/api/download/send',
        {
          method: 'POST',
          body: JSON.stringify({ kind, ...params }),
        },
      )
      emitSyncStatus(
        t('download.sentToBot', { name: res.fileName }) // добавь ключ i18n
          || `Файл отправлен в чат с ботом: ${res.fileName}`,
        'ok',
      )
      // опционально: Telegram.WebApp.showAlert(...)
      return { via: 'telegram' }
    }

    // как сейчас: token → triggerFileDownload
    const res = await apiFetch<TokenResponse>('/api/download/token', {
      method: 'POST',
      body: JSON.stringify({ kind, ...params }),
    })
    if (!res?.url || !res.fileName) throw new Error(t('download.linkMissing'))
    await triggerFileDownload(res.url, res.fileName)
    return { via: 'browser' }
  } catch (error) {
    const message = error instanceof Error ? error.message : t('download.failed')
    emitSyncStatus(message, 'error')
    throw error
  }
}
```

### Чеклист внедрения в NasTask

1. `backend/src/services/telegramSend.ts` — `sendDocumentToUser`.
2. `POST /api/download/send` рядом с `/token`, та же авторизация и те же `kind`/параметры.
3. В Mini App ветке `requestApiDownload` → `/send`, не `downloadFile`.
4. i18n: `download.sentToBot` (ru/be).
5. Проверить: пользователь писал боту `/start`; иначе Telegram вернёт ошибку вроде «chat not found» / «bot was blocked».
6. Лимит Bot API на размер документа (~50 MB) — для бэкапа/xlsx обычно ок.

### UX-текст

Кнопка может остаться «Скачать»; после успеха баннер:  
«Файл отправлен в чат с ботом — откройте там.»

---

## 2. Стили модалок как в Дневнике

### Что не так сейчас в NasTask

`frontend/src/components/ui/dialog.tsx` и `alert-dialog.tsx`:

- оверлей `bg-black/80` (слишком плотный);
- контент `bg-background` + `shadow-xl`, центрирование через `left-1/2 top-1/2 -translate-*`;
- весь контент в одном `overflow-y-auto` без отдельного sticky-header;
- крестик `absolute right-2 top-2`, header с `pr-12`.

В Дневнике модалки легче, карточка на `bg-card`, шапка отделена, скролл только у тела.

### Референс Дневника

Файлы:

- `dnevnik/frontend/src/components/ReadingDialog.tsx` — edit + confirm
- `dnevnik/frontend/src/index.css` — `.surface-panel`, токены `--card` / `--border`

Ключевые приёмы:

| Приём | Зачем |
| --- | --- |
| `createPortal(..., document.body)` | не клипается `overflow` у родителя (в NasTask уже есть Radix Portal — ок) |
| `useBodyScrollLock` → `document.body.style.overflow = 'hidden'` | фон не скроллится |
| Оверлей `bg-black/45` | мягче, чем `/80` |
| Карточка `bg-card` + `border-border/70` + `rounded-2xl` + `shadow-lg` | как панели приложения |
| `max-h-[calc(100dvh-1.5rem)]` + `flex flex-col` | влезает в Telegram WebView |
| Шапка `shrink-0` + `border-b`, тело `min-h-0 flex-1 overflow-y-auto overscroll-contain` | скролл формы, шапка на месте |
| Крестик круглый `h-9 w-9 rounded-full hover:bg-muted` | не огромный квадрат |
| Confirm: `max-w-sm`, кнопки `grid grid-cols-2`, danger `bg-red-600` | простой delete-диалог |

### Целевые классы (скопировать логику в Radix)

**Overlay** (и Dialog, и AlertDialog):

```tsx
className={cn(
  'fixed inset-0 z-50 bg-black/45',
  // убери тяжёлый dialog-overlay, если он делает blur/анимацию слишком агрессивно
  className,
)}
```

**DialogContent** — каркас как в Дневнике:

```tsx
className={cn(
  // вместо left/top/translate можно flex-центр на оверлее;
  // если оставляешь translate — сохрани max-h и flex-col:
  'fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md',
  'max-h-[calc(100dvh-1.5rem)] -translate-x-1/2 -translate-y-1/2',
  'flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-0 shadow-lg',
  className,
)}
```

Внутри (структура детей — в местах использования или обёрткой):

```tsx
{/* header */}
<div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 pr-12">
  <DialogTitle className="text-base font-semibold" />
</div>

{/* body */}
<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
  ...
</div>

{/* optional footer */}
<div className="shrink-0 border-t border-border p-4">
  <DialogFooter />
</div>
```

**Крестик** (ближе к Дневнику):

```tsx
className={cn(
  'absolute right-3 top-2.5 z-10 inline-flex h-9 w-9 items-center justify-center',
  'rounded-full text-muted-foreground',
  'hover:bg-muted hover:text-foreground',
  'focus:outline-none focus:ring-2 focus:ring-ring',
)}
// иконка: <X className="h-5 w-5" />
```

**AlertDialogContent** (confirm delete):

```tsx
className={cn(
  'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm',
  '-translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/70',
  'bg-card p-5 shadow-lg',
  className,
)}
```

Кнопки как в `ConfirmDelete`:

- Cancel: `rounded-xl border border-border px-3 py-2.5 text-sm`
- Destructive: `rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white`
- Ряд: `mt-4 grid grid-cols-2 gap-2` (на мобиле удобнее, чем stack)

**Title / description:**

- Title: `text-base font-semibold` (не обязательно `text-lg`)
- Description: `mt-2 text-sm text-muted-foreground`

### Панель «карточки» (если нужно единообразие)

Из `dnevnik/frontend/src/index.css`:

```css
.surface-panel {
  @apply rounded-2xl bg-card;
  border: 1px solid hsl(var(--border) / 0.7);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.05),
    0 6px 18px rgb(0 0 0 / 0.07);
}
```

Модалка по сути тот же surface + оверлей, без лишнего `bg-background`.

### Анимации (по желанию)

В Дневнике вход простой (без сильного zoom). Если в NasTask есть `.dialog-overlay` / `.dialog-content` в CSS — смягчи:

- overlay: opacity 0 → 1, ~150–200ms;
- content: opacity + лёгкий translateY(8px), **без** крупного scale;
- easing: `cubic-bezier(0.22, 1, 0.36, 1)`.

### Чеклист модалок в NasTask

1. `dialog.tsx` + `alert-dialog.tsx`: overlay `/45`, `bg-card`, `border-border/70`, `shadow-lg`, `rounded-2xl`.
2. Dialog: `overflow-hidden` + внутренний скролл тела; шапка/`DialogHeader` с `border-b`.
3. Крестик `rounded-full h-9 w-9`, иконка `h-5 w-5`.
4. Alert: `max-w-sm`, две кнопки в ряд, destructive красный.
5. Прогнать Complete / Manual / delete / settings-диалоги на узком Telegram WebView — шапка не должна уезжать при скролле длинной формы.

---

## 3. Где смотреть код Дневника

| Тема | Путь |
| --- | --- |
| sendDocument | `dnevnik/backend/src/services/telegramSend.ts` |
| POST `/send` | `dnevnik/backend/src/routes/download.ts` |
| Клиент Mini App | `dnevnik/frontend/src/lib/download.ts` |
| UX после отправки | `dnevnik/frontend/src/pages/TablesPage.tsx` |
| Модалка edit + confirm | `dnevnik/frontend/src/components/ReadingDialog.tsx` |
| Токены / surface | `dnevnik/frontend/src/index.css` |

В NasTask точки входа для правок:

- `frontend/src/utils/downloadFile.ts`
- `backend/src/routes/download.ts`
- `frontend/src/components/ui/dialog.tsx`
- `frontend/src/components/ui/alert-dialog.tsx`
