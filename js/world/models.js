import {customizeLook} from './customization.js';
// Character models: a jointed rig (hips, spine, chest, neck, shoulders, elbows, wrists, thighs, knees,
// ankles), race anatomy and simple starter clothing. Held weapons follow equipped gear; class outfits
// and Noggenfogger are cosmetic layers. animateRig() poses idle, walking, combat, attacks, Whirlwind,
// jumping). Models stand on y = 0 and face +Z. Sizes are in yards; a human is about 1.9 yards tall.
import * as THREE from 'three';
import { buildHumanoid } from './character-body.js';
import { starterOutfit, normalizeAppearance, defaultBodyType } from './appearance.js';
import { raceBody } from './race-bodies.js';
import { animateRanged, supportMelee } from './ranged-animation.js';
import { animateSpell } from './spell-animation.js';

// ---- looks -----------------------------------------------------------------------------------

// Race looks. height / width scale the body, head scales the head, hunch leans the spine forward.
export const RACE_LOOKS = {
  RaceHuman: { skin: 0xc39170, height: 1, width: 1.02, head: 1.0, headY: .28, female: true, bust: .12, seat: .065, softEyes: true, iris: 0x52707a, hair: { color: 0x5a3a20, style: 'long' }, brows: 0x4a2f18, jaw: .87, side: 'alliance' },
  RaceDwarf: { skin: 0xb78463, height: 0.7, width: 1.38, head: 1.15, softEyes: true, iris: 0x686844, nose: 'big', beard: 0x9a4a22, hair: { color: 0x9a4a22, style: 'short' }, brows: 0x7a3a18, bushy: true, side: 'alliance' },
  RaceGnome: { skin: 0xcfa17e, height: 0.5, width: 0.92, head: .88, headY: .48, gnome: true, female: true, bust: .11, seat: .07, softEyes: true, iris: 0x50714b, hair: { color: 0xe07ab8, style: 'gnome' }, side: 'alliance', bigHands: 1.25 },
  RaceNightElf: { skin: 0x9c86d1, height: 1.14, width: 0.94, head: 0.98, ears: 'elf', eyeGlow: 0xe8f6ff, hair: { color: 0x3fa8a0, style: 'long' }, brows: 0x3fa8a0, longBrows: true, side: 'alliance' },
  RaceOrc: { skin: 0x5c8a3c, height: 1.02, width: 1.28, head: 1.0, hunch: 0.22, tusks: 'orc', jaw: 1.3, brow: true, nose: 'orc', ears: 'small', hair: { color: 0x151515, style: 'topknot' }, side: 'horde' },
  RaceTroll: { skin: 0x4f7f9a, height: 1.14, width: 0.94, head: 0.95, hunch: 0.36, tusks: 'troll', ears: 'troll', nose: 'long', hair: { color: 0xd0452c, style: 'mohawk' }, side: 'horde' },
  RaceTauren: { skin: 0x6e4a2e, height: 1.24, width: 1.5, head: 1.05, hunch: 0.2, tauren: true, hooves: true, tail: true, side: 'horde', furArms: true },
  RaceUndead: { skin: 0x9aa39a, height: 0.97, width: 0.82, head: 0.92, hunch: 0.12, undead: true, eyeGlow: 0xffd84a, hair: { color: 0x1e1e1e, style: 'stringy' }, side: 'forsaken' },
  RaceHighOrderSkyborne: { skin: 0xdfe7f2, height: 1.08, width: 0.95, head: 0.95, ears: 'elf', eyeGlow: 0x9fd4ff, hair: { color: 0xf4f4ff, style: 'long' }, side: 'sky' },
  RaceWindshaperSkyborne: { skin: 0xbfe0d0, height: 1.08, width: 0.95, head: 0.95, ears: 'elf', eyeGlow: 0xb8ffe0, hair: { color: 0x2f6f5f, style: 'long' }, side: 'sky' },
  brute: { skin: 0xb5442c, height: 1.05, width: 1.5, head: 1, hunch: 0.32, tusks: 'orc', jaw: 1.4, brow: true, horns: true, eyeGlow: 0xff7a10, side: 'brute', spikes: true },
  tank: { skin: 0xd8b48f, height: 1, width: 1.08, head: 1, hair: { color: 0x2b2b2b, style: 'short' }, brows: 0x222222, side: 'tank' },
};

// Cloth colours to pick from by item ID, and trim by item quality (2 uncommon .. 5 legendary).
const CLOTH = [0x8e2a1e, 0x2d4f8e, 0x3d6b3a, 0x5a3a6e, 0x7a6a3a, 0x2a5a5a, 0x6e2a4a, 0x3a3a3a, 0x8a5a2a, 0x2a2a5a, 0x5e5e5e, 0x7a2a2a];
const TRIM = { 1: 0x8a8f96, 2: 0xa07a3a, 3: 0x8fb4d8, 4: 0xb07ad8, 5: 0xff9a2a };
const pick = (id, list) => list[Math.abs((id * 2654435761) >>> 0) % list.length];

// Classic warrior armour sets: 3+ pieces worn colour the plate, trim and cloth like the set's art.
const SET_LOOKS = [
  { match: /Battlegear of Valor/, plate: 0xb4bcc6, trim: 0xd4af37, cloth: 0x2d4f8e },
  { match: /Battlegear of Heroism/, plate: 0xb08a4a, trim: 0xe0c060, cloth: 0x8e2a1e },
  { match: /Vindicator's Battlegear/, plate: 0x7a2a1e, trim: 0xb08d3c, cloth: 0x2a3a2a, spikes: true },
  { match: /Conqueror's Battlegear/, plate: 0xc9a24a, trim: 0x7a5a20, cloth: 0x3a2a5a },
  { match: /Dreadnaught's Battlegear/, plate: 0x5a6068, trim: 0x8fb4d8, cloth: 0x1e2a3a, spikes: true },
  { match: /Imperial Plate/, plate: 0x4a4a52, trim: 0xd4af37, cloth: 0x5a1a1a },
  { match: /Warlord's Battlegear|Champion's Battlegear/, plate: 0x3a2a26, trim: 0xb03020, cloth: 0x8e1d17, spikes: true },
  { match: /Field Marshal's Battlegear|Lieutenant Commander's Battlegear/, plate: 0xa7b4c4, trim: 0xd4af37, cloth: 0x1d3f7a },
  { match: /Justice|Glory/, plate: 0x6a5a8a, trim: 0xd8c070, cloth: 0x3a2a5a },
];

// The ranged slot's bow, gun or crossbow, read off its icon (the item list carries no ranged weapon type).
const rangedKind = (icon = '') => (/crossbow/.test(icon) ? 'crossbow' : /rifle|gun/.test(icon) ? 'gun' : /bow/.test(icon) ? 'bow' : null);

// Outfit colours and weapon types from the equipped gear (character.js gear list).
export function gearLook(gear) {
  if (!gear || !gear.length) return null;
  const setCounts = {};
  for (const g of gear) if (g.set) setCounts[g.set] = (setCounts[g.set] || 0) + 1;
  const [setName, pieces] = Object.entries(setCounts).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const set = pieces >= 3 ? SET_LOOKS.find((s) => s.match.test(setName)) : null;
  const bySlot = Object.fromEntries(gear.map((g) => [g.slot, g]));
  const chest = bySlot[4];
  const legs = bySlot[8];
  const back = bySlot[3];
  const shoulders = bySlot[2];
  const mh = bySlot[14];
  const oh = bySlot[15];
  const ranged = bySlot[16];
  return {
    key: gear.map((g) => g.id).join(','),
    tunic: chest ? pick(chest.id, CLOTH) : null,
    trim: chest ? TRIM[chest.quality] || TRIM[2] : null,
    pants: legs ? pick(legs.id + 7, CLOTH) : null,
    cloak: back ? pick(back.id + 3, CLOTH) : null,
    pads: shoulders ? (shoulders.quality >= 4 ? 'plate' : 'leather') : 'none',
    mh: mh ? (mh.ht === 4 ? `2h${mh.wt}` : mh.wt) : null,
    oh: oh && oh.wt ? oh.wt : null,
    ranged: ranged ? rangedKind(ranged.icon) : null,
    set,
  };
}

// Shared player factory. Outfit/class and transformation are independent of race and equipment.
export function buildPlayer(race = 'RaceOrc', gear = null, appearance = {}) {
  const options = normalizeAppearance(appearance, race);
  options.bodyType ||= defaultBodyType(race);
  const model = buildHumanoid(customizeLook(raceBody(race, RACE_LOOKS[race] || RACE_LOOKS.RaceOrc, options.bodyType),options.customization), {
    ...options, outfit: starterOutfit(race, options.classId, options.bodyType), gear,
  });
  model.userData.race = race;
  model.userData.customization = options.customization;
  return model;
}

// Existing callers keep working while future classes can use buildPlayer/makeCharacter.
export function buildWarrior(race, gear = null) {
  return buildPlayer(race, gear);
}

export function buildTank() {
  return buildHumanoid(RACE_LOOKS.tank, { outfit: starterOutfit('RaceHuman'), offHand: 'shield' });
}

export function buildBoss() {
  const g = buildHumanoid(RACE_LOOKS.brute, { outfit: { ...starterOutfit('RaceOrc'), pants: 0x382c22, weapon: 'greataxe' } });
  g.scale.setScalar(2.8);
  g.userData.radius = 2.5;
  g.userData.height = 6.4;
  return g;
}

// ---- animation --------------------------------------------------------------------------------

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => x * x * (3 - 2 * x);

// One arm's attack: wind up over the shoulder, chop down with the elbow following through, recover.
// p goes 0 -> 1 over the swing. Returns [shoulder x, shoulder z, elbow x].
function swingPose(p, rest) {
  if (p < 0.3) {
    const k = smooth(p / 0.3);
    return [lerp(rest[0], -2.7, k), lerp(rest[1], 0.25, k), lerp(rest[2], -1.5, k)];
  }
  if (p < 0.6) {
    const k = smooth((p - 0.3) / 0.3);
    return [lerp(-2.7, -0.35, k), lerp(0.25, 0.05, k), lerp(-1.5, -0.1, k)];
  }
  const k = smooth((p - 0.6) / 0.4);
  return [lerp(-0.35, rest[0], k), lerp(0.05, rest[1], k), lerp(-0.1, rest[2], k)];
}

// Poses a rig. s: { dt, speed (0..1 of run speed, negative = backwards), air (bool), combat (bool) }.
// Attacks are started by setting anim.mh / anim.oh / anim.spin to 1.
export function animateRig(model, s) {
  const j = model.userData.rig;
  const a = model.userData.anim;
  const dt = s.dt;
  const ranged = !!j.weaponR?.userData.ranged;
  if (ranged && a.mh > 0) { a.ranged = a.mh; a.mh = 0; }
  if (!ranged) a.ranged = 0;
  a.t += dt;
  a.death = a.dead ? Math.min(1, (a.death || 0) + dt * 1.8) : 0;
  if (a.hit > 0) a.hit = Math.max(0, a.hit - dt * 3.4);
  if (a.cheer > 0) a.cheer = Math.max(0, a.cheer - dt * .55);
  a.move = lerp(a.move, Math.min(1, Math.abs(s.speed)), Math.min(1, dt * 10));
  a.combat = lerp(a.combat, s.combat ? 1 : 0, Math.min(1, dt * 4));
  a.walk += dt * 11 * Math.sign(s.speed || 1) * (0.4 + 0.6 * a.move);
  const m = a.move;
  const ph = a.walk;

  // Legs: thighs swing, knees bend most as the leg passes under the body, feet stay flat.
  const crouch = a.combat * (1 - m) * 0.18;
  for (const [k, off] of [['L', 0], ['R', Math.PI]]) {
    const swing = Math.sin(ph + off);
    const lift = Math.max(0, Math.cos(ph + off));
    let thigh = -swing * 0.65 * m - crouch;
    let knee = (0.08 + lift * 1.05) * m + crouch * 2;
    if (s.air) { thigh = -0.7; knee = 1.2; }
    j['thigh' + k].rotation.x = thigh;
    j['thigh' + k].rotation.z = s.strafe ? s.strafe * swing * .4 * m : 0;
    j['knee' + k].rotation.x = knee;
    j['ankle' + k].rotation.x = -(thigh + knee) * 0.6;
  }
  // Body bob and breathing.
  j.hips.position.y = 0.95 - crouch * 0.25 + Math.abs(Math.sin(ph)) * 0.04 * m - (s.air ? 0.05 : 0);
  j.spine.rotation.y = Math.sin(ph) * 0.12 * m;
  j.spine.rotation.x = model.userData.hunch - Math.sin((1 - (a.hit || 0)) * Math.PI) * .22;
  const breath = Math.sin(a.t * 2.2) * 0.012 * (1 - m);
  j.spine.scale.set(1 + breath, 1 + breath * 0.5, 1 + breath);
  j.head.rotation.y = Math.sin(a.t * 0.5) * 0.08 * (1 - m) * (1 - a.combat);

  // Arms: relaxed at the sides, counter-swinging when walking, weapons up in combat.
  for (const [k, side, off] of [['L', 1, Math.PI], ['R', -1, 0]]) {
    const relaxed = [(model.userData.twoHand ? -.85 : .05) + Math.sin(ph + off) * 0.55 * m, 0.1 * side, -0.25 - 0.25 * m];
    const ready = [-0.55, 0.15 * side, -1.15];
    const rest = relaxed.map((v, i) => lerp(v, ready[i], a.combat));
    let pose = rest;
    const key = k === 'R' ? 'mh' : 'oh';
    if (a[key] > 0) {
      pose = swingPose(1 - a[key], rest);
      pose[1] = side * Math.abs(pose[1]); // Keep the windup outside the head on both sides.
      a[key] = Math.max(0, a[key] - dt * 2.6);
    }
    if (a.spin > 0) pose = [-1.45, 1.35 * side, -0.15];
    if (s.air && a[key] === 0 && a.spin === 0) pose = [-0.9, 0.45 * side, -0.9];
    if (a.cheer > 0 && !a.dead) pose = [-2.65 + Math.sin(a.t * 9) * .18, .3 * side, -.55];
    pose = [pose[0], pose[1] + side * .18 * Math.abs(s.strafe || 0) * m, pose[2]];
    if (model.userData.twoHand && k === 'R') pose = [pose[0], .5, pose[2]];
    j['shoulder' + k].rotation.set(pose[0], 0, pose[1]);
    j['elbow' + k].rotation.set(pose[2],0,0);
    const swinging = a[key] > 0 || a.spin > 0;
    const held=j['weapon'+k];
    j['wrist' + k].rotation.set(held && !held.userData.ranged && held.userData.kind!=='shield' ? -.95 : swinging ? .2 : 0,0,0);
  }
  // Support a two-handed grip with the left arm, including while the right arm swings.
  if (model.userData.twoHand && j.weaponR && !ranged && !a.dead) {
    supportMelee(model);
  }
  if (ranged) animateRanged(model,s);
  animateSpell(model,dt);
  if (a.spin > 0) a.spin = Math.max(0, a.spin - dt * 2.2);

  // Hair, tail and beard braids sway, blown back when running and bouncing in jumps.
  j.hair.forEach((h, i) => {
    const sway = Math.sin(a.t * 2.4 + i * 1.3) * h.amp * 0.4 + Math.sin(ph * 2 + i) * h.amp * m * 0.6;
    h.obj.rotation.x = h.base.x + sway + m * h.amp * 1.4 + (s.air ? h.amp * 1.5 : 0);
    h.obj.rotation.z = h.base.z + Math.sin(a.t * 1.7 + i) * h.amp * 0.3;
  });

  // The cloak flows back with speed and ripples.
  if (j.cloak) {
    const pos = j.cloak.geometry.attributes.position;
    const rest = j.cloak.userData.rest;
    const back = 0.06 + m * 0.42 + (s.air ? 0.3 : 0) + a.combat * 0.04;
    for (let i = 0; i < pos.count; i++) {
      const x = rest[i * 3];
      const y = rest[i * 3 + 1];
      const v = -y / 0.95; // 0 at the shoulders, 1 at the hem
      const wave = Math.sin(a.t * 4 + v * 4 + x * 6) * 0.035 * v + Math.sin(ph + v * 2) * 0.05 * v * m;
      pos.setZ(i, -Math.pow(v, 1.4) * back - wave);
      pos.setY(i, y + Math.pow(v, 2) * back * 0.35);
    }
    pos.needsUpdate = true;
    j.cloak.geometry.computeVertexNormals();
  }

  // Wings flap gently.
  if (j.wingL) {
    const f = Math.sin(a.t * (s.air ? 9 : 1.6)) * (s.air ? 0.45 : 0.12);
    j.wingL.rotation.y = -0.55 - f;
    j.wingR.rotation.y = 0.55 + f;
  }
  // Fall around the feet; resets restore the upright pose without changing world position.
  const fall = smooth(a.death);
  model.userData.body.rotation.x = -Math.PI * .49 * fall;
  model.userData.body.position.y = .20 * fall;
  if (a.dead) {
    a.mh = a.oh = a.ranged = a.spin = a.hit = a.cheer = 0;
    for (const side of ['L', 'R']) {
      j['shoulder' + side].rotation.set(.1, 0, (side === 'L' ? .35 : -.35));
      j['elbow' + side].rotation.set(-.25,0,0);
      j['thigh' + side].rotation.set(0, 0, side === 'L' ? .08 : -.08);
      j['knee' + side].rotation.x = .10;
    }
    // A long bow must remain beside the fallen body instead of tilting through its ribs.
    if (j.weaponR?.userData.kind === 'bow') {
      j.shoulderR.rotation.z=-.65;
      j.wristR.quaternion.copy(j.shoulderR.quaternion.clone().multiply(j.elbowR.quaternion).invert().multiply(j.spine.quaternion.clone().invert()));
    }
  }
}

// World positions of a weapon's base and tip, for swing trails. Returns null without a weapon.
export function bladePoints(model, side) {
  const w = model.userData.rig['weapon' + side];
  if (!w || !w.userData.tip) return null;
  return [w.userData.base.getWorldPosition(new THREE.Vector3()), w.userData.tip.getWorldPosition(new THREE.Vector3())];
}
