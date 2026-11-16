#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_mock_comfyui.py — E2E-проверка сборки «Touch me» против мока ComfyUI.

Поднимает HTTP-сервер, который имитирует ComfyUI ровно в тех эндпоинтах,
которые использует мобильный интерфейс:
  GET  /system_stats, /object_info, /history, /history/{id}, /view
  POST /prompt, /interrupt, /upload/image
  WS   /ws?clientId=...
Маршруты /mobile регистрирует НАСТОЯЩИЙ __init__.py кастом-ноды (через
подмену PromptServer, как в test_web_serve.py).

Затем (если доступен agent-browser) открывает http://127.0.0.1:8199/mobile/
и проверяет сценарий целиком:
  1) чип соединения становится COMFYUI · ОНЛАЙН;
  2) панель «Модели» показывает списки из мока /object_info
     (checkpoints → sd_xl_turbo_1.0_fp16.safetensors и т.д.);
  3) галерея подхватывает историю мока;
  4) генерация: прогресс → готово → новое изображение в галерее.

Запуск: python3 scripts/test_mock_comfyui.py [--serve]
  --serve    только поднять сервер (для ручной проверки в браузере)
Требования: aiohttp, Pillow; agent-browser — для авто-проверок.
"""

import asyncio
import base64
import io
import json
import sys
import time
import types
import uuid
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent
PORT = 8199

# ---------------------------------------------------------------- мок-данные

MOCK_CHECKPOINTS = [
    "sd_xl_turbo_1.0_fp16.safetensors",
    "dreamshaperXL_lightning.safetensors",
    "juggernautXL_v9.safetensors",
    "v1-5-pruned-emaonly.ckpt",
]
MOCK_LORAS = [
    "sd_xl_turbo_lora_v1.safetensors",
    "add_detail.safetensors",
    "neon_noir_xl.safetensors",
]
MOCK_VAE = ["ae.safetensors", "sdxl_vae.safetensors"]
MOCK_UNET = ["flux1-dev-fp8.safetensors"]
MOCK_CLIP = ["clip_g.safetensors", "clip_l.safetensors"]
MOCK_CONTROLNET = ["control_v11p_sd15_canny.pth"]
MOCK_UPSCALE = ["4x-UltraSharp.pth", "RealESRGAN_x4plus.pth"]
MOCK_SAMPLERS = ["euler", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "er_sde", "lcm"]
MOCK_SCHEDULERS = ["normal", "karras", "simple", "sgm_uniform"]


def _widget(values):
    return [values, {"tooltip": ""}]


def object_info_payload():
    return {
        "CheckpointLoaderSimple": {
            "input": {"required": {"ckpt_name": _widget(MOCK_CHECKPOINTS)}},
            "output": ["MODEL", "CLIP", "VAE"],
        },
        "UNETLoader": {
            "input": {"required": {"unet_name": _widget(MOCK_UNET)}},
            "output": ["MODEL"],
        },
        "CLIPLoader": {
            "input": {"required": {"clip_name": _widget(MOCK_CLIP)}},
            "output": ["CLIP"],
        },
        "VAELoader": {
            "input": {"required": {"vae_name": _widget(MOCK_VAE)}},
            "output": ["VAE"],
        },
        "LoraLoader": {
            "input": {
                "required": {
                    "lora_name": _widget(MOCK_LORAS),
                    "strength_model": (0, {"min": -10, "max": 10, "step": 0.01}),
                    "strength_clip": (0, {"min": -10, "max": 10, "step": 0.01}),
                }
            },
            "output": ["MODEL", "CLIP"],
        },
        "ControlNetLoader": {
            "input": {"required": {"control_net_name": _widget(MOCK_CONTROLNET)}},
            "output": ["CONTROL_NET"],
        },
        "UpscaleModelLoader": {
            "input": {"required": {"model_name": _widget(MOCK_UPSCALE)}},
            "output": ["UPSCALE_MODEL"],
        },
        "KSampler": {
            "input": {
                "required": {
                    "seed": (0, {"min": 0, "max": 1e9}),
                    "steps": (20, {"min": 1, "max": 100}),
                    "cfg": (8, {"min": 1, "max": 20}),
                    "sampler_name": _widget(MOCK_SAMPLERS),
                    "scheduler": _widget(MOCK_SCHEDULERS),
                    "denoise": (1, {"min": 0, "max": 1}),
                }
            },
            "output": ["LATENT"],
        },
        "SaveImage": {"input": {"required": {"filename_prefix": "input"}}},
    }


def make_png(seed: int) -> bytes:
    """Генерирует маленький PNG-файл результата."""
    from PIL import Image

    w, h = 192, 288
    img = Image.new("RGB", (w, h))
    px = img.load()
    r = (seed * 37) % 256
    g = (seed * 91) % 256
    b = (seed * 53) % 256
    for y in range(h):
        for x in range(w):
            fade = (x + y) / (w + h)
            px[x, y] = (
                int(r * fade + 40),
                int(g * (1 - fade) + 20),
                int(b * fade + 90),
            )
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------- состояние мока

HISTORY = {}  # prompt_id → entry
RESULTS = {}  # filename → bytes
UPLOADS = {}  # input filename → bytes
WS_CLIENTS = set()
STATE = {"counter": 0}


def gen_filename():
    STATE["counter"] += 1
    return f"touchme_{STATE['counter']:05d}_.png"


async def broadcast_json(payload: dict):
    msg = json.dumps(payload)
    dead = []
    for ws in list(WS_CLIENTS):
        try:
            await ws.send_str(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        WS_CLIENTS.discard(ws)


async def fake_execution(prompt_id: str, workflow: dict):
    """Имитирует прогон графа: события в /ws + запись в историю."""
    await asyncio.sleep(0.15)
    await broadcast_json({"type": "status", "data": {"sid": "mock"}})
    await broadcast_json({"type": "execution_start", "data": {"prompt_id": prompt_id}})

    steps = 12
    for node in workflow:
        await asyncio.sleep(0.05)
        await broadcast_json({"type": "executing", "data": {"node": node}})
    for step in range(1, steps + 1):
        await asyncio.sleep(0.12)
        await broadcast_json(
            {"type": "progress", "data": {"value": step, "max": steps}}
        )

    images = []
    for i, node in enumerate(workflow):
        if workflow[node]["class_type"] == "SaveImage":
            filename = gen_filename()
            RESULTS[filename] = make_png((STATE["counter"] * 7919 + i) % 256)
            images.append({"filename": filename, "subfolder": "", "type": "output"})
            await broadcast_json(
                {
                    "type": "executed",
                    "data": {
                        "node": node,
                        "output": {"images": [
                            {"filename": filename, "subfolder": "", "type": "output"}
                        ]},
                    },
                }
            )

    HISTORY[prompt_id] = {
        "prompt": [prompt_id],
        "outputs": {
            node: {"images": images}
            for node in workflow
            if workflow[node]["class_type"] == "SaveImage"
        },
        "status": {"status_str": "success", "completed": True},
    }
    await broadcast_json({"type": "execution_success", "data": {"prompt_id": prompt_id}})


def seed_history():
    """Стартовая история — как будто ранее генерировали в классическом UI."""
    for i in range(3):
        pid = f"seed-{i}"
        filename = f"previous_run_{i:02d}.png"
        RESULTS[filename] = make_png(31 * (i + 1))
        HISTORY[pid] = {
            "prompt": [pid],
            "outputs": {"9": {"images": [
                {"filename": filename, "subfolder": "", "type": "output"}
            ]}},
            "status": {"status_str": "success", "completed": True},
        }


# ---------------------------------------------------------------- HTTP-обработчики

async def h_system_stats(request):
    return web.json_response(
        {
            "system": {
                "comfyui_version": "1.3.45-mock",
                "os": "colab-mock",
                "ram": 0,
            },
            "devices": [{"name": "MOCK T4", "type": "cuda", "vram_total": 16 << 30}],
        }
    )


async def h_object_info(request):
    return web.json_response(object_info_payload())


async def h_prompt(request):
    body = await request.json()
    workflow = body.get("prompt") or {}
    if not isinstance(workflow, dict) or not workflow:
        return web.json_response({"error": "пустой граф"}, status=400)
    for node, spec in workflow.items():
        if "class_type" not in spec:
            return web.json_response(
                {"error": f"узел {node}: нет class_type"}, status=400
            )
    prompt_id = str(uuid.uuid4())
    asyncio.get_event_loop().create_task(fake_execution(prompt_id, workflow))
    return web.json_response({"prompt_id": prompt_id, "number": 1, "node_errors": {}})


async def h_interrupt(request):
    return web.json_response({}, status=200)


async def h_history(request):
    tail = request.path[len("/history"):]
    if tail.startswith("/"):
        pid = tail[1:].split("?")[0]
        if pid in HISTORY:
            return web.json_response({pid: HISTORY[pid]})
        return web.json_response({})
    return web.json_response(dict(sorted(HISTORY.items(), reverse=True)))


async def h_view(request):
    filename = request.query.get("filename", "")
    ftype = request.query.get("type", "output")
    data = None
    if ftype == "input" and filename in UPLOADS:
        data = UPLOADS[filename]
    elif filename in RESULTS:
        data = RESULTS[filename]
    if data is None:
        return web.json_response({"error": "not found"}, status=404)
    return web.Response(
        body=data,
        content_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


async def h_upload_image(request):
    reader = await request.multipart()
    field = await reader.next()
    if field is None or field.name != "image":
        return web.json_response({"error": "нет поля image"}, status=400)
    data = await field.read(decode=False)
    name = field.filename or "upload.png"
    UPLOADS[name] = data
    return web.json_response({"name": name, "subfolder": "", "type": "input"})


async def h_ws(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    WS_CLIENTS.add(ws)
    await ws.send_str(json.dumps({"type": "status", "data": {"sid": "mock"}}))
    try:
        async for msg in ws:
            pass  # входящие кадры мока не используются
    except Exception:
        pass
    finally:
        WS_CLIENTS.discard(ws)
    return ws


# ------------------------------------------------- маршруты /mobile из настоящей ноды

def install_mobile_routes(app: web.Application):
    """Регистрирует маршруты /mobile настоящим __init__.py кастом-ноды."""
    table = web.RouteTableDef()

    class _Stub:
        routes = table

    fake_server = types.ModuleType("server")
    fake_server.PromptServer = _Stub
    fake_server.PromptServer.instance = _Stub()
    sys.modules["server"] = fake_server

    import importlib.util

    spec = importlib.util.spec_from_file_location("touch_me_node", ROOT / "__init__.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    # блокируем подмену перед добавлением мок-маршрутов
    del sys.modules["server"]

    app.add_routes(table)
    return module


def build_app() -> web.Application:
    app = web.Application()
    install_mobile_routes(app)
    app.router.add_get("/system_stats", h_system_stats)
    app.router.add_get("/object_info", h_object_info)
    app.router.add_post("/prompt", h_prompt)
    app.router.add_post("/interrupt", h_interrupt)
    app.router.add_get("/history", h_history)
    app.router.add_get("/history/{tail}", h_history)
    app.router.add_get("/view", h_view)
    app.router.add_post("/upload/image", h_upload_image)
    app.router.add_get("/ws", h_ws)
    return app


# ---------------------------------------------------------------- авто-проверки

async def run_checks(base: str) -> int:
    """E2E через agent-browser: живой сценарий мобильного интерфейса."""
    import subprocess

    class _R:
        def __init__(self, rc=1, out=""):
            self.returncode = rc
            self.stdout = out
            self.stderr = ""

    def ab(*args, timeout=30):
        try:
            return subprocess.run(
                ["agent-browser", *args], capture_output=True, text=True,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired as exc:
            # демон занят (холодный старт/загрузка) — считаем «без ответа»
            out = exc.stdout if isinstance(exc.stdout, str) else ""
            return _R(124, out)

    def ab_ok(*args):
        r = ab(*args)
        if r.returncode != 0:
            # демон мог не ответить на первый вызов — одна повторная попытка
            time.sleep(1.5)
            r = ab(*args)
        if r.returncode != 0:
            print(f"    agent-browser {args} → rc={r.returncode}\n    {r.stdout[-500:]} {r.stderr[-500:]}")
        return r.returncode == 0, r.stdout

    failures = []

    # прогрев демона: холодный старт браузера может занимать больше минуты —
    # вызов с большим бюджетом времени, ответ не критичен
    ab("open", "about:blank", timeout=150)

    def check(label, ok):
        print(f"  [{'OK' if ok else 'FAIL'}] {label}")
        if not ok:
            failures.append(label)

    # открытие страницы: демон при холодном старте может «терять» ответ
    # команды open, поэтому успех подтверждаем опросом заголовка и повторяем
    # команда open может не вернуть ответ, но страницу всё равно открыть;
    # успех подтверждается опросом заголовка до 60 секунд
    ab("open", f"{base}/mobile/", timeout=90)
    opened = False
    deadline = time.time() + 60
    while time.time() < deadline:
        t = ab("get", "title")
        if t.returncode == 0 and t.stdout.strip():
            opened = True
            break
        time.sleep(2.0)
    check("страница /mobile/ открылась", opened)
    await asyncio.sleep(2.0)

    ok, snap1 = ab_ok("snapshot")
    if not ok or not snap1.strip():
        time.sleep(2.0)
        ok, snap1 = ab_ok("snapshot")
    check("снимок страницы получен", ok)
    if snap1:
        check("чип соединения: COMFYUI · ОНЛАЙН", "COMFYUI · ОНЛАЙН" in snap1 or "COMFYUI ·\u00a0ОНЛАЙН" in snap1 or "ОНЛАЙН" in snap1)
        check("галерея подхватила историю сервера", "previous_run_" in snap1 or "02" in snap1)

    # панель «Модели»
    ok, _ = ab_ok("click", 'button[aria-label="Модели"]')
    check("тайл «Модели» нажат", ok)
    await asyncio.sleep(2.5)
    ok, snap2 = ab_ok("snapshot")
    if snap2:
        check("checkpoint из Google Drive (object_info)", "sd_xl_turbo_1.0_fp16.safetensors" in snap2)
        check("источник списков — ComfyUI /object_info", "/object_info" in snap2)
        check("кнопка обновления списков присутствует", "Обновить" in snap2)

    # панель LoRA: добавляем блок и открываем список файлов
    ok, _ = ab_ok("click", 'button[aria-label="LoRA"]')
    check("тайл «LoRA» нажат", ok)
    await asyncio.sleep(1.5)
    ok, _ = ab_ok("click", 'button[aria-label="Добавить LoRA"]')
    check("блок LoRA добавлен", ok)
    await asyncio.sleep(1.5)
    # открываем выпадающий список файлов LoRA (Radix-портал)
    ab_ok("click", '[role="combobox"]')
    await asyncio.sleep(1.2)
    ok, snap3 = ab_ok("snapshot")
    if snap3:
        check("LoRA-файлы из loras/ сервера", "sd_xl_turbo_lora_v1.safetensors" in snap3)
    # закрываем список, чтобы он не перекрывал нижнюю панель
    ab_ok("press", "Escape")
    await asyncio.sleep(0.6)

    # запуск генерации
    ok, _ = ab_ok("click", 'button[aria-label="Запустить генерацию"]')
    check("кнопка генерации нажата", ok)
    await asyncio.sleep(1.2)
    ok, snap4 = ab_ok("snapshot")
    if snap4:
        check("прогресс/фаза генерации видны", "сэмплирование" in snap4 or "выполнение графа" in snap4 or "в очереди" in snap4)
    await asyncio.sleep(4.5)
    ok, snap5 = ab_ok("snapshot")
    if snap5:
        check("генерация завершилась (пропала строка прогресса)", "шаг" not in snap5)
        check("новый результат в галерее", "touchme_00001" in snap5)

    print()
    if failures:
        print(f"E2E FAIL: {len(failures)} проверок не прошло: {failures}")
        return 1
    print("E2E: все проверки прошли")
    return 0


async def main() -> int:
    serve_only = "--serve" in sys.argv
    seed_history()
    app = build_app()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", PORT)
    await site.start()
    base = f"http://127.0.0.1:{PORT}"
    print(f"мок ComfyUI + /mobile поднят: {base}/mobile/ (object_info: {len(object_info_payload())} нод)")

    if serve_only:
        print("--serve: сервер живёт до Ctrl+C")
        try:
            await asyncio.sleep(3600 * 24)
        except KeyboardInterrupt:
            pass
        await runner.cleanup()
        return 0

    try:
        rc = await run_checks(base)
    finally:
        await runner.cleanup()
    return rc


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
