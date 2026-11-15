import { NextResponse } from "next/server";
import { readdirSync, type Dirent } from "fs";
import { join, relative, sep } from "path";

/**
 * /api/models — сканер папки Models в стиле ComfyUI.
 *
 * Возвращает список моделей по стандартным категориям
 * (поддиректориям Models/): checkpoints, unet, clip, vae, loras,
 * controlnet, upscale_models. Каждая категория сканируется рекурсивно —
 * как это делает ComfyUI, показывая модели из подпапок как
 * «подпапка/файл».
 *
 * Каталог задаётся переменной окружения COMFYUI_MODELS_DIR
 * (например, путь к ComfyUI/models реального сервера);
 * по умолчанию — <проект>/models.
 *
 * Скан выполняется при каждом запросе, поэтому добавление/удаление
 * файлов в директориях подхватывается автоматически при следующем
 * открытии панели «Модели».
 */

const CATEGORIES = [
  "checkpoints",
  "unet",
  "diffusion_models",
  "clip",
  "vae",
  "loras",
  "controlnet",
  "upscale_models",
] as const;

/** расширения файлов моделей, которые показывает ComfyUI */
const EXTS = new Set([
  ".safetensors",
  ".ckpt",
  ".pt",
  ".pth",
  ".bin",
  ".gguf",
  ".sft",
]);

const MAX_DEPTH = 4;

function scanDir(root: string, depth = 0): string[] {
  let out: string[] = [];
  let entries: Dirent[] = [];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = join(root, e.name);
    if (e.isDirectory()) {
      if (depth < MAX_DEPTH) out = out.concat(scanDir(full, depth + 1));
    } else if (EXTS.has(e.name.slice(e.name.lastIndexOf(".")))) {
      out.push(full);
    }
  }
  return out;
}

export async function GET() {
  const modelsRoot =
    process.env.COMFYUI_MODELS_DIR ?? join(process.cwd(), "models");

  const categories: Record<string, string[]> = {};
  for (const cat of CATEGORIES) {
    const files = scanDir(join(modelsRoot, cat));
    categories[cat] = files
      .map((f) => relative(join(modelsRoot, cat), f).split(sep).join("/"))
      .sort((a, b) => a.localeCompare(b));
  }

  return NextResponse.json(
    { root: modelsRoot, categories },
    { headers: { "Cache-Control": "no-store" } },
  );
}
