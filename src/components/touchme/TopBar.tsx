"use client";

/**
 * TopBar — верхняя панель интерфейса.
 * Строка 1: логотип приложения «Touch me» + статус-чип.
 * Строка 2: название текущего изображения с возможностью переименования
 * и счётчик позиции в галерее.
 * Скрывается вместе с остальным UI по тапу по изображению.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { useAppStore } from "@/store/touchme/useAppStore";
import { useGalleryStore } from "@/store/touchme/useGalleryStore";
import { useToast } from "@/hooks/use-toast";

export default function TopBar() {
  const uiVisible = useAppStore((s) => s.uiVisible);
  const images = useGalleryStore((s) => s.images);
  const currentIndex = useGalleryStore((s) => s.currentIndex);
  const renameImage = useGalleryStore((s) => s.renameImage);
  const { toast } = useToast();

  const current = images[currentIndex];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    if (!current) return;
    setDraft(current.name);
    setEditing(true);
  };

  const commitRename = () => {
    if (current && draft.trim() && draft.trim() !== current.name) {
      renameImage(current.id, draft);
      toast({ title: "Переименовано", description: draft.trim() });
    }
    setEditing(false);
  };

  return (
    <header
      className="absolute inset-x-0 top-0 z-20 transition-all duration-300"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        opacity: uiVisible ? 1 : 0,
        transform: uiVisible ? "translateY(0)" : "translateY(-110%)",
        pointerEvents: uiVisible ? "auto" : "none",
      }}
    >
      <div className="tm-panel mx-1.5 mt-1.5">
        {/* строка 1: лого приложения + статус */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rotate-45 bg-[var(--tm-violet)] tm-glow" aria-hidden />
            <span className="tm-mono text-[11px] font-medium tracking-[0.42em] text-[var(--tm-text)]">
              TOUCH&nbsp;ME
            </span>
          </div>
          <span className="tm-mono border border-[var(--tm-border)] px-1.5 py-0.5 text-[8.5px] tracking-[0.2em] text-[var(--tm-text-dim)]">
            STANDALONE&nbsp;DEMO
          </span>
        </div>

        {/* строка 2: имя изображения */}
        {current && (
          <div className="tm-hr" />
        )}
        {current && (
          <div className="flex items-center gap-2 px-3 py-2">
            {editing ? (
              <form
                className="flex min-w-0 flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  commitRename();
                }}
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  className="tm-allow-select min-w-0 flex-1 border-b border-[var(--tm-violet)] bg-transparent py-0.5 text-[13px] text-[var(--tm-text)] outline-none"
                  maxLength={120}
                  inputMode="text"
                  enterKeyHint="done"
                  aria-label="Новое имя изображения"
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 flex-none items-center justify-center border border-[var(--tm-violet)] text-[var(--tm-violet)] active:bg-[rgba(139,92,246,0.18)]"
                  aria-label="Сохранить имя"
                >
                  <Check size={15} strokeWidth={2} />
                </button>
              </form>
            ) : (
              <button
                onClick={startEditing}
                className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left active:opacity-70"
                aria-label="Переименовать изображение"
              >
                <span className="truncate text-[13px] text-[var(--tm-text)]">
                  {current.name}
                </span>
                <Pencil size={11} className="flex-none text-[var(--tm-text-dim)]" />
              </button>
            )}
            <div className="tm-mono flex flex-none items-center gap-2 text-[10px] text-[var(--tm-text-dim)]">
              <span className="text-[var(--tm-violet)]">
                {String(currentIndex + 1).padStart(2, "0")}
              </span>
              <span>/ {String(images.length).padStart(2, "0")}</span>
              <span className="hidden sm:inline">
                {current.width}×{current.height}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
