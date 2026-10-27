import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CORRIDORS,
  OLD_DECK_LABEL,
  POWERTRAINS,
  PT_LABEL,
  RUN_MS,
  SLOT_CAP,
  TARGET,
  type ChainEvent,
  type Corridor,
  type CorridorId,
  type Powertrain,
} from './data';
import {
  chainFor,
  committedSlots,
  emptyCommit,
  oldDeckCommit,
  paperIntensity,
  resolve,
  sameCommit,
  stepCommit,
  type Commit,
  type CorridorResult,
  type Result,
} from './engine';

type Phase = 'commit' | 'running' | 'done';

const LIMIT_LINE = 'Not in the room: the driver, the clearing agent, the grid.';
const MAX_KM = Math.max(...CORRIDORS.map((c) => c.km));

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const fmtCash = (n: number) => {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return '0';
  return `${r > 0 ? '+' : '−'}${fmtNum(Math.abs(r))}`;
};
/** Never show "80" for a value that missed 80. */
const fmtIntensity = (n: number) => {
  const r = Math.round(n);
  return r === TARGET && n !== TARGET ? n.toFixed(1) : String(r);
};

export default function App() {
  const [commit, setCommitState] = useState<Commit>(emptyCommit);
  // Mirror so rapid clicks always step from the latest commit.
  const commitRef = useRef(commit);
  const setCommit = (next: Commit) => {
    commitRef.current = next;
    setCommitState(next);
  };
  const [phase, setPhase] = useState<Phase>('commit');
  const [result, setResult] = useState<Result | null>(null);
  const [shake, setShake] = useState(0);
  const timer = useRef<number | null>(null);

  const oldDeck = useMemo(() => oldDeckCommit(), []);
  const oldDeckResult = useMemo(() => resolve(oldDeck), [oldDeck]);
  const oldDeckPaper = useMemo(() => paperIntensity(oldDeck), [oldDeck]);

  const used = committedSlots(commit);
  const locked = phase !== 'commit';
  const isOldDeck = used > 0 && sameCommit(commit, oldDeck);

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  function onStep(id: CorridorId, pt: Powertrain, delta: number) {
    if (locked) return;
    const next = stepCommit(commitRef.current, id, pt, delta);
    if (next.blocked) setShake((n) => n + 1);
    else setCommit(next.commit);
  }

  function runQuarter() {
    if (phase !== 'commit') return;
    setResult(resolve(commitRef.current));
    setPhase('running');
    timer.current = window.setTimeout(() => setPhase('done'), RUN_MS);
  }

  function reset() {
    clearTimer();
    setCommit(emptyCommit());
    setResult(null);
    setPhase('commit');
    setShake(0);
  }

  function showOldDeck() {
    clearTimer();
    setCommit(oldDeckCommit());
    setResult(null);
    setPhase('commit');
  }

  return (
    <div className={`page phase-${phase}`}>
      <header className="topbar">
        <div className="topbar-title">
          <h1>
            No Show <span className="year">2030</span>
          </h1>
          <p className="sub">Long-haul replacement cycle</p>
        </div>
        <p className="conflict">
          Target <strong>−20%</strong> from trucks that run. A truck that sits idle cuts nothing.
        </p>
        <div className="topbar-actions">
          <span className="chip">Q3 commit</span>
          <button className="btn btn-run" onClick={runQuarter} disabled={phase !== 'commit'}>
            <span>Run quarter</span>
            <span className="btn-arrow" aria-hidden>
              →
            </span>
          </button>
          <button className="btn btn-primary" onClick={showOldDeck} disabled={phase === 'running'}>
            Show the old deck
          </button>
          <button className="btn btn-quiet" onClick={reset} disabled={phase === 'running'}>
            Reset
          </button>
        </div>
      </header>

      <main className="bands">
        <section className="corridors" aria-label="Corridors">
          <div className="band-head">
            <h2>Four corridors · 40 factory slots</h2>
            {isOldDeck ? (
              <span className="deck-label">{OLD_DECK_LABEL}</span>
            ) : (
              <span className="band-hint">
                A powertrain is <em>open</em> when its chain scores ¾ or more.
              </span>
            )}
          </div>
          {CORRIDORS.map((c, i) => (
            <CorridorCard
              key={c.id}
              corridor={c}
              index={i}
              slots={commit[c.id]}
              phase={phase}
              result={result ? result.corridors[c.id] : null}
              atCap={used >= SLOT_CAP}
              onStep={(pt, d) => onStep(c.id, pt, d)}
            />
          ))}
        </section>

        <Book
          commit={commit}
          used={used}
          phase={phase}
          result={result}
          oldDeck={oldDeckResult}
          oldDeckPaper={oldDeckPaper}
          shake={shake}
        />
      </main>

      <footer className="footer">
        A date is not a future. An event is. A truck that does not run does not cut carbon.
      </footer>
    </div>
  );
}

/* ───────────────────────── Corridor ───────────────────────── */

function CorridorCard(props: {
  corridor: Corridor;
  index: number;
  slots: Record<Powertrain, number>;
  phase: Phase;
  result: CorridorResult | null;
  atCap: boolean;
  onStep: (pt: Powertrain, delta: number) => void;
}) {
  const { corridor: c, index, slots, phase, result, atCap, onStep } = props;
  const locked = phase !== 'commit';
  const elec = chainFor(c, 'electric');
  const electricExposed = locked && !elec.open && slots.electric > 0;
  const routeWidth = `${Math.round((c.km / MAX_KM) * 100)}%`;

  return (
    <article className="corridor">
      <header className="corridor-head">
        <span className="corridor-index">{String(index + 1).padStart(2, '0')}</span>
        <div className="corridor-name">
          <h3>{c.name}</h3>
          <p className="corridor-meta">
            {c.km.toLocaleString('en-GB')} km · {c.region}
          </p>
        </div>
        <div className="corridor-points">
          <span className="big-num">{c.points}</span>
          <span className="label">contract points</span>
        </div>
      </header>

      <div className="route" aria-hidden>
        <div className="route-line" style={{ width: routeWidth }}>
          <span className="route-end">{c.from}</span>
          <span className="route-end route-end-to">{c.to}</span>
        </div>
      </div>

      <p className="corridor-note">{c.note}</p>

      <div className="lines">
        {POWERTRAINS.map((pt) => {
          const chain = chainFor(c, pt);
          const line = result?.lines[pt];
          const showStamp = locked && line && line.idle > 0;
          const showRan = locked && line && line.won > 0;
          return (
            <div key={pt} className={`line line-${pt} depth-${c.depth[pt]}`}>
              <span className="line-swatch" aria-hidden />
              <div className="line-name">
                <span className="pt">{PT_LABEL[pt]}</span>
                <span className={`depth depth-word-${c.depth[pt]}`}>{c.depth[pt]}</span>
              </div>
              <div className={`line-chain ${chain.open ? 'is-open' : 'is-closed'}`}>
                chain {fmtNum(chain.sum)}/{chain.n} <b>{chain.open ? 'open' : 'closed'}</b>
              </div>
              <Stepper
                label={`${PT_LABEL[pt]} slots on ${c.name}`}
                value={slots[pt]}
                locked={locked}
                atCap={atCap}
                onStep={(d) => onStep(pt, d)}
              />
              {(showStamp || showRan) && (
                <div className="line-outcome">
                  {showRan && <span className="ran">ran {line!.won}</span>}
                  {showStamp && (
                    <span className={`stamp ${line!.stranded > 0 ? 'stamp-stranded' : ''}`}>
                      idle{line!.idle > 1 ? ` ×${line!.idle}` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="chain-block">
        <div className="chain-title">
          <span>Electric chain — what a haulier needs before signing</span>
          <span className={`chain-score ${elec.open ? 'is-open' : 'is-closed'}`}>
            chain {fmtNum(elec.sum)}/{elec.n} · {elec.open ? 'open' : 'closed'}
          </span>
        </div>
        <ul className="pills">
          {c.chains.electric.map((e, i) => (
            <Pill key={e.label} event={e} flash={electricExposed} delay={i * 70} />
          ))}
        </ul>
        <details className="other-chains">
          <summary>Diesel and gas chains</summary>
          {(['diesel', 'gas'] as Powertrain[]).map((pt) => (
            <div key={pt} className="other-chain">
              <span className={`other-chain-name pt-${pt}`}>{PT_LABEL[pt]}</span>
              <ul className="pills pills-small">
                {c.chains[pt].map((e) => (
                  <Pill key={e.label} event={e} flash={false} delay={0} />
                ))}
              </ul>
            </div>
          ))}
        </details>
        <p className="carbon-side">
          Carbon on this lane: biodiesel <StateWord state={c.biodiesel} /> · grid <StateWord state={c.grid} />
        </p>
      </div>
    </article>
  );
}

function StateWord({ state }: { state: ChainEvent['state'] }) {
  return <span className={`state-word state-${state.replace(' ', '-')}`}>{state}</span>;
}

function Pill({ event, flash, delay }: { event: ChainEvent; flash: boolean; delay: number }) {
  const stillThin = flash && event.state === 'thin';
  return (
    <li
      className={`pill pill-${event.state.replace(' ', '-')} ${stillThin ? 'pill-flash' : ''}`}
      style={stillThin ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span className="pill-state">{stillThin ? 'still thin' : event.state}</span>
      <span className="pill-label">{event.label}</span>
    </li>
  );
}

function Stepper(props: {
  label: string;
  value: number;
  locked: boolean;
  atCap: boolean;
  onStep: (delta: number) => void;
}) {
  const { label, value, locked, atCap, onStep } = props;
  return (
    <div className={`stepper ${locked ? 'is-locked' : ''}`} role="group" aria-label={label}>
      <button
        type="button"
        className="step"
        onClick={() => onStep(-1)}
        disabled={locked || value === 0}
        aria-label="Remove one slot"
      >
        −
      </button>
      <output className="step-count" key={value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={`step ${atCap ? 'at-cap' : ''}`}
        onClick={() => onStep(1)}
        disabled={locked}
        aria-disabled={atCap || locked}
        aria-label="Add one slot"
      >
        +
      </button>
    </div>
  );
}

/* ───────────────────────── Book ───────────────────────── */

function Book(props: {
  commit: Commit;
  used: number;
  phase: Phase;
  result: Result | null;
  oldDeck: Result;
  oldDeckPaper: number | null;
  shake: number;
}) {
  const { commit, used, phase, result, oldDeck, oldDeckPaper, shake } = props;
  const done = phase === 'done' && result !== null;

  return (
    <aside className={`book ${phase !== 'commit' ? 'book-compact' : ''}`} aria-label="The book">
      <div className="book-head">
        <h2>The book</h2>
        <span className="book-quarter">Q3</span>
      </div>

      <div className="book-slots">
        <div className="label">Slots used</div>
        <div className={`slots-count ${shake > 0 ? 'shake' : ''}`} key={shake}>
          <span className="big-num">{used}</span>
          <span className="slots-cap">/ {SLOT_CAP}</span>
        </div>
        <div className="slots-left">
          {SLOT_CAP - used} left{SLOT_CAP - used === 0 ? ' — the cap' : ''}
        </div>
        <SlotStrip commit={commit} result={phase === 'commit' ? null : result} />
        <div className="strip-legend">
          {POWERTRAINS.map((pt) => (
            <span key={pt} className={`legend legend-${pt}`}>
              {PT_LABEL[pt]}
            </span>
          ))}
          <span className="legend legend-spare">Spare</span>
          {phase !== 'commit' && <span className="legend legend-idle">Idle</span>}
        </div>
      </div>

      {!done ? (
        <div className="book-wait">
          {phase === 'running' ? (
            <p className="running">The quarter is firing…</p>
          ) : (
            <p>Commit slots. Then run the quarter.</p>
          )}
          <p className="limit">{LIMIT_LINE}</p>
        </div>
      ) : (
        <BookResult result={result} oldDeck={oldDeck} oldDeckPaper={oldDeckPaper} />
      )}
    </aside>
  );
}

function SlotStrip({ commit, result }: { commit: Commit; result: Result | null }) {
  const cells: { kind: Powertrain | 'spare'; idle: boolean }[] = [];
  for (const pt of POWERTRAINS) {
    for (const c of CORRIDORS) {
      const n = commit[c.id][pt];
      const won = result ? result.corridors[c.id].lines[pt].won : n;
      for (let i = 0; i < n; i++) cells.push({ kind: pt, idle: result !== null && i >= won });
    }
  }
  while (cells.length < SLOT_CAP) cells.push({ kind: 'spare', idle: false });
  return (
    <div className="strip" aria-hidden>
      {cells.map((cell, i) => (
        <span
          key={i}
          className={`cell cell-${cell.kind} ${cell.idle ? 'cell-idle' : ''}`}
          style={cell.idle ? { animationDelay: `${420 + (i % 20) * 8}ms` } : undefined}
        />
      ))}
    </div>
  );
}

function BookResult({ result, oldDeck, oldDeckPaper }: { result: Result; oldDeck: Result; oldDeckPaper: number | null }) {
  const sign = result.cash > oldDeck.cash ? '>' : result.cash === oldDeck.cash ? '=' : '<';
  return (
    <div className="book-result">
      <div className="verdict-block" aria-live="polite">
        <p className="verdict">{result.verdict}</p>
        <p className="limit">{LIMIT_LINE}</p>
      </div>

      <div className="compare">
        <div>
          <span className="label">Your cash</span>
          <span className={`big-num ${result.cash < 0 ? 'neg' : ''}`}>
            <CountUp value={result.cash} format={fmtCash} />
          </span>
        </div>
        <span className="compare-vs" aria-hidden>
          {sign}
        </span>
        <div>
          <span className="label">Old deck cash</span>
          <span className={`big-num ${oldDeck.cash < 0 ? 'neg' : ''}`}>{fmtCash(oldDeck.cash)}</span>
        </div>
      </div>

      <Carbon result={result} oldDeck={oldDeck} oldDeckPaper={oldDeckPaper} />

      <div className="ledger">
        <p className="cash-math">
          Your cash = {fmtNum(result.payout)} won − {fmtNum(result.slotCost)} slots − {fmtNum(result.strandedPenalty)}{' '}
          stranded − {fmtNum(result.spareCost)} spare
        </p>
        <div className="ledger-pair">
          <div>
            <span className="label">Idle slots</span>
            <span className={`mid-num ${result.idle > 0 ? 'neg' : ''}`}>{result.idle}</span>
          </div>
          <div>
            <span className="label">Contracts kept</span>
            <span className="mid-num">
              {result.pointsWon}
              <small>/{result.pointsAvailable}</small>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Carbon({ result, oldDeck, oldDeckPaper }: { result: Result; oldDeck: Result; oldDeckPaper: number | null }) {
  const pos = (v: number) => `${Math.min(100, Math.max(0, v))}%`;
  const rows = [
    { key: 'you', label: 'Your trucks', r: result },
    { key: 'deck', label: 'Old deck', r: oldDeck },
  ];
  return (
    <div className="carbon">
      <div className="carbon-head">
        <span className="label">CO₂e / km on trucks that ran · fossil diesel = 100</span>
      </div>
      <div className="carbon-nums">
        {rows.map(({ key, label, r }) => (
          <div key={key} className={`carbon-num carbon-${key}`}>
            <span className="label">{label}</span>
            <span className="big-num">{r.intensity === null ? '—' : fmtIntensity(r.intensity)}</span>
            <span className={`met ${r.met ? 'is-met' : 'is-missed'}`}>
              {r.intensity === null ? 'nothing ran · missed' : r.met ? 'met target 80' : 'missed target 80'}
            </span>
          </div>
        ))}
      </div>
      <div className="scale" aria-hidden>
        <div className="scale-track">
          <span className="scale-good" style={{ width: pos(TARGET) }} />
          <span className="scale-target" style={{ left: pos(TARGET) }}>
            <i>target 80</i>
          </span>
          {oldDeckPaper !== null && (
            <span className="marker marker-paper" style={{ left: pos(oldDeckPaper) }} />
          )}
          {oldDeck.intensity !== null && (
            <span className="marker marker-deck" style={{ left: pos(oldDeck.intensity) }} />
          )}
          {result.intensity !== null && (
            <span className="marker marker-you" style={{ left: pos(result.intensity) }} />
          )}
        </div>
        <div className="scale-ticks">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
        <div className="scale-legend">
          <span className="key key-you">your trucks</span>
          <span className="key key-deck">old deck, ran</span>
          <span className="key key-paper">old deck, on paper</span>
        </div>
      </div>
      {oldDeckPaper !== null && (
        <p className="paper-note">
          On paper the old deck reads <b>{fmtIntensity(oldDeckPaper)}</b>. It counts {oldDeck.strandedElectric} electric
          trucks that never ran.
        </p>
      )}
    </div>
  );
}

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const ms = 520;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(k === 1 ? value : Math.round(value * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}
