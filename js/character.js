// Turns a loadout (race, gear, consumables, buffs - the same shape as a wowsims export) into the
// character sheet the fight engine uses.
import { DB } from './data/db.js';
import { BASE, CRIT_PER_AGI, DEFAULT_GEAR, DEFAULT_TALENTS, RACES, RACIALS, RATING, STAT } from './data/warrior.js';
import { BUFF_GROUPS, EXPOSE_ARMOR, IMBUE_EXTRAS, armorDebuffOf, effectLevel } from './data/buffs.js';
import { DEFAULT_ZONE, NATURAL_FLASKS, ZONES } from './data/zones.js';

const itemsById = new Map(DB.items.map((i) => [i.id, i]));
const enchantsById = new Map(DB.enchants.map((e) => [e.id, e]));
const suffixesById = new Map(DB.suffixes.map((s) => [s.id, s]));
const consumablesById = new Map(DB.consumables.map((c) => [c.id, c]));

export const SLOT_NAMES = ['Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Wrist', 'Hands', 'Waist', 'Legs',
  'Feet', 'Finger 1', 'Finger 2', 'Trinket 1', 'Trinket 2', 'Main Hand', 'Off Hand', 'Ranged'];
export const MH_SLOT = 14;
export const OH_SLOT = 15;
const TRINKET_SLOTS = { 12: 'trinket1', 13: 'trinket2' };

// The wowsims Fury defaults (ui/specs/warrior/dps/presets.ts and shared/presets.ts).
export const DEFAULT_LOADOUT = {
  race: 'RaceOrc',
  items: DEFAULT_GEAR,
  talentsString: DEFAULT_TALENTS,
  consumables: {
    foodId: 20452, elixirIds: [250350, 13452, 12820], mhImbueId: 12643, ohImbueId: 12404, resourcePotId: 13442,
  },
  buffs: { greaterBlessingOfKings: true, greaterBlessingOfMight: true },
  raidBuffs: { prayerOfFortitude: true, giftOfTheWild: true, strengthOfEarthTotem: true, windfuryTotem: true, leaderOfThePack: true },
  partyBuffs: {},
  debuffs: { giftOfArthas: true, faerieFire: true, sunderArmor: true, curseOfRecklessness: true },
  trainer: { sunderHelp: true, warriors: 2 },
  adjust: {},
};

const FALLBACK_WEAPON = { name: 'Fallback 1H sword', min: 89, max: 165, speed: 2.6, norm: 2.4, flat: 0, skill: 0, twoHand: false };

const DAGGER = 2;
const normalizedSpeed = (item) => (item.ht === 4 ? 3.3 : item.wt === DAGGER ? 1.7 : 2.4);

export const lookupItem = (id) => itemsById.get(id);
export const lookupConsumable = (id) => consumablesById.get(id);
export const spell = (id) => DB.spells[id];

function addStats(acc, sparse, scale = 1) {
  if (!sparse) return;
  for (const [k, v] of Object.entries(sparse)) acc[k] = (acc[k] || 0) + v * scale;
}

// Percentage effects a consumable's spell grants that the wowsims stats list does not carry.
function spellPercentExtras(spellId, out) {
  const sp = DB.spells[spellId];
  if (!sp) return;
  for (const e of sp.fx) {
    if (e.t !== 'E_APPLY_AURA') continue;
    if (e.a === 'A_MOD_CRIT_PCT') out.critPct += e.bp || 0;
    if (e.a === 'A_MOD_HIT_CHANCE') out.hitPct += e.bp || 0;
    if (e.a && e.a.startsWith('A_MOD_MELEE_HASTE')) out.hastePct += e.bp || 0;
  }
}

// A Natural flask's zone bonus (wowsims sim/common/forever/consumables_natural_flasks.go): the spell's A_DUMMY
// states a percent, and the auras after it say what it is (hit, crit, expertise or attack speed). The game
// files give those auras no amount, so only this reading counts them. Only in the zones that grant it.
function naturalFlaskBonus(c, pct, inZone) {
  const sp = (c.fx || [])[0] && DB.spells[c.fx[0].b];
  if (!sp || !inZone) return;
  const at = sp.fx.findIndex((e) => e.a === 'A_DUMMY');
  if (at < 0) return;
  const value = sp.fx[at].bp || 0;
  for (const e of sp.fx.slice(at + 1)) {
    if (e.a === 'A_MOD_HIT_CHANCE') pct.hitPct += value;
    else if (e.a === 'A_MOD_CRIT_PCT') pct.critPct += value;
    else if (e.a === 'A_MOD_EXPERTISE') pct.expertisePct += value;
    else if (e.a === 'A_MOD_MELEE_RANGED_HASTE_2') pct.hastePct += value;
  }
}

// A proc from an item or enchant, or null if the trigger rate cannot be worked out.
function makeProc(fx, name, icon, hand) {
  const sp = DB.spells[fx.b];
  let ppm = fx.proc.ppm || 0;
  let chance = fx.proc.pc || 0;
  let icd = (fx.proc.icd || 0) / 1000;
  let buff = fx.b;
  // A buff that is itself a proc aura (Hand of Justice style): its trigger is what happens.
  if (sp && !ppm && !chance) {
    const trigger = sp.fx.find((e) => e.a === 'A_PROC_TRIGGER_SPELL' && e.tr);
    if (sp.ppm) ppm = sp.ppm;
    else if (sp.pc && sp.pc < 100) chance = sp.pc / 100;
    if (trigger) buff = trigger.tr;
    if (sp.icd) icd = sp.icd / 1000;
  }
  if (!ppm && !chance) return null;
  return { name: (DB.spells[buff] && DB.spells[buff].n) || name, source: name, icon, hand, ppm, chance, icd, fx: { ...fx, b: buff } };
}

// Builds the sheet from a wowsims-shaped loadout. Returns { sheet, notes, gear }.
// opts.zone: a ZONES key; it decides whether the Natural flasks give their zone bonus.
export function computeSheet(loadout, opts = {}) {
  const notes = [];
  const race = RACES[loadout.race] || RACES.RaceOrc;
  if (!RACES[loadout.race]) notes.push(`Unknown race "${loadout.race}", using Orc.`);
  const zone = ZONES[opts.zone] || ZONES[DEFAULT_ZONE];

  const s = {}; // sparse stat totals from gear, enchants and consumables
  const pct = { critPct: 0, hitPct: 0, hastePct: 0, expertisePct: 0 };
  const gear = [];
  const procs = [];
  const uses = {};
  let mh = null;
  let oh = null;
  let bsT2Pieces = 0;

  (loadout.items || []).forEach((spec, slot) => {
    if (!spec || !spec.id) return;
    const item = itemsById.get(spec.id);
    if (!item) {
      // wowsims moved its database to the official Forever game data on 28 Oct 2026, dropping beta-only items.
      notes.push(`${SLOT_NAMES[slot] || 'Slot ' + slot}: item ${spec.id} is not in the item database (wowsims dropped beta-only items on 28 Oct 2026); the slot is left empty, so pick a replacement or re-import from wowsims.`);
      return;
    }
    addStats(s, item.s);
    let suffixName = '';
    if (spec.randomSuffix) {
      const suf = suffixesById.get(spec.randomSuffix);
      if (suf && item.rp) {
        for (const [k, v] of Object.entries(suf.s)) s[k] = (s[k] || 0) + Math.round((item.rp * v) / 10000);
        suffixName = ' ' + suf.n;
      }
    }
    const hand = slot === MH_SLOT ? 'mh' : slot === OH_SLOT ? 'oh' : 'any';
    let enchantName = '';
    let flat = 0;
    if (spec.enchant) {
      const ench = enchantsById.get(spec.enchant);
      if (ench) {
        addStats(s, ench.s);
        flat += ench.wd || 0;
        enchantName = ench.n;
        for (const fx of ench.fx || []) {
          if (!fx.proc) continue;
          const p = makeProc(fx, ench.n.replace(/^Enchant (Weapon|2H Weapon) - /, ''), 'spell_holy_blessingofstrength', hand);
          if (p) procs.push(p);
        }
      } else {
        notes.push(`${SLOT_NAMES[slot]}: enchant ${spec.enchant} is not in the database.`);
      }
    }
    for (const fx of item.fx || []) {
      if (fx.proc) {
        const p = makeProc(fx, item.n, item.ic, hand);
        if (p) procs.push(p); else notes.push(`${item.n}: its proc is not modelled.`);
      } else if (fx.use && TRINKET_SLOTS[slot]) {
        uses[TRINKET_SLOTS[slot]] = { id: item.id, name: item.n, icon: item.ic, fx, cd: (fx.use.cd || 0) / 1000, cat: fx.use.cat, ccd: (fx.use.ccd || 0) / 1000 };
      }
    }
    if (item.set === 'Battlegear of Wrath') bsT2Pieces++;
    gear.push({ slot, id: item.id, name: item.n + suffixName, icon: item.ic, quality: item.q, enchant: enchantName, wt: item.wt, ht: item.ht, set: item.set });

    if (item.sp && (slot === MH_SLOT || slot === OH_SLOT)) {
      const w = {
        name: item.n, min: item.mn, max: item.mx, speed: item.sp, norm: normalizedSpeed(item), flat,
        skill: race.skill[item.wt] || 0, twoHand: item.ht === 4, icon: item.ic,
        type: item.wt, // wowsims WeaponType: 1 axe, 2 dagger, 3 fist, 4 mace, 6 polearm, 8 staff, 9 sword (Weaponmaster)
      };
      if (slot === MH_SLOT) mh = w; else oh = w;
    }
  });

  // Consumables (wowsims ConsumesSpec).
  const cons = loadout.consumables || {};
  const consIds = [cons.flaskId, cons.foodId, cons.conjuredId, ...(cons.elixirIds || [])].filter(Boolean);
  for (const id of consIds) {
    const c = consumablesById.get(id);
    if (!c) { notes.push(`Consumable ${id} is not in the database.`); continue; }
    addStats(s, c.s);
    if (NATURAL_FLASKS.has(id)) {
      naturalFlaskBonus(c, pct, zone.flaskBonus);
      if (!zone.flaskBonus) notes.push(`${c.n} gives its bonus only in Mount Hyjal, Hyjal Summit and the Barrow Deeps; in ${zone.name} it gives Stamina only.`);
      continue;
    }
    for (const fx of c.fx || []) spellPercentExtras(fx.b, pct);
  }
  for (const [key, weapon] of [['mhImbueId', mh], ['ohImbueId', oh]]) {
    const c = cons[key] && consumablesById.get(cons[key]);
    if (c && weapon) {
      weapon.flat += c.wd || 0;
      addStats(s, c.s);
      const extra = IMBUE_EXTRAS[c.id];
      if (extra) pct.critPct += extra.critPct || 0;
    }
  }
  for (const [action, field, icon] of [['potion', 'resourcePotId', 'inv_potion_41'], ['explosive', 'explosiveId', 'spell_fire_selfdestruct']]) {
    const c = cons[field] && consumablesById.get(cons[field]);
    const fx = c && (c.fx || []).find((f) => f.use);
    if (fx) uses[action] = { id: c.id, name: c.n, icon, fx, cd: (fx.use.cd || 0) / 1000, cat: fx.use.cat, ccd: (fx.use.ccd || 0) / 1000, oncePerFight: action === 'potion' };
  }

  // Raid buffs, blessings and boss debuffs.
  const b = { str: 0, agi: 0, sta: 0, ap: 0, critPct: 0, statMult: 0, windfuryAp: 0, externalShout: 0, armor: 0, minorArmor: 0, raidShatter: 0, physDmgTaken: 0 };
  // Values that do not stack (a wowsims category, or one of a kind): the strongest counts.
  const strongest = new Set(['windfuryAp', 'externalShout', 'minorArmor']);
  const raidDebuffs = [];
  for (const group of BUFF_GROUPS) {
    const settings = loadout[group.source] || {};
    for (const [key, def] of Object.entries(group.buffs)) {
      const lvl = Math.min(effectLevel(settings[key]), def.levels);
      if (!lvl) continue;
      if (group.source === 'debuffs') raidDebuffs.push({ name: def.name, icon: def.icon, key });
      for (const [k, v] of Object.entries(def.stats[lvl - 1])) {
        if (strongest.has(k)) b[k] = Math.max(b[k], v);
        else b[k] += v;
      }
    }
  }
  b.armor += b.minorArmor;

  // Sunder Armor / Expose Armor: one of them (they do not stack).
  const armorDebuff = armorDebuffOf(loadout);
  const exposeLevel = armorDebuff === 'expose' ? 1 : 0;
  const sunder = {
    mode: armorDebuff === 'sunder' ? 'full' : armorDebuff === 'sunderHelp' ? 'help' : 'off',
    warriors: (loadout.trainer && loadout.trainer.warriors) || 2,
  };
  if (exposeLevel) raidDebuffs.unshift({ name: 'Expose Armor', icon: 'ability_warrior_riposte', key: 'exposeArmor' });
  const debuffs = loadout.debuffs || {};
  if (debuffs.sunderArmor && effectLevel(debuffs.exposeArmor)) {
    notes.push('Sunder Armor and Expose Armor are both on in the export; they do not stack, so only the stronger one applies.');
  }

  const mult = 1 + b.statMult;
  const str = (BASE.str + race.str + (s[STAT.str] || 0) + b.str) * mult;
  const agi = (BASE.agi + race.agi + (s[STAT.agi] || 0) + b.agi) * mult;
  const sta = (BASE.sta + race.sta + (s[STAT.sta] || 0) + b.sta) * mult;
  const adj = loadout.adjust || {};
  const racial = RACIALS[loadout.race] || {};

  if (!mh) notes.push('No main-hand weapon found, using a fallback weapon.');

  const sheet = {
    race: RACES[loadout.race] ? loadout.race : 'RaceOrc',
    talents: loadout.talentsString ?? DEFAULT_TALENTS, // '' is a build with no talents (Reset in the Talents tab)
    str: Math.round(str),
    agi: Math.round(agi),
    statMult: mult,
    ap: Math.round(BASE.ap + str * 2 + (s[STAT.ap] || 0) + b.ap + (adj.ap || 0)),
    critPct: round2(agi * CRIT_PER_AGI + (s[STAT.crit] || 0) / RATING.crit + b.critPct + pct.critPct + (racial.critPct || 0) + (adj.critPct || 0)),
    hitPct: round2((s[STAT.hit] || 0) / RATING.hit + pct.hitPct + (racial.hitPct || 0) + (adj.hitPct || 0)),
    health: Math.round(BASE.health + sta * 10 + (s[STAT.health] || 0)),
    armor: Math.round((s[STAT.armor] || 0) + (s[STAT.bonusArmor] || 0) + agi * 2),
    attackSpeedMult: racial.attackSpeedMult || 1,
    hastePct: round2((s[STAT.haste] || 0) / RATING.haste + pct.hastePct + (adj.hastePct || 0)),
    expertisePct: round2((s[STAT.expertise] || 0) / RATING.expertise + pct.expertisePct + (adj.expertisePct || 0)),
    mh: mh || { ...FALLBACK_WEAPON },
    oh: mh && mh.twoHand ? null : oh,
    windfuryAp: b.windfuryAp,
    externalShout: b.externalShout,
    armorReduction: b.armor + (s[STAT.arpen] || 0),
    exposeArmor: EXPOSE_ARMOR[exposeLevel],
    sunder,
    raidDebuffs,
    raidShatter: b.raidShatter,
    physDmgTaken: b.physDmgTaken + (s[STAT.physDmg] || 0),
    bsT2: bsT2Pieces >= 3,
    procs,
    uses,
  };
  return { sheet, notes, gear };
}

// Consumables of a type that matter for a Fury warrior, for the raid setup pickers.
export function consumableOptions(type) {
  const relevant = (c) => {
    if (c.wd || IMBUE_EXTRAS[c.id]) return true;
    if (Object.keys(c.s || {}).some((k) => [STAT.str, STAT.agi, STAT.ap, STAT.hit, STAT.crit, STAT.haste].includes(Number(k)))) return true;
    return (c.fx || []).some((fx) => {
      const sp = DB.spells[fx.b];
      return sp && sp.fx.some((e) => (e.t === 'E_ENERGIZE' && e.m === 1) || (type === 5 && e.t === 'E_SCHOOL_DAMAGE') ||
        ['A_MOD_CRIT_PCT', 'A_MOD_ATTACK_POWER', 'A_MOD_HIT_CHANCE', 'A_MOD_MELEE_HASTE_3', 'A_MOD_EXPERTISE', 'A_MOD_MELEE_RANGED_HASTE_2'].includes(e.a));
    });
  };
  return DB.consumables.filter((c) => c.ty === type && relevant(c)).sort((a, b) => a.n.localeCompare(b.n));
}

const round2 = (v) => Math.round(v * 100) / 100;
