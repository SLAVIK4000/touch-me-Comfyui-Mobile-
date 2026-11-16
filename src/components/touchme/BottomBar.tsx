"use client";

/**
 * BottomBar — компактная нижняя панель управления.
 *
 *  - свайп вверх от панели (или по «ручке») открывает галерею;
 *  - центральная часть — горизонтально прокручиваемая лента тайлов
 *    (состав зависит от активных режимов обработки);
 *  - слева — кнопка галереи, справа — кнопка запуска генерации;
 *  - тап по тайлу открывает соответствующую панель настроек.
 *
 * Состав ленты формируется менеджером режимов (useGenerationStore):
 * Img2Img заменяет «Разрешение» на «Изображение», Upscale добавляет
 * свой тайл, Fooocus Styles присутствует всегда.
 */

import { useMemo, useRef } from "react";
import {
  Blend,
  Expand,
  Frame,
  Images,
  ImagePlus,
  Layers,
  Palette,
  Play,
  SlidersHorizontal,
  Sparkles,
  Square,
  Type,
} from "lucide-react";
import type { PanelId } from "@/lib/touchme/types";
import { useAppStore } from "@/store/touchme/useAppStore";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { useGalleryStore } from "@/store/touchme/useGalleryStore";

const GALLERY_SWIPE_MIN = 26;

interface TileDef {
  id: PanelId;
  label: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
  highlighted?: boolean;
  badge?: number;
}

export default function BottomBar() {
  const uiVisible = useAppStore((s) => s.uiVisible);
  const activePanel = useAppStore((s) => s.activePanel);
  const gallerySheet = useAppStore((s) => s.gallerySheet);
  const togglePanel = useAppStore((s) => s.togglePanel);
  const openGallery = useAppStore((s) => s.openGallery);
  const closeGallery = useAppStore((s) => s.closeGallery);

  /** при открытой шторке галереи лента скрывается (шторка плотнее и закрывает свою область) */
  const hidden = !uiVisible || gallerySheet !== "closed";

  const modes = useGenerationStore((s) => s.activeModes);
  const loaders = useGenerationStore((s) => s.loaders);
  const loras = useGenerationStore((s) => s.loras);
  const activeStyles = useGenerationStore((s) => s.activeStyles);
  const prompt = useGenerationStore((s) => s.prompt);
  const imageSource = useGenerationStore((s) => s.imageSource);

  const imagesCount = useGalleryStore((s) => s.images.length);
  const generating = useGenerationStore((s) => s.generating);
  const progress = useGenerationStore((s) => s.progress);
  const phaseNote = useGenerationStore((s) => s.phaseNote);
  const startGeneration = useGenerationStore((s) => s.startGeneration);
  const cancelGeneration = useGenerationStore((s) => s.cancelGeneration);

  const gallerySwipe = useRef<{ y: number } | null>(null);

  const tiles = useMemo<TileDef[]>(() => {
    const list: TileDef[] = [
      {
        id: "models",
        label: "Модели",
        icon: Layers,
        badge: loaders.length || undefined,
      },
      { id: "lora", label: "LoRA", icon: Sparkles, badge: loras.length || undefined },
      {
        id: "fooocus",
        label: "Fooocus",
        icon: Palette,
        badge: activeStyles.length || undefined,
      },
      {
        id: "prompt",
        label: "Промпт",
        icon: Type,
        highlighted: Boolean(prompt.positive.trim() || prompt.negative.trim()),
      },
    ];

    // Img2Img заменяет кнопку разрешения на выбор исходного изображения
    list.push(
      modes.img2img
        ? {
            id: "imageSource",
            label: "Изображение",
            icon: ImagePlus,
            highlighted: Boolean(
              imageSource.galleryImageId || imageSource.uploadedUrl,
            ),
          }
        : { id: "resolution", label: "Разрешение", icon: Frame },
    );

    if (modes.upscale) {
      list.push({ id: "upscale", label: "Upscale", icon: Expand, highlighted: true });
    }

    list.push({ id: "ksampler", label: "KSampler", icon: SlidersHorizontal });
    list.push({
      id: "mode",
      label: "Режимы",
      icon: Blend,
      highlighted: modes.img2img || modes.upscale,
      badge: Number(modes.img2img) + Number(modes.upscale) || undefined,
    });
    return list;
  }, [modes, loaders.length, loras.length, activeStyles.length, prompt, imageSource]);

  const onGenerateClick = () => {
    if (generating) {
      cancelGeneration();
      return;
    }
    void startGeneration();
  };

  /** Свайп вверх от нижней панели открывает галерею */
  const onBarPointerDown = (e: React.PointerEvent) => {
    gallerySwipe.current = { y: e.clientY };
  };
  const onBarPointerMove = (e: React.PointerEvent) => {
    if (!gallerySwipe.current) return;
    const dy = e.clientY - gallerySwipe.current.y;
    if (dy < -GALLERY_SWIPE_MIN && gallerySheet === "closed") {
      gallerySwipe.current = null;
      openGallery();
    }
  };
  const onBarPointerUp = () => {
    gallerySwipe.current = null;
  };

  return (
    <nav
      aria-label="Панель управления генерацией"
      className="absolute inset-x-0 bottom-0 z-40 transition-all duration-300"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(110%)" : "translateY(0)",
        pointerEvents: hidden ? "none" : "auto",
      }}
      onPointerDown={onBarPointerDown}
      onPointerMove={onBarPointerMove}
      onPointerUp={onBarPointerUp}
      onPointerCancel={onBarPointerUp}
    >
      {/* строка статуса генерации: фаза + тонкий прогресс */}
      {generating && (
        <div
          className="tm-mono mx-auto mb-1 flex w-[min(92vw,420px)] flex-col gap-1 border border-[var(--tm-border-soft)] bg-[var(--tm-panel)] px-3 py-1 backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between text-[8.5px] tracking-[0.14em] text-[var(--tm-text-dim)]">
            <span className="truncate">{phaseNote ?? "генерация"}</span>
            <span className="flex-none text-[var(--tm-violet)]">
              {progress
                ? `${Math.round(progress.value * 100)}%`
                : "…"}
            </span>
          </div>
          <div className="h-[2px] w-full overflow-hidden bg-[rgba(139,92,246,0.15)]">
            <div
              className="h-full bg-[var(--tm-violet)] transition-[width] duration-200"
              style={{
                width: `${Math.round((progress?.value ?? 0.04) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ручка-приглашение к свайпу вверх */}
      <button
        onClick={() =>
          gallerySheet === "closed" ? openGallery() : closeGallery()
        }
        className="tm-mono mx-auto mb-1 flex items-center gap-1.5 border border-[var(--tm-border-soft)] bg-[var(--tm-panel)] px-3 py-1 text-[8.5px] tracking-[0.28em] text-[var(--tm-text-dim)] backdrop-blur-md active:text-[var(--tm-violet)]"
        aria-label="Открыть галерею свайпом вверх"
      >
        <span aria-hidden className="text-[9px]">▲</span> ГАЛЕРЕЯ
      </button>

      <div className="tm-panel mx-1.5 mb-1.5 flex items-stretch gap-1.5 px-2 py-2">
        {/* кнопка галереи */}
        <button
          onClick={() =>
            gallerySheet === "closed" ? openGallery() : closeGallery()
          }
          className={`relative flex w-11 flex-none flex-col items-center justify-center gap-1 border active:bg-[rgba(139,92,246,0.16)] ${
            gallerySheet !== "closed"
              ? "border-[var(--tm-violet)] text-[var(--tm-violet)] tm-glow"
              : "border-[var(--tm-border-soft)] text-[var(--tm-text)]"
          }`}
          aria-label={`Галерея, ${imagesCount} изображений`}
        >
          <Images size={17} strokeWidth={1.8} />
          <span className="tm-mono text-[8px] tracking-[0.14em] text-[var(--tm-text-dim)]">
            {String(imagesCount).padStart(2, "0")}
          </span>
        </button>

        {/* прокручиваемая лента тайлов с градиентной подсказкой прокрутки */}
        <div className="relative min-w-0 flex-1">
          <div className="tm-hscroll flex h-full items-stretch gap-1.5">
          {tiles.map((t) => {
            const active = activePanel === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => togglePanel(t.id)}
                aria-pressed={active}
                aria-label={t.label}
                className={`relative flex h-[52px] w-[62px] flex-none flex-col items-center justify-center gap-1 border transition-colors ${
                  active
                    ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)] tm-glow"
                    : t.highlighted
                      ? "border-[rgba(96,165,250,0.45)] bg-[rgba(96,165,250,0.08)] text-[var(--tm-blue)]"
                      : "border-[var(--tm-border-soft)] text-[var(--tm-text)] active:bg-[rgba(148,130,255,0.1)]"
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span className="tm-mono max-w-full truncate px-1 text-[8px] leading-none tracking-[0.1em]">
                  {t.label}
                </span>
                {t.badge ? (
                  <span className="tm-mono absolute right-1 top-1 min-w-[14px] bg-[var(--tm-violet)] px-[3px] text-[7.5px] leading-[13px] text-black">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
          </div>
          {/* индикация продолжения ленты */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[rgba(16,16,30,0.92)] to-transparent"
          />
        </div>

        {/* кнопка генерации: запуск / остановка с индикатором */}
        <button
          onClick={onGenerateClick}
          className={`relative flex w-11 flex-none items-center justify-center border transition-transform active:scale-95 ${
            generating
              ? "border-[rgba(248,113,113,0.6)] bg-[rgba(127,29,29,0.55)] text-[#f87171]"
              : "border-[rgba(167,139,250,0.65)] bg-gradient-to-br from-[rgba(139,92,246,0.9)] to-[rgba(59,130,246,0.75)] text-white tm-glow"
          }`}
          aria-label={generating ? "Прервать генерацию" : "Запустить генерацию"}
        >
          {generating ? (
            <Square size={15} strokeWidth={2.4} fill="currentColor" />
          ) : (
            <Play size={18} strokeWidth={2.2} fill="currentColor" />
          )}
          {generating && progress && (
            <span
              aria-hidden
              className="tm-mono absolute -top-1.5 left-1/2 -translate-x-1/2 bg-[#141425] px-1 text-[7.5px] leading-[11px] text-[var(--tm-violet)]"
            >
              {Math.round(progress.value * 100)}%
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
