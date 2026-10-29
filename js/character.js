// Turns a loadout (race, gear, consumables, buffs - the same shape as a wowsims export) into the
// character sheet the fight engine uses.
import { DB } from './data/db.js';
import { BLOCK_VALUE_PER_STR, DEFAULT_GEAR, DEFAULT_TALENTS, RACES, RACIALS, RATING, STAT } from './data/warrior.js';
import { CLASS_STATS, MANA } from './data/class-stats.js';
import { BUFF_GROUPS, EXPOSE_ARMOR, IMBUE_EXTRAS, WEAPON_IMBUE_EXTRAS, armorDebuffOf, effectLevel } from './data/buffs.js';
import { DEFAULT_ZONE, NATURAL_FLASKS, ZONES } from './data/zones.js';
import { CONSUMABLE_ICONS } from './data/consumable-icons.js';
import { POTION_ACTIONS, POTION_CLASSES } from './data/potion-classes.js';

const itemsById = new Map(DB.items.map((i) => [i.id, i]));
const enchantsById = new Map(DB.enchants.map((e) => [e.id, e]));
const suffixesById = new Map(DB.suffixes.map((s) => [s.id, s]));
const consumablesById = new Map(DB.consumables.map((c) => [c.id, c]));

export const SLOT_NAMES = ['Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Wrist', 'Hands', 'Waist', 'Legs',
  'Feet', 'Finger 1', 'Finger 2', 'Trinket 1', 'Trinket 2', 'Main Hand', 'Off Hand', 'Ranged'];
export const MH_SLOT = 14;
export const OH_SLOT = 15;
export const RANGED_SLOT = 16;
const RANGED_AP = 15; // the wowsims stat index of ranged attack power
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
const SHIELD = 7; // wowsims WeaponType
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
    // Consumables' crit bids in one wowsims category, for attacks and spells: the strongest counts (a Feral cat with
    // Elixir of Sages and Elixir of the Grizzly crits 2% more in wowsims, not 4%).
    if (e.a === 'A_MOD_CRIT_PCT') out.consumableCrit = Math.max(out.consumableCrit || 0, e.bp || 0);
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
    else if (e.a === 'A_MOD_CRIT_PCT') pct.critPct += value; // on top of the elixirs' (wowsims: 4 + 2 with Sages)
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
  const pct = { critPct: 0, hitPct: 0, hastePct: 0, expertisePct: 0, consumableCrit: 0, imbueCrit: 0, spellCrit: 0, castSpeed: 0 };
  const gear = [];
  const procs = [];
  const uses = {};
  let mh = null;
  let oh = null;
  let ranged = null;
  let shield = false;
  let bsT2Pieces = 0;
  const sets = {}; // set name -> pieces worn

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
      } else if (fx.use && (TRINKET_SLOTS[slot] || slot === MH_SLOT)) {
        // A trinket, or a weapon you can use (Manual Crowd Pummeler).
        uses[TRINKET_SLOTS[slot] || 'weapon'] = { id: item.id, name: item.n, icon: item.ic, fx, cd: (fx.use.cd || 0) / 1000, cat: fx.use.cat, ccd: (fx.use.ccd || 0) / 1000 };
      }
    }
    if (item.set === 'Battlegear of Wrath') bsT2Pieces++;
    if (item.set) sets[item.set] = (sets[item.set] || 0) + 1;
    if (slot === OH_SLOT && item.wt === SHIELD) shield = true;
    gear.push({ slot, id: item.id, name: item.n + suffixName, icon: item.ic, quality: item.q, enchant: enchantName, wt: item.wt, ht: item.ht, set: item.set });

    if (item.sp && (slot === MH_SLOT || slot === OH_SLOT)) {
      const w = {
        name: item.n, min: item.mn, max: item.mx, speed: item.sp, norm: normalizedSpeed(item), flat,
        skill: race.skill[item.wt] || 0, twoHand: item.ht === 4, icon: item.ic,
        type: item.wt, // wowsims WeaponType: 1 axe, 2 dagger, 3 fist, 4 mace, 6 polearm, 8 staff, 9 sword (Weaponmaster)
      };
      if (slot === MH_SLOT) mh = w; else oh = w;
    }
    // A bow, gun or crossbow (a hunter's Auto Shot): normalized at 2.8 as every ranged weapon.
    if (item.sp && slot === RANGED_SLOT && item.t === 14) {
      ranged = { name: item.n, min: item.mn, max: item.mx, speed: item.sp, norm: 2.8, flat: 0, icon: item.ic, scope: spec.enchant || 0 };
    }
  });

  // Consumables (wowsims ConsumesSpec). Weapon imbues that are not poisons give their stats (Scroll of Imbue Precision).
  for (const key of ['mhWeaponImbueId', 'ohWeaponImbueId']) {
    const c = (loadout.consumables || {})[key] && consumablesById.get(loadout.consumables[key]);
    if (!c) continue;
    const weapon = key === 'mhWeaponImbueId' ? mh : oh;
    if (!scrollFits(c, weapon)) { notes.push(`${c.n} cannot be applied to ${weapon ? weapon.name : 'no weapon'}.`); continue; }
    addStats(s, c.s);
    const extra = WEAPON_IMBUE_EXTRAS[c.id];
    if (extra) { pct.spellCrit += extra.spellCritPct || 0; pct.castSpeed += extra.castSpeedPct || 0; }
  }
  const cons = loadout.consumables || {};
  const consIds = [cons.flaskId, cons.foodId, cons.conjuredId, ...(cons.elixirIds || []), ...(cons.extraIds || [])].filter(Boolean);
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
    // Weightstones go on blunt weapons (maces, staves, fist weapons), sharpening stones on edged ones.
    if (c && weapon && !stoneFits(c, weapon)) { notes.push(`${c.n} cannot be applied to ${weapon.name}.`); continue; }
    if (c && weapon) {
      weapon.flat += c.wd || 0;
      addStats(s, c.s);
      const extra = IMBUE_EXTRAS[c.id];
      if (extra) { pct.critPct += extra.critPct || 0; pct.imbueCrit += extra.critPct || 0; pct.spellCrit += extra.spellCritPct || 0; }
    }
  }
  // wowsims' three potion picks (ConsumesSpec resource_pot_id, offensive_pot_id, defensive_pot_id), each its own
  // button, one timer between them (category 4) and one potion a fight; conjured: Thistle Tea, Demonic Rune, a mana
  // gem. Each shows the item's own icon.
  for (const [action, field] of [['potion', 'resourcePotId'], ['offensivePotion', 'offensivePotId'], ['defensivePotion', 'defensivePotId'],
    ['explosive', 'explosiveId'], ['conjured', 'conjuredId']]) {
    const c = cons[field] && consumablesById.get(cons[field]);
    const fx = c && (c.fx || []).find((f) => f.use);
    if (!fx) continue;
    uses[action] = { id: c.id, name: c.n, icon: consumableIcon(c), fx, cd: (fx.use.cd || 0) / 1000, cat: fx.use.cat, ccd: (fx.use.ccd || 0) / 1000,
      oncePerFight: POTION_ACTIONS.includes(action) };
  }

  // Raid buffs, blessings and boss debuffs.
  // armor / minorArmor: taken off the boss; playerArmor: yours (Gift of the Wild).
  const b = { str: 0, agi: 0, sta: 0, int: 0, spi: 0, spiMult: 0, spellPower: 0, spellCritPct: 0, mp5: 0, spellDmgTaken: 0, jow: 0, ap: 0, critPct: 0, weaponCritPct: 0, statMult: 0, windfuryAp: 0, externalShout: 0, armor: 0, minorArmor: 0, raidShatter: 0, physDmgTaken: 0, playerArmor: 0 };
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

  // Set bonuses wowsims applies as stats (sim/common/forever/items_sets.go): Dungeon Set 1 (Magister's Regalia,
  // Dreadmist Raiment) 3 pieces +18 spell damage, 6 pieces 8 mana per 5 sec (Magister's 5-piece mana proc is the mage
  // fight's).
  for (const set of ["Magister's Regalia", 'Dreadmist Raiment']) {
    if ((sets[set] || 0) >= 3) b.spellPower += 18;
    if ((sets[set] || 0) >= 6) b.mp5 += 8;
  }
  // Beaststalker Armor: 3 pieces +30 attack power and ranged attack power, 6 pieces 8 mana per 5 sec (its 5-piece mana
  // proc is the hunter fight's).
  let setRap = 0;
  if ((sets['Beaststalker Armor'] || 0) >= 3) { b.ap += 30; setRap += 30; }
  if ((sets['Beaststalker Armor'] || 0) >= 6) b.mp5 += 8;
  const classId = opts.classId || loadout.classId || 'warrior';
  const cs = CLASS_STATS[classId] || CLASS_STATS.warrior;
  const base = cs.base;
  const mult = 1 + b.statMult;
  const str = (base.str + race.str + (s[STAT.str] || 0) + b.str) * mult;
  const agi = (base.agi + race.agi + (s[STAT.agi] || 0) + b.agi) * mult;
  const sta = (base.sta + race.sta + (s[STAT.sta] || 0) + b.sta) * mult;
  const int = (base.int + (race.int || 0) + (s[STAT.int] || 0) + b.int) * mult;
  const spi = (base.spi + (race.spi || 0) + (s[STAT.spi] || 0) + b.spi) * mult * (1 + b.spiMult) * (1 + ((RACIALS[loadout.race] || {}).spiMult || 0));
  const adj = loadout.adjust || {};
  const racial = RACIALS[loadout.race] || {};

  if (!mh) notes.push('No main-hand weapon found, using a fallback weapon.');

  const sheet = {
    race: RACES[loadout.race] ? loadout.race : 'RaceOrc',
    classId, // which class module plays it (js/classes)
    variant: loadout.variant || null, // a class played another way (the Feral druid: classes/index.js)
    form: loadout.form || null, // the form a Feral druid fights in: cat or bear
    classOptions: loadout.classOptions || null, // a class's own settings wowsims has (the warlock's demon)
    talents: loadout.talentsString ?? DEFAULT_TALENTS, // '' is a build with no talents (Reset in the Talents tab)
    str: Math.round(str),
    agi: Math.round(agi),
    int: Math.round(int),
    spi: Math.round(spi),
    statMult: mult,
    ap: Math.round(base.ap + str * cs.apPerStr + agi * cs.apPerAgi + (s[STAT.ap] || 0) + b.ap + (adj.ap || 0)),
    // A hunter's ranged attack power: 2 per Agility, the ranged attack power on gear; and the bow, gun or crossbow.
    imbueCritPct: pct.imbueCrit, // a stone's crit, on the weapon it sharpens (not a hunter's shots)
    rap: Math.round((base.rap || 0) + agi * (cs.rangedApPerAgi || 0) + (s[RANGED_AP] || 0) + setRap),
    ranged,
    critPct: round2(cs.physCrit + agi * cs.critPerAgi + (s[STAT.crit] || 0) / RATING.crit + b.critPct + b.weaponCritPct + pct.critPct + pct.consumableCrit + (racial.critPct || 0) + (adj.critPct || 0)),
    hitPct: round2((s[STAT.hit] || 0) / RATING.hit + pct.hitPct + (racial.hitPct || 0) + (adj.hitPct || 0)),
    // Casters: spell power (all schools, and each school's own), spell crit from Intellect and crit rating, spell hit
    // from hit rating, mana (the first 20 Intellect give 1 each, the rest 15) and mana per 5 seconds.
    spellPower: Math.round((s[STAT.spellDmg] || 0) + b.spellPower + (adj.spellPower || 0)),
    schoolPower: { arcane: s[STAT.arcaneDmg] || 0, fire: s[STAT.fireDmg] || 0, frost: s[STAT.frostDmg] || 0, holy: s[STAT.holyDmg] || 0, nature: s[STAT.natureDmg] || 0, shadow: s[STAT.shadowDmg] || 0 },
    // Raid crit buffs (A_MOD_CRIT_PCT) reach spells too; Leader of the Pack (A_MOD_WEAPON_CRIT_PERCENT) does not. Brilliant
    // Wizard Oil's and a Firestone's spell crit come with the imbue.
    spellCritPct: round2(cs.spellCrit + int * cs.critPerInt + (s[STAT.crit] || 0) / RATING.crit + b.spellCritPct + b.critPct + pct.consumableCrit
      + pct.spellCrit + (racial.critPct || 0) + (adj.critPct || 0)),
    castSpeedPct: pct.castSpeed,
    spellHitPct: round2((s[STAT.hit] || 0) / RATING.hit + (racial.hitPct || 0) + (adj.hitPct || 0)),
    mana: base.mana ? Math.round(base.mana + 20 + Math.max(0, int - 20) * MANA.perInt + (s[STAT.mana] || 0)) : 0,
    mp5: (s[STAT.mp5] || 0) + b.mp5,
    raidSpellDmgTaken: b.spellDmgTaken, // Curse of the Elements
    jow: b.jow, // Judgement of Wisdom: mana from melee hits
    // Rogue poisons on the weapons (wowsims ConsumesSpec mh/ohWeaponImbueId).
    poisons: { mh: cons.mhWeaponImbueId || 0, oh: cons.ohWeaponImbueId || 0 },
    sets,
    itemIds: gear.map((g) => g.id), // for items whose effect a class module models (a libram)
    // The first 20 Stamina give 1 health each, the rest 10 (sim/core/character.go).
    health: Math.round(base.health + 20 + Math.max(0, sta - 20) * 10 + (s[STAT.health] || 0)),
    sta: Math.round(sta), // for talents that raise Stamina (Sacred Duty)
    // Armor from gear, Agility, elixirs ("armor no mods") and Gift of the Wild. APPROX: the wowsims boss's hits on the
    // Protection preset imply about 20% more than this sum.
    armor: Math.round((s[STAT.armor] || 0) + (s[STAT.bonusArmor] || 0) + (s[STAT.armorNoMods] || 0) + b.playerArmor + agi * 2),
    itemArmor: (s[STAT.armor] || 0) + (s[STAT.bonusArmor] || 0), // the items' armor, which Dire Bear Form scales
    attackSpeedMult: racial.attackSpeedMult || 1,
    hastePct: round2((s[STAT.haste] || 0) / RATING.haste + pct.hastePct + (adj.hastePct || 0)),
    expertisePct: round2((s[STAT.expertise] || 0) / RATING.expertise + pct.expertisePct + (adj.expertisePct || 0)),
    mh: mh || { ...FALLBACK_WEAPON },
    oh: mh && mh.twoHand ? null : oh,
    windfuryAp: b.windfuryAp,
    externalShout: b.externalShout,
    armorReduction: b.armor + (s[STAT.arpen] || 0), // shown on the sheet: raid debuffs + your armor penetration
    exposeArmor: EXPOSE_ARMOR[exposeLevel],
    sunder,
    raidDebuffs,
    raidShatter: b.raidShatter,
    physDmgTaken: b.physDmgTaken + (s[STAT.physDmg] || 0),
    // The same split by owner: the raid's debuffs go to the shared encounter (engine/target.js), the rest is yours.
    raidArmorReduction: b.armor, // Faerie Fire, Curse of Recklessness
    raidPhysDmgTaken: b.physDmgTaken, // Gift of Arthas
    arpen: s[STAT.arpen] || 0,
    physDmgBonus: s[STAT.physDmg] || 0,
    bsT2: bsT2Pieces >= 3,
    // Tanking (sim/core/unit.go): defense skill above 300 from gear, and the dodge, parry and block from rating and
    // Agility before defense and talents. Block and block value only with a shield.
    shield,
    defense: Math.floor((s[STAT.defense] || 0) / RATING.defense),
    dodgePct: round2(cs.dodge + agi * cs.dodgePerAgi + (s[STAT.dodge] || 0) / RATING.dodge),
    parryPct: round2((s[STAT.parry] || 0) / RATING.parry),
    blockPct: shield ? round2((s[STAT.block] || 0) / RATING.block) : 0,
    blockValue: shield ? Math.round(Math.max(0, str * BLOCK_VALUE_PER_STR - 1) + (s[STAT.blockValue] || 0)) : 0,
    procs,
    uses,
  };
  return { sheet, notes, gear };
}

// Consumables of a type that matter for a Fury warrior, for the raid setup pickers.
// A consumable's icon (CONSUMABLE_ICONS), else one for its wowsims ConsumableType.
const CONSUMABLE_TYPE_ICONS = { 1: 'inv_potion_41', 2: 'inv_potion_97', 3: 'inv_misc_food_14', 5: 'spell_fire_selfdestruct', 6: 'inv_stone_sharpening_04', 11: 'inv_potion_32' };
export function consumableIcon(c, type = c && c.ty) {
  return (c && CONSUMABLE_ICONS[c.id]) || CONSUMABLE_TYPE_ICONS[type] || 'inv_misc_questionmark';
}

// The potions wowsims offers under a potion class (1 resource, 2 defensive, 3 offensive), by name.
export function potionOptions(potionClass) {
  return DB.consumables.filter((c) => c.ty === 1 && (POTION_CLASSES[c.id] || []).includes(potionClass)).sort((a, b) => a.n.localeCompare(b.n));
}

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

const BLUNT = new Set([3, 4, 8]); // wowsims WeaponType: fist, mace, staff
function stoneFits(c, weapon) {
  if (/weightstone/i.test(c.n)) return BLUNT.has(weapon.type);
  if (/sharpening stone/i.test(c.n)) return !BLUNT.has(weapon.type);
  return true;
}

// The Scrolls of Imbue each fit one kind of weapon (their spell's EquipSubclass): a staff, a dagger, or a one-handed
// sword (Imbue Spark); wowsims applies nothing to any other.
const STAFF = 8, SWORD = 9;
const SCROLL_WEAPON = {
  1296225: DAGGER, 1302284: DAGGER, 1302308: DAGGER, 1302227: SWORD,
  ...Object.fromEntries([1295720, 1302217, 1302219, 1302283, 1302304, 1302305, 1302306, 1302307, 1302310, 1302311, 1302312].map((id) => [id, STAFF])),
};
function scrollFits(c, weapon) {
  const want = (c.fx || []).map((fx) => SCROLL_WEAPON[fx.b]).find(Boolean);
  if (!want) return true;
  return !!weapon && weapon.type === want && !(want === SWORD && weapon.twoHand);
}
