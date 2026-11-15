"use client";

/**
 * Состояние соединения с ComfyUI.
 *
 * Пинг /system_stats при старте, при возврате на вкладку и каждые 20 c.
 * Индикатор в TopBar показывает ОНЛАЙН/ОФЛАЙН; при первом успешном
 * подключении галерея наполняется реальными результатами сервера
 * (включая сделанные из классического интерфейса).
 */

import { create } from "zustand";
import { pingServer } from "@/lib/touchme/api/comfy";
import {
  measureAll,
  recentServerImages,
} from "@/lib/touchme/api/gallery";
import { useGalleryStore } from "./useGalleryStore";

interface ConnectionStore {
  /** null = проверка ещё идёт */
  online: boolean | null;
  /** короткая подпись для чипа TopBar */
  label: string;
  /** версия ComfyUI сервера (если отдал) */
  version: string | null;
  inited: boolean;
  historyLoaded: boolean;
  /** подписка инициализации (однократно из TouchMeApp) */
  init: () => void;
  /** внеплановая проверка; возвращает online */
  recheck: () => Promise<boolean>;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  online: null,
  label: "ПРОВЕРКА...",
  version: null,
  inited: false,
  historyLoaded: false,

  init: () => {
    if (get().inited || typeof window === "undefined") return;
    set({ inited: true });

    void get().recheck();

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      void get().recheck();
    }, 20000);

    window.addEventListener("focus", () => {
      void get().recheck();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void get().recheck();
    });
  },

  recheck: async () => {
    const stats = await pingServer(6000);
    const online = Boolean(stats);
    const version = stats?.system?.comfyui_version ?? null;
    set({
      online,
      version,
      label: online ? "COMFYUI · ОНЛАЙН" : "ОФЛАЙН · ДЕМО",
    });

    // при первом подключении показываем реальные результаты сервера
    if (online && !get().historyLoaded) {
      set({ historyLoaded: true });
      try {
        const images = await recentServerImages(30, 60);
        await measureAll(images);
        useGalleryStore.getState().setServerImages(images);
      } catch {
        /* истории может не быть — галерея остаётся демо */
      }
    }
    return online;
  },
}));
