import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PT_LABEL, type Corridor } from '../data';
import { ACTOR, BACK_COST, LAST_Q, LEAN_COST, QUARTER_SHORT, canBack, canLean, labelOf, metaFor, powertrainOf, showChance, type Campaign, type EventKey } from '../campaign';
import { Icon, StateBadge } from './bits';
import { impactOf } from './Sidebar';

/** Click a building on the map: act on it right there. */
export function ActionCard({
  at,
  g,
  world,
  onBack,
  onLean,
  onDesk,
  onClose,
}: {
  at: { key: EventKey; x: number; y: number };
  g: Campaign;
  world: Corridor[];
  onBack: (k: EventKey) => void;
  onLean: (k: EventKey) => void;
  onDesk: (k: EventKey) => void;
  onClose: () => void;
}) {
  const { key } = at;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: at.x + 14, y: at.y + 14 });
  const [done, setDone] = useState<null | 'back' | 'lean'>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x = at.x + 14;
    let y = at.y - el.offsetHeight / 2;
    if (x + el.offsetWidth > window.innerWidth - 12) x = at.x - el.offsetWidth - 14;
    y = Math.min(window.innerHeight - el.offsetHeight - 12, Math.max(12, y));
    setPos({ x, y });
  }, [at.x, at.y, key]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = window.setTimeout(() => window.addEventListener('pointerdown', onDown), 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  const c = world.find((w) => key.startsWith(w.id + '/'))!;
  const state = g.states[key];
  const m = metaFor(key);
  const mine = m.who === 'you';
  const pend = !!g.pending[key];
  const check = mine ? canBack(g, key) : canLean(g, key);
  const due = g.due[key];
  const dated = due !== undefined && due <= LAST_Q;
  const pt = powertrainOf(key);
  const impact = impactOf(c, key, state);
  const chance = Math.round(showChance(g, key) * 100);

  const act = () => {
    if (!check.ok) return;
    if (mine) onBack(key);
    else onLean(key);
    setDone(mine ? 'back' : 'lean');
  };

  return (
    <div ref={ref} className="acard" style={{ left: pos.x, top: pos.y }} role="dialog" aria-label={labelOf(key)}>
      <div className="acard-top">
        <span className={`pt-chip pt-${pt ?? (key.endsWith('grid') ? 'grid' : 'biodiesel')}`}>{pt ? PT_LABEL[pt] : key.endsWith('grid') ? 'Grid' : 'Biodiesel'}</span>
        <StateBadge state={state} />
        <button className="acard-x" onClick={onClose} aria-label="Close">
          {Icon.close}
        </button>
      </div>
      <b className="acard-title">{labelOf(key)}</b>
      <span className="acard-sub">
        {c.name} · {mine ? 'your factory' : ACTOR[m.who].name}
        {!mine && state !== 'in motion' && (dated ? ` · ${QUARTER_SHORT[due!]}` : ' · no date')}
      </span>

      {state === 'in motion' ? (
        <p className="acard-note">Happening. It counts in full.</p>
      ) : pend || done === 'back' ? (
        <p className="acard-done">Crane on site. It lands next quarter.</p>
      ) : (
        <>
          {impact && <span className="acard-impact">{impact}</span>}
          {!mine && dated && (
            <div className="acard-odds">
              <span>
                <i style={{ width: `${chance}%` }} />
              </span>
              <b>{chance}%</b> it shows
            </div>
          )}
          {done === 'lean' && <p className="acard-done">Leaned. The odds moved.</p>}
          <button className={`acard-act ${mine ? 'is-back' : 'is-lean'}`} disabled={!check.ok} onClick={act} autoFocus>
            <span>{mine ? 'Back it' : 'Lean on it'}</span>
            <small>{mine ? BACK_COST[state] : LEAN_COST} cash · 1 action</small>
          </button>
          {!check.ok && <p className="acard-why">{check.why}</p>}
        </>
      )}
      <button className="link-btn small acard-desk" onClick={() => onDesk(key)}>
        Open at the desk {Icon.arrow}
      </button>
    </div>
  );
}
