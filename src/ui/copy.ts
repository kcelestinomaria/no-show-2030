// Every explainer in one place. Short, concrete, no hedging.

export type Term =
  | 'slot'
  | 'chain'
  | 'open'
  | 'inMotion'
  | 'adjacent'
  | 'thin'
  | 'points'
  | 'idle'
  | 'stranded'
  | 'spare'
  | 'intensity'
  | 'paper'
  | 'oldDeck'
  | 'target'
  | 'desk'
  | 'back'
  | 'lean'
  | 'mood'
  | 'treasury'
  | 'depth';

export const TERMS: Record<Term, { title: string; body: string }> = {
  slot: {
    title: 'Factory slot',
    body: 'One truck your factory can build this quarter. You have 40. Every slot you commit costs 2, whether the truck runs or not.',
  },
  chain: {
    title: 'Chain',
    body: 'Four things a haulier needs to be true before signing for a truck: fuel, workshops, finance, time at the border. Each lane has one chain per powertrain.',
  },
  open: {
    title: 'Open chain',
    body: 'A chain is open when its events average ¾ or more. In motion counts 1, adjacent ½, thin 0. Only open chains run trucks. Electric also needs a live grid.',
  },
  inMotion: {
    title: 'In motion',
    body: 'It is happening: built, signed, priced, staffed. On the map it stands solid with its lights on.',
  },
  adjacent: {
    title: 'Adjacent',
    body: 'A pilot, a letter of intent, a half-built site. Counts ½. On the map it sits inside scaffolding.',
  },
  thin: {
    title: 'Thin',
    body: 'A date on a slide. It counts nothing until it shows up. On the map it is a hologram.',
  },
  points: {
    title: 'Contract points',
    body: 'Work on the lane. Each point a running truck wins pays 5. The haulier buys diesel first: the truck that can leave tomorrow.',
  },
  idle: {
    title: 'Idle',
    body: 'Built, not bought. The slot cost is paid and nothing comes back. Idle trucks stay in the yard.',
  },
  stranded: {
    title: 'Stranded',
    body: 'A gas or electric truck on a closed chain. It cannot run at all, and costs 3 more than an idle slot.',
  },
  spare: {
    title: 'Spare',
    body: 'Capacity you did not commit. Each spare slot costs 0.5, unless you build nothing at all.',
  },
  intensity: {
    title: 'CO₂e per km',
    body: 'Averaged over trucks that actually ran, weighted by lane length. Fossil diesel 100, biodiesel 40, gas 75, electric on a live grid 35.',
  },
  paper: {
    title: 'On paper',
    body: 'What your commit claims if every truck ran at its nameplate. The old deck’s arithmetic. The real number comes after the quarter runs.',
  },
  oldDeck: {
    title: 'The old deck',
    body: 'A year scenario: 50% diesel, 10% gas, 40% electric by 2030, spread by contract points. It plays every quarter beside you, in the same world, and never changes its mind.',
  },
  target: {
    title: 'Carbon target',
    body: 'A cap on CO₂e/km of the trucks that ran. −20% this quarter, tightening to −40%. Every point over the cap costs 1 in fines.',
  },
  desk: {
    title: 'Event desk',
    body: 'Three actions a quarter. Back an event you own and it lands next quarter. Lean on an outside actor and its date is more likely to hold. It still might not.',
  },
  back: {
    title: 'Back',
    body: 'Your factory makes it happen: a workshop, a parts shelf, a finance offer, a buy-back guarantee. Thin → adjacent costs 10, adjacent → in motion 16. Lands at the start of next quarter.',
  },
  lean: {
    title: 'Lean on',
    body: 'Co-fund, lobby, sign a letter. Costs 8 and adds 25% to the chance the event shows on its date. Twice at most. Grids, borders and shippers keep their own clocks.',
  },
  mood: {
    title: 'Lane signal',
    body: 'The diamond over each lane. Green: every slot here can run. Amber: more slots than work, so some will idle. Red: slots on a closed chain. Grey: nothing committed.',
  },
  treasury: {
    title: 'Treasury',
    body: 'Cash carried between quarters. Desk actions are paid from it. Each quarter adds what the trucks earned, minus slots, strandings, spare capacity and fines.',
  },
  depth: {
    title: 'Depth',
    body: 'How established the powertrain is on this lane: thick, adjacent, thin or empty. Context, not a rule. The chain decides.',
  },
};

export const THESIS = 'A date is not a future. An event is. A truck that does not run does not cut carbon.';
export const LIMIT_LINE = 'Not in the room: the driver, the clearing agent, the grid.';
