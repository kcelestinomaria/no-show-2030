import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import type { CorridorId } from '../data';
import type { Shot } from '../three/World';
import type { Tab } from './Sidebar';
import { Icon, Kbd } from './bits';

/* ───────────────────────── Welcome ───────────────────────── */

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="scrim scrim-welcome">
      <div className="welcome" role="dialog" aria-modal="true" aria-label="Welcome">
        <div className="wl-art" aria-hidden>
          <span className="wl-bar">
            <i className="wl-d" />
            <i className="wl-g" />
            <i className="wl-e" />
          </span>
        </div>
        <span className="eyebrow">A planning game in four quarters</span>
        <h1 className="wl-title">
          No Show <em>2030</em>
        </h1>
        <p className="wl-lede">The slide said 40% electric by 2030. It is Q3 2030. You run the truck factory.</p>
        <ol className="wl-beats">
          <li>
            <b>40 slots</b>
            <span>Build trucks for four long-haul lanes.</span>
          </li>
          <li>
            <b>Chains</b>
            <span>A truck runs only if its lane is ready for it.</span>
          </li>
          <li>
            <b>Carbon</b>
            <span>Only trucks that run cut anything.</span>
          </li>
        </ol>
        <div className="wl-actions">
          <button className="cta cta-inline" onClick={onStart} autoFocus>
            <span>Show me around</span>
            <span className="cta-key">90s</span>
            {Icon.arrow}
          </button>
          <button className="btn-ghost" onClick={onSkip}>
            I know the drill
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Tour ───────────────────────── */

interface Step {
  title: string;
  body: ReactNode;
  anchor?: string;
  shot?: Shot;
  tab?: Tab;
  select?: CorridorId | null;
  place?: 'left' | 'bottom' | 'center';
}

const STEPS: Step[] = [
  {
    title: 'This is your factory',
    body: (
      <>
        Forty bays, forty trucks a quarter. Every truck you commit appears in a bay and costs <b>2</b>, whether it finds work or not.
      </>
    ),
    shot: { kind: 'factory' },
    select: null,
  },
  {
    title: 'Four lanes, four contracts',
    body: (
      <>
        Stockholm–Ruhr, Madrid–Lyon, Mombasa–Kampala, Johannesburg–Lusaka. Each lane has <b>contract points</b>. A truck that runs there wins a point worth{' '}
        <b>5</b>.
      </>
    ),
    shot: { kind: 'overview' },
    select: null,
  },
  {
    title: 'Every building is an event',
    body: (
      <>
        <span className="legend-inline">
          <i className="lg lg-solid" /> Solid: <b>in motion</b>
        </span>
        <span className="legend-inline">
          <i className="lg lg-scaff" /> Scaffolding: <b>adjacent</b>
        </span>
        <span className="legend-inline">
          <i className="lg lg-holo" /> Hologram: <b>thin</b>, a date on a slide
        </span>
        Electric sits north of the road, gas south, diesel behind it. When its four events average ¾, a chain is <b>open</b> and the trucks can run.
      </>
    ),
    shot: { kind: 'lane', id: 'sto-ruhr' },
    select: 'sto-ruhr',
  },
  {
    title: 'Watch the diamonds',
    body: (
      <>
        Each lane has a signal over it. <span className="mood-word good">Green</span> means every slot runs. <span className="mood-word warn">Amber</span>{' '}
        means more trucks than work. <span className="mood-word bad">Red</span> means trucks on a closed chain. They will strand.
      </>
    ),
    anchor: '[data-tour="dock"]',
    shot: { kind: 'overview' },
    select: null,
    place: 'center',
  },
  {
    title: 'Commit your slots',
    body: (
      <>
        Split 40 slots across lanes and powertrains here. <Kbd>Shift</Kbd>-click moves five at a time. Open a lane to read its chains event by event.
      </>
    ),
    anchor: '[data-tour="plan"]',
    tab: 'plan',
    place: 'left',
  },
  {
    title: 'The event desk',
    body: (
      <>
        Three actions a quarter. <b>Back</b> what your factory can build, like workshops, parts and finance. It lands next quarter. <b>Lean on</b> grids, borders and
        shippers. Their dates hold more often. Not always. Or just click a building on the map.
      </>
    ),
    anchor: '[data-tour="tab-desk"]',
    tab: 'desk',
    place: 'left',
  },
  {
    title: 'Run the quarter',
    body: (
      <>
        Trucks that can leave, leave. The rest stay grey in the yard. The <b>old deck</b> runs the same quarter beside you, with 40% electric. Carbon counts only on
        trucks that ran.
      </>
    ),
    anchor: '[data-tour="run"]',
    tab: 'plan',
    place: 'left',
  },
  {
    title: 'Four quarters to 2031',
    body: (
      <>
        The target tightens every quarter, from <b>80</b> to <b>60</b>. Between quarters the world moves. Some dates show. Some do not. A tip for the first run:{' '}
        <b>load the old deck, run it, and see where it breaks.</b>
      </>
    ),
    anchor: '[data-tour="timeline"]',
    place: 'bottom',
    tab: 'plan',
  },
];

export function Tour({
  step,
  setStep,
  onEnd,
  shot,
  setTab,
  select,
}: {
  step: number;
  setStep: (n: number) => void;
  onEnd: () => void;
  shot: (s: Shot) => void;
  setTab: (t: Tab) => void;
  select: (id: CorridorId | null) => void;
}) {
  const s = STEPS[step];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (s.shot) shot(s.shot);
    if (s.tab) setTab(s.tab);
    if (s.select !== undefined) select(s.select);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!s.anchor) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(s.anchor!);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const t = window.setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [step, s.anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') step < STEPS.length - 1 ? setStep(step + 1) : onEnd();
      else if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
      else if (e.key === 'Escape') onEnd();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, setStep, onEnd]);

  const pad = 8;
  const hole = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  let cardStyle: React.CSSProperties = {};
  if (hole && s.place === 'left') {
    cardStyle = { left: Math.max(16, hole.left - 380), top: Math.min(window.innerHeight - 300, Math.max(16, hole.top + Math.min(hole.height, 240) / 2 - 100)) };
  } else if (hole && s.place === 'bottom') {
    cardStyle = { left: Math.max(16, hole.left), top: hole.top + hole.height + 14 };
  } else if (hole && s.place === 'center') {
    cardStyle = { left: Math.max(16, hole.left), top: Math.max(16, hole.top - 250) };
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tour step ${step + 1} of ${STEPS.length}: ${s.title}`}>
      {hole ? <div className="tour-hole" style={hole} /> : <div className="tour-veil" />}
      <div className={`coach ${hole ? '' : 'coach-free'}`} style={cardStyle} key={step}>
        <div className="coach-top">
          <span className="eyebrow">
            {step + 1} / {STEPS.length}
          </span>
          <button className="link-btn small" onClick={onEnd}>
            Skip tour
          </button>
        </div>
        <h3>{s.title}</h3>
        <div className="coach-body">{s.body}</div>
        <div className="coach-foot">
          <span className="coach-dots" aria-hidden>
            {STEPS.map((_, i) => (
              <i key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
            ))}
          </span>
          {step > 0 && (
            <button className="btn-ghost small" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button className="cta cta-inline small" onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : onEnd())} autoFocus>
            <span>{step < STEPS.length - 1 ? 'Next' : 'Start Q3 2030'}</span>
            {Icon.arrow}
          </button>
        </div>
      </div>
    </div>
  );
}
