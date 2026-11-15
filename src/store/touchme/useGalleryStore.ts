"use client";

/**
 * Внутренняя галерея приложения: список изображений (демо-файлы в
 * офлайн-режиме, реальные результаты ComfyUI после подключения), текущий
 * индекс для просмотрщика, режим выделения и удаление.
 */
import { create } from "zustand";
import type { GalleryImage } from "@/lib/touchme/types";
import { DEMO_GALLERY } from "@/lib/touchme/data/sources";

interface GalleryStore {
  images: GalleryImage[];
  currentIndex: number;
  /** Режим множественного выделения */
  selectionMode: boolean;
  selectedIds: string[];

  setImages: (images: GalleryImage[]) => void;
  /** новые результаты генерации — в начало списка (сверху самые свежие) */
  prependImages: (images: GalleryImage[]) => void;
  /** замена демо-галереи реальной историей сервера при подключении */
  setServerImages: (images: GalleryImage[]) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;

  renameImage: (id: string, name: string) => void;
  removeImages: (ids: string[]) => void;

  toggleSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
}

const initialImages = [...DEMO_GALLERY];

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  images: initialImages,
  currentIndex: 0,
  selectionMode: false,
  selectedIds: [],

  setImages: (images) =>
    set({ images, currentIndex: 0, selectionMode: false, selectedIds: [] }),

  prependImages: (images) =>
    set((s) => ({
      images: [...images, ...s.images],
      // текущий индекс переносим на первую добавленную
      currentIndex: images.length > 0 ? 0 : s.currentIndex,
      selectedIds: s.selectedIds,
    })),

  setServerImages: (images) =>
    set({
      images,
      currentIndex: 0,
      selectionMode: false,
      selectedIds: [],
    }),

  goTo: (index) => {
    const n = get().images.length;
    if (n === 0) return set({ currentIndex: 0 });
    set({ currentIndex: Math.max(0, Math.min(index, n - 1)) });
  },

  next: () => {
    const { currentIndex, images } = get();
    if (currentIndex < images.length - 1) set({ currentIndex: currentIndex + 1 });
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  renameImage: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      images: s.images.map((img) =>
        img.id === id ? { ...img, name: trimmed } : img,
      ),
    }));
  },

  removeImages: (ids) => {
    const { images, currentIndex, selectedIds, selectionMode } = get();
    const idSet = new Set(ids);
    // сколько удалённых находится до текущего индекса
    const removedBefore = images
      .slice(0, currentIndex)
      .filter((img) => idSet.has(img.id)).length;
    const rest = images.filter((img) => !idSet.has(img.id));
    let newIndex = currentIndex - removedBefore;
    if (newIndex > rest.length - 1) newIndex = rest.length - 1;
    if (newIndex < 0) newIndex = 0;
    set({
      images: rest,
      currentIndex: newIndex,
      selectionMode: selectionMode && rest.length > 0,
      selectedIds: selectedIds.filter((id) => !idSet.has(id)),
    });
  },

  toggleSelectionMode: () =>
    set((s) => ({
      selectionMode: !s.selectionMode,
      selectedIds: s.selectionMode ? [] : s.selectedIds,
    })),

  exitSelectionMode: () => set({ selectionMode: false, selectedIds: [] }),

  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((i) => i !== id)
        : [...s.selectedIds, id],
    })),

  clearSelection: () => set({ selectedIds: [] }),
}));

/** Селектор: текущее изображение (или undefined) */
export const selectCurrentImage = (s: GalleryStore): GalleryImage | undefined =>
  s.images[s.currentIndex];
