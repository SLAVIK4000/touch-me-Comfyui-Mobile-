"use client";

/**
 * FooocusStylesPanel — панель выбора Fooocus Styles.
 * Список загружается из внешнего источника (sources.ts; сейчас — ресурс
 * fooocus_styles.json, полный набор ComfyUI-Easy-Use, 275 стилей).
 * Поддерживает: мультивыбор, поиск, отключение выбранных стилей,
 * отображение активных стилей поверх списка.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { fetchFooocusStyles } from "@/lib/touchme/data/sources";
import type { FooocusStyle } from "@/lib/touchme/types";
import { EmptyHint } from "./parts";

export default function FooocusStylesPanel() {
  const activeStyles = useGenerationStore((s) => s.activeStyles);
  const toggleStyle = useGenerationStore((s) => s.toggleStyle);

  const [styles, setStyles] = useState<FooocusStyle[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchFooocusStyles().then((list) => {
      if (!cancelled) setStyles(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!styles) return [];
    const q = query.trim().toLowerCase();
    if (!q) return styles;
    return styles.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.name_cn ?? "").toLowerCase().includes(q),
    );
  }, [styles, query]);

  const activeSet = useMemo(() => new Set(activeStyles), [activeStyles]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* активные стили (отключаются крестиком) */}
      {activeStyles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
            {activeStyles.map((name) => (
              <button
                key={name}
                onClick={() => toggleStyle(name)}
                className="tm-mono flex items-center gap-1 border border-[rgba(167,139,250,0.55)] bg-[rgba(139,92,246,0.16)] px-2 py-1 text-[9px] tracking-[0.06em] text-[var(--tm-violet)] active:bg-[rgba(139,92,246,0.3)]"
                aria-label={`Отключить стиль ${name}`}
              >
                {name}
                <X size={10} strokeWidth={2.5} />
              </button>
            ))}
        </div>
      )}

      {/* поиск */}
      <div className="flex items-center gap-2 border border-[var(--tm-border)] bg-[rgba(15,15,28,0.7)] px-2.5 py-2">
        <Search size={13} className="flex-none text-[var(--tm-text-dim)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="поиск стиля…"
          className="tm-allow-select tm-mono min-w-0 flex-1 bg-transparent text-[11px] text-[var(--tm-text)] outline-none placeholder:text-[var(--tm-text-dim)]"
          inputMode="search"
          aria-label="Поиск стиля"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="flex-none text-[var(--tm-text-dim)]"
            aria-label="Очистить поиск"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* список стилей */}
      {styles === null ? (
        <EmptyHint>Загрузка списка стилей…</EmptyHint>
      ) : filtered.length === 0 ? (
        <EmptyHint>Стили не найдены</EmptyHint>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((style) => {
            const active = activeSet.has(style.name);
            return (
              <button
                key={style.name}
                onClick={() => toggleStyle(style.name)}
                aria-pressed={active}
                className={`flex items-center gap-2.5 border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? "border-[rgba(167,139,250,0.55)] bg-[rgba(139,92,246,0.14)]"
                    : "border-transparent border-b-[var(--tm-border-soft)] active:bg-[rgba(148,130,255,0.08)]"
                }`}
              >
                <span
                  className={`flex h-4 w-4 flex-none items-center justify-center border ${
                    active
                      ? "border-[var(--tm-violet)] bg-[var(--tm-violet)] text-black"
                      : "border-[var(--tm-border)] text-transparent"
                  }`}
                  aria-hidden
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <span
                  className={`tm-mono flex-1 truncate text-[10px] tracking-[0.04em] ${
                    active ? "text-[var(--tm-violet)]" : "text-[var(--tm-text)]"
                  }`}
                >
                  {style.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
