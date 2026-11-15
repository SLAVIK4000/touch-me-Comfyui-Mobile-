"use client";

/**
 * PromptPanel — панель «Промпт» (компоновка по разметке пользователя).
 *
 * Основное пространство — окна ввода: сверху положительный промпт,
 * ниже — отрицательный. Между ними — компактные кнопки управления
 * (переключение активного поля POS / NEG). Разворот на весь экран —
 * маленькая иконка в шапке панели (см. SettingsSheet), открывает
 * полноэкранный редактор активного поля.
 */

import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { useAppStore } from "@/store/touchme/useAppStore";

const TA_BASE =
  "tm-allow-select tm-mono w-full resize-none border bg-[rgba(10,10,20,0.35)] p-3 text-[12px] leading-relaxed text-[var(--tm-text)] outline-none backdrop-blur-[6px] placeholder:text-[var(--tm-text-dim)]";

export default function PromptPanel() {
  const prompt = useGenerationStore((s) => s.prompt);
  const setPrompt = useGenerationStore((s) => s.setPrompt);
  const kind = useAppStore((s) => s.promptKind);
  const setPromptKind = useAppStore((s) => s.setPromptKind);

  const active = (k: "positive" | "negative") =>
    kind === k
      ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)] tm-glow"
      : "border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-text)]";

  return (
    <div className="flex flex-col gap-2">
      {/* основное окно ввода: положительный промпт */}
      <textarea
        value={prompt.positive}
        onChange={(e) => setPrompt("positive", e.target.value)}
        onFocus={() => setPromptKind("positive")}
        placeholder="Опишите желаемое изображение…"
        className={`${TA_BASE} min-h-[128px] flex-1 ${
          kind === "positive"
            ? "border-[var(--tm-violet)] focus:border-[var(--tm-violet)]"
            : "border-[var(--tm-border-soft)] focus:border-[var(--tm-border)]"
        }`}
        aria-label="Положительный промпт"
      />

      {/* кнопки управления между позитивным и негативным промптами */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPromptKind("positive")}
          aria-pressed={kind === "positive"}
          className={`tm-mono min-w-0 flex-1 border py-2 text-[9px] uppercase tracking-[0.18em] transition-colors ${active(
            "positive",
          )}`}
        >
          Positive
        </button>
        <button
          onClick={() => setPromptKind("negative")}
          aria-pressed={kind === "negative"}
          className={`tm-mono min-w-0 flex-1 border py-2 text-[9px] uppercase tracking-[0.18em] transition-colors ${active(
            "negative",
          )}`}
        >
          Negative
        </button>
      </div>

      {/* окно ввода: отрицательный промпт */}
      <textarea
        value={prompt.negative}
        onChange={(e) => setPrompt("negative", e.target.value)}
        onFocus={() => setPromptKind("negative")}
        placeholder="Что исключить из генерации…"
        className={`${TA_BASE} min-h-[88px] ${
          kind === "negative"
            ? "border-[var(--tm-blue)] focus:border-[var(--tm-blue)]"
            : "border-[var(--tm-border-soft)] focus:border-[var(--tm-border)]"
        }`}
        aria-label="Отрицательный промпт"
      />
    </div>
  );
}
