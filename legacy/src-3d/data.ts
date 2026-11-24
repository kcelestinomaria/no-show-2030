// Seed for one replacement cycle. Every number the engine uses lives here.

export type Powertrain = 'diesel' | 'gas' | 'electric';
export type EventState = 'in motion' | 'adjacent' | 'thin';
export type Depth = 'thick' | 'adjacent' | 'thin' | 'empty';
export type CorridorId = 'sto-ruhr' | 'mad-lyon' | 'mba-kla' | 'jnb-lun';

export interface ChainEvent {
  label: string;
  state: EventState;
}

export interface Corridor {
  id: CorridorId;
  name: string;
  from: string;
  to: string;
  km: number;
  region: string;
  points: number;
  note: string;
  depth: Record<Powertrain, Depth>;
  chains: Record<Powertrain, ChainEvent[]>;
  /** Carbon side-events. Only `in motion` changes intensity. */
  biodiesel: EventState;
  grid: EventState;
}

export const POWERTRAINS: Powertrain[] = ['diesel', 'gas', 'electric'];

export const PT_LABEL: Record<Powertrain, string> = {
  diesel: 'Diesel',
  gas: 'Gas',
  electric: 'Electric',
};

export const SLOT_CAP = 40;
export const TARGET = 80;
export const OPEN_THRESHOLD = 0.75;
export const RUN_MS = 700;

export const EVENT_VALUE: Record<EventState, number> = {
  'in motion': 1,
  adjacent: 0.5,
  thin: 0,
};

/** CO2e per km, relative to fossil diesel on the same lane. */
export const INTENSITY = {
  dieselFossil: 100,
  dieselBio: 40,
  gas: 75,
  electricLiveGrid: 35,
};

export const MONEY = {
  payoutPerPoint: 5,
  costPerSlot: 2,
  strandedExtra: 3,
  costPerSpare: 0.5,
};

/** Year scenario, 2030 electric. Spread by contract points. */
export const OLD_DECK_MIX: Record<Powertrain, number> = {
  diesel: 0.5,
  gas: 0.1,
  electric: 0.4,
};

export const OLD_DECK_LABEL = 'Year scenario, 2030 electric';

export const CORRIDORS: Corridor[] = [
  {
    id: 'sto-ruhr',
    name: 'Stockholm – Ruhr',
    from: 'Stockholm',
    to: 'Ruhr',
    km: 1450,
    region: 'EU core',
    points: 12,
    note: 'Charger pilot exists. Finance does not.',
    depth: { diesel: 'thick', gas: 'adjacent', electric: 'adjacent' },
    chains: {
      diesel: [
        { label: 'Fuel at every stop', state: 'in motion' },
        { label: 'Workshops on the lane', state: 'in motion' },
        { label: 'Residual value a bank will finance', state: 'in motion' },
        { label: 'Drivers know the truck', state: 'in motion' },
      ],
      gas: [
        { label: 'LNG stations on the spine', state: 'in motion' },
        { label: 'Bio-LNG at a price that holds', state: 'adjacent' },
        { label: 'Workshops that service gas', state: 'adjacent' },
        { label: 'Residual value a bank will finance', state: 'thin' },
      ],
      electric: [
        { label: 'Megawatt charger on the spine', state: 'in motion' },
        { label: 'Driver break covers the charge stop', state: 'in motion' },
        { label: 'Payload penalty accepted by shipper', state: 'thin' },
        { label: 'Residual value a bank will finance', state: 'thin' },
      ],
    },
    biodiesel: 'in motion',
    grid: 'in motion',
  },
  {
    id: 'mad-lyon',
    name: 'Madrid – Lyon',
    from: 'Madrid',
    to: 'Lyon',
    km: 1100,
    region: 'Southern EU',
    points: 8,
    note: 'Chargers and tariff exist as dates on a slide.',
    depth: { diesel: 'thick', gas: 'thin', electric: 'thin' },
    chains: {
      diesel: [
        { label: 'Fuel at every stop', state: 'in motion' },
        { label: 'Workshops on the lane', state: 'in motion' },
        { label: 'Residual value a bank will finance', state: 'in motion' },
        { label: 'Drivers know the truck', state: 'in motion' },
      ],
      gas: [
        { label: 'LNG stations on the spine', state: 'thin' },
        { label: 'Gas price below diesel on this lane', state: 'thin' },
        { label: 'Workshop that services gas', state: 'adjacent' },
        { label: 'Finance offer signed by a fleet', state: 'thin' },
      ],
      electric: [
        { label: 'Truck chargers on the spine', state: 'thin' },
        { label: 'Tariff that beats diesel on this lane', state: 'thin' },
        { label: 'Workshop that can touch the pack', state: 'adjacent' },
        { label: 'Finance offer signed by a fleet', state: 'thin' },
      ],
    },
    biodiesel: 'thin',
    grid: 'thin',
  },
  {
    id: 'mba-kla',
    name: 'Mombasa – Kampala',
    from: 'Mombasa',
    to: 'Kampala',
    km: 1150,
    region: 'Northern Corridor',
    points: 10,
    note: 'Electric is empty here. Nothing in its chain has closed.',
    depth: { diesel: 'thick', gas: 'thin', electric: 'empty' },
    chains: {
      diesel: [
        { label: 'Fuel at every stop', state: 'in motion' },
        { label: 'Workshops in Nairobi and Kampala', state: 'in motion' },
        { label: 'Parts on the shelf', state: 'in motion' },
        { label: 'Resale market for used trucks', state: 'in motion' },
      ],
      gas: [
        { label: 'Gas supply on the corridor', state: 'thin' },
        { label: 'Stations at both ends', state: 'thin' },
        { label: 'Parts on the shelf in Nairobi', state: 'adjacent' },
        { label: 'Finance desk for gas trucks', state: 'thin' },
      ],
      electric: [
        { label: 'Depot power at both ends', state: 'thin' },
        { label: 'Border time predictable inside a driver shift', state: 'thin' },
        { label: 'Parts on the shelf in Nairobi', state: 'adjacent' },
        { label: 'Customer will take a payload cut', state: 'thin' },
      ],
    },
    biodiesel: 'thin',
    grid: 'thin',
  },
  {
    id: 'jnb-lun',
    name: 'Johannesburg – Lusaka',
    from: 'Johannesburg',
    to: 'Lusaka',
    km: 1600,
    region: 'SADC',
    points: 10,
    note: 'The border queue sets the clock for every powertrain.',
    depth: { diesel: 'thick', gas: 'adjacent', electric: 'thin' },
    chains: {
      diesel: [
        { label: 'Fuel at every stop', state: 'in motion' },
        { label: 'Workshop coverage on the lane', state: 'in motion' },
        { label: 'Parts on the shelf', state: 'in motion' },
        { label: 'Resale market for used trucks', state: 'in motion' },
      ],
      gas: [
        { label: 'CNG at both ends', state: 'in motion' },
        { label: 'Workshop coverage on the lane', state: 'adjacent' },
        { label: 'Gas price that beats diesel', state: 'adjacent' },
        { label: 'Border queue inside one shift', state: 'thin' },
      ],
      electric: [
        { label: 'Border queue inside one shift', state: 'thin' },
        { label: 'Public charger a truck can use', state: 'thin' },
        { label: 'Workshop coverage on the lane', state: 'adjacent' },
        { label: 'Fleet owner has the cash this cycle', state: 'thin' },
      ],
    },
    biodiesel: 'thin',
    grid: 'thin',
  },
];
