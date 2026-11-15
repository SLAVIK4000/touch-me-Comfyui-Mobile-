/**
 * Touch me — источники данных.
 *
 * ВАЖНО: этот модуль — единственная точка, откуда UI получает данные.
 * Сейчас значения приходят из локальных ресурсов-заглушек; при подключении
 * ComfyUI API на следующем этапе функции заменяются на HTTP-запросы
 * (/object_info, /models, ComfyUI-Easy-Use styles) без изменения UI-кода.
 */

import fooocusStylesRaw from "./fooocus_styles.json";
import { DEMO_MODELS_DIRECTORY } from "./demo_models";
import type { FooocusStyle, ModelLoaderType, ModelsDirectory } from "../types";
import { LOADER_CATEGORY } from "../types";

/* ---------------- Fooocus Styles ---------------- */

/**
 * Возвращает список доступных Fooocus Styles.
 * Сейчас — из файла ресурса (копия resources/fooocus_styles.json из
 * ComfyUI-Easy-Use, 275 стилей); в будущем — запрос к источнику стилей.
 */
export async function fetchFooocusStyles(): Promise<FooocusStyle[]> {
  // Имитация сетевой задержки, чтобы UI заранее учитывал асинхронность.
  await new Promise((r) => setTimeout(r, 120));
  return fooocusStylesRaw as FooocusStyle[];
}

/* ---------------- Модели ---------------- */

/**
 * Категории папки Models/, сканируемые сервером (/api/models).
 * Стандартная структура ComfyUI: Models/checkpoints, Models/vae и т.д.
 */
export const MODEL_CATEGORIES = [
  "checkpoints",
  "unet",
  "clip",
  "vae",
  "loras",
  "controlnet",
  "upscale_models",
] as const;

/**
 * Снимок папки Models: серверная точка /api/models сканирует директорию
 * в реальном времени, поэтому изменения файлов подхватываются при
 * каждом открытии панели (панель монтируется заново).
 * Путь к папке задаётся переменной окружения COMFYUI_MODELS_DIR
 * (по умолчанию — <проект>/models, имитирующая структуру ComfyUI).
 *
 * Если маршрут недоступен (например, интерфейс собран статикой и отдаётся
 * самим ComfyUI) или все категории пусты — возвращается встроенный
 * демо-набор имён (demo_models.ts, без весов), чтобы офлайн-версия
 * оставалась обозримой.
 */
export async function fetchModelsDirectory(): Promise<ModelsDirectory> {
  try {
    const res = await fetch("/api/models", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as ModelsDirectory;
      const found = Object.values(data.categories).reduce(
        (n, list) => n + (list?.length ?? 0),
        0,
      );
      if (found > 0) return data; // реальный снимок каталога
    }
  } catch {
    // офлайн / нет сервера — демо-фолбэк ниже
  }
  return DEMO_MODELS_DIRECTORY;
}

/**
 * Список доступных моделей для конкретного загрузчика —
 * из ЕГО категории папки Models (стандартные ноды ComfyUI).
 */
export async function fetchModelsForType(
  type: ModelLoaderType,
): Promise<string[]> {
  const dir = await fetchModelsDirectory();
  return dir.categories[LOADER_CATEGORY[type]] ?? [];
}

export { LOADER_LABELS } from "../types";

/* ---------------- KSampler ---------------- */

export const SAMPLERS = [
  "euler",
  "euler_ancestral",
  "heun",
  "heunpp2",
  "dpm_2",
  "dpm_2_ancestral",
  "lms",
  "dpm_fast",
  "dpm_adaptive",
  "dpmpp_2s_ancestral",
  "dpmpp_sde",
  "dpmpp_2m",
  "dpmpp_2m_sde",
  "dpmpp_3m_sde",
  "ddim",
  "uni_pc",
  "lcm",
];

export const SCHEDULERS = [
  "normal",
  "karras",
  "exponential",
  "sgm_uniform",
  "simple",
  "ddim_uniform",
  "beta",
];

/* ---------------- Разрешение: популярные пресеты ---------------- */

export const ASPECT_PRESETS: {
  label: string;
  ratio: string;
  sizes: { w: number; h: number }[];
}[] = [
  { label: "1:1", ratio: "1:1", sizes: [{ w: 1024, h: 1024 }] },
  { label: "3:4", ratio: "3:4", sizes: [{ w: 896, h: 1152 }, { w: 768, h: 1024 }] },
  { label: "9:16", ratio: "9:16", sizes: [{ w: 720, h: 1280 }, { w: 576, h: 1024 }] },
  { label: "4:3", ratio: "4:3", sizes: [{ w: 1152, h: 896 }, { w: 1024, h: 768 }] },
  { label: "16:9", ratio: "16:9", sizes: [{ w: 1280, h: 720 }, { w: 1024, h: 576 }] },
  { label: "2:3", ratio: "2:3", sizes: [{ w: 832, h: 1216 }] },
];

/* ---------------- Upscale ---------------- */

export const UPSCALE_METHODS = [
  "Latent (nearest)",
  "ESRGAN x4+",
  "4x-UltraSharp",
  "SwinIR",
  "Lanczos",
  "Area",
];

/* ---------------- Демо-галерея ---------------- */

export const DEMO_GALLERY = [
  {
    id: "demo-01",
    name: "neon_portrait_01.png",
    src: "demo/gen_01.png",
    width: 768,
    height: 1344,
    createdAt: "2026-11-14T13:59:00.000Z",
    meta: { seed: 883712, steps: 30, cfg: 7, sampler: "dpmpp_2m_sde", prompt: "cyberpunk portrait, neon" },
  },
  {
    id: "demo-02",
    name: "night_city.png",
    src: "demo/gen_02.png",
    width: 768,
    height: 1344,
    createdAt: "2026-11-13T22:10:00.000Z",
    meta: { seed: 145290, steps: 25, cfg: 6.5, sampler: "euler", prompt: "neon city at night, rain" },
  },
  {
    id: "demo-03",
    name: "liquid_chrome.png",
    src: "demo/gen_03.png",
    width: 768,
    height: 1344,
    createdAt: "2026-11-12T18:41:00.000Z",
    meta: { seed: 902223, steps: 28, cfg: 5.5, sampler: "dpmpp_2m", prompt: "abstract liquid chrome" },
  },
  {
    id: "demo-04",
    name: "rain_samurai.png",
    src: "demo/gen_04.png",
    width: 1344,
    height: 768,
    createdAt: "2026-11-11T09:03:00.000Z",
    meta: { seed: 551207, steps: 32, cfg: 8, sampler: "dpmpp_3m_sde", prompt: "samurai in rain" },
  },
];

/* ---------------- Рабочая заглушка WorkflowManager ---------------- */

/**
 * Каркас менеджера workflow. Сейчас описывает только контракт;
 * на следующем этапе здесь появятся сборка графа ComfyUI и выполнение
 * через /prompt + WebSocket /ws.
 */
export interface WorkflowDescriptor {
  id: string;
  name: string;
  supportedModes: string[];
}

export const AVAILABLE_WORKFLOWS: WorkflowDescriptor[] = [
  {
    id: "basic-t2i",
    name: "Text to Image (базовый)",
    supportedModes: ["t2i"],
  },
  {
    id: "img2img-adapt",
    name: "Img2Img + апскейл (подготовка)",
    supportedModes: ["t2i", "img2img", "upscale"],
  },
];
