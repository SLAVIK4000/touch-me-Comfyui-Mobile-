"use client";

/**
 * GallerySheet — шторка галереи результатов.
 * Открывается свайпом вверх от нижней панели / из просмотрщика,
 * закрывается свайпом вниз за шапку или кнопкой.
 *
 * Возможности: вертикальная сетка, выделение текущего изображения,
 * режим множественного выбора + массовое удаление, сохранение на
 * устройство, разворот на весь экран. Над шторкой просмотрщик
 * продолжает работать — переключение изображений свайпом.
 */

import { useRef } from "react";
import {
  Check,
  CheckSquare,
  Download,
  Maximize2,
  Minimize2,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/touchme/useAppStore";
import { useGalleryStore } from "@/store/touchme/useGalleryStore";
import { useToast } from "@/hooks/use-toast";

const CLOSE_DRAG = 52;

export default function GallerySheet() {
  const gallerySheet = useAppStore((s) => s.gallerySheet);
  const closeGallery = useAppStore((s) => s.closeGallery);
  const expandGallery = useAppStore((s) => s.expandGallery);
  const collapseGallery = useAppStore((s) => s.collapseGallery);

  const images = useGalleryStore((s) => s.images);
  const currentIndex = useGalleryStore((s) => s.currentIndex);
  const goTo = useGalleryStore((s) => s.goTo);
  const selectionMode = useGalleryStore((s) => s.selectionMode);
  const selectedIds = useGalleryStore((s) => s.selectedIds);
  const toggleSelectionMode = useGalleryStore((s) => s.toggleSelectionMode);
  const exitSelectionMode = useGalleryStore((s) => s.exitSelectionMode);
  const toggleSelected = useGalleryStore((s) => s.toggleSelected);
  const removeImages = useGalleryStore((s) => s.removeImages);
  const { toast } = useToast();

  const dragStartY = useRef<number | null>(null);

  if (gallerySheet === "closed") return null;

  const isFull = gallerySheet === "full";
  const selectedSet = new Set(selectedIds);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null || isFull) return;
    if (e.clientY - dragStartY.current > CLOSE_DRAG) {
      dragStartY.current = null;
      exitSelectionMode();
      closeGallery();
    }
  };
  const onHeaderPointerUp = () => {
    dragStartY.current = null;
  };

  const saveImages = (ids: string[]) => {
    const list = images.filter((img) => ids.includes(img.id));
    if (list.length === 0) return;
    list.forEach((img) => {
      const a = document.createElement("a");
      a.href = img.src;
      a.download = img.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    toast({
      title: "Сохранение",
      description: `Загружается ${list.length} файл(ов) на устройство.`,
    });
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    removeImages(selectedIds);
    toast({
      title: "Удалено",
      description: `Удалено изображений: ${selectedIds.length}.`,
    });
    exitSelectionMode();
  };

  return (
    <section
      role="region"
      aria-label="Галерея результатов"
      className="tm-panel anim-slide-up absolute inset-x-1.5 z-[45] flex flex-col"
      style={{
        bottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
        height: isFull
          ? "calc(100% - 12px - env(safe-area-inset-bottom, 0px) - env(safe-area-inset-top, 0px))"
          : "62vh",
        top: isFull ? "calc(6px + env(safe-area-inset-top, 0px))" : undefined,
        transition: "height 240ms cubic-bezier(.22,1,.36,1)",
      }}
    >
      {/* шапка */}
      <div
        className="flex flex-none touch-pan-y cursor-grab flex-col"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <div className="flex items-center justify-between border-b border-[var(--tm-border-soft)] px-3 py-2.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="tm-mono text-[12px] font-medium uppercase tracking-[0.24em] text-[var(--tm-text)]">
              Галерея
            </h2>
            <span className="tm-mono text-[9px] text-[var(--tm-text-dim)]">
              {String(images.length).padStart(2, "0")}
            </span>
          </div>
          <div className="flex flex-none items-center gap-1.5">
            <button
              onClick={toggleSelectionMode}
              aria-pressed={selectionMode}
              aria-label="Режим выделения"
              className={`flex h-8 w-8 items-center justify-center border active:bg-[rgba(148,130,255,0.12)] ${
                selectionMode
                  ? "border-[var(--tm-violet)] text-[var(--tm-violet)] tm-glow"
                  : "border-[var(--tm-border)] text-[var(--tm-text-dim)]"
              }`}
            >
              {selectionMode ? (
                <CheckSquare size={14} strokeWidth={2} />
              ) : (
                <Square size={14} strokeWidth={2} />
              )}
            </button>
            <button
              onClick={isFull ? collapseGallery : expandGallery}
              aria-label={isFull ? "Свернуть галерею" : "Развернуть на весь экран"}
              className="flex h-8 w-8 items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
            >
              {isFull ? (
                <Minimize2 size={14} strokeWidth={2} />
              ) : (
                <Maximize2 size={14} strokeWidth={2} />
              )}
            </button>
            <button
              onClick={() => {
                exitSelectionMode();
                closeGallery();
              }}
              aria-label="Закрыть галерею"
              className="flex h-8 w-8 items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
        {selectionMode && (
          <div className="flex items-center justify-between gap-2 border-b border-[var(--tm-border-soft)] bg-[rgba(139,92,246,0.07)] px-3 py-2">
            <span className="tm-mono text-[9.5px] tracking-[0.16em] text-[var(--tm-violet)]">
              ВЫБРАНО: {selectedIds.length}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => saveImages(selectedIds)}
                disabled={selectedIds.length === 0}
                className="tm-mono flex items-center gap-1 border border-[var(--tm-border)] px-2.5 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-[var(--tm-text)] disabled:opacity-40 active:bg-[rgba(148,130,255,0.12)]"
                aria-label="Сохранить выбранные на устройство"
              >
                <Download size={11} strokeWidth={2} />
                Сохранить
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedIds.length === 0}
                className="tm-mono flex items-center gap-1 border border-[rgba(248,113,113,0.5)] px-2.5 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-[#f87171] disabled:opacity-40 active:bg-[rgba(248,113,113,0.12)]"
                aria-label="Удалить выбранные"
              >
                <Trash2 size={11} strokeWidth={2} />
                Удалить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* сетка */}
      {images.length === 0 ? (
        <div className="tm-vscroll flex flex-1 items-center justify-center">
          <p className="tm-mono px-6 text-center text-[10px] tracking-[0.14em] text-[var(--tm-text-dim)]">
            ГАЛЕРЕЯ ПУСТА
          </p>
        </div>
      ) : (
        <div className="tm-vscroll grid flex-1 grid-cols-3 gap-1.5 p-1.5">
          {images.map((img, i) => {
            const isCurrent = i === currentIndex;
            const isSelected = selectedSet.has(img.id);
            return (
              <button
                key={img.id}
                onClick={() => {
                  if (selectionMode) toggleSelected(img.id);
                  else goTo(i);
                }}
                aria-label={img.name}
                aria-pressed={isSelected}
                className={`relative aspect-square overflow-hidden border transition-transform active:scale-[0.97] ${
                  isCurrent
                    ? "border-[var(--tm-violet)] tm-glow"
                    : isSelected
                      ? "border-[var(--tm-blue)]"
                      : "border-[var(--tm-border-soft)]"
                }`}
              >
                { }
                <img
                  src={img.src}
                  alt={img.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {isCurrent && !selectionMode && (
                  <span className="tm-mono absolute bottom-1 left-1 bg-[rgba(10,10,20,0.85)] px-1.5 py-[3px] text-[8px] tracking-[0.16em] text-[var(--tm-violet)]">
                    ТЕК
                  </span>
                )}
                {selectionMode && (
                  <span
                    className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center border ${
                      isSelected
                        ? "border-[var(--tm-blue)] bg-[var(--tm-blue)] text-black"
                        : "border-[rgba(236,236,246,0.7)] bg-[rgba(10,10,20,0.4)] text-transparent"
                    }`}
                    aria-hidden
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
