// Low-poly building blocks. Shared geometry and material caches keep draw setup cheap.

import * as THREE from 'three';
import type { Powertrain } from '../data';

export const COLOR = {
  paper: 0xf6f1e8,
  paperLo: 0xe9e1d2,
  ink: 0x1a1814,
  ink2: 0x4a453c,
  ink3: 0x8a8274,
  road: 0x3a3631,
  roadLine: 0xf3e9cf,
  diesel: 0xc47b2b,
  gas: 0x2f6f6a,
  electric: 0x2c4c7c,
  danger: 0xb8432f,
  build: 0xe0a83a,
  steel: 0x9aa1a6,
  glass: 0x2b3440,
  tyre: 0x1f1d1a,
  white: 0xfbf8f2,
  leaf: 0x6f8f4e,
  leafDark: 0x4f6e3a,
  trunk: 0x6b4f36,
};

export const PT_COLOR: Record<Powertrain, number> = {
  diesel: COLOR.diesel,
  gas: COLOR.gas,
  electric: COLOR.electric,
};

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: number, opts: { emissive?: number; rough?: number; metal?: number } = {}) {
  const key = `${color}|${opts.emissive ?? 0}|${opts.rough ?? 0.85}|${opts.metal ?? 0}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      flatShading: true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissive ? 1.2 : 0,
    });
    matCache.set(key, m);
  }
  return m;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const cyl6Geo = new THREE.CylinderGeometry(1, 1, 1, 6);
const coneGeo = new THREE.ConeGeometry(1, 1, 7);
const sphereGeo = new THREE.IcosahedronGeometry(1, 1);

function place(m: THREE.Mesh, x: number, y: number, z: number, shadow = true) {
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** Box whose base sits at y. */
export function box(w: number, h: number, d: number, color: number | THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(boxGeo, typeof color === 'number' ? mat(color) : color);
  m.scale.set(w, h, d);
  return place(m, x, y + h / 2, z);
}

export function cyl(r: number, h: number, color: number | THREE.Material, x = 0, y = 0, z = 0, sides: 6 | 12 = 12) {
  const m = new THREE.Mesh(sides === 6 ? cyl6Geo : cylGeo, typeof color === 'number' ? mat(color) : color);
  m.scale.set(r, h, r);
  return place(m, x, y + h / 2, z);
}

export function cone(r: number, h: number, color: number, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(coneGeo, mat(color));
  m.scale.set(r, h, r);
  return place(m, x, y + h / 2, z);
}

export function ball(r: number, color: number | THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(sphereGeo, typeof color === 'number' ? mat(color) : color);
  m.scale.setScalar(r);
  return place(m, x, y, z);
}

export function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

/** Deterministic pseudo-random for scenery. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function tree(r: () => number, x: number, z: number, scale = 1) {
  const kind = r();
  const s = scale * (0.75 + r() * 0.5);
  if (kind < 0.5) {
    return group(cyl(0.18 * s, 0.9 * s, COLOR.trunk, x, 0, z, 6), cone(0.9 * s, 2.4 * s, r() < 0.5 ? COLOR.leaf : COLOR.leafDark, x, 0.7 * s, z));
  }
  return group(cyl(0.16 * s, 1 * s, COLOR.trunk, x, 0, z, 6), ball(0.95 * s, r() < 0.5 ? COLOR.leaf : 0x86a05c, x, 1.7 * s, z));
}

export function acacia(r: () => number, x: number, z: number) {
  const s = 0.8 + r() * 0.5;
  const top = new THREE.Mesh(cyl6Geo, mat(0x7d8f4a));
  top.scale.set(1.5 * s, 0.35 * s, 1.5 * s);
  place(top, x, 2.1 * s, z);
  return group(cyl(0.12 * s, 2 * s, COLOR.trunk, x, 0, z, 6), top);
}

/* ───────────────────────── Hologram, scaffold, crane ───────────────────────── */

const holoFill = new Map<number, THREE.MeshBasicMaterial>();
const holoEdge = new Map<number, THREE.LineBasicMaterial>();

export function holoMaterials(color: number) {
  let f = holoFill.get(color);
  let e = holoEdge.get(color);
  if (!f) {
    f = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, depthWrite: false });
    holoFill.set(color, f);
  }
  if (!e) {
    e = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
    holoEdge.set(color, e);
  }
  return { fill: f, edge: e };
}

/** Pulse every hologram in the scene. */
export function pulseHolograms(t: number) {
  const k = 0.5 + 0.5 * Math.sin(t * 2.4);
  for (const m of holoFill.values()) m.opacity = 0.06 + 0.08 * k;
  for (const m of holoEdge.values()) m.opacity = 0.45 + 0.4 * k;
}

const edgeCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
/** Ghost copy of a group: translucent fill plus crisp edges. */
export function hologramOf(src: THREE.Object3D, color: number) {
  const { fill, edge } = holoMaterials(color);
  const out = new THREE.Group();
  src.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(src.matrixWorld).invert();
  src.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = new THREE.Mesh(o.geometry, fill);
    const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    local.decompose(m.position, m.quaternion, m.scale);
    m.renderOrder = 2;
    out.add(m);
    let eg = edgeCache.get(o.geometry);
    if (!eg) {
      eg = new THREE.EdgesGeometry(o.geometry, 25);
      edgeCache.set(o.geometry, eg);
    }
    const l = new THREE.LineSegments(eg, edge);
    l.position.copy(m.position);
    l.quaternion.copy(m.quaternion);
    l.scale.copy(m.scale);
    out.add(l);
  });
  return out;
}

export function scaffold(w: number, h: number, d: number) {
  const g = new THREE.Group();
  const pole = mat(COLOR.build, { rough: 0.6 });
  const t = 0.09;
  const hw = w / 2 + 0.25;
  const hd = d / 2 + 0.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(t, h + 0.4, t, pole, sx * hw, 0, sz * hd));
  for (const y of [h * 0.35, h * 0.7, h + 0.35]) {
    g.add(box(w + 0.5, t, t, pole, 0, y, hd));
    g.add(box(w + 0.5, t, t, pole, 0, y, -hd));
    g.add(box(t, t, d + 0.5, pole, hw, y, 0));
    g.add(box(t, t, d + 0.5, pole, -hw, y, 0));
  }
  // planks
  g.add(box(w + 0.5, 0.06, 0.5, mat(0x9c7a4f), 0, h * 0.7, hd));
  // striped barrier
  for (let i = 0; i < 4; i++) g.add(box(0.5, 0.25, 0.08, i % 2 ? COLOR.ink : COLOR.build, -w / 2 + 0.3 + i * 0.55, 0, hd + 0.6));
  g.traverse((o) => (o.castShadow = false));
  return g;
}

export function crane(h: number) {
  const g = new THREE.Group();
  const y = mat(COLOR.build, { rough: 0.5 });
  g.add(box(0.35, h, 0.35, y, 0, 0, 0));
  const jib = new THREE.Group();
  jib.add(box(5, 0.28, 0.28, y, 1.6, 0, 0));
  jib.add(box(0.9, 0.6, 0.6, COLOR.ink2, -1.2, -0.3, 0));
  jib.add(box(0.06, 1.6, 0.06, COLOR.ink, 3.6, -1.6, 0));
  jib.position.y = h;
  jib.name = 'jib';
  g.add(jib);
  return g;
}
