"use client";

/**
 * UpscalePanel — панель настроек апскейла.
 * Множитель (включая x1.5) и метод масштабирования.
 * Множитель участвует в реальном вычислении: здесь показывается
 * итоговый размер результата (разрешение × множитель) — та же
 * величина, которую будет использовать workflow на следующем этапе.
 */

import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { UPSCALE_METHODS } from "@/lib/touchme/data/sources";
import { PanelRow } from "./parts";

const FACTOR_CHIPS = [1.5, 2, 3, 4];

export default function UpscalePanel() {
  const upscale = useGenerationStore((s) => s.upscale);
  const resolution = useGenerationStore((s) => s.resolution);
  const patchUpscale = useGenerationStore((s) => s.patchUpscale);

  const outW = Math.round(resolution.width * upscale.factor);
  const outH = Math.round(resolution.height * upscale.factor);

  return (
    <div className="flex flex-col gap-2.5">
      <PanelRow label="Множитель" value={`${upscale.factor.toFixed(1)}×`}>
        <div className="mb-2 grid grid-cols-4 gap-1.5">
          {FACTOR_CHIPS.map((f) => {
            const active = Math.abs(upscale.factor - f) < 0.01;
            return (
              <button
                key={f}
                onClick={() => patchUpscale({ factor: f })}
                aria-pressed={active}
                className={`tm-mono border py-2 text-[9.5px] tracking-[0.08em] transition-colors ${
                  active
                    ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)] tm-glow"
                    : "border-[var(--tm-border)] text-[var(--tm-text-dim)] active:bg-[rgba(148,130,255,0.1)]"
                }`}
              >
                {f}×
              </button>
            );
          })}
        </div>
        <Slider
          min={1}
          max={4}
          step={0.5}
          value={[upscale.factor]}
          onValueChange={([v]) => patchUpscale({ factor: v })}
          aria-label="Множитель увеличения"
        />
      </PanelRow>

      <PanelRow label="Метод масштабирования">
        <Select
          value={upscale.method}
          onValueChange={(v) => patchUpscale({ method: v })}
        >
          <SelectTrigger className="tm-mono h-9 w-full border-[var(--tm-border)] bg-[rgba(15,15,28,0.7)] text-[11px] text-[var(--tm-text)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="tm-mono border-[var(--tm-border)] bg-[#141425] text-[11px] text-[var(--tm-text)]">
            {UPSCALE_METHODS.map((m) => (
              <SelectItem key={m} value={m} className="text-[11px]">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PanelRow>

      {/* результат применения множителя к текущему разрешению */}
      <PanelRow label="Результат" value={`${outW} × ${outH}`}>
        <div className="tm-mono flex items-center justify-between text-[9.5px] tracking-[0.08em] text-[var(--tm-text-dim)]">
          <span>
            {resolution.width} × {resolution.height}
          </span>
          <span aria-hidden>→</span>
          <span className="text-[var(--tm-violet)]">
            {outW} × {outH}
          </span>
        </div>
      </PanelRow>
    </div>
  );
}
