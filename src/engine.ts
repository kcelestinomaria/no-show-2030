// Rules. Pure functions only: same commit in, same book out.

import {
  CORRIDORS,
  EVENT_VALUE,
  INTENSITY,
  MONEY,
  OLD_DECK_MIX,
  OPEN_THRESHOLD,
  POWERTRAINS,
  SLOT_CAP,
  TARGET,
  type ChainEvent,
  type Corridor,
  type CorridorId,
  type Powertrain,
} from './data';

export type Commit = Record<CorridorId, Record<Powertrain, number>>;

export interface Chain {
  sum: number;
  n: number;
  score: number;
  open: boolean;
}

export interface LineResult {
  slots: number;
  won: number;
  idle: number;
  /** Electric or gas slots that could not run. They pay the extra penalty. */
  stranded: number;
}

export interface CorridorResult {
  pointsWon: number;
  lines: Record<Powertrain, LineResult>;
}

export interface Result {
  corridors: Record<CorridorId, CorridorResult>;
  committed: number;
  spare: number;
  pointsWon: number;
  pointsAvailable: number;
  payout: number;
  slotCost: number;
  strandedPenalty: number;
  spareCost: number;
  cash: number;
  contractsKept: number;
  idle: number;
  stranded: number;
  strandedElectric: number;
  /** CO2e per km on slots that won work. Null when nothing ran. */
  intensity: number | null;
  met: boolean;
  verdict: string;
}

export const VERDICT = {
  factoryIdle: 'You kept the factory idle.',
  builtYear: 'You built the year. The haulier did not buy it.',
  trucksLeft: 'The trucks that could leave, left.',
  heldSpare: 'You held spare for events that had not happened.',
  mixed: 'Mixed book. Look at which chain was still thin.',
};

export function chainOf(events: ChainEvent[]): Chain {
  const sum = events.reduce((acc, e) => acc + EVENT_VALUE[e.state], 0);
  const n = events.length;
  const score = n === 0 ? 0 : sum / n;
  return { sum, n, score, open: score >= OPEN_THRESHOLD };
}

export function chainFor(c: Corridor, pt: Powertrain): Chain {
  return chainOf(c.chains[pt]);
}

/** A slot runs only if its chain is open, and electric also needs a grid in motion. */
export function canRun(c: Corridor, pt: Powertrain): boolean {
  if (!chainFor(c, pt).open) return false;
  if (pt === 'electric') return c.grid === 'in motion';
  return true;
}

/** Intensity of a running slot on this lane. Null means it cannot run, so it never enters the average. */
export function intensityFor(c: Corridor, pt: Powertrain): number | null {
  if (pt === 'diesel') return c.biodiesel === 'in motion' ? INTENSITY.dieselBio : INTENSITY.dieselFossil;
  if (pt === 'gas') return INTENSITY.gas;
  return c.grid === 'in motion' ? INTENSITY.electricLiveGrid : null;
}

export function emptyCommit(): Commit {
  const commit = {} as Commit;
  for (const c of CORRIDORS) commit[c.id] = { diesel: 0, gas: 0, electric: 0 };
  return commit;
}

export function committedSlots(commit: Commit): number {
  let total = 0;
  for (const c of CORRIDORS) for (const pt of POWERTRAINS) total += commit[c.id][pt];
  return total;
}

export function sameCommit(a: Commit, b: Commit): boolean {
  return CORRIDORS.every((c) => POWERTRAINS.every((pt) => a[c.id][pt] === b[c.id][pt]));
}

/** Step one stepper. `blocked` is true when the player tried to pass the cap. */
export function stepCommit(
  commit: Commit,
  id: CorridorId,
  pt: Powertrain,
  delta: number,
): { commit: Commit; blocked: boolean } {
  const current = commit[id][pt];
  const next = Math.max(0, current + delta);
  if (next === current) return { commit, blocked: false };
  if (delta > 0 && committedSlots(commit) + (next - current) > SLOT_CAP) return { commit, blocked: true };
  return { commit: { ...commit, [id]: { ...commit[id], [pt]: next } }, blocked: false };
}

/** The year-scenario commit: fixed mix, spread across corridors by contract points (largest remainder). */
export function oldDeckCommit(): Commit {
  const commit = emptyCommit();
  const totalPoints = CORRIDORS.reduce((acc, c) => acc + c.points, 0);
  for (const pt of POWERTRAINS) {
    const total = Math.round(SLOT_CAP * OLD_DECK_MIX[pt]);
    const quotas = CORRIDORS.map((c, i) => ({ i, q: (total * c.points) / totalPoints }));
    let given = 0;
    for (const { i, q } of quotas) {
      commit[CORRIDORS[i].id][pt] = Math.floor(q);
      given += Math.floor(q);
    }
    const byRemainder = [...quotas].sort((a, b) => b.q - Math.floor(b.q) - (a.q - Math.floor(a.q)) || a.i - b.i);
    for (let k = 0; given < total; k++, given++) commit[CORRIDORS[byRemainder[k].i].id][pt] += 1;
  }
  return commit;
}

function weightedIntensity(rows: { slots: number; km: number; k: number }[]): number | null {
  let km = 0;
  let co2 = 0;
  for (const r of rows) {
    km += r.slots * r.km;
    co2 += r.slots * r.km * r.k;
  }
  return km === 0 ? null : co2 / km;
}

export function resolve(commit: Commit, world: Corridor[] = CORRIDORS): Result {
  const committed = committedSlots(commit);
  const spare = SLOT_CAP - committed;
  const corridors = {} as Record<CorridorId, CorridorResult>;
  const running: { slots: number; km: number; k: number }[] = [];
  let pointsWon = 0;
  let pointsAvailable = 0;
  let idle = 0;
  let stranded = 0;
  let strandedElectric = 0;

  for (const c of world) {
    pointsAvailable += c.points;
    let remaining = c.points;
    const lines = {} as Record<Powertrain, LineResult>;
    // Diesel first: the haulier buys the truck that can leave tomorrow.
    for (const pt of POWERTRAINS) {
      const slots = commit[c.id][pt];
      const runs = canRun(c, pt);
      const won = runs ? Math.min(slots, remaining) : 0;
      remaining -= won;
      const lineStranded = !runs && pt !== 'diesel' ? slots : 0;
      lines[pt] = { slots, won, idle: slots - won, stranded: lineStranded };
      idle += slots - won;
      stranded += lineStranded;
      if (pt === 'electric') strandedElectric += lineStranded;
      const k = intensityFor(c, pt);
      if (won > 0 && k !== null) running.push({ slots: won, km: c.km, k });
    }
    corridors[c.id] = { pointsWon: c.points - remaining, lines };
    pointsWon += c.points - remaining;
  }

  const factoryIdle = committed === 0;
  const payout = pointsWon * MONEY.payoutPerPoint;
  const slotCost = committed * MONEY.costPerSlot;
  const strandedPenalty = stranded * MONEY.strandedExtra;
  const spareCost = factoryIdle ? 0 : spare * MONEY.costPerSpare;
  const cash = payout - slotCost - strandedPenalty - spareCost;
  const contractsKept = pointsAvailable === 0 ? 0 : pointsWon / pointsAvailable;
  const intensity = weightedIntensity(running);

  const base = {
    corridors,
    committed,
    spare,
    pointsWon,
    pointsAvailable,
    payout,
    slotCost,
    strandedPenalty,
    spareCost,
    cash,
    contractsKept,
    idle,
    stranded,
    strandedElectric,
    intensity,
    met: intensity !== null && intensity <= TARGET,
  };
  return { ...base, verdict: verdictFor(base) };
}

export function verdictFor(r: Pick<Result, 'committed' | 'strandedElectric' | 'contractsKept' | 'stranded' | 'cash'>): string {
  if (r.committed === 0) return VERDICT.factoryIdle;
  if (r.strandedElectric > 6) return VERDICT.builtYear;
  if (r.contractsKept > 0.7 && r.stranded === 0) return VERDICT.trucksLeft;
  if (r.cash > 80) return VERDICT.heldSpare;
  return VERDICT.mixed;
}

/** What the commit claims if every committed truck ran at its nameplate intensity. The old deck's arithmetic. */
export function paperIntensity(commit: Commit, world: Corridor[] = CORRIDORS): number | null {
  const rows: { slots: number; km: number; k: number }[] = [];
  for (const c of world) {
    for (const pt of POWERTRAINS) {
      const k = intensityFor(c, pt) ?? INTENSITY.electricLiveGrid;
      rows.push({ slots: commit[c.id][pt], km: c.km, k });
    }
  }
  return weightedIntensity(rows);
}
