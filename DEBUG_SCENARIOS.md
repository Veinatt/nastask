# Debug scenarios (UX п.1–7)

Только при `AUTH_DEV_BYPASS=true` на бэкенде.

## Seed

```bash
curl -X POST "http://127.0.0.1:5000/api/debug/scenarios" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 334808852"
```

`X-User-Id` должен совпадать с `VITE_DEV_USER_ID` во фронте (по умолчанию `334808852`).

После seed обновите Главную (или дождитесь sync).

## Что проверить

| Ключ сценария | Ожидание |
|---|---|
| `empty_paused` | Пустой active — текст «не заполнен» (без warnEmpty) |
| `running_still_working` | Бежит >90 мин → диалог «Всё ещё работаешь?» |
| `paused_with_works` | На паузе, title+работы — «1 работа · заметка» |
| `active_friday_carryover` | Старт с пятницы; тег `>24ч` если возраст > суток |
| `active_stale` | Active >24ч → тег `>24ч` / `>24г` + сильная красная рамка |
| `completed_sparse` | Завершён без title/работ — красный border (п.2) |
| `completed_ok` | Нормальный completed с notes |

Дополнительно вручную:

1. **Старт / resume** — другие running уходят на паузу (п.3).
2. **Старт с шаблоном** — в диалоге «ЛЕЕЕТСГО» выбрать шаблон → работы появляются у active (п.4).
3. **Бот** (`BOT_ENABLED=true` + `BOT_TOKEN`):
   - в чате: `/pause`, кнопки pause;
   - авто: still-working ~30 мин, дайджест вс 19:00 Minsk;
   - локальный форс:
```bash
curl -X POST http://127.0.0.1:5000/api/debug/bot/ping -H "Content-Type: application/json" -H "X-User-Id: 334808852" -d '{"text":"ping"}'
curl -X POST http://127.0.0.1:5000/api/debug/bot/still-working -H "X-User-Id: 334808852"
curl -X POST http://127.0.0.1:5000/api/debug/bot/digest -H "X-User-Id: 334808852"
```

## Локальный запуск

```bash
# backend
cd backend && npm run dev

# frontend
cd frontend && npm run dev -- --host 127.0.0.1
```

- Frontend: http://127.0.0.1:5173  
- Backend: http://127.0.0.1:5000  
