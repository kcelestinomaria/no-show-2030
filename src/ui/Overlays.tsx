import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CORRIDORS, POWERTRAINS, PT_LABEL, type Corridor, type CorridorId } from '../data';
import { canRun, chainFor } from '../engine';
import {
  ACTOR,
  BACK_COST,
  LAST_Q,
  LEAN_COST,
  QUARTER_SHORT,
  TARGETS,
  corridorOf,
  finalOf,
  labelOf,
  metaFor,
  powertrainOf,
  quarterLabel,
  showChance,
  type Campaign,
  type QuarterRecord,
} from '../campaign';
import type { Hover } from '../three/World';
import type { LaneMood } from '../App';
import { Icon, Pips, StateBadge, fmtCash, fmtIntensity, fmtMoney } from './bits';
import { CarbonScale, TrendChart } from './Sidebar';
import { LIMIT_LINE, THESIS } from './copy';

/* ───────────────────────── Tooltip ───────────────────────── */

export function Tooltip({ hover, g, world, moods }: { hover: Hover; g: Campaign; world: Corridor[]; moods: Record<CorridorId, LaneMood> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: hover.x + 16, y: hover.y + 16 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = hover.x + 18;
    let y = hover.y + 18;
    if (x + w > window.innerWidth - 12) x = hover.x - w - 18;
    if (y + h > window.innerHeight - 12) y = hover.y - h - 18;
    setPos({ x, y });
  }, [hover.x, hover.y, hover.kind]);

  let body: ReactNode = null;
  if (hover.kind === 'event') {
    const key = hover.key;
    const c = world.find((x) => x.id === corridorOf(key).id)!;
    const pt = powertrainOf(key);
    const state = g.states[key];
    const m = metaFor(key);
    const due = g.due[key];
    const pend = g.pending[key];
    body = (
      <>
        <div className="tt-top">
          <span className={`pt-chip pt-${pt ?? (key.endsWith('grid') ? 'grid' : 'biodiesel')}`}>{pt ? PT_LABEL[pt] : key.endsWith('grid') ? 'Grid' : 'Biodiesel'}</span>
          <StateBadge state={state} />
        </div>
        <b className="tt-title">{labelOf(key)}</b>
        <span className="tt-sub">{c.name}</span>
        <p className="tt-line">
          {state === 'in motion'
            ? 'Happening. Counts in full.'
            : state === 'adjacent'
              ? 'Half there: a pilot, a signature pending. Counts ½.'
              : 'A date on a slide. Counts nothing yet.'}
        </p>
        <p className="tt-who">
          <i className={m.who === 'you' ? 'who-you' : 'who-out'} />
          {m.who === 'you' ? (
            pend ? (
              'You backed it. Lands next quarter.'
            ) : state === 'in motion' ? (
              'Yours. Done.'
            ) : (
              <>
                Yours to build · back for {BACK_COST[state]}
              </>
            )
          ) : (
            <>
              {ACTOR[m.who].name}
              {state !== 'in motion' && due !== undefined && due <= LAST_Q && (
                <>
                  {' '}
                  · says {QUARTER_SHORT[due]} · {Math.round(showChance(g, key) * 100)}% · lean for {LEAN_COST}
                </>
              )}
            </>
          )}
        </p>
        {state !== 'in motion' && <span className="tt-hint">Click to act on it</span>}
      </>
    );
  } else if (hover.kind === 'lane') {
    const c = world.find((x) => x.id === hover.id)!;
    const mood = moods[c.id];
    body = (
      <>
        <span className="tt-sub">
          {String(CORRIDORS.findIndex((x) => x.id === c.id) + 1).padStart(2, '0')} · {c.region} · {c.km.toLocaleString('en-GB')} km
        </span>
        <b className="tt-title">{c.name}</b>
        <span className="tt-sub">{c.points} contract points</span>
        <ul className="tt-rows">
          {POWERTRAINS.map((pt) => (
            <li key={pt}>
              <span className={`pt-chip pt-${pt}`}>{PT_LABEL[pt]}</span>
              <Pips states={c.chains[pt].map((e) => e.state)} pt={pt} />
              <b className={canRun(c, pt) ? 'ok' : 'bad'}>{canRun(c, pt) ? 'runs' : chainFor(c, pt).open ? 'no grid' : 'closed'}</b>
              <span className="tt-n">{g.commit[c.id][pt]}</span>
            </li>
          ))}
        </ul>
        <p className={`tt-mood mood-${mood.mood}`}>
          <i className="mood-dia" />
          {mood.msg}
        </p>
        <span className="tt-hint">Click to focus this lane</span>
      </>
    );
  } else if (hover.kind === 'truck') {
    const c = CORRIDORS.find((x) => x.id === hover.id)!;
    const word =
      hover.status === 'running'
        ? 'On the road. Won work.'
        : hover.status === 'idle'
          ? 'Built, not bought. Sitting in the yard.'
          : hover.status === 'stranded'
            ? 'Stranded. Its chain was closed, so it could not run at all.'
            : 'In the yard, waiting for the quarter.';
    body = (
      <>
        <div className="tt-top">
          <span className={`pt-chip pt-${hover.pt}`}>{PT_LABEL[hover.pt]}</span>
        </div>
        <b className="tt-title">Truck for {c.name}</b>
        <p className="tt-line">{word}</p>
      </>
    );
  } else if (hover.kind === 'factory') {
    body = (
      <>
        <b className="tt-title">Your factory</b>
        <p className="tt-line">40 slots a quarter. Every committed slot is a truck in the yard. Click to look closer.</p>
      </>
    );
  }

  return (
    <div className="tt" ref={ref} style={{ left: pos.x, top: pos.y }} role="tooltip">
      {body}
    </div>
  );
}

/* ───────────────────────── Modal shell ───────────────────────── */

function Modal({ children, onClose, wide, label }: { children: ReactNode; onClose?: () => void; wide?: boolean; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => prev?.focus?.();
  }, []);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {onClose && (
          <button className="modal-x" onClick={onClose} aria-label="Close">
            {Icon.close}
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── Report ───────────────────────── */

export function ReportModal({ rec, g, onClose, onNext, onDesk }: { rec: QuarterRecord; g: Campaign; onClose: () => void; onNext: () => void; onDesk: () => void }) {
  const r = rec.result;
  const last = g.q >= LAST_Q;
  return (
    <Modal onClose={onClose} wide label={`${quarterLabel(rec.q)} report`}>
      <div className="report">
        <header className="rp-head">
          <span className="eyebrow">{quarterLabel(rec.q)} · the book</span>
          <h2 className="rp-verdict">{r.verdict}</h2>
          <p className="limit">{LIMIT_LINE}</p>
        </header>

        <div className="rp-kpis">
          <div className="kpi">
            <span className="eyebrow">Quarter cash</span>
            <b className={rec.net < 0 ? 'neg' : ''}>{fmtCash(rec.net)}</b>
            <span className="kpi-sub">Old deck {fmtCash(rec.deckNet)}</span>
          </div>
          <div className="kpi">
            <span className="eyebrow">CO₂e / km, ran</span>
            <b className={r.intensity !== null && r.intensity <= rec.target ? 'ok' : 'neg'}>{r.intensity === null ? '—' : fmtIntensity(r.intensity, rec.target)}</b>
            <span className="kpi-sub">Target {rec.target}{rec.fine > 0 ? ` · fine ${fmtMoney(rec.fine)}` : ''}</span>
          </div>
          <div className="kpi">
            <span className="eyebrow">Contracts kept</span>
            <b>{Math.round(r.contractsKept * 100)}%</b>
            <span className="kpi-sub">
              {r.pointsWon} of {r.pointsAvailable} points
            </span>
          </div>
          <div className="kpi">
            <span className="eyebrow">Left in the yard</span>
            <b className={r.idle ? 'neg' : ''}>{r.idle}</b>
            <span className="kpi-sub">{r.stranded ? `${r.stranded} stranded` : 'none stranded'}</span>
          </div>
        </div>

        <div className="rp-grid">
          <CarbonScale rec={rec} />
          <table className="rp-lanes">
            <thead>
              <tr>
                <th>Lane</th>
                {POWERTRAINS.map((pt) => (
                  <th key={pt} className={`th-${pt}`}>
                    {PT_LABEL[pt]}
                  </th>
                ))}
                <th>Won</th>
              </tr>
            </thead>
            <tbody>
              {CORRIDORS.map((c) => {
                const cr = r.corridors[c.id];
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    {POWERTRAINS.map((pt) => {
                      const l = cr.lines[pt];
                      return (
                        <td key={pt}>
                          {l.slots === 0 ? (
                            <span className="dim">·</span>
                          ) : (
                            <>
                              {l.won > 0 && <span className="ok">{l.won}</span>}
                              {l.idle > 0 && <span className={l.stranded ? 'strand' : 'neg'}> {l.stranded ? `${l.idle}✕` : `${l.idle} idle`}</span>}
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      {cr.pointsWon}/{c.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="rp-foot">
          <button className="btn-ghost" onClick={onClose}>
            Walk the lanes
          </button>
          {!last && (
            <button className="btn-ghost" onClick={onDesk}>
              Look at the desk
            </button>
          )}
          <button className="cta cta-inline" onClick={onNext} data-autofocus>
            <span>{last ? 'Close the year' : `Open ${quarterLabel(g.q + 1)}`}</span>
            {Icon.arrow}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

/* ───────────────────────── News ───────────────────────── */

export function NewsModal({ g, onClose, onDesk }: { g: Campaign; onClose: () => void; onDesk: () => void }) {
  const landed = g.news.filter((n) => n.kind === 'landed');
  const showed = g.news.filter((n) => n.kind === 'showed');
  const missed = g.news.filter((n) => n.kind === 'no-show');
  const prev = TARGETS[g.q - 1];
  const order = [...landed, ...showed, ...missed].map((n) => n.key);
  const Item = ({ k, children }: { k: string; children: ReactNode }) => {
    const c = corridorOf(k);
    return (
      <li style={{ '--i': order.indexOf(k) } as React.CSSProperties}>
        <span className="nw-lane">{c.name}</span>
        <b>{labelOf(k)}</b>
        {children}
      </li>
    );
  };
  return (
    <Modal onClose={onClose} label={`${quarterLabel(g.q)} news`}>
      <div className="news">
        <header>
          <span className="eyebrow">The morning paper</span>
          <h2>{quarterLabel(g.q)}</h2>
          <p className="news-sub">
            The target tightens from {prev} to <b>{TARGETS[g.q]}</b>. {missed.length === 0 && showed.length + landed.length === 0 ? 'Nothing on the slides was due.' : ''}
          </p>
        </header>
        {landed.length > 0 && (
          <section>
            <h3 className="nw-h nw-landed">You built it</h3>
            <ul>
              {landed.map((n) => (
                <Item key={n.key} k={n.key}>
                  <span className="nw-move">
                    <StateBadge state={n.from} /> → <StateBadge state={n.to} />
                  </span>
                </Item>
              ))}
            </ul>
          </section>
        )}
        {showed.length > 0 && (
          <section>
            <h3 className="nw-h nw-showed">It showed</h3>
            <ul>
              {showed.map((n) => (
                <Item key={n.key} k={n.key}>
                  <span className="nw-move">
                    {ACTOR[metaFor(n.key).who].name} · <StateBadge state={n.from} /> → <StateBadge state={n.to} />
                  </span>
                </Item>
              ))}
            </ul>
          </section>
        )}
        {missed.length > 0 && (
          <section>
            <h3 className="nw-h nw-missed">No show</h3>
            <ul>
              {missed.map((n) => (
                <Item key={n.key} k={n.key}>
                  <span className="nw-move">
                    {ACTOR[metaFor(n.key).who].name} · new date {n.slipTo !== undefined && n.slipTo <= LAST_Q ? QUARTER_SHORT[n.slipTo] : 'after the year'}
                  </span>
                </Item>
              ))}
            </ul>
          </section>
        )}
        <p className="news-thesis">A date is not a future. An event is.</p>
        <footer className="rp-foot">
          <button className="btn-ghost" onClick={onDesk}>
            Open the desk
          </button>
          <button className="cta cta-inline" onClick={onClose} data-autofocus>
            <span>To the plan</span>
            {Icon.arrow}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

/* ───────────────────────── Final ───────────────────────── */

export function FinalModal({ g, onClose, onReplay, onNewWorld }: { g: Campaign; onClose: () => void; onReplay: () => void; onNewWorld: () => void }) {
  const f = finalOf(g);
  const stars = [
    { on: f.stars.carbon, label: 'Carbon', sub: f.lastMet ? `Met ${TARGETS[LAST_Q]} in ${QUARTER_SHORT[LAST_Q]}` : `Missed ${TARGETS[LAST_Q]} in ${QUARTER_SHORT[LAST_Q]}` },
    { on: f.stars.contracts, label: 'Contracts', sub: `${Math.round(f.avgKept * 100)}% kept on average` },
    { on: f.stars.book, label: 'Book', sub: `${fmtMoney(f.you)} vs old deck ${fmtMoney(f.deck)}` },
  ];
  return (
    <Modal onClose={onClose} wide label="The year">
      <div className="final">
        <span className="eyebrow">
          {QUARTER_SHORT[0]} – {QUARTER_SHORT[LAST_Q]} · World #{g.seed}
        </span>
        <h2 className="final-title">{f.title}</h2>
        <div className="final-stars">
          {stars.map((s, i) => (
            <div key={s.label} className={`fs ${s.on ? 'is-on' : ''}`} style={{ animationDelay: `${200 + i * 220}ms` }}>
              <span className="fs-star">★</span>
              <b>{s.label}</b>
              <span>{s.sub}</span>
            </div>
          ))}
        </div>
        <TrendChart g={g} />
        <p className="final-thesis">{THESIS}</p>
        <footer className="rp-foot">
          <button className="btn-ghost" onClick={onNewWorld}>
            New world
          </button>
          <button className="cta cta-inline" onClick={onReplay} data-autofocus>
            <span>Replay this world</span>
            {Icon.arrow}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
