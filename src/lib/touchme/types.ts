/**
 * Touch me — общие типы приложения.
 *
 * Слой спроектирован под будущую интеграцию ComfyUI:
 * настройки генерации (loaders / loras / ksampler / upscale) повторяют
 * структуру параметров нод ComfyUI, чтобы позже их можно было
 * напрямую транслировать в workflow без изменения UI-кода.
 */

/** Идентификаторы панелей настроек нижней панели */
export type PanelId =
  | "models"
  | "lora"
  | "fooocus"
  | "prompt"
  | "resolution"
  | "ksampler"
  | "mode"
  | "imageSource"
  | "upscale";

/** Режимы обработки (расширяемый набор) */
export type ProcessMode = "t2i" | "img2img" | "upscale";

/** Элемент нижней панели */
export interface BottomBarItem {
  id: PanelId;
  label: string;
  /** Признак активного/подсвеченного тайла */
  highlighted?: boolean;
  /** Дополнительный бейдж (например, количество выбранных стилей) */
  badge?: string | number;
}

/** Снимок списков моделей сервера (из /object_info живого ComfyUI) */
export interface ModelsDirectory {
  /** источник списков: "ComfyUI · /object_info (Google Drive)" либо демо */
  root: string;
  categories: Partial<Record<ModelCategory, string[]>>;
}

/** Изображение галереи (реальные результаты — из /view живого сервера) */
export interface GalleryImage {
  id: string;
  name: string;
  /** URL: /view?filename=...&type=output либо демо-файл */
  src: string;
  width: number;
  height: number;
  createdAt: string;
  /** метаданные генерации (если известны) */
  meta?: {
    seed?: number;
    steps?: number;
    cfg?: number;
    sampler?: string;
    prompt?: string;
  };
  /** ссылка на файл сервера — для повторного использования в img2img */
  ref?: { filename: string; subfolder?: string; type?: string };
}

/* ---------------- Модели ---------------- */

/**
 * Типы загрузчиков = стандартные ноды ComfyUI.
 * Каждый загрузчик берёт модели ТОЛЬКО из своей категории папки Models/.
 */
export type ModelLoaderType =
  | "checkpoint"
  | "unet"
  | "clip"
  | "vae"
  | "controlnet"
  | "upscale_model";

/** Категория (поддиректория Models/), из которой загрузчик получает модели */
export type ModelCategory =
  | "checkpoints"
  | "unet"
  | "clip"
  | "vae"
  | "loras"
  | "controlnet"
  | "upscale_models";

/** Соответствие «тип загрузчика → категория папки Models» (как в ComfyUI) */
export const LOADER_CATEGORY: Record<ModelLoaderType, ModelCategory> = {
  checkpoint: "checkpoints",
  unet: "unet",
  clip: "clip",
  vae: "vae",
  controlnet: "controlnet",
  upscale_model: "upscale_models",
};

/** Отображаемые имена — по принципу стандартных нод ComfyUI */
export const LOADER_LABELS: Record<ModelLoaderType, string> = {
  checkpoint: "Checkpoint Loader",
  unet: "UNET Loader",
  clip: "CLIP Loader",
  vae: "VAE Loader",
  controlnet: "ControlNet Loader",
  upscale_model: "Upscale Model Loader",
};

export interface ModelLoaderBlock {
  id: string;
  type: ModelLoaderType;
  model: string;
}

/* ---------------- LoRA ---------------- */

export interface LoraBlock {
  id: string;
  model: string;
  modelStrength: number;
  clipStrength: number;
}

/* ---------------- Fooocus Styles ---------------- */

export interface FooocusStyle {
  name: string;
  prompt?: string;
  negative_prompt?: string;
  name_cn?: string;
}

/* ---------------- KSampler ---------------- */

export interface KSamplerSettings {
  seed: number;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  denoise: number;
}

/* ---------------- Прочие настройки ---------------- */

export interface ResolutionSettings {
  width: number;
  height: number;
}

export interface UpscaleSettings {
  factor: number;
  method: string;
}

export interface PromptPair {
  positive: string;
  negative: string;
}

/** Источник изображения для Img2Img */
export interface ImageSource {
  /** id изображения внутренней галереи */
  galleryImageId: string | null;
  /** dataURL предпросмотра файла с устройства */
  uploadedUrl: string | null;
  /** значение виджета LoadImage ("имя [подпапка]") после загрузки на сервер */
  uploadedName: string | null;
  /** идёт загрузка файла на сервер прямо сейчас */
  uploading: boolean;
}

/* ---------------- Режимы → узлы ---------------- */

/**
 * Узлы (загрузчики), используемые текущим режимом генерации.
 * Базовые режимы (t2i/img2img) работают на генерирующих загрузчиках,
 * upscale использует загрузчик модели апскейла.
 */
export const MODE_LOADERS: Record<ProcessMode, ModelLoaderType[]> = {
  t2i: ["checkpoint", "unet", "clip", "vae", "controlnet"],
  img2img: ["checkpoint", "unet", "clip", "vae", "controlnet"],
  upscale: ["upscale_model"],
};

/* ---------------- Stub будущей интеграции ComfyUI ---------------- */

/**
 * Контракт адаптера workflow (заглушка на текущем этапе).
 * На следующем этапе реализация будет строить граф ComfyUI
 * по текущему состоянию режимов и настроек.
 */
export interface WorkflowAdapter {
  id: string;
  name: string;
  /** Режимы, которые умеет обрабатывать данный workflow */
  supportedModes: ProcessMode[];
}

/** Состояние запроса генерации (для будущих этапов) */
export type GenerationStatus =
  | "idle"
  | "queued"
  | "running"
  | "done"
  | "error"
  | "canceled";

export interface GenerationProgress {
  /** 0..1 */
  value: number;
  step: number;
  totalSteps: number;
}
