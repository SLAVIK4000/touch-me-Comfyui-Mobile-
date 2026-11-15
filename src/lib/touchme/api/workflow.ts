/**
 * Touch me — сборка графа ComfyUI из состояния интерфейса.
 *
 * На вход принимает снимок useGenerationStore (загрузчики, LoRA, промпт,
 * разрешение, KSampler, upscale, источник img2img) и уже применённые
 * Fooocus Styles, на выходе — граф в API-формате ComfyUI
 * ({ "<id>": { class_type, inputs } }), пригодный для POST /prompt.
 *
 * Используются ТОЛЬКО стандартные ноды ComfyUI — результат совместим с
 * любым сервером без дополнительных пакетов:
 *   CheckpointLoaderSimple / UNETLoader / CLIPLoader / VAELoader /
 *   LoraLoader / CLIPTextEncode / EmptyLatentImage / LoadImage /
 *   VAEEncode / KSampler / VAEDecode / LatentUpscale / UpscaleModelLoader /
 *   ImageUpscaleWithModel / SaveImage.
 */

import type { ApiWorkflow } from "./comfy";
import type {
  KSamplerSettings,
  LoraBlock,
  ModelLoaderBlock,
  ResolutionSettings,
  UpscaleSettings,
} from "../types";

/** Метод апскейла «по латенте» (без модели) */
export const LATENT_UPSCALE_METHOD = "Latent (nearest)";

export interface WorkflowInput {
  loaders: ModelLoaderBlock[];
  loras: LoraBlock[];
  positivePrompt: string;
  negativePrompt: string;
  resolution: ResolutionSettings;
  ksampler: KSamplerSettings;
  upscale: UpscaleSettings;
  /** активен ли режим Upscale (апскейл результата) */
  upscaleActive: boolean;
  /** активен ли режим Img2Img */
  img2imgActive: boolean;
  /** значение виджета LoadImage: "имя [подпапка]" — null → t2i */
  imageSourceValue: string | null;
  /** валидные имена моделей апскейла с сервера (для проверки метода) */
  upscaleModels: string[];
  /** ControlNet-загрузчики не участвуют в графе этой версии — предупреждаем */
  hasControlNet: boolean;
}

export interface BuildResult {
  workflow: ApiWorkflow | null;
  /** ошибки, из-за которых граф не собран — показываются пользователю */
  problems: string[];
  /** идентификатор ноды SaveImage (событие executed по ней даёт результат) */
  saveNodeId: string;
}

/** Ссылка на выход нода: ["<id>", слот] */
const out = (node: string, slot: number): [string, number] => [node, slot];

export function buildWorkflow(input: WorkflowInput): BuildResult {
  const problems: string[] = [];
  const wf: ApiWorkflow = {};
  const SAVE_NODE = "save";

  /* ---------- 1. базовые загрузчики ---------- */

  const checkpoint = input.loaders.find(
    (l) => l.type === "checkpoint" && l.model,
  );
  const unet = input.loaders.find((l) => l.type === "unet" && l.model);
  const clipLoader = input.loaders.find((l) => l.type === "clip" && l.model);
  const vaeLoader = input.loaders.find((l) => l.type === "vae" && l.model);

  // источник MODEL: отдельный UNET имеет приоритет (flux/dit-сценарии),
  // иначе — checkpoint
  let modelRef: [string, number] | null = null;
  let clipRef: [string, number] | null = null;
  let vaeRef: [string, number] | null = null;

  if (checkpoint) {
    wf["ckpt"] = {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint.model },
    };
    modelRef = out("ckpt", 0);
    clipRef = out("ckpt", 1);
    vaeRef = out("ckpt", 2);
  }
  if (unet) {
    wf["unet"] = {
      class_type: "UNETLoader",
      inputs: { unet_name: unet.model },
    };
    modelRef = out("unet", 0); // UNET перекрывает модель checkpoint'а
  }
  if (clipLoader) {
    wf["clip"] = {
      class_type: "CLIPLoader",
      inputs: { clip_name: clipLoader.model },
    };
    clipRef = out("clip", 0); // отдельный CLIP перекрывает встроенный
  }
  if (vaeLoader) {
    wf["vae"] = {
      class_type: "VAELoader",
      inputs: { vae_name: vaeLoader.model },
    };
    vaeRef = out("vae", 0);
  }

  if (!modelRef) {
    problems.push(
      "Не выбрана модель: добавьте Checkpoint Loader (или UNET Loader) и выберите файл из Google Drive.",
    );
  }
  if (!clipRef) {
    problems.push(
      "Нет источника CLIP: выберите checkpoint или добавьте CLIP Loader.",
    );
  }
  if (!vaeRef) {
    problems.push("Нет источника VAE: выберите checkpoint или добавьте VAE Loader.");
  }

  /* ---------- 2. цепочка LoRA ---------- */

  const activeLoras = input.loras.filter((l) => l.model);
  for (const [i, lora] of activeLoras.entries()) {
    const id = i === 0 ? "lora" : `lora${i + 1}`;
    wf[id] = {
      class_type: "LoraLoader",
      inputs: {
        lora_name: lora.model,
        strength_model: lora.modelStrength,
        strength_clip: lora.clipStrength,
        model: modelRef,
        clip: clipRef,
      },
    };
    modelRef = out(id, 0);
    clipRef = out(id, 1);
  }

  /* ---------- 3. текстовые условия (промпт + Fooocus Styles уже внутри) ---------- */

  if (clipRef) {
    wf["pos"] = {
      class_type: "CLIPTextEncode",
      inputs: { text: input.positivePrompt, clip: clipRef },
    };
    wf["neg"] = {
      class_type: "CLIPTextEncode",
      inputs: { text: input.negativePrompt, clip: clipRef },
    };
  }

  /* ---------- 4. латента: пустая (t2i) или из изображения (img2img) ---------- */

  let latentRef: [string, number] | null = null;
  if (input.img2imgActive) {
    if (!input.imageSourceValue) {
      problems.push(
        "Режим Img2Img активен, но исходное изображение не выбрано (панель «Изображение»).",
      );
    } else if (vaeRef) {
      wf["li"] = {
        class_type: "LoadImage",
        inputs: { image: input.imageSourceValue },
      };
      wf["enc"] = {
        class_type: "VAEEncode",
        inputs: { pixels: out("li", 0), vae: vaeRef },
      };
      latentRef = out("enc", 0);
    }
  } else {
    wf["latent"] = {
      class_type: "EmptyLatentImage",
      inputs: {
        width: input.resolution.width,
        height: input.resolution.height,
        batch_size: 1,
      },
    };
    latentRef = out("latent", 0);
  }

  /* ---------- 5. KSampler ---------- */

  if (modelRef && clipRef && latentRef) {
    wf["ks"] = {
      class_type: "KSampler",
      inputs: {
        seed: input.ksampler.seed,
        steps: input.ksampler.steps,
        cfg: input.ksampler.cfg,
        sampler_name: input.ksampler.sampler,
        scheduler: input.ksampler.scheduler,
        denoise: input.img2imgActive ? input.ksampler.denoise : 1,
        model: modelRef,
        positive: out("pos", 0),
        negative: out("neg", 0),
        latent_image: latentRef,
      },
    };
  }

  /* ---------- 6. декод и апскейл ---------- */

  let imageRef: [string, number] | null = null;
  if (wf["ks"] && vaeRef) {
    if (input.upscaleActive && input.upscale.method === LATENT_UPSCALE_METHOD) {
      // апскейл латенты до декодирования — дёшево и быстро
      wf["lup"] = {
        class_type: "LatentUpscale",
        inputs: {
          upscale_method: "nearest",
          scale_by: input.upscale.factor,
          samples: out("ks", 0),
        },
      };
      wf["dec"] = {
        class_type: "VAEDecode",
        inputs: { samples: out("lup", 0), vae: vaeRef },
      };
    } else {
      wf["dec"] = {
        class_type: "VAEDecode",
        inputs: { samples: out("ks", 0), vae: vaeRef },
      };
    }
    imageRef = out("dec", 0);

    // апскейл моделью (реальный файл из upscale_models сервера)
    if (
      input.upscaleActive &&
      input.upscale.method !== LATENT_UPSCALE_METHOD
    ) {
      if (!input.upscaleModels.includes(input.upscale.method)) {
        problems.push(
          `Модель апскейла «${input.upscale.method}» не найдена на сервере — обновите список в панели Upscale.`,
        );
      } else {
        wf["upm"] = {
          class_type: "UpscaleModelLoader",
          inputs: { model_name: input.upscale.method },
        };
        wf["upsc"] = {
          class_type: "ImageUpscaleWithModel",
          inputs: { upscale_model: out("upm", 0), image: imageRef },
        };
        imageRef = out("upsc", 0);
      }
    }
  }

  /* ---------- 7. сохранение ---------- */

  if (imageRef) {
    wf[SAVE_NODE] = {
      class_type: "SaveImage",
      inputs: { filename_prefix: "touchme" },
    };
    // ссылку записываем отдельным входом через inputs.image
    wf[SAVE_NODE].inputs = { filename_prefix: "touchme", images: imageRef };
  }

  /* ---------- 8. предупреждения (не блокируют сборку) ---------- */

  if (input.hasControlNet) {
    problems.push(
      "ControlNet Loader выбран, но применение ControlNet в граф этой версии не включено — генерация пойдёт без него.",
    );
  }

  if (problems.length > 0 || !wf[SAVE_NODE]) {
    return { workflow: null, problems, saveNodeId: SAVE_NODE };
  }
  return { workflow: wf, problems: [], saveNodeId: SAVE_NODE };
}
