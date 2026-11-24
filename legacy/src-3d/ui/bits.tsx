import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { EventState, Powertrain } from '../data';
import { TARGET } from '../data';
import { TERMS, type Term } from './copy';

export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
export const fmtCash = (n: number) => {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return '0';
  return `${r > 0 ? '+' : '−'}${fmtNum(Math.abs(r))}`;
};
export const fmtMoney = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return `${r < 0 ? '−' : ''}${fmtNum(Math.abs(r))}`;
};
/** Never show the target number for a value that missed it. */
export const fmtIntensity = (n: number, target = TARGET) => {
  const r = Math.round(n);
  return r === target && n > target ? n.toFixed(1) : String(r);
};

/* ───────── Explainer chip ───────── */

export function Info({ term, children, inline }: { term: Term; children?: ReactNode; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean }>({ x: 0, y: 0, up: false });
  const t = TERMS[term];
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const up = r.bottom + 170 > window.innerHeight;
    setPos({ x: Math.min(Math.max(12, r.left + r.width / 2 - 140), window.innerWidth - 292), y: up ? r.top - 8 : r.bottom + 8, up });
  }, [open]);
  return (
    <span
      ref={ref}
      className={`info ${inline ? 'info-inline' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`What is ${t.title}?`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children ?? <span className="info-dot">i</span>}
      {open &&
        createPortal(
          <span className={`pop ${pos.up ? 'pop-up' : ''}`} style={{ left: pos.x, top: pos.y }} role="tooltip">
            <b>{t.title}</b>
            {t.body}
          </span>,
          document.body,
        )}
    </span>
  );
}

/* ───────── Chain pips ───────── */

export function Pips({ states, pt, pending }: { states: EventState[]; pt: Powertrain; pending?: boolean[] }) {
  return (
    <span className={`pips pips-${pt}`} aria-hidden>
      {states.map((s, i) => (
        <i key={i} className={`pip pip-${s.replace(' ', '-')} ${pending?.[i] ? 'pip-pending' : ''}`} />
      ))}
    </span>
  );
}

export function StateBadge({ state }: { state: EventState }) {
  return <span className={`badge badge-${state.replace(' ', '-')}`}>{state}</span>;
}

/* ───────── Stepper ───────── */

export function Stepper(props: { label: string; value: number; locked: boolean; atCap: boolean; onStep: (d: number) => void }) {
  const { label, value, locked, atCap, onStep } = props;
  return (
    <div className={`stepper ${locked ? 'is-locked' : ''}`} role="group" aria-label={label}>
      <button type="button" className="step" onClick={(e) => onStep(e.shiftKey ? -5 : -1)} disabled={locked || value === 0} aria-label="Remove one slot (shift: five)">
        −
      </button>
      <output className="step-count" key={value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={`step ${atCap ? 'at-cap' : ''}`}
        onClick={(e) => onStep(e.shiftKey ? 5 : 1)}
        disabled={locked}
        aria-disabled={atCap || locked}
        aria-label="Add one slot (shift: five)"
      >
        +
      </button>
    </div>
  );
}

/* ───────── Count up ───────── */

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const ms = 700;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(k === 1 ? value : Math.round(value * eased * 10) / 10);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

/* ───────── Keyboard hint ───────── */

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/* ───────── Icons (inline, 16px, currentColor) ───────── */

export const Icon = {
  globe: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 11.5 8 14l6-2.5M2 8l6 2.5L14 8M8 2 2 4.5 8 7l6-2.5L8 2Z" strokeLinejoin="round" />
    </svg>
  ),
  factory: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M1.5 14V7l4 2.5V7l4 2.5V4h3v10h-11Z" strokeLinejoin="round" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 2h6l6 6-6 6-6-6V2Z" strokeLinejoin="round" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.4" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r=".7" fill="currentColor" stroke="none" />
    </svg>
  ),
  locate: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="4.5" />
      <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" strokeLinecap="round" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sound: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5V6Z" strokeLinejoin="round" />
      <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8" strokeLinecap="round" />
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5V6Z" strokeLinejoin="round" />
      <path d="m11 6 4 4M15 6l-4 4" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  ),
};
