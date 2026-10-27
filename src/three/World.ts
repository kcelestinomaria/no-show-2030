// The diorama. React owns the rules; this file only draws what it is told.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CORRIDORS, POWERTRAINS, type Corridor, type CorridorId, type EventState, type Powertrain } from '../data';
import type { Commit, Result } from '../engine';
import { chainKey, sideKey, type EventKey } from '../campaign';
import {
  COLOR,
  PT_COLOR,
  acacia,
  ball,
  box,
  cone,
  crane,
  cyl,
  hologramOf,
  mat,
  pulseHolograms,
  rng,
  scaffold,
  tree,
} from './kit';
import { buildProp, kindFor } from './props';

/* ───────────────────────── Layout ───────────────────────── */

export const LANE_Z = [-33, -11, 11, 33];
const TRUNK_X = -20;
const laneLen = (km: number) => 34 + (km / 1600) * 46;
const BAY_COLS = [-30.5, -37, -43.5, -50];
const BAY_ROWS = Array.from({ length: 10 }, (_, i) => -15.75 + i * 3.5);

const REGION: Record<string, { ground: number; edge: number; build: number[]; roof: number[]; tree: 'pine' | 'mixed' | 'acacia' }> = {
  'EU core': { ground: 0xb7c49c, edge: 0x95a57a, build: [0xd8cfc0, 0xb5543c, 0xe9e2d4, 0x8c8578], roof: [0x4a453c, 0x7a3b2b], tree: 'pine' },
  'Southern EU': { ground: 0xe2cd9a, edge: 0xc8ae74, build: [0xf1e6cf, 0xe8d3a8, 0xd9b48a], roof: [0xb8603a, 0xa6502f], tree: 'mixed' },
  'Northern Corridor': { ground: 0xd4a173, edge: 0xb7825a, build: [0xf3ece0, 0xe1d3bd, 0x9fb7a4], roof: [0x5b7f6a, 0x8c8578, 0x9e4a32], tree: 'acacia' },
  SADC: { ground: 0xd8c38c, edge: 0xbca468, build: [0xece3d2, 0xd4c3a3, 0xb7a990], roof: [0x6d6458, 0x9a5a3a], tree: 'acacia' },
};

export type Mood = 'none' | 'good' | 'warn' | 'bad';
const MOOD_COLOR: Record<Mood, number> = { none: 0xb8b0a1, good: 0x47b35a, warn: 0xe0a83a, bad: 0xc8452f };

export type Hover =
  | { kind: 'event'; key: EventKey; x: number; y: number }
  | { kind: 'lane'; id: CorridorId; x: number; y: number }
  | { kind: 'factory'; x: number; y: number }
  | { kind: 'truck'; id: CorridorId; pt: Powertrain; status: TruckStatus; x: number; y: number };

export type Shot = { kind: 'overview' } | { kind: 'factory' } | { kind: 'lane'; id: CorridorId } | { kind: 'event'; key: EventKey };

export interface View {
  world: Corridor[];
  states: Record<EventKey, EventState>;
  pending: Record<EventKey, true>;
  due: Record<EventKey, number>;
  commit: Commit;
  moods: Record<CorridorId, Mood>;
  selected: CorridorId | null;
  dueLabel: (q: number) => string;
  /** Not null while running or reporting: which bays ran. */
  result: Result | null;
  showLabels: boolean;
}

type TruckStatus = 'parked' | 'running' | 'idle' | 'stranded';

/* ───────────────────────── Sites ───────────────────────── */

class Site {
  root = new THREE.Group();
  private solid: THREE.Group;
  private holo: THREE.Group;
  private scaff: THREE.Group;
  private crane: THREE.Group;
  private lights: { mesh: THREE.Mesh; on: THREE.Material }[];
  private off = mat(COLOR.ink3);
  hit: THREE.Mesh;
  tag: CSS2DObject;
  tagEl: HTMLDivElement;
  state: EventState | null = null;
  pending = false;

  constructor(
    public key: EventKey,
    public lane: number,
    kind: ReturnType<typeof kindFor>,
    accent: number,
    scale: number,
  ) {
    const b = buildProp(kind, accent);
    this.solid = b.group;
    this.lights = b.lights.map((m) => ({ mesh: m, on: m.material as THREE.Material }));
    this.holo = hologramOf(b.group, accent);
    const [w, h, d] = b.size;
    this.scaff = scaffold(w, h * 0.62, d);
    this.crane = crane(h + 4);
    this.crane.position.set(w / 2 + 0.6, 0, -d / 2 - 0.2);
    this.root.add(this.solid, this.holo, this.scaff, this.crane);
    this.root.scale.setScalar(scale);

    const hitGeo = new THREE.BoxGeometry(w + 0.6, h + 1, d + 0.6);
    this.hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    this.hit.position.y = (h + 1) / 2;
    this.hit.userData = { kind: 'event', key };
    this.root.add(this.hit);

    this.tagEl = document.createElement('div');
    this.tagEl.className = 'tag3d';
    this.tag = new CSS2DObject(this.tagEl);
    this.tag.position.set(0, h + 1.6, 0);
    this.root.add(this.tag);
  }

  set(state: EventState, pending: boolean, label: string | null) {
    if (state !== this.state || pending !== this.pending) {
      this.state = state;
      this.pending = pending;
      this.solid.visible = state !== 'thin';
      this.holo.visible = state === 'thin';
      this.scaff.visible = state === 'adjacent';
      this.solid.scale.y = state === 'adjacent' ? 0.6 : 1;
      this.crane.visible = pending;
      for (const l of this.lights) l.mesh.material = state === 'in motion' ? l.on : this.off;
    }
    this.tagEl.textContent = label ?? '';
    this.tagEl.className = `tag3d ${pending ? 'tag-pending' : state === 'thin' ? 'tag-thin' : 'tag-adjacent'}`;
    this.tag.visible = !!label;
  }

  tick(t: number) {
    if (this.crane.visible) {
      const jib = this.crane.getObjectByName('jib');
      if (jib) jib.rotation.y = Math.sin(t * 0.6 + this.lane) * 0.9;
    }
  }
}

/* ───────────────────────── Trucks ───────────────────────── */

const cabIdle = mat(0x9a948a);
const trailerIdle = mat(0xcfc8bb);

class Truck {
  root = new THREE.Group();
  private cab: THREE.Mesh;
  private trailer: THREE.Mesh;
  private ring: THREE.Mesh;
  label: CSS2DObject;
  status: TruckStatus = 'parked';
  path: THREE.Vector3[] = [];
  cum: number[] = [];
  loopFrom = 0;
  s = 0;
  delay = 0;
  speed = 15;
  puffClock = 0;
  heading = 0;
  arrived = false;

  constructor(
    public id: CorridorId,
    public pt: Powertrain,
  ) {
    const c = PT_COLOR[pt];
    this.cab = box(1.3, 1.45, 1.62, c, 1.65, 0.55, 0);
    this.trailer = box(3.3, 1.75, 1.66, COLOR.white, -0.75, 0.58, 0);
    this.root.add(
      box(4.7, 0.3, 1.3, COLOR.ink2, 0, 0.32, 0),
      this.cab,
      box(0.06, 0.6, 1.3, COLOR.glass, 2.31, 1.2, 0),
      this.trailer,
      box(3.3, 0.22, 0.02, mat(c), -0.75, 1.1, 0.84),
      box(3.3, 0.22, 0.02, mat(c), -0.75, 1.1, -0.84),
    );
    if (pt === 'diesel') this.root.add(cyl(0.08, 1.1, COLOR.ink3, 0.95, 1.4, 0.7, 6));
    if (pt === 'gas') this.root.add(cyl(0.22, 0.9, COLOR.white, 0.95, 0.9, 0.55, 6));
    if (pt === 'electric') this.root.add(box(0.5, 0.12, 0.5, mat(0x7fb2ff, { emissive: 0x4a8bff }), 1.65, 2.0, 0));
    for (const x of [1.6, -0.3, -1.5]) {
      for (const z of [-0.7, 0.7]) {
        const w = cyl(0.36, 0.26, COLOR.tyre, x, 0, z);
        w.rotation.x = Math.PI / 2;
        w.position.y = 0.36;
        this.root.add(w);
      }
    }
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.9, 32), new THREE.MeshBasicMaterial({ color: COLOR.danger, transparent: true, opacity: 0.8 }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.08;
    this.ring.visible = false;
    this.root.add(this.ring);

    const el = document.createElement('div');
    el.className = 'stamp3d';
    this.label = new CSS2DObject(el);
    this.label.position.set(0, 3.4, 0);
    this.label.visible = false;
    this.root.add(this.label);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData = { kind: 'truck', truck: this };
    });
  }

  setStatus(s: TruckStatus) {
    this.status = s;
    const idle = s === 'idle' || s === 'stranded';
    this.cab.material = idle ? cabIdle : mat(PT_COLOR[this.pt]);
    this.trailer.material = idle ? trailerIdle : mat(COLOR.white);
    this.ring.visible = s === 'stranded';
    // Grey paint and the red ring say it; one summary pop over the yard says how many.
    this.label.visible = false;
    (this.label.element as HTMLDivElement).textContent = s === 'stranded' ? 'Stranded' : 'Idle';
    (this.label.element as HTMLDivElement).className = `stamp3d ${s === 'stranded' ? 'stamp-stranded' : ''}`;
  }

  setPath(points: THREE.Vector3[], loopFrom: number) {
    this.path = points;
    this.cum = [0];
    for (let i = 1; i < points.length; i++) this.cum.push(this.cum[i - 1] + points[i].distanceTo(points[i - 1]));
    this.loopFrom = loopFrom;
    this.s = 0;
    this.arrived = false;
  }

  /** Advance along the path; wraps on the loop part. */
  advance(dt: number, t: number) {
    if (this.status === 'stranded') {
      const k = 0.5 + 0.5 * Math.sin(t * 5);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.5 * k;
    }
    if (this.status !== 'running' || this.path.length < 2) return false;
    if (this.delay > 0) {
      this.delay -= dt;
      return false;
    }
    const total = this.cum[this.cum.length - 1];
    const loopS = this.cum[this.loopFrom];
    this.s += this.speed * dt;
    if (this.s > total) {
      this.arrived = true;
      this.s = loopS + ((this.s - loopS) % (total - loopS));
    }
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < this.s) i++;
    const a = this.path[i - 1];
    const b = this.path[i];
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const k = (this.s - this.cum[i - 1]) / seg;
    this.root.position.lerpVectors(a, b, k);
    const target = Math.atan2(-(b.z - a.z), b.x - a.x);
    let d = target - this.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.heading += d * Math.min(1, dt * 9);
    this.root.rotation.y = this.heading;
    return true;
  }

  dispose() {
    this.root.removeFromParent();
    this.label.element.remove();
  }
}

/* ───────────────────────── Puffs ───────────────────────── */

class Puffs {
  mesh: THREE.InstancedMesh;
  private life: Float32Array;
  private vel: THREE.Vector3[];
  private next = 0;
  private dummy = new THREE.Object3D();
  constructor(private n = 600) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.75 }),
      n,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.life = new Float32Array(n);
    this.vel = Array.from({ length: n }, () => new THREE.Vector3());
    this.dummy.scale.setScalar(0);
    for (let i = 0; i < n; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.mesh.frustumCulled = false;
  }
  emit(p: THREE.Vector3, color: number, size = 0.35) {
    const i = this.next++ % this.n;
    this.life[i] = 1;
    this.vel[i].set((Math.random() - 0.5) * 0.6, 1.4 + Math.random(), (Math.random() - 0.5) * 0.6);
    this.dummy.position.copy(p);
    this.dummy.scale.setScalar(size);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this.dummy.matrix);
    this.mesh.setColorAt(i, new THREE.Color(color));
    this.mesh.userData[i] = size;
  }
  tick(dt: number) {
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 0.7;
      this.mesh.getMatrixAt(i, m);
      m.decompose(pos, q, sc);
      pos.addScaledVector(this.vel[i], dt);
      const base = (this.mesh.userData[i] as number) ?? 0.35;
      const l = Math.max(0, this.life[i]);
      this.dummy.position.copy(pos);
      this.dummy.scale.setScalar(l > 0 ? base * (1 + (1 - l) * 2.2) * Math.min(1, l * 3) : 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/* ───────────────────────── World ───────────────────────── */

export interface WorldCallbacks {
  onHover: (h: Hover | null) => void;
  onSelect: (id: CorridorId | null) => void;
  onEventClick: (key: EventKey, x: number, y: number) => void;
  /** Beats during a run, for sound: a lane paid out, or trucks stranded. */
  onBeat?: (kind: 'coin' | 'stranded', i: number) => void;
}

export class World {
  private renderer: THREE.WebGLRenderer;
  private labels: CSS2DRenderer;
  private scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2(9, 9);
  private pointerPx = { x: 0, y: 0 };
  private hoverKey = '';
  private downAt = { x: 0, y: 0 };
  private sites = new Map<EventKey, Site>();
  private laneGroups: THREE.Group[] = [];
  private laneEdges: THREE.Mesh[] = [];
  private laneLabels: HTMLDivElement[] = [];
  private plumbobs: THREE.Mesh[] = [];
  private wires: THREE.Mesh[][] = [];
  private bays: Truck[] = [];
  private fleet: Truck[] = [];
  private puffs = new Puffs();
  private clouds: THREE.Group[] = [];
  private chimney = new THREE.Vector3();
  private pickables: THREE.Object3D[] = [];
  private fly: { from: [THREE.Vector3, THREE.Vector3]; to: [THREE.Vector3, THREE.Vector3]; t: number; dur: number } | null = null;
  private keys = new Set<string>();
  private sidebar = 0;
  private view: View | null = null;
  private runDone: (() => void) | null = null;
  private runClock = 0;
  private runStart = 0;
  private ringMarker: THREE.Mesh;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private pickDirty = true;
  private frame = 0;
  private shadowDirty = true;
  private dpr = Math.min(window.devicePixelRatio, 1.75);
  private perf = { acc: 0, n: 0 };
  private pops: { obj: CSS2DObject; life: number }[] = [];
  private beats: { at: number; fire: () => void }[] = [];

  constructor(
    private host: HTMLElement,
    private cb: WorldCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.shadowMap.enabled = true;
    // Shadows are redrawn only when something that casts one has moved.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'gl';
    host.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels';
    host.appendChild(this.labels.domElement);

    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 1200);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = 1.32;
    this.controls.minPolarAngle = 0.25;
    this.controls.minDistance = 22;
    this.controls.maxDistance = 330;
    this.controls.screenSpacePanning = false;
    this.controls.zoomSpeed = 0.9;
    this.controls.addEventListener('start', () => (this.fly = null));
    this.controls.addEventListener('change', () => (this.pickDirty = true));

    this.ringMarker = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 3.9, 48),
      new THREE.MeshBasicMaterial({ color: COLOR.ink, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.ringMarker.rotation.x = -Math.PI / 2;
    this.ringMarker.visible = false;
    this.scene.add(this.ringMarker);

    this.buildLights();
    this.buildTable();
    this.buildFactory();
    CORRIDORS.forEach((c, i) => this.buildLane(c, i));
    this.buildClouds();
    this.scene.add(this.puffs.mesh);

    this.shot({ kind: 'overview' }, true);
    this.resize();
    window.addEventListener('resize', this.resize);
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    this.loop();
  }

  /* ─────────── build ─────────── */

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6e6, 0xb9a98c, 1.15));
    const sun = new THREE.DirectionalLight(0xfff0d4, 2.4);
    sun.position.set(-70, 130, 80);
    sun.target.position.set(10, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -130;
    s.right = 130;
    s.top = 90;
    s.bottom = -90;
    s.near = 10;
    s.far = 400;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    this.scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.35);
    fill.position.set(80, 40, -60);
    this.scene.add(fill);
    this.scene.fog = new THREE.Fog(0xeee5d4, 380, 900);
  }

  private buildTable() {
    const maxL = Math.max(...CORRIDORS.map((c) => laneLen(c.km)));
    const x0 = -74;
    const x1 = maxL + 18;
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    const top = box(w, 4, 100, mat(0xf3ecdf, { rough: 0.95 }), cx, -4, 0);
    top.castShadow = false;
    const lip = box(w + 1.2, 0.6, 101.2, COLOR.ink, cx, -4.4, 0);
    lip.castShadow = false;
    const plinth = box(w - 6, 10, 94, mat(0xd8ccb6), cx, -14, 0);
    plinth.castShadow = false;
    this.scene.add(top, lip, plinth);

    // fine survey grid on the table
    const grid = new THREE.GridHelper(Math.max(w, 100), Math.round(Math.max(w, 100) / 4), 0xd9cfbd, 0xe6ddcc);
    grid.position.set(cx, 0.005, 0);
    grid.scale.z = 100 / Math.max(w, 100);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    this.scene.add(grid);

    // trunk road
    const trunk = box(3.2, 0.06, LANE_Z[3] - LANE_Z[0] + 3.2, COLOR.road, TRUNK_X, 0, 0);
    trunk.castShadow = false;
    this.scene.add(trunk);
    for (let z = LANE_Z[0] + 2; z < LANE_Z[3] - 1; z += 2.4) {
      const d = box(0.14, 0.02, 1.1, COLOR.roadLine, TRUNK_X, 0.06, z);
      d.castShadow = false;
      this.scene.add(d);
    }
  }

  private buildFactory() {
    const g = new THREE.Group();
    // yard
    const yard = box(44, 0.04, 44, mat(0xd9d2c4, { rough: 1 }), -44, 0, 0);
    yard.castShadow = false;
    g.add(yard);
    const line = mat(COLOR.white);
    for (const x of BAY_COLS) {
      for (const z of BAY_ROWS) {
        g.add(box(5.6, 0.02, 0.1, line, x, 0.04, z - 1.7), box(0.1, 0.02, 3.4, line, x - 2.8, 0.04, z));
      }
      g.add(box(5.6, 0.02, 0.1, line, x, 0.04, BAY_ROWS[9] + 1.8));
    }
    g.add(box(0.5, 0.02, 36, mat(COLOR.build), -27.2, 0.04, 0));

    // hall with sawtooth roof
    const hx = -61;
    g.add(box(10, 6, 34, mat(0xebe4d6), hx, 0, 0));
    g.add(box(10.4, 0.4, 34.4, COLOR.ink2, hx, 6, 0));
    const tooth = new THREE.CylinderGeometry(1.6, 1.6, 10, 3);
    for (let z = -15; z <= 15; z += 3.4) {
      const t = new THREE.Mesh(tooth, mat(0xd2c9b8));
      t.rotation.set(0, 0, Math.PI / 2);
      t.rotation.x = 0.0;
      t.position.set(hx, 7.2, z);
      t.rotation.y = 0;
      t.castShadow = true;
      g.add(t, box(10, 1.3, 0.12, mat(0x8fb3c9, { rough: 0.3 }), hx, 6.5, z + 0.9));
    }
    for (const z of [-11, -3.5, 4, 11.5]) {
      g.add(box(0.12, 4.2, 5, COLOR.steel, hx + 5.05, 0, z));
      for (let i = 0; i < 6; i++) g.add(box(0.14, 0.05, 5, COLOR.ink3, hx + 5.1, 0.5 + i * 0.65, z));
      g.add(box(0.14, 0.3, 5.2, mat(COLOR.build), hx + 5.12, 4.25, z));
    }
    // office and sign
    g.add(box(6, 4, 6, mat(0xf6f1e8), hx + 1, 0, -21), box(6.2, 0.3, 6.2, COLOR.ink, hx + 1, 4, -21));
    for (let i = 0; i < 4; i++) g.add(box(0.1, 1, 1, COLOR.glass, hx + 4.05, 1.2 + (i % 2) * 1.5, -22.5 + Math.floor(i / 2) * 3));
    g.add(box(0.3, 0.3, 14, mat(COLOR.diesel), hx + 5.2, 6.6, 0));
    // chimney
    g.add(cyl(0.9, 14, 0xc9bfae, hx - 3, 0, 13), cyl(0.95, 0.8, COLOR.danger, hx - 3, 12.5, 13));
    this.chimney.set(hx - 3, 14.5, 13);
    // flagpole
    g.add(cyl(0.07, 9, COLOR.steel, -24, 0, -20), box(2.4, 1.4, 0.05, mat(COLOR.diesel), -22.8, 7.4, -20));
    const r = rng(7);
    for (let i = 0; i < 10; i++) g.add(tree(r, -70 + r() * 4, -22 + i * 4.8, 0.9));

    g.traverse((o) => {
      if (o instanceof THREE.Mesh && o !== yard) o.userData = { kind: 'factory' };
    });
    this.pickables.push(g);
    this.scene.add(g);

    const el = document.createElement('div');
    el.className = 'lane3d factory3d';
    el.innerHTML = `<b>Your factory</b>`;
    const lab = new CSS2DObject(el);
    lab.position.set(hx, 12, -10);
    this.scene.add(lab);
  }

  private buildLane(c: Corridor, i: number) {
    const L = laneLen(c.km);
    const reg = REGION[c.region];
    const g = new THREE.Group();
    g.position.set(0, 0, LANE_Z[i]);
    this.laneGroups.push(g);
    const r = rng(101 + i * 17);

    const edge = box(L + 25, 0.05, 19.6, mat(reg.edge, { rough: 1 }), L / 2, 0, 0);
    edge.castShadow = false;
    edge.userData = { kind: 'lane', id: c.id };
    this.laneEdges.push(edge);
    const ground = box(L + 24, 0.06, 18.6, mat(reg.ground, { rough: 1 }), L / 2, 0.005, 0);
    ground.castShadow = false;
    ground.userData = { kind: 'lane', id: c.id };
    g.add(edge, ground);
    this.pickables.push(edge, ground);

    // road
    const road = box(L + 30, 0.07, 3.2, COLOR.road, (TRUNK_X + L + 10) / 2, 0, 0);
    road.scale.x = L + 10 - TRUNK_X;
    road.castShadow = false;
    g.add(road);
    for (let x = TRUNK_X + 3; x < L + 9; x += 2.6) {
      const d = box(1.2, 0.02, 0.14, COLOR.roadLine, x, 0.07, 0);
      d.castShadow = false;
      g.add(d);
    }

    // cities
    this.city(g, r, reg, -7, null);
    this.city(g, r, reg, L + 7, c.to);

    // event sites
    const xs = [0, 1, 2, 3].map((k) => 7 + ((L - 13) * (k + 0.5)) / 4);
    const rows: [Powertrain, number, number, number][] = [
      ['electric', -4.9, 0, 1],
      ['gas', 4.5, Math.PI, 0.92],
      ['diesel', 7.7, Math.PI, 0.6],
    ];
    for (const [pt, z, rot, scale] of rows) {
      c.chains[pt].forEach((e, k) => {
        const key = chainKey(c.id, pt, k);
        const site = new Site(key, i, kindFor(e.label), PT_COLOR[pt], scale);
        site.root.position.set(xs[k] + (pt === 'diesel' ? 1.4 : 0), 0.06, z);
        site.root.rotation.y = rot;
        g.add(site.root);
        this.sites.set(key, site);
        this.pickables.push(site.hit);
      });
    }
    // biodiesel
    {
      const key = sideKey(c.id, 'biodiesel');
      const site = new Site(key, i, 'bio', 0x6f8f4e, 0.8);
      site.root.position.set(1.8, 0.06, 6.2);
      site.root.rotation.y = Math.PI;
      g.add(site.root);
      this.sites.set(key, site);
      this.pickables.push(site.hit);
    }
    // grid: pylons with wires; the middle pylon carries the hit box and tag
    {
      const key = sideKey(c.id, 'grid');
      const px = [0, 1, 2, 3, 4].map((k) => 7 + ((L - 13) * k) / 4);
      const site = new Site(key, i, 'grid', COLOR.electric, 0.9);
      site.root.position.set(px[2], 0.06, -8.2);
      site.root.rotation.y = Math.PI / 2;
      g.add(site.root);
      this.sites.set(key, site);
      this.pickables.push(site.hit);
      const others: THREE.Object3D[] = [];
      for (const k of [0, 1, 3, 4]) {
        const b = buildProp('grid', COLOR.electric);
        b.group.scale.setScalar(0.9);
        b.group.position.set(px[k], 0.06, -8.2);
        b.group.rotation.y = Math.PI / 2;
        b.group.userData.gridOf = key;
        g.add(b.group);
        others.push(b.group);
      }
      site.root.userData.extra = others;
      const wires: THREE.Mesh[] = [];
      const wireMat = new THREE.MeshBasicMaterial({ color: COLOR.ink2 });
      for (let k = 0; k < 4; k++) {
        const len = px[k + 1] - px[k];
        for (const dz of [-1.2, 1.2]) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 4), wireMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(px[k] + len / 2, 5.0, -8.2 + dz);
          g.add(w);
          wires.push(w);
        }
      }
      this.wires.push(wires);
    }

    // scenery
    for (let k = 0; k < 22; k++) {
      const x = -10 + r() * (L + 20);
      const z = (r() < 0.5 ? -1 : 1) * (8.6 + r() * 0.5);
      if (z < 0 && x > 4 && x < L - 4) continue;
      g.add(reg.tree === 'acacia' ? acacia(r, x, z) : tree(r, x, z, reg.tree === 'pine' ? 1 : 0.9));
    }

    // lane title and plumbob
    const el = document.createElement('div');
    el.className = 'lane3d';
    el.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i><b>${c.name}</b>`;
    el.title = `${c.km.toLocaleString('en-GB')} km · ${c.points} contract points`;
    el.addEventListener('click', () => this.cb.onSelect(c.id));
    this.laneLabels.push(el);
    const lab = new CSS2DObject(el);
    lab.position.set(-12, 0.5, -10.5);
    lab.center.set(0, 1);
    g.add(lab);

    const pb = new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: MOOD_COLOR.none, emissive: MOOD_COLOR.none, emissiveIntensity: 0.35, roughness: 0.3, flatShading: true, transparent: true, opacity: 0.92 }),
    );
    pb.scale.set(0.9, 1.6, 0.9);
    pb.position.set(-4, 13, -2);
    pb.castShadow = false;
    pb.userData = { kind: 'lane', id: c.id };
    this.plumbobs.push(pb);
    this.pickables.push(pb);
    g.add(pb);

    this.scene.add(g);
  }

  private city(g: THREE.Group, r: () => number, reg: (typeof REGION)[string], cx: number, name: string | null) {
    for (let k = 0; k < 11; k++) {
      const side = k % 2 ? -1 : 1;
      const x = cx + (r() - 0.5) * 8;
      const z = side * (3.2 + r() * 4.6);
      const w = 1.6 + r() * 1.8;
      const d = 1.6 + r() * 1.8;
      const h = 1.4 + r() * (k < 3 ? 6 : 3);
      const col = reg.build[Math.floor(r() * reg.build.length)];
      g.add(box(w, h, d, col, x, 0.06, z));
      if (r() < 0.45) {
        const roof = cone(Math.max(w, d) * 0.75, 1.1, reg.roof[Math.floor(r() * reg.roof.length)], x, h + 0.06, z);
        roof.rotation.y = Math.PI / 4;
        roof.scale.x = w * 0.75;
        roof.scale.z = d * 0.75;
        (roof.geometry as THREE.BufferGeometry) = new THREE.ConeGeometry(1, 1, 4);
        g.add(roof);
      } else {
        g.add(box(w + 0.15, 0.18, d + 0.15, reg.roof[0], x, h + 0.06, z));
        for (let wi = 0; wi < Math.floor(h / 1.3); wi++) g.add(box(w * 0.7, 0.3, 0.04, COLOR.glass, x, 0.7 + wi * 1.2, z + (side > 0 ? -d / 2 - 0.02 : d / 2 + 0.02)));
      }
    }
    if (!name) return;
    const el = document.createElement('div');
    el.className = 'city3d';
    el.textContent = name;
    const lab = new CSS2DObject(el);
    lab.position.set(cx, 9, 0);
    g.add(lab);
  }

  private buildClouds() {
    const r = rng(4242);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) c.add(ball(2 + r() * 2.2, m, k * 2.6 - n, r() * 1.2, (r() - 0.5) * 2.4));
      c.position.set(-90 + r() * 200, 52 + r() * 12, -60 + r() * 120);
      c.userData.v = 1.2 + r() * 1.4;
      this.clouds.push(c);
      this.scene.add(c);
    }
  }

  /* ─────────── view ─────────── */

  setView(v: View) {
    const prev = this.view;
    this.view = v;
    this.shadowDirty = true;
    for (const [key, site] of this.sites) {
      const st = v.states[key];
      const pend = !!v.pending[key];
      let tag: string | null = null;
      if (v.showLabels && v.selected === CORRIDORS[site.lane].id) {
        if (pend) tag = 'Underway';
        else if (st === 'thin') tag = v.due[key] !== undefined ? `On a slide: ${v.dueLabel(v.due[key])}` : 'No date';
      }
      site.set(st, pend, tag);
      const extra = site.root.userData.extra as THREE.Object3D[] | undefined;
      if (extra) {
        const live = st === 'in motion';
        for (const w of this.wires[site.lane]) w.visible = live;
        for (const o of extra) o.visible = st !== 'thin';
      }
    }

    CORRIDORS.forEach((c, i) => {
      const pb = this.plumbobs[i];
      const m = pb.material as THREE.MeshStandardMaterial;
      const col = MOOD_COLOR[v.moods[c.id]];
      m.color.setHex(col);
      m.emissive.setHex(col);
      const sel = v.selected === c.id;
      this.laneLabels[i].classList.toggle('is-selected', sel);
      this.laneLabels[i].classList.toggle('is-dim', v.selected !== null && !sel);
      (this.laneEdges[i].material as THREE.MeshStandardMaterial) = sel ? mat(COLOR.ink) : mat(REGION[c.region].edge, { rough: 1 });
    });

    const commitChanged = !prev || prev.commit !== v.commit || (prev.result === null) !== (v.result === null);
    if (commitChanged && v.result === null) this.parkCommit(v.commit, prev?.commit ?? null);
  }

  /** Put the committed trucks in bays. New trucks pop in. */
  private parkCommit(commit: Commit, prevCommit: Commit | null) {
    const list = this.orderOf(commit);
    const before = prevCommit ? this.orderOf(prevCommit) : [];
    const old = this.bays;
    this.bays = [];
    list.forEach((slot, i) => {
      const reuse = old[i] && old[i].id === slot.id && old[i].pt === slot.pt && old[i].status === 'parked' ? old[i] : null;
      const t = reuse ?? new Truck(slot.id, slot.pt);
      if (reuse) old[i] = undefined as unknown as Truck;
      t.setStatus('parked');
      this.placeInBay(t, i);
      if (!reuse) {
        this.scene.add(t.root);
        const isNew = !before[i] || before[i].id !== slot.id || before[i].pt !== slot.pt;
        t.root.scale.setScalar(isNew && !this.reduced ? 0.01 : 1);
        t.root.userData.pop = isNew ? 0 : 1;
      }
      this.bays.push(t);
    });
    for (const t of old) if (t) t.dispose();
  }

  private orderOf(commit: Commit) {
    const out: { id: CorridorId; pt: Powertrain }[] = [];
    for (const c of CORRIDORS) for (const pt of POWERTRAINS) for (let k = 0; k < commit[c.id][pt]; k++) out.push({ id: c.id, pt });
    return out;
  }

  private bayPos(i: number) {
    const col = Math.floor(i / 10);
    const row = i % 10;
    return new THREE.Vector3(BAY_COLS[col], 0.05, BAY_ROWS[row]);
  }

  private placeInBay(t: Truck, i: number) {
    t.root.position.copy(this.bayPos(i));
    t.heading = 0;
    t.root.rotation.y = 0;
  }

  /** Send the quarter. Trucks that won work leave; the rest stay in their bays. */
  run(result: Result, onDone: () => void) {
    for (const t of this.fleet) t.dispose();
    this.fleet = [];
    const perLine = new Map<string, number>();
    const laneCount = new Map<CorridorId, number>();
    this.bays.forEach((t, i) => {
      const k = `${t.id}/${t.pt}`;
      const n = perLine.get(k) ?? 0;
      perLine.set(k, n + 1);
      const line = result.corridors[t.id].lines[t.pt];
      if (n < line.won) {
        const li = CORRIDORS.findIndex((c) => c.id === t.id);
        const order = laneCount.get(t.id) ?? 0;
        laneCount.set(t.id, order + 1);
        t.setStatus('running');
        const p0 = this.bayPos(i);
        const z = LANE_Z[li];
        const L = laneLen(CORRIDORS[li].km);
        const pts = [
          p0.clone(),
          new THREE.Vector3(-24, 0.05, p0.z),
          new THREE.Vector3(TRUNK_X + 0.8, 0.05, p0.z + Math.sign(z - p0.z) * 1.5),
          new THREE.Vector3(TRUNK_X + 0.8, 0.05, z + 0.8 - Math.sign(z - p0.z) * 2),
          new THREE.Vector3(TRUNK_X + 3, 0.05, z + 0.8),
          new THREE.Vector3(L + 6, 0.05, z + 0.8),
          new THREE.Vector3(L + 8.4, 0.05, z),
          new THREE.Vector3(L + 6, 0.05, z - 0.8),
          new THREE.Vector3(-2, 0.05, z - 0.8),
          new THREE.Vector3(-4.4, 0.05, z),
          new THREE.Vector3(-2, 0.05, z + 0.8),
          new THREE.Vector3(L + 6, 0.05, z + 0.8),
        ];
        t.setPath(pts, 5);
        t.delay = this.reduced ? 0 : order * 0.2 + li * 0.08;
        t.speed = 24;
      } else {
        t.setStatus(line.stranded > 0 ? 'stranded' : 'idle');
      }
    });
    this.runClock = 0;
    this.runStart = performance.now();
    this.runDone = onDone;
    this.shot({ kind: 'overview' });

    // score beats: stranded trucks first, then each lane pays out
    this.beats = [];
    if (result.stranded > 0)
      this.beats.push({
        at: 0.7,
        fire: () => {
          this.pop(new THREE.Vector3(-40, 10, -6), `−${result.stranded * 3}`, `${result.stranded} stranded`, 'pop-bad');
          this.cb.onBeat?.('stranded', 0);
        },
      });
    const idleOnly = result.idle - result.stranded;
    if (idleOnly > 0)
      this.beats.push({ at: 0.95, fire: () => this.pop(new THREE.Vector3(-40, 10, 8), `${idleOnly}`, 'idle in the yard', 'pop-idle') });
    CORRIDORS.forEach((c, li) => {
      const won = result.corridors[c.id].pointsWon;
      if (!won) return;
      this.beats.push({
        at: 1.3 + li * 0.28,
        fire: () => {
          this.pop(new THREE.Vector3(laneLen(c.km) * 0.45, 12, LANE_Z[li]), `+${won * 5}`, `${won}/${c.points} pts`, 'pop-good');
          this.cb.onBeat?.('coin', li);
        },
      });
    });
  }

  /** Finish the run now. Trucks keep driving; the report opens. */
  skipRun() {
    if (!this.runDone) return;
    for (const b of this.beats) b.fire();
    this.beats = [];
    const done = this.runDone;
    this.runDone = null;
    done();
  }

  private pop(pos: THREE.Vector3, big: string, small: string, cls: string) {
    const el = document.createElement('div');
    el.className = `pop3d ${cls}`;
    el.innerHTML = `<div class="pop3d-in"><b>${big}</b><span>${small}</span></div>`;
    const obj = new CSS2DObject(el);
    obj.position.copy(pos);
    this.scene.add(obj);
    this.pops.push({ obj, life: 2.4 });
  }

  /** New quarter: the trucks that ran become the fleet on the road; bays refill from the commit. */
  settle(commit: Commit) {
    const runners = this.bays.filter((t) => t.status === 'running');
    for (const t of this.bays) if (t.status !== 'running') t.dispose();
    for (const t of this.fleet) t.dispose();
    this.fleet = runners;
    this.bays = [];
    this.parkCommit(commit, null);
    for (const t of this.bays) t.root.userData.pop = 0;
  }

  reset() {
    for (const t of [...this.bays, ...this.fleet]) t.dispose();
    this.bays = [];
    this.fleet = [];
  }

  highlightEvent(key: EventKey | null) {
    if (!key) {
      this.ringMarker.visible = false;
      return;
    }
    const s = this.sites.get(key);
    if (!s) return;
    const p = new THREE.Vector3();
    s.root.getWorldPosition(p);
    this.ringMarker.position.set(p.x, 0.12, p.z);
    this.ringMarker.visible = true;
  }

  setSidebar(px: number) {
    this.sidebar = px;
    this.resize();
  }

  shot(s: Shot, instant = false) {
    let target = new THREE.Vector3(10, 0, 6);
    let dist = 265;
    let polar = 0.92;
    let az = -0.12;
    if (s.kind === 'factory') {
      target = new THREE.Vector3(-42, 0, 0);
      dist = 82;
      polar = 0.95;
      az = -0.25;
    } else if (s.kind === 'lane') {
      const i = CORRIDORS.findIndex((c) => c.id === s.id);
      const L = laneLen(CORRIDORS[i].km);
      target = new THREE.Vector3(L / 2 - 2, 0, LANE_Z[i]);
      dist = 92 + L * 0.5;
      polar = 0.98;
      az = -0.08;
    } else if (s.kind === 'event') {
      const site = this.sites.get(s.key);
      if (site) site.root.getWorldPosition(target);
      dist = 34;
      polar = 1.0;
      az = site && site.root.position.z > 0 ? -0.2 : -0.12;
    }
    const pos = new THREE.Vector3().setFromSphericalCoords(dist, polar, az).add(target);
    if (instant || this.reduced) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.fly = null;
      this.controls.update();
      return;
    }
    this.fly = {
      from: [this.camera.position.clone(), this.controls.target.clone()],
      to: [pos, target],
      t: 0,
      dur: 1.25,
    };
  }

  /* ─────────── input ─────────── */

  private onMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.pointerPx = { x: e.clientX, y: e.clientY };
    this.pickDirty = true;
  };
  private onLeave = () => {
    this.pointer.set(9, 9);
    this.hoverKey = '';
    this.cb.onHover(null);
  };
  private onDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };
  private onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 5 || e.button !== 0) return;
    const hit = this.pick();
    if (!hit) return;
    if (hit.kind === 'event') this.cb.onEventClick(hit.key, e.clientX, e.clientY);
    else if (hit.kind === 'lane') this.cb.onSelect(hit.id);
    else if (hit.kind === 'truck') this.cb.onSelect(hit.id);
    else if (hit.kind === 'factory') this.shot({ kind: 'factory' });
  };
  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    this.keys.add(e.key.toLowerCase());
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private pick(): (Hover & { kind: string }) | null {
    if (this.pointer.x > 2) return null;
    this.ray.setFromCamera(this.pointer, this.camera);
    const objs: THREE.Object3D[] = [...this.pickables, ...this.bays.map((t) => t.root), ...this.fleet.map((t) => t.root)];
    const hits = this.ray.intersectObjects(objs, true);
    for (const h of hits) {
      const u = h.object.userData;
      if (!u || !u.kind) continue;
      const { x, y } = this.pointerPx;
      if (u.kind === 'event') return { kind: 'event', key: u.key, x, y };
      if (u.kind === 'lane') return { kind: 'lane', id: u.id, x, y };
      if (u.kind === 'factory') return { kind: 'factory', x, y };
      if (u.kind === 'truck') {
        const t = u.truck as Truck;
        return { kind: 'truck', id: t.id, pt: t.pt, status: t.status, x, y };
      }
    }
    return null;
  }

  private resize = () => {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    const s = Math.min(this.sidebar, w * 0.5);
    if (s > 0) this.camera.setViewOffset(w + s, h, s, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  };

  /* ─────────── loop ─────────── */

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const raw = this.clock.getDelta();
    const dt = Math.min(0.1, raw);
    const t = this.clock.elapsedTime;

    // Adaptive resolution: if frames run slow for two seconds, render fewer pixels.
    this.perf.acc += raw;
    this.perf.n++;
    if (this.perf.acc > 2) {
      const avg = this.perf.acc / this.perf.n;
      if (avg > 1 / 45 && this.dpr > 1) {
        this.dpr = Math.max(1, this.dpr - 0.25);
        this.resize();
      }
      this.perf = { acc: 0, n: 0 };
    }

    if (this.fly) {
      this.fly.t += dt / this.fly.dur;
      const k = Math.min(1, this.fly.t);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.camera.position.lerpVectors(this.fly.from[0], this.fly.to[0], e);
      this.controls.target.lerpVectors(this.fly.from[1], this.fly.to[1], e);
      if (k >= 1) this.fly = null;
    }
    this.keyPan(dt);
    this.controls.update();

    pulseHolograms(t);
    for (const s of this.sites.values()) s.tick(t);
    this.plumbobs.forEach((pb, i) => {
      pb.rotation.y = t * 1.3 + i;
      const sel = this.view?.selected === CORRIDORS[i].id;
      pb.position.y = 14 + Math.sin(t * 2 + i) * 0.5 + (sel ? 1.5 : 0);
      const sc = sel ? 1.3 : 1;
      pb.scale.set(1.3 * sc, 2.2 * sc, 1.3 * sc);
    });
    if (this.ringMarker.visible) {
      const k = 1 + Math.sin(t * 4) * 0.08;
      this.ringMarker.scale.setScalar(k);
    }
    for (const c of this.clouds) {
      c.position.x += c.userData.v * dt;
      if (c.position.x > 140) c.position.x = -110;
      // a cloud right in front of the lens hides the board; let it go
      c.visible = c.position.distanceTo(this.camera.position) > 75;
    }

    // chimney smoke every so often
    if (Math.random() < dt * 3) this.puffs.emit(this.chimney, 0xbdb5a8, 0.8);

    let moving = 0;
    for (const tr of [...this.bays, ...this.fleet]) {
      if (tr.root.userData.pop !== undefined && tr.root.userData.pop < 1) {
        tr.root.userData.pop = Math.min(1, tr.root.userData.pop + dt * 3.5);
        const p = tr.root.userData.pop as number;
        const s = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.25 * (1 - p) : 1;
        tr.root.scale.setScalar(Math.max(0.01, p * s));
        this.shadowDirty = true;
      }
      if (tr.advance(dt, t)) {
        moving++;
        tr.puffClock -= dt;
        if (tr.puffClock <= 0 && tr.pt !== 'electric') {
          tr.puffClock = 0.18;
          const back = new THREE.Vector3(Math.cos(tr.heading) * 0.9, 2.6, -Math.sin(tr.heading) * 0.9).add(tr.root.position);
          if (tr.pt === 'diesel') {
            const lane = CORRIDORS.find((c) => c.id === tr.id)!;
            const bio = this.view?.world.find((c) => c.id === lane.id)?.biodiesel === 'in motion';
            this.puffs.emit(back, bio ? 0xa8b88a : 0x6b655c, 0.32);
          } else this.puffs.emit(back, 0xd9e2e0, 0.22);
        }
      }
    }
    this.puffs.tick(dt);

    if (this.runDone) {
      this.runClock += dt;
      const wall = (performance.now() - this.runStart) / 1000;
      const clock = Math.max(this.runClock, wall);
      this.beats = this.beats.filter((b) => (clock >= b.at ? (b.fire(), false) : true));
      const allOut = this.bays.every((tr) => tr.status !== 'running' || tr.arrived || tr.s > 45);
      if (clock > 4.6 || (clock > 2.6 && allOut && this.beats.length === 0)) {
        for (const b of this.beats) b.fire();
        this.beats = [];
        const done = this.runDone;
        this.runDone = null;
        done();
      }
    }

    for (const p of this.pops) {
      p.life -= dt;
      p.obj.position.y += dt * 2.2;
      if (p.life <= 0) {
        p.obj.element.remove();
        this.scene.remove(p.obj);
      }
    }
    if (this.pops.length) this.pops = this.pops.filter((p) => p.life > 0);

    // hover: only re-pick when the pointer or the camera moved
    this.frame++;
    if (this.pickDirty || (moving > 0 && this.frame % 8 === 0)) {
      const moved = this.pickDirty;
      this.pickDirty = false;
      const hit = this.pick();
      const key = hit ? `${hit.kind}:${'key' in hit ? hit.key : 'id' in hit ? hit.id : ''}:${'pt' in hit ? hit.pt : ''}` : '';
      if (key !== this.hoverKey || (hit && moved)) {
        this.hoverKey = key;
        this.cb.onHover(hit);
      }
      this.renderer.domElement.style.cursor = hit ? 'pointer' : '';
    }

    if (moving > 0 || this.shadowDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  };

  private keyPan(dt: number) {
    if (this.keys.size === 0) return;
    const fwd = new THREE.Vector3().subVectors(this.controls.target, this.camera.position).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const d = this.camera.position.distanceTo(this.controls.target) * dt * 0.8;
    const move = new THREE.Vector3();
    if (this.keys.has('w') || this.keys.has('arrowup')) move.add(fwd);
    if (this.keys.has('s') || this.keys.has('arrowdown')) move.sub(fwd);
    if (this.keys.has('d') || this.keys.has('arrowright')) move.add(right);
    if (this.keys.has('a') || this.keys.has('arrowleft')) move.sub(right);
    if (move.lengthSq() > 0) {
      this.fly = null;
      move.normalize().multiplyScalar(d);
      this.camera.position.add(move);
      this.controls.target.add(move);
    }
    const rot = (this.keys.has('q') ? 1 : 0) - (this.keys.has('e') ? 1 : 0);
    if (rot) {
      this.fly = null;
      const off = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot * dt * 1.2);
      this.camera.position.copy(this.controls.target).add(off);
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}
