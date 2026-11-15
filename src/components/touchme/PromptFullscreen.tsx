"use client";

/**
 * PromptFullscreen — полноэкранный редактор промпта.
 * Открывается для активного поля (positive/negative — переключатель
 * здесь же), крупная область ввода для длинного текста на смартфоне.
 */

import { X } from "lucide-react";
import { useAppStore } from "@/store/touchme/useAppStore";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";

export default function PromptFullscreen() {
  const promptFullscreen = useAppStore((s) => s.promptFullscreen);
  const setPromptFullscreen = useAppStore((s) => s.setPromptFullscreen);
  const kind = useAppStore((s) => s.promptKind);
  const setPromptKind = useAppStore((s) => s.setPromptKind);
  const prompt = useGenerationStore((s) => s.prompt);
  const setPrompt = useGenerationStore((s) => s.setPrompt);

  if (!promptFullscreen) return null;

  const value = kind === "positive" ? prompt.positive : prompt.negative;

  const tabCls = (k: "positive" | "negative") =>
    kind === k
      ? k === "positive"
        ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)] tm-glow"
        : "border-[var(--tm-blue)] bg-[rgba(96,165,250,0.12)] text-[var(--tm-blue)]"
      : "border-[var(--tm-border)] text-[var(--tm-text-dim)]";

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex flex-col bg-[rgba(7,7,13,0.82)] backdrop-blur-2xl"
      role="dialog"
      aria-label="Полноэкранный редактор промпта"
    >
      {/* шапка: переключатель поля + закрыть */}
      <div
        className="flex items-center gap-2 border-b border-[var(--tm-border-soft)] px-3 py-2.5"
        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex min-w-0 flex-1 gap-2">
          <button
            onClick={() => setPromptKind("positive")}
            aria-pressed={kind === "positive"}
            className={`tm-mono min-w-0 flex-1 border py-2 text-[9px] uppercase tracking-[0.16em] transition-colors ${tabCls(
              "positive",
            )}`}
          >
            Positive
          </button>
          <button
            onClick={() => setPromptKind("negative")}
            aria-pressed={kind === "negative"}
            className={`tm-mono min-w-0 flex-1 border py-2 text-[9px] uppercase tracking-[0.16em] transition-colors ${tabCls(
              "negative",
            )}`}
          >
            Negative
          </button>
        </div>
        <button
          onClick={() => setPromptFullscreen(false)}
          className="flex h-9 w-9 flex-none items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
          aria-label="Закрыть редактор"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* область ввода */}
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-3">
        <textarea
          value={value}
          onChange={(e) => setPrompt(kind, e.target.value)}
          placeholder={
            kind === "positive"
              ? "Опишите желаемое изображение…"
              : "Что не должно появляться на изображении…"
          }
          autoFocus
          className="tm-allow-select tm-mono min-h-0 flex-1 resize-none border border-[var(--tm-border-soft)] bg-[rgba(10,10,20,0.5)] p-4 text-[14px] leading-relaxed text-[var(--tm-text)] outline-none backdrop-blur-md placeholder:text-[var(--tm-text-dim)]"
          aria-label={kind === "positive" ? "Положительный промпт" : "Отрицательный промпт"}
        />
      </div>

      <div style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
    </div>
  );
}
