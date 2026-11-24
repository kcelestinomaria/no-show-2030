import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  CORRIDORS,
  EVENT_VALUE,
  OPEN_THRESHOLD,
  POWERTRAINS,
  PT_LABEL,
  SLOT_CAP,
  type Corridor,
  type CorridorId,
  type EventState,
  type Powertrain,
} from '../data';
import { chainFor, oldDeckCommit, sameCommit, type Commit, type Result } from '../engine';
import {
  ACTOR,
  BACK_COST,
  DESK_ACTIONS,
  LAST_Q,
  LEAN_COST,
  QUARTER_SHORT,
  TARGETS,
  canBack,
  canLean,
  chainKey,
  labelOf,
  linked,
  metaFor,
  nextState,
  powertrainOf,
  quarterLabel,
  showChance,
  sideKey,
  type Campaign,
  type EventKey,
  type QuarterRecord,
} from '../campaign';
import type { LaneMood } from '../App';
import { CountUp, Icon, Info, Pips, StateBadge, Stepper, fmtCash, fmtIntensity, fmtMoney, fmtNum } from './bits';
import { LIMIT_LINE, TERMS, THESIS, type Term } from './copy';

export type Tab = 'plan' | 'desk' | 'book' | 'guide';

interface Props {
  g: Campaign;
  world: Corridor[];
  moods: Record<CorridorId, LaneMood>;
  used: number;
  paper: number | null;
  live: QuarterRecord | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  selected: CorridorId | null;
  select: (id: CorridorId | null) => void;
  step: (id: CorridorId, pt: Powertrain, d: number) => void;
  setCommit: (c: Commit) => void;
  loadOldDeck: () => void;
  clear: () => void;
  run: () => void;
  advance: () => void;
  openReport: () => void;
  openFinal: () => void;
  back: (k: EventKey) => void;
  lean: (k: EventKey) => void;
  locate: (k: EventKey) => void;
  hoverEvent: (k: EventKey | null) => void;
  flashKey: EventKey | null;
  clearFlash: () => void;
  replayTour: () => void;
  restart: (seed?: number) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'desk', label: 'Desk' },
  { id: 'book', label: 'Book' },
  { id: 'guide', label: 'Guide' },
];

export const Sidebar = forwardRef<HTMLElement, Props>(function Sidebar(p, ref) {
  const { g, tab, setTab } = p;
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab]);
  const levers = useMemo(() => countLevers(p.g), [p.g]);

  return (
    <aside className="side" ref={ref} aria-label="Controls">
      <div className="side-head">
        <div className="side-q">
          <span className="eyebrow">Quarter {g.q + 1} of 4</span>
          <h2>{quarterLabel(g.q)}</h2>
        </div>
        <div className="side-target">
          <span className="eyebrow">
            Target <Info term="target" />
          </span>
          <b>
            ≤ {TARGETS[g.q]}
            <small> CO₂e/km</small>
          </b>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => setTab(t.id)}
            data-tour={`tab-${t.id}`}
          >
            {t.label}
            {t.id === 'desk' && g.phase === 'plan' && g.actionsLeft > 0 && levers > 0 && <i className="tab-dot">{g.actionsLeft}</i>}
            {t.id === 'book' && p.live && <i className="tab-dot tab-dot-ink">●</i>}
          </button>
        ))}
      </div>

      <div className="side-body" ref={bodyRef}>
        {tab === 'plan' && <PlanTab {...p} />}
        {tab === 'desk' && <DeskTab {...p} />}
        {tab === 'book' && <BookTab {...p} />}
        {tab === 'guide' && <GuideTab {...p} />}
      </div>

      <Footer {...p} />
    </aside>
  );
});

function countLevers(g: Campaign) {
  let n = 0;
  for (const k of Object.keys(g.states)) if (canBack(g, k).ok || canLean(g, k).ok) n++;
  return n;
}

/* ───────────────────────── Footer CTA ───────────────────────── */

function Footer(p: Props) {
  const { g } = p;
  if (g.phase === 'plan') {
    const pend = Object.keys(g.pending).length;
    return (
      <div className="side-foot">
        {pend > 0 && (
          <div className="foot-meta">
            <span>
              {pend} event{pend > 1 ? 's' : ''} underway
            </span>
          </div>
        )}
        <button className="cta" onClick={p.run} data-tour="run">
          <span>Run {quarterLabel(g.q)}</span>
          <span className="cta-key">R</span>
          {Icon.arrow}
        </button>
      </div>
    );
  }
  if (g.phase === 'running')
    return (
      <div className="side-foot">
        <button className="cta is-busy" disabled>
          <span>The quarter is running…</span>
          <span className="spinner" aria-hidden />
        </button>
      </div>
    );
  if (g.phase === 'report')
    return (
      <div className="side-foot foot-split">
        <button className="btn-ghost" onClick={p.openReport}>
          Report
        </button>
        <button className="cta" onClick={p.advance}>
          <span>{g.q >= LAST_Q ? 'Close the year' : `Open ${quarterLabel(g.q + 1)}`}</span>
          <span className="cta-key">N</span>
          {Icon.arrow}
        </button>
      </div>
    );
  return (
    <div className="side-foot foot-split">
      <button className="btn-ghost" onClick={() => p.restart()}>
        Replay world
      </button>
      <button className="cta" onClick={p.openFinal}>
        <span>The year in one page</span>
        {Icon.arrow}
      </button>
    </div>
  );
}

/* ───────────────────────── Plan ───────────────────────── */

function PlanTab(p: Props) {
  const { g, world, used, selected } = p;
  const locked = g.phase !== 'plan';
  const isOldDeck = used > 0 && sameCommit(g.commit, oldDeckCommit());
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    if (selected) cardRefs.current[selected]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);

  return (
    <div className="plan" data-tour="plan">
      <section className="yard">
        <div className="yard-head">
          <span className="eyebrow">
            Factory yard <Info term="slot" />
          </span>
          <span className={`yard-left ${SLOT_CAP - used === 0 ? 'is-cap' : ''}`}>
            {SLOT_CAP - used === 0 ? 'At the cap' : `${SLOT_CAP - used} spare`}
          </span>
        </div>
        <SlotStrip commit={g.commit} result={p.live?.result ?? null} />
        <div className="yard-actions">
          <button className="chip-btn" onClick={p.loadOldDeck} disabled={locked}>
            Load the old deck
          </button>
          <Info term="oldDeck" />
          <span className="grow" />
          <button className="chip-btn chip-quiet" onClick={p.clear} disabled={locked || used === 0}>
            Clear
          </button>
        </div>
        {isOldDeck && <p className="deck-note">Year scenario, 2030 electric. Run it once. Then beat it.</p>}
      </section>

      {world.map((c, i) => (
        <LaneCard
          key={c.id}
          ref={(el) => (cardRefs.current[c.id] = el)}
          c={c}
          index={i}
          slots={g.commit[c.id]}
          mood={p.moods[c.id]}
          open={selected === c.id}
          locked={locked}
          atCap={used >= SLOT_CAP}
          result={p.live?.result.corridors[c.id] ?? null}
          pending={g.pending}
          onSelect={() => p.select(selected === c.id ? null : c.id)}
          onStep={(pt, d) => p.step(c.id, pt, d)}
          onLocate={p.locate}
          toDesk={() => p.setTab('desk')}
        />
      ))}

    </div>
  );
}

const LaneCard = forwardRef<
  HTMLElement,
  {
    c: Corridor;
    index: number;
    slots: Record<Powertrain, number>;
    mood: LaneMood;
    open: boolean;
    locked: boolean;
    atCap: boolean;
    result: Result['corridors'][CorridorId] | null;
    pending: Record<EventKey, true>;
    onSelect: () => void;
    onStep: (pt: Powertrain, d: number) => void;
    onLocate: (k: EventKey) => void;
    toDesk: () => void;
  }
>(function LaneCard(props, ref) {
  const { c, index, slots, mood, open, locked, atCap, result, pending, onSelect, onStep, onLocate } = props;
  const total = POWERTRAINS.reduce((a, pt) => a + slots[pt], 0);
  return (
    <article ref={ref} className={`lane ${open ? 'is-open' : ''} mood-${mood.mood}`}>
      <button className="lane-head" onClick={onSelect} aria-expanded={open}>
        <span className="lane-idx">{String(index + 1).padStart(2, '0')}</span>
        <span className="lane-title">
          <b>{c.name}</b>
        </span>
        <span className="lane-pts">
          <b>{c.points}</b>
          <span>pts</span>
        </span>
        <i className="lane-mood" aria-hidden />
      </button>

      <div className="rows">
        {POWERTRAINS.map((pt) => {
          const ch = chainFor(c, pt);
          const line = result?.lines[pt];
          const runnable = ch.open && (pt !== 'electric' || c.grid === 'in motion');
          return (
            <div key={pt} className={`row row-${pt} ${!runnable && slots[pt] === 0 && !line ? 'is-quiet' : ''}`}>
              <i className="sw" aria-hidden />
              <span className="row-name">{PT_LABEL[pt]}</span>
              <Info term="open" inline>
                <span className={`row-chain ${runnable ? 'is-open' : 'is-closed'}`}>
                  <Pips states={c.chains[pt].map((e) => e.state)} pt={pt} pending={c.chains[pt].map((_, i) => !!pending[chainKey(c.id, pt, i)])} />
                  <b>{runnable ? '' : pt === 'electric' && ch.open ? 'no grid' : 'closed'}</b>
                </span>
              </Info>
              {line ? (
                <span className="row-out">
                  {line.won > 0 && <span className="ran">ran {line.won}</span>}
                  {line.idle > 0 && <span className={`idle ${line.stranded ? 'is-stranded' : ''}`}>{line.stranded ? 'stranded' : 'idle'} {line.idle}</span>}
                  {line.slots === 0 && <span className="none">—</span>}
                </span>
              ) : (
                <Stepper label={`${PT_LABEL[pt]} slots on ${c.name}`} value={slots[pt]} locked={locked} atCap={atCap} onStep={(d) => onStep(pt, d)} />
              )}
            </div>
          );
        })}
      </div>

      {(result || (total > 0 && mood.mood !== 'good')) && (
        <p className="lane-mood-msg">
          <Info term="mood" inline>
            <i className="mood-dia" aria-hidden />
          </Info>
          {result ? `${result.pointsWon} of ${c.points} points won.` : mood.msg}
        </p>
      )}

      {open && (
        <div className="lane-detail">
          <p className="lane-facts">
            {c.km.toLocaleString('en-GB')} km · {c.region}
          </p>
          <p className="lane-note">“{c.note}”</p>
          {POWERTRAINS.map((pt) => {
            const ch = chainFor(c, pt);
            return (
              <div key={pt} className={`chain chain-${pt}`}>
                <div className="chain-head">
                  <span>
                    {PT_LABEL[pt]} · <Info term="depth" inline>{c.depth[pt]}</Info>
                  </span>
                  <span className={ch.open ? 'is-open' : 'is-closed'}>
                    {fmtNum(ch.sum)}/{ch.n} · {ch.open ? 'open' : `needs ${fmtNum(Math.max(0, OPEN_THRESHOLD * ch.n - ch.sum))} more`}
                  </span>
                </div>
                <ul>
                  {c.chains[pt].map((e, i) => {
                    const key = chainKey(c.id, pt, i);
                    return (
                      <li key={key} className={`ev ev-${e.state.replace(' ', '-')}`}>
                        <StateBadge state={e.state} />
                        <span className="ev-label">{e.label}</span>
                        {pending[key] && <span className="ev-pend">underway</span>}
                        <button className="ev-loc" onClick={() => onLocate(key)} aria-label={`Show ${e.label} on the map`}>
                          {Icon.locate}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <div className="sides">
            {(['biodiesel', 'grid'] as const).map((s) => (
              <button key={s} className="side-ev" onClick={() => onLocate(sideKey(c.id, s))}>
                <span>{s === 'grid' ? 'Grid for electric' : 'Biodiesel at the pump'}</span>
                <StateBadge state={c[s]} />
              </button>
            ))}
          </div>
          <button className="link-btn" onClick={props.toDesk}>
            Move events on this lane at the desk {Icon.arrow}
          </button>
        </div>
      )}
    </article>
  );
});

function SlotStrip({ commit, result }: { commit: Commit; result: Result | null }) {
  const cells: { kind: Powertrain | 'spare'; idle: boolean; stranded: boolean }[] = [];
  for (const c of CORRIDORS) {
    for (const pt of POWERTRAINS) {
      const n = commit[c.id][pt];
      const line = result?.corridors[c.id].lines[pt];
      for (let i = 0; i < n; i++) cells.push({ kind: pt, idle: !!line && i >= line.won, stranded: !!line && line.stranded > 0 });
    }
  }
  while (cells.length < SLOT_CAP) cells.push({ kind: 'spare', idle: false, stranded: false });
  return (
    <div className="strip" aria-hidden>
      {cells.map((cell, i) => (
        <span key={i} className={`cell cell-${cell.kind} ${cell.idle ? 'cell-idle' : ''} ${cell.stranded ? 'cell-stranded' : ''}`} />
      ))}
    </div>
  );
}

/* ───────────────────────── Desk ───────────────────────── */

type DeskFilter = 'yours' | 'outside' | 'all';

interface DeskItem {
  key: EventKey;
  keys: EventKey[];
  corridor: Corridor;
  pts: (Powertrain | 'biodiesel' | 'grid')[];
  state: EventState;
}

export function impactOf(c: Corridor, key: EventKey, state: EventState): string | null {
  const pt = powertrainOf(key);
  const to = nextState(state);
  if (!pt) {
    if (key.endsWith('/grid')) {
      return to === 'in motion' && chainFor(c, 'electric').open ? 'Opens electric' : null;
    }
    return to === 'in motion' ? 'Diesel drops to 40' : null;
  }
  const ch = chainFor(c, pt);
  const after = (ch.sum - EVENT_VALUE[state] + EVENT_VALUE[to]) / ch.n;
  const grid = pt !== 'electric' || c.grid === 'in motion';
  if (!ch.open && after >= OPEN_THRESHOLD) return grid ? `Opens ${PT_LABEL[pt].toLowerCase()}` : 'Opens chain, needs grid';
  return null;
}

function DeskTab(p: Props) {
  const { g, world, selected } = p;
  const [filter, setFilter] = useState<DeskFilter>('all');
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!p.flashKey) return;
    const el = itemRefs.current[p.flashKey] ?? itemRefs.current[linked(p.flashKey)[0]];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = window.setTimeout(p.clearFlash, 1800);
    return () => window.clearTimeout(t);
  }, [p.flashKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => {
    const out: DeskItem[] = [];
    const seen = new Set<string>();
    for (const c of world) {
      const keys: EventKey[] = [];
      for (const pt of POWERTRAINS) c.chains[pt].forEach((_, i) => keys.push(chainKey(c.id, pt, i)));
      keys.push(sideKey(c.id, 'biodiesel'), sideKey(c.id, 'grid'));
      for (const key of keys) {
        if (seen.has(key)) continue;
        const state = g.states[key];
        if (state === 'in motion' && !g.pending[key]) continue;
        const group = linked(key);
        group.forEach((k) => seen.add(k));
        out.push({
          key,
          keys: group,
          corridor: c,
          pts: group.map((k) => powertrainOf(k) ?? (k.endsWith('grid') ? 'grid' : 'biodiesel')),
          state,
        });
      }
    }
    return out;
  }, [world, g.states, g.pending]);

  const shown = items.filter((it) => {
    const mine = metaFor(it.key).who === 'you';
    if (filter === 'yours' && !mine) return false;
    if (filter === 'outside' && mine) return false;
    if (selected && it.corridor.id !== selected) return false;
    return true;
  });
  const locked = g.phase !== 'plan';
  const blocker = locked
    ? 'The desk opens again with the next quarter.'
    : g.q >= LAST_Q
      ? 'Last quarter. Nothing you back can land in time.'
      : g.actionsLeft <= 0
        ? 'No actions left this quarter.'
        : null;
  const lane = selected ? CORRIDORS.find((c) => c.id === selected)! : null;

  return (
    <div className="desk" data-tour="desk">
      <section className="desk-head">
        <span className="pips-row big" aria-label={`${g.actionsLeft} of ${DESK_ACTIONS} actions left`}>
          {Array.from({ length: DESK_ACTIONS }, (_, i) => (
            <i key={i} className={i < g.actionsLeft ? 'on' : ''} />
          ))}
        </span>
        <span className="desk-head-txt">
          {g.actionsLeft} action{g.actionsLeft === 1 ? '' : 's'} left <Info term="desk" />
        </span>
        <span className={`desk-cash ${g.cash < 0 ? 'neg' : ''}`}>{fmtMoney(g.cash)} cash</span>
      </section>

      <div className="seg" role="radiogroup" aria-label="Filter events">
        {(
          [
            ['all', 'All'],
            ['yours', 'Your levers'],
            ['outside', 'Outside the room'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="radio" aria-checked={filter === id} className={filter === id ? 'is-on' : ''} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      {lane && (
        <button className="lane-chip" onClick={() => p.select(null)} aria-label={`Showing ${lane.name}. Show all lanes`}>
          {lane.name}
          {Icon.close}
        </button>
      )}
      {blocker && <p className="desk-locked">{blocker}</p>}

      {CORRIDORS.filter((c) => shown.some((s) => s.corridor.id === c.id)).map((c) => (
        <section key={c.id} className="desk-lane">
          {!lane && (
            <h3>
              <span>{String(CORRIDORS.indexOf(c) + 1).padStart(2, '0')}</span> {c.name}
            </h3>
          )}
          {shown
            .filter((s) => s.corridor.id === c.id)
            .map((it) => (
              <DeskRow key={it.key} it={it} p={p} quiet={!!blocker} refFn={(el) => it.keys.forEach((k) => (itemRefs.current[k] = el))} flash={!!p.flashKey && it.keys.includes(p.flashKey)} />
            ))}
        </section>
      ))}
      {shown.length === 0 && <p className="empty">Nothing here is waiting on anyone.</p>}
    </div>
  );
}

function DeskRow({ it, p, quiet, refFn, flash }: { it: DeskItem; p: Props; quiet: boolean; refFn: (el: HTMLElement | null) => void; flash: boolean }) {
  const { g } = p;
  const m = metaFor(it.key);
  const mine = m.who === 'you';
  const pend = !!g.pending[it.key];
  const check = mine ? canBack(g, it.key) : canLean(g, it.key);
  const due = g.due[it.key];
  const dated = due !== undefined && due <= LAST_Q;
  const chance = showChance(g, it.key);
  const leaned = g.lean[it.key] ?? 0;
  const impact = impactOf(it.corridor, it.key, it.state);
  // Reasons shared by every row are said once, above the list.
  const why = !pend && !check.ok && !quiet ? check.why : null;
  const ptName = (pt: DeskItem['pts'][number]) => (pt === 'grid' ? 'Grid' : pt === 'biodiesel' ? 'Biodiesel' : PT_LABEL[pt]);
  return (
    <article
      ref={refFn}
      className={`dr ${mine ? 'dr-mine' : 'dr-out'} ${pend ? 'dr-pend' : ''} ${flash ? 'dr-flash' : ''}`}
      onMouseEnter={() => p.hoverEvent(it.key)}
      onMouseLeave={() => p.hoverEvent(null)}
    >
      <div className="dr-main">
        <b className="dr-label">
          {it.pts.map((pt, i) => (
            <i key={i} className={`pt-dot pt-${pt}`} title={ptName(pt)} aria-label={ptName(pt)} />
          ))}
          {labelOf(it.key)}
        </b>
        <span className="dr-who">
          <StateBadge state={it.state} />
          <span className="dr-who-txt" title={mine ? (m.lever ?? undefined) : undefined}>
            {mine ? 'Your factory' : ACTOR[m.who].name}
            {!mine && (dated ? ` · ${QUARTER_SHORT[due!]}` : ' · no date')}
          </span>
          {!mine && dated && it.state !== 'in motion' && (
            <span className="chance" title={`Chance it shows on its date${leaned ? `, leaned +${Math.round(leaned * 100)}` : ''}`}>
              <i>
                <i style={{ width: `${chance * 100}%` }} />
              </i>
              {Math.round(chance * 100)}%
            </span>
          )}
        </span>
        {impact && <span className="dr-impact">{impact}</span>}
        {why && <span className="dr-why">{why}</span>}
      </div>
      <div className="dr-act">
        {pend ? (
          <span className="dr-pend-tag">Underway</span>
        ) : (
          <button
            className={`act ${mine ? 'act-back' : 'act-lean'}`}
            disabled={!check.ok}
            onClick={() => (mine ? p.back(it.key) : p.lean(it.key))}
            title={check.ok ? undefined : check.why}
          >
            <span>{mine ? 'Back' : 'Lean'}</span>
            <small>{mine ? (it.state === 'in motion' ? '' : BACK_COST[it.state]) : LEAN_COST}</small>
          </button>
        )}
        <button className="ev-loc" onClick={() => p.locate(it.key)} aria-label="Show on the map" title="Show on the map">
          {Icon.locate}
        </button>
      </div>
    </article>
  );
}

/* ───────────────────────── Book ───────────────────────── */

function BookTab(p: Props) {
  const { g, live, paper } = p;
  const target = TARGETS[g.q];
  return (
    <div className="book">
      {live ? (
        <QuarterBook rec={live} />
      ) : (
        <section className="book-wait">
          <span className="eyebrow">{quarterLabel(g.q)} · not run yet</span>
          <p className="book-big">
            On paper: <b>{paper === null ? '—' : fmtIntensity(paper, target)}</b>
            <small> CO₂e/km against a target of {target}</small>
          </p>
          <p className="muted">Paper counts every committed truck at its nameplate. The book only counts trucks that ran.</p>
          <p className="limit">{LIMIT_LINE}</p>
        </section>
      )}
      {g.history.length > 0 && <History g={g} />}
    </div>
  );
}

export function QuarterBook({ rec }: { rec: QuarterRecord }) {
  const r = rec.result;
  const you = rec.net;
  const deck = rec.deckNet;
  const sign = you > deck ? '>' : you === deck ? '=' : '<';
  return (
    <section className="qbook">
      <p className="verdict">{r.verdict}</p>
      <div className="compare">
        <div>
          <span className="eyebrow">You</span>
          <span className={`num-xl ${you < 0 ? 'neg' : ''}`}>
            <CountUp value={you} format={fmtCash} />
          </span>
        </div>
        <span className="vs">{sign}</span>
        <div>
          <span className="eyebrow">
            Old deck <Info term="oldDeck" />
          </span>
          <span className={`num-xl dim ${deck < 0 ? 'neg' : ''}`}>{fmtCash(deck)}</span>
        </div>
      </div>
      <CarbonScale rec={rec} />
      <div className="ledger">
        <span className="eyebrow">How your cash was made</span>
        <ul>
          <li>
            <span>Points won · {r.pointsWon} × 5</span>
            <b>+{fmtNum(r.payout)}</b>
          </li>
          <li>
            <span>Slots built · {r.committed} × 2</span>
            <b>−{fmtNum(r.slotCost)}</b>
          </li>
          {r.strandedPenalty > 0 && (
            <li className="bad">
              <span>
                Stranded · {r.stranded} × 3 <Info term="stranded" />
              </span>
              <b>−{fmtNum(r.strandedPenalty)}</b>
            </li>
          )}
          {r.spareCost > 0 && (
            <li>
              <span>
                Spare · {r.spare} × 0.5 <Info term="spare" />
              </span>
              <b>−{fmtNum(r.spareCost)}</b>
            </li>
          )}
          {rec.fine > 0 && (
            <li className="bad">
              <span>Carbon fine · over {rec.target}</span>
              <b>−{fmtNum(rec.fine)}</b>
            </li>
          )}
          <li className="total">
            <span>Quarter</span>
            <b>{fmtCash(you)}</b>
          </li>
        </ul>
      </div>
    </section>
  );
}

export function CarbonScale({ rec }: { rec: QuarterRecord }) {
  const pos = (v: number) => `${Math.min(100, Math.max(0, v))}%`;
  const r = rec.result;
  const met = r.intensity !== null && r.intensity <= rec.target;
  const deckPaperRows = rec.deck.strandedElectric;
  return (
    <div className="scale">
      <div className="scale-nums">
        <div>
          <span className="eyebrow">
            Your trucks, ran <Info term="intensity" />
          </span>
          <b>{r.intensity === null ? '—' : fmtIntensity(r.intensity, rec.target)}</b>
          <span className={`met ${met ? 'is-met' : 'is-missed'}`}>{r.intensity === null ? 'nothing ran' : met ? `met ${rec.target}` : `missed ${rec.target}`}</span>
        </div>
        <div>
          <span className="eyebrow">Old deck, ran</span>
          <b className="dim">{rec.deck.intensity === null ? '—' : fmtIntensity(rec.deck.intensity, rec.target)}</b>
          <span className="met dim">{deckPaperRows > 0 ? `${deckPaperRows} electric never ran` : 'all it built could run'}</span>
        </div>
      </div>
      <div className="scale-track" aria-hidden>
        <span className="scale-good" style={{ width: pos(rec.target) }} />
        <span className="scale-target" style={{ left: pos(rec.target) }}>
          <i>{rec.target}</i>
        </span>
        {rec.deck.intensity !== null && <span className="mk mk-deck" style={{ left: pos(rec.deck.intensity) }} />}
        {r.intensity !== null && <span className="mk mk-you" style={{ left: pos(r.intensity) }} />}
      </div>
      <div className="scale-ticks" aria-hidden>
        <span>0</span>
        <span>50</span>
        <span>100 · fossil diesel</span>
      </div>
    </div>
  );
}

function History({ g }: { g: Campaign }) {
  const h = g.history;
  let you = 0;
  let deck = 0;
  return (
    <section className="hist">
      <span className="eyebrow">The year so far</span>
      <TrendChart g={g} />
      <table>
        <thead>
          <tr>
            <th>Quarter</th>
            <th>CO₂e</th>
            <th>Kept</th>
            <th>You</th>
            <th>Deck</th>
          </tr>
        </thead>
        <tbody>
          {h.map((r) => {
            you += r.net - r.deskSpend;
            deck += r.deckNet;
            const met = r.result.intensity !== null && r.result.intensity <= r.target;
            return (
              <tr key={r.q}>
                <td>{QUARTER_SHORT[r.q]}</td>
                <td className={met ? 'ok' : 'bad'}>
                  {r.result.intensity === null ? '—' : fmtIntensity(r.result.intensity, r.target)}
                  <small>/{r.target}</small>
                </td>
                <td>{Math.round(r.result.contractsKept * 100)}%</td>
                <td className={you < 0 ? 'bad' : ''}>{fmtMoney(you)}</td>
                <td className="dim">{fmtMoney(deck)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fine">Running totals. Yours includes desk spend.</p>
    </section>
  );
}

export function TrendChart({ g }: { g: Campaign }) {
  const W = 360;
  const H = 120;
  const pad = { l: 26, r: 22, t: 10, b: 20 };
  const x = (q: number) => pad.l + (q / (TARGETS.length - 1)) * (W - pad.l - pad.r);
  const yv = (v: number) => pad.t + ((110 - Math.min(110, Math.max(20, v))) / 90) * (H - pad.t - pad.b);
  const targetPath = TARGETS.map((t, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${yv(t)}`).join(' ');
  const you = g.history.filter((r) => r.result.intensity !== null);
  const deck = g.history.filter((r) => r.deck.intensity !== null);
  const line = (rows: QuarterRecord[], f: (r: QuarterRecord) => number) => rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(r.q)},${yv(f(r))}`).join(' ');
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Carbon intensity per quarter against the target">
      {[40, 60, 80, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={yv(v)} y2={yv(v)} className="grid" />
          <text x={pad.l - 6} y={yv(v) + 3} className="tick" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {TARGETS.map((_, i) => (
        <text key={i} x={x(i)} y={H - 4} className="tick" textAnchor="middle">
          {QUARTER_SHORT[i]}
        </text>
      ))}
      <path d={targetPath} className="t-target" />
      {deck.length > 0 && <path d={line(deck, (r) => r.deck.intensity!)} className="t-deck" />}
      {deck.map((r) => (
        <circle key={`d${r.q}`} cx={x(r.q)} cy={yv(r.deck.intensity!)} r={3} className="t-deck-dot" />
      ))}
      {you.length > 0 && <path d={line(you, (r) => r.result.intensity!)} className="t-you" />}
      {you.map((r) => (
        <circle key={`y${r.q}`} cx={x(r.q)} cy={yv(r.result.intensity!)} r={4} className="t-you-dot" />
      ))}
      <g className="t-legend" transform={`translate(${W - pad.r - 150}, ${pad.t + 2})`}>
        <line x1="0" x2="12" y1="4" y2="4" className="t-you" />
        <text x="16" y="7">
          You
        </text>
        <line x1="44" x2="56" y1="4" y2="4" className="t-deck" />
        <text x="60" y="7">
          Deck
        </text>
        <line x1="92" x2="104" y1="4" y2="4" className="t-target" />
        <text x="108" y="7">
          Target
        </text>
      </g>
    </svg>
  );
}

/* ───────────────────────── Guide ───────────────────────── */

function GuideTab(p: Props) {
  const [open, setOpen] = useState<Term | null>('chain');
  return (
    <div className="guide">
      <section>
        <span className="eyebrow">The game in one breath</span>
        <p className="lede">
          You run a truck factory. Each quarter you build up to 40 trucks for four long-haul lanes. A truck only leaves the yard if the things a haulier needs
          on that lane are actually happening. Carbon only falls on trucks that leave.
        </p>
      </section>

      <section>
        <span className="eyebrow">A quarter, step by step</span>
        <ol className="steps">
          <li>
            <b>Read the lanes.</b> Every building is an event. Solid is real. Scaffolding is half there. A hologram is a date on a slide.
          </li>
          <li>
            <b>Commit slots.</b> Split 40 slots across lanes and powertrains in <em>Plan</em>. Watch the diamond over each lane.
          </li>
          <li>
            <b>Work the desk.</b> Back the events you own. Lean on the ones you do not. Your work lands next quarter.
          </li>
          <li>
            <b>Run the quarter.</b> Trucks that can leave, leave. The rest sit in the yard. The old deck runs beside you.
          </li>
        </ol>
      </section>

      <section>
        <span className="eyebrow">Reading the map</span>
        <ul className="legend">
          <li>
            <i className="lg lg-solid" /> <b>In motion</b> Solid, lights on. Counts 1.
          </li>
          <li>
            <i className="lg lg-scaff" /> <b>Adjacent</b> Half-built in scaffolding. Counts ½.
          </li>
          <li>
            <i className="lg lg-holo" /> <b>Thin</b> Hologram with a date. Counts 0.
          </li>
          <li>
            <i className="lg lg-crane" /> <b>Underway</b> A crane: you backed it. Lands next quarter.
          </li>
          <li>
            <i className="lg lg-row" /> <b>Rows</b> Electric north of the road, gas south, diesel at the back. Pylons are the grid. Green tanks are biodiesel.
          </li>
          <li>
            <i className="lg lg-mood" /> <b>Diamond</b> Green runs, amber idles, red strands.
          </li>
          <li>
            <i className="lg lg-idle" /> <b>Grey truck</b> Idle in the yard. A red ring means stranded.
          </li>
        </ul>
      </section>

      <section>
        <span className="eyebrow">Glossary</span>
        <div className="gloss">
          {(Object.keys(TERMS) as Term[]).map((t) => (
            <div key={t} className={`gl ${open === t ? 'is-open' : ''}`}>
              <button onClick={() => setOpen(open === t ? null : t)} aria-expanded={open === t}>
                {TERMS[t].title}
                <span aria-hidden>{open === t ? '−' : '+'}</span>
              </button>
              {open === t && <p>{TERMS[t].body}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <span className="eyebrow">Winning the year</span>
        <ul className="stars-list">
          <li>
            <span className="star">★</span> <b>Carbon.</b> Meet the {TARGETS[LAST_Q]} target in {quarterLabel(LAST_Q)} with trucks that ran.
          </li>
          <li>
            <span className="star">★</span> <b>Contracts.</b> Keep 75% of contract points on average.
          </li>
          <li>
            <span className="star">★</span> <b>Book.</b> Finish with more cash than the old deck.
          </li>
        </ul>
      </section>

      <section>
        <span className="eyebrow">Controls</span>
        <dl className="keys">
          <dt>Drag · right-drag · scroll</dt>
          <dd>Orbit · pan · zoom</dd>
          <dt>W A S D · Q E</dt>
          <dd>Move · turn the camera</dd>
          <dt>1–4 · 0 · F</dt>
          <dd>Lane · map · factory</dd>
          <dt>R · N</dt>
          <dd>Run quarter · next quarter</dd>
          <dt>Space</dt>
          <dd>Skip a running quarter</dd>
          <dt>L · M · Esc</dt>
          <dd>Labels · sound · back out</dd>
          <dt>Click a building</dt>
          <dd>Back it or lean on it, right there</dd>
        </dl>
      </section>

      <section className="guide-actions">
        <button className="chip-btn" onClick={p.replayTour}>
          Replay the tour
        </button>
        <button className="chip-btn chip-quiet" onClick={() => p.restart()}>
          Restart this world
        </button>
        <button className="chip-btn chip-quiet" onClick={() => p.restart(Math.floor(Math.random() * 9000) + 1000)}>
          New world
        </button>
        <span className="seed">World #{p.g.seed}</span>
      </section>

      <p className="thesis">{THESIS}</p>
    </div>
  );
}
