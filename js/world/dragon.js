// Dragons from simple shapes: Onyxia (a great black dragon, about 16 yards from snout to tail) and her whelps. One
// model, scaled: a long body, an S-necked head with horns and a jaw that opens, two membrane wings that fold along
// the flanks or spread and beat, four legs and a tail of tapering segments. Facing +Z, standing on y = 0.
//
// animateDragon(model, { dt }) plays it from model.userData.anim:
//   mh      1 starts a bite (the head lunges, the jaw snaps)
//   breath  > 0 while breathing fire (the head low and forward, the jaw wide)
//   roar    1 starts a roar (the head rears back, the wings half open)
//   cast    > 0 while casting (the jaw a little open, the head raised)
//   fly     0..1, folded to flying: the wings spread and beat, the legs tuck in
//   run     > 0 while running (the legs step, a whelp scampers)
//   dead    true: it falls on its side
import * as THREE from 'three';

const ONYXIA_COLORS = { hide: 0x3d3540, belly: 0x6e5040, wing: 0x4a2c34, horn: 0xd8c8a8, eye: 0xff8a20 };
// The neck's rest: up from the shoulders, then curving forward to the head (an S).
const NECK_REST = [-0.6, -0.2, 0.08, 0.22, 0.3];
const WHELP_COLORS = { hide: 0x3a1c1a, belly: 0x7a4a30, wing: 0x5a2420, horn: 0xb0a080, eye: 0xffb040 };

// One wing: three finger bones from the wrist with a membrane between them, hinged at the shoulder.
function makeWing(side, c) {
  const wing = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({ color: c.hide, roughness: 0.8 });
  const memMat = new THREE.MeshStandardMaterial({ color: c.wing, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3.4, 6), boneMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.x = side * 1.7;
  wing.add(arm);
  // The fingers fan back from the wrist (x = side * 3.4).
  const wrist = new THREE.Vector3(side * 3.4, 0, 0);
  const tips = [
    new THREE.Vector3(side * 8.5, 0.6, 0.6),
    new THREE.Vector3(side * 7.6, 0.1, -2.6),
    new THREE.Vector3(side * 5.6, -0.3, -4.6),
    new THREE.Vector3(side * 3.2, -0.4, -5.2),
  ];
  for (const tip of tips.slice(0, 3)) {
    const len = tip.distanceTo(wrist);
    const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, len, 5), boneMat);
    finger.position.copy(wrist).add(tip).multiplyScalar(0.5);
    finger.lookAt(tip);
    finger.rotateX(Math.PI / 2);
    wing.add(finger);
  }
  // The membrane: fans from the shoulder and the wrist through the finger tips, back to the flank.
  const shoulder = new THREE.Vector3(0, 0, 0);
  const flank = new THREE.Vector3(side * 0.4, -0.2, -3.2);
  const pts = [shoulder, wrist, ...tips, flank];
  const verts = [];
  const tri = (a, b, d) => verts.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z);
  tri(shoulder, wrist, tips[0]);
  for (let k = 0; k < tips.length - 1; k++) tri(wrist, tips[k], tips[k + 1]);
  tri(wrist, tips[3], flank);
  tri(shoulder, wrist, flank);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  const membrane = new THREE.Mesh(geo, memMat);
  membrane.castShadow = true;
  wing.add(membrane);
  wing.userData.points = pts;
  return wing;
}

function makeLeg(c, front) {
  const leg = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: c.hide, roughness: 0.85 });
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 1.7, 7), mat);
  upper.position.y = -0.85;
  leg.add(upper);
  const knee = new THREE.Group();
  knee.position.y = -1.7;
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 1.5, 7), mat);
  lower.position.y = -0.75;
  knee.add(lower);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.9), mat);
  foot.position.set(0, -1.5, 0.25);
  knee.add(foot);
  const clawMat = new THREE.MeshStandardMaterial({ color: c.horn, roughness: 0.5 });
  for (let k = -1; k <= 1; k++) {
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 5), clawMat);
    claw.rotation.x = Math.PI / 2;
    claw.position.set(k * 0.22, -1.55, 0.8);
    knee.add(claw);
  }
  knee.rotation.x = front ? -0.35 : 0.45;
  leg.add(knee);
  leg.userData.knee = knee;
  return leg;
}

// A dragon at `scale` (1 = Onyxia). radius is its reach for melee range and the ground rings; height its top.
export function makeDragon({ scale = 1, whelp = false } = {}) {
  const c = whelp ? WHELP_COLORS : ONYXIA_COLORS;
  const root = new THREE.Group();
  const rig = new THREE.Group(); // tilts and lifts as one (flying, dying)
  root.add(rig);
  rig.scale.setScalar(scale);
  const hide = new THREE.MeshStandardMaterial({ color: c.hide, roughness: 0.75, metalness: 0.05 });
  const belly = new THREE.MeshStandardMaterial({ color: c.belly, roughness: 0.85 });
  const hornMat = new THREE.MeshStandardMaterial({ color: c.horn, roughness: 0.5 });

  // Body: a long barrel with a lighter belly.
  const body = new THREE.Group();
  body.position.set(0, 3.4, 0);
  rig.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), hide);
  torso.scale.set(1.7, 1.45, 3.4);
  torso.castShadow = true;
  body.add(torso);
  const under = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), belly);
  under.scale.set(1.4, 1.1, 3.0);
  under.position.y = -0.45;
  body.add(under);
  // Spikes along the spine.
  for (let k = 0; k < 9; k++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7 - k * 0.04, 5), hornMat);
    spike.position.set(0, 1.4 - Math.abs(k - 3) * 0.08, 2.4 - k * 0.65);
    spike.rotation.x = -0.5;
    body.add(spike);
  }

  // Neck: segments rising forward to the head; each turns a little so the head can lunge or rear.
  const neck = [];
  let parent = body;
  const neckLen = 0.95;
  for (let k = 0; k < 5; k++) {
    const seg = new THREE.Group();
    seg.position.set(0, k === 0 ? 0.6 : 0, k === 0 ? 2.9 : neckLen);
    const r = 0.75 - k * 0.07;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, neckLen * 1.25, 10), hide);
    m.rotation.x = Math.PI / 2;
    m.position.z = neckLen / 2;
    m.castShadow = true;
    seg.add(m);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), hornMat);
    sp.position.set(0, r * 0.85, neckLen / 2);
    sp.rotation.x = -0.4;
    seg.add(sp);
    seg.rotation.x = NECK_REST[k];
    parent.add(seg);
    neck.push(seg);
    parent = seg;
  }
  // Head: skull and snout, horns swept back, glowing eyes, a jaw hinged under the skull.
  const head = new THREE.Group();
  head.position.z = neckLen;
  head.rotation.x = 0.35;
  parent.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.95, 1.4), hide);
  skull.position.set(0, 0.15, 0.5);
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.6), hide);
  snout.position.set(0, 0.05, 1.8);
  head.add(snout);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.5, 6), hornMat);
    horn.position.set(s * 0.45, 0.65, -0.1);
    horn.rotation.set(-1.9, 0, s * 0.35);
    head.add(horn);
    const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 5), hornMat);
    horn2.position.set(s * 0.62, 0.15, 0.1);
    horn2.rotation.set(-1.7, 0, s * 0.9);
    head.add(horn2);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.eye).multiplyScalar(2) }));
    eye.position.set(s * 0.5, 0.4, 1.05);
    head.add(eye);
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.25, 0.4);
  const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 2.4), belly);
  jawMesh.position.set(0, -0.12, 1.15);
  jaw.add(jawMesh);
  head.add(jaw);
  // The fire glow in the mouth, lit while she breathes or casts.
  const mouthGlow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a10).multiplyScalar(2.5), transparent: true, opacity: 0 }));
  mouthGlow.position.set(0, -0.1, 2.4);
  head.add(mouthGlow);

  // Tail: tapering segments swinging behind.
  const tail = [];
  parent = body;
  for (let k = 0; k < 9; k++) {
    const seg = new THREE.Group();
    seg.position.set(0, k === 0 ? -0.1 : 0, k === 0 ? -3.0 : -0.95);
    const r = 0.8 * (1 - k / 10);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, 1.15, 8), hide);
    m.rotation.x = Math.PI / 2;
    m.position.z = -0.48;
    m.castShadow = true;
    seg.add(m);
    if (k % 2 === 0) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 5), hornMat);
      sp.position.set(0, r * 0.9, -0.48);
      sp.rotation.x = 0.4;
      seg.add(sp);
    }
    seg.rotation.x = k < 3 ? 0.12 : -0.02;
    parent.add(seg);
    tail.push(seg);
    parent = seg;
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 4), hornMat);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -1.2;
  parent.add(tip);

  // Wings at the shoulders.
  const wings = [-1, 1].map((side) => {
    const w = makeWing(side, c);
    w.position.set(side * 1.2, 1.0, 1.4);
    body.add(w);
    return w;
  });
  // Legs.
  const legs = [[-1, 1.8, true], [1, 1.8, true], [-1, -1.9, false], [1, -1.9, false]].map(([side, z, front]) => {
    const leg = makeLeg(c, front);
    leg.position.set(side * 1.15, -0.55, z);
    body.add(leg);
    return leg;
  });

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData = {
    dragon: true, whelp,
    radius: (whelp ? 1.3 : 3.2) * scale + (whelp ? 0 : 1.2),
    height: 6 * scale,
    rig, body, neck, head, jaw, mouthGlow, tail, wings, legs,
    anim: { mh: 0, breath: 0, roar: 0, cast: 0, fly: 0, run: 0, dead: false, t: Math.random() * 10, deadT: 0 },
  };
  return root;
}

// The mouth's position in the world (fire breath and fireballs come from there).
export function dragonMouth(model) {
  const p = new THREE.Vector3();
  model.userData.mouthGlow.getWorldPosition(p);
  return p;
}

const lerp = (a, b, k) => a + (b - a) * k;

export function animateDragon(model, { dt }) {
  const u = model.userData;
  const a = u.anim;
  a.t += dt;
  const t = a.t;
  // Dying: rolls onto its side and sinks.
  if (a.dead) {
    a.deadT = Math.min(1, a.deadT + dt * 1.6);
    u.rig.rotation.z = lerp(0, 1.4, a.deadT);
    u.rig.position.y = lerp(0, -0.6 * u.rig.scale.y, a.deadT);
    for (const w of u.wings) w.rotation.z = 0;
    return;
  }
  a.deadT = 0;
  u.rig.rotation.z = 0;
  const fly = a.fly;
  // The bite: a quick lunge forward and back.
  if (a.mh > 0) a.mh = Math.max(0, a.mh - dt * 2.4);
  const bite = Math.sin(Math.PI * (1 - a.mh)) * (a.mh > 0 ? 1 : 0);
  if (a.roar > 0) a.roar = Math.max(0, a.roar - dt * 0.6);
  const roar = Math.sin(Math.PI * (1 - a.roar)) * (a.roar > 0 ? 1 : 0);
  const breath = Math.min(1, a.breath);
  const cast = Math.min(1, a.cast);

  // Breathing, the body bobbing; in flight it hangs from the wingbeat.
  const beat = Math.sin(t * (fly > 0 ? 5 : 1.4));
  u.body.position.y = 3.4 + beat * (fly > 0 ? 0.25 : 0.04) * (1 + fly);
  u.body.rotation.x = lerp(0, -0.12, fly) + breath * 0.08;
  // Neck and head: rest, lunge (bite, breath), rear (roar, cast).
  const lunge = Math.max(bite, breath * 0.8);
  const rear = Math.max(roar, cast * 0.5);
  u.neck.forEach((seg, k) => {
    const rest = NECK_REST[k] + Math.sin(t * 0.9 + k * 0.6) * 0.03;
    seg.rotation.x = rest + lunge * 0.22 - rear * 0.18;
    seg.rotation.y = Math.sin(t * 0.5 + k) * 0.04;
  });
  u.head.rotation.x = 0.35 + lunge * 0.35 - rear * 0.6;
  u.jaw.rotation.x = Math.max(bite * 0.6, breath * 0.75, roar * 0.8, cast * 0.3);
  u.mouthGlow.material.opacity = Math.max(breath, cast * 0.8);
  // The tail sways, faster when the dragon is busy.
  u.tail.forEach((seg, k) => {
    seg.rotation.y = Math.sin(t * 1.3 - k * 0.5) * (0.08 + k * 0.012) * (1 + fly);
  });
  // Wings: folded along the flanks on the ground, half open in a roar, spread and beating in flight.
  u.wings.forEach((w, i) => {
    const side = i ? 1 : -1;
    const fold = 1 - Math.max(fly, roar * 0.6);
    const flap = fly > 0 ? Math.sin(t * 5) * 0.75 : 0;
    w.rotation.z = side * (lerp(0.05, -0.2, 1 - fold) + flap) + side * fold * 0.15;
    w.rotation.y = side * fold * 1.25;
    w.rotation.x = fold * 0.35;
  });
  // Legs: stand, step while running, tuck in flight.
  if (a.run > 0) a.run = Math.max(0, a.run - dt * 2);
  u.legs.forEach((leg, k) => {
    const step = a.run > 0 ? Math.sin(t * 12 + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.6 : 0;
    leg.rotation.x = lerp(step, k < 2 ? -0.9 : 0.9, fly);
    leg.userData.knee.rotation.x = lerp(k < 2 ? -0.35 : 0.45, k < 2 ? 1.3 : -1.0, fly);
  });
}
