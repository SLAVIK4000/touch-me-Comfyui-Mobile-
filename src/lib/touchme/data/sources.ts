/**
 * Touch me — источники данных.
 *
 * Единственная точка, откуда UI получает списки. Значения читаются из
 * ЖИВОГО ComfyUI через /object_info — из того же источника, что берут
 * выпадающие списки стандартных нод классический интерфейс. Поэтому на
 * Colab (папка моделей в Google Drive) списки идентичны оригинальному
 * интерфейсу: Checkpoint-блок видит файлы Drive/checkpoints, LoRA-блок —
 * Drive/loras и так далее по каждой категории.
 *
 * Если сервер недоступен (страница открыта офлайн/из демо-сборки без
 * ComfyUI), возвращается встроенный демо-набор имён (demo_models.ts).
 */

import fooocusStylesRaw from "./fooocus_styles.json";
import { DEMO_MODELS_DIRECTORY } from "./demo_models";
import {
  CATEGORY_SOURCE_NODE,
  fetchObjectInfo,
  widgetValues,
} from "../api/comfy";
import type {
  FooocusStyle,
  ModelCategory,
  ModelLoaderType,
  ModelsDirectory,
} from "../types";
import { LOADER_CATEGORY } from "../types";

/* ---------------- Fooocus Styles ---------------- */

/**
 * Список Fooocus Styles из файла ресурса (копия
 * resources/fooocus_styles.json из ComfyUI-Easy-Use, 275 стилей).
 */
export async function fetchFooocusStyles(): Promise<FooocusStyle[]> {
  await new Promise((r) => setTimeout(r, 120));
  return fooocusStylesRaw as FooocusStyle[];
}

/* ---------------- Модели: /object_info живого сервера ---------------- */

/**
 * Снимок списков моделей сервера: по одной категории на каждый стандартный
 * загрузчик ComfyUI. При force=true кэш /object_info обходится (кнопка
 * «Обновить» после добавления файлов в Google Drive).
 *
 * Пока сервер ОТВЕТИЛ, возвращаются его списки как есть — даже если
 * какая-то папка пуста (оригинальный интерфейс в этом случае тоже покажет
 * пустой список). Демо-набор включается только когда сервер недоступен
 * (страница открыта офлайн/из демо-сборки без ComfyUI).
 */
export async function fetchModelsDirectory(force = false): Promise<ModelsDirectory> {
  try {
    const info = await fetchObjectInfo(force);
    const categories: Partial<Record<ModelCategory, string[]>> = {};
    let found = 0;
    for (const [category, src] of Object.entries(CATEGORY_SOURCE_NODE)) {
      const values = widgetValues(info, src.node, src.input);
      categories[category as ModelCategory] = values;
      found += values.length;
    }
    // живой сервер: его списки = списки оригинального интерфейса
    return {
      root:
        found > 0
          ? "ComfyUI · /object_info (Google Drive)"
          : "ComfyUI · /object_info",
      categories,
    };
  } catch {
    /* сервер недоступен — демо-фолбэк ниже */
  }
  return { ...DEMO_MODELS_DIRECTORY, root: "демо-список (сервер недоступен)" };
}

/**
 * Список доступных моделей для конкретного загрузчика — из ЕГО категории
 * (как выпадающий список соответствующей ноды в оригинальном интерфейсе).
 */
export async function fetchModelsForType(
  type: ModelLoaderType,
): Promise<string[]> {
  const dir = await fetchModelsDirectory();
  return dir.categories[LOADER_CATEGORY[type]] ?? [];
}

/* ---------------- Сэмплеры и шедулеры KSampler ---------------- */

/** Офлайн-фолбэк: стандартный набор ComfyUI (актуален для большинства серверов). */
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
  "er_sde",
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

export interface SamplerOptions {
  samplers: string[];
  schedulers: string[];
}

/**
 * Списки sampler/scheduler — из виджетов ноды KSampler на живом сервере
 * (идентично выпадающим спискам оригинального интерфейса), с офлайн-фолбэком.
 */
export async function fetchSamplerOptions(): Promise<SamplerOptions> {
  try {
    const info = await fetchObjectInfo();
    const samplers = widgetValues(info, "KSampler", "sampler_name");
    const schedulers = widgetValues(info, "KSampler", "scheduler");
    if (samplers.length > 0 && schedulers.length > 0) {
      return { samplers, schedulers };
    }
  } catch {
    /* офлайн */
  }
  return { samplers: SAMPLERS, schedulers: SCHEDULERS };
}

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

/**
 * Метод апскейла «по латенте» (LatentUpscale, без файла модели).
 * Остальные пункты списка — реальные модели из Drive/upscale_models.
 */
export const LATENT_UPSCALE_METHOD = "Latent (nearest)";

/** Офлайн-фолбэк списка методов (имена без весов). */
export const UPSCALE_METHODS = [
  LATENT_UPSCALE_METHOD,
  "4x-UltraSharp.pth",
  "ESRGAN_x4plus.pth",
  "RealESRGAN_x4plus.pth",
  "SwinIR_4x.pth",
];

/** Признак «снимок пришёл от живого сервера» (а не демо-фолбэк). */
export function isServerDirectory(dir: ModelsDirectory): boolean {
  return dir.root.startsWith("ComfyUI");
}

/**
 * Методы апскейла для панели: «латентный» + реальные модели сервера
 * (тот же список, что видит Upscale Model Loader в оригинальном UI).
 * На живом сервере показываем его список как есть — даже если папка
 * upscale_models пуста (тогда остаётся латентный метод, как «пустой»
 * список оригинала); статический набор — только офлайн.
 */
export async function fetchUpscaleMethods(): Promise<string[]> {
  const dir = await fetchModelsDirectory();
  if (isServerDirectory(dir)) {
    return [LATENT_UPSCALE_METHOD, ...(dir.categories.upscale_models ?? [])];
  }
  return UPSCALE_METHODS;
}

/* ---------------- Демо-галерея (офлайн-режим) ---------------- */

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

export { LOADER_LABELS } from "../types";

/* ---------------- Описание workflow ---------------- */

/**
 * Описание доступных сценариев генерации (для будущих пресетов).
 * Сборку реального графа выполняет api/workflow.ts.
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
