/**
 * Touch me — связь истории сервера и галереи интерфейса.
 *
 * Реальные результаты генераций ComfyUI (в том числе сделанные в
 * классическом интерфейсе) живут в output/ сервера и видны через
 * /history + /view. При первом подключении последние результаты
 * загружаются в галерею мобильного интерфейса.
 */

import {
  fetchRecentHistory,
  viewUrl,
  type ComfyImageRef,
  type HistoryEntry,
} from "./comfy";
import type { GalleryImage } from "../types";

/** Загружает изображение и возвращает его реальные размеры. */
export function measureImage(
  url: string,
  timeoutMs = 8000,
): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const im = new Image();
    const timer = setTimeout(() => {
      im.src = "";
      resolve(null);
    }, timeoutMs);
    im.onload = () => {
      clearTimeout(timer);
      resolve({ w: im.naturalWidth, h: im.naturalHeight });
    };
    im.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    im.src = url;
  });
}

/** Галерейное изображение из ссылки на файл сервера. */
export function imageFromRef(
  img: ComfyImageRef,
  index: number,
  meta?: GalleryImage["meta"],
): GalleryImage {
  return {
    id: `srv-${img.subfolder ?? ""}-${img.filename}-${index}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    name: img.filename,
    src: viewUrl(img),
    width: 0,
    height: 0,
    createdAt: new Date().toISOString(),
    meta,
    ref: img,
  };
}

/** Собирает изображения из записи истории (все output-узлы). */
function imagesFromEntry(entry: HistoryEntry): GalleryImage[] {
  const out: GalleryImage[] = [];
  for (const nodeOutput of Object.values(entry.outputs ?? {})) {
    for (const img of nodeOutput.images ?? []) {
      if (img.type && img.type !== "output") continue;
      out.push(imageFromRef(img, out.length));
    }
  }
  return out;
}

/**
 * Последние результаты сервера → галерея (новые сверху).
 * Сервер отдаёт историю от свежих к старым; собираем не более limit.
 */
export async function recentServerImages(
  maxItems = 30,
  limit = 60,
): Promise<GalleryImage[]> {
  const history = await fetchRecentHistory(maxItems);
  const all: GalleryImage[] = [];
  for (const entry of Object.values(history)) {
    all.push(...imagesFromEntry(entry));
    if (all.length >= limit) break;
  }
  return all.slice(0, limit);
}

/** Досчитывает реальные размеры (параллельно, пачками по 6). */
export async function measureAll(images: GalleryImage[]): Promise<void> {
  const batch = 6;
  for (let i = 0; i < images.length; i += batch) {
    const slice = images.slice(i, i + batch);
    await Promise.all(
      slice.map(async (im) => {
        const size = await measureImage(im.src);
        if (size) {
          im.width = size.w;
          im.height = size.h;
        } else {
          im.width = im.width || 1024;
          im.height = im.height || 1024;
        }
      }),
    );
  }
}
