"use client";

/**
 * PromptPanel — панель «Промпт» (по эталонному скриншоту).
 *
 * Логичное окно ввода: ОДНО высокое текстовое поле, редактирующее
 * активный промпт. Какой промпт редактируется — задаёт переключатель
 * ПОЗИТИВ / НЕГАТИВ под полем (отдельной плашки негативного промпта
 * в окне нет). Разворот на весь экран — маленькая иконка в шапке
 * панели (см. SettingsSheet), полноэкранный редактор использует
 * то же активное поле.
 */

import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { useAppStore } from "@/store/touchme/useAppStore";

const TA_BASE =
  "tm-allow-select tm-mono w-full flex-1 resize-none border bg-[rgba(10,10,20,0.35)] p-3 text-[12px] leading-relaxed text-[var(--tm-text)] outline-none backdrop-blur-[6px] placeholder:text-[var(--tm-text-dim)]";

export default function PromptPanel() {
  const prompt = useGenerationStore((s) => s.prompt);
  const setPrompt = useGenerationStore((s) => s.setPrompt);
  const kind = useAppStore((s) => s.promptKind);
  const setPromptKind = useAppStore((s) => s.setPromptKind);

  const positive = kind === "positive";
  const value = positive ? prompt.positive : prompt.negative;

  const tabCls = (k: "positive" | "negative") =>
    kind === k
      ? k === "positive"
        ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)] tm-glow"
        : "border-[var(--tm-blue)] bg-[rgba(96,165,250,0.12)] text-[var(--tm-blue)]"
      : "border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-text)]";

  return (
    <div className="flex min-h-[320px] flex-col gap-2.5">
      {/* единственное окно ввода: редактирует активный промпт */}
      <textarea
        value={value}
        onChange={(e) => setPrompt(kind, e.target.value)}
        placeholder={
          positive
            ? "Опишите желаемое изображение…"
            : "Что исключить из генерации…"
        }
        className={`${TA_BASE} min-h-[236px] ${
          positive
            ? "border-[var(--tm-violet)] focus:border-[var(--tm-violet)]"
            : "border-[rgba(96,165,250,0.4)] focus:border-[var(--tm-blue)]"
        }`}
        aria-label={
          positive ? "Положительный промпт" : "Отрицательный промпт"
        }
      />

      {/* переключатель активного поля под окном ввода */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPromptKind("positive")}
          aria-pressed={positive}
          className={`tm-mono min-w-0 flex-1 border py-2.5 text-[9px] uppercase tracking-[0.18em] transition-colors ${tabCls(
            "positive",
          )}`}
        >
          Позитив
        </button>
        <button
          onClick={() => setPromptKind("negative")}
          aria-pressed={!positive}
          className={`tm-mono min-w-0 flex-1 border py-2.5 text-[9px] uppercase tracking-[0.18em] transition-colors ${tabCls(
            "negative",
          )}`}
        >
          Негатив
        </button>
      </div>
    </div>
  );
}
