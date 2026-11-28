"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MenuViewerPhoto {
  src: string;
  title: string;
  subtitle: string;
}

interface MenuPhotoViewerProps {
  photos: MenuViewerPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

/**
 * Full-screen pinch-zoom & pan lightbox for chapter photography plates,
 * inspired by the interactive 3D digital menu reference.
 */
export function MenuPhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: MenuPhotoViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const dragOrigin = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const photo = photos[index];

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback(
    (factor: number, originX = 0, originY = 0) => {
      setScale((prev) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
        if (next === prev) return prev;
        setOffset((current) => ({
          x: originX - ((originX - current.x) * next) / prev,
          y: originY - ((originY - current.y) * next) / prev,
        }));
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      reset();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [reset]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
      if (event.key === "ArrowLeft")
        onIndexChange((index - 1 + photos.length) % photos.length);
      if (event.key === "+" || event.key === "=") zoomBy(1.3);
      if (event.key === "-") zoomBy(1 / 1.3);
      if (event.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndexChange, zoomBy, reset]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12, x, y);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  useEffect(() => {
    reset();
  }, [index, reset]);

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
      };
      dragOrigin.current = null;
      return;
    }

    dragOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, (pinch.current.scale * distance) / pinch.current.distance),
      );
      setScale(next);
      return;
    }

    if (dragOrigin.current && scale > 1) {
      setOffset({
        x: dragOrigin.current.ox + (event.clientX - dragOrigin.current.x),
        y: dragOrigin.current.oy + (event.clientY - dragOrigin.current.y),
      });
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) dragOrigin.current = null;
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (rootRef.current) {
        await rootRef.current.requestFullscreen();
      }
    } catch {
      /* fullscreen unavailable */
    }
  };

  if (!mounted || !photo) return null;

  return createPortal(
    <div
      ref={rootRef}
      className="bmv-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Photograph: ${photo.title}`}
    >
      <div className="bmv-top">
        <div className="bmv-meta">
          <p className="bmv-title">{photo.title}</p>
          <p className="bmv-sub">
            {photo.subtitle} · {index + 1} / {photos.length}
          </p>
        </div>

        <div className="bmv-actions">
          <button
            type="button"
            className="bmv-icon-btn"
            onClick={() => zoomBy(1 / 1.35)}
            aria-label="Zoom out"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="bmv-zoom-pct">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="bmv-icon-btn"
            onClick={() => zoomBy(1.35)}
            aria-label="Zoom in"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            className="bmv-icon-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M9 3v6H3M15 21v-6h6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 9V3h6M21 15v6h-6" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="bmv-icon-btn bmv-close"
            onClick={onClose}
            aria-label="Close photograph"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`bmv-stage${scale > 1 ? " is-zoomed" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => (scale > 1 ? reset() : zoomBy(2.2))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.title}
          draggable={false}
          className="bmv-img"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              className="bmv-nav bmv-prev"
              onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
              aria-label="Previous photograph"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              className="bmv-nav bmv-next"
              onClick={() => onIndexChange((index + 1) % photos.length)}
              aria-label="Next photograph"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : null}
      </div>

      <p className="bmv-hint">
        Scroll or pinch to zoom · drag to pan · double-tap to reset
      </p>
    </div>,
    document.body,
  );
}
