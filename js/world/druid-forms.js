// Dedicated druid forms with race-specific fur and feathers.
// They preserve the animateCompanion rig contract (companions.js).
import * as THREE from 'three';
import { druidBeast } from './druid-beasts.js';
import { formPalette } from './druid-colors.js';
import { material, ellipsoid, joint, bone, curve, horn, eyes, setup, finish } from './companion-shapes.js';

export const DRUID_FORMS = Object.freeze(['cat', 'bear', 'moonkin']);

// Fur and feathers per race: skin, light (belly, muzzle), dark (paws, stripes), eye (glows).
const FUR = {
  RaceNightElf: { cat: [0x3b3150, 0x6c5b8c, 0x1d1828], bear: [0x2e3450, 0x5e6a90, 0x171a28], moonkin: [0x46507a, 0x9aa6cf, 0x262b44], eye: 0xd8c8ff },
  RaceTauren: { cat: [0x8a5a32, 0xd2b48c, 0x3a2616], bear: [0x5a3a24, 0xa07850, 0x2a1a10], moonkin: [0x6e5134, 0xd7c09a, 0x37281a], eye: 0xffe08a },
  RaceHighOrderSkyborne: { cat: [0xcfc7b6, 0xf4efe4, 0x6d665a], bear: [0x9a958c, 0xdcd6c8, 0x4a4740], moonkin: [0xc8c0d8, 0xf2eefa, 0x6a6480], eye: 0x9fe7ff },
  RaceWindshaperSkyborne: { cat: [0x5d7f74, 0xa9c9b8, 0x2a3c36], bear: [0x4a5f52, 0x8fa898, 0x222e28], moonkin: [0x5b8a86, 0xb6dccf, 0x2a4442], eye: 0xbaffd8 },
};
// Keep the existing world sizes while giving the forms their own anatomy.
const SCALE = { cat: 1.45, bear: 1.75 };
const furOf = (race) => FUR[race] || FUR.RaceNightElf;

function scaled(root, s) {
  root.userData.body.scale.setScalar(s);
  root.userData.body.userData.restScale = root.userData.body.scale.clone();
  root.userData.height *= s;
  root.userData.radius *= s;
  return root;
}

// Broad overlapping feathers with a raised central ridge and a pointed tip.
function plume(parent, mat, position, width, length, tilt=0) {
  const vertices=[0,0,.025,-width,-length*.30,0,0,-length,0, 0,0,.025,0,-length,0,width,-length*.30,0];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,mat);m.position.set(...position);m.rotation.z=tilt;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}

// Moonkin: a round feathered body on short legs, feathered arms, an owl's face with a beak and antlers.
function moonkin(race) {
  const root = setup('moonkin', 'druid');
  const { body, rig } = root.userData;
  const fur = furOf(race);
  const [featherHex, lightHex, darkHex] = fur.moonkin;
  const feather = material(featherHex);
  const light = material(lightHex);
  const dark = material(darkHex);
  const eye = material(fur.eye, fur.eye);
  const ivory = material(0xe3d3ac);
  const beak = material(0xd9a441);
  feather.side=light.side=dark.side=THREE.DoubleSide;
  root.userData.biped = true;

  ellipsoid(body, feather, [0, 1.12, 0], [0.56, 0.64, 0.46]);
  ellipsoid(body, light, [0, 1.02, 0.27], [0.4, 0.46, 0.22]);
  for(let row=0;row<5;row++)for(let col=-2;col<=2;col++){
    const x=col*.135+(row%2)*.025,y=1.40-row*.17,z=.28+Math.sqrt(Math.max(0,1-(x/.48)**2-((y-1.05)/.65)**2))*.20;
    plume(body,(row+col)%3===0?feather:light,[x,y,z],.095,.25,-col*.08);
  }
  // Shoulder ruff.
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * Math.PI * 1.1;
    ellipsoid(body, feather, [Math.sin(a) * 0.46, 1.6, Math.cos(a) * 0.2 - 0.05], [0.13, 0.09, 0.16]).rotation.y = a;
  }

  const head = joint(body, [0, 1.86, 0.06]);
  rig.head = head;
  ellipsoid(head, feather, [0, 0, 0], [0.36, 0.31, 0.32]);
  ellipsoid(head, light, [0, -0.02, 0.2], [0.29, 0.23, 0.12]);
  for (const s of [-1, 1]) {
    ellipsoid(head,dark,[s*.145,.015,.265],[.135,.155,.055]);
    ellipsoid(head,light,[s*.145,.02,.30],[.112,.13,.025]);
    ellipsoid(head,dark,[s*.13,.025,.325],[.070,.078,.018]);
    ellipsoid(head,eye,[s*.13,.025,.343],[.052,.059,.012]);
    ellipsoid(head,dark,[s*.13,.025,.355],[.021,.039,.006]);
    const brow=ellipsoid(head,feather,[s*.13,.115,.32],[.15,.05,.06]);brow.rotation.z=-s*.23;
    for(let i=0;i<4;i++)plume(head,i%2?light:feather,[s*(.20+i*.025),.04-i*.055,.23-i*.018],.065,.18,-s*.6);
  }
  ellipsoid(head,beak,[0,-.065,.33],[.075,.085,.08]);
  horn(head,beak,[0,-.09,.39],[0,-.21,.39],.052);
  // Antlers and ear tufts.
  for (const s of [-1, 1]) {
    horn(head, feather, [s * 0.2, 0.2, -0.04], [s * 0.3, 0.42, -0.1], 0.07);
    bone(head, ivory, [s * 0.16, 0.24, -0.08], [s * 0.36, 0.62, -0.16], 0.035, 0.022);
    horn(head, ivory, [s * 0.36, 0.62, -0.16], [s * 0.5, 0.82, -0.2], 0.022);
    horn(head, ivory, [s * 0.3, 0.5, -0.14], [s * 0.18, 0.72, -0.1], 0.018);
    horn(head, ivory, [s * 0.42, 0.7, -0.18], [s * 0.6, 0.72, -0.08], 0.016);
  }

  // Feathered arms ending in clawed hands; they swing with the walk and strike.
  for (const s of [-1, 1]) {
    const arm = joint(body, [s * 0.5, 1.45, 0.02]);
    rig.legs.push({ node: arm, phase: s === 1 ? Math.PI : 0, arm: true });
    bone(arm, feather, [0, 0, 0], [s * 0.12, -0.38, 0.06], 0.13, 0.1);
    bone(arm, feather, [s * 0.12, -0.38, 0.06], [s * 0.14, -0.74, 0.16], 0.1, 0.075);
    for(let row=0;row<3;row++)for(let i=0;i<3;i++)plume(arm,i%2?feather:dark,[s*(.02+i*.065),-.08-row*.18,.10],.085,.32,s*(.10+i*.17));
    for (let i = 0; i < 4; i++) ellipsoid(arm, i % 2 ? light : feather, [s * (0.16 + i * 0.012), -0.2 - i * 0.15, -0.06], [0.05, 0.16, 0.035]).rotation.z = s * 0.25;
    ellipsoid(arm, dark, [s * 0.14, -0.79, 0.18], [0.09, 0.08, 0.1]);
    for (const k of [-1, 0, 1]) horn(arm, ivory, [s * 0.14 + k * 0.04, -0.82, 0.24], [s * 0.14 + k * 0.05, -0.92, 0.3], 0.018);
  }
  // Short legs with talons.
  for (const s of [-1, 1]) {
    const leg = joint(body, [s * 0.24, 0.6, 0]);
    rig.legs.push({ node: leg, phase: s === 1 ? 0 : Math.PI });
    bone(leg, feather, [0, 0, 0], [0, -0.32, 0.02], 0.15, 0.11);
    bone(leg, dark, [0, -0.32, 0.02], [0, -0.55, 0.05], 0.07, 0.05);
    for (const k of [-1, 0, 1]) horn(leg, ivory, [k * 0.05, -0.57, 0.06], [k * 0.08, -0.6, 0.2], 0.03);
  }
  // Tail feathers.
  const tail = joint(body, [0, 0.82, -0.4]);
  rig.tails.push(tail);
  for (const s of [-1, 0, 1]) curve(tail, s ? feather : dark, [[0, 0, 0], [s * 0.1, -0.12, -0.16], [s * 0.18, -0.3, -0.24]], 0.045);
  return finish(root);
}

// A form model for a race, in the colour chosen for it (customization: { catForm, bearForm }, druid-colors.js); it
// stands on y = 0 and faces +Z like the characters.
export function buildDruidForm(kind, race = 'RaceNightElf', customization = {}) {
  if (!DRUID_FORMS.includes(kind)) throw new RangeError('Unknown druid form: ' + kind);
  if (kind === 'moonkin') return moonkin(race);
  const fur = furOf(race), [base, light, dark] = fur[kind];
  const palette = formPalette(race, kind, (customization || {})[kind + 'Form']) || { base, light, dark, mane: dark, mark: light, eye: fur.eye };
  const root = druidBeast(kind, race, palette);
  return scaled(root, SCALE[kind]);
}

// Shadowform and stealth on any model: a dark violet veil (shadow) and/or see-through (alpha 0..1). Each material keeps
// its own colours to come back to.
export function veilModel(model, { alpha = 1, shadow = false } = {}) {
  const key = `${alpha}|${shadow}`;
  if (model.userData.veil === key) return;
  model.userData.veil = key;
  model.traverse((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) {
      const base = m.userData.unveiled || (m.userData.unveiled = {
        color: m.color ? m.color.getHex() : null, emissive: m.emissive ? m.emissive.getHex() : null,
        emissiveIntensity: m.emissiveIntensity, opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite,
      });
      if (m.color && base.color != null) {
        m.color.setHex(base.color);
        if (shadow) m.color.lerp(SHADOW_TINT, 0.78);
      }
      if (m.emissive && base.emissive != null) {
        m.emissive.setHex(shadow ? SHADOW_GLOW : base.emissive);
        m.emissiveIntensity = shadow ? 0.35 : base.emissiveIntensity;
      }
      const see = alpha < 1 || shadow;
      m.transparent = see || base.transparent;
      m.opacity = (base.opacity ?? 1) * alpha * (shadow ? 0.85 : 1);
      m.depthWrite = see ? alpha >= 1 : base.depthWrite;
      m.needsUpdate = true;
    }
    if (o.isMesh) o.castShadow = alpha >= 0.75;
  });
}
const SHADOW_TINT = new THREE.Color(0x1a1028);
const SHADOW_GLOW = 0x4a1f78;
