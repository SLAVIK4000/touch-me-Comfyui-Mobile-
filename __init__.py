"""Touch me — мобильный web-интерфейс для ComfyUI (фаза 1: оболочка).

Кастом-нода без графовых узлов: она не добавляет нод в граф, а отдаёт
собранный статический интерфейс (каталог ``web/``) по адресу
``http://<адрес сервера>/touchme/``. Интерфейс живёт на том же origin,
что и сам ComfyUI, поэтому на этапе интеграции (фаза 2) не появится ни
проблем с CORS, ни mixed-content при работе через HTTPS-туннель.

Маршруты:
- ``/touchme``  → 301 на ``/touchme/`` (канонический адрес со слэшем,
  чтобы относительные пути демо-галереи разрешались корректно);
- ``/touchme/{tail}`` → файл из ``web/``; для незнакомых путей —
  index.html (одностраничное приложение). Выход за пределы каталога
  ``web/`` блокируется.

Что работает сейчас: вся оболочка (панели, жесты, галерея) — локально,
на встроенных демо-данных. Кнопка генерации честно сообщает, что API
сервера ещё не подключён; интерфейс НЕ отправляет запросы к ComfyUI.
Пересобрать ``web/`` после правок исходников: ``scripts/build_comfyui_web.sh``.
"""

import logging
from pathlib import Path

__version__ = "0.1.0"

# Каталог собранного интерфейса (коммитится в репозиторий).
WEB_DIR = Path(__file__).resolve().parent / "web"

_LOG = logging.getLogger("touch-me")

# Нода не предоставляет графовых узлов — только web-интерфейс.
_NODE_CLASS_MAPPINGS: dict = {}
_NODE_DISPLAY_NAME_MAPPINGS: dict = {}


def _register_routes() -> None:
    """Регистрирует маршруты /touchme в PromptServer."""
    from aiohttp import web
    from server import PromptServer

    routes = PromptServer.instance.routes

    async def _redirect(request: "web.Request") -> "web.Response":
        raise web.HTTPMovedPermanently("/touchme/")

    async def _serve(request: "web.Request") -> "web.Response":
        tail = request.match_info.get("tail", "")
        target = (WEB_DIR / tail).resolve()
        # защита от выхода за пределы каталога web/ (path traversal)
        if not target.is_relative_to(WEB_DIR):
            raise web.HTTPNotFound()
        if target.is_file():
            return web.FileResponse(target)
        # одностраничное приложение: любой незнакомый путь — на index.html
        return web.FileResponse(WEB_DIR / "index.html")

    for method in (routes.get, routes.head):
        # RouteTableDef.get(path) возвращает декоратор — применяем его
        # к обработчику (эквивалент @routes.get(path) над функцией).
        method("/touchme")(_redirect)
        method("/touchme/{tail:.*}")(_serve)

    _LOG.info("web-UI доступен на http://<адрес сервера>/touchme/")


try:
    _register_routes()
except Exception as exc:  # сервер может быть не поднят в момент импорта
    _LOG.warning("не удалось зарегистрировать маршруты web-UI: %s", exc)
    print(f"[Touch me] routes not registered: {exc}")

NODE_CLASS_MAPPINGS = _NODE_CLASS_MAPPINGS
NODE_DISPLAY_NAME_MAPPINGS = _NODE_DISPLAY_NAME_MAPPINGS
