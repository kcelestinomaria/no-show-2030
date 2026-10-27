// Campaign layer. Four quarters on top of the one-quarter engine.
// Same seed + same actions in, same world out. No Math.random anywhere.

import { CORRIDORS, POWERTRAINS, type Corridor, type CorridorId, type EventState, type Powertrain } from './data';
import { emptyCommit, oldDeckCommit, resolve, type Commit, type Result } from './engine';

/* ───────────────────────── Calendar ───────────────────────── */

export const QUARTERS = ['Q3 2030', 'Q4 2030', 'Q1 2031', 'Q2 2031'];
export const QUARTER_SHORT = ["Q3 '30", "Q4 '30", "Q1 '31", "Q2 '31"];
/** CO2e/km target per quarter, fossil diesel = 100. Q3 2030 is the original −20%. */
export const TARGETS = [80, 75, 70, 60];
export const LAST_Q = QUARTERS.length - 1;

export const START_CASH = 20;
export const DESK_ACTIONS = 3;
export const FINE_PER_POINT = 1;
export const BACK_COST: Record<'thin' | 'adjacent', number> = { thin: 10, adjacent: 16 };
export const LEAN_COST = 8;
export const LEAN_BONUS = 0.25;

export const quarterLabel = (q: number) => QUARTERS[q] ?? `beyond ${QUARTERS[LAST_Q]}`;

/* ───────────────────────── Actors ───────────────────────── */

export type Actor = 'you' | 'grid' | 'cpo' | 'fuel' | 'bank' | 'shipper' | 'border' | 'fleet' | 'state';

export const ACTOR: Record<Actor, { name: string; short: string }> = {
  you: { name: 'Your factory', short: 'You' },
  grid: { name: 'Grid operator', short: 'Grid' },
  cpo: { name: 'Charge-point operator', short: 'Chargers' },
  fuel: { name: 'Fuel supplier', short: 'Fuel' },
  bank: { name: 'Lender', short: 'Bank' },
  shipper: { name: 'Shipper', short: 'Shipper' },
  border: { name: 'Border agency', short: 'Border' },
  fleet: { name: 'Fleet owner', short: 'Fleet' },
  state: { name: 'Regulator', short: 'State' },
};

/* ───────────────────────── Event keys ───────────────────────── */

export type Side = 'biodiesel' | 'grid';
export type EventKey = string;

export const chainKey = (id: CorridorId, pt: Powertrain, i: number): EventKey => `${id}/${pt}/${i}`;
export const sideKey = (id: CorridorId, side: Side): EventKey => `${id}/${side}`;

export interface EventMeta {
  who: Actor;
  /** Quarter index the actor says it will show. Only for outside actors. */
  due?: number;
  /** Chance it shows on its date. */
  p?: number;
  /** Events that are the same fact in the world move together. */
  ref?: string;
  /** What backing it means, for your own levers. */
  lever?: string;
}

/** Only events that are not already in motion need an owner. */
export const EVENT_META: Record<EventKey, EventMeta> = {
  // Stockholm – Ruhr
  'sto-ruhr/gas/1': { who: 'fuel', due: 2, p: 0.6 },
  'sto-ruhr/gas/2': { who: 'you', lever: 'Train dealer workshops on gas' },
  'sto-ruhr/gas/3': { who: 'you', lever: 'Buy-back guarantee on gas trucks' },
  'sto-ruhr/electric/2': { who: 'shipper', due: 1, p: 0.5 },
  'sto-ruhr/electric/3': { who: 'you', lever: 'Buy-back guarantee on electric trucks' },

  // Madrid – Lyon
  'mad-lyon/gas/0': { who: 'fuel', due: 2, p: 0.5 },
  'mad-lyon/gas/1': { who: 'fuel', due: 3, p: 0.4 },
  'mad-lyon/gas/2': { who: 'you', lever: 'Certify a gas workshop on the lane' },
  'mad-lyon/gas/3': { who: 'you', lever: 'Captive finance offer for gas' },
  'mad-lyon/electric/0': { who: 'cpo', due: 1, p: 0.45 },
  'mad-lyon/electric/1': { who: 'state', due: 2, p: 0.4 },
  'mad-lyon/electric/2': { who: 'you', lever: 'High-voltage training for one workshop' },
  'mad-lyon/electric/3': { who: 'you', lever: 'Captive finance offer for electric' },
  'mad-lyon/biodiesel': { who: 'fuel', due: 2, p: 0.6 },
  'mad-lyon/grid': { who: 'grid', due: 2, p: 0.5 },

  // Mombasa – Kampala
  'mba-kla/gas/0': { who: 'fuel', due: 3, p: 0.3 },
  'mba-kla/gas/1': { who: 'fuel', due: 3, p: 0.3 },
  'mba-kla/gas/2': { who: 'you', lever: 'Stock gas parts in Nairobi' },
  'mba-kla/gas/3': { who: 'you', lever: 'Open a finance desk for gas' },
  'mba-kla/electric/0': { who: 'grid', due: 2, p: 0.35 },
  'mba-kla/electric/1': { who: 'border', due: 3, p: 0.3 },
  'mba-kla/electric/2': { who: 'you', lever: 'Stock pack parts in Nairobi' },
  'mba-kla/electric/3': { who: 'shipper', due: 2, p: 0.4 },
  'mba-kla/biodiesel': { who: 'fuel', due: 1, p: 0.5 },
  'mba-kla/grid': { who: 'grid', due: 3, p: 0.3 },

  // Johannesburg – Lusaka
  'jnb-lun/gas/1': { who: 'you', lever: 'Gas service contracts on the lane' },
  'jnb-lun/gas/2': { who: 'fuel', due: 1, p: 0.55 },
  'jnb-lun/gas/3': { who: 'border', due: 2, p: 0.35, ref: 'jnb-border' },
  'jnb-lun/electric/0': { who: 'border', due: 2, p: 0.35, ref: 'jnb-border' },
  'jnb-lun/electric/1': { who: 'cpo', due: 2, p: 0.4 },
  'jnb-lun/electric/2': { who: 'you', lever: 'High-voltage service on the lane' },
  'jnb-lun/electric/3': { who: 'fleet', due: 3, p: 0.4 },
  'jnb-lun/biodiesel': { who: 'fuel', due: 2, p: 0.4 },
  'jnb-lun/grid': { who: 'grid', due: 3, p: 0.3 },
};

export function metaFor(key: EventKey): EventMeta {
  return EVENT_META[key] ?? { who: inferWho(key) };
}

/** Events already in motion still have an owner for tooltips. */
function inferWho(key: EventKey): Actor {
  if (key.endsWith('/biodiesel')) return 'fuel';
  if (key.endsWith('/grid')) return 'grid';
  const label = labelOf(key).toLowerCase();
  if (/charger/.test(label)) return 'cpo';
  if (/fuel|lng|cng|gas supply|bio/.test(label)) return 'fuel';
  if (/bank|residual|finance|resale/.test(label)) return 'bank';
  if (/driver/.test(label)) return 'fleet';
  if (/border/.test(label)) return 'border';
  if (/workshop|parts/.test(label)) return 'you';
  return 'state';
}

/* ───────────────────────── World ───────────────────────── */

export type States = Record<EventKey, EventState>;

export function baseStates(): States {
  const s: States = {};
  for (const c of CORRIDORS) {
    for (const pt of POWERTRAINS) c.chains[pt].forEach((e, i) => (s[chainKey(c.id, pt, i)] = e.state));
    s[sideKey(c.id, 'biodiesel')] = c.biodiesel;
    s[sideKey(c.id, 'grid')] = c.grid;
  }
  return s;
}

export function worldOf(states: States): Corridor[] {
  return CORRIDORS.map((c) => ({
    ...c,
    chains: Object.fromEntries(
      POWERTRAINS.map((pt) => [pt, c.chains[pt].map((e, i) => ({ ...e, state: states[chainKey(c.id, pt, i)] ?? e.state }))]),
    ) as Corridor['chains'],
    biodiesel: states[sideKey(c.id, 'biodiesel')] ?? c.biodiesel,
    grid: states[sideKey(c.id, 'grid')] ?? c.grid,
  }));
}

export function labelOf(key: EventKey): string {
  const [id, a, i] = key.split('/');
  const c = CORRIDORS.find((x) => x.id === id)!;
  if (a === 'biodiesel') return 'Biodiesel at the pump';
  if (a === 'grid') return 'Grid power that is clean and live';
  return c.chains[a as Powertrain][Number(i)].label;
}

export function corridorOf(key: EventKey): Corridor {
  return CORRIDORS.find((c) => c.id === key.split('/')[0])!;
}

export function powertrainOf(key: EventKey): Powertrain | null {
  const a = key.split('/')[1];
  return (POWERTRAINS as string[]).includes(a) ? (a as Powertrain) : null;
}

export const nextState = (s: EventState): EventState => (s === 'thin' ? 'adjacent' : 'in motion');

/** All keys that share a ref with this one, itself included. */
export function linked(key: EventKey): EventKey[] {
  const ref = EVENT_META[key]?.ref;
  if (!ref) return [key];
  return Object.keys(EVENT_META).filter((k) => EVENT_META[k].ref === ref);
}

/** Deterministic [0,1) from seed, key and quarter. */
export function roll(seed: number, key: string, q: number): number {
  let h = 2166136261 ^ seed;
  const s = `${key}#${q}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/* ───────────────────────── Campaign state ───────────────────────── */

export type Phase = 'plan' | 'running' | 'report' | 'over';

export interface News {
  key: EventKey;
  kind: 'showed' | 'no-show' | 'landed';
  from: EventState;
  to: EventState;
  slipTo?: number;
}

export interface QuarterRecord {
  q: number;
  target: number;
  commit: Commit;
  result: Result;
  fine: number;
  deck: Result;
  deckFine: number;
  deskSpend: number;
  net: number;
  deckNet: number;
}

export interface Campaign {
  seed: number;
  q: number;
  phase: Phase;
  states: States;
  /** Your backed events. They land at the start of next quarter. */
  pending: Record<EventKey, true>;
  /** Lean bonus on the next due date. */
  lean: Record<EventKey, number>;
  /** Current announced quarter for outside events. */
  due: Record<EventKey, number>;
  actionsLeft: number;
  cash: number;
  deskSpend: number;
  commit: Commit;
  history: QuarterRecord[];
  news: News[];
}

export function newCampaign(seed = 2030): Campaign {
  const due: Record<EventKey, number> = {};
  for (const [k, m] of Object.entries(EVENT_META)) if (m.due !== undefined) due[k] = m.due;
  return {
    seed,
    q: 0,
    phase: 'plan',
    states: baseStates(),
    pending: {},
    lean: {},
    due,
    actionsLeft: DESK_ACTIONS,
    cash: START_CASH,
    deskSpend: 0,
    commit: emptyCommit(),
    history: [],
    news: [],
  };
}

export function fineFor(r: Result, target: number): number {
  if (r.intensity === null) return 0;
  return Math.max(0, Math.round((r.intensity - target) * FINE_PER_POINT * 10) / 10);
}

export type DeskCheck = { ok: true; cost: number } | { ok: false; why: string };

export function canBack(g: Campaign, key: EventKey): DeskCheck {
  const m = metaFor(key);
  const s = g.states[key];
  if (m.who !== 'you') return { ok: false, why: 'Not yours to build. You can only lean on it.' };
  if (s === 'in motion') return { ok: false, why: 'Already in motion.' };
  if (g.pending[key]) return { ok: false, why: 'Already underway. It lands next quarter.' };
  if (g.q >= LAST_Q) return { ok: false, why: 'No quarter left for it to land in.' };
  const cost = BACK_COST[s];
  if (g.actionsLeft <= 0) return { ok: false, why: 'No desk actions left this quarter.' };
  if (g.cash < cost) return { ok: false, why: `Needs ${cost} in the treasury.` };
  return { ok: true, cost };
}

export function canLean(g: Campaign, key: EventKey): DeskCheck {
  const m = metaFor(key);
  if (m.who === 'you') return { ok: false, why: 'Yours. Back it instead.' };
  if (g.states[key] === 'in motion') return { ok: false, why: 'Already in motion.' };
  const d = g.due[key];
  if (d === undefined || d > LAST_Q) return { ok: false, why: 'No date on any slide.' };
  if (d <= g.q) return { ok: false, why: 'Its date has passed.' };
  if ((g.lean[key] ?? 0) >= LEAN_BONUS * 2) return { ok: false, why: 'You have leaned as hard as you can.' };
  if (g.actionsLeft <= 0) return { ok: false, why: 'No desk actions left this quarter.' };
  if (g.cash < LEAN_COST) return { ok: false, why: `Needs ${LEAN_COST} in the treasury.` };
  return { ok: true, cost: LEAN_COST };
}

export function showChance(g: Campaign, key: EventKey): number {
  return Math.min(0.95, (metaFor(key).p ?? 0) + (g.lean[key] ?? 0));
}

export function back(g: Campaign, key: EventKey): Campaign {
  const c = canBack(g, key);
  if (!c.ok) return g;
  const pending = { ...g.pending };
  for (const k of linked(key)) pending[k] = true;
  return { ...g, pending, cash: g.cash - c.cost, deskSpend: g.deskSpend + c.cost, actionsLeft: g.actionsLeft - 1 };
}

export function lean(g: Campaign, key: EventKey): Campaign {
  const c = canLean(g, key);
  if (!c.ok) return g;
  const lean = { ...g.lean };
  for (const k of linked(key)) lean[k] = (lean[k] ?? 0) + LEAN_BONUS;
  return { ...g, lean, cash: g.cash - c.cost, deskSpend: g.deskSpend + c.cost, actionsLeft: g.actionsLeft - 1 };
}

/** Run the quarter. Your commit and the old deck face the same world. */
export function runQuarter(g: Campaign): Campaign {
  if (g.phase !== 'plan') return g;
  const world = worldOf(g.states);
  const target = TARGETS[g.q];
  const result = resolve(g.commit, world);
  const deck = resolve(oldDeckCommit(), world);
  const fine = fineFor(result, target);
  const deckFine = fineFor(deck, target);
  const net = result.cash - fine;
  const rec: QuarterRecord = {
    q: g.q,
    target,
    commit: g.commit,
    result,
    fine,
    deck,
    deckFine,
    deskSpend: g.deskSpend,
    net,
    deckNet: deck.cash - deckFine,
  };
  return { ...g, phase: 'running', cash: g.cash + net, history: [...g.history, rec] };
}

export function finishRun(g: Campaign): Campaign {
  return g.phase === 'running' ? { ...g, phase: 'report' } : g;
}

/** Close the books and open the next quarter: land backed events, roll the outside world. */
export function nextQuarter(g: Campaign): Campaign {
  if (g.phase !== 'report') return g;
  if (g.q >= LAST_Q) return { ...g, phase: 'over' };
  const q = g.q + 1;
  const states = { ...g.states };
  const due = { ...g.due };
  const lean = { ...g.lean };
  const news: News[] = [];
  const done = new Set<string>();

  for (const key of Object.keys(g.pending)) {
    const from = states[key];
    const to = nextState(from);
    states[key] = to;
    if (!done.has(key)) news.push({ key, kind: 'landed', from, to });
    linked(key).forEach((k) => done.add(k));
  }

  for (const key of Object.keys(due).sort()) {
    if (due[key] !== q || done.has(key)) continue;
    const group = linked(key);
    group.forEach((k) => done.add(k));
    const from = states[key];
    if (from === 'in motion') continue;
    const showed = roll(g.seed, EVENT_META[key].ref ?? key, q) < showChance(g, key);
    if (showed) {
      const to = nextState(from);
      for (const k of group) {
        states[k] = to;
        if (to === 'in motion') delete due[k];
        else due[k] = q + 1;
        delete lean[k];
      }
      news.push({ key, kind: 'showed', from, to });
    } else {
      const slipTo = q + 1 + (roll(g.seed, `${key}~slip`, q) < 0.35 ? 1 : 0);
      for (const k of group) due[k] = slipTo;
      news.push({ key, kind: 'no-show', from, to: from, slipTo });
    }
  }

  return {
    ...g,
    q,
    phase: 'plan',
    states,
    due,
    lean,
    pending: {},
    actionsLeft: DESK_ACTIONS,
    deskSpend: 0,
    news,
  };
}

/* ───────────────────────── Scoring ───────────────────────── */

export interface Final {
  you: number;
  deck: number;
  avgKept: number;
  lastMet: boolean;
  stars: { carbon: boolean; contracts: boolean; book: boolean };
  title: string;
}

export function finalOf(g: Campaign): Final {
  const h = g.history;
  const you = h.reduce((a, r) => a + r.net - r.deskSpend, 0);
  const deck = h.reduce((a, r) => a + r.deckNet, 0);
  const avgKept = h.length ? h.reduce((a, r) => a + r.result.contractsKept, 0) / h.length : 0;
  const last = h[h.length - 1];
  const lastMet = !!last && last.result.intensity !== null && last.result.intensity <= last.target;
  const stars = { carbon: lastMet, contracts: avgKept >= 0.75, book: you > deck };
  const n = Number(stars.carbon) + Number(stars.contracts) + Number(stars.book);
  const title =
    n === 3
      ? 'You built the events, then the trucks. They ran.'
      : stars.carbon && !stars.contracts
        ? 'Clean book, empty lanes. The haulier went elsewhere.'
        : stars.contracts && !stars.carbon
          ? 'Every lane served. The carbon did not move.'
          : n === 0
            ? 'The old deck would have done the same.'
            : 'Some chains closed. Not the ones the target needed.';
  return { you, deck, avgKept, lastMet, stars, title };
}

export function pendingCount(g: Campaign): number {
  return Object.keys(g.pending).length;
}
