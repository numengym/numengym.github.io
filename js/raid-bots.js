// NPC raiders: the raid filled out to its size (the ready room, the Group panel, Settings → Fight) with players of the
// trainer's own. The DPS are each a spec on its wowsims preset playing its APL on the boss (tank-bot.js TankBot, not
// tanking), in a mix like a real raid's; the healers (HealerBot below: healing has no wowsims sim or APL) cast their
// class's heals from js/data/healing.js on whoever needs them most, the tank first. main.js draws them, puts them on
// the raid frames, lets their damage come off a shared health pool and has them react to the boss's mechanics:
// mostly in time, now and then not (each one's skill roll).
import { computeSheet } from './character.js';
import { HEALS } from './data/healing.js';
import { SPECS } from './data/specs.js';

// The order the raid fills in: a melee and a caster in turn, every class before any comes twice.
export const NPC_RAIDER_SPECS = ['fury', 'fire', 'combat', 'shadow', 'retribution', 'elemental', 'feralCat', 'affliction', 'marksmanship',
  'balance', 'arms', 'arcane', 'enhancement', 'destruction', 'assassination', 'frost', 'survival', 'demonology', 'subtlety', 'beastMastery'];
const NAMES = ['Garosh', 'Elyndra', 'Torvald', 'Mirelle', 'Kazrak', 'Sylvaris', 'Brannoc', 'Ithriel', 'Volgar', 'Nessa', 'Dagrun', 'Liora',
  'Morvek', 'Aelith', 'Hrothgar', 'Selene', 'Zandor', 'Fenwyn', 'Ulgrim', 'Kaelis'];
const HEALER_SPECS = ['holyPriest', 'restoDruid', 'restoShaman', 'holyPaladin'];
const HEALER_NAMES = ['Seraphine', 'Thalorin', 'Mirabel', 'Oswin', 'Celestine', 'Bramwell'];

// The raiders for `count` free places, `healers` of them healers (first): [{ spec, name, healer }].
export function raiderRoster(count, healers = 0) {
  const n = Math.max(0, Math.min(count, NAMES.length));
  const h = Math.max(0, Math.min(healers, n, HEALER_NAMES.length));
  return [
    ...Array.from({ length: h }, (_, i) => ({ spec: HEALER_SPECS[i % HEALER_SPECS.length], name: HEALER_NAMES[i], healer: true })),
    ...Array.from({ length: n - h }, (_, i) => ({ spec: NPC_RAIDER_SPECS[i % NPC_RAIDER_SPECS.length], name: NAMES[i], healer: false })),
  ];
}

// How many healers a raid of this size brings: about one in four, as classic raids had them (5: 1, 10: 3, 20: 5).
export const healersFor = (size) => Math.round((size || 0) / 4);

// A healer's body: health the boss's mechanics take and heals give back, and mana for the raid frames (not spent).
class NpcBody {
  constructor(health) {
    Object.assign(this, { t: 0, health, maxHealth: health, dead: false, over: false, started: false, resourceName: 'Mana', power: 100, maxPower: 100 });
  }
  takeDamage(amount) {
    if (this.dead || !(amount > 0)) return 0;
    // A shield on it (a healer player's Power Word: Shield) takes the damage first.
    if (this.absorb > 0 && this.absorbEnd > this.t) {
      const soak = Math.min(this.absorb, amount);
      this.absorb -= soak;
      amount -= soak;
      if (amount <= 0) return 0;
    }
    const took = Math.min(this.health, amount);
    this.health -= took;
    if (this.health <= 0) { this.health = 0; this.dead = true; }
    return took;
  }
  heal(amount) { if (!this.dead) this.health = Math.min(this.maxHealth, this.health + amount); }
  addAbsorb(amount, duration) { this.absorb = amount; this.absorbEnd = this.t + duration; }
}

// Each class's big, efficient heal and its fast one.
const SPELLS = { priest: ['greaterHeal', 'flashHeal'], paladin: ['holyLight', 'flashOfLight'], shaman: ['healingWave', 'lesserHealingWave'], druid: ['healingTouch', 'regrowth'] };
const CAST_TALENTS = 0.85; // the healing talents' shorter casts (Divine Fury, Naturalist, Improved Healing Wave), about

export class HealerBot {
  constructor(spec, zone, { name }) {
    const def = SPECS[spec];
    this.spec = spec;
    this.healer = true;
    this.tank = false;
    this.melee = false;
    this.name = name;
    this.classId = def.classId;
    this.label = `${def.name} ${def.classId[0].toUpperCase()}${def.classId.slice(1)}`;
    this.skill = 0.6 + Math.random() * 0.35; // how quickly it reacts, and gets out of mechanics
    this.fearedUntil = 0;
    const { sheet, gear } = computeSheet({ ...def.loadout }, { zone, classId: this.classId });
    this.sheet = sheet;
    this.gear = gear;
    this.f = new NpcBody(sheet.health);
    this.dealt = [];
    this.swung = 0;
    this.casting = null; // { id, end, amount, crit, spell }
    this.readyAt = 0;
    [this.big, this.fast] = SPELLS[this.classId].map((k) => HEALS[k]);
  }

  get dead() { return this.f.dead; }
  threatOn() { return 0; }
  advanceTo(t) { this.f.t = t; }

  // A heal's size: the spell's base, rolled, plus its share of the healer's healing power; now and then a crit.
  roll(spell) {
    const base = (spell.base || (spell.hot ? spell.hot.tick * spell.hot.ticks : 0)) * (1 + (Math.random() - 0.5) * (spell.variance || 0));
    const coef = spell.coef || (spell.hot ? spell.hot.coef * spell.hot.ticks : 0);
    const crit = Math.random() < 0.12;
    return { amount: Math.round((base + coef * (this.sheet.healingPower || 0)) * (crit ? 1.5 : 1)), crit };
  }

  // One moment of healing at time t. targets: [{ id, hp, maxHp, dead, tank, heal(amount, crit, from) }]; incoming:
  // what the other healers' casts will give each (so two do not top off the same one). A cast lands when it ends:
  // returns { id, amount, crit, spell } then.
  act(t, targets, incoming = {}) {
    if (this.dead || this.fearedUntil > t) { this.casting = null; return null; }
    const c = this.casting;
    if (c) {
      if (t < c.end) return null;
      this.casting = null;
      this.readyAt = t + 0.15 + (1 - this.skill) * 0.9; // a moment to pick the next one
      const tgt = targets.find((x) => x.id === c.id);
      if (!tgt || tgt.dead) return null;
      tgt.heal(c.amount, c.crit, this.name);
      return c;
    }
    if (t < this.readyAt) return null;
    const pick = choose(targets, incoming);
    if (!pick) { this.readyAt = t + 0.4; return null; }
    const pct = (pick.hp + (incoming[pick.id] || 0)) / pick.maxHp;
    const missing = pick.maxHp - pick.hp - (incoming[pick.id] || 0);
    const spell = pct < 0.5 || missing < (this.big.base || 0) * 0.7 ? this.fast : this.big;
    const { amount, crit } = this.roll(spell);
    this.casting = { id: pick.id, end: t + (spell.castTime || 1.5) * CAST_TALENTS, amount, crit, spell: spell.name };
    return null;
  }
}

// Who to heal: the tank while it is below 90%, else whoever is lowest below 80%, else the tank if it is hurt at all.
function choose(targets, incoming) {
  const live = targets.filter((x) => !x.dead && x.maxHp > 0);
  const pct = (x) => (x.hp + (incoming[x.id] || 0)) / x.maxHp;
  const tank = live.filter((x) => x.tank).sort((a, b) => pct(a) - pct(b))[0];
  if (tank && pct(tank) < 0.9) return tank;
  const low = live.filter((x) => pct(x) < 0.8).sort((a, b) => pct(a) - pct(b))[0];
  if (low) return low;
  return tank && pct(tank) < 0.98 ? tank : null;
}
