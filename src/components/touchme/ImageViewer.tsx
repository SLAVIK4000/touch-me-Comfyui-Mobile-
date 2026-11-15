"use client";

/**
 * ImageViewer — полноэкранный просмотрщик изображений.
 *
 * Жесты:
 *  - горизонтальный свайп (zoom = 1) → переключение изображений;
 *  - двойной тап → zoom 2.5x в точке касания / возврат к 1x;
 *  - pinch двумя пальцами → масштаб (1x..8x);
 *  - pan одним пальцем при zoom > 1 (не конфликтует со свайпом:
 *    переключение работает только при zoom = 1);
 *  - одиночный тап → скрыть/показать интерфейс (или закрыть панель);
 *  - свайп вверх из нижней части экрана → открыть галерею.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useGalleryStore } from "@/store/touchme/useGalleryStore";
import { useAppStore } from "@/store/touchme/useAppStore";

const DOUBLE_TAP_DELAY = 280;
const TAP_SLOP = 8;
const SWIPE_THRESHOLD = 55;
const GALLERY_SWIPE_MIN = 40;
const GALLERY_ZONE_RATIO = 0.18; // нижние 18% экрана — зона свайпа галереи
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DOUBLE_TAP_SCALE = 2.5;

interface Transform {
  zoom: number;
  tx: number;
  ty: number;
}

export default function ImageViewer() {
  const images = useGalleryStore((s) => s.images);
  const currentIndex = useGalleryStore((s) => s.currentIndex);
  const next = useGalleryStore((s) => s.next);
  const prev = useGalleryStore((s) => s.prev);

  const containerRef = useRef<HTMLDivElement>(null);

  /** Актуальный трансформ (ref — для математики жестов без стейловых замыканий) */
  const tfRef = useRef<Transform>({ zoom: 1, tx: 0, ty: 0 });
  const [tf, setTf] = useState<Transform>({ zoom: 1, tx: 0, ty: 0 });

  /** Смещение карусели во время свайпа (zoom = 1) */
  const dragXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [animate, setAnimate] = useState(true); // включать CSS-transition

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<null | {
    mode: "tap" | "swipe" | "pan" | "pinch";
    startX: number;
    startY: number;
    startZoom: number;
    startTx: number;
    startTy: number;
    pinchStartDist: number;
    startMidX: number;
    startMidY: number;
  }>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });

  const updateTf = useCallback((patch: Partial<Transform>) => {
    tfRef.current = { ...tfRef.current, ...patch };
    setTf(tfRef.current);
  }, []);

  /** Сброс зума при смене изображения */
  useEffect(() => {
    tfRef.current = { zoom: 1, tx: 0, ty: 0 };
    dragXRef.current = 0;
    setTf(tfRef.current);
    setDragX(0);
    setAnimate(true);
  }, [currentIndex, images.length]);

  const clampPan = useCallback(
    (tx: number, ty: number, zoom: number, W: number, H: number) => {
      const maxX = Math.max(0, ((zoom - 1) * W) / 2);
      const maxY = Math.max(0, ((zoom - 1) * H) / 2);
      return {
        tx: Math.max(-maxX, Math.min(maxX, tx)),
        ty: Math.max(-maxY, Math.min(maxY, ty)),
      };
    },
    [],
  );

  const handleTap = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      const isDouble =
        now - lastTap.current.t < DOUBLE_TAP_DELAY &&
        Math.abs(x - lastTap.current.x) < 42 &&
        Math.abs(y - lastTap.current.y) < 42;
      lastTap.current = { x, y, t: now };

      if (isDouble) {
        // двойной тап: zoom в точке / сброс
        if (tapTimer.current) {
          clearTimeout(tapTimer.current);
          tapTimer.current = null;
        }
        lastTap.current.t = 0;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const px = x - rect.left - cx;
        const py = y - rect.top - cy;
        if (tfRef.current.zoom > 1.02) {
          setAnimate(true);
          updateTf({ zoom: 1, tx: 0, ty: 0 });
        } else {
          setAnimate(true);
          updateTf({
            zoom: DOUBLE_TAP_SCALE,
            tx: px * (1 - DOUBLE_TAP_SCALE),
            ty: py * (1 - DOUBLE_TAP_SCALE),
          });
        }
        return;
      }

      // одиночный тап (дождаться, не придёт ли второй)
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        const app = useAppStore.getState();
        if (app.activePanel) app.closePanel();
        else app.toggleUi();
      }, DOUBLE_TAP_DELAY);
    },
    [updateTf],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {
      // синтетические/недоступные указатели — игнорируем
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      gesture.current = {
        mode: "tap",
        startX: e.clientX,
        startY: e.clientY,
        startZoom: tfRef.current.zoom,
        startTx: tfRef.current.tx,
        startTy: tfRef.current.ty,
        pinchStartDist: 0,
        startMidX: 0,
        startMidY: 0,
      };
    } else if (pointers.current.size === 2) {
      // палец добавлен → сразу pinch (в т.ч. начиная со свайпа)
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      const [p1, p2] = [...pointers.current.values()];
      const rect = el.getBoundingClientRect();
      gesture.current = {
        mode: "pinch",
        startX: p1.x,
        startY: p1.y,
        startZoom: tfRef.current.zoom,
        startTx: tfRef.current.tx,
        startTy: tfRef.current.ty,
        pinchStartDist: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
        startMidX: (p1.x + p2.x) / 2 - rect.left,
        startMidY: (p1.y + p2.y) / 2 - rect.top,
      };
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const el = containerRef.current;
    if (!g || !el) return;

    if (g.mode === "pinch" && pointers.current.size >= 2) {
      const [p1, p2] = [...pointers.current.values()];
      const rect = el.getBoundingClientRect();
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const scale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, (g.startZoom * dist) / g.pinchStartDist),
      );
      const midX = (p1.x + p2.x) / 2 - rect.left;
      const midY = (p1.y + p2.y) / 2 - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      // контентная точка под начальной серединой остаётся под текущей серединой
      const contentX = (g.startMidX - cx - g.startTx) / g.startZoom;
      const contentY = (g.startMidY - cy - g.startTy) / g.startZoom;
      let nx = midX - cx - contentX * scale;
      let ny = midY - cy - contentY * scale;
      ({ tx: nx, ty: ny } = clampPan(nx, ny, scale, rect.width, rect.height));
      setAnimate(false);
      updateTf({ zoom: scale, tx: nx, ty: ny });
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.mode === "tap" && Math.hypot(dx, dy) > TAP_SLOP) {
      // решаем тип жеста: при зуме — pan, иначе — свайп карусели
      g.mode = tfRef.current.zoom > 1.02 ? "pan" : "swipe";
    }

    if (g.mode === "swipe") {
      // вертикаль из нижней зоны → открыть галерею
      const rect = el.getBoundingClientRect();
      const inBottomZone =
        g.startY - rect.top > rect.height * (1 - GALLERY_ZONE_RATIO);
      if (
        inBottomZone &&
        dy < -GALLERY_SWIPE_MIN &&
        Math.abs(dy) > Math.abs(dx) * 1.4
      ) {
        gesture.current = null;
        pointers.current.clear();
        setDragX(0);
        dragXRef.current = 0;
        setAnimate(true);
        useAppStore.getState().openGallery();
        return;
      }
      setAnimate(false);
      dragXRef.current = dx;
      setDragX(dx);
    } else if (g.mode === "pan") {
      const rect = el.getBoundingClientRect();
      const nx = g.startTx + dx;
      const ny = g.startTy + dy;
      const { tx, ty } = clampPan(nx, ny, tfRef.current.zoom, rect.width, rect.height);
      setAnimate(false);
      updateTf({ tx, ty });
    }
  }, [clampPan, updateTf]);

  const finishPointer = useCallback(
    (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      const g = gesture.current;

      if (g?.mode === "pinch") {
        if (pointers.current.size === 1) {
          // остался один палец → продолжаем pan
          const [p] = [...pointers.current.values()];
          g.mode = "pan";
          g.startX = p.x;
          g.startY = p.y;
          g.startTx = tfRef.current.tx;
          g.startTy = tfRef.current.ty;
        } else if (pointers.current.size === 0) {
          gesture.current = null;
          setAnimate(true);
          // недожатый pinch ниже 1x — вернуть
          if (tfRef.current.zoom < 1) updateTf({ zoom: 1, tx: 0, ty: 0 });
        }
        return;
      }

      if (pointers.current.size > 0 || !g) return;
      gesture.current = null;
      setAnimate(true);

      if (g.mode === "tap") {
        handleTap(e.clientX, e.clientY);
      } else if (g.mode === "swipe") {
        const dx = dragXRef.current;
        const n = useGalleryStore.getState().images.length;
        if (dx <= -SWIPE_THRESHOLD && n > 1) {
          if (useGalleryStore.getState().currentIndex < n - 1) next();
        } else if (dx >= SWIPE_THRESHOLD && n > 1) {
          if (useGalleryStore.getState().currentIndex > 0) prev();
        }
        dragXRef.current = 0;
        setDragX(0);
      } else if (g.mode === "pan") {
        if (tfRef.current.zoom < 1) updateTf({ zoom: 1, tx: 0, ty: 0 });
      }
    },
    [handleTap, next, prev, updateTf],
  );

  const n = images.length;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden tm-noselect"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      role="img"
      aria-label="Просмотрщик изображений"
    >
      {n === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="tm-mono text-xs tracking-[0.3em] text-[var(--tm-text-dim)]">
            ПУСТО
          </div>
          <p className="text-sm text-[var(--tm-text-dim)]">
            Галерея не содержит изображений. Запустите генерацию, чтобы
            добавить результат.
          </p>
        </div>
      ) : (
        <div
          className="flex h-full"
          style={{
            width: `${n * 100}%`,
            transform: `translate3d(calc(${(-currentIndex * 100) / n}% + ${dragX}px), 0, 0)`,
            transition: animate ? "transform 260ms cubic-bezier(.22,1,.36,1)" : "none",
          }}
        >
          {images.map((img, i) => {
            const isCurrent = i === currentIndex;
            return (
              <div
                key={img.id}
                className="h-full flex-none flex items-center justify-center"
                style={{ width: `${100 / n}%` }}
              >
                { }
                <img
                  src={img.src}
                  alt={img.name}
                  draggable={false}
                  className="max-h-full max-w-full object-contain select-none pointer-events-none"
                  style={
                    isCurrent
                      ? {
                          transform: `translate3d(${tf.tx}px, ${tf.ty}px, 0) scale(${tf.zoom})`,
                          transition: animate
                            ? "transform 260ms cubic-bezier(.22,1,.36,1)"
                            : "none",
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {/* тонкая индикация позиции (исчезает вместе с UI — см. TopBar/BottomBar) */}
    </div>
  );
}
