"use client";

/**
 * Менеджер режимов обработки + все настройки генерации + её выполнение.
 *
 * «Единая точка параметров»: по текущему состоянию api/workflow.ts
 * собирает граф ComfyUI, который этот стор ставит в очередь сервера
 * (POST /prompt) и отслеживает по WebSocket (/ws?clientId=...):
 * прогресс шагов сэмплера, события executed ноды SaveImage и финал
 * execution_success. Результаты забираются из события/истории и
 * добавляются в галерею.
 */

import { create } from "zustand";
import { toast } from "@/hooks/use-toast";
import type {
  GalleryImage,
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
import { SAMPLERS, SCHEDULERS, fetchFooocusStyles, fetchModelsDirectory } from "@/lib/touchme/data/sources";
import {
  connectSocket,
  fetchHistory,
  interrupt,
  loadImageValue,
  newClientId,
  pingServer,
  queuePrompt,
  uploadImage,
  viewUrl,
  type ComfyImageRef,
} from "@/lib/touchme/api/comfy";
import {
  buildWorkflow,
  type WorkflowInput,
} from "@/lib/touchme/api/workflow";
import { imageFromRef, measureAll } from "@/lib/touchme/api/gallery";
import { useGalleryStore } from "./useGalleryStore";

/** Дружественные подписи узлов графа (для строки статуса). */
const NODE_LABELS: Record<string, string> = {
  ckpt: "загрузка checkpoint",
  unet: "загрузка UNET",
  clip: "загрузка CLIP",
  vae: "загрузка VAE",
  lora: "применение LoRA",
  pos: "кодирование промпта",
  neg: "кодирование негатива",
  latent: "подготовка латенты",
  li: "чтение изображения",
  enc: "кодирование в латенту",
  ks: "сэмплирование",
  dec: "декодирование",
  lup: "апскейл латенты",
  upm: "загрузка модели апскейла",
  upsc: "апскейл изображения",
  save: "сохранение",
};

/** Склейка промпта с фрагментами Fooocus Styles (стили дописываются в конец). */
function composePrompt(base: string, parts: string[]): string {
  const clean = [base, ...parts]
    .map((p) => p.trim())
    .filter(Boolean);
  return clean.join(", ");
}

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

  /* --- выполнение генерации --- */
  generating: boolean;
  /** idle | queued | running | done | error | canceled */
  runStatus: "idle" | "queued" | "running" | "done" | "error" | "canceled";
  /** прогресс сэмплера: 0..1 */
  progress: { value: number; step: number; totalSteps: number } | null;
  /** человеческая строка текущей фазы («сэмплирование», «в очереди»...) */
  phaseNote: string | null;
  lastError: string | null;

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

  /* --- действия: генерация --- */
  startGeneration: () => Promise<void>;
  cancelGeneration: () => void;
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
  upscale: { factor: 2, method: "Latent (nearest)" },
  imageSource: {
    galleryImageId: null,
    uploadedUrl: null,
    uploadedName: null,
    uploading: false,
  },

  generating: false,
  runStatus: "idle",
  progress: null,
  phaseNote: null,
  lastError: null,

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
    set((s) => ({
      loaders: s.loaders.filter((l) => l.id !== id),
    })),
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
    set(() => ({
      ksampler: { ...get().ksampler, seed: Math.floor(Math.random() * 1e9) },
    })),

  patchUpscale: (patch) =>
    set((s) => ({ upscale: { ...s.upscale, ...patch } })),

  setImageSource: (patch) =>
    set((s) => ({ imageSource: { ...s.imageSource, ...patch } })),
  clearImageSource: () =>
    set({
      imageSource: {
        galleryImageId: null,
        uploadedUrl: null,
        uploadedName: null,
        uploading: false,
      },
    }),

  /* ---------------- генерация ---------------- */

  startGeneration: async () => {
    const s = get();
    if (s.generating) return;

    /* 0. сервер жив? */
    const stats = await pingServer(5000);
    if (!stats) {
      toast({
        title: "ComfyUI недоступен",
        description:
          "Интерфейс не видит сервер на этом адресе. Если он запущен через Colab-туннель — обновите страницу по актуальной ссылке.",
      });
      set({ lastError: "сервер недоступен", runStatus: "error" });
      return;
    }

    set({
      generating: true,
      runStatus: "queued",
      progress: null,
      phaseNote: "подготовка графа",
      lastError: null,
    });

    const finish = (patch: Partial<GenerationStore>) =>
      set({ generating: false, progress: null, ...patch });

    try {
      /* 1. источник для img2img: файл с устройства уже на сервере,
            изображение галереи — выгружаем на сервер сейчас */
      let imageSourceValue: string | null = null;
      const { imageSource, activeModes } = get();
      if (activeModes.img2img) {
        if (imageSource.uploadedName) {
          imageSourceValue = imageSource.uploadedName;
        } else if (imageSource.galleryImageId) {
          const gal = useGalleryStore
            .getState()
            .images.find((i) => i.id === imageSource.galleryImageId);
          if (gal) {
            set({
              phaseNote: "загрузка исходного изображения на сервер",
            });
            let ref: ComfyImageRef | null = null;
            if (gal.ref) {
              // output-файл сервера: выгружаем его копию в input
              const blob = await (await fetch(viewUrl(gal.ref))).blob();
              ref = await uploadImage(blob, gal.ref.filename);
            } else {
              // демо-файл сборки — отдаётся тем же origin
              const blob = await (await fetch(gal.src)).blob();
              const name = gal.name || "touchme_input.png";
              ref = await uploadImage(blob, name);
            }
            imageSourceValue = loadImageValue(ref);
          }
        }
      }

      /* 2. промпт с применёнными Fooocus Styles */
      const stylesAll = await fetchFooocusStyles();
      const chosen = stylesAll.filter((st) =>
        get().activeStyles.includes(st.name),
      );
      const positive = composePrompt(
        get().prompt.positive,
        chosen.map((st) => st.prompt ?? ""),
      );
      const negative = composePrompt(
        get().prompt.negative,
        chosen.map((st) => st.negative_prompt ?? ""),
      );

      /* 3. списки с сервера (для валидации апскейла) */
      const dir = await fetchModelsDirectory();
      const upscaleModels = dir.categories.upscale_models ?? [];

      /* 4. сборка графа */
      const st = get();
      const input: WorkflowInput = {
        loaders: st.loaders,
        loras: st.loras,
        positivePrompt: positive,
        negativePrompt: negative,
        resolution: st.resolution,
        ksampler: st.ksampler,
        upscale: st.upscale,
        upscaleActive: st.activeModes.upscale,
        img2imgActive: st.activeModes.img2img,
        imageSourceValue,
        upscaleModels,
        hasControlNet: st.loaders.some((l) => l.type === "controlnet" && l.model),
      };
      const built = buildWorkflow(input);
      if (built.problems.length > 0 || !built.workflow) {
        toast({
          title: "Генерация не запущена",
          description: built.problems.join(" "),
        });
        finish({ runStatus: "error", lastError: built.problems.join(" ") });
        return;
      }

      /* 5. очередь */
      const clientId = newClientId();
      const queued = await queuePrompt(built.workflow, clientId);
      if (queued.node_errors && Object.keys(queued.node_errors).length > 0) {
        const details = Object.entries(queued.node_errors)
          .map(([node, err]) => `${node}: ${JSON.stringify(err)}`)
          .join("; ");
        toast({
          title: "Сервер отклонил граф",
          description: details.slice(0, 300),
        });
        finish({ runStatus: "error", lastError: details.slice(0, 300) });
        return;
      }
      const promptId = queued.prompt_id;
      set({ phaseNote: "в очереди сервера", runStatus: "queued" });

      /* 6. слежение за выполнением по WebSocket */
      const results: ComfyImageRef[] = [];
      let settled = false;

      const finalize = async (ok: boolean, note?: string) => {
        if (settled) return;
        settled = true;
        closeSocket();
        if (ok && results.length > 0) {
          const images = results.map((ref, i) =>
            imageFromRef(ref, i, {
              seed: st.ksampler.seed,
              steps: st.ksampler.steps,
              cfg: st.ksampler.cfg,
              sampler: st.ksampler.sampler,
              prompt: positive.slice(0, 120),
            }),
          );
          await measureAll(images);
          useGalleryStore.getState().prependImages(images);
          useGalleryStore.getState().goTo(0);
          toast({
            title: "Готово",
            description: `Изображений сохранено: ${images.length}. Результат — в галерее.`,
          });
          finish({ runStatus: "done", phaseNote: null });
        } else if (ok) {
          // сервер завершил, но изображений не пришло — спрашиваем историю
          try {
            const hist = await fetchHistory(promptId);
            const imgs =
              hist &&
              Object.values(hist.outputs).flatMap((o) => o.images ?? []);
            if (imgs && imgs.length > 0) {
              const images = imgs.map((ref, i) => imageFromRef(ref, i));
              await measureAll(images);
              useGalleryStore.getState().prependImages(images);
              useGalleryStore.getState().goTo(0);
              finish({ runStatus: "done", phaseNote: null });
              return;
            }
          } catch {
            /* история недоступна */
          }
          finish({
            runStatus: "error",
            phaseNote: null,
            lastError: "выполнение завершилось без изображений",
          });
          toast({
            title: "Без результата",
            description: "Сервер выполнил граф, но изображений не вернул.",
          });
        } else {
          finish({
            runStatus: "error",
            phaseNote: null,
            lastError: note ?? "ошибка выполнения",
          });
          toast({
            title: "Ошибка генерации",
            description: (note ?? "детали не получены").slice(0, 300),
          });
        }
      };

      const closeSocket = connectSocket(clientId, {
        onExecutionStart: () =>
          set({ runStatus: "running", phaseNote: "выполнение графа" }),
        onProgress: (d) => {
          const max = Math.max(1, d.max);
          set({
            progress: {
              value: Math.min(1, d.value / max),
              step: d.value,
              totalSteps: max,
            },
            phaseNote: `сэмплирование · шаг ${d.value}/${max}`,
          });
        },
        onExecuting: (d) => {
          if (d.node === null) {
            // конец текущего элемента очереди
            void finalize(true);
            return;
          }
          const label = NODE_LABELS[d.node] ?? `узел ${d.node}`;
          set({ runStatus: "running", phaseNote: label });
        },
        onExecuted: (d) => {
          for (const img of d.output?.images ?? []) {
            if (!img.type || img.type === "output") results.push(img);
          }
        },
        onExecutionSuccess: () => void finalize(true),
        onExecutionError: (d) =>
          void finalize(
            false,
            `${d.exception_type ?? "ошибка"}: ${
              d.exception_message ?? "без сообщения"
            } (узел ${d.node_type ?? "?"})`,
          ),
        onClose: () => {
          // сокет закрылся до завершения — пробуем историю и выходим
          if (!settled && get().generating) {
            void (async () => {
              try {
                const hist = await fetchHistory(promptId);
                for (const o of Object.values(hist?.outputs ?? {})) {
                  for (const img of o.images ?? []) results.push(img);
                }
              } catch {
                /* истории нет */
              }
              void finalize(get().generating && results.length > 0, results.length > 0 ? undefined : "соединение с сервером потеряно");
            })();
          }
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "неизвестная ошибка";
      toast({ title: "Генерация не удалась", description: message.slice(0, 300) });
      finish({ runStatus: "error", lastError: message, phaseNote: null });
    }
  },

  cancelGeneration: () => {
    if (!get().generating) return;
    void interrupt();
    set({
      generating: false,
      runStatus: "canceled",
      progress: null,
      phaseNote: null,
    });
    toast({ title: "Прервано", description: "Серверу отправлен interrupt." });
  },
}));

/** Дефолтные значения для UI (выпадающие списки) */
export { SAMPLERS, SCHEDULERS };
