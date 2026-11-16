"use client";

/**
 * TouchMeApp — каркас главного экрана мобильного интерфейса ComfyUI.
 *
 * Компоновка слоёв (снизу вверх):
 *   ImageViewer   — полноэкранный просмотрщик (жесты);
 *   TopBar        — «Touch me» + имя изображения (переименование);
 *   BottomBar     — компактная лента управления + генерация + галерея;
 *   SettingsSheet  — панели настроек над нижней лентой;
 *   GallerySheet   — шторка галереи;
 *   PromptFullscreen — полноэкранный редактор промпта.
 *
 * Тап по изображению/пустому месту скрывает и показывает весь хром UI.
 */

import { useEffect } from "react";
import ImageViewer from "./ImageViewer";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import SettingsSheet from "./SettingsSheet";
import GallerySheet from "./GallerySheet";
import PromptFullscreen from "./PromptFullscreen";
import { useConnectionStore } from "@/store/touchme/useConnectionStore";

export default function TouchMeApp() {
  /** подключение к живому ComfyUI: пинг /system_stats + история в галерею */
  const initConnection = useConnectionStore((s) => s.init);
  useEffect(() => {
    initConnection();
  }, [initConnection]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#07070d]">
      {/* фоновая виньетка: мягкое фиолетово-синее свечение по центру */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 42%, rgba(76,56,160,0.22) 0%, rgba(10,10,20,0) 60%)",
        }}
      />

      <ImageViewer />
      <TopBar />
      <BottomBar />
      <SettingsSheet />
      <GallerySheet />
      <PromptFullscreen />
    </main>
  );
}
