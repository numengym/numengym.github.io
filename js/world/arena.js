// 3D training ground: the warrior, the dummies or boss, movement, the camera and the visual effects.
// Distances are in yards (1 three.js unit = 1 yard). Models face +Z when their rotation is 0.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RANGE } from '../data/warrior.js';
import { bladePoints } from './models.js';
import { animateCharacter, disposeCharacter, makeCharacter } from './characters.js';
import {startSpell,stopSpell} from './spell-animation.js';
import { SpellFx } from './spell-fx.js';
import { normalizeAppearance } from './appearance.js';
import { ARENA_RADIUS, Environment, QUALITY, lookFor } from './environment.js';
import { Effects } from './effects.js';
import { animateCompanion, disposeCompanion, makeCompanion, TOTEM_RACES } from './companions.js';
import { buildDruidForm, veilModel } from './druid-forms.js';
import { holdWeapons } from './character-body.js';
import { animateDragon, makeDragon } from './dragon.js';

// Where a new totem stands, from the player: [side, forward] in yards, out to the sides so the camera keeps a clear view.
const TOTEM_SPOTS = { earth: [-1.6, 0.6], fire: [1.6, 0.6], water: [-1.9, -0.4], air: [1.9, -0.4] };
const TOTEM_FADE = 1.2; // seconds a totem takes to sink away when it ends

// A hunter's traps on the ground, by their school.
const TRAP_COLORS = { immolationTrap: 0xff6a1a, explosiveTrap: 0xff3a00, freezingTrap: 0x9fe0ff, frostTrap: 0x5ab8ff };

const RUN_SPEED = 7;        // yards per second
const BACK_SPEED = 4.5;
const TURN_SPEED = Math.PI; // radians per second for keyboard turning
// Camera: looks at the player's chest; tilt from just above the ground to nearly straight down.
const CAM_LOOK_Y = 1.6;
const CAM_PITCH = 0.42;
const CAM_PITCH_MIN = -0.15;
const CAM_PITCH_MAX = 1.35;
const CAM_DIST_MIN = 3;
const CAM_DIST_MAX = 30;
const CHARGE_SPEED = 25;
const BOSS_SPEED = 6;       // yards per second, a melee boss walking after whoever has aggro
const BOSS_TURN = 5;        // radians per second
const JUMP_SPEED = 8;
const GRAVITY = 25;
const START = { x: 0, z: 16 };

const forwardOf = (yaw) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

// Colour grade: a touch more saturation and warmth, and a soft vignette towards the corners.
const GRADE_SHADER = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.32 }, saturation: { value: 1.12 }, warmth: { value: 0.02 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; uniform float saturation; uniform float warmth; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, saturation) + vec3(warmth, warmth * 0.4, -warmth) * l;
      c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, distance(vUv, vec2(0.5)));
      gl_FragColor = c;
    }`,
};

// A straw training dummy on a post. Its upper part sits in a group that wobbles when hit.
function buildDummy() {
  const g = new THREE.Group();
  const wob = new THREE.Group();
  g.add(wob);
  const lowMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const wood = lowMat(0x6b4a2a);
  const straw = lowMat(0xc9a66b);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.2, 12), wood);
  post.position.y = 0.6;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.4, 20, 2), straw);
  body.position.y = 1.8;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), straw);
  head.position.y = 2.85;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2, 0.18, 0.18), wood);
  bar.position.y = 2.2;
  // Rope bands and the front: a red target on the chest and a wooden shield, so you can tell where it faces.
  for (const y of [1.3, 2.35]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 6, 32), lowMat(0x8a6a3a));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    wob.add(band);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 28), lowMat(0xa5321f));
  ring.position.set(0, 1.9, 0.62);
  const bull = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), lowMat(0xa5321f));
  bull.position.set(0, 1.9, 0.66);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 24), wood);
  shield.rotation.z = Math.PI / 2;
  shield.rotation.y = Math.PI / 2;
  shield.position.set(-0.85, 1.9, 0.35);
  for (const m of [post, body, head, bar, shield]) m.castShadow = true;
  g.add(post);
  wob.add(body, head, bar, ring, bull, shield);
  g.userData = { radius: RANGE.dummyRadius, height: 3.2, wob, wobble: { x: 0, z: 0, vx: 0, vz: 0 } };
  return g;
}

// Ground marks under a target: a red half circle for the front (parry side) and the selection ring.
function addTargetMarks(target, radius) {
  const marks = new THREE.Group();
  const front = new THREE.Mesh(new THREE.CircleGeometry(RANGE.melee + radius, 40, -Math.PI / 2, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.08, depthWrite: false }));
  // The half circle starts on +X; turning it -90 degrees and laying it flat puts it on +Z, the front.
  front.rotation.x = -Math.PI / 2;
  front.rotation.z = -Math.PI / 2;
  front.position.y = 0.02;
  const select = new THREE.Mesh(new THREE.RingGeometry(radius + 0.15, radius + 0.35, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.9, depthWrite: false }));
  select.rotation.x = -Math.PI / 2;
  select.position.y = 0.03;
  marks.add(front, select);
  marks.position.copy(target.position);
  marks.rotation.y = target.rotation.y;
  target.userData.select = select;
  target.userData.marks = marks; // they follow a boss that moves and turns
  return marks;
}

// A flat sector on the ground centred on +Z. Laid flat (rotation x -90 degrees), the shape's -Y
// direction becomes +Z, so the sector is built around -Y.
function sectorMesh(radius, halfAngle, color, opacity, inner = 0) {
  const start = -Math.PI / 2 - halfAngle;
  const geo = inner
    ? new THREE.RingGeometry(inner, radius, 48, 1, start, halfAngle * 2)
    : new THREE.CircleGeometry(radius, 48, start, halfAngle * 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.05;
  return m;
}

export class Arena {
  constructor(container, { quality = 'medium', time = 'sunset' } = {}) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Film-like tone mapping: bright fire and highlights roll off softly instead of clipping.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    container.prepend(this.renderer.domElement);
    this.renderer.domElement.className = 'arena-canvas';

    this.scene = new THREE.Scene();
    // A soft studio environment for reflections, so plate armour and weapons read as metal.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this.quality = quality;
    this.timeOfDay = time;
    this.env = new Environment(this.scene, this.renderer, { quality, time });
    this.fx = new Effects(this.scene, QUALITY[quality]);
    this.spellFx = new SpellFx(this);

    this.race = 'RaceOrc';
    this.gearKey = '';
    this.appearance = normalizeAppearance();
    this.player = this.makePlayer(this.race);
    this.scene.add(this.player);
    this.auraLight = new THREE.PointLight(0xff5a1a, 0, 6, 2);
    this.scene.add(this.auraLight);
    this.dummies = [];
    this.extras = [];   // tank and target marks, rebuilt with the targets
    this.effects = [];  // telegraphs and ground effects: { mesh, until, update, fire }
    this.boss = false;
    this.knock = null;
    this.combat = false;
    this.fiery = 0;     // 1 Death Wish or Recklessness, 2 both

    this.keys = new Set();
    this.yaw = Math.PI;          // player facing
    // Free camera, as in WoW and the miao.tips trainer: its own direction and tilt, not tied to the facing.
    this.camYaw = Math.PI;       // direction the camera looks (camera sits behind it)
    this.camPitch = CAM_PITCH;   // radians above the horizon
    this.camDist = 9;
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camSnap = true;
    this.shakeAmt = 0;
    this.mouse = { left: false, right: false }; // mouse buttons held over the 3D view
    this.bossFocus = null; // where a melee boss walks to: whoever has aggro (set by the fight every frame)
    this.charging = null;
    this.vy = 0;
    this.time = 0;
    this.anim = { spin: 0 };
    this.onSelect = null;
    this.bindInput();
    this.setupPost();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
    this.reset();
    this.applyEnvIntensity();
  }

  // Build your warrior, the tank and the boss from the same original character rig.
  makePlayer(race, gear) { return makeCharacter({ race, role: 'player', gear, ...this.appearance }); }
  makeTank() { return makeCharacter({ role: 'tank' }); }
  makeBoss() { return makeCharacter({ role: 'boss' }); }

  // Cosmetic-only hook for Settings. Toggles rebuild the visual rig while keeping fight state,
  // position, facing, weapons and the current animation. Gear/race changes retain this appearance.
  setAppearance(patch = {}) {
    // The class asked for is kept, so a race that allows it later (setRace) still gets its outfit.
    if (patch.classId) this.wantClass = patch.classId;
    const next = normalizeAppearance({ ...this.appearance, ...patch, classId: this.wantClass || this.appearance.classId }, this.race);
    if (next.classId === this.appearance.classId && next.transform === this.appearance.transform && next.bodyType === this.appearance.bodyType) return;
    const anim = { ...this.player.userData.anim };
    const rotation = this.player.rotation.clone();
    this.appearance = next;
    this.gearKey = null;
    this.setRace(this.race, this.gear);
    Object.assign(this.player.userData.anim, anim);
    this.player.rotation.copy(rotation);
    animateCharacter(this.player, { dt: 0, speed: 0, strafe: 0, air: (this.jumpY || 0) > 0.05, combat: this.combat });
  }

  // Damage taken and death play on your character.
  hurt() { this.player.userData.anim.hit = 1; if (this.formModel) this.formModel.userData.anim.hit = 1; }
  die() { this.player.userData.anim.dead = true; if (this.formModel) this.formModel.userData.anim.dead = true; }

  // Post-processing for medium and high quality: the scene renders into an HDR buffer, bloom makes
  // fire, sparks and crits glow, then the colour grade and tone mapping produce the final image.
  setupPost() {
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    const q = QUALITY[this.quality];
    if (!q.post) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), q.bloom, 0.5, 0.85));
    this.composer.addPass(new ShaderPass(GRADE_SHADER));
    this.composer.addPass(new OutputPass());
  }

  // Scales every material's environment reflections by the time of day (dim at night). Each material
  // remembers its own base strength the first time it is seen.
  applyEnvIntensity() {
    const k = lookFor(this.timeOfDay).envI; // a time of day or a zone's look
    this.scene.traverse((o) => {
      if (!o.material) return;
      for (const m of [].concat(o.material)) {
        if (!('envMapIntensity' in m)) continue;
        if (m.userData.envBase == null) m.userData.envBase = m.envMapIntensity;
        m.envMapIntensity = m.userData.envBase * k;
      }
    });
  }

  // Graphics quality (low / medium / high) and time of day (sunset / night / snowy).
  setGraphics({ quality = this.quality, time = this.timeOfDay }) {
    if (quality === this.quality && time === this.timeOfDay) return;
    this.env.dispose();
    this.fx.dispose();
    this.quality = quality;
    this.timeOfDay = time;
    this.env = new Environment(this.scene, this.renderer, { quality, time });
    this.fx = new Effects(this.scene, QUALITY[quality]);
    this.scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
    this.applyEnvIntensity();
    this.setupPost();
    this.resize();
  }

  // Rebuilds your warrior when the race or the equipped gear changes.
  setRace(race, gear = null) {
    const key = `${race}|${gear ? gear.key : ''}`;
    if (key === `${this.race}|${this.gearKey}`) return;
    const { position } = this.player;
    this.scene.remove(this.player);
    disposeCharacter(this.player);
    this.race = race;
    this.appearance = normalizeAppearance({ ...this.appearance, classId: this.wantClass || this.appearance.classId }, race);
    this.gear = gear;
    this.gearKey = gear ? gear.key : '';
    this.player = this.makePlayer(race, gear);
    this.player.position.copy(position);
    this.scene.add(this.player);
    this.applyEnvIntensity();
    // A form in the new race's fur; the veil on the new character.
    if (this.formKind) { this.formKey = null; this.setForm(this.formKind); }
    this.player.visible = !this.formModel;
    if (this.veil) veilModel(this.player, this.veil);
    if (this.heldMode) holdWeapons(this.player, this.heldMode);
  }

  // A hunter's weapons: 'ranged' (the bow, gun or crossbow in the hands) or 'melee'; the other set is on the back.
  setHeld(mode = null) {
    this.heldMode = mode;
    if (mode) holdWeapons(this.player, mode);
  }

  // Dummies in a row, or one boss, held by an NPC tank standing in front of it unless a player tanks (npcTank false).
  setScene({ boss = false, targets = 1, npcTank = true }) {
    this.lastScene = { boss, targets, npcTank };
    for (const o of [...this.dummies, ...this.extras]) this.scene.remove(o);
    this.clearEffects();
    this.extras = [];
    this.boss = boss;
    if (boss) {
      // Onyxia and her whelps (targets past the first, hidden until they come); any other boss is the Brute.
      const b = boss === 'onyxia' ? makeDragon({ scale: 1.2 }) : this.makeBoss();
      this.dummies = [b];
      if (boss === 'onyxia') {
        for (let i = 1; i < targets; i++) {
          const w = makeDragon({ scale: 0.22, whelp: true });
          w.visible = false;
          w.position.set(0, 0, -300); // out of everyone's reach until they come
          this.dummies.push(w);
        }
      }
      this.tank = null;
      if (npcTank) {
        const tank = this.makeTank();
        tank.position.set(0, 0, b.userData.radius + 0.9);
        tank.rotation.y = Math.PI;
        this.tank = tank;
        this.extras.push(tank);
      }
    } else {
      this.tank = null;
      this.dummies = Array.from({ length: targets }, (_, i) => {
        const d = buildDummy();
        d.position.set((i - (targets - 1) / 2) * 3.2, 0, 0);
        return d;
      });
    }
    for (const d of this.dummies) {
      this.scene.add(d);
      this.extras.push(addTargetMarks(d, d.userData.radius));
    }
    this.bossScripted = false;
    this.groundDummies();
    for (const o of this.extras) if (!o.parent) this.scene.add(o);
    this.applyEnvIntensity();
  }

  // Start position: in front of the dummies, behind the boss (the tank has its front); the boss back on its spot.
  reset() {
    const lair = this.boss === 'onyxia' && this.env.layout;
    // In a lair: at the boss's side, or in front of it when you tank it (no NPC tank).
    const spot = lair && (this.tank ? lair.start : { x: 0, z: this.dummies[0].userData.radius + 1.5 });
    if (lair) this.player.position.set(spot.x, 0, spot.z);
    else this.player.position.set(START.x, 0, this.boss ? -START.z : START.z);
    this.yaw = lair ? Math.atan2(-spot.x, -spot.z) : this.boss ? 0 : Math.PI;
    this.jumpY = 0;
    this.fearUntil = 0;
    this.bossScripted = false;
    const b = this.boss && this.dummies[0];
    if (b) {
      b.position.set(0, 0, 0);
      b.rotation.y = 0;
      this.followMarks(b);
    }
    this.camYaw = this.yaw; // a new fight starts with the camera behind the player; tilt and zoom are kept
    this.charging = null;
    this.knock = null;
    this.vy = 0;
    this.camSnap = true;
    this.clearEffects();
    this.clearTotems();
    const anim = this.player.userData.anim;
    if (anim) anim.dead = false;
    if (this.formModel) this.formModel.userData.anim.dead = false;
  }

  // ---- a warlock's demon --------------------------------------------------------------------------

  // The pet out: a demon (Codex's models: imp, succubus...) or category 'hunter', a tamed pet (hunter-pets.js); null:
  // none. Where it stands follows what it is doing (posePet).
  setPet(kind = null, category = 'warlock') {
    if (kind === this.petKind) return;
    this.petKind = kind;
    this.petCategory = category;
    if (this.petModel) { this.scene.remove(this.petModel); disposeCompanion(this.petModel); this.petModel = null; }
    if (!kind) return;
    this.petModel = makeCompanion({ category: category || 'warlock', kind });
    this.petModel.position.copy(this.player.position);
    this.petModel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(this.petModel);
  }
  petAttack() { if (this.petModel) this.petModel.userData.anim[this.petKind === 'imp' ? 'cast' : 'attack'] = 1; }

  // What the pet is doing (the fight's pet bar): { engaged, stay }, or null for a pet that just fights.
  setPetState(s = null) { this.petState = s; }

  // Attacking: a melee pet at the target's flank (where you see it past the target), the Imp beside you casting.
  // Following: beside you. Staying: where it stopped.
  posePet(dt, primary) {
    const m = this.petModel;
    if (!m) return;
    const p = this.player.position;
    const target = this.dummies[primary] || this.dummies[0];
    const s = this.petState;
    const engaged = !s || s.engaged;
    const want = new THREE.Vector3();
    if (s && s.stay && !s.engaged) {
      want.copy(m.position);
    } else if (this.petKind === 'imp' || !target || !engaged) {
      const side = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      want.copy(p).setY(0).addScaledVector(side, 1.6);
    } else {
      const dir = new THREE.Vector3().subVectors(target.position, p).setY(0);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      dir.normalize();
      const back = dir.clone();
      dir.set(back.z, 0, -back.x).addScaledVector(back, -0.35).normalize();
      want.copy(target.position).setY(0).addScaledVector(dir, (target.userData.radius || 0.6) + 0.7);
    }
    const gap = want.distanceTo(m.position);
    m.position.lerp(want, Math.min(1, dt * (gap > 6 ? 8 : 4)));
    // It faces the target while fighting or casting, else the way you face.
    const look = target && (engaged || this.petKind === 'imp') ? target.position : m.position.clone().add(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)));
    m.rotation.y = Math.atan2(look.x - m.position.x, look.z - m.position.z);
    animateCompanion(m, { dt, speed: gap > 0.3 ? 1 : 0 });
  }

  // A hunter's range zones on the ground around the target: melee reach (5 yards) blue, the dead zone (5 to 8) orange,
  // Auto Shot's reach (8 to 35) green, past that red at its edge; the zone you stand in is brighter. Distances are from
  // the target's edge, as the fight measures them. zone: 'melee' | 'dead' | 'ranged' | 'out', or null for none.
  setRangeZones(zone, primary = 0) {
    const target = zone && (this.dummies[primary] || this.dummies[0]);
    if (!target) {
      if (this.rangeZones) for (const m of Object.values(this.rangeZones.meshes)) m.visible = false;
      return;
    }
    const r = target.userData.radius || 0.6;
    if (!this.rangeZones || this.rangeZones.r !== r) {
      if (this.rangeZones) for (const m of Object.values(this.rangeZones.meshes)) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
      const band = (inner, outer, color) => {
        const m = new THREE.Mesh(new THREE.RingGeometry(r + inner, r + outer, 96),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
        m.rotation.x = -Math.PI / 2;
        m.renderOrder = 1;
        this.scene.add(m);
        return m;
      };
      this.rangeZones = {
        r,
        meshes: {
          melee: band(4.85, 5, 0x5aa8ff),      // a line at 5 yards
          dead: band(5, 8, 0xff9a2e),          // the band you cannot shoot or swing from
          ranged: band(34.75, 35, 0x6ad16a),   // a line at Auto Shot's 35 yards
          out: band(35, 35.6, 0xe0483a),       // just past it
        },
      };
    }
    const BASE = { melee: 0.55, dead: 0.18, ranged: 0.5, out: 0.25 };
    for (const [k, m] of Object.entries(this.rangeZones.meshes)) {
      m.visible = true;
      m.position.set(target.position.x, 0.06, target.position.z);
      m.material.opacity = k === zone ? Math.min(0.9, BASE[k] * 1.9) : BASE[k];
    }
  }

  // A pet's spell flying to the target (the Imp's Firebolt).
  petBolt(color = 0xff7a2a, primary = 0) {
    const m = this.petModel;
    const target = this.dummies[primary] || this.dummies[0];
    if (!m || !target) return;
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color }));
    bolt.position.copy(m.position).setY(1.1);
    this.scene.add(bolt);
    (this.bolts ||= []).push({ mesh: bolt, from: bolt.position.clone(), to: target.position.clone().setY(1.6), t: 0, time: 0.35 });
  }
  poseBolts(dt) {
    if (!this.bolts || !this.bolts.length) return;
    this.bolts = this.bolts.filter((b) => {
      b.t += dt;
      const k = Math.min(1, b.t / b.time);
      b.mesh.position.lerpVectors(b.from, b.to, k);
      if (k < 1) return true;
      this.fx.hit(b.to, { yellow: true });
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
      return false;
    });
  }

  // A Beast Mastery hunter's hawks up (Summon Hawk): they circle the target, each diving at it on its swings.
  setHawks(count = 0) {
    this.hawks ||= [];
    while (this.hawks.length > count) { const h = this.hawks.pop(); this.scene.remove(h); disposeCompanion(h); }
    while (this.hawks.length < count) {
      const h = makeCompanion({ category: 'hunter', kind: 'hawk' });
      const target = this.dummies[0];
      h.position.copy(target ? target.position : this.player.position).setY(2.4);
      h.userData.orbit = Math.random() * Math.PI * 2;
      h.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(h);
      this.hawks.push(h);
    }
  }
  hawkAttack() {
    const h = this.hawks && this.hawks[Math.floor(Math.random() * this.hawks.length)];
    if (h) h.userData.anim.attack = 1;
  }
  poseHawks(dt, primary) {
    if (!this.hawks || !this.hawks.length) return;
    const target = this.dummies[primary] || this.dummies[0];
    const center = target ? target.position : this.player.position;
    const radius = (target && target.userData.radius || 0.6) + 1.1;
    const top = (target && target.userData.height || 2) * 0.8;
    this.hawks.forEach((h, i) => {
      h.userData.orbit += dt * 0.9;
      const a = h.userData.orbit + i * Math.PI;
      const dive = Math.sin(Math.PI * Math.max(0, h.userData.anim.attack || 0));
      const want = new THREE.Vector3(center.x + Math.cos(a) * radius * (1 - dive * 0.45), top - dive * 0.9, center.z + Math.sin(a) * radius * (1 - dive * 0.45));
      h.position.lerp(want, Math.min(1, dt * 6));
      // Facing along the circle (its tangent).
      h.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      animateCompanion(h, { dt, speed: 1 });
    });
  }

  // ---- druid forms, Shadowform, stealth -----------------------------------------------------------

  // A druid form (cat, bear, moonkin) shown in place of your character, in your race's fur; null: your character.
  setForm(form = null) {
    const key = form ? `${form}|${this.race}` : null;
    if (key === this.formKey) return;
    this.formKey = key;
    this.formKind = form;
    if (this.formModel) { this.scene.remove(this.formModel); disposeCompanion(this.formModel); this.formModel = null; }
    if (form) {
      this.formModel = buildDruidForm(form, this.race);
      this.formModel.position.copy(this.player.position);
      this.formModel.rotation.y = this.player.rotation.y;
      this.scene.add(this.formModel);
      if (this.veil) veilModel(this.formModel, this.veil);
    }
    this.player.visible = !this.formModel;
  }

  // A veil over whatever shows you: alpha (0.5 in stealth) and shadow (Shadowform's dark violet).
  setVeil({ alpha = 1, shadow = false } = {}) {
    this.veil = { alpha, shadow };
    veilModel(this.player, this.veil);
    if (this.formModel) veilModel(this.formModel, this.veil);
  }

  // The form follows your character's place, facing and movement.
  poseForm(dt, speed) {
    const f = this.formModel;
    if (!f) return;
    f.position.copy(this.player.position);
    f.rotation.y = this.player.rotation.y;
    animateCompanion(f, { dt, speed });
  }

  // ---- shaman totems ----------------------------------------------------------------------------

  // The totems standing, per element: { earth: key, fire: key, ... }, key = the spell that dropped it (a new key is a
  // new totem) or null. A new totem appears beside the player; one that is gone plays its death and is removed.
  setTotems(standing = {}) {
    this.totems = this.totems || {};
    for (const slot of Object.keys(TOTEM_SPOTS)) {
      const want = standing[slot] || null;
      const have = this.totems[slot];
      if (have && have.key === want) continue;
      if (have && !have.dying) { have.model.userData.anim.dead = true; have.dying = this.time; }
      if (have && have.key !== want && want) this.removeTotem(slot);
      if (!want) continue;
      const race = TOTEM_RACES.includes(this.race) ? this.race : 'RaceOrc';
      const model = makeCompanion({ category: 'totem', kind: slot, race });
      const fwd = forwardOf(this.yaw);
      const [side, back] = TOTEM_SPOTS[slot];
      const p = this.player.position;
      model.position.set(p.x + fwd.x * back - fwd.z * side, 0, p.z + fwd.z * back + fwd.x * side);
      model.position.y = this.groundY(model.position.x, model.position.z);
      model.rotation.y = this.yaw;
      model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(model);
      this.totems[slot] = { key: want, model, dying: 0 };
    }
  }

  removeTotem(slot) {
    const t = this.totems && this.totems[slot];
    if (!t) return;
    this.scene.remove(t.model);
    disposeCompanion(t.model);
    this.totems[slot] = null;
  }

  animateTotems(dt) {
    for (const slot of Object.keys(this.totems || {})) {
      const t = this.totems[slot];
      if (!t) continue;
      animateCompanion(t.model, { dt });
      if (t.dying && this.time - t.dying > TOTEM_FADE) this.removeTotem(slot);
    }
  }

  clearTotems() {
    for (const slot of Object.keys(this.totems || {})) this.removeTotem(slot);
  }

  // ---- hunter traps -------------------------------------------------------------------------

  // A trap at the player's feet: a small rune in its school's colour, until it springs or runs out.
  placeTrap(token, id) {
    this.traps = this.traps || {};
    const color = TRAP_COLORS[id] || 0xffffff;
    const mat = (opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.5, 24), mat(0.85));
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), mat(0.45));
    ring.rotation.x = core.rotation.x = -Math.PI / 2;
    g.add(ring, core);
    const p = this.player.position;
    g.position.set(p.x, this.groundY(p.x, p.z) + 0.04, p.z);
    this.scene.add(g);
    this.traps[token] = { id, mesh: g };
  }

  removeTrap(token) {
    const t = this.traps && this.traps[token];
    if (!t) return;
    this.scene.remove(t.mesh);
    t.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    delete this.traps[token];
  }

  clearTraps() { for (const token of Object.keys(this.traps || {})) this.removeTrap(token); }

  // The trap goes off: Immolation Trap burns on the target, Explosive Trap a fire patch 10 yards wide, Frost Trap an
  // icy patch as wide, Freezing Trap a burst of ice on the target.
  springTrap(token, id, target = 0) {
    const t = this.traps && this.traps[token];
    if (!t) return;
    const { x, z } = t.mesh.position;
    this.removeTrap(token);
    const d = this.dummies[target] || this.dummies[0];
    if (id === 'immolationTrap' && d) {
      const fire = { x: d.position.x, z: d.position.z, r: Math.max(0.6, d.userData.radius * 0.8) };
      this.addEffect(new THREE.Group(), 15, () => { fire.x = d.position.x; fire.z = d.position.z; }, fire);
    } else if (id === 'explosiveTrap') {
      const patch = sectorMesh(10, Math.PI, 0xff5a00, 0.14);
      patch.position.set(x, 0.05, z);
      this.addEffect(patch, 20, (e) => { patch.material.opacity = 0.14 * (1 - (this.time - e.start) / 20) + 0.04; }, { x, z, r: 5 });
      this.shake(0.12);
    } else if (id === 'frostTrap') {
      const patch = sectorMesh(10, Math.PI, 0x6ac8ff, 0.16);
      patch.position.set(x, 0.05, z);
      this.addEffect(patch, 30, (e) => { patch.material.opacity = 0.12 + 0.04 * Math.sin((this.time - e.start) * 3); });
    } else if (id === 'freezingTrap' && d) {
      const ice = new THREE.Mesh(new THREE.CylinderGeometry(d.userData.radius + 0.3, d.userData.radius + 0.3, 2.4, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      ice.position.set(d.position.x, 1.2, d.position.z);
      this.addEffect(ice, 1.2, (e) => { ice.material.opacity = 0.45 * (1 - (this.time - e.start) / 1.2); });
    }
  }

  // ---- boss mechanics: telegraphs, ground effects, knockback ----------------------------------

  clearEffects() {
    for (const e of this.effects) this.scene.remove(e.mesh);
    this.effects = [];
  }

  addEffect(mesh, seconds, update = null, fire = null) {
    this.scene.add(mesh);
    const e = { mesh, until: this.time + seconds, start: this.time, update, fire };
    this.effects.push(e);
    return e;
  }

  removeEffect(e) {
    this.scene.remove(e.mesh);
    this.effects = this.effects.filter((x) => x !== e);
  }

  // A glowing cone in front of the boss that fills up until the hit lands (turn: PI for behind it).
  telegraphCone(radius, halfAngle, seconds, turn = 0) {
    const boss = this.dummies[0];
    const g = new THREE.Group();
    const base = sectorMesh(radius, halfAngle, 0xff4a00, 0.12);
    const fill = sectorMesh(radius, halfAngle, 0xff5a10, 0.35);
    const edge = sectorMesh(radius, halfAngle, 0xffb040, 0.8, radius - 0.25);
    g.add(base, fill, edge);
    g.position.set(boss.position.x, this.groundY(boss.position.x, boss.position.z), boss.position.z);
    g.rotation.y = boss.rotation.y + turn; // the cone is the boss's front, wherever it faces
    return this.addEffect(g, seconds, (e) => {
      const k = Math.min(1, (this.time - e.start) / seconds);
      fill.scale.setScalar(Math.max(0.01, k));
      edge.material.opacity = 0.5 + Math.sin(this.time * 18) * 0.3;
    });
  }

  // A circle on the ground: a warning (fills up) or a burning patch (flickers, embers and smoke).
  groundCircle(x, z, radius, seconds, kind) {
    const fire = kind === 'fire';
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 48),
      new THREE.MeshBasicMaterial({ color: fire ? 0xff3b10 : 0xffa020, transparent: true, opacity: fire ? 0.5 : 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    disc.rotation.x = -Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.RingGeometry(radius - 0.18, radius, 48),
      new THREE.MeshBasicMaterial({ color: fire ? 0xffc040 : 0xffd080, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    rim.rotation.x = -Math.PI / 2;
    g.add(disc, rim);
    g.position.set(x, this.groundY(x, z) + 0.06, z);
    if (fire) {
      const light = new THREE.PointLight(0xff6020, 5, radius * 3, 2);
      light.position.y = 0.8;
      g.add(light);
    }
    return this.addEffect(g, seconds, (e) => {
      if (fire) {
        disc.material.opacity = 0.42 + Math.sin(this.time * 12) * 0.08 + Math.sin(this.time * 31) * 0.04;
        g.children[2].intensity = 4 + Math.sin(this.time * 14) * 1.2;
      } else {
        disc.scale.setScalar(0.25 + 0.75 * Math.min(1, (this.time - e.start) / seconds));
        rim.material.opacity = 0.5 + Math.sin(this.time * 16) * 0.3;
      }
    }, fire ? { x, z, r: radius } : null);
  }

  // A band on the ground from (x, z) along angle (radians from +Z), length by width, that fills up while the boss
  // takes its breath (Deep Breath).
  telegraphBand(x, z, angle, length, width, seconds) {
    const g = new THREE.Group();
    const mk = (color, opacity) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.position.z = length / 2;
      return m;
    };
    const base = mk(0xff4a00, 0.1);
    const fill = mk(0xff6a10, 0.3);
    g.add(base, fill);
    g.position.set(x, this.groundY(x, z) + 0.4, z);
    g.rotation.y = angle;
    return this.addEffect(g, seconds, (e) => {
      const k = Math.min(1, (this.time - e.start) / seconds);
      fill.scale.set(1, Math.max(0.01, k), 1);
      fill.position.z = (length * Math.max(0.01, k)) / 2;
      base.material.opacity = 0.08 + Math.sin(this.time * 10) * 0.04;
    });
  }

  // Fire along a line for `seconds` (a dragon's breath): flames from (x0, z0) to (x1, z1), `width` yards wide.
  flameLine(x0, z0, x1, z1, seconds, width = 4) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(2, Math.round(len / 4));
    const light = new THREE.PointLight(0xff6020, 30, len, 1.5);
    light.position.set((x0 + x1) / 2, this.groundY((x0 + x1) / 2, (z0 + z1) / 2) + 3, (z0 + z1) / 2);
    const holder = new THREE.Group();
    holder.add(light);
    this.shake(0.35);
    return this.addEffect(holder, seconds, (e) => {
      light.intensity = 30 * (1 - (this.time - e.start) / seconds);
      for (let k = 0; k <= steps; k++) {
        const s = k / steps;
        this.fx.fire(x0 + (x1 - x0) * s, z0 + (z1 - z0) * s, width / 2, 1 / 60);
      }
    });
  }

  // A fireball from `from` (a Vector3) to (x, z) over `travel` seconds; onHit when it lands, with a burst of fire.
  fireball(from, x, z, travel, onHit) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7a20).multiplyScalar(2.6) }));
    const light = new THREE.PointLight(0xff6a20, 12, 10, 1.6);
    ball.add(light);
    const to = new THREE.Vector3(x, this.groundY(x, z) + 1, z);
    ball.position.copy(from);
    let done = false;
    return this.addEffect(ball, travel + 0.05, (e) => {
      const k = Math.min(1, (this.time - e.start) / travel);
      ball.position.lerpVectors(from, to, k);
      this.fx.fire(ball.position.x, ball.position.z, 0.4, 1 / 60);
      if (k >= 1 && !done) {
        done = true;
        this.fx.ring(x, z, 0.5, 4, 0xff6a20, 0.5);
        this.shake(0.2);
        if (onHit) onHit();
      }
    });
  }

  // A lava crack glowing hotter until it erupts (points: [[x, z], ...]); then fire along it for a moment.
  crackEruption(points, seconds, onErupt) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6a10, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let k = 1; k < points.length; k++) {
      const [ax, az] = points[k - 1];
      const [bx, bz] = points[k];
      const len = Math.hypot(bx - ax, bz - az);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, len + 1), mat);
      m.rotation.x = -Math.PI / 2;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      m.position.set(mx, this.groundY(mx, mz) + 0.12, mz);
      m.rotation.z = -Math.atan2(bx - ax, bz - az);
      g.add(m);
    }
    let done = false;
    return this.addEffect(g, seconds + 1.2, (e) => {
      const k = (this.time - e.start) / seconds;
      if (k < 1) { mat.opacity = 0.15 + k * 0.45 + Math.sin(this.time * 20) * 0.05 * k; return; }
      if (!done) { done = true; if (onErupt) onErupt(); this.shake(0.25); }
      mat.opacity = Math.max(0, 0.6 * (1 - (k - 1) * seconds / 1.2));
      for (const [px, pz] of points) this.fx.fire(px, pz, 1.4, 1 / 30);
    });
  }

  // An expanding ring from the boss (War Stomp, Fire Nova).
  ring(radius, seconds, color) {
    const boss = this.dummies[0];
    this.fx.ring(boss.position.x, boss.position.z, 1, radius, color, seconds);
  }

  // Throws the player away from the boss.
  knockback(distance) {
    const boss = this.dummies[0];
    const dir = new THREE.Vector3().subVectors(this.player.position, boss.position).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    this.knock = { dir: dir.normalize(), left: distance };
    this.vy = 6;
    this.charging = null;
  }

  bossSwing(big = false) {
    const boss = this.dummies[0];
    if (!boss || !boss.userData.anim) return;
    boss.userData.anim.mh = 1;
    if (big) boss.userData.anim.oh = 1;
  }

  // The ground's height at (x, z): the lair's slopes, or the flat arena.
  groundY(x, z) { return this.env && this.env.layout ? this.env.layout.heightAt(x, z) : 0; }
  // Stands the targets and the tank on the ground (a flying one: hover yards up).
  groundDummies() {
    for (const d of [...this.dummies, ...(this.tank ? [this.tank] : [])]) d.position.y = this.groundY(d.position.x, d.position.z) + (d.userData.hover || 0);
  }
  // Feared for `seconds`: you run about out of your control.
  fear(seconds) { this.fearUntil = this.time + seconds; this.fearDir = null; this.keys.clear(); }

  // Shakes the camera; amount is in yards.
  shake(amount) { this.shakeAmt = Math.max(this.shakeAmt, amount); }

  playerPos() { return this.player.position; }

  // ---- combat effects ---------------------------------------------------------------------------

  // Sparks where an attack lands on target i, and the dummy wobbles away from you.
  hitFx(i, { crit = false, yellow = false, miss = false } = {}) {
    const d = this.dummies[i];
    if (!d) return;
    const toPlayer = new THREE.Vector3().subVectors(this.player.position, d.position).setY(0);
    if (toPlayer.lengthSq() < 0.01) toPlayer.set(0, 0, 1);
    toPlayer.normalize();
    const at = d.position.clone().addScaledVector(toPlayer, d.userData.radius * 0.9);
    at.y = d.position.y + d.userData.height * 0.55;
    this.fx.hit(at, { crit, yellow, miss });
    const w = d.userData.wobble;
    if (w && !miss) {
      const k = crit ? 2.2 : 1;
      w.vx -= toPlayer.z * k;
      w.vz += toPlayer.x * k;
    }
  }

  shoutFx() { this.fx.shout(this.player.position); }

  // ---- input ------------------------------------------------------------------------------------

  bindInput() {
    const typing = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && e.target.type !== 'checkbox';
    const moveKey = (e) => ({ KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd' }[e.code]);
    window.addEventListener('keydown', (e) => {
      if (typing(e) || e.ctrlKey || e.altKey) return;
      const k = moveKey(e);
      if (k) { this.keys.add(k); e.preventDefault(); }
      if (e.code === 'Space') { e.preventDefault(); this.jump(); }
    });
    window.addEventListener('keyup', (e) => { const k = moveKey(e); if (k) this.keys.delete(k); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.left = false; this.mouse.right = false; });

    // The mouse as in WoW: left-drag looks around without turning you; right-drag turns you with the camera (and
    // A/D strafe while it is held); both buttons held run forward; a left click without a drag selects a target.
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.left = true;
      else if (e.button === 2) { this.mouse.right = true; this.yaw = this.camYaw; }
      else return;
      if (!drag) drag = { x: e.clientX, y: e.clientY, moved: 0 };
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      this.camYaw -= dx * 0.008;
      this.camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, this.camPitch + dy * 0.006));
      if (this.mouse.right) this.yaw = this.camYaw;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        if (this.mouse.left && drag && drag.moved < 4 && !this.mouse.right) this.pick(e);
        this.mouse.left = false;
      } else if (e.button === 2) this.mouse.right = false;
      if (!this.mouse.left && !this.mouse.right) drag = null;
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, this.camDist + Math.sign(e.deltaY) * (this.camDist > 10 ? 1.5 : 1)));
    }, { passive: false });
  }

  // Left click on a dummy selects it.
  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.dummies, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o.parent && !this.dummies.includes(o)) o = o.parent;
    const i = this.dummies.indexOf(o);
    if (i >= 0 && this.onSelect) this.onSelect(i);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  charge(targetIndex) { this.charging = { target: targetIndex }; }

  // Feral Charge (Cat): a leap that lands you behind the target, facing it.
  leapBehind(targetIndex) {
    const d = this.dummies[targetIndex];
    if (!d) return;
    const p = this.player.position;
    const from = p.clone();
    const dir = new THREE.Vector3().subVectors(d.position, p).setY(0);
    if (dir.lengthSq() < 0.01) return;
    dir.normalize();
    this.charging = null;
    this.knock = null;
    p.copy(d.position).addScaledVector(dir, d.userData.radius + 1.2);
    p.y = from.y;
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.fx.dust(from, dir);
    this.fx.dust(p, dir);
  }

  // Blink: at once, that many yards the way you face; the arena's wall and the targets stop you as for any move (update).
  blink(yards) {
    const p = this.player.position;
    const from = p.clone();
    this.charging = null;
    this.knock = null;
    p.addScaledVector(forwardOf(this.yaw), yards);
    this.fx.blink(from, p);
  }

  jump() {
    if (this.speedMult === 0) return; // held (Ice Block)
    if ((this.jumpY || 0) <= 0.001 && !this.charging && !this.fearUntil) this.vy = JUMP_SPEED;
  }

  // Swing / spin animations triggered by the fight.
  castSpell(options) { startSpell(this.player,options); }
  stopCasting() { stopSpell(this.player); }
  animate(kind) {
    const a = this.player.userData.anim;
    if (this.formModel && kind !== 'ranged') this.formModel.userData.anim.attack = 1;
    if (kind === 'mh') a.mh = 1;
    else if (kind === 'oh') a.oh = 1;
    else if (kind === 'ranged') a.ranged = 1;
    else if (kind === 'spin') { this.anim.spin = 1; a.spin = 1; this.fx.whirl(this.player.position); }
  }

  // ---- per frame --------------------------------------------------------------------------------

  // Moves the player, runs the effects, renders, and returns where the player stands relative to each target.
  update(dt, primary) {
    this.time += dt;
    const p = this.player.position;
    const target = this.dummies[primary] ? this.dummies[primary].position : new THREE.Vector3();
    let moving = false;
    this.moveRel = { fwd: 0, side: 0 }; // movement relative to the facing (+fwd forward, +side right)

    if (this.fearUntil && this.time >= this.fearUntil) this.fearUntil = 0;
    if (this.fearUntil) {
      // Feared: you run where the fear takes you, turning off the walls.
      if (this.fearDir == null || Math.random() < dt * 0.8) this.fearDir = Math.random() * Math.PI * 2;
      const dir = forwardOf(this.fearDir);
      this.yaw = this.fearDir;
      p.addScaledVector(dir, RUN_SPEED * 0.9 * dt);
      if (this.env.layout && !this.env.layout.inside(p.x, p.z, 2)) this.fearDir += Math.PI * (0.6 + Math.random() * 0.8);
      this.moveRel = { fwd: 1, side: 0 };
      moving = true;
    } else if (this.knock) {
      const step = Math.min(this.knock.left, 20 * dt);
      p.addScaledVector(this.knock.dir, step);
      this.knock.left -= step;
      if (this.knock.left <= 0.01) this.knock = null;
      moving = true;
    } else if (this.charging) {
      const d = this.dummies[this.charging.target];
      const dir = new THREE.Vector3().subVectors(d.position, p).setY(0);
      const dist = dir.length();
      const stop = d.userData.radius + 1.2;
      if (dist <= stop + 0.05) this.charging = null;
      else {
        dir.normalize();
        p.addScaledVector(dir, Math.min(CHARGE_SPEED * dt, dist - stop));
        this.yaw = Math.atan2(dir.x, dir.z);
        this.fx.dust(p, dir);
        moving = true;
      }
    } else {
      // Free movement as in WoW: W/S along your facing (both mouse buttons held run forward too); A/D turn you and
      // the camera, or strafe while the right button is held.
      const fwd = forwardOf(this.yaw);
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const move = new THREE.Vector3();
      if (this.keys.has('w') || (this.mouse.left && this.mouse.right)) move.add(fwd);
      if (this.keys.has('s')) move.sub(fwd);
      if (this.mouse.right) {
        if (this.keys.has('a')) move.sub(right);
        if (this.keys.has('d')) move.add(right);
      } else if (this.speedMult !== 0) {
        const turn = ((this.keys.has('a') ? 1 : 0) - (this.keys.has('d') ? 1 : 0)) * TURN_SPEED * dt;
        this.yaw += turn;
        this.camYaw += turn;
      }
      // The direction relative to the facing picks the animation (run, backpedal, strafe) and the speed. A speed of 0
      // (Ice Block) holds you where you are.
      if (move.lengthSq() > 0 && this.speedMult !== 0) {
        move.normalize();
        const face = forwardOf(this.yaw);
        this.moveRel = { fwd: move.dot(face), side: move.x * -face.z + move.z * face.x };
        p.addScaledVector(move, (this.moveRel.fwd < -0.5 ? BACK_SPEED : RUN_SPEED) * (this.speedMult ?? 1) * dt);
        moving = true;
      }
    }

    const bossMoving = this.moveBoss(dt);

    // Keep out of the dummies, the boss and the tank, and inside the arena wall.
    for (const d of [...this.dummies, ...(this.tank ? [this.tank] : [])]) {
      const away = new THREE.Vector3().subVectors(p, d.position).setY(0);
      const min = d.userData.radius + 0.5;
      if (away.length() < min) {
        const y = p.y;
        p.copy(d.position).addScaledVector(away.lengthSq() > 0 ? away.normalize() : new THREE.Vector3(0, 0, -1), min);
        p.y = y;
      }
    }
    if (this.env.layout) this.env.layout.clamp(p);
    else {
      const flat = Math.hypot(p.x, p.z);
      if (flat > ARENA_RADIUS) { p.x *= ARENA_RADIUS / flat; p.z *= ARENA_RADIUS / flat; }
    }

    // Jumping: you can attack in the air, it only moves you up.
    this.jumpY = this.jumpY || 0;
    if (this.vy !== 0 || this.jumpY > 0) {
      this.vy -= GRAVITY * dt;
      this.jumpY = Math.max(0, this.jumpY + this.vy * dt);
      if (this.jumpY === 0) this.vy = 0;
    }
    p.y = this.groundY(p.x, p.z) + this.jumpY;
    this.groundDummies();

    // Geometry for the fight: distance to each target's edge, whether you stand in front of it, and
    // whether you face your target (a 180 degree arc).
    const fwd = forwardOf(this.yaw);
    const flatPos = new THREE.Vector3(p.x, 0, p.z);
    // A flying target (hover yards above the ground) is that much further away.
    const dist = this.dummies.map((d) => Math.hypot(Math.max(0, Math.hypot(d.position.x - p.x, d.position.z - p.z) - d.userData.radius), d.userData.hover || 0));
    // Angle from each target's facing (its local +Z, turned by its rotation) to you: 0 is straight in front, PI
    // straight behind.
    const angle = this.dummies.map((d) => {
      const dx = p.x - d.position.x;
      const dz = p.z - d.position.z;
      const r = d.rotation.y;
      return Math.atan2(Math.abs(dx * Math.cos(r) - dz * Math.sin(r)), dx * Math.sin(r) + dz * Math.cos(r));
    });
    const inFront = angle.map((a) => a < Math.PI / 2);
    const toTarget = new THREE.Vector3().subVectors(target, p).setY(0);
    // Facing: the target within the 180 degree arc in front of you.
    const facing = toTarget.lengthSq() < 0.01 || fwd.dot(toTarget) > 0;

    this.dummies.forEach((d, i) => { d.userData.select.visible = i === primary; });
    this.updateEffects(dt);
    this.animateTotems(dt);
    this.posePet(dt, primary);
    this.poseHawks(dt, primary);
    this.poseBolts(dt);
    this.wobbleDummies(dt);
    this.animateNpcs(dt, bossMoving);
    this.pose(dt, moving);
    this.env.update(dt, this.camera.position, this.combat);
    this.render(dt);
    // Each trap's distance to each target's edge, for the fight to spring it.
    const trapDist = {};
    for (const [token, t] of Object.entries(this.traps || {})) {
      trapDist[token] = this.dummies.map((d) => Math.max(0, Math.hypot(d.position.x - t.mesh.position.x, d.position.z - t.mesh.position.z) - d.userData.radius));
    }
    return { dist, angle, inFront, facing, moving, trapDist };
  }

  // How fast the player runs (an aspect, a daze), from the fight.
  setSpeedMult(m) { this.speedMult = m; }

  updateEffects(dt) {
    for (const e of [...this.effects]) {
      if (this.time >= e.until) this.removeEffect(e);
      else {
        if (e.update) e.update(e);
        if (e.fire) this.fx.fire(e.fire.x, e.fire.z, e.fire.r, dt);
      }
    }
    // Fiery aura while Death Wish or Recklessness is up.
    const p = this.player.position;
    if (this.fiery) this.fx.aura(p, dt, this.fiery > 1);
    this.auraLight.position.set(p.x, p.y + 1.2, p.z);
    this.auraLight.intensity += ((this.fiery ? 2.5 + Math.sin(this.time * 13) * 0.6 : 0) - this.auraLight.intensity) * Math.min(1, dt * 8);
    // Swing trails follow the blades while they swing (none from a form's paws).
    const a = this.player.userData.anim;
    const blades = !this.formModel;
    this.fx.trailsUpdate(
      { R: blades ? bladePoints(this.player, 'R') : null, L: blades ? bladePoints(this.player, 'L') : null },
      { R: blades && (a.mh > 0.05 && a.mh < 0.75 || a.spin > 0), L: blades && (a.oh > 0.05 && a.oh < 0.75 || a.spin > 0) },
    );
    this.spellFx.update(dt);
    this.fx.update(dt);
  }

  // A damped spring tips the dummies after hits.
  wobbleDummies(dt) {
    for (const d of this.dummies) {
      const w = d.userData.wobble;
      if (!w) continue;
      const k = 60;
      const c = 6;
      w.vx += (-k * w.x - c * w.vx) * dt;
      w.vz += (-k * w.z - c * w.vz) * dt;
      w.x += w.vx * dt;
      w.z += w.vz * dt;
      d.userData.wob.rotation.set(w.x * 0.1, 0, w.z * 0.1);
    }
  }

  // A melee boss turns to and walks after whoever has aggro (this.bossFocus: a position, or null to stay), stopping
  // at melee reach. Its ground marks go with it. Returns whether it walked this frame.
  moveBoss(dt) {
    const b = this.boss && this.dummies[0];
    const at = this.bossFocus;
    if (!b || !at || this.bossScripted) return false;
    const to = new THREE.Vector3(at.x - b.position.x, 0, at.z - b.position.z);
    const dist = to.length();
    let walked = false;
    if (dist > 0.05) {
      let diff = Math.atan2(to.x, to.z) - b.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      b.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), BOSS_TURN * dt);
      const reach = b.userData.radius + 1.5;
      if (dist > reach) {
        b.position.addScaledVector(to.normalize(), Math.min(BOSS_SPEED * dt, dist - reach));
        walked = true;
      }
    }
    this.followMarks(b);
    return walked;
  }

  followMarks(d) {
    const m = d.userData.marks;
    if (!m) return;
    m.position.set(d.position.x, this.groundY(d.position.x, d.position.z), d.position.z);
    m.rotation.y = d.rotation.y;
    m.visible = d.visible !== false && !d.userData.hover;
  }

  // The boss swings at whoever it attacks; the NPC tank swings back.
  animateNpcs(dt, bossMoving = false) {
    const boss = this.boss && this.dummies[0];
    if (!boss) return;
    for (const d of this.dummies) if (d.userData.dragon && d.visible !== false) animateDragon(d, { dt });
    if (!boss.userData.dragon) animateCharacter(boss, { dt, speed: bossMoving ? 1 : 0, air: false, combat: true });
    if (this.tank) {
      this.tankSwing = (this.tankSwing || 0) - dt;
      if (this.tankSwing <= 0) { this.tank.userData.anim.mh = 1; this.tankSwing = 1.8; }
      animateCharacter(this.tank, { dt, speed: 0, air: false, combat: true });
    }
  }

  pose(dt, moving) {
    this.player.rotation.y = this.yaw;
    // Backpedal when moving mostly away from the facing, strafe when moving mostly sideways.
    const rel = this.moveRel || { fwd: 0, side: 0 };
    const back = rel.fwd < -0.5;
    const strafe = Math.abs(rel.side) > Math.abs(rel.fwd) ? Math.sign(rel.side) : 0;
    animateCharacter(this.player, {
      dt, speed: moving ? (back ? -0.65 : 1) : 0, strafe, air: (this.jumpY || 0) > 0.05, combat: this.combat,
    });
    this.poseForm(dt, moving ? (back ? -0.65 : 1) : 0);
    // Turn the character through Whirlwind while the rig holds the weapons out.
    if (this.anim.spin > 0) {
      this.player.rotation.y = this.yaw + (1 - this.anim.spin) * Math.PI * 2;
      this.anim.spin = Math.max(0, this.anim.spin - dt * 2.2);
    }
  }

  // Third-person camera on a sphere around the player (free direction, tilt and zoom) that eases after
  // them, with a little shake on big hits.
  render(dt = 0) {
    const p = this.player.position;
    let flat = Math.cos(this.camPitch) * this.camDist;
    // In a lair the camera stays inside the cave wall: it comes in closer instead.
    const lay = this.env.layout;
    if (lay) {
      const dir = forwardOf(this.camYaw).multiplyScalar(-1);
      while (flat > 1 && !lay.inside(p.x + dir.x * flat, p.z + dir.z * flat, 1.5)) flat *= 0.85;
    }
    const back = forwardOf(this.camYaw).multiplyScalar(-flat);
    const gy = this.groundY(p.x, p.z);
    const camGround = this.groundY(p.x + back.x, p.z + back.z);
    const want = new THREE.Vector3(p.x + back.x, Math.max(camGround + 0.4, gy + CAM_LOOK_Y + Math.sin(this.camPitch) * this.camDist), p.z + back.z);
    const look = new THREE.Vector3(p.x, gy + CAM_LOOK_Y, p.z);
    if (this.camSnap || dt <= 0) {
      this.camPos.copy(want);
      this.camLook.copy(look);
      this.camSnap = false;
    } else {
      const k = 1 - Math.exp(-dt * 9);
      this.camPos.lerp(want, k);
      this.camLook.lerp(look, 1 - Math.exp(-dt * 14));
    }
    this.camera.position.copy(this.camPos);
    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.camera.position.z += (Math.random() - 0.5) * s;
      this.shakeAmt *= Math.exp(-dt * 7);
    }
    this.camera.lookAt(this.camLook);
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  // Screen position above the player, for damage taken.
  projectPlayer() {
    const p = this.player.position;
    return this.toScreen(new THREE.Vector3(p.x, p.y + (this.player.userData.height || 2) + 0.8, p.z));
  }

  // Screen position (px, relative to the container) above target i, for nameplates and combat text.
  project(i) {
    const d = this.dummies[i];
    if (!d) return null;
    if (d.visible === false) return null;
    return this.toScreen(new THREE.Vector3(d.position.x, d.position.y + d.userData.height + 0.4, d.position.z));
  }

  toScreen(v) {
    v.project(this.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * this.container.clientWidth, y: ((1 - v.y) / 2) * this.container.clientHeight };
  }
}
