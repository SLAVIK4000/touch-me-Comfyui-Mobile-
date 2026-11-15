"use client";

/**
 * SettingsSheet — обёртка панелей настроек (Glass UI).
 *
 * Панель поднята выше нижней ленты управления: между ними выдержан
 * зазор (--tm-bb-h + отступ), элементы никогда не перекрываются,
 * тайлы нижней ленты остаются доступны для переключения панелей.
 * Закрывается по тапу на свободную область, повторным тапом по тайлу
 * или кнопке «✕».
 */

import type { PanelId } from "@/lib/touchme/types";
import { useAppStore } from "@/store/touchme/useAppStore";
import { Maximize2, X } from "lucide-react";
import ModelsPanel from "./panels/ModelsPanel";
import LoraPanel from "./panels/LoraPanel";
import FooocusStylesPanel from "./panels/FooocusStylesPanel";
import PromptPanel from "./panels/PromptPanel";
import ResolutionPanel from "./panels/ResolutionPanel";
import KSamplerPanel from "./panels/KSamplerPanel";
import ModePanel from "./panels/ModePanel";
import ImageSourcePanel from "./panels/ImageSourcePanel";
import UpscalePanel from "./panels/UpscalePanel";

const PANEL_META: Record<PanelId, { title: string; fullscreen?: boolean }> = {
  models: { title: "Модели" },
  lora: { title: "LoRA" },
  fooocus: { title: "Fooocus" },
  prompt: { title: "Промпт", fullscreen: true },
  resolution: { title: "Разрешение" },
  ksampler: { title: "KSampler" },
  mode: { title: "Режимы" },
  imageSource: { title: "Изображение" },
  upscale: { title: "Upscale" },
};

const PANEL_COMPONENTS: Record<PanelId, React.ComponentType> = {
  models: ModelsPanel,
  lora: LoraPanel,
  fooocus: FooocusStylesPanel,
  prompt: PromptPanel,
  resolution: ResolutionPanel,
  ksampler: KSamplerPanel,
  mode: ModePanel,
  imageSource: ImageSourcePanel,
  upscale: UpscalePanel,
};

export default function SettingsSheet() {
  const activePanel = useAppStore((s) => s.activePanel);
  const closePanel = useAppStore((s) => s.closePanel);
  const setPromptFullscreen = useAppStore((s) => s.setPromptFullscreen);

  if (!activePanel) return null;

  const meta = PANEL_META[activePanel];
  const PanelBody = PANEL_COMPONENTS[activePanel];

  /** якорь над всей нижней лентой: высота ленты + зазор + безопасная зона */
  const anchor = "calc(var(--tm-bb-h, 116px) + env(safe-area-inset-bottom, 0px))";

  return (
    <div className="absolute inset-0 z-30">
      {/* тап по свободной области закрывает панель; нижняя лента не перекрыта — тайлы кликабельны */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ bottom: anchor }}
        onClick={closePanel}
        aria-hidden
      />

      <section
        key={activePanel}
        role="dialog"
        aria-label={meta.title}
        className="tm-panel tm-scanlines anim-slide-up absolute inset-x-1.5 z-[31] flex flex-col"
        style={{ bottom: anchor, maxHeight: "62vh" }}
      >
        {/* шапка: только название + компактные действия */}
        <div className="flex flex-none items-center justify-between gap-2 border-b border-[var(--tm-border-soft)] px-3.5 py-2">
          <h2 className="tm-mono truncate text-[12px] font-medium uppercase tracking-[0.22em] text-[var(--tm-text)]">
            {meta.title}
          </h2>
          <div className="flex flex-none items-center gap-1.5">
            {meta.fullscreen && (
              <button
                onClick={() => setPromptFullscreen(true)}
                className="flex h-8 w-8 items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
                aria-label="Развернуть на весь экран"
              >
                <Maximize2 size={14} strokeWidth={2} />
              </button>
            )}
            <button
              onClick={closePanel}
              className="flex h-8 w-8 items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
              aria-label="Закрыть панель"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* тело панели */}
        <div className="tm-vscroll min-h-0 flex-1 p-3">
          <PanelBody />
        </div>
      </section>
    </div>
  );
}
