import { useEffect, useRef } from 'react';

const COLORS = ['#c47b2b', '#2f6f6a', '#2c4c7c', '#d99a2b', '#5f9e6e', '#1a1814'];

/** A one-shot paper burst. Re-fires whenever `fire` changes to a new truthy value. */
export function Confetti({ fire, amount = 140 }: { fire: number; amount?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = ref.current;
    const cx = cv?.getContext('2d');
    if (!cv || !cx) return;
    const dpr = Math.min(2, window.devicePixelRatio);
    cv.width = window.innerWidth * dpr;
    cv.height = window.innerHeight * dpr;
    cx.scale(dpr, dpr);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const bits = Array.from({ length: amount }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = 9 + Math.random() * 10;
      return {
        x: W / 2 + (Math.random() - 0.5) * 160,
        y: H * 0.62,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        w: 5 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      };
    });
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = (now - start) / 1000;
      cx.clearRect(0, 0, W, H);
      for (const b of bits) {
        b.vy += 0.38;
        b.vx *= 0.985;
        b.vy *= 0.985;
        b.x += b.vx;
        b.y += b.vy;
        b.r += b.vr;
        cx.save();
        cx.globalAlpha = Math.max(0, 1 - k / 2.6);
        cx.translate(b.x, b.y);
        cx.rotate(b.r);
        cx.fillStyle = b.c;
        cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
        cx.restore();
      }
      if (k < 2.8) raf = requestAnimationFrame(tick);
      else cx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire, amount]);
  return <canvas ref={ref} className="confetti" aria-hidden />;
}
