"use client";

/**
 * LoraPanel — панель «LoRA».
 * Несколько блоков LoRA: выбор файла + отдельные настройки силы
 * влияния на Model и CLIP (ползунки с числовым значением).
 */

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { fetchModelsDirectory } from "@/lib/touchme/data/sources";
import { ActionButton, BlockShell, EmptyHint } from "./parts";

/** LoRA Loader: файлы из категории loras/ папки Models (как в ComfyUI) */
const LORA_CATEGORY = "loras";

export default function LoraPanel() {
  const loras = useGenerationStore((s) => s.loras);
  const addLora = useGenerationStore((s) => s.addLora);
  const removeLora = useGenerationStore((s) => s.removeLora);
  const setLoraModel = useGenerationStore((s) => s.setLoraModel);
  const setLoraStrength = useGenerationStore((s) => s.setLoraStrength);

  /** файлы из Models/loras — свежий снимок при каждом открытии панели */
  const [files, setFiles] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchModelsDirectory()
      .then((dir) => {
        if (!cancelled) setFiles(dir.categories[LORA_CATEGORY] ?? []);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      {loras.length === 0 && (
        <EmptyHint>Не добавлено ни одной LoRA</EmptyHint>
      )}

      {loras.map((lora) => (
        <BlockShell
          key={lora.id}
          title={`LORA · #${lora.id.slice(-3)}`}
          onRemove={() => removeLora(lora.id)}
          accent={Boolean(lora.model)}
        >
          <div className="flex flex-col gap-3">
            <div>
              <span className="tm-mono mb-1 block text-[8.5px] uppercase tracking-[0.18em] text-[var(--tm-text-dim)]">
                Файл LoRA
              </span>
              <Select
                value={lora.model || undefined}
                onValueChange={(v) => setLoraModel(lora.id, v)}
              >
                <SelectTrigger className="tm-mono h-9 w-full border-[var(--tm-border)] bg-[rgba(15,15,28,0.7)] text-[11px] text-[var(--tm-text)]">
                  <SelectValue placeholder="не выбрана" />
                </SelectTrigger>
                <SelectContent className="tm-mono max-h-56 border-[var(--tm-border)] bg-[#141425] text-[11px] text-[var(--tm-text)]">
                  {(files ?? []).map((f) => (
                    <SelectItem key={f} value={f} className="text-[11px]">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="tm-mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--tm-text-dim)]">
                  Сила · Model
                </span>
                <span className="tm-mono text-[11px] text-[var(--tm-violet)]">
                  {lora.modelStrength.toFixed(2)}
                </span>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.05}
                value={[lora.modelStrength]}
                onValueChange={([v]) => setLoraStrength(lora.id, "model", v)}
                aria-label="Сила влияния на модель"
              />
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="tm-mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--tm-text-dim)]">
                  Сила · CLIP
                </span>
                <span className="tm-mono text-[11px] text-[var(--tm-blue)]">
                  {lora.clipStrength.toFixed(2)}
                </span>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.05}
                value={[lora.clipStrength]}
                onValueChange={([v]) => setLoraStrength(lora.id, "clip", v)}
                aria-label="Сила влияния на CLIP"
              />
            </div>
          </div>
        </BlockShell>
      ))}

      <ActionButton variant="accent" onClick={addLora} ariaLabel="Добавить LoRA">
        <Plus size={13} strokeWidth={2} />
        Добавить LoRA
      </ActionButton>
    </div>
  );
}
