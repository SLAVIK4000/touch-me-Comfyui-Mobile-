"use client";

/**
 * Состояние оболочки приложения: видимость UI-хрома,
 * активная панель настроек, состояние шторки галереи.
 */
import { create } from "zustand";
import type { PanelId } from "@/lib/touchme/types";

export type GallerySheetState = "closed" | "peek" | "full";

interface AppStore {
  /** Видимость верхних/нижних панелей (тап по изображению) */
  uiVisible: boolean;
  /** Открытая панель настроек (null — не открыта) */
  activePanel: PanelId | null;
  /** Состояние шторки галереи */
  gallerySheet: GallerySheetState;
  /** Полноэкранное редактирование промпта */
  promptFullscreen: boolean;
  /** Активное поле промпта (положительное / отрицательное) */
  promptKind: "positive" | "negative";

  toggleUi: () => void;
  showUi: () => void;
  hideUi: () => void;

  openPanel: (panel: PanelId) => void;
  closePanel: () => void;
  togglePanel: (panel: PanelId) => void;

  openGallery: () => void;
  closeGallery: () => void;
  expandGallery: () => void;
  collapseGallery: () => void;

  setPromptFullscreen: (v: boolean) => void;
  setPromptKind: (kind: "positive" | "negative") => void;
}

export const useAppStore = create<AppStore>((set) => ({
  uiVisible: true,
  activePanel: null,
  gallerySheet: "closed",
  promptFullscreen: false,
  promptKind: "positive",

  toggleUi: () => set((s) => ({ uiVisible: !s.uiVisible })),
  showUi: () => set({ uiVisible: true }),
  hideUi: () => set({ uiVisible: false }),

  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
  togglePanel: (panel) =>
    set((s) => ({
      activePanel: s.activePanel === panel ? null : panel,
      // при открытии панели UI обязан быть видим
      uiVisible: s.activePanel === panel ? s.uiVisible : true,
    })),

  openGallery: () => set({ gallerySheet: "peek", uiVisible: true }),
  closeGallery: () => set({ gallerySheet: "closed" }),
  expandGallery: () => set({ gallerySheet: "full" }),
  collapseGallery: () => set({ gallerySheet: "peek" }),

  setPromptFullscreen: (v) => set({ promptFullscreen: v }),
  setPromptKind: (kind) => set({ promptKind: kind }),
}));
