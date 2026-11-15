"use client";

/**
 * ImageSourcePanel — панель выбора исходного изображения для Img2Img.
 * Источники: внутренняя галерея приложения или загрузка с устройства.
 * Файл с устройства сразу выгружается на сервер ComfyUI
 * (POST /upload/image) — имя файла подставляется в LoadImage при
 * генерации. Изображение галереи выгружается в момент запуска.
 * После выбора показывается предпросмотр с заменой/удалением.
 */

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import { useGalleryStore } from "@/store/touchme/useGalleryStore";
import { useToast } from "@/hooks/use-toast";
import { uploadImage, loadImageValue } from "@/lib/touchme/api/comfy";
import { ActionButton, EmptyHint } from "./parts";

type SourceTab = "gallery" | "device";

export default function ImageSourcePanel() {
  const imageSource = useGenerationStore((s) => s.imageSource);
  const setImageSource = useGenerationStore((s) => s.setImageSource);
  const clearImageSource = useGenerationStore((s) => s.clearImageSource);

  const images = useGalleryStore((s) => s.images);
  const { toast } = useToast();
  const [tab, setTab] = useState<SourceTab>("gallery");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const galleryImage = images.find(
    (img) => img.id === imageSource.galleryImageId,
  );
  const previewSrc =
    imageSource.uploadedUrl ?? galleryImage?.src ?? null;

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    // предпросмотр — сразу; параллельно выгружаем файл на сервер
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageSource({
          uploadedUrl: reader.result,
          galleryImageId: null,
          uploadedName: null,
          uploading: true,
        });
      }
    };
    reader.readAsDataURL(file);

    void (async () => {
      try {
        const ref = await uploadImage(file, file.name);
        setImageSource({ uploadedName: loadImageValue(ref), uploading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : "ошибка";
        setImageSource({ uploading: false });
        toast({
          title: "Не удалось загрузить файл на сервер",
          description: message.slice(0, 200),
        });
      }
    })();
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* предпросмотр выбранного источника */}
      {previewSrc ? (
        <div className="tm-glass-block flex items-center gap-2.5 p-2.5">
          <div className="relative h-24 w-24 flex-none">
            <img
              src={previewSrc}
              alt="Предпросмотр исходного изображения"
              className="h-24 w-24 flex-none border border-[var(--tm-border-soft)] object-cover"
            />
            {imageSource.uploading && (
              <span className="tm-mono absolute inset-0 flex items-center justify-center bg-[rgba(7,7,13,0.72)] text-[8px] tracking-[0.18em] text-[var(--tm-violet)]">
                <Loader2 size={14} className="mr-1 animate-spin" />
                АПЛОАД
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="tm-mono truncate text-[9.5px] text-[var(--tm-text-dim)]">
              {imageSource.uploadedUrl
                ? imageSource.uploading
                  ? "С устройства — выгрузка на сервер…"
                  : "С устройства — готово к генерации"
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
                    setImageSource({
                      galleryImageId: img.id,
                      uploadedUrl: null,
                      uploadedName: null,
                      uploading: false,
                    })
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
