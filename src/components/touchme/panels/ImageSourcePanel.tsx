"use client";

/**
 * ImageSourcePanel — панель выбора исходного изображения для Img2Img.
 * Источники: внутренняя галерея приложения или загрузка с устройства.
 * После выбора показывается предпросмотр с заменой/удалением.
 */

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { useGalleryStore } from "@/store/touchme/useGalleryStore";
import { ActionButton, EmptyHint } from "./parts";

type SourceTab = "gallery" | "device";

export default function ImageSourcePanel() {
  const imageSource = useGenerationStore((s) => s.imageSource);
  const setImageSource = useGenerationStore((s) => s.setImageSource);
  const clearImageSource = useGenerationStore((s) => s.clearImageSource);

  const images = useGalleryStore((s) => s.images);
  const [tab, setTab] = useState<SourceTab>("gallery");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const galleryImage = images.find(
    (img) => img.id === imageSource.galleryImageId,
  );
  const previewSrc =
    imageSource.uploadedUrl ?? galleryImage?.src ?? null;

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageSource({ uploadedUrl: reader.result, galleryImageId: null });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* предпросмотр выбранного источника */}
      {previewSrc ? (
        <div className="tm-glass-block flex items-center gap-2.5 p-2.5">
          <img
            src={previewSrc}
            alt="Предпросмотр исходного изображения"
            className="h-24 w-24 flex-none border border-[var(--tm-border-soft)] object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="tm-mono truncate text-[9.5px] text-[var(--tm-text-dim)]">
              {imageSource.uploadedUrl
                ? "С устройства"
                : (galleryImage?.name ?? "Из галереи")}
            </span>
            <ActionButton
              variant="danger"
              onClick={clearImageSource}
              ariaLabel="Удалить исходное изображение"
            >
              <Trash2 size={12} strokeWidth={2} />
              Убрать
            </ActionButton>
          </div>
        </div>
      ) : (
        <EmptyHint>Изображение не выбрано</EmptyHint>
      )}

      {/* переключатель источников */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab("gallery")}
          aria-pressed={tab === "gallery"}
          className={`tm-mono border py-2 text-[9px] uppercase tracking-[0.16em] transition-colors ${
            tab === "gallery"
              ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)]"
              : "border-[var(--tm-border)] text-[var(--tm-text-dim)]"
          }`}
        >
          Галерея
        </button>
        <button
          onClick={() => setTab("device")}
          aria-pressed={tab === "device"}
          className={`tm-mono border py-2 text-[9px] uppercase tracking-[0.16em] transition-colors ${
            tab === "device"
              ? "border-[var(--tm-violet)] bg-[rgba(139,92,246,0.16)] text-[var(--tm-violet)]"
              : "border-[var(--tm-border)] text-[var(--tm-text-dim)]"
          }`}
        >
          С устройства
        </button>
      </div>

      {tab === "gallery" ? (
        images.length === 0 ? (
          <EmptyHint>Галерея приложения пуста</EmptyHint>
        ) : (
          <div className="tm-hscroll flex gap-1.5 pb-1">
            {images.map((img) => {
              const selected = imageSource.galleryImageId === img.id;
              return (
                <button
                  key={img.id}
                  onClick={() =>
                    setImageSource({ galleryImageId: img.id, uploadedUrl: null })
                  }
                  aria-pressed={selected}
                  aria-label={`Выбрать ${img.name}`}
                  className={`relative h-20 w-20 flex-none overflow-hidden border transition-colors ${
                    selected
                      ? "border-[var(--tm-violet)] tm-glow"
                      : "border-[var(--tm-border-soft)] opacity-70 active:opacity-100"
                  }`}
                >
                  { }
                  <img
                    src={img.src}
                    alt={img.name}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        )
      ) : (
        <ActionButton
          variant="accent"
          onClick={() => fileInputRef.current?.click()}
          ariaLabel="Загрузить изображение с устройства"
        >
          <Upload size={13} strokeWidth={2} />
          Выбрать файл
        </ActionButton>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPickFile(e.target.files?.[0])}
        aria-label="Файл изображения"
      />
    </div>
  );
}
