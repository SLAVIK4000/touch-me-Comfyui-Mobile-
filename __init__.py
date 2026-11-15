"""Touch me — мобильный web-интерфейс для ComfyUI (фаза 2: живой API).

Кастом-нода без графовых узлов: она не добавляет нод в граф, а отдаёт
собранный статический интерфейс (каталог ``web/``) по адресу
``http://<адрес сервера>/mobile``. Интерфейс живёт на том же origin,
что и сам ComfyUI, поэтому при работе через HTTPS-туннель (Google Colab
+ cloudflared) не появляется ни проблем с CORS, ни mixed-content.

Стандартный интерфейс ComfyUI не заменяется: мобильный интерфейс —
это ДОПОЛНИТЕЛЬНЫЙ маршрут ``/mobile``; корень сервера (``/``) как
отдавал классический интерфейс, так и продолжает отдавать его.

Маршруты:
- ``/mobile``  → 301 на ``/mobile/`` (канонический адрес со слэшем,
  чтобы относительные пути демо-галереи разрешались корректно);
- ``/mobile/{tail}`` → файл из ``web/``; для незнакомых путей —
  index.html (одностраничное приложение). Выход за пределы каталога
  ``web/`` блокируется.

Что работает (v0.3.0): интерфейс общается с API живого сервера —
списки моделей/LoRA/сэмплеров читаются из ``/object_info`` (тот же
источник, что у классического интерфейса; на Colab это папка моделей
в Google Drive — My Drive/ComfyUI/models), генерация ставит граф в
очередь через ``POST /prompt`` и следит за прогрессом по WebSocket
``/ws``; результаты приходят из ``/history``/``/view`` и попадают в
галерею. Без сервера интерфейс деградирует в офлайн-демо.
Пересобрать ``web/`` после правок исходников: ``scripts/build_comfyui_web.sh``.
"""

import logging
from pathlib import Path

__version__ = "0.3.0"

# Каталог собранного интерфейса (коммитится в репозиторий).
WEB_DIR = Path(__file__).resolve().parent / "web"

_LOG = logging.getLogger("touch-me")

# Нода не предоставляет графовых узлов — только web-интерфейс.
_NODE_CLASS_MAPPINGS: dict = {}
_NODE_DISPLAY_NAME_MAPPINGS: dict = {}


def _register_routes() -> None:
    """Регистрирует маршруты /mobile в PromptServer."""
    from aiohttp import web
    from server import PromptServer

    routes = PromptServer.instance.routes

    async def _redirect(request: "web.Request") -> "web.Response":
        raise web.HTTPMovedPermanently("/mobile/")

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
        method("/mobile")(_redirect)
        method("/mobile/{tail:.*}")(_serve)

    _LOG.info("web-UI доступен на http://<адрес сервера>/mobile/")


try:
    _register_routes()
except Exception as exc:  # сервер может быть не поднят в момент импорта
    _LOG.warning("не удалось зарегистрировать маршруты web-UI: %s", exc)
    print(f"[Touch me] routes not registered: {exc}")

NODE_CLASS_MAPPINGS = _NODE_CLASS_MAPPINGS
NODE_DISPLAY_NAME_MAPPINGS = _NODE_DISPLAY_NAME_MAPPINGS
