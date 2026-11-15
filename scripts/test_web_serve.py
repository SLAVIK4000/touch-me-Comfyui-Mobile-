#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_web_serve.py — офлайн-проверка маршрутов кастом-ноды «Touch me».

Подменяет `server.PromptServer` заглушкой, импортирует настоящий
__init__.py из корня репозитория и через aiohttp-тестер проверяет
маршруты /touchme — так же, как их увидит живой ComfyUI.

Запуск: python3 scripts/test_web_serve.py
Требования: pip install aiohttp (в самом ComfyUI aiohttp уже есть).
"""
import asyncio
import importlib.util
import sys
import types
from pathlib import Path

from aiohttp import test_utils
from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent


def _install_prompt_server_stub() -> web.RouteTableDef:
    """Подменяет модуль `server` заглушкой с тем же контрактом."""
    table = web.RouteTableDef()

    class _Stub:
        routes = table

    fake_server = types.ModuleType("server")
    fake_server.PromptServer = _Stub
    fake_server.PromptServer.instance = _Stub()  # type: ignore[attr-defined]
    sys.modules["server"] = fake_server
    return table


async def main() -> int:
    table = _install_prompt_server_stub()

    # импорт реального __init__.py — маршруты регистрируются в таблицу
    spec = importlib.util.spec_from_file_location(
        "touch_me_node", ROOT / "__init__.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    app = web.Application()
    app.add_routes(table)

    results: list[tuple[str, int, frozenset[int]]] = []

    async with test_utils.TestClient(test_utils.TestServer(app)) as client:

        async def check(
            path: str,
            expected: frozenset[int],
            label: str,
            method: str = "GET",
            follow: bool = True,
        ) -> None:
            r = await client.request(method, path, allow_redirects=follow)
            results.append((f"[{method}] {label}", r.status, expected))

        await check("/touchme", frozenset({301}), "редирект на /touchme/",
                    follow=False)
        await check("/touchme/", frozenset({200}), "корень со слэшем")
        await check(
            "/touchme/whatever", frozenset({200}), "SPA-фолбэк на index.html"
        )
        await check(
            "/touchme/demo/gen_01.png", frozenset({200}), "демо-изображение"
        )
        await check("/touchme/", frozenset({200}), "HEAD-запрос", method="HEAD")
        await check(
            "/touchme/%2e%2e/__init__.py",
            frozenset({403, 404}),
            "path traversal (encoded ../)",
        )
        await check(
            "/touchme/..%2fpackage.json",
            frozenset({403, 404}),
            "path traversal (encoded ../ #2)",
        )

        # реальный js-чанк, на который ссылается index.html
        r = await client.get("/touchme/")
        html = await r.text() if r.status == 200 else ""
        i = html.find("/touchme/_next/")
        if i >= 0:
            j = html.find('"', i)
            j = j if j > 0 else len(html)
            asset = html[i:j]
            await check(asset, frozenset({200}), f"ассет {asset[:52]}")
        else:
            results.append(
                ("ассет /touchme/_next/… в index.html", -1, frozenset({200}))
            )

    print("=== test_web_serve: маршруты /touchme ===")
    failed = 0
    for label, got, expected in results:
        ok = got in expected
        failed += not ok
        want = "/".join(str(e) for e in sorted(expected))
        print(f"{'OK  ' if ok else 'FAIL'} {label}: {got} (ожидалось {want})")
    print(f"итог: {len(results) - failed}/{len(results)} проверок пройдено")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
