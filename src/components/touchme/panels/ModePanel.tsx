"use client";

/**
 * ModePanel — панель «Режимы обработки» (UI менеджера режимов).
 * Режимы расширяемые; некоторые работают одновременно (Img2Img + Upscale,
 * где Upscale по умолчанию обрабатывает результат Img2Img).
 * Активные режимы меняют состав нижней панели и набор загрузчиков.
 */

import { Switch } from "@/components/ui/switch";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import type { ProcessMode } from "@/lib/touchme/types";

interface ModeRow {
  id: ProcessMode;
  title: string;
  toggleable: boolean;
}

const MODES: ModeRow[] = [
  { id: "t2i", title: "Text to Image", toggleable: false },
  { id: "img2img", title: "Img2Img", toggleable: true },
  { id: "upscale", title: "Upscale", toggleable: true },
];

export default function ModePanel() {
  const modes = useGenerationStore((s) => s.activeModes);
  const toggleMode = useGenerationStore((s) => s.toggleMode);

  return (
    <div className="flex flex-col gap-2.5">
      {MODES.map((m) => {
        const active = modes[m.id];
        return (
          <div
            key={m.id}
            className={`flex items-center gap-3 p-3 ${
              active
                ? "border border-[rgba(167,139,250,0.5)] bg-[rgba(139,92,246,0.1)]"
                : "border border-[var(--tm-border-soft)] bg-[var(--tm-glass-block)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 flex-none ${
                active
                  ? "rotate-45 bg-[var(--tm-violet)] tm-glow"
                  : "rotate-45 bg-[var(--tm-text-dim)]/40"
              }`}
              aria-hidden
            />
            <span
              className={`tm-mono min-w-0 flex-1 text-[11px] uppercase tracking-[0.18em] ${
                active ? "text-[var(--tm-text)]" : "text-[var(--tm-text-dim)]"
              }`}
            >
              {m.title}
            </span>
            {m.toggleable ? (
              <Switch
                checked={active}
                onCheckedChange={() => toggleMode(m.id)}
                aria-label={`Режим ${m.title}`}
                className="data-[state=checked]:bg-[var(--tm-violet-strong)]"
              />
            ) : (
              <span className="tm-mono flex-none text-[8px] uppercase tracking-[0.14em] text-[var(--tm-violet)]">
                {active ? "авто" : "—"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
