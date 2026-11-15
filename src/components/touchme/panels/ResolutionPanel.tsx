"use client";

/**
 * ResolutionPanel — панель «Разрешение изображения».
 * Ширина/высота с ручным вводом и степпером, быстрый выбор популярных
 * соотношений сторон (пресеты).
 */

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { ASPECT_PRESETS } from "@/lib/touchme/data/sources";
import { ActionButton, PanelRow } from "./parts";

const MIN = 256;
const MAX = 2048;
const STEP = 64;

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(clamp(value - STEP))}
        className="flex h-9 w-9 flex-none items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
        aria-label={`Уменьшить ${label}`}
      >
        <Minus size={14} />
      </button>
      <input
        value={value}
        onChange={(e) => {
          const v = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (!Number.isNaN(v)) onChange(clamp(v));
        }}
        inputMode="numeric"
        className="tm-allow-select tm-mono min-w-0 flex-1 border border-[var(--tm-border)] bg-[rgba(15,15,28,0.7)] py-2 text-center text-[13px] font-medium text-[var(--tm-violet)] outline-none focus:border-[var(--tm-violet)]"
        aria-label={label}
      />
      <button
        onClick={() => onChange(clamp(value + STEP))}
        className="flex h-9 w-9 flex-none items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
        aria-label={`Увеличить ${label}`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function ResolutionPanel() {
  const resolution = useGenerationStore((s) => s.resolution);
  const setResolution = useGenerationStore((s) => s.setResolution);

  const { width, height } = resolution;

  const activeRatio =
    width === height
      ? "1:1"
      : Math.abs(width / height - 3 / 4) < 0.02
        ? "3:4"
        : Math.abs(width / height - 9 / 16) < 0.02
          ? "9:16"
          : Math.abs(width / height - 4 / 3) < 0.02
            ? "4:3"
            : Math.abs(width / height - 16 / 9) < 0.02
              ? "16:9"
              : Math.abs(width / height - 2 / 3) < 0.02
                ? "2:3"
                : null;

  return (
    <div className="flex flex-col gap-2.5">
      <PanelRow
        label="Ширина"
        value={`${width} px`}
      >
        <Stepper
          label="ширина"
          value={width}
          onChange={(w) => setResolution(w, height)}
        />
      </PanelRow>

      <PanelRow label="Высота" value={`${height} px`}>
        <Stepper
          label="высота"
          value={height}
          onChange={(h) => setResolution(width, h)}
        />
      </PanelRow>

      <div className="flex flex-col gap-1.5">
        <span className="tm-mono text-[8.5px] uppercase tracking-[0.2em] text-[var(--tm-text-dim)]">
          Соотношение сторон
        </span>
        <div className="grid grid-cols-6 gap-1.5">
          {ASPECT_PRESETS.map((p) => {
            const active = activeRatio === p.ratio;
            return (
              <button
                key={p.ratio}
                onClick={() => setResolution(p.sizes[0].w, p.sizes[0].h)}
                aria-pressed={active}
                className={`tm-mono border py-2 text-[9px] tracking-[0.1em] transition-colors ${
                  active
                    ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)] tm-glow"
                    : "border-[var(--tm-border)] text-[var(--tm-text-dim)] active:bg-[rgba(148,130,255,0.1)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <ActionButton
        onClick={() => setResolution(height, width)}
        ariaLabel="Поменять стороны местами"
      >
        <RotateCcw size={12} strokeWidth={2} />
        Транспонировать
      </ActionButton>
    </div>
  );
}
