/**
 * Touch me — встроенный демо-набор названий моделей.
 *
 * Офлайн-фолбэк панели «Модели» (см. fetchModelsDirectory в sources.ts):
 * используется, когда маршрут /api/models недоступен — интерфейс собран
 * статическим бандлом внутри ComfyUI — или когда указанный каталог моделей
 * пуст. Это список имён без весов, НЕ эмуляция сканера: как только задан
 * реальный COMFYUI_MODELS_DIR (а на этапе интеграции — списки /object_info
 * живого сервера), демо-набор не используется.
 */

import type { ModelsDirectory } from "../types";

export const DEMO_MODELS_DIRECTORY: ModelsDirectory = {
  root: "demo (встроенный список, без весов)",
  categories: {
    checkpoints: [
    "dreamshaperXL_lightning.safetensors",
    "juggernautXL_v9.safetensors",
    "realisticVision_v6.safetensors",
    "v1-5-pruned-emaonly.ckpt",
    "sd_xl_base_1.0.safetensors",
    ],
    unet: [
    "flux1-dev-fp8.safetensors",
    "flux1-dev-Q4_K_S.gguf",
    "flux1-schnell-fp8.safetensors",
    ],
    clip: [
    "clip_g.safetensors",
    "clip_l.safetensors",
    "t5xxl_fp8_e4m3fn.safetensors",
    ],
    vae: [
    "ae.safetensors",
    "sdxl_vae.safetensors",
    "vae-ft-mse-840000-ema-pruned.safetensors",
    ],
    loras: [
    "add_detail_xl.safetensors",
    "epi_noiseoffset2.safetensors",
    "film_grain_xl.safetensors",
    "neon_noir_xl.safetensors",
    "pixel_art_xl.safetensors",
    ],
    controlnet: [
    "control_v11f1p_sd15_depth.pth",
    "control_v11p_sd15_canny.pth",
    "controlnet-canny-sdxl-0.0.1.safetensors",
    ],
    upscale_models: [
    "4x-UltraSharp.pth",
    "RealESRGAN_x4plus.pth",
    "SwinIR_4x.pth",
    ],
  },
};
