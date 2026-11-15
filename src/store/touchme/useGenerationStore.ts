"use client";

/**
 * Менеджер режимов обработки + все настройки генерации.
 *
 * Архитектурно это «единая точка параметров», из которой на следующих
 * этапах WorkflowAdapter будет собирать граф ComfyUI. Состав нижней
 * панели вычисляется из активных режимов (см. useBottomBarItems).
 */
import { create } from "zustand";
import type {
  ImageSource,
  KSamplerSettings,
  LoraBlock,
  ModelLoaderBlock,
  ModelLoaderType,
  ProcessMode,
  PromptPair,
  ResolutionSettings,
  UpscaleSettings,
} from "@/lib/touchme/types";
import { SAMPLERS, SCHEDULERS } from "@/lib/touchme/data/sources";

interface GenerationStore {
  /* --- режимы --- */
  /** Активные режимы. t2i — база, img2img и upscale — переключатели. */
  activeModes: Record<ProcessMode, boolean>;

  /* --- настройки --- */
  loaders: ModelLoaderBlock[];
  loras: LoraBlock[];
  /** Имена выбранных Fooocus Styles */
  activeStyles: string[];
  prompt: PromptPair;
  resolution: ResolutionSettings;
  ksampler: KSamplerSettings;
  upscale: UpscaleSettings;
  imageSource: ImageSource;

  /* --- future: состояние генерации (заглушка) --- */
  generating: boolean;

  /* --- действия: режимы --- */
  toggleMode: (mode: ProcessMode) => void;
  activeModeList: () => ProcessMode[];

  /* --- действия: модели --- */
  addLoader: (type: ModelLoaderType) => void;
  removeLoader: (id: string) => void;
  setLoaderType: (id: string, type: ModelLoaderType) => void;
  setLoaderModel: (id: string, model: string) => void;

  /* --- действия: LoRA --- */
  addLora: () => void;
  removeLora: (id: string) => void;
  setLoraModel: (id: string, model: string) => void;
  setLoraStrength: (id: string, target: "model" | "clip", v: number) => void;

  /* --- действия: стили --- */
  toggleStyle: (name: string) => void;

  /* --- действия: промпт --- */
  setPrompt: (kind: "positive" | "negative", text: string) => void;

  /* --- действия: разрешение --- */
  setResolution: (w: number, h: number) => void;

  /* --- действия: KSampler --- */
  patchKSampler: (patch: Partial<KSamplerSettings>) => void;
  randomizeSeed: () => void;

  /* --- действия: Upscale --- */
  patchUpscale: (patch: Partial<UpscaleSettings>) => void;

  /* --- действия: источник Img2Img --- */
  setImageSource: (patch: Partial<ImageSource>) => void;
  clearImageSource: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  activeModes: { t2i: true, img2img: false, upscale: false },

  loaders: [{ id: "ld-1", type: "checkpoint", model: "" }],
  loras: [],
  activeStyles: [],
  prompt: { positive: "", negative: "" },
  resolution: { width: 896, height: 1152 },
  // Дефолты синхронизированы с реальным workflow пользователя
  // (turbo-LoRA: 12 шагов, CFG 1, er_sde + simple, denoise 1).
  ksampler: {
    seed: 883712,
    steps: 12,
    cfg: 1,
    sampler: "er_sde",
    scheduler: "simple",
    denoise: 1,
  },
  upscale: { factor: 2, method: "ESRGAN x4+" },
  imageSource: { galleryImageId: null, uploadedUrl: null },

  generating: false,

  toggleMode: (mode) =>
    set((s) => {
      if (mode === "t2i") return s; // базовый режим не отключается вручную
      const activeModes = { ...s.activeModes, [mode]: !s.activeModes[mode] };
      // если все доп. режимы выключены — базовый Text to Image
      activeModes.t2i = !activeModes.img2img && !activeModes.upscale;
      return { activeModes };
    }),

  activeModeList: () => {
    const { activeModes } = get();
    return (Object.keys(activeModes) as ProcessMode[]).filter(
      (m) => activeModes[m],
    );
  },

  addLoader: (type) =>
    set((s) => ({
      loaders: [...s.loaders, { id: uid(), type, model: "" }],
    })),
  removeLoader: (id) =>
    set((s) => ({ loaders: s.loaders.filter((l) => l.id !== id) })),
  setLoaderType: (id, type) =>
    set((s) => ({
      loaders: s.loaders.map((l) =>
        l.id === id ? { ...l, type, model: "" } : l,
      ),
    })),
  setLoaderModel: (id, model) =>
    set((s) => ({
      loaders: s.loaders.map((l) => (l.id === id ? { ...l, model } : l)),
    })),

  addLora: () =>
    set((s) => ({
      loras: [
        ...s.loras,
        { id: uid(), model: "", modelStrength: 1, clipStrength: 1 },
      ],
    })),
  removeLora: (id) =>
    set((s) => ({ loras: s.loras.filter((l) => l.id !== id) })),
  setLoraModel: (id, model) =>
    set((s) => ({
      loras: s.loras.map((l) => (l.id === id ? { ...l, model } : l)),
    })),
  setLoraStrength: (id, target, v) =>
    set((s) => ({
      loras: s.loras.map((l) =>
        l.id === id
          ? target === "model"
            ? { ...l, modelStrength: v }
            : { ...l, clipStrength: v }
          : l,
      ),
    })),

  toggleStyle: (name) =>
    set((s) => ({
      activeStyles: s.activeStyles.includes(name)
        ? s.activeStyles.filter((n) => n !== name)
        : [...s.activeStyles, name],
    })),

  setPrompt: (kind, text) =>
    set((s) => ({ prompt: { ...s.prompt, [kind]: text } })),

  setResolution: (w, h) =>
    set({
      resolution: {
        width: Math.max(64, Math.min(4096, Math.round(w))),
        height: Math.max(64, Math.min(4096, Math.round(h))),
      },
    }),

  patchKSampler: (patch) =>
    set((s) => ({ ksampler: { ...s.ksampler, ...patch } })),
  randomizeSeed: () =>
    set(() => ({ ksampler: { ...get().ksampler, seed: Math.floor(Math.random() * 1e9) } })),

  patchUpscale: (patch) =>
    set((s) => ({ upscale: { ...s.upscale, ...patch } })),

  setImageSource: (patch) =>
    set((s) => ({ imageSource: { ...s.imageSource, ...patch } })),
  clearImageSource: () =>
    set({ imageSource: { galleryImageId: null, uploadedUrl: null } }),
}));

/** Дефолтные значения для UI (выпадающие списки) */
export { SAMPLERS, SCHEDULERS };
