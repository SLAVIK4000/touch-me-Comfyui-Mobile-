"use client";

/**
 * ModelsPanel — панель «Модели».
 *
 * Система выбора моделей повторяет оригинальный интерфейс ComfyUI:
 *  1. активные режимы генерации (useGenerationStore) определяют,
 *     какие загрузчики (узлы) нужны: t2i/img2img — Checkpoint/UNET/
 *     CLIP/VAE/ControlNet, upscale — Upscale Model Loader;
 *  2. каждый загрузчик привязан к своей категории папки Models/
 *     (LOADER_CATEGORY из types — как стандартные ноды ComfyUI);
 *  3. списки моделей приходят из /object_info живого сервера — из того
 *     же источника, что берёт списки классический интерфейс. На Colab
 *     это папка моделей в Google Drive (My Drive/ComfyUI/models):
 *     checkpoint-блок видит Drive/checkpoints, LoRA — Drive/loras и т.д.;
 *  4. «Обновить» перечитывает списки (новые файлы в Drive подхватываются
 *     без перезагрузки страницы).
 */

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { fetchModelsDirectory } from "@/lib/touchme/data/sources";
import {
  LOADER_CATEGORY,
  LOADER_LABELS,
  MODE_LOADERS,
} from "@/lib/touchme/types";
import type {
  ModelLoaderType,
  ModelsDirectory,
  ProcessMode,
} from "@/lib/touchme/types";
import { BlockShell, ActionButton } from "./parts";

const ALL_TYPES = Object.keys(LOADER_LABELS) as ModelLoaderType[];

/** короткие подписи для кнопок добавления */
const SHORT: Record<ModelLoaderType, string> = {
  checkpoint: "Checkpoint",
  unet: "UNET",
  clip: "CLIP",
  vae: "VAE",
  controlnet: "ControlNet",
  upscale_model: "Upscale Model",
};

export default function ModelsPanel() {
  const loaders = useGenerationStore((s) => s.loaders);
  const addLoader = useGenerationStore((s) => s.addLoader);
  const removeLoader = useGenerationStore((s) => s.removeLoader);
  const setLoaderType = useGenerationStore((s) => s.setLoaderType);
  const setLoaderModel = useGenerationStore((s) => s.setLoaderModel);
  const modes = useGenerationStore((s) => s.activeModes);

  /** снимок списков сервера — свежий при каждом открытии панели и по кнопке */
  const [dir, setDir] = useState<ModelsDirectory | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // первое открытие — из кэша/сервера, «Обновить» — с обходом кэша
    fetchModelsDirectory(reload > 0)
      .then((d) => {
        if (cancelled) return;
        setDir(d);
        setError(false);
        /** найденные модели сразу отображаются в пустых загрузчиках */
        for (const l of loaders) {
          if (!l.model) {
            const first = d.categories[LOADER_CATEGORY[l.type]]?.[0];
            if (first) setLoaderModel(l.id, first);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  /** загрузчики, используемые текущими режимами генерации */
  const activeModes = (Object.keys(modes) as ProcessMode[]).filter(
    (m) => modes[m],
  );
  const usedTypes = Array.from(
    new Set(activeModes.flatMap((m) => MODE_LOADERS[m])),
  );
  const quickAddTypes = usedTypes.filter(
    (t) => !loaders.some((l) => l.type === t) || t === "checkpoint",
  );

  const modelsFor = (type: ModelLoaderType): string[] =>
    dir?.categories[LOADER_CATEGORY[type]] ?? [];

  return (
    <div className="flex flex-col gap-2.5">
      {loaders.map((loader) => {
        const models = modelsFor(loader.type);
        const current = loader.model || models[0] || "";
        return (
          <BlockShell
            key={loader.id}
            title={LOADER_LABELS[loader.type]}
            onRemove={() => removeLoader(loader.id)}
            accent={Boolean(loader.model)}
          >
            <div className="flex flex-col gap-2">
              <Select
                value={loader.type}
                onValueChange={(v) =>
                  setLoaderType(loader.id, v as ModelLoaderType)
                }
              >
                <SelectTrigger className="tm-mono h-9 w-full border-[var(--tm-border)] bg-[rgba(15,15,28,0.55)] text-[11px] text-[var(--tm-text)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="tm-mono border-[var(--tm-border)] bg-[#141425]/95 text-[11px] text-[var(--tm-text)] backdrop-blur-xl">
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-[11px]">
                      {LOADER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={loader.model || undefined}
                onValueChange={(v) => setLoaderModel(loader.id, v)}
              >
                <SelectTrigger className="tm-mono h-9 w-full border-[var(--tm-border)] bg-[rgba(15,15,28,0.55)] text-[11px] text-[var(--tm-text)]">
                  <SelectValue
                    placeholder={
                      models.length === 0
                        ? `${LOADER_CATEGORY[loader.type]}/ пусто на сервере`
                        : `${LOADER_CATEGORY[loader.type]}/${current}`
                    }
                  />
                </SelectTrigger>
                <SelectContent className="tm-mono max-h-56 border-[var(--tm-border)] bg-[#141425]/95 text-[11px] text-[var(--tm-text)] backdrop-blur-xl">
                  {models.map((m) => (
                    <SelectItem key={m} value={m} className="text-[11px]">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </BlockShell>
        );
      })}

      {/* быстрое добавление загрузчиков, нужных текущим режимам */}
      <div className="grid grid-cols-2 gap-2">
        {quickAddTypes.map((t) => (
          <ActionButton
            key={t}
            variant={t === "checkpoint" ? "accent" : "default"}
            onClick={() => addLoader(t)}
            ariaLabel={`Добавить загрузчик ${LOADER_LABELS[t]}`}
          >
            <Plus size={13} strokeWidth={2} />
            {SHORT[t]}
          </ActionButton>
        ))}
      </div>

      {/* обновление списков с сервера (Google Drive → /object_info) */}
      <ActionButton
        onClick={() => setReload((n) => n + 1)}
        ariaLabel="Обновить списки моделей с сервера"
      >
        <RefreshCw size={12} strokeWidth={2} />
        Обновить
      </ActionButton>

      {/* источник текущих списков */}
      {dir && (
        <span className="tm-mono text-center text-[8.5px] leading-relaxed tracking-[0.1em] text-[var(--tm-text-dim)]">
          источник: {dir.root}
        </span>
      )}

      {error && (
        <span className="tm-mono text-center text-[9px] tracking-[0.1em] text-[#f87171]">
          Сервер ComfyUI недоступен — показан демо-список
        </span>
      )}
      {dir &&
        quickAddTypes.length === 0 &&
        loaders.length === 0 && (
          <span className="tm-mono text-center text-[9px] tracking-[0.1em] text-[var(--tm-text-dim)]">
            Нет загрузчиков
          </span>
        )}
    </div>
  );
}
