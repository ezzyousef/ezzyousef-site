import { useCallback, useEffect, useRef, useState } from 'react';
import Picture, { largest } from './Picture.jsx';

/** True when the visitor asked the system for less motion. Read at call
 *  time, so a change in the setting applies without a reload. */
export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A small pointer-follow tilt on screenshots, figures and project blocks.
 *  Does nothing when the viewer asks for reduced motion. */
export function tilt(max = 5, lift = 4) {
  return {
    onMouseMove: (e) => {
      if (reducedMotion()) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-${lift}px)`;
    },
    onMouseLeave: (e) => { e.currentTarget.style.transform = ''; },
  };
}

/**
 * An image that opens the viewer. It sits inside a real button, so it can be
 * reached with Tab and opened with Enter or Space; the image's caption is the
 * button's name.
 */
export function Zoomable({ item, group, index, onOpen, sizes, className }) {
  if (!item || !item.src) return null;
  return (
    <figure className="tilt" {...tilt(6, 3)}>
      <button type="button" className="zoom" onClick={() => onOpen(group, index)}>
        <Picture className={className} src={item.src} alt={item.cap || 'Image'} sizes={sizes} />
      </button>
      {item.cap && <figcaption aria-hidden="true">{item.cap}</figcaption>}
    </figure>
  );
}

/** State and markup for the full-size image viewer. */
export function useGallery() {
  const [zoom, setZoom] = useState(null);        // { group, index }
  const dialogRef = useRef(null);
  const lastFocus = useRef(null);
  const touch = useRef(null);

  const open = useCallback((group, index) => {
    lastFocus.current = document.activeElement;
    setZoom({ group, index });
  }, []);

  const close = useCallback(() => {
    setZoom(null);
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus();
  }, []);

  const step = useCallback((delta) => {
    setZoom((z) => (z ? { ...z, index: (z.index + delta + z.group.length) % z.group.length } : z));
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (zoom && !d.open) d.showModal();
    if (!zoom && d.open) d.close();
  }, [zoom]);

  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, step]);

  // preload the neighbours so arrowing through feels instant
  useEffect(() => {
    if (!zoom || zoom.group.length < 2) return;
    [1, -1].forEach((d) => {
      const n = zoom.group[(zoom.index + d + zoom.group.length) % zoom.group.length];
      if (n) { const img = new Image(); img.src = largest(n.src); }
    });
  }, [zoom]);

  const current = zoom ? zoom.group[zoom.index] : null;
  const swipe = {
    onTouchStart: (e) => { touch.current = e.changedTouches[0].clientX; },
    onTouchEnd: (e) => {
      if (touch.current == null) return;
      const dx = e.changedTouches[0].clientX - touch.current;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      touch.current = null;
    },
  };

  const dialog = (
    <dialog className="lb" ref={dialogRef} aria-label="Image viewer"
            onClose={close}
            onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
      <div className="lb-box" {...swipe}>
        {current && <img src={largest(current.src)} alt={current.cap || ''} />}
        <div className="lb-bar">
          {zoom && zoom.group.length > 1 && (
            <>
              <button className="lb-nav" type="button" onClick={() => step(-1)} aria-label="Previous image">←</button>
              <span className="lb-count" aria-live="polite">{zoom.index + 1} / {zoom.group.length}</span>
              <button className="lb-nav" type="button" onClick={() => step(1)} aria-label="Next image">→</button>
            </>
          )}
          <span className="lb-cap">{current ? current.cap : ''}</span>
          <button className="lb-close" type="button" onClick={close}>Close</button>
        </div>
      </div>
    </dialog>
  );

  return { open, dialog };
}
