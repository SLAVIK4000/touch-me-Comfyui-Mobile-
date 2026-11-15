# Контракт с ComfyUI API (к этапу интеграции)

Справочник эндпоинтов, которые будет использовать клиент «Touch me».
Соответствует официальной документации ComfyUI (docs.comfy.org); поведение
на живом сервере подтверждается при первом подключении (этап 2 плана).

## HTTP

| Метод | Маршрут | Назначение |
|---|---|---|
| POST | `/prompt` | Постановка графа в очередь. Тело: `{ "prompt": {…}, "client_id": "…" }`. Ответ: `{ prompt_id, node_errors }` — ошибки валидации нод показываются пользователю явно |
| GET | `/queue` | Содержимое очереди (running/pending) |
| POST | `/queue` | Удаление элементов очереди |
| POST | `/interrupt` | Отмена текущей генерации |
| GET | `/history/{prompt_id}` | История выполнения: `outputs[<node>].images[{ filename, subfolder, type }]` |
| GET | `/view?filename=…&subfolder=…&type=output` | Получение файла изображения (для галереи) |
| POST | `/upload/image` | multipart: файл, `overwrite`, `subfolder` → `{ name, subfolder, type: "input" }` (img2img) |
| POST | `/upload/mask` | То же для маски (inpainting) |
| GET | `/object_info[/{NodeClass}]` | Интроспекция нод: допустимые значения виджетов — сэмплеры, шедулеры, модели по категориям загрузчиков |
| GET | `/system_stats` | Состояние сервера (GPU, очередь) — пинг для индикатора соединения |

## WebSocket — `ws(s)://…/ws?clientId=<uuid>`

JSON-события: `status`, `execution_start`, `execution_cached`, `executing`,
`progress` (`{ value, max }` — шаги сэмплера), `executed` (нода SaveImage →
забрать результат из `/history`), `execution_error`. Бинарные кадры — превью
в реальном времени (точный формат заголовка проверяется на живом сервере).

## Важные замечания

- **Формат prompt.** API принимает граф в API-формате
  (`{ "<id>": { "class_type", "inputs" } }`), а не UI-экспорт (`nodes/links`).
  Экспортируйте шаблон через «Save (API Format)» в редакторе ComfyUI.
- **client_id** генерируется на клиенте и передаётся и в `/prompt`, и в `/ws`.
- **CORS:** ComfyUI отдаёт `Access-Control-Allow-Origin: *` — интерфейс может
  хоститься отдельно (например, GitHub Pages) и обращаться к серверу напрямую.
- **Туннель Colab (cloudflared):** адрес `https://…trycloudflare.com` эфемерный
  (меняется при каждом перезапуске ноутбука), WebSocket поддерживается.
  Страница по HTTPS должна обращаться только к HTTPS-API (mixed content
  браузером блокируется). Отсюда обязательность поля адреса сервера и
  сохранения его в localStorage (этап 1 интеграции).
- **Имена загруженных файлов:** ответ `/upload/image` подставляется в
  `LoadImage.image` в формате `"name [input]"`.
- **Bypass-семантика LoRA:** в UI-графе обход узла = «сигнал проходит мимо»;
  в API-формате это перепривязка входов (`model`/`clip` предыдущего узла),
  поэтому сборщик цепочки строит последовательность только из активных LoRA.
