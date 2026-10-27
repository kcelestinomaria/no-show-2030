import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CORRIDORS, POWERTRAINS, SLOT_CAP, type Corridor, type CorridorId, type Powertrain } from './data';
import { canRun, chainFor, committedSlots, oldDeckCommit, paperIntensity, stepCommit, emptyCommit, type Commit } from './engine';
import {
  ACTOR,
  QUARTERS,
  QUARTER_SHORT,
  corridorOf,
  labelOf,
  metaFor,
  type News,
  TARGETS,
  back as backEvent,
  finalOf,
  finishRun,
  lean as leanEvent,
  newCampaign,
  nextQuarter,
  quarterLabel,
  runQuarter,
  worldOf,
  type Campaign,
  type EventKey,
} from './campaign';
import { World, type Hover, type Mood, type Shot } from './three/World';
import { Sidebar, type Tab } from './ui/Sidebar';
import { FinalModal, NewsModal, ReportModal, Tooltip } from './ui/Overlays';
import { Tour, Welcome } from './ui/Tour';
import { Icon, Info, Kbd, fmtIntensity, fmtMoney } from './ui/bits';
import { ActionCard } from './ui/ActionCard';
import { Confetti } from './ui/Confetti';
import { sfx } from './ui/sfx';

export interface LaneMood {
  mood: Mood;
  msg: string;
}

export function moodOf(c: Corridor, slots: Record<Powertrain, number>): LaneMood {
  const total = POWERTRAINS.reduce((a, pt) => a + slots[pt], 0);
  if (total === 0) return { mood: 'none', msg: 'Nothing committed here.' };
  const dead = POWERTRAINS.filter((pt) => slots[pt] > 0 && !canRun(c, pt));
  if (dead.length) {
    const n = dead.reduce((a, pt) => a + slots[pt], 0);
    const pt = dead[0];
    const why = pt === 'electric' && chainFor(c, pt).open ? 'the grid is not live' : 'its chain is closed';
    return { mood: 'bad', msg: `${n} ${dead.join(' and ')} slot${n > 1 ? 's' : ''} cannot run: ${why}.` };
  }
  if (total > c.points) return { mood: 'warn', msg: `${total} slots for ${c.points} points. ${total - c.points} will idle.` };
  if (total < c.points) return { mood: 'good', msg: `Every slot can run. ${c.points - total} points left on the table.` };
  return { mood: 'good', msg: 'Every slot can run, and the lane is covered.' };
}

const TOUR_KEY = 'ns2030.toured.v2';
const readTour = () => {
  try {
    return localStorage.getItem(TOUR_KEY) === '1';
  } catch {
    return false;
  }
};
const writeTour = () => {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    /* private mode: tour shows again next time */
  }
};

const HINT_KEY = 'ns2030.camera-hint';
const readHint = () => {
  try {
    return localStorage.getItem(HINT_KEY) !== '1';
  } catch {
    return true;
  }
};
const writeHint = () => {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* private mode: the hint shows again next time */
  }
};

export type Overlay = 'none' | 'welcome' | 'tour' | 'report' | 'news' | 'final';

export default function App() {
  const [g, setG] = useState<Campaign>(() => newCampaign());
  const gRef = useRef(g);
  const set = useCallback((next: Campaign) => {
    gRef.current = next;
    setG(next);
  }, []);

  const [selected, setSelected] = useState<CorridorId | null>(null);
  const [tab, setTab] = useState<Tab>('plan');
  const [hover, setHover] = useState<Hover | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(() => (readTour() ? 'none' : 'welcome'));
  const [tourStep, setTourStep] = useState(0);
  const [labels, setLabels] = useState(true);
  const [shake, setShake] = useState(0);
  const [flashKey, setFlashKey] = useState<EventKey | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [cameraHint, setCameraHint] = useState(readHint);
  const [pin, setPin] = useState<{ key: EventKey; x: number; y: number } | null>(null);
  const [sound, setSound] = useState(sfx.on);
  const [party, setParty] = useState(0);
  const [cashDelta, setCashDelta] = useState<{ v: number; n: number } | null>(null);
  useEffect(() => sfx.subscribe(setSound), []);

  const hostRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const worldRef = useRef<World | null>(null);

  const world = useMemo(() => worldOf(g.states), [g.states]);
  const used = committedSlots(g.commit);
  const paper = useMemo(() => paperIntensity(g.commit, world), [g.commit, world]);
  const moods = useMemo(() => {
    const m = {} as Record<CorridorId, LaneMood>;
    for (const c of world) m[c.id] = moodOf(c, g.commit[c.id]);
    return m;
  }, [world, g.commit]);
  const record = g.history.find((h) => h.q === g.q) ?? null;
  const live = g.phase !== 'plan' ? record : null;
  const target = TARGETS[g.q];

  /* ───── 3D bridge ───── */

  useEffect(() => {
    if (!hostRef.current) return;
    let w: World;
    try {
      w = new World(hostRef.current, {
        onHover: setHover,
        onSelect: (id) => {
          setSelected(id);
          if (id) {
            w.shot({ kind: 'lane', id });
            setTab((t) => (t === 'guide' ? 'plan' : t));
          }
        },
        onEventClick: (key, x, y) => {
          sfx.click();
          setPin({ key, x, y });
          w.highlightEvent(key);
        },
        onBeat: (kind, i) => (kind === 'coin' ? sfx.coin(i) : sfx.thud(i)),
      });
    } catch {
      setWebglFailed(true);
      return;
    }
    worldRef.current = w;
    return () => {
      w.dispose();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    worldRef.current?.setView({
      world,
      states: g.states,
      pending: g.pending,
      due: g.due,
      commit: g.commit,
      moods: Object.fromEntries(Object.entries(moods).map(([k, v]) => [k, v.mood])) as Record<CorridorId, Mood>,
      selected,
      dueLabel: (q) => QUARTER_SHORT[q] ?? 'TBD',
      result: live ? live.result : null,
      showLabels: labels,
    });
  }, [world, g.states, g.pending, g.due, g.commit, moods, selected, live, labels]);

  const shot = useCallback((s: Shot) => worldRef.current?.shot(s), []);

  /* ───── actions ───── */

  const step = useCallback(
    (id: CorridorId, pt: Powertrain, delta: number) => {
      const cur = gRef.current;
      if (cur.phase !== 'plan') return;
      let commit = cur.commit;
      let blocked = false;
      const dir = Math.sign(delta);
      for (let i = 0; i < Math.abs(delta); i++) {
        const r = stepCommit(commit, id, pt, dir);
        if (r.blocked) {
          blocked = true;
          break;
        }
        commit = r.commit;
      }
      if (blocked) {
        setShake((n) => n + 1);
        sfx.bump();
      } else if (commit !== cur.commit) (dir > 0 ? sfx.tick : sfx.untick)();
      if (commit !== cur.commit) set({ ...cur, commit });
    },
    [set],
  );

  const setCommit = useCallback(
    (commit: Commit) => {
      const cur = gRef.current;
      if (cur.phase === 'plan') set({ ...cur, commit });
    },
    [set],
  );

  const run = useCallback(() => {
    const cur = gRef.current;
    if (cur.phase !== 'plan') return;
    const next = runQuarter(cur);
    set(next);
    setSelected(null);
    setHover(null);
    setPin(null);
    sfx.run();
    const rec = next.history[next.history.length - 1];
    const finish = () => {
      set(finishRun(gRef.current));
      setOverlay('report');
      setTab('book');
      const met = rec.result.intensity !== null && rec.result.intensity <= rec.target;
      if (met) {
        sfx.win();
        setParty((n) => n + 1);
      } else sfx.miss();
    };
    if (worldRef.current) worldRef.current.run(rec.result, finish);
    else window.setTimeout(finish, 600);
  }, [set]);

  const advance = useCallback(() => {
    const cur = gRef.current;
    if (cur.phase !== 'report') return;
    const next = nextQuarter(cur);
    if (next.phase === 'over') {
      set(next);
      setOverlay('final');
      const f = finalOf(next);
      if (Number(f.stars.carbon) + Number(f.stars.contracts) + Number(f.stars.book) >= 2) {
        sfx.win();
        setParty((n) => n + 1);
      } else sfx.miss();
      return;
    }
    sfx.paper();
    next.news.forEach((n, i) => (n.kind === 'no-show' ? sfx.noshow(i + 2) : sfx.showed(i + 2)));
    worldRef.current?.settle(next.commit);
    set(next);
    setOverlay('news');
    setTab('plan');
    worldRef.current?.shot({ kind: 'overview' });
  }, [set]);

  const restart = useCallback(
    (seed?: number) => {
      worldRef.current?.reset();
      set(newCampaign(seed ?? gRef.current.seed));
      setSelected(null);
      setOverlay('none');
      setTab('plan');
      worldRef.current?.shot({ kind: 'overview' });
    },
    [set],
  );

  const spend = useCallback(
    (next: Campaign) => {
      const d = next.cash - gRef.current.cash;
      if (d !== 0) setCashDelta((c) => ({ v: d, n: (c?.n ?? 0) + 1 }));
      set(next);
    },
    [set],
  );
  const doBack = useCallback(
    (key: EventKey) => {
      sfx.back();
      spend(backEvent(gRef.current, key));
    },
    [spend],
  );
  const doLean = useCallback(
    (key: EventKey) => {
      sfx.lean();
      spend(leanEvent(gRef.current, key));
    },
    [spend],
  );
  const skipRun = useCallback(() => worldRef.current?.skipRun(), []);
  const closePin = useCallback(() => {
    setPin(null);
    worldRef.current?.highlightEvent(null);
  }, []);

  const select = useCallback(
    (id: CorridorId | null) => {
      setSelected(id);
      shot(id ? { kind: 'lane', id } : { kind: 'overview' });
    },
    [shot],
  );

  const locate = useCallback(
    (key: EventKey) => {
      setSelected(key.split('/')[0] as CorridorId);
      shot({ kind: 'event', key });
      worldRef.current?.highlightEvent(key);
    },
    [shot],
  );

  /* ───── keyboard ───── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (overlay === 'tour' || overlay === 'welcome') return;
      const k = e.key.toLowerCase();
      if (k === ' ' && gRef.current.phase === 'running') {
        e.preventDefault();
        skipRun();
        return;
      }
      if (k === 'm') {
        sfx.toggle();
        return;
      }
      if (k === 'escape' && pinRef.current) {
        setPin(null);
        worldRef.current?.highlightEvent(null);
        return;
      }
      if (k === 'escape') {
        if (overlay !== 'none' && overlay !== 'final') setOverlay('none');
        else select(null);
      } else if (overlay !== 'none') return;
      else if (k >= '1' && k <= '4') select(CORRIDORS[Number(k) - 1].id);
      else if (k === '0') select(null);
      else if (k === 'f') {
        setSelected(null);
        shot({ kind: 'factory' });
      } else if (k === 'l') setLabels((v) => !v);
      else if (k === 'r' && gRef.current.phase === 'plan') run();
      else if (k === 'n' && gRef.current.phase === 'report') advance();
      else if (k === '?' || (k === '/' && e.shiftKey)) setTab('guide');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, select, shot, run, advance, skipRun]);

  /* ───── sidebar width for the camera ───── */

  const sideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sideRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => worldRef.current?.setSidebar(window.innerWidth > 900 ? el.offsetWidth + 16 : 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ───── tour ───── */

  const endTour = () => {
    writeTour();
    setOverlay('none');
    setTourStep(0);
    select(null);
  };

  const replayTour = () => {
    setTab('plan');
    setTourStep(0);
    setOverlay('welcome');
  };

  return (
    <div className={`app phase-${g.phase}`}>
      <div
        className="stage"
        ref={hostRef}
        aria-label="Map of the factory and four corridors"
        role="img"
        onPointerDown={cameraHint ? () => (setCameraHint(false), writeHint()) : undefined}
        onWheel={cameraHint ? () => (setCameraHint(false), writeHint()) : undefined}
      />
      <div className="vignette" aria-hidden />
      {webglFailed && (
        <div className="nogl">
          <b>3D needs WebGL.</b> The plan still works from the sidebar.
        </div>
      )}

      {/* ───── Top HUD ───── */}
      <header className="hud">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <i />
          </span>
          <h1>
            No Show <em>2030</em>
          </h1>
        </div>

        <ol className="timeline" aria-label="Quarters" data-tour="timeline">
          {QUARTERS.map((q, i) => {
            const rec = g.history.find((h) => h.q === i);
            const met = rec && rec.result.intensity !== null && rec.result.intensity <= rec.target;
            return (
              <li key={q} className={`tq ${i === g.q ? 'is-now' : ''} ${i < g.q ? 'is-past' : ''}`}>
                <span className="tq-dot">{rec ? (met ? '✓' : '×') : ''}</span>
                <span className="tq-name">{QUARTER_SHORT[i]}</span>
                <span className="tq-target">−{100 - TARGETS[i]}%</span>
              </li>
            );
          })}
        </ol>

        <div className="res" data-tour="resources">
          <div className={`res-item ${shake ? 'shake' : ''}`} key={`s${shake}`}>
            <span className="res-label">
              Slots <Info term="slot" />
            </span>
            <span className="res-val">
              {used}
              <small>/{SLOT_CAP}</small>
            </span>
            <span className="res-bar" aria-hidden>
              <i style={{ width: `${(used / SLOT_CAP) * 100}%` }} />
            </span>
          </div>
          <div className="res-item">
            <span className="res-label">
              Treasury <Info term="treasury" />
            </span>
            <span className={`res-val ${g.cash < 0 ? 'neg' : ''}`}>{fmtMoney(g.cash)}</span>
            {cashDelta && (
              <span key={cashDelta.n} className={`res-delta ${cashDelta.v < 0 ? 'neg' : ''}`} aria-hidden>
                {cashDelta.v > 0 ? '+' : '−'}
                {fmtMoney(Math.abs(cashDelta.v))}
              </span>
            )}
          </div>
          <div className="res-item">
            <span className="res-label">
              Desk <Info term="desk" />
            </span>
            <span className="res-val pips-row" aria-label={`${g.actionsLeft} desk actions left`}>
              {[0, 1, 2].map((i) => (
                <i key={i} className={i < g.actionsLeft ? 'on' : ''} />
              ))}
            </span>
          </div>
          <div className="res-item res-carbon">
            <span className="res-label">
              {live ? 'CO₂e ran' : 'CO₂e on paper'} <Info term={live ? 'intensity' : 'paper'} />
            </span>
            <span className="res-val">
              {live
                ? live.result.intensity === null
                  ? '—'
                  : fmtIntensity(live.result.intensity, target)
                : paper === null
                  ? '—'
                  : fmtIntensity(paper, target)}
              <small> / {target}</small>
            </span>
          </div>
        </div>
      </header>

      {/* ───── Camera dock ───── */}
      <nav className="dock" aria-label="Camera" data-tour="dock">
        <button className={`dock-btn ${selected === null ? 'is-on' : ''}`} onClick={() => select(null)} title="Overview (0)">
          {Icon.globe}
          <span>Map</span>
        </button>
        <button className="dock-btn" onClick={() => (setSelected(null), shot({ kind: 'factory' }))} title="Factory (F)">
          {Icon.factory}
          <span>Factory</span>
        </button>
        <span className="dock-sep" />
        {CORRIDORS.map((c, i) => (
          <button
            key={c.id}
            className={`dock-btn dock-lane mood-${moods[c.id].mood} ${selected === c.id ? 'is-on' : ''}`}
            onClick={() => select(c.id)}
            title={`${c.name} (${i + 1})`}
          >
            <i className="dock-mood" />
            <span>{c.from.slice(0, 3).toUpperCase()}</span>
          </button>
        ))}
        <span className="dock-sep" />
        <button className={`dock-btn ${labels ? 'is-on' : ''}`} onClick={() => setLabels((v) => !v)} title="Event labels (L)">
          {Icon.tag}
          <span>Labels</span>
        </button>
        <button className={`dock-btn ${sound ? '' : 'is-muted'}`} onClick={() => sfx.toggle()} title="Sound (M)" aria-pressed={sound}>
          {sound ? Icon.sound : Icon.mute}
          <span>{sound ? 'Sound' : 'Muted'}</span>
        </button>
        <button className="dock-btn" onClick={replayTour} title="Replay the tour">
          {Icon.help}
          <span>Tour</span>
        </button>
      </nav>

      {cameraHint && overlay === 'none' && (
        <div className="hint-keys" aria-hidden>
          <Kbd>Drag</Kbd> orbit · <Kbd>Right-drag</Kbd> pan · <Kbd>Scroll</Kbd> zoom
        </div>
      )}

      {g.phase === 'running' && (
        <button className="skip" onClick={skipRun}>
          Skip to the book <Kbd>Space</Kbd>
        </button>
      )}

      {/* ───── News strip ───── */}
      <NewsStrip g={g} />

      <Sidebar
        ref={sideRef}
        g={g}
        world={world}
        moods={moods}
        used={used}
        paper={paper}
        live={live}
        tab={tab}
        setTab={setTab}
        selected={selected}
        select={select}
        step={step}
        setCommit={setCommit}
        loadOldDeck={() => setCommit(oldDeckCommit())}
        clear={() => setCommit(emptyCommit())}
        run={run}
        advance={advance}
        openReport={() => setOverlay('report')}
        openFinal={() => setOverlay('final')}
        back={doBack}
        lean={doLean}
        locate={locate}
        hoverEvent={(k) => worldRef.current?.highlightEvent(k)}
        flashKey={flashKey}
        clearFlash={() => setFlashKey(null)}
        replayTour={replayTour}
        restart={restart}
      />

      {hover && overlay === 'none' && !pin && <Tooltip hover={hover} g={g} world={world} moods={moods} />}
      {pin && overlay === 'none' && (
        <ActionCard
          at={pin}
          g={g}
          world={world}
          onBack={doBack}
          onLean={doLean}
          onDesk={(key) => {
            setPin(null);
            setTab('desk');
            setSelected(key.split('/')[0] as CorridorId);
            setFlashKey(key);
            shot({ kind: 'event', key });
          }}
          onClose={closePin}
        />
      )}
      <Confetti fire={party} amount={g.phase === 'over' ? 220 : 120} />

      {overlay === 'welcome' && (
        <Welcome
          onStart={() => {
            setTourStep(0);
            setOverlay('tour');
          }}
          onSkip={endTour}
        />
      )}
      {overlay === 'tour' && <Tour step={tourStep} setStep={setTourStep} onEnd={endTour} shot={shot} setTab={setTab} select={setSelected} />}
      {overlay === 'report' && record && (
        <ReportModal
          rec={record}
          g={g}
          onClose={() => setOverlay('none')}
          onNext={advance}
          onDesk={() => {
            setOverlay('none');
            setTab('desk');
          }}
        />
      )}
      {overlay === 'news' && <NewsModal g={g} onClose={() => setOverlay('none')} onDesk={() => (setOverlay('none'), setTab('desk'))} />}
      {overlay === 'final' && (
        <FinalModal g={g} onClose={() => setOverlay('none')} onReplay={() => restart()} onNewWorld={() => restart(Math.floor(Math.random() * 9000) + 1000)} />
      )}
    </div>
  );
}

function NewsStrip({ g }: { g: Campaign }) {
  return (
    <div className="ticker" aria-live="polite">
      <span className="ticker-tag">{g.news.length ? quarterLabel(g.q) : 'Wire'}</span>
      <div className="ticker-track">
        {g.news.length === 0 ? (
          <span>The deck said 40% electric by now. The lanes say what is in motion.</span>
        ) : (
          g.news.map((n) => <TickerItem key={n.key + n.kind} n={n} />)
        )}
      </div>
    </div>
  );
}

function TickerItem({ n }: { n: News }) {
  const c = corridorOf(n.key);
  const who = ACTOR[metaFor(n.key).who].name;
  if (n.kind === 'no-show')
    return (
      <span className="tk-noshow">
        <b>No show.</b> {who}: {labelOf(n.key).toLowerCase()} on {c.name}. Now {n.slipTo !== undefined ? quarterLabel(n.slipTo) : 'TBD'}.
      </span>
    );
  return (
    <span className={n.kind === 'landed' ? 'tk-landed' : 'tk-showed'}>
      <b>{n.kind === 'landed' ? 'Landed.' : 'Showed.'}</b> {labelOf(n.key)} on {c.name}: {n.to}.
    </span>
  );
}
