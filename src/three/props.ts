// One building per chain event. Each faces +z (the road) and sits on y = 0.

import * as THREE from 'three';
import { COLOR, box, cyl, ball, cone, group, mat } from './kit';

export type PropKind =
  | 'charger'
  | 'substation'
  | 'fuel'
  | 'gastank'
  | 'workshop'
  | 'bank'
  | 'rest'
  | 'warehouse'
  | 'border'
  | 'parts'
  | 'price'
  | 'carlot'
  | 'bio'
  | 'grid';

export function kindFor(label: string): PropKind {
  const l = label.toLowerCase();
  if (/depot power/.test(l)) return 'substation';
  if (/charger/.test(l)) return 'charger';
  if (/fuel at every/.test(l)) return 'fuel';
  if (/lng|cng|gas supply|stations at both/.test(l)) return 'gastank';
  if (/workshop/.test(l)) return 'workshop';
  if (/border/.test(l)) return 'border';
  if (/parts/.test(l)) return 'parts';
  if (/price|tariff/.test(l)) return 'price';
  if (/resale/.test(l)) return 'carlot';
  if (/residual|finance|bank|cash/.test(l)) return 'bank';
  if (/driver/.test(l)) return 'rest';
  if (/payload|shipper|customer/.test(l)) return 'warehouse';
  if (/biodiesel/.test(l)) return 'bio';
  if (/grid/.test(l)) return 'grid';
  return 'warehouse';
}

export interface Built {
  group: THREE.Group;
  size: [number, number, number];
  /** Meshes that glow when the event is in motion. */
  lights: THREE.Mesh[];
}

function light(color: number, x: number, y: number, z: number, r = 0.18) {
  return ball(r, mat(color, { emissive: color }), x, y, z);
}

export function buildProp(kind: PropKind, accent: number): Built {
  const lights: THREE.Mesh[] = [];
  const L = (m: THREE.Mesh) => (lights.push(m), m);
  let g: THREE.Group;
  let size: [number, number, number] = [4, 3, 3.4];

  switch (kind) {
    case 'charger': {
      g = group(
        box(4.4, 0.12, 3.2, COLOR.paperLo, 0, 0, 0),
        box(4.2, 0.18, 2.4, mat(COLOR.ink2), 0, 2.9, 0),
        box(4.2, 0.08, 2.4, mat(accent), 0, 3.08, 0),
        box(0.18, 2.9, 0.18, COLOR.steel, -1.9, 0, -0.9),
        box(0.18, 2.9, 0.18, COLOR.steel, 1.9, 0, -0.9),
      );
      for (const x of [-1.1, 0, 1.1]) {
        g.add(box(0.55, 1.5, 0.45, COLOR.white, x, 0.12, 0.2));
        g.add(box(0.4, 0.3, 0.05, COLOR.glass, x, 1.05, 0.44));
        g.add(L(light(accent, x, 1.42, 0.44, 0.08)));
      }
      size = [4.4, 3.2, 3.2];
      break;
    }
    case 'substation': {
      g = group(box(4.2, 0.12, 3.4, COLOR.paperLo, 0, 0, 0), box(1.6, 1.6, 1.4, COLOR.steel, -0.9, 0.12, 0));
      for (let i = 0; i < 4; i++) g.add(box(0.08, 1.2, 1.2, COLOR.ink3, -1.75 + i * 0.25, 0.4, 0));
      g.add(cyl(0.16, 1.2, COLOR.white, -0.6, 1.72, 0.3), cyl(0.16, 1.2, COLOR.white, -1.2, 1.72, 0.3));
      g.add(box(1.4, 2.2, 1.2, COLOR.white, 1.1, 0.12, 0), box(1.5, 0.12, 1.3, mat(accent), 1.1, 2.32, 0));
      // fence
      for (let x = -2; x <= 2; x += 0.5) g.add(box(0.05, 0.9, 0.05, COLOR.ink3, x, 0.12, 1.6));
      g.add(box(4.1, 0.05, 0.05, COLOR.ink3, 0, 0.95, 1.6));
      g.add(L(light(accent, 1.1, 1.7, 0.62, 0.1)));
      size = [4.2, 2.9, 3.4];
      break;
    }
    case 'fuel': {
      g = group(
        box(4.4, 0.12, 3.2, COLOR.paperLo, 0, 0, 0),
        box(4.0, 0.3, 2.8, COLOR.white, 0, 2.7, 0.2),
        box(4.02, 0.12, 2.82, mat(accent), 0, 2.8, 0.2),
        cyl(0.13, 2.7, COLOR.steel, -1.4, 0, 0.2),
        cyl(0.13, 2.7, COLOR.steel, 1.4, 0, 0.2),
        box(0.5, 1.2, 0.4, COLOR.ink2, -0.6, 0.12, 0.2),
        box(0.5, 1.2, 0.4, COLOR.ink2, 0.6, 0.12, 0.2),
        box(2.2, 1.6, 1, COLOR.white, 0, 0.12, -1.1),
        box(0.3, 3.6, 0.3, COLOR.ink2, 1.9, 0, -1.2),
        box(1, 0.8, 0.12, mat(accent), 1.9, 3.3, -1.1),
      );
      lights.push(g.children[2] as THREE.Mesh);
      size = [4.4, 3.8, 3.2];
      break;
    }
    case 'gastank': {
      g = group(box(4.2, 0.12, 3.2, COLOR.paperLo, 0, 0, 0));
      g.add(ball(1.15, COLOR.white, -0.9, 1.6, -0.2));
      for (const [x, z] of [[-1.6, -0.9], [-0.2, -0.9], [-1.6, 0.5], [-0.2, 0.5]]) g.add(cyl(0.08, 1.0, COLOR.steel, x, 0.12, z));
      const tank = cyl(0.45, 2.2, COLOR.white, 0.9, 0.12, 0.1);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(1.3, 0.75, 0.6);
      g.add(tank, box(0.9, 1.3, 0.5, COLOR.ink2, 1.3, 0.12, -0.8));
      g.add(box(2.3, 0.14, 0.1, mat(accent), -0.9, 1.5, 0.95));
      g.add(L(light(accent, 1.3, 1.25, -0.52, 0.1)));
      size = [4.2, 2.8, 3.2];
      break;
    }
    case 'workshop': {
      g = group(
        box(4.4, 0.12, 3.4, COLOR.paperLo, 0, 0, 0),
        box(4, 2.4, 2.8, COLOR.white, 0, 0.12, -0.2),
        box(4.2, 0.3, 3.0, COLOR.ink2, 0, 2.52, -0.2),
        box(1.5, 1.7, 0.08, COLOR.steel, -0.9, 0.12, 1.22),
        box(1.5, 1.7, 0.08, COLOR.steel, 0.9, 0.12, 1.22),
        box(4.02, 0.32, 0.06, mat(accent), 0, 2.0, 1.22),
      );
      for (let i = 0; i < 4; i++) g.add(box(1.5, 0.04, 0.1, COLOR.ink3, -0.9, 0.4 + i * 0.35, 1.27), box(1.5, 0.04, 0.1, COLOR.ink3, 0.9, 0.4 + i * 0.35, 1.27));
      lights.push(g.children[5] as THREE.Mesh);
      size = [4.4, 2.8, 3.4];
      break;
    }
    case 'bank': {
      g = group(
        box(4.2, 0.12, 3.2, COLOR.paperLo, 0, 0, 0),
        box(3.8, 0.3, 2.6, COLOR.white, 0, 0.12, 0),
        box(3.4, 2.2, 1.8, 0xe8dfcc, 0, 0.42, -0.3),
      );
      for (const x of [-1.35, -0.45, 0.45, 1.35]) g.add(cyl(0.16, 2.0, COLOR.white, x, 0.42, 0.85, 6));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 2.2, 0.9, 3, 1), mat(COLOR.white));
      roof.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      roof.scale.set(1, 1.05, 1);
      roof.position.set(0, 2.85, 0.1);
      roof.castShadow = true;
      g.add(box(3.9, 0.2, 2.5, COLOR.white, 0, 2.42, 0), roof, box(3.92, 0.12, 0.08, mat(accent), 0, 2.45, 1.26));
      lights.push(g.children[g.children.length - 1] as THREE.Mesh);
      size = [4.2, 3.3, 3.2];
      break;
    }
    case 'rest': {
      g = group(
        box(4.2, 0.12, 3.2, COLOR.paperLo, 0, 0, 0),
        box(2.2, 1.8, 1.8, 0xd9b48a, -0.8, 0.12, -0.4),
        box(2.6, 0.2, 2.3, mat(accent), -0.8, 1.92, -0.4),
        box(0.6, 1.1, 0.06, COLOR.glass, -0.8, 0.12, 0.52),
        box(1.2, 0.4, 0.5, COLOR.trunk, 1.2, 0.12, 0.6),
        cyl(0.14, 1.3, COLOR.trunk, 1.4, 0, -0.8, 6),
        ball(0.9, COLOR.leaf, 1.4, 1.9, -0.8),
      );
      g.add(L(light(0xffd27a, -0.8, 1.5, 0.6, 0.1)));
      size = [4.2, 2.8, 3.2];
      break;
    }
    case 'warehouse': {
      g = group(
        box(4.4, 0.12, 3.4, COLOR.paperLo, 0, 0, 0),
        box(4, 2.1, 2.6, 0xd8cfbf, 0, 0.12, -0.3),
        box(4.1, 0.2, 2.7, COLOR.ink3, 0, 2.22, -0.3),
        box(1.2, 1.4, 0.06, COLOR.ink2, 0.9, 0.12, 1.0),
        box(4.02, 0.22, 0.06, mat(accent), 0, 1.75, 1.0),
      );
      for (const [x, z, s] of [[-1.3, 1.45, 0.6], [-0.6, 1.45, 0.5], [-1.0, 1.45, 0.45]] as const)
        g.add(box(s, s, s, 0xb98a55, x, s === 0.45 ? 0.6 : 0.12, z));
      lights.push(g.children[4] as THREE.Mesh);
      size = [4.4, 2.5, 3.4];
      break;
    }
    case 'border': {
      g = group(
        box(4.6, 0.12, 3.2, COLOR.paperLo, 0, 0, 0),
        box(1.4, 1.9, 1.3, COLOR.white, -1.5, 0.12, -0.6),
        box(1.6, 0.18, 1.5, mat(accent), -1.5, 2.02, -0.6),
        box(0.25, 1.1, 0.25, COLOR.ink2, -0.5, 0.12, 0.8),
        box(3.2, 0.14, 0.14, COLOR.danger, 1.1, 1.0, 0.8),
        box(0.06, 3.2, 0.06, COLOR.steel, 1.9, 0.12, -1.0),
      );
      const flag = box(0.9, 0.55, 0.04, mat(accent), 2.37, 2.6, -1.0);
      g.add(flag);
      for (let i = 0; i < 3; i++) g.add(box(0.4, 0.14, 0.15, COLOR.white, 0.1 + i * 0.9, 1.0, 0.8));
      g.add(L(light(0xffd27a, -1.5, 1.4, 0.06, 0.09)));
      size = [4.6, 3.3, 3.2];
      break;
    }
    case 'parts': {
      g = group(box(4.2, 0.12, 3.2, COLOR.paperLo, 0, 0, 0), box(3.8, 2.0, 2.4, 0xe2d6c2, 0, 0.12, -0.3));
      const roof = box(4.0, 0.35, 2.6, COLOR.ink2, 0, 2.12, -0.3);
      g.add(roof);
      for (let s = 0; s < 3; s++) {
        g.add(box(2.4, 0.06, 0.6, COLOR.steel, -0.4, 0.3 + s * 0.55, 1.2));
        for (let i = 0; i < 4; i++) g.add(box(0.4, 0.35, 0.4, i % 2 ? 0xb98a55 : mat(0x8c7a64), -1.3 + i * 0.6, 0.36 + s * 0.55, 1.2));
      }
      g.add(box(3.82, 0.2, 0.06, mat(accent), 0, 1.86, 0.92));
      lights.push(g.children[g.children.length - 1] as THREE.Mesh);
      size = [4.2, 2.5, 3.2];
      break;
    }
    case 'price': {
      g = group(
        box(3.8, 0.12, 2.6, COLOR.paperLo, 0, 0, 0),
        box(0.3, 3.4, 0.3, COLOR.ink2, 0, 0.12, 0),
        box(2.6, 1.6, 0.25, COLOR.ink, 0, 2.4, 0),
        box(2.4, 0.3, 0.05, mat(accent, { emissive: accent }), 0, 3.35, 0.14),
      );
      for (let i = 0; i < 2; i++) g.add(L(box(1.8, 0.28, 0.05, mat(0xffd27a, { emissive: 0xffb84a }), 0, 2.6 + i * 0.4, 0.14)));
      size = [3.8, 4.1, 2.6];
      break;
    }
    case 'carlot': {
      g = group(box(4.4, 0.12, 3.4, COLOR.paperLo, 0, 0, 0), box(1.2, 1.4, 1, COLOR.white, -1.5, 0.12, -1));
      const cols = [0x9c3b2b, 0x3e5d7a, 0xd9cfbc, 0x55704a];
      for (let i = 0; i < 4; i++) {
        const x = -0.4 + (i % 2) * 1.6;
        const z = -0.6 + Math.floor(i / 2) * 1.4;
        g.add(box(1.2, 0.5, 0.7, cols[i], x, 0.18, z), box(0.6, 0.35, 0.6, cols[i], x - 0.1, 0.68, z));
      }
      for (let x = -2; x <= 2; x += 0.5) g.add(box(0.12, 0.08, 0.04, x % 1 ? mat(accent) : COLOR.white, x, 1.6, 1.55));
      g.add(box(0.05, 1.6, 0.05, COLOR.steel, -2.1, 0, 1.55), box(0.05, 1.6, 0.05, COLOR.steel, 2.1, 0, 1.55));
      size = [4.4, 1.8, 3.4];
      break;
    }
    case 'bio': {
      g = group(box(3.6, 0.12, 3, COLOR.paperLo, 0, 0, 0));
      for (const x of [-0.8, 0.8]) {
        g.add(cyl(0.7, 2.4, 0xe5ecd6, x, 0.12, -0.3), cone(0.72, 0.4, 0x8aa25a, x, 2.52, -0.3));
      }
      g.add(box(2.4, 0.15, 0.1, mat(0x6f8f4e), 0, 1.6, 0.45), cone(0.35, 0.8, COLOR.leaf, 1.4, 0.12, 1.0));
      g.add(L(light(0x8acb5a, 0, 2.2, 0.45, 0.1)));
      size = [3.6, 2.9, 3];
      break;
    }
    case 'grid': {
      g = group();
      const steel = mat(COLOR.steel, { metal: 0.3, rough: 0.6 });
      for (const sx of [-1, 1]) {
        const leg = box(0.16, 7, 0.16, steel, sx * 0.5, 0, 0);
        leg.rotation.z = sx * -0.06;
        g.add(leg);
      }
      g.add(box(3.2, 0.16, 0.16, steel, 0, 5.6, 0), box(2.2, 0.14, 0.14, steel, 0, 6.6, 0), cone(0.25, 0.8, COLOR.ink3, 0, 7, 0));
      for (const x of [-1.5, 1.5]) g.add(L(light(accent, x, 5.4, 0, 0.12)));
      size = [3.2, 7.8, 1];
      break;
    }
  }
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return { group: g, size, lights };
}
