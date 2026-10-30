import { createFight } from './engine/fight.js';
import { Arena } from './world/arena.js';
import { FX_COLORS } from './world/spell-fx.js';
import { QUALITY, TIMES } from './world/environment.js';
import { gearLook } from './world/models.js';
import { BRUTE_INFO, BruteEncounter, ENCOUNTERS, dressBoss } from './world/encounter.js';
import { OnyxiaEncounter } from './world/onyxia.js';
import { SOUND_DEFAULTS, Sound } from './audio.js';
import { ALERT_KINDS, RAID_PACK_DEFAULTS, RaidPack } from './raid-pack.js';
import { HudFrames } from './hud-frames.js';
import { iconFor, iconSource, parseHtml, renderResults, snapshotResults } from './results.js';
import { botReference, parsePercent, referenceSummary } from './score.js';
import { warmUpWowsims, wowsimsReference } from './wowsims-sim.js';
import { aplFrom, explain, suggest } from './apl.js';
import { GhostView, SimGhost } from './ghost.js';
import { MoveDrill } from './drills.js';
import { GroupPlay, unitOf } from './group-play.js';
import { RAID_COOLDOWNS } from './data/raid-cooldowns.js';
import { TANK_SPECS, TankBot } from './tank-bot.js';
import { disposeCharacter, makeCharacter } from './world/characters.js';
import { HealerBot, healersFor, raiderRoster } from './raid-bots.js';
import { journalOf } from './journal.js';
import { cleanName } from './name-filter.js';
import { getReport, listReports, newReportId, saveReport, updateReport } from './history.js';
import { remoteOn, uploadReport } from './logs/remote.js';
import { GroupRaid, SimRaid } from './engine/raid.js';
import { CLASS_COLORS, RAID_FRAME_DEFAULTS, RaidFrames } from './raid-frames.js';
import { buildMainMenu } from './main-menu.js';

import { canAdd, canRemove, spentIn, spentTotal, talentOpen, talentRanks, talentString } from './talents.js';

import { BIND_PRESETS, DEFAULT_LAYOUT } from './data/keybinds.js';
import { DEFAULT_SPEC, SPECS, baseSpec, buildsOf } from './data/specs.js';
import { DEFAULT_ZONE, ZONES } from './data/zones.js';
import { myslotKeybinds, parseMyslot } from './myslot.js';
import { initTooltips, ttEsc, ttRows } from './tooltip.js';
import { DB } from './data/db.js';
import { CLASS_MACROS, DEFAULT_MACROS, macroAction, mergeNewDefaults, parseMacro, runMacro, spellNames } from './macros.js';
import { RACES, RACIALS, STANCES, STAT, TALENT, THREAT, iconUrl } from './data/warrior.js';
import {
  ABILITIES, ALL_ACTIONS, AURAS, BUILT_IN_BUILDS, CLASS_ID, CLS, DEFAULT_TALENTS, IS_HEALER, IS_WARRIOR, MAX_TALENT_POINTS, NO_DPS_EFFECT, POINTS_PER_TIER, SPEC,
  TALENT_EFFECTS, TALENT_TREES, TALENT_TREE_DATA, VARIANT, castable, parseTalents, spellbook,
} from './active-class.js';
import { CLASS_RACES } from './data/class-stats.js';
import { ROGUE_HUD } from './classes/rogue/hud.js';
import { MAGE_HUD } from './classes/mage/hud.js';
import { PALADIN_HUD } from './classes/paladin/hud.js';
import { PRIEST_HUD } from './classes/priest/hud.js';
import { SHAMAN_HUD } from './classes/shaman/hud.js';
import { DRUID_HUD } from './classes/druid/hud.js';
import { BEAR_HUD, CAT_HUD } from './classes/druid/feral-hud.js';
import { WARLOCK_HUD } from './classes/warlock/hud.js';
import { HUNTER_HUD } from './classes/hunter/hud.js';
import { CLASSES } from './classes/index.js';

const CLASSES_BY_ID = Object.fromEntries(Object.entries(CLASSES).map(([k, c]) => [k, c.name]));

// The class's HUD pieces and texts (js/classes/<class>/hud.js); the warrior's are the ones written out below.
const FERAL_HUD = SPECS[SPEC].loadout.form === 'bear' ? BEAR_HUD : CAT_HUD;
const HUD = { rogue: ROGUE_HUD, mage: MAGE_HUD, paladin: PALADIN_HUD, priest: PRIEST_HUD, shaman: SHAMAN_HUD, warlock: WARLOCK_HUD, hunter: HUNTER_HUD, druid: SPECS[SPEC].loadout.variant === 'feral' ? FERAL_HUD : DRUID_HUD }[CLASS_ID] || null;
document.body.classList.add(`cls-${CLASS_ID}`);
// Melee range abilities (their icons take Fojji's red out-of-range tint).
const isMelee = (id) => MELEE_ACTIONS.has(id) || !!(ABILITIES[id] && ABILITIES[id].melee);
import { ARMOR_DEBUFFS, BUFF_CATEGORIES, BUFF_GROUPS, CONSUMABLE_SLOTS, armorDebuffOf, effectLevel, levelValue } from './data/buffs.js';
import { DEFAULT_LOADOUT, SLOT_NAMES, computeSheet, consumableIcon, consumableOptions, potionOptions } from './character.js';
import { parseWowsimsExport, toWowsimsExport } from './wowsims.js';

// ---- storage (per-browser conveniences only) ------------------------------------------------

// Saved under the "furytrainer." prefix from before the game was renamed Numen Gym, so players keep their settings.
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('furytrainer.' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('furytrainer.' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

// The spec being played (top bar). Its character, keybinds, bars and APL are saved under keys of its own; Fury keeps
// the keys from before there were specs. Switching the spec reloads the page.
const SPEC_KEY = `${CLASS_ID}-${SPEC}`;
const loadoutKeyOf = (spec) => (spec === 'fury' ? 'loadout.v2' : `loadout.${spec}.v1`);
const LOADOUT_KEY = loadoutKeyOf(SPEC);
const APL_KEY = SPEC === 'fury' ? 'apl' : `apl.${SPEC}`;

const REAL_BOSS_TIME = 3600; // a fight against a boss's real health has no clock of its own; an hour is its limit
const DEFAULT_SETTINGS = {
  duration: 120, targets: 1, startRage: 0, queueWindow: 400, precastShout: true, encounter: 'dummies',
  npcTank: 'prot', // the boss's NPC tank: a tank spec playing its APL (tank-bot.js), or 'off' for a stand-in
  npcRaid: 0, // NPC raiders filling a boss's raid out to this size (raid-bots.js), 0 for none
  quality: 'medium', timeOfDay: 'sunset', nameplates: true, rotationHelper: true, zone: DEFAULT_ZONE, noggenfogger: false,
  simGhost: true, simRace: true, simNext: false, // Show: the sim as a ghost, racing it in the meter, its next cast
  // How the fight ends ('time', 'health', 'never', 'execute' = infinite and always in execute), the dummies'
  // health for 'health', and the drills: move every N s for N s, take a hit every N s (0 = never).
  endMode: 'time', dummyHealth: 50000, moveEvery: 0, moveFor: 0, hitEvery: 0,
  // Whether the targets hit back ('auto': for a tank spec, or in a group with a tank in it) and your healers' HPS
  // then (815: the wowsims Protection default).
  targetHits: 'auto', healing: 815,
  spec: DEFAULT_SPEC,
  playerName: '', // shown to the others in a group
  bodyType: null, // 'body1' / 'body2' (main menu); null: the model's default for the race
};

// Fight setting presets (Settings → Fight), as in the ForeverWarlocking practice sim.
const FIGHT_PRESETS = {
  health: { targets: 1, endMode: 'health', dummyHealth: 50000, moveEvery: 0, moveFor: 0, hitEvery: 0 },
  'three-min': { targets: 1, duration: 180, endMode: 'time', moveEvery: 0, moveFor: 0, hitEvery: 0 },
  moving: { targets: 2, duration: 180, endMode: 'time', moveEvery: 20, moveFor: 5, hitEvery: 0 },
  'three-dummies': { targets: 3, duration: 180, endMode: 'time', moveEvery: 0, moveFor: 0, hitEvery: 0 },
};

// What the spec is scored on: threat per second for a tank, otherwise DPS.
const METRIC = SPECS[SPEC].metric || 'dps';
const metricName = METRIC === 'tps' ? 'TPS' : 'DPS';
const metricOfFight = (f) => (METRIC === 'tps' ? f.tps() : f.dps());

// Do the targets hit back? 'auto': when you play a tank spec, or in a group that has one.
function targetsHit(s) {
  if (s.targetHits === 'on') return true;
  if (s.targetHits === 'off') return false;
  const g = state.group;
  if (g && g.active) return g.members.some((m) => m.info && m.info.tank);
  return !!SPECS[SPEC].tank;
}

// The engine's fight options for the settings (see Fight's constructor).
// What a character holds: only warriors, rogues and hunters dual wield, so another class shows no off-hand weapon;
// a held-in-off-hand item (an orb, a tome: weapon type 5) is not drawn as a weapon. Shields (7) stay.
const DUAL_WIELDERS = new Set(['warrior', 'rogue', 'hunter']);
function handsLook(look, cls = CLASS_ID) {
  if (!look || look.oh == null || look.oh === 7) return look;
  if (look.oh === 5 || !DUAL_WIELDERS.has(cls)) return { ...look, oh: null };
  return look;
}

function fightOpts(s, targets) {
  const g = state.group;
  // A classic boss at its real health: the fight lasts until it dies or you do (in a group its health is shared, and a
  // group always fights at it: raid testing). Boss health: the real one or 75, 50 or 25% of it.
  const enc = ENCOUNTERS[s.encounter] || ENCOUNTERS.dummies;
  const real = !!(enc.health && (s.realBoss || (g && g.active)));
  const bossHealth = enc.health ? Math.round(enc.health * (s.bossHpPct || 100) / 100) : 0;
  const botTank = enc.boss && !targetsHit(s) && TANK_SPECS[s.npcTank] ? s.npcTank : null;
  return {
    duration: real ? REAL_BOSS_TIME : s.duration, targets, startRage: s.startRage,
    queueWindow: s.queueWindow / 1000, precastShout: s.precastShout,
    // A healer's fight runs its full length (the raid keeps the boss busy).
    end: real ? 'health' : IS_HEALER ? 'time' : s.endMode === 'execute' ? 'never' : s.endMode,
    execute: s.endMode === 'execute' ? 'always' : s.endMode === 'never' ? 'never' : 'last20',
    health: real ? bossHealth : s.dummyHealth, moveEvery: s.moveEvery, moveFor: s.moveFor, hitEvery: s.hitEvery,
    startStance: SPECS[SPEC].startStance,
    // An NPC tank of a tank spec holds the boss by its threat: the boss hits back, at you once you pull it (110%).
    // With healers in the raid (a player, or NPC healers) there is no external healing: they heal.
    tank: targetsHit(s) || !!botTank, hps: botTank || raidHealers(s, botTank) ? 0 : s.healing, metric: METRIC, group: !!(g && g.active) || !!botTank,
    raidHealers: raidHealers(s, botTank),
    firstAggro: !botTank && !!(g && g.active && g.puller() === g.group.myId), // the tank (or the host) pulls
    botTank,
  };
}
// Keybinds: the active preset per spec and the binds in use ("binds.v3"), plus the player's own presets
// ("bindPresets.v1"), both keyed by spec so more classes can be added. Built-in presets: js/data/keybinds.js.
// A build without presets of its own takes its base spec's.
const builtInPresets = () => BIND_PRESETS[SPEC_KEY] || BIND_PRESETS[`${CLASS_ID}-${baseSpec(SPEC)}`] || [];
const ownPresets = () => (store.get('bindPresets.v1', {})[SPEC_KEY] || []);
const presetById = (id) => [...builtInPresets(), ...ownPresets()].find((p) => p.id === id);

function loadBinds() {
  // A build without keys of its own yet starts from its base spec's (Fire's keys for FFB).
  const all = store.get('binds.v3', {});
  const saved = all[SPEC_KEY] || all[`${CLASS_ID}-${baseSpec(SPEC)}`];
  // A built-in preset saved under an older default layout takes the new keys.
  const stale = saved && builtInPresets().some((p) => p.id === saved.preset) && saved.layout !== DEFAULT_LAYOUT;
  if (saved && presetById(saved.preset) && !stale) return { preset: saved.preset, binds: { ...saved.binds } };
  if (stale) return { preset: saved.preset, binds: { ...presetById(saved.preset).binds } };
  return { preset: 'default', binds: { ...builtInPresets()[0].binds } };
}

// Saves the binds in use; while one of the player's own presets is active it is updated too.
function saveBinds() {
  const all = store.get('binds.v3', {});
  all[SPEC_KEY] = { preset: state.bindPreset, binds: state.binds, layout: DEFAULT_LAYOUT };
  store.set('binds.v3', all);
  const own = ownPresets();
  const mine = own.find((p) => p.id === state.bindPreset);
  if (mine) {
    mine.binds = { ...state.binds };
    const presets = store.get('bindPresets.v1', {});
    presets[SPEC_KEY] = own;
    store.set('bindPresets.v1', presets);
  }
}
const defaultMacros = () => (IS_WARRIOR ? DEFAULT_MACROS : CLASS_MACROS[CLASS_ID] || []).map((m) => ({ ...m }));

// Saved macros, plus any default macros added since they were saved (merged in once).
// Macros are stored under v4. v3 briefly held the Myslot macros (ids "my-..."), which the player
// preferred the earlier built-in set to; v2 still holds that earlier set as they left it.
// The warrior's macros are under the keys from before there were classes; another class keeps its own, with its
// class's built-in macros (CLASS_MACROS: the mage's Ice Block) merged in once.
const MACROS_KEY = IS_WARRIOR ? 'macros.v4' : `macros.${CLASS_ID}.v1`;
function loadMacros() {
  if (!IS_WARRIOR) {
    const defaults = CLASS_MACROS[CLASS_ID] || [];
    const seenKey = `macros.${CLASS_ID}.seen`;
    const { macros, seen } = mergeNewDefaults(store.get(MACROS_KEY, []), store.get(seenKey, []), defaults);
    store.set(seenKey, seen);
    return macros;
  }
  const saved = store.get('macros.v4', null);
  if (!saved) {
    // First load: the earlier macros (as saved in v2, else the defaults), plus any macro the player wrote
    // while v3 was in use.
    const prev = store.get('macros.v2', null) || defaultMacros();
    const ids = new Set(prev.map((m) => m.id));
    const own = (store.get('macros.v3', []) || []).filter((m) => !m.id.startsWith('my-') && !ids.has(m.id));
    const macros = mergeNewDefaults([...prev, ...own], DEFAULT_MACROS.map((m) => m.id)).macros;
    store.set('macros.seen.v4', DEFAULT_MACROS.map((m) => m.id));
    store.set('macros.v4', macros);
    return macros;
  }
  const { macros, seen } = mergeNewDefaults(saved, store.get('macros.seen.v4', DEFAULT_MACROS.map((m) => m.id)));
  store.set('macros.seen.v4', seen);
  store.set('macros.v4', macros);
  return macros;
}

const state = {
  loadout: store.get(LOADOUT_KEY, structuredClone(SPECS[SPEC].loadout)),
  sheet: null,
  gear: [],
  notes: [],
  settings: { ...DEFAULT_SETTINGS, ...store.get('settings', {}) },
  ...(() => { const b = loadBinds(); return { binds: b.binds, bindPreset: b.preset }; })(),
  bars: null,      // the action bar layout (loadBars), set at startup
  editBars: false, // the spellbook is open: bars can be edited by drag and drop
  macros: loadMacros(),
  editingMacro: null,
  fight: null,
  drill: null,     // MoveDrill: the fire you have to step out of in move windows
  ghost: null,     // SimGhost: the bot's fight beside yours
  ghostView: null, // GhostView: the bot drawn in the arena
  arena: null,
  countdownTimer: null,
  listening: null, // ability id waiting for a new keybind
  lastFrame: 0,
  lastMeterDraw: 0,
};
// With ?debug in the address the game's state is window.numenDebug, for the tests and the browser console.
if (new URLSearchParams(location.search).has('debug')) window.numenDebug = state;
// Items of the earlier Pre-BiS default that wowsims has since removed from its database, and the current
// Pre-BiS items for the same slots (the enchants are the same).
const RETIRED_DEFAULTS = { 272414: 18511, 226861: 21998, 226857: 21995, 284716: 272409 };
state.loadout.classId = CLASS_ID;
// A race the class cannot be (a loadout from before) becomes the spec's default.
if (!CLASS_RACES[CLASS_ID].includes(state.loadout.race)) state.loadout.race = SPECS[SPEC].loadout.race || CLASS_RACES[CLASS_ID][0];
state.loadout.items = (state.loadout.items || []).map((it) => (it && RETIRED_DEFAULTS[it.id] ? { ...it, id: RETIRED_DEFAULTS[it.id] } : it));

const $ = (sel) => document.querySelector(sel);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function iconImg(icon, alt = '') {
  const img = document.createElement('img');
  img.src = iconUrl(icon);
  img.alt = alt;
  img.onerror = () => {
    const d = document.createElement('div');
    d.className = 'icon-fallback';
    d.textContent = alt.split(' ').map((w) => w[0]).join('').slice(0, 3);
    img.replaceWith(d);
  };
  return img;
}

// ---- character --------------------------------------------------------------------------------

// Recomputes the sheet from the loadout and starts a fresh fight with it.
// The loadout the fight is built from: yours, with the host's raid buffs and debuffs while you are in their group.
function fightLoadout() {
  const g = state.group;
  const lo = g && g.active && !g.isHost && state.groupRaid ? { ...state.loadout, ...state.groupRaid } : state.loadout;
  // A paladin in the raid blesses everyone but the tank with Salvation, whatever your own setting says.
  return salvationForced() ? { ...lo, buffs: { ...(lo.buffs || {}), greaterBlessingOfSalvation: true } } : lo;
}

// Blessing of Salvation (30% less threat): on by default for everyone but a tank (turned off it stays off), and on
// regardless with a paladin in the raid: a player in the group (you included), the NPC tank or an NPC raider.
const SALVATION = 'greaterBlessingOfSalvation';
function salvationForced() {
  if (SPECS[SPEC].tank) return false;
  const g = state.group && state.group.active ? state.group : null;
  if (g ? g.members.some((m) => (m.info || {}).cls === 'paladin') : CLASS_ID === 'paladin') return true;
  const { botTank } = fightOpts(state.settings, 1);
  if (botTank && SPECS[botTank].classId === 'paladin') return true;
  return npcRaiders(state.settings, botTank).some((r) => SPECS[r.spec].classId === 'paladin');
}

// The NPC raiders the raid gets (at a boss or the dummies): the free places up to its size (raid-bots.js), past the
// players and the NPC tank; about one healer in four, less the players who heal.
function npcRaiders(s, botTank) {
  const players = state.group && state.group.active ? state.group.members.length : 1;
  return raiderRoster((s.npcRaid || 0) - players - (botTank ? 1 : 0), Math.max(0, healersFor(s.npcRaid) - playerHealers()));
}
const playerHealers = () => (state.group && state.group.active ? state.group.members.filter((m) => (m.info || {}).healer).length : IS_HEALER ? 1 : 0);
// Healers in the raid: a player who heals, or NPC healers.
const raidHealers = (s, botTank) => playerHealers() > 0 || npcRaiders(s, botTank).some((r) => r.healer);

// The raid changed (its NPCs, the group): a new fight, and a new sheet if a paladin came or went (Salvation).
function refreshSalvation() {
  if (salvationForced() !== !!state.salvationForced) rebuild({ keepMsg: true });
  else newFight();
}

function rebuild({ keepMsg = false } = {}) {
  // The way the spec plays its class (a Feral druid's form) comes with the spec, whatever was imported.
  state.loadout.variant = SPECS[SPEC].loadout.variant || null;
  state.loadout.form = SPECS[SPEC].loadout.form || null;
  // Salvation is on for everyone but a tank until it is turned off (then it is kept off: false).
  if (!SPECS[SPEC].tank && (state.loadout.buffs || {})[SALVATION] === undefined) (state.loadout.buffs ||= {})[SALVATION] = true;
  state.salvationForced = salvationForced();
  const { sheet, notes, gear } = computeSheet(fightLoadout(), { zone: state.settings.zone, classId: CLASS_ID });
  state.sheet = sheet;
  state.gear = gear;
  state.notes = notes;
  store.set(LOADOUT_KEY, state.loadout);
  fillCharacter();
  drawGear();
  drawEffects();
  if (!keepMsg && notes.length) setMsg(notes.join('\n'), 'error');
  buildActionBar();
  newFight();
  showAplStatus(); // an imported export can bring its own APL
  if (state.group) state.group.updateInfo(); // the others draw your race and gear
}

// ---- appearance (world/customization.js) --------------------------------------------------------------------

// Your character's looks: hair, eyes, skin, face, beard, markings, jewelry and the race's horns, tusks or ears, saved
// per race (settings.customization) and shown to your group. The choices come from world/customization.js, loaded
// only where this build has it: without it the section stays hidden and the character keeps its default look.
let CUSTOM = null;
const CUSTOM_LABELS = { hairStyle: 'Hair style', hairColor: 'Hair colour', eyeColor: 'Eyes', skinTone: 'Skin', face: 'Face', beard: 'Beard', markings: 'Markings', jewelry: 'Jewelry' };
const FEATURE_LABEL = (race) => (race === 'RaceTauren' ? 'Horns' : ['RaceOrc', 'RaceTroll'].includes(race) ? 'Tusks' : 'Ears');
const pretty = (v) => v.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const myRace = () => (state.sheet ? state.sheet.race : state.loadout.race) || 'RaceOrc';
function myCustomization() {
  const saved = ((state.settings.customization || {})[myRace()]) || {};
  return CUSTOM ? CUSTOM.normalizeCustomization(saved, myRace()) : {};
}
function applyCustomization() {
  if (!CUSTOM || !state.arena) return;
  state.arena.setAppearance({ customization: myCustomization() });
  if (state.group) state.group.updateInfo(); // the others see the new look
}
function buildAppearance() {
  const box = $('#appearance');
  $('#appearance-box').classList.toggle('hidden', !CUSTOM);
  if (!CUSTOM || !box) return;
  const race = myRace();
  const options = CUSTOM.customizationOptions(race);
  const current = myCustomization();
  box.innerHTML = '';
  for (const [key, values] of Object.entries(options)) {
    if (!values.length) continue;
    const label = document.createElement('label');
    label.textContent = `${key === 'feature' ? FEATURE_LABEL(race) : CUSTOM_LABELS[key] || pretty(key)} `;
    const sel = document.createElement('select');
    sel.add(new Option('Default', ''));
    for (const v of values) sel.add(new Option(pretty(v), v));
    sel.value = current[key] || '';
    sel.addEventListener('change', () => {
      const all = { ...(state.settings.customization || {}) };
      const mine = { ...(all[race] || {}) };
      if (sel.value) mine[key] = sel.value; else delete mine[key];
      all[race] = mine;
      state.settings.customization = all;
      store.set('settings', state.settings);
      applyCustomization();
    });
    label.appendChild(sel);
    box.appendChild(label);
  }
}
import('./world/customization.js').then((m) => { CUSTOM = m; buildAppearance(); applyCustomization(); }).catch(() => {});

function fillCharacter() {
  const s = state.sheet;
  const form = $('#char-form');
  const raceSel = form.elements.race;
  if (!raceSel.options.length) for (const key of CLASS_RACES[CLASS_ID]) raceSel.add(new Option(RACES[key].name, key));
  raceSel.value = s.race;
  form.elements.talents.value = s.talents;
  if (CUSTOM && $('#appearance-box').dataset.race !== s.race) {
    // Another race: its own choices and its saved looks.
    $('#appearance-box').dataset.race = s.race;
    buildAppearance();
    applyCustomization();
  }
  // A hunter's pet, a warlock's demon.
  const choices = CLS.Fight.PET_CHOICES;
  $('#pet-choice').classList.toggle('hidden', !choices);
  if (choices) {
    const petSel = form.elements.pet;
    $('#pet-choice span').textContent = choices.label;
    if (!petSel.options.length) for (const [key, name] of [['', 'None'], ...choices.options]) petSel.add(new Option(name, key));
    petSel.value = (state.loadout.classOptions || {})[choices.option] || '';
  }
  const adj = state.loadout.adjust || {};
  const af = $('#adjust-form');
  for (const k of ['ap', 'critPct', 'hitPct', 'hastePct', 'expertisePct']) af.elements[k].value = adj[k] || 0;

  const weapon = (w) => (w ? `${w.min + (w.flat || 0)}–${w.max + (w.flat || 0)} @ ${w.speed}` : '—');
  const rows = [
    ['Strength', s.str], ['Agility', s.agi], ['Attack Power', s.ap], ['Crit', s.critPct + '%'],
    ['Hit', s.hitPct + '%'], ['Haste', s.hastePct + '%'], ['Expertise', s.expertisePct + '%'],
    ['Boss armor removed (raid)', s.armorReduction + s.raidShatter + (s.exposeArmor || (s.sunder.mode === 'full' ? 2250 : 0))],
    ['Sunder Armor', { off: 'your own only', full: '5 stacks (tank)', help: `${s.sunder.warriors} warriors help stack` }[s.sunder.mode]],
    ['Main hand', weapon(s.mh)], ['Off hand', s.shield ? 'shield' : weapon(s.oh)],
    ['Windfury AP', s.windfuryAp || 'off'], ['Other Battle Shout', s.externalShout || 'off'],
    // Tanking: from gear and Agility, before talents; the boss's table against you is in the fight's tooltip.
    ['Health', s.health], ['Armor', s.armor], ['Defense', `+${s.defense}`], ['Dodge', s.dodgePct + '%'], ['Parry', s.parryPct + '%'],
    ...(s.shield ? [['Block', s.blockPct + '%'], ['Block value', s.blockValue]] : []),
  ];
  $('#stat-sheet').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  $('#player-race').textContent = RACES[s.race].name;
  drawTalentSummary();
}

function drawTalentSummary() {
  const t = parseTalents(state.sheet.talents);
  const points = TALENT_TREES.map((names) => names.reduce((sum, n) => sum + t[n], 0));
  const key = ['bloodthirst', 'flurry', 'deathWish', 'deepWounds', 'impale', 'ragingBlows', 'unbridledWrath', 'cruelty',
    'improvedOverpower', 'improvedRend', 'improvedTacticalMastery']
    .filter((n) => t[n]).map((n) => `${n.replace(/([A-Z])/g, ' $1').toLowerCase()} ${t[n]}`);
  $('#talent-summary').textContent = `${points.join(' / ')} · ${key.join(', ')}`;
}

// ---- talents and builds -----------------------------------------------------------------------

// Talents that change damage but that the fight engine does not model yet (dashed in the trees).
const unmodelled = (key) => !TALENT_EFFECTS[key] && !NO_DPS_EFFECT.has(key);

function setTalents(str) {
  state.loadout.talentsString = str;
  rebuild();
  drawTalents();
}

function drawTalents() {
  const ranks = talentRanks(state.loadout.talentsString);
  const total = spentTotal(ranks);
  $('#talent-points').textContent = `${ranks.map((_, t) => spentIn(ranks, t)).join(' / ')} · ${MAX_TALENT_POINTS - total} of ${MAX_TALENT_POINTS} points left`;
  $('#talent-trees').innerHTML = TALENT_TREE_DATA.map((tree, t) => `
    <div class="talent-tree" style="background-image:url('${tree.bg}')">
      <h3>${esc(tree.name)} <span>${spentIn(ranks, t)}</span></h3>
      <div class="talent-grid">${tree.talents.map((tal, i) => {
        const r = ranks[t][i];
        const state_ = r ? 'has' : talentOpen(ranks, t, i) && total < MAX_TALENT_POINTS ? 'open' : 'locked';
        return `<button type="button" class="talent ${state_}${unmodelled(tal.key) ? ' unmodelled' : ''}" style="grid-row:${tal.row + 1};grid-column:${tal.col + 1}"
          data-t="${t}" data-i="${i}" data-tt="talent:${t}:${i}"><img src="${iconUrl(tal.icon)}" alt=""><span class="rank">${r}/${tal.max}</span></button>`;
      }).join('')}</div>
    </div>`).join('');
  drawBuilds();
}

function talentTip(arg) {
  const [t, i] = arg.split(':').map(Number);
  const tree = TALENT_TREE_DATA[t];
  const tal = tree && tree.talents[i];
  if (!tal) return '';
  const ranks = talentRanks(state.loadout.talentsString);
  const r = ranks[t][i];
  const effect = TALENT_EFFECTS[tal.key];
  const lines = [];
  if (effect) {
    if (r) lines.push(`<div class="tt-desc">${ttEsc(effect(r))}</div>`);
    if (r < tal.max) lines.push(`<div class="tt-dim">${r ? 'Next rank' : 'Rank 1'}: ${ttEsc(effect(r + 1))}</div>`);
  } else if (NO_DPS_EFFECT.has(tal.key)) {
    lines.push('<div class="tt-dim">Tanking or utility: changes nothing on a training dummy.</div>');
  } else {
    lines.push('<div class="tt-desc">Not modelled by the trainer yet. The wowsims DPS of a build in the list above counts it.</div>');
  }
  if (!talentOpen(ranks, t, i)) {
    const need = [];
    const above = tree.talents.reduce((s, x, k) => s + (x.row < tal.row ? ranks[t][k] : 0), 0);
    if (above < tal.row * POINTS_PER_TIER) need.push(`${tal.row * POINTS_PER_TIER} points in ${tree.name}`);
    if (tal.prereq) {
      const p = tree.talents.find((x) => x.row === tal.prereq[0] && x.col === tal.prereq[1]);
      if (p) need.push(`${p.max}/${p.max} ${p.name}`);
    }
    if (need.length) lines.push(`<div class="tt-req">Requires ${ttEsc(need.join(' and '))}</div>`);
  }
  return `<div class="tt-name">${ttEsc(tal.name)}</div><div class="tt-dim">Rank ${r}/${tal.max} · ${ttEsc(tree.name)}</div>${lines.join('')}
    <div class="tt-dim">Click: add a point · Right-click: remove one</div>`;
}

function bindTalents() {
  const trees = $('#talent-trees');
  const change = (e, add) => {
    const b = e.target.closest('.talent');
    if (!b) return;
    e.preventDefault();
    const t = Number(b.dataset.t);
    const i = Number(b.dataset.i);
    const ranks = talentRanks(state.loadout.talentsString);
    if (add ? !canAdd(ranks, t, i) : !canRemove(ranks, t, i)) return;
    ranks[t][i] += add ? 1 : -1;
    setTalents(talentString(ranks));
  };
  trees.addEventListener('click', (e) => change(e, true));
  trees.addEventListener('contextmenu', (e) => change(e, false));
  $('#talent-reset').addEventListener('click', () => setTalents(''));
  $('#build-save').addEventListener('click', () => {
    const name = $('#build-name').value.trim();
    const msg = $('#build-msg');
    if (!name) { msg.textContent = 'Give the build a name first.'; msg.className = 'msg error'; return; }
    const builds = store.get('builds.v1', []).filter((b) => b.name !== name);
    builds.push({ id: `own-${Date.now().toString(36)}`, name, talents: state.loadout.talentsString, spec: SPEC });
    store.set('builds.v1', builds);
    $('#build-name').value = '';
    msg.textContent = `Saved "${name}".`;
    msg.className = 'msg ok';
    drawBuilds();
  });
  $('#build-list').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.use != null) setTalents(b.dataset.use);
    if (b.dataset.del) {
      store.set('builds.v1', store.get('builds.v1', []).filter((x) => x.id !== b.dataset.del));
      drawBuilds();
    }
  });
}

// The builds: wowsims' presets, the talents of an imported export, your saved builds and your current talents.
function allBuilds() {
  // The builds of the spec being played (its gear and APL are what they are simmed with).
  const list = BUILT_IN_BUILDS.filter((b) => (b.spec || 'fury') === SPEC).map((b) => ({ ...b }));
  const imported = state.loadout.source && state.loadout.source.player && state.loadout.source.player.talentsString;
  if (imported && !list.some((b) => b.talents === imported)) list.push({ id: 'imported', name: 'Imported from wowsims', talents: imported, playable: true });
  for (const b of store.get('builds.v1', [])) if ((b.spec || 'fury') === SPEC) list.push({ ...b, own: true, playable: true });
  const now = state.loadout.talentsString;
  if (!list.some((b) => b.talents === now)) list.push({ id: 'current', name: 'Your talents (not saved)', talents: now, playable: true });
  // Builds that spend points on damage talents the trainer does not model can be simmed but not fully played.
  for (const b of list) {
    if (!b.playable) continue;
    const ranks = talentRanks(b.talents);
    const missing = TALENT_TREE_DATA.flatMap((tree, t) => tree.talents.filter((tal, i) => ranks[t][i] && unmodelled(tal.key)).map((tal) => tal.name));
    if (missing.length) b.note = [b.note, `The trainer does not model ${missing.join(', ')} yet`].filter(Boolean).join(' · ');
  }
  return list;
}

// The wowsims fight (js/wowsims-sim.js) for the trainer's fight options and character sheet.
function wsFight(o, sheet) {
  return {
    duration: o.duration, targets: o.targets, startRage: o.startRage, sunderMode: sheet.sunder && sheet.sunder.mode, execute: o.execute,
    startStance: o.startStance, prot: SPEC === 'prot', tank: !!o.tank, hps: o.hps, metric: METRIC, classId: CLASS_ID, spec: SPEC,
  };
}

// The build's wowsims DPS (TPS for a tank) for your setup, by a key of everything that changes it.
const BUILD_DPS = 'buildDps.v2'; // v2: wowsims gets the starting stance
function buildKey(talents) {
  const lo = state.loadout;
  const s = state.settings;
  return setupKey({ spec: SPEC, race: lo.race, items: lo.items, consumables: lo.consumables, buffs: lo.buffs, raidBuffs: lo.raidBuffs, partyBuffs: lo.partyBuffs, debuffs: lo.debuffs, trainer: lo.trainer, talents },
    { zone: s.zone, duration: s.duration, targets: s.targets, startRage: s.startRage }, currentApl().apl);
}

function drawBuilds() {
  const cache = store.get(BUILD_DPS, {});
  const now = state.loadout.talentsString;
  const builds = allBuilds().map((b) => ({ ...b, dps: b.playable ? cache[buildKey(b.talents)] : null }));
  builds.sort((a, b) => (b.dps || 0) - (a.dps || 0));
  $('#build-list').innerHTML = builds.map((b) => `<li class="${b.talents === now ? 'current' : ''}">
      <span class="bn">${esc(b.name)}<small>${esc(b.talents || '(no talents)')}${b.note ? ` · ${esc(b.note)}` : ''}</small></span>
      <span class="bd ${b.dps ? '' : 'wait'}" title="wowsims ${metricName} with your gear, raid setup, zone, APL and fight length (${state.settings.duration} s, ${state.settings.targets} target${state.settings.targets > 1 ? 's' : ''})">${b.dps ? `${fmtNum(b.dps)} ${metricName}` : b.playable ? 'simming…' : '—'}</span>
      ${b.talents === now ? '<span class="hint">in use</span>' : `<button type="button" data-use="${esc(b.talents)}">Use</button>`}
      ${b.own ? `<button type="button" class="ghost" data-del="${esc(b.id)}" title="Delete this build">✕</button>` : ''}
    </li>`).join('');
  simBuilds();
}

// Sims the builds without a DPS yet, one at a time in the wowsims worker, while the Talents tab is open.
let buildSimRunning = false;
async function simBuilds() {
  if (buildSimRunning || $('#tab-talents').classList.contains('hidden') || $('#panel').classList.contains('hidden')) return;
  const todo = allBuilds().filter((b) => b.playable && store.get(BUILD_DPS, {})[buildKey(b.talents)] == null);
  if (!todo.length) return;
  buildSimRunning = true;
  const b = todo[0];
  const key = buildKey(b.talents);
  try {
    const s = state.settings;
    const ref = await wowsimsReference({
      loadout: { ...state.loadout, talentsString: b.talents }, apl: currentApl().apl, zoneId: simZoneId(),
      fight: wsFight({ ...fightOpts(s, s.targets), execute: 'last20' }, state.sheet),
    });
    const cache = store.get(BUILD_DPS, {});
    cache[key] = Math.round(ref.avg);
    const keys = Object.keys(cache);
    for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete cache[k];
    store.set(BUILD_DPS, cache);
  } catch (e) {
    $('#build-msg').textContent = `wowsims could not sim the builds: ${e.message || e}`;
    $('#build-msg').className = 'msg error';
    buildSimRunning = false;
    return;
  }
  buildSimRunning = false;
  if (!$('#tab-talents').classList.contains('hidden')) drawBuilds();
}

function drawGear() {
  const ul = $('#gear-list');
  ul.innerHTML = '';
  for (const g of state.gear) {
    const li = document.createElement('li');
    li.appendChild(iconImg(g.icon, g.name));
    li.insertAdjacentHTML('beforeend', `<span class="slot">${SLOT_NAMES[g.slot]}</span><span><span class="q${g.quality}">${esc(g.name)}</span>${g.enchant ? `<br><span class="ench">${esc(g.enchant)}</span>` : ''}</span>`);
    ul.appendChild(li);
  }
}

function drawEffects() {
  const s = state.sheet;
  const items = [];
  for (const p of s.procs) {
    const rate = p.chance ? `${(p.chance * 100).toFixed(1)}% chance` : `${p.ppm} per minute`;
    items.push({ icon: p.icon, text: `${p.name}`, kind: `proc · ${p.source} · ${rate}${p.hand !== 'any' ? ' · ' + p.hand.toUpperCase() : ''}` });
  }
  for (const [slot, u] of Object.entries(s.uses)) {
    items.push({ icon: u.icon, text: u.name, kind: `use · ${(ABILITIES[slot] || { name: 'Weapon' }).name} button` });
  }
  const ul = $('#effects-list');
  ul.innerHTML = '';
  if (!items.length) { ul.innerHTML = '<li class="hint">No procs or use effects.</li>'; return; }
  for (const it of items) {
    const li = document.createElement('li');
    li.appendChild(iconImg(it.icon, it.text));
    li.insertAdjacentHTML('beforeend', `<span>${esc(it.text)} <span class="k">(${esc(it.kind)})</span></span>`);
    ul.appendChild(li);
  }
  for (const n of state.notes.filter((n) => n.includes('not modelled'))) ul.insertAdjacentHTML('beforeend', `<li class="hint">${esc(n)}</li>`);
}

function setMsg(text, kind = '') {
  const el = $('#import-msg');
  el.textContent = text;
  el.className = 'msg ' + kind;
}

function doImport() {
  try {
    const loadout = parseWowsimsExport($('#import-text').value);
    loadout.adjust = {};
    state.loadout = loadout;
    rebuild({ keepMsg: true });
    buildRaidSetup();
    const n = state.notes;
    setMsg(`Imported ${state.gear.length} items${loadout.name ? ' for ' + loadout.name : ''}.` + (n.length ? '\n' + n.join('\n') : ''), n.length ? 'error' : 'ok');
  } catch (err) {
    setMsg(err.message, 'error');
  }
}

async function doExport() {
  const json = toWowsimsExport(state.loadout);
  $('#import-text').value = json;
  try {
    await navigator.clipboard.writeText(json);
    setMsg('Copied. In wowsims choose Import → JSON and paste.', 'ok');
  } catch {
    setMsg('Select the text above and copy it, then in wowsims choose Import → JSON.', 'ok');
  }
}

function resetCharacter() {
  state.loadout = structuredClone(SPECS[SPEC].loadout);
  rebuild({ keepMsg: true });
  buildRaidSetup();
  setMsg(`Back to the wowsims Pre-BiS ${SPECS[SPEC].name} defaults.`, 'ok');
}

// ---- raid setup -------------------------------------------------------------------------------

function buildRaidSetup(root = $('#raid-setup'), { consumables = true } = {}) {
  root.innerHTML = '';
  const lo = state.loadout;

  // Icon toggles like the wowsims settings tab: click turns a buff on or off; Battle Shout steps through
  // off, Battle Shout and Enhanced Battle Shout. Buffs that share a category say so in their tooltip.
  for (const group of BUFF_GROUPS) {
    root.insertAdjacentHTML('beforeend', `<h2>${group.title}</h2>`);
    const box = document.createElement('div');
    box.className = 'raid-group';
    const settings = lo[group.source] || (lo[group.source] = {});
    if (group.source === 'debuffs') box.appendChild(armorDebuffRow());
    const grid = document.createElement('div');
    grid.className = 'buff-tiles';
    for (const [key, def] of Object.entries(group.buffs)) {
      if (def.caster && CLS.resource !== 'mana') continue; // caster buffs for a class with mana
      // Salvation with a paladin in the raid: on, whatever your own setting.
      const forced = key === SALVATION && group.source === 'buffs' && salvationForced();
      const lvl = forced ? 1 : Math.min(effectLevel(settings[key]), def.levels);
      const tile = document.createElement('button');
      if (forced) tile.title = 'A paladin in the raid blesses you with it (not a tank)';
      tile.type = 'button';
      tile.className = `buff-tile${lvl ? ' on' : ''}${lvl === 2 ? ' imp' : ''}`;
      const label = lvl && def.levelNames ? def.levelNames[lvl - 1] : def.name;
      tile.dataset.tt = `buff:${group.source}:${key}`;
      tile.appendChild(iconImg(def.icon, def.name));
      tile.insertAdjacentHTML('beforeend', `${lvl === 2 ? '<span class="tier">+</span>' : ''}<span class="bname">${esc(label)}</span>`);
      tile.addEventListener('click', () => setBuff(group.source, key, def.levels, (lvl + 1) % (def.levels + 1)));
      grid.appendChild(tile);
    }
    box.appendChild(grid);
    root.appendChild(box);
  }
  if (!consumables) return;

  root.insertAdjacentHTML('beforeend', '<h2>Consumables</h2>');
  const box = document.createElement('div');
  box.className = 'raid-group';
  const cons = lo.consumables || (lo.consumables = {});
  for (const slot of CONSUMABLE_SLOTS) {
    const options = slot.potionClass ? potionOptions(slot.potionClass) : consumableOptions(slot.type);
    const current = slot.index != null ? (cons[slot.field] || [])[slot.index] : cons[slot.field];
    const choose = (v) => {
      if (slot.index != null) {
        const arr = [...(cons[slot.field] || [])];
        arr[slot.index] = v;
        cons[slot.field] = arr.filter(Boolean);
      } else {
        cons[slot.field] = v;
      }
      rebuild();
      buildRaidSetup();
    };
    const known = options.find((c) => c.id === current);
    const row = document.createElement('div');
    row.className = 'raid-row';
    row.insertAdjacentHTML('beforeend', `<span>${slot.label}</span>`);
    row.appendChild(consumablePicker(slot, options, current ? { id: current, n: known ? known.n : `Item ${current}` } : null, choose));
    box.appendChild(row);
  }
  root.appendChild(box);
}

// A dropdown with icons (a <select> cannot show them): the chosen item, and a list to pick from.
function consumablePicker(slot, options, current, choose) {
  const wrap = document.createElement('div');
  wrap.className = 'cons-pick';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `cons-current${current ? '' : ' none'}`;
  btn.appendChild(iconImg(current ? consumableIcon({ id: current.id }, slot.type) : 'inv_misc_questionmark', ''));
  btn.insertAdjacentHTML('beforeend', `<span>${esc(current ? current.n : 'None')}</span><span class="caret">▾</span>`);
  if (current) btn.dataset.tt = `cons:${current.id}`;
  const menu = document.createElement('div');
  menu.className = 'cons-menu hidden';
  for (const c of [null, ...options]) {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = `cons-opt${(c ? c.id : 0) === (current ? current.id : 0) ? ' active' : ''}`;
    opt.appendChild(iconImg(c ? consumableIcon(c, slot.type) : 'inv_misc_questionmark', ''));
    opt.insertAdjacentHTML('beforeend', `<span>${esc(c ? c.n : 'None')}</span>`);
    if (c) opt.dataset.tt = `cons:${c.id}`;
    opt.addEventListener('click', () => choose(c ? c.id : 0));
    menu.appendChild(opt);
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.contains('hidden');
    document.querySelectorAll('.cons-menu').forEach((m) => m.classList.add('hidden'));
    menu.classList.toggle('hidden', !open);
    if (open) { const act = menu.querySelector('.active'); if (act) act.scrollIntoView({ block: 'nearest' }); }
  });
  wrap.append(btn, menu);
  return wrap;
}
// A click anywhere else closes an open consumable list.
document.addEventListener('click', () => document.querySelectorAll('.cons-menu').forEach((m) => m.classList.add('hidden')));

// Sunder Armor or Expose Armor (they do not stack), and how many other warriors help stack Sunder.
function armorDebuffRow() {
  const lo = state.loadout;
  const wrap = document.createElement('div');
  wrap.className = 'raid-group';
  const row = document.createElement('label');
  row.className = 'raid-row';
  row.innerHTML = '<span>Armor debuff <span class="note">Sunder and Expose Armor do not stack</span></span>';
  const sel = document.createElement('select');
  for (const o of ARMOR_DEBUFFS) sel.add(new Option(o.name, o.id));
  sel.value = armorDebuffOf(lo);
  row.append(sel);
  const wRow = document.createElement('label');
  wRow.className = 'raid-row';
  wRow.innerHTML = '<span>Other warriors stacking Sunder <span class="note">each one sunders on every global cooldown until 5 stacks; after that it lasts 30 sec unless you refresh it</span></span>';
  const count = document.createElement('input');
  count.type = 'number';
  count.min = 1;
  count.max = 10;
  count.style.width = '60px';
  count.value = (lo.trainer && lo.trainer.warriors) || 2;
  wRow.append(count);
  wRow.classList.toggle('hidden', sel.value !== 'sunderHelp');
  const save = () => {
    const opt = ARMOR_DEBUFFS.find((o) => o.id === sel.value);
    const d = lo.debuffs || (lo.debuffs = {});
    if (opt.sunderArmor) d.sunderArmor = true; else delete d.sunderArmor;
    if (opt.exposeArmor) d.exposeArmor = true; else delete d.exposeArmor; // a plain bool in Forever's proto
    lo.trainer = { ...(lo.trainer || {}), sunderHelp: !!opt.help, warriors: Math.max(1, Math.min(10, Number(count.value) || 1)) };
    wRow.classList.toggle('hidden', !opt.help);
    rebuild();
  };
  sel.addEventListener('change', save);
  count.addEventListener('change', save);
  wrap.append(row, wRow);
  return wrap;
}

function setBuff(source, key, levels, level) {
  const settings = state.loadout[source] || (state.loadout[source] = {});
  const def = (BUFF_GROUPS.find((g) => g.source === source) || { buffs: {} }).buffs[key] || {};
  const v = levelValue(levels, level, def.numeric);
  if (v === undefined && key === SALVATION) settings[key] = false; // off for good, not back to the default
  else if (v === undefined) delete settings[key]; else settings[key] = v;
  rebuild();
  buildRaidSetup(); // the icon tiles show the new state
  if (!$('#raid-setup-modal').classList.contains('hidden')) drawRaidSetupPrompt();
}

// ---- fight lifecycle --------------------------------------------------------------------------

// Pauses the fight or goes on with it (alone, or the host for the whole group: group-play.js).
function setPaused(on) {
  const f = state.fight;
  on = !!on && !!f && f.started && !f.over;
  state.paused = on;
  $('#paused').classList.toggle('hidden', !on);
  $('#btn-pause').textContent = on ? 'Resume' : 'Pause';
  $('#btn-pause').classList.toggle('on', on);
}
function togglePause() {
  const f = state.fight;
  const g = state.group;
  if (!f || !f.started || f.over) return;
  if (g && g.active && !g.isHost) { raidWarning(`The ${leader()} pauses for the group`); return; }
  setPaused(!state.paused);
  if (g && g.isHost) g.pause(state.paused);
}

function newFight() {
  clearInterval(state.countdownTimer);
  for (const t of state.buffTimers || []) clearTimeout(t);
  $('#countdown').classList.add('hidden');
  setPaused(false);
  const s = state.settings;
  const enc = ENCOUNTERS[s.encounter] || ENCOUNTERS.dummies;
  const targets = enc.boss ? 1 : s.targets;
  const opts = fightOpts(s, targets);
  // A boss's adds (Onyxia's whelps) are extra targets of your fight; the sim's ghost fights the boss alone.
  const adds = enc.adds || 0;
  state.fight = createFight(state.sheet, { ...opts, targets: targets + adds }); // the class's fight (js/classes)
  if (state.fight.totemSet) state.fight.totemSet = totemSet(); // a shaman's Call of the Elements set
  // A soulstone placed before an earlier pull is still on you (30 min) until it is used.
  if (state.soulstone) state.fight.setAura('soulstone', RAID_COOLDOWNS.soulstone.duration, 0, { name: RAID_COOLDOWNS.soulstone.name, icon: RAID_COOLDOWNS.soulstone.icon });
  // The NPC tank of a tank spec: its own fight on the same boss, with the raid's external healing on it.
  state.tankBot = opts.botTank ? new TankBot(opts.botTank, { ...opts, targets: targets + adds, botTank: null, hps: opts.raidHealers ? 0 : s.healing }, s.zone) : null;
  if (state.tankBot) state.tankBot.id = 'bot:tank';
  // NPC raiders filling a boss's raid out to its size: DPS specs on their wowsims presets playing their APLs.
  state.raidBots = npcRaiders(s, state.tankBot && state.tankBot.spec).map((r, i) => Object.assign(r.healer
    ? new HealerBot(r.spec, s.zone, { name: r.name })
    : new TankBot(r.spec, { ...opts, targets: targets + adds }, s.zone, { tank: false, name: r.name }), { id: `bot:${i}` }));
  // Your pet keeps the mode you last set it to (the sim's assists, as wowsims).
  const petMode = (state.settings.petMode || {})[CLASS_ID];
  if (state.fight.pet && petMode) state.fight.pet.mode = petMode;
  state.drill = new MoveDrill(state.fight, state.arena, raidWarning, drillAlert);
  state.fight.on(onFightEvent);
  // A healer's heals land on the player under the mouse on the raid frames, else the one clicked, else on you; the
  // raid is the real one (the group, the NPCs) when there is one.
  if (state.fight.raid) syncHealerRaid(state.fight);
  if (state.fight.raid) {
    const f = state.fight;
    if (f.raid.me) f.raid.me.name = state.settings.playerName || 'You'; // none yet while joining a group
    f.healTarget = () => (state.mouseoverUnit && f.raid.unit(state.mouseoverUnit) ? state.mouseoverUnit : state.friendlyTarget && f.raid.unit(state.friendlyTarget) ? state.friendlyTarget : 'me');
  }
  if (state.group) state.group.attach(state.fight); // a group: the shared targets, the host's settings
  // The sim's fight: same setup and options, its own dice; it starts when you pull.
  state.ghost = new SimGhost(state.sheet, { ...opts, tank: opts.tank && !opts.botTank }, currentApl().apl, aplItems()); // the NPC tank holds the boss for it too
  state.ghost.on((ev) => { if (state.ghostView) state.ghostView.onEvent(ev); });
  state.fightLog = [];
  state.arena.setRace(state.sheet.race, handsLook(gearLook(state.gear)));
  // A boss has an NPC tank unless the targets hit back at players (you tank, or a tank is in your group).
  state.arena.setScene({ boss: enc.boss || false, targets: targets + adds, npcTank: !opts.tank || !!opts.botTank });
  // A classic boss: the Brute's body in its own colour and size, its NPC tank at its new front.
  if (enc.look) {
    dressBoss(state.arena.dummies[0], enc.look);
    if (state.arena.tank) state.arena.tank.position.z = state.arena.dummies[0].userData.radius + 0.9;
  }
  dressTankBot();
  dressRaidBots();
  // Dead with a soulstone, or a druid's Rebirth to ask for: the fight goes on without you for a minute meanwhile.
  state.fight.resWait = () => (state.fight.aura('soulstone') || rebirthSources(state.fight).length ? RES_WAIT : 0);
  state.arena.clearTraps();
  state.arena.reset();
  if (state.ghostView) state.ghostView.placed = false; // back beside you
  state.encounter = enc.boss === 'onyxia' ? new OnyxiaEncounter(state.fight, state.arena, raidWarning)
    : enc.boss ? new BruteEncounter(state.fight, state.arena, raidWarning, bossAlert, enc) : null;
  if (state.encounter instanceof BruteEncounter) state.encounter.onLand = botsReact;
  state.arena.bossRooted = !!enc.rooted;
  if (state.raidPack) state.raidPack.reset();
  if (state.sound) state.sound.setGtfo(null);
  $('#opt-targets').disabled = !!enc.boss || leaderOnly();
  document.body.classList.remove('in-fight');
  $('#log').innerHTML = '';
  buildTargets();
  drawMeter();
  drawReview();
  $('#btn-start').textContent = 'Start';
  $('#btn-start').disabled = false;
}

// The group changed (someone joined or left, a tank among them): whether the targets hit back and who they hit
// follow it, for the fight not pulled yet.
function refreshTankOpts() {
  const f = state.fight;
  if (!f || f.started) return;
  const o = fightOpts(state.settings, f.targets.length);
  Object.assign(f.o, { tank: o.tank, group: o.group, firstAggro: o.firstAggro });
  f.holder = f.targets.map(() => f.constructor.firstHolder(f.o));
  const gf = state.ghost && !state.ghost.started ? state.ghost.f : null; // the sim tanks alone
  const simTank = o.tank && !o.botTank; // the NPC tank holds the boss for the sim too
  if (gf) { gf.o.tank = simTank; gf.holder = gf.targets.map(() => (simTank ? 'me' : null)); }
}

// The fight engine emits 'start' when you pull (Charge, an attack or the end of the countdown).
function onStart() {
  $('#countdown').classList.add('hidden');
  clearInterval(state.countdownTimer);
  // While the fight runs the button ends it (the only way out of an infinite-health fight).
  $('#btn-start').disabled = false;
  $('#btn-start').textContent = 'End';
}

// The pull timer, as a raid leader's /pull: 15 sec in a group (everyone buffs meanwhile), 5 alone.
const PULL_SECONDS = 5;
const GROUP_PULL_SECONDS = 15;
function countdown() {
  if (state.fight && (state.fight.started || state.fight.over)) newFight();
  autoBuff();
  let n = state.group && state.group.active ? GROUP_PULL_SECONDS : PULL_SECONDS;
  announceBuffs(n);
  const el = $('#countdown');
  el.textContent = n;
  el.classList.remove('hidden');
  state.sound.play('tick');
  $('#btn-start').disabled = true;
  clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(() => {
    n--;
    if (n > 0) { el.textContent = n; state.sound.play('tick'); return; }
    clearInterval(state.countdownTimer);
    el.classList.add('hidden');
    state.sound.play('go');
    state.fight.start();
  }, 1000);
}

// Everyone in the raid: the players (the group, or you alone) and the trainer's NPC tank and raiders, { name, cls, base }.
function raidComp() {
  const g = state.group;
  const players = g && g.active
    ? g.members.map((m) => ({ name: m.name, cls: (m.info || {}).cls, base: (m.info || {}).base, me: m.id === g.group.myId }))
    : [{ name: state.settings.playerName || 'You', cls: CLASS_ID, base: baseSpec(SPEC), me: true }];
  const bots = [state.tankBot, ...(state.raidBots || [])].filter(Boolean).map((b) => ({ name: b.name, cls: b.classId, base: baseSpec(b.spec), npcTank: b.tank, npc: true, label: b.label }));
  // You last: what someone else brings comes from them, and what only you bring you may cast yourself in the fight.
  return [...players.filter((p) => !p.me), ...bots, ...players.filter((p) => p.me)];
}

// The raid buffs and debuffs the raid brings (BRINGS), each with the first one in it who brings it.
function compBuffs() {
  const comp = raidComp();
  const out = new Map();
  for (const [key, who] of Object.entries(BRINGS)) {
    const by = comp.find((m) => who.some(([cls, ...specs]) => m.cls === cls && (!specs.length || specs.includes(m.base))));
    if (by) out.set(key, by);
  }
  if (out.has('sunderArmor')) out.delete('exposeArmor'); // they do not stack: a warrior's Sunder Armor goes first
  return out;
}

// At the pull everyone buffs what their class can: what the raid brings is turned on, the raid's buffs and debuffs by
// the leader (or you alone; a guest gets them with the leader's settings) and the blessings by each player for
// themselves. Nothing is turned off.
function autoBuff() {
  const lead = !leaderOnly();
  let changed = false;
  for (const [key, by] of compBuffs()) {
    if (by.me && ABILITIES[key]) continue; // your own Battle Shout is yours to cast
    if (by.npcTank && key === 'sunderArmor') continue; // the NPC tank stacks its Sunder Armor in the fight (shareDebuffs)
    const src = buffSource(key);
    if (src !== 'buffs' && !lead) continue;
    const set = state.loadout[src] || (state.loadout[src] = {});
    if (set[key]) continue;
    if (key === 'sunderArmor' || key === 'exposeArmor') {
      if (set.sunderArmor || set.exposeArmor) continue;
      set[key] = true;
    } else {
      const def = BUFF_GROUPS.find((gr) => gr.source === src).buffs[key];
      set[key] = levelValue(def.levels, 1, def.numeric);
    }
    changed = true;
  }
  if (!changed) return;
  rebuild({ keepMsg: true });
  buildRaidSetup();
}

// The buffs going out during the pull timer, a raid warning for each one buffing ("Lunara casts Gift of the Wild");
// the debuffs go on the boss once it is pulled.
function announceBuffs(seconds) {
  for (const t of state.buffTimers || []) clearTimeout(t);
  const byCaster = new Map();
  for (const [key, by] of compBuffs()) {
    if (buffSource(key) === 'debuffs' || (by.me && ABILITIES[key])) continue;
    byCaster.set(by, [...(byCaster.get(by) || []), buffName(key)]);
  }
  const casts = [...byCaster];
  const list = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);
  const step = Math.min(1500, ((seconds - 1) * 1000) / Math.max(1, casts.length));
  state.buffTimers = casts.map(([by, names], i) => setTimeout(() => raidWarning(`${by.me ? 'You cast' : `${by.name} casts`} ${list(names)}`), 500 + i * step));
}

// ---- raid pack alerts (js/raid-pack.js) ----------------------------------------------------------------

// Aggro changed: a tank who lost it is told to taunt, anyone else who pulled it is told to stop.
function aggroAlert(ev) {
  const rp = state.raidPack;
  if (!rp.s.on) { raidWarning(ev.me ? 'You have aggro' : 'You lost aggro'); return; }
  const tank = SPECS[SPEC].tank;
  if (tank && !ev.me) rp.warn('AGGRO LOST <i class="y">»</i> TAUNT', { icon: 'spell_nature_reincarnation', voice: 'taunt' });
  else if (tank) rp.line('aggro', 'You have aggro', { icon: 'ability_warrior_defensivestance', duration: 2 });
  else if (ev.me) rp.warn('YOU HAVE AGGRO <i class="y">»</i> STOP', { icon: 'ability_warrior_challange', voice: 'aggro' });
  else rp.line('aggro', 'Aggro back on the tank', { icon: 'ability_warrior_defensivestance', duration: 2 });
}

// A classic boss's mechanics as raid pack alerts by their kind (the Brute has its own below). Returns false when the
// raid pack is off (the plain raid warning shows instead).
function bossAlert(a) {
  const enc = ENCOUNTERS[state.settings.encounter] || ENCOUNTERS.brute;
  if (enc === ENCOUNTERS.brute) return bruteAlert(a);
  const rp = state.raidPack;
  if (!rp.s.on) return false;
  const m = enc.mechanics[a.key];
  const icon = (a.info || {}).icon;
  if (a.phase === 'hit') { rp.line(`${a.key}Hit`, `Hit by ${m.name}`, { icon, duration: 2.5 }); return true; }
  const call = { patch: ['MOVE OUT', 'move'], stomp: ['RUN OUT', 'run out'], fear: ['FEAR', 'fear'], nova: ['RAID DAMAGE', 'A O E'], berserk: ['BERSERK', 'berserk'] }[m.kind];
  if (call) rp.warn(`${m.name.toUpperCase()} <i class="y">»</i> ${call[0]}`, { icon, voice: call[1] });
  else rp.line(a.key, m.name, { icon, duration: a.cast });
  return true;
}

// The Ragefire Brute's mechanics as raid pack alerts. Returns false when the raid pack is off (the plain raid
// warning shows instead).
function bruteAlert({ key, phase, cast }) {
  const rp = state.raidPack;
  if (!rp.s.on) return false;
  const f = state.fight;
  const info = BRUTE_INFO[key];
  const g = f.geo;
  const tanking = f.o.tank && f.hasAggro(0);
  if (key === 'cleave' && phase === 'cast') {
    // Only for someone standing in it who is not the one tanking it.
    if (!tanking && g.dist[0] <= 9 && g.angle[0] < Math.PI / 3) rp.warn('CLEAVE <i class="y">»</i> GET BEHIND', { icon: info.icon, voice: 'behind' });
    else rp.line('cleave', 'Cleave', { icon: info.icon, duration: cast });
  } else if (key === 'cleave' && phase === 'hit') {
    rp.line('cleaveHit', 'Hit by Cleave: stand behind the boss', { icon: info.icon, duration: 2.5 });
  } else if (key === 'patch' && phase === 'cast') {
    rp.warn('FLAME PATCH ON YOU', { icon: info.icon, sub: '(<i class="c">!</i>) MOVE OUT (<i class="c">!</i>)', voice: 'move' });
    rp.icon('patch', { icon: info.icon, label: 'Move Out', duration: cast });
  } else if (key === 'stomp' && phase === 'cast') {
    rp.warn('WAR STOMP <i class="y">»</i> RUN OUT', { icon: info.icon, voice: 'run out' });
    rp.icon('stomp', { icon: info.icon, label: 'Run Out', duration: cast });
  } else if (key === 'nova' && phase === 'cast') {
    rp.warn('FIRE NOVA', { icon: info.icon, sub: 'raid damage', voice: 'A O E', sound: 'alert' });
  }
  return true;
}

// The move drill: fire over the melee area for `seconds` from now.
function drillAlert(seconds) {
  const rp = state.raidPack;
  if (!rp.s.on) return false;
  rp.warn('FIRE <i class="y">»</i> MOVE OUT OF MELEE', { icon: 'spell_fire_fire', voice: 'move out' });
  rp.icon('drill', { icon: 'spell_fire_fire', label: 'Move Out', duration: seconds });
  return true;
}

// Every frame: the boss timers, and GTFO while you stand in fire.
function updateRaidPack(f) {
  const rp = state.raidPack;
  const timers = [];
  if (state.encounter && f.started && !f.over) {
    for (const t of state.encounter.timers()) timers.push({ ...t, ...(state.encounter.info || BRUTE_INFO)[t.key] });
  }
  const every = f.o.moveEvery || 0;
  if (every && f.o.moveFor && f.started && !f.over) {
    const next = Math.max(every, Math.ceil((f.t + 1e-6) / every) * every);
    timers.push({ key: 'drill', name: 'Move out', icon: 'spell_fire_fire', left: next - f.t, total: every });
  }
  rp.setTimers(timers);
  rp.frame();
  const inFire = f.started && !f.over && ((state.encounter && state.encounter.inFire()) || (state.drill && state.drill.inFire()));
  state.sound.setGtfo(inFire ? 'high' : null);
}

function press(id, mods = {}) {
  const btn = document.querySelector(`.ab[data-id="${id}"]`);
  if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 90); }
  if (state.paused) { showError('The fight is paused'); return; }
  if (state.fight && state.fight.dead) { showError('You are dead'); return; } // nothing, macros included
  if (!state.fight || state.fight.over) newFight();
  const m = id.startsWith('macro:') ? macroOf(id) : replacingMacro(id);
  if (m) {
    const res = runMacro(m, state.fight, spellNames(state.sheet), mods);
    if (res.reason) showError(res.reason);
    return;
  }
  if (id.startsWith('macro:')) return;
  if (state.arena.fearUntil) { showError('You are feared'); return; } // Onyxia's Bellowing Roar, Magmadar's Panic
  // No target (Escape): an ability takes the nearest enemy, as WoW's auto-targeting does.
  if (state.fight.targetless) cycleTarget();
  const f = state.fight;
  const onGcd = !!(ABILITIES[id] && ABILITIES[id].gcd);
  if (onGcd && !f.started && prepullGcdLeft() > 0) { showError('Ability is not ready yet'); return; }
  const res = f.press(id, mods);
  if (!res.ok) showError(res.reason);
  // Before the pull the fight's clock stands still, so the global cooldown runs on the real one (a totem's 1 sec).
  if (res.ok && onGcd && !f.started) state.prepullGcd = { until: performance.now() + f.gcdFor(id) * 1000, total: f.gcdFor(id) };
  // A pet mode set on the pet bar is kept for the next fights.
  const ab = ABILITIES[id];
  if (res.ok && ab && ab.petMode) {
    state.settings.petMode = { ...(state.settings.petMode || {}), [CLASS_ID]: ab.petCommand };
    store.set('settings', state.settings);
  }
}

// Tab, as in WoW: the nearest enemy, then on to the next nearest with each press (an add that has not come out yet,
// or died, is skipped). With no target it takes the nearest.
// What is left of the global cooldown before the pull (seconds): see press.
const prepullGcdLeft = () => (state.prepullGcd ? Math.max(0, (state.prepullGcd.until - performance.now()) / 1000) : 0);
// The global cooldown now: the fight's, or before the pull the real-time one.
const gcdNow = (f) => (f.started ? f.gcdLeft() : prepullGcdLeft());

function cycleTarget() {
  const f = state.fight;
  const order = f.targets.map((t, i) => i).filter((i) => !f.targets[i].dead || !f.targets[i].add).sort((a, b) => f.geo.dist[a] - f.geo.dist[b]);
  if (!order.length) return;
  const at = f.targetless ? -1 : order.indexOf(f.primary);
  f.setPrimary(order[(at + 1) % order.length]);
}

// Escape, as in WoW: you drop your target (and stop swinging at it).
function clearTarget() {
  const f = state.fight;
  if (!f || f.targetless) return;
  f.clearTarget();
  state.arena.noTarget = true;
}

let warningTimer = null;
function raidWarning(text) {
  const el = $('#raid-warning');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(warningTimer);
  warningTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

let errorTimer = null;
function showError(text) {
  const el = $('#error-text');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => el.classList.remove('show'), 700);
}

// ---- events from the engine -------------------------------------------------------------------

const SPIN = new Set(['whirlwind', 'whirlwindOh']);
const OFF_HAND = new Set(['oh']);
// A warlock's demon's hits play on the demon.
const PET_KEYS = new Set(['petMelee', 'lashOfPain', 'firebolt', 'demonicBrand', 'bite', 'claw', 'savageRend', 'swipe', 'dismember', 'pinch', 'mine',
  'lightningBreath', 'thunderstomp', 'demoralizingScreech', 'tendonRip', 'web', 'scorpidPoison', 'dustCloud']);

function onFightEvent(ev) {
  if (state.group) state.group.onLocalEvent(ev); // debuffs on the shared targets and your swings, for the group
  spellVisual(ev);
  // Keep every event for the Log tab of the results.
  if (ev.type !== 'queue' && ev.type !== 'target') {
    const entry = { ...ev };
    if (ev.type === 'aura') {
      const a = state.fight.auras[ev.id];
      entry.name = (a && a.name) || (AURAS[ev.id] && AURAS[ev.id].name) || ev.id;
    }
    if (state.fightLog) state.fightLog.push(entry);
  }
  if (IS_HEALER) healerEvent(ev);
  switch (ev.type) {
    case 'start': onStart(); break;
    case 'charge': state.arena.charge(ev.target); break;
    case 'blink': state.arena.blink(ev.yards); break;
    case 'leap': state.arena.leapBehind(ev.target); break;
    // A hunter's traps: laid at your feet, sprung or run out.
    case 'trap': state.arena.placeTrap(ev.token, ev.id); break;
    case 'trapSprung': state.arena.springTrap(ev.token, ev.id, ev.target); break;
    case 'trapGone': state.arena.removeTrap(ev.token); break;
    case 'hurt':
      hurtText(ev);
      logLine(ev);
      if (ev.amount > 0) state.arena.hurt();
      state.sound.play(ev.outcome === 'block' || ev.outcome === 'parry' ? 'block' : ev.amount > 0 ? 'hurt' : 'miss');
      break;
    case 'aggro': aggroAlert(ev); logLine(ev); break;
    case 'bossSwing': if (state.arena.boss && ev.target === 0) state.arena.bossSwing(false); break; // a player tank: the boss swings at them
    case 'death':
      raidWarning('You died'); logLine(ev); state.arena.die(); state.sound.play('death');
      if (!state.fight.over) showResPopup(); // a soulstone or a Rebirth can still bring you back
      break;
    case 'revive': {
      // Back on your feet (a soulstone, a Rebirth): the character stands up again.
      const a = state.arena;
      for (const m of [a.player, a.formModel]) if (m && m.userData.anim) { m.userData.anim.dead = false; m.userData.anim.death = 0; }
      $('#rcd-asks').querySelectorAll('.res').forEach((el) => el.remove());
      raidWarning(`${ev.by || 'You'}: back on your feet`);
      break;
    }
    case 'damage': {
      floatText(ev);
      logLine(ev);
      const direct = !ev.key.startsWith('proc') && !['deepWounds', 'rend', 'touchOfTheGrave', 'immolationTrap', 'explosiveTrap', 'freezingTrap', 'frostTrap'].includes(ev.key);
      if (PET_KEYS.has(ev.key)) state.arena.petAttack();
      if (ev.key === 'firebolt') state.arena.petBolt(0xff7a2a, ev.target);
      else if (ev.key === 'hawkMelee') state.arena.hawkAttack();
      else if (CLASS_ID === 'hunter' && direct) state.arena.animate(['mh', 'windfury', 'extra', 'raptorStrike', 'mongooseBite', 'wingClip', 'striderKick'].includes(ev.key) ? 'mh' : ev.key === 'oh' ? 'oh' : 'ranged');
      else if (direct && !SPIN.has(ev.key)) state.arena.animate(OFF_HAND.has(ev.key) ? 'oh' : 'mh');
      if (direct) {
        const crit = ev.outcome === 'crit';
        const yellow = !['mh', 'oh', 'windfury', 'extra'].includes(ev.key);
        state.arena.hitFx(ev.target, { crit, yellow, miss: ev.amount === 0 });
        if (crit && ev.amount >= 1200) state.arena.shake(Math.min(0.25, ev.amount / 12000));
        state.sound.play(ev.outcome === 'parry' || ev.outcome === 'block' ? 'block' : ev.amount === 0 ? 'miss' : crit ? 'crit' : yellow ? 'yellow' : 'hit');
      }
      break;
    }
    case 'error': showError(ev.reason); state.sound.play('error'); break;
    case 'castStart': {
      // A cast or channel plays its spell pose for its time (world/spell-animation.js, weapons put away).
      const color = spellColor(ev.id);
      const f = state.fight;
      if (color) state.arena.castSpell({ mode: f.casting && f.casting.channel ? 'channel' : 'cast', color, duration: Math.max(0.1, ev.end - f.t) });
      break;
    }
    case 'castEnd': if (ev.cancelled && spellColor(ev.id)) state.arena.stopCasting(); break;
    case 'cast':
      logLine(ev);
      // An instant spell (or one a proc made instant) thrusts its spell; a cast or channel waits for castStart.
      if (spellColor(ev.id) && !(ABILITIES[ev.id].channel || state.fight.castTime(ev.id) > 0)) state.arena.castSpell({ mode: 'instant', color: spellColor(ev.id) });
      if (ev.id === 'whirlwind') state.arena.animate('spin');
      if (ev.id === 'battleShout') state.arena.shoutFx();
      if (ev.id === 'battleShout' || ev.id === 'demoralizingShout') state.sound.play('shout');
      if (ev.id === 'charge' || ev.id === 'intercept') state.sound.play('charge');
      break;
    case 'stance': state.sound.play('stance'); break;
    case 'aura':
      if (ev.id.startsWith('proc')) logLine(ev);
      // Overpower or Revenge usable (the one your spec uses).
      if (ev.id === (SPECS[SPEC].tank ? 'revengeWindow' : 'overpowerWindow')) state.sound.play('proc');
      break;
    case 'end':
      $('#rcd-asks').querySelectorAll('.res').forEach((el) => el.remove()); // no more waiting for a res
      setPaused(false);
      saveResults();
      $('#btn-start').disabled = false;
      $('#btn-start').textContent = 'Again';
      break;
    case 'rage': if (!['Main Hand', 'Off Hand', 'refund', 'damage taken'].includes(ev.source)) logLine(ev); break;
    default: break;
  }
}

function logLine(ev) {
  const log = $('#log');
  const li = document.createElement('li');
  const t = `<span class="t">${ev.t.toFixed(1).padStart(5, ' ')}</span> `;
  if (ev.type === 'damage') {
    const what = ev.outcome === 'miss' ? 'missed' : ev.outcome === 'immune' ? 'was resisted (immune)' : ev.outcome === 'dodge' ? 'was dodged' : ev.outcome === 'parry' ? 'was parried' :
      `${ev.outcome === 'crit' ? 'crit' : ev.outcome === 'glance' ? 'glanced' : ev.outcome === 'block' ? 'was blocked, hit' : 'hit'} for ${fmtNum(ev.amount)}`;
    li.innerHTML = `${t}${esc(ev.name)}${ev.target ? ` (#${ev.target + 1})` : ''} ${what}`;
    if (ev.outcome === 'crit') li.className = 'crit';
  } else if (ev.type === 'cast') {
    li.innerHTML = `${t}You use ${esc(ABILITIES[ev.id].name)}`;
  } else if (ev.type === 'aura') {
    const a = state.fight.auras[ev.id];
    li.innerHTML = `${t}You gain ${esc((a && a.name) || ev.id)}`;
    li.className = 'crit';
  } else if (ev.type === 'hurt') {
    const how = { miss: 'misses you', dodge: 'is dodged', parry: 'is parried', block: `is blocked, hits you for ${fmtNum(ev.amount)}`,
      crit: `crits you for ${fmtNum(ev.amount)}`, crush: `crushes you for ${fmtNum(ev.amount)}` }[ev.outcome] || `hits you for ${fmtNum(ev.amount)}`;
    li.innerHTML = `${t}${esc(ev.name)} ${how}`;
    li.className = 'rage';
  } else if (ev.type === 'aggro') {
    li.innerHTML = `${t}${ev.me ? 'You have' : 'You lost'} aggro${ev.target ? ` on #${ev.target + 1}` : ''}`;
    li.className = 'crit';
  } else if (ev.type === 'death') {
    li.innerHTML = `${t}You died (${esc(ev.name)})`;
    li.className = 'rage';
  } else if (ev.type === 'rage') {
    li.innerHTML = `${t}+${ev.amount.toFixed(0)} rage (${esc(ev.source)})`;
    li.className = 'rage';
  }
  log.prepend(li);
  while (log.children.length > 150) log.lastChild.remove();
}

function hurtText(ev) {
  const anchor = $('#player-fct');
  if (!anchor) return;
  const span = document.createElement('span');
  const word = { miss: 'Miss', dodge: 'Dodge', parry: 'Parry', absorb: 'Absorb' }[ev.outcome];
  span.className = `fct hurt${word ? ' miss' : ''}`;
  span.textContent = word || `-${fmtNum(ev.amount)}${ev.outcome === 'block' ? ' (blocked)' : ev.outcome === 'crush' ? ' (crushing)' : ''}`;
  span.style.left = `${Math.round(Math.random() * 40 - 20)}px`;
  anchor.appendChild(span);
  setTimeout(() => span.remove(), 1300);
}

function floatText(ev) {
  const dummy = document.querySelectorAll('.dummy')[ev.target + 1];
  if (!dummy) return;
  const span = document.createElement('span');
  const yellow = !['mh', 'oh', 'windfury', 'deepWounds', 'extra', 'rend'].includes(ev.key);
  span.className = 'fct' + (yellow ? ' yellow' : '') + (ev.outcome === 'crit' ? ' crit' : '') + (ev.amount === 0 ? ' miss' : '');
  const word = { miss: 'Miss', dodge: 'Dodge', parry: 'Parry', immune: 'Immune' }[ev.outcome];
  span.textContent = word || fmtNum(ev.amount) + (ev.outcome === 'glance' ? ' (glancing)' : ev.outcome === 'block' ? ' (blocked)' : '');
  span.style.left = `${Math.round(Math.random() * 80 - 40)}px`;
  dummy.appendChild(span);
  setTimeout(() => span.remove(), 1500);
}

// ---- building the UI --------------------------------------------------------------------------

function buildTargets() {
  const f = state.fight;
  const frames = $('#targets');
  const dummies = $('#dummies');
  frames.innerHTML = '';
  dummies.innerHTML = '<div class="dummy" id="player-fct"></div>';
  const enc = ENCOUNTERS[state.settings.encounter] || ENCOUNTERS.dummies;
  f.targets.forEach((t, i) => {
    const fr = document.createElement('div');
    fr.className = 'target-frame' + (i === 0 ? ' primary' : '');
    const name = enc.boss ? (i > 0 && enc.addName ? enc.addName : enc.name) : `Training Dummy${f.targets.length > 1 ? ' ' + (i + 1) : ''}`;
    fr.innerHTML = `<div class="name"><span>${esc(name)}</span><span class="lvl">??</span></div>
      <div class="bar health"><div class="fill"></div><span>100%</span></div>
      <div class="bar power"><div class="fill"></div></div>
      <div class="bar cast hidden"><div class="fill"></div><span></span></div>
      <div class="where"></div><div class="debuffs"></div>
      <div class="tot hidden" title="Target of target: who it is attacking"><div class="fill"></div><span class="tot-name"></span><span class="tot-hp"></span></div>`;
    fr.addEventListener('click', () => state.fight.setPrimary(i));
    frames.appendChild(fr);
    const d = document.createElement('div');
    d.className = 'dummy';
    dummies.appendChild(d);
    const np = document.createElement('div');
    np.className = 'nameplate' + (enc.boss ? ' boss' : '');
    np.innerHTML = `<span>${esc(name)}</span><div class="np-bar"><div class="np-fill"></div></div>`;
    dummies.appendChild(np);
  });
}

const macroOf = (id) => state.macros.find((m) => `macro:${m.id}` === id);
// The macro that has taken over an ability's button, if one is on.
const replacingMacro = (abilityId) => state.macros.find((m) => m.enabled && m.replaces === abilityId);
// The APL the rotation helper follows: one pasted in Settings, else the imported wowsims export's, else the default.
function currentApl() {
  if (state.pastedApl) return { apl: state.pastedApl, from: 'pasted' };
  const imported = aplFrom(state.loadout.source);
  if (imported) return { apl: imported, from: 'imported' };
  return { apl: SPECS[SPEC].apl, from: 'default' };
}

// The arena's look: the zone's own, or the chosen time of day in the Training Grounds.
// A boss with a lair of its own (Onyxia) is fought there.
const lookKey = () => {
  const enc = ENCOUNTERS[state.settings.encounter];
  if (enc && (enc.lair || enc.area)) return enc.lair || enc.area; // and a classic boss in its raid
  return state.settings.zone === 'trainingGrounds' || !ZONES[state.settings.zone] ? state.settings.timeOfDay : state.settings.zone;
};

// Item ids an APL can cast: the equipped trinkets and the chosen explosive.
function aplItems() {
  const items = {};
  for (const g of state.gear || []) if (g.slot === 12 || g.slot === 13) items[g.id] = g.slot === 12 ? 'trinket1' : 'trinket2';
  const explosive = state.loadout.consumables && state.loadout.consumables.explosiveId;
  if (explosive) items[explosive] = 'explosive';
  return items;
}

// Abilities whose button is a stance-dance macro: the rotation helper lets the macro do the stance swap.
// Only macros that cast a stance count; one that merely checks it ("[stance:3] Bloodthirst") does not swap.
const danceAbilities = () => new Set(state.macros.filter((m) => m.enabled && m.replaces && /\b(battle|berserker|defensive) stance\b/i.test(m.text)).map((m) => m.replaces));
// Macros that replace nothing get their own buttons.
const freeMacros = () => state.macros.filter((m) => m.enabled && !m.replaces);

// The ability a macro button stands for right now (its #showtooltip spell or what it would cast).
function macroTarget(id) {
  const m = macroOf(id);
  return m ? macroAction(m, state.fight, spellNames(state.sheet)) : null;
}

// Name and icon of an action: item actions show the equipped trinket or chosen consumable, macros
// show the spell they cast.
function actionInfo(id) {
  if (id.startsWith('macro:')) {
    const m = macroOf(id);
    const target = macroTarget(id);
    const info = target ? actionInfo(target) : { icon: 'inv_misc_questionmark' };
    return { name: m ? m.name : 'Macro', icon: info.icon };
  }
  const ab = ABILITIES[id];
  const use = ab.item && state.sheet && state.sheet.uses[ab.item];
  if (use) return { name: use.name, icon: use.icon };
  const racial = ab.racial && state.sheet && RACIALS[state.sheet.race] && RACIALS[state.sheet.race].active;
  if (racial) return { name: racial.name, icon: racial.icon };
  return { name: ab.name, icon: ab.icon };
}

// The Fojji Warrior UI groups: the main bar (rotation, 34x32 icons) with the stance icons to its left, then the
// cooldown bar (32x30). The spec's default layout is in js/data/specs.js; yours is saved per spec ("bars.v1") and
// edited by dragging spells from the spellbook (side menu → Spellbook).
// Your trinkets have their own bar above your frame (#hf-trinkets): they come off the spec's other bars.
const TRINKETS = ['trinket1', 'trinket2'];
const DEFAULT_BARS = {
  ...Object.fromEntries(Object.entries(SPECS[SPEC].bars).map(([k, ids]) => [k, ids.filter((id) => !TRINKETS.includes(id))])),
  trinkets: [...TRINKETS],
};
const BAR_CLASSES = { main: 'fj-main', stances: 'fj-stances', cds: 'fj-cds', pet: 'fj-pet', trinkets: 'fj-trinkets', auras: 'fj-auras' };

function loadBars() {
  const saved = store.get('bars.v1', {})[SPEC_KEY];
  const bars = structuredClone(DEFAULT_BARS);
  if (saved) for (const k of Object.keys(bars)) if (Array.isArray(saved[k])) bars[k] = saved[k].filter((id) => ABILITIES[id]);
  // A layout saved before the aura bar (a paladin's): its auras move there.
  if (saved && bars.auras && !Array.isArray(saved.auras)) for (const k of Object.keys(bars)) if (k !== 'auras') bars[k] = bars[k].filter((id) => !DEFAULT_BARS.auras.includes(id));
  // A layout saved before the trinket bar: its trinkets move there.
  if (saved && !Array.isArray(saved.trinkets)) for (const k of Object.keys(bars)) if (k !== 'trinkets') bars[k] = bars[k].filter((id) => !TRINKETS.includes(id));
  // Pet spells added since the layout was saved (another family's) join the pet bar, before its modes.
  if (saved && bars.pet && DEFAULT_BARS.pet) {
    const placed = new Set(Object.values(bars).flat());
    const missing = DEFAULT_BARS.pet.filter((id) => ABILITIES[id] && ABILITIES[id].petSpell && !placed.has(id));
    const at = bars.pet.indexOf('petAssist');
    bars.pet.splice(at < 0 ? bars.pet.length : at, 0, ...missing);
  }
  return bars;
}

function saveBars() {
  const all = store.get('bars.v1', {});
  all[SPEC_KEY] = state.bars;
  store.set('bars.v1', all);
  buildActionBar();
}

// Puts an action on a bar at index `at` (moving it if it is on a bar already).
function placeOnBar(id, bar, at) {
  for (const [k, ids] of Object.entries(state.bars)) {
    const i = ids.indexOf(id);
    if (i < 0) continue;
    ids.splice(i, 1);
    if (k === bar && i < at) at--;
  }
  state.bars[bar].splice(Math.max(0, Math.min(at, state.bars[bar].length)), 0, id);
  saveBars();
}

function removeFromBars(id) {
  for (const ids of Object.values(state.bars)) { const i = ids.indexOf(id); if (i >= 0) ids.splice(i, 1); }
  saveBars();
}

// ---- group play ----------------------------------------------------------------------------------------

// The fight settings the host decides for everyone (the rest of Settings stays each player's own).
const HOST_FIGHT_KEYS = ['duration', 'targets', 'endMode', 'dummyHealth', 'moveEvery', 'moveFor', 'hitEvery', 'encounter', 'zone', 'targetHits', 'healing', 'realBoss', 'npcTank', 'bossHpPct', 'npcRaid'];
// The raid's buffs and debuffs the host decides for everyone (each player's consumables stay their own).
const HOST_RAID_KEYS = ['raidBuffs', 'partyBuffs', 'debuffs', 'trainer'];

function groupContext() {
  return {
    arena: state.arena,
    container: $('#arena'),
    info: () => ({
      race: state.sheet ? state.sheet.race : 'RaceOrc',
      look: handsLook(gearLook(state.gear)),
      transform: state.settings.noggenfogger ? 'noggenfogger' : null,
      bodyType: state.settings.bodyType || null,
      customization: myCustomization(), // hair, eyes, skin... (world/customization.js)
      base: baseSpec(SPEC), healer: !!SPECS[SPEC].healer, // the ready room's suggestions
      spec: `${SPECS[SPEC].name} ${CLS.name}`,
      cls: (state.sheet && state.sheet.classId) || 'warrior', // raid frame and meter colour
      tank: !!SPECS[SPEC].tank, // with a tank in the group the targets hit back (Settings → Fight, Auto)
    }),
    hostSettings: () => ({
      fight: Object.fromEntries(HOST_FIGHT_KEYS.map((k) => [k, state.settings[k]])),
      raid: Object.fromEntries(HOST_RAID_KEYS.map((k) => [k, state.loadout[k]])),
    }),
    applySettings: applyHostSettings,
    pull: () => { $('#raid-setup-modal').classList.add('hidden'); countdown(); },
    readyCheck: () => openReadyRoom(),
    onReady: () => drawReadyRoom(),
    pause: (on) => setPaused(on),
    end: () => { if (state.fight && state.fight.started && !state.fight.over) state.fight.stop(); },
    reset: () => { newFight(); raidWarning(`The ${leader()} reset the fight`); },
    onChange: () => {
      // Before the pull: a paladin joining or leaving changes Salvation on your sheet (a new sheet and fight); anyone
      // joining or leaving changes how many NPC raiders fill the raid (a new fight).
      if (!(state.fight && state.fight.started && !state.fight.over)) {
        const o = fightOpts(state.settings, 1);
        const npcs = npcRaiders(state.settings, o.botTank).map((r) => r.spec).join();
        const healersChanged = o.raidHealers !== !!(state.fight && state.fight.o.raidHealers);
        if (salvationForced() !== !!state.salvationForced) rebuild({ keepMsg: true });
        else if (healersChanged || npcs !== (state.raidBots || []).map((b) => b.spec).join()) newFight();
      }
      drawGroupPanel(); refreshTankOpts(); if (state.fight) drawMeter(); drawReadyRoom();
    },
    say: raidWarning,
    // Another player's name tag: a click makes them your friendly target, hovering is mouseover casting.
    pick: {
      click: (id) => { state.friendlyTarget = state.friendlyTarget === id ? null : id; },
      hover: (id) => { state.mouseoverUnit = id; },
    },
    picked: () => state.friendlyTarget,
    npcThreat: (i) => (state.tankBot ? state.tankBot.threatOn(i) : 0), // the NPC tank holds the targets too
    myRaidCds,
    raidCdAsked,
    raidCdGiven,
    healed,
    shielded,
  };
}

// A healer in your group healed you: it lands on your fight and rises off you in green.
function healed(fromName, amount, crit) {
  const f = state.fight;
  if (!f || f.dead || f.over || !(amount > 0)) return;
  const before = f.health;
  f.heal(amount);
  const done = f.health - before;
  if (done > 0) playerText(`+${fmtNum(done)}`, crit ? 'heal crit' : 'heal');
  if (state.fightLog) state.fightLog.push({ type: 'healed', from: fromName, amount: Math.round(done), t: f.t });
}
function shielded(fromName, amount, duration) {
  const f = state.fight;
  if (!f || f.dead || f.over) return;
  f.addAbsorb(amount, duration);
  playerText(`Shield ${fmtNum(amount)}`, 'heal');
}

// Text rising off you (a heal another player gave you).
function playerText(text, cls) {
  const anchor = $('#player-fct');
  if (!anchor) return;
  const span = document.createElement('span');
  span.className = `fct ${cls}`;
  span.textContent = text;
  span.style.left = `${Math.round(Math.random() * 40 - 20)}px`;
  anchor.appendChild(span);
  setTimeout(() => span.remove(), 1500);
}

// A healer heals the real raid when there is one: the group's players and the NPC tank and raiders, at their own
// health (each taking the boss's real damage); alone with no NPCs, the simulated raid. It changes between fights only.
function syncHealerRaid(f) {
  if (!f.raid || f.started) return;
  const inGroup = !!(state.group && state.group.active);
  const npcs = !!(state.tankBot || (state.raidBots && state.raidBots.length));
  const real = inGroup || npcs;
  if (real && (!f.raid.real || f.raid.inGroup !== inGroup)) {
    f.raid = Object.assign(new GroupRaid(f, realRaidLink()), { real: true, inGroup });
  } else if (!real && f.raid.real) {
    f.raid = new SimRaid(f, { cls: CLASS_ID });
    f.raid.me.name = state.settings.playerName || 'You';
  }
}

// The real raid for a healer (engine/raid.js GroupRaid): the group's players (group-play.js raidLink) or you alone,
// then the NPC tank and raiders, whose health is their own and whom your heals and shields reach directly.
function realRaidLink() {
  const g = state.group && state.group.active ? state.group : null;
  const players = g ? g.raidLink() : null;
  const npcs = () => [state.tankBot, ...(state.raidBots || [])].filter(Boolean);
  const npc = (id) => npcs().find((b) => b.id === id);
  return {
    members: () => {
      const f = state.fight;
      const holder = f && f.started && !f.over ? threatHolder(f, f.primary) : null;
      const people = players ? players.members()
        : [{ id: 'me', name: state.settings.playerName || 'You', cls: CLASS_ID, tank: !!SPECS[SPEC].tank, me: true, aggro: holder === 'me' }];
      return [...people, ...npcs().map((b) => ({ id: b.id, name: b.name, cls: b.classId, tank: !!b.tank, aggro: b.id === holder }))];
    },
    stat: (id) => { const b = npc(id); return b ? unitOf(b.f) : players ? players.stat(id) : {}; },
    heal: (to, amount, crit) => { const b = npc(to); if (b) b.f.heal(amount); else if (players) players.heal(to, amount, crit); },
    shield: (to, amount, duration) => { const b = npc(to); if (b) b.f.addAbsorb(amount, duration); else if (players) players.shield(to, amount, duration); },
  };
}

// ---- a shaman's totem set (Call of the Elements) ----------------------------------------------------------

// The totems Call of the Elements drops, one per element, saved per spec ("totemSet") and set from the totem bar above
// your frame at any time, in combat too: click an element, pick its totem.
const TOTEM_ELEMENTS = [['earth', 'Earth', '#8a6a3a'], ['fire', 'Fire', '#c4562a'], ['water', 'Water', '#2f8fb5'], ['air', 'Air', '#8fa8c8']];
function totemSet() {
  const saved = (state.settings.totemSet || {})[SPEC_KEY] || {};
  const def = SPECS[SPEC].loadout.variant === 'enhancement' ? { fire: 'magmaTotem' } : {};
  return { earth: 'strengthOfEarthTotem', fire: 'searingTotem', water: 'manaSpringTotem', air: 'windfuryTotem', ...def, ...saved };
}
function setTotem(slot, id) {
  state.settings.totemSet = { ...(state.settings.totemSet || {}), [SPEC_KEY]: { ...totemSet(), [slot]: id } };
  store.set('settings', state.settings);
  if (state.fight && state.fight.totemSet) state.fight.totemSet = totemSet();
  buildTotemSet();
}
function buildTotemSet() {
  const bar = $('#hf-totemset');
  if (!bar) return;
  bar.innerHTML = '';
  bar.classList.toggle('hidden', CLASS_ID !== 'shaman');
  if (CLASS_ID !== 'shaman') return;
  const set = totemSet();
  for (const [slot, label, color] of TOTEM_ELEMENTS) {
    const id = set[slot];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ts-slot';
    btn.style.borderColor = color;
    btn.title = `${label} totem for Call of the Elements: ${id ? ABILITIES[id].name : 'none'} (click to change)`;
    btn.innerHTML = id ? `<img src="${iconUrl(ABILITIES[id].icon)}" alt="">` : `<i>${label[0]}</i>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = bar.querySelector('.ts-menu');
      if (open) { const same = open.dataset.slot === slot; open.remove(); if (same) return; }
      const menu = document.createElement('div');
      menu.className = 'ts-menu';
      menu.dataset.slot = slot;
      const totems = Object.keys(ABILITIES).filter((k) => ABILITIES[k].totem === slot);
      for (const t of [...totems, null]) {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.innerHTML = t ? `<img src="${iconUrl(ABILITIES[t].icon)}" alt="">${esc(ABILITIES[t].name)}` : 'None';
        opt.addEventListener('click', (ev) => { ev.stopPropagation(); setTotem(slot, t); });
        menu.appendChild(opt);
      }
      btn.appendChild(menu);
    });
    bar.appendChild(btn);
  }
}
document.addEventListener('click', () => { const m = document.querySelector('#hf-totemset .ts-menu'); if (m) m.remove(); });

// ---- the NPC tank (tank-bot.js) -------------------------------------------------------------------

// The NPC tank drawn as its class, race and gear in the stand-in's place, with its name over it.
function dressTankBot() {
  const a = state.arena;
  const tb = state.tankBot;
  let tag = $('#tank-tag');
  if (!tb || !a.tank) { if (tag) tag.remove(); return; }
  const old = a.tank;
  const model = makeCharacter({ race: tb.sheet.race, role: 'player', gear: handsLook(gearLook(tb.gear), tb.classId), classId: tb.classId });
  model.position.copy(old.position);
  model.rotation.copy(old.rotation);
  a.scene.remove(old);
  a.extras = a.extras.map((o) => (o === old ? model : o));
  a.scene.add(model);
  a.tank = model;
  disposeCharacter(old);
  if (!tag) {
    tag = document.createElement('div');
    tag.id = 'tank-tag';
    tag.className = 'player-tag npc-tag';
    $('#arena').appendChild(tag);
  }
  tag.textContent = `${tb.name} · ${tb.label}`;
  tb.drawnSwings = 0;
}

// Each frame: the tank plays up to your clock, its threat holds the boss against yours, its damage comes off a shared
// health pool, and its model swings with its hits.
function updateTankBot(f) {
  const tb = state.tankBot;
  const tag = $('#tank-tag');
  if (!tb) return;
  if (f.started) {
    tb.advanceTo(f.t);
    const g = state.group && state.group.active ? state.group : null;
    f.targets.forEach((t, i) => f.setOthersThreat(i, Math.max(tb.threatOn(i), g ? g.topOtherThreat(i).threat : 0)));
    woundFrom(tb, f);
    shareDebuffs(tb, f);
  }
  const a = state.arena;
  if (a.tank && tb.swung > (tb.drawnSwings || 0)) { tb.drawnSwings = tb.swung; if (a.tank.userData.anim) a.tank.userData.anim.mh = 1; }
  if (a.tank && a.tank.userData.anim) a.tank.userData.anim.dead = tb.dead;
  if (tag && a.tank) {
    const p = a.toScreen(a.tank.position.clone().setY((a.tank.userData.height || 2) + 0.4));
    tag.style.display = p ? '' : 'none';
    if (p) { tag.style.left = `${p.x}px`; tag.style.top = `${p.y}px`; }
    tag.classList.toggle('dead', tb.dead);
  }
}

// An NPC's debuffs on the boss count for everyone: the Sunder Armor stacks it builds (the boss's armor drops with each
// one, as with your own), its Thunder Clap and Demoralizing Shout. They go on your fight's targets and on the sim's.
function shareDebuffs(bot, f) {
  const its = bot.f.enc.targets;
  for (const enc of [f.enc, state.ghost && state.ghost.f.enc].filter(Boolean)) {
    enc.targets.forEach((o, i) => {
      const t = its[i];
      if (!t) return;
      if (t.sunderEnd > f.t && (o.sunderEnd <= f.t || t.sunder > o.sunder || t.sunderEnd > o.sunderEnd)) {
        o.sunder = o.sunderEnd > f.t ? Math.max(o.sunder, t.sunder) : t.sunder;
        o.sunderEnd = Math.max(o.sunderEnd, t.sunderEnd);
      }
      if (t.tcEnd > o.tcEnd) { o.tcEnd = t.tcEnd; o.slow = t.slow; }
      if (t.demoEnd > o.demoEnd) { o.demoEnd = t.demoEnd; o.apReduction = t.apReduction; }
    });
  }
}

// An NPC's damage comes off a shared health pool (a fight to the death) as it lands.
function woundFrom(bot, f) {
  if (f.endMode !== 'health' || f.over) return;
  bot.woundedFor = bot.woundedFor || [];
  bot.dealt.forEach((d, i) => {
    const delta = (d || 0) - (bot.woundedFor[i] || 0);
    if (delta > 0 && f.targets[i]) { f.woundTarget(i, delta); bot.woundedFor[i] = d; }
  });
}

// ---- the NPC raiders (raid-bots.js) ------------------------------------------------------------------

// The NPC raiders drawn as their class, race and gear: the melee around the boss's back and flanks, the rest in two
// arcs further back, all facing it. Their models are kept for the next fight while the raid stays the same.
function dressRaidBots() {
  const a = state.arena;
  const cache = state.botModels || (state.botModels = new Map());
  const bots = state.raidBots || [];
  const keep = new Set(bots.map((b) => `${b.spec}|${b.name}|${b.sheet.race}`));
  for (const [key, m] of cache) {
    a.scene.remove(m);
    if (!keep.has(key)) { disposeCharacter(m); cache.delete(key); }
  }
  const boss = a.dummies[0];
  if (!bots.length || !boss) return;
  const r = boss.userData.radius || 1;
  const place = (list, dist) => list.forEach((b, k) => {
    const row = dist.length > 1 ? k % 2 : 0;
    const per = Math.ceil(list.length / dist.length);
    const slot = dist.length > 1 ? Math.floor(k / 2) : k;
    const spread = Math.min(0.42, 2.6 / Math.max(1, per));
    const ang = Math.PI + (slot - (per - 1) / 2) * spread; // around the boss's back (the NPC tank has its front)
    const x = Math.sin(ang) * dist[row];
    const z = Math.cos(ang) * dist[row];
    const key = `${b.spec}|${b.name}|${b.sheet.race}`;
    let m = cache.get(key);
    if (!m) {
      m = makeCharacter({ race: b.sheet.race, role: 'player', gear: handsLook(gearLook(b.gear), b.classId), classId: b.classId });
      cache.set(key, m);
    }
    m.position.set(x, a.groundY(x, z), z);
    m.rotation.set(0, Math.atan2(-x, -z), 0);
    if (m.userData.anim) m.userData.anim.dead = false;
    a.scene.add(m);
    b.model = m;
    b.home = { x, z };
    b.drawnSwings = 0;
  });
  place(bots.filter((b) => b.melee), [r + 1.4]);
  place(bots.filter((b) => !b.melee), [r + 9, r + 12]);
}

// Each frame: the raiders play up to your clock, their damage comes off a shared health pool, the raid's healers keep
// them up between the boss's blows, and their models swing, fall, and run off feared.
const BOT_HEAL = 0.02; // of their health per second, from the raid's healers
function updateRaidBots(f, dt) {
  const bots = state.raidBots || [];
  const a = state.arena;
  const boss = a.boss && a.dummies[0];
  for (const b of bots) {
    if (b.healer) b.f.started = f.started;
    if (f.started) {
      const was = b.dead;
      b.advanceTo(f.t);
      // Without healers in the raid, its unseen healers keep the NPCs up; with them, they do.
      if (!b.dead && !f.over && !f.o.raidHealers) b.f.heal(b.f.maxHealth * BOT_HEAL * Math.max(0, f.t - (b.healedAt ?? f.t)));
      b.healedAt = f.t;
      if (!was && b.dead) raidWarning(`${b.name} died`);
      woundFrom(b, f);
    }
    const m = b.model;
    if (!m || !m.userData.anim) continue;
    if (b.swung > b.drawnSwings) { b.drawnSwings = b.swung; if (b.melee) m.userData.anim.mh = 1; }
    m.userData.anim.dead = b.dead;
    // Feared: off away from the boss until it breaks, then back to their place; the melee keep to the boss as it walks.
    const feared = !b.dead && b.fearedUntil > b.f.t;
    const c = b.melee && boss ? boss.position : { x: 0, z: 0 };
    const want = feared ? { x: c.x + b.home.x * 3.2, z: c.z + b.home.z * 3.2 } : { x: c.x + b.home.x, z: c.z + b.home.z };
    const dx = want.x - m.position.x;
    const dz = want.z - m.position.z;
    if (!b.dead && Math.hypot(dx, dz) > 0.05) {
      const k = Math.min(1, dt * 2.5);
      m.position.x += dx * k;
      m.position.z += dz * k;
      m.position.y = a.groundY(m.position.x, m.position.z);
      m.rotation.y = feared ? Math.atan2(dx, dz) : Math.atan2(c.x - m.position.x, c.z - m.position.z);
    }
  }
}

// The NPC healers at work (raid-bots.js HealerBot): the tank first, then whoever is lowest, on you, the NPC tank and the
// NPC raiders (in a group each player's own copies of them heal that player). Their heals show on the raid frames.
function npcHeal(f) {
  const healers = (state.raidBots || []).filter((b) => b.healer && !b.dead);
  if (!healers.length || !f.started || f.over || state.paused) return;
  const targets = [
    { id: 'me', hp: f.health, maxHp: f.maxHealth, dead: f.dead, tank: !!SPECS[SPEC].tank || (f.o.tank && f.hasAggro(f.primary)), heal: (amount, crit, from) => healed(from, amount, crit) },
    ...[state.tankBot, ...(state.raidBots || [])].filter(Boolean).map((b) => ({ id: b.id, hp: b.f.health, maxHp: b.f.maxHealth, dead: b.dead, tank: !!b.tank, heal: (amount) => b.f.heal(amount) })),
  ];
  const incoming = {};
  for (const h of healers) if (h.casting) incoming[h.casting.id] = (incoming[h.casting.id] || 0) + h.casting.amount;
  for (const h of healers) {
    const before = h.casting;
    const landed = h.act(f.t, targets, incoming);
    if (landed) incoming[landed.id] = Math.max(0, (incoming[landed.id] || 0) - landed.amount);
    if (h.casting && h.casting !== before) incoming[h.casting.id] = (incoming[h.casting.id] || 0) + h.casting.amount;
    if (landed) state.raidFrames.flash(landed.id, `+${fmtNum(landed.amount)}`, landed.crit ? 'crit' : '');
  }
}

// The boss's mechanics land on the NPCs too, and they get out of them as players do: mostly in time, now and then not
// (each one's skill, rolled every time). Raid-wide damage hits everyone; a cleave the melee who stray in front of the
// boss; a stomp those in its reach too slow to get out (the tank too); a fear everyone in its reach (a warrior's
// Berserker Rage, mostly in time, keeps it off); and fire on the ground lands under one of them now and then, who may
// stand in it a tick or two too long.
function botsReact(m) {
  const bots = [state.tankBot, ...(state.raidBots || [])].filter((b) => b && !b.dead && b.f.started);
  if (!bots.length) return;
  const late = (b) => Math.random() > b.skill;
  // How far each stands from the boss's edge: the tank in front of it, the raiders where they were placed.
  const r = (state.arena.dummies[0] && state.arena.dummies[0].userData.radius) || 1;
  const reach = (b) => (b.home ? Math.hypot(b.home.x, b.home.z) - r : 0.9) <= m.radius;
  const hit = (b, mult = 1) => {
    const took = b.f.takeDamage((m.amount != null ? m.amount : b.f.maxHealth * m.damage) * mult, { school: m.school || 'physical', name: m.name });
    if (took > 0) state.raidFrames.flash(b.id, `-${fmtNum(took)}`, '');
  };
  if (m.kind === 'nova' || m.kind === 'berserk') { for (const b of bots) hit(b); return; }
  if (m.kind === 'cleave') { for (const b of bots) if (b.melee && !b.tank && Math.random() < (1 - b.skill) * 0.4) hit(b); return; }
  if (m.kind === 'stomp') { for (const b of bots) if (reach(b) && late(b)) hit(b); return; }
  if (m.kind === 'fear') {
    for (const b of bots) {
      if (!reach(b) || (b.classId === 'warrior' && !late(b))) continue;
      b.fearedUntil = b.f.t + m.duration;
    }
    return;
  }
  if (m.kind === 'patch') {
    const raiders = bots.filter((b) => !b.tank);
    if (!raiders.length || Math.random() < 0.5) return;
    const b = raiders[Math.floor(Math.random() * raiders.length)];
    if (late(b)) hit(b, 1 + Math.floor(Math.random() * 2));
  }
}

// The raid frames: a healer's raid, else the players (the group, or you once NPCs fight beside you) and the NPCs; in
// edit mode, with nobody else, you and a few examples to place and size them by.
function raidFrameRows(f) {
  if (f.raid) return healerRows(f);
  const rows = partyRows(f);
  if (rows.length || !state.editMode) return rows;
  const me = { id: 'me', name: state.settings.playerName || 'You', cls: CLASS_ID, me: true, ...unitOf(f) };
  return [me, ...[['priest', 'mana'], ['rogue', 'energy'], ['mage', 'mana'], ['warrior', 'rage']].map(([cls, powerType], i) => (
    { id: `ex:${i}`, name: CLASS_NAMES[cls], cls, hp: 3000 + i * 400, maxHp: 4200, power: 60, maxPower: 100, powerType }))];
}
function partyRows(f) {
  const g = state.group && state.group.active ? state.group : null;
  const bots = [state.tankBot, ...(state.raidBots || [])].filter(Boolean);
  const players = g ? g.raidRows(f) : bots.length ? [{ id: 'me', name: state.settings.playerName || 'You', cls: CLASS_ID, me: true, aggro: f.o.tank && f.started && !f.over && f.hasAggro(f.primary), ...unitOf(f) }] : [];
  const holder = f.started && !f.over ? threatHolder(f, f.primary) : null;
  return [...players, ...bots.map((b) => ({
    id: b.id, name: b.name, cls: b.classId, role: b.tank ? 'tank' : null, aggro: b.id === holder,
    selected: state.friendlyTarget === b.id, hover: state.mouseoverUnit === b.id, ...unitOf(b.f),
  }))];
}

// The NPC tank and raiders listed with the group (the ready room, the Group panel). tick: the ready room's column.
function npcMemberRows(tick = '') {
  return [state.tankBot, ...(state.raidBots || [])].filter(Boolean).map((b) => `<li class="npc${tick ? ` ${tick}` : ''}"><b style="color:${classColor(b.classId)}">${esc(b.name)}</b><small>${esc(b.label)} · NPC ${b.tank ? 'tank' : b.healer ? 'healer' : 'raider'}</small>${tick ? '<span class="rs-tick">NPC</span>' : ''}</li>`).join('');
}

// Every "Fill the raid with NPCs" choice shows the setting; only the party or raid leader changes it.
function syncNpcRaid() {
  for (const el of document.querySelectorAll('[data-npc-raid]')) {
    el.value = String(state.settings.npcRaid || 0);
    if (el.id !== 'opt-npc-raid') { el.disabled = leaderOnly(); el.title = leaderOnly() ? `The ${leader()} sets this` : ''; }
  }
}

// Who has target i's aggro: you ('me'), another player (their id), the NPC tank ('bot:tank'), or null.
function threatHolder(f, i) {
  if (f.hasAggro(i)) return 'me';
  const g = state.group && state.group.active ? state.group : null;
  const tb = state.tankBot && !state.tankBot.dead ? state.tankBot : null;
  const top = g ? g.topOtherThreat(i) : { id: null, threat: 0 };
  if (tb && !(top.id && top.threat > tb.threatOn(i) * 1.1)) return tb.id;
  return g ? g.aggroOn(f, i) : null;
}

// The threat window beside an NPC tank: the threat on your target of everyone who can take it (you, the group, the
// NPC tank; the NPC raiders hold back), as a share of whoever has aggro; past 100% you are closing in on pulling it
// (110%).
function npcThreatRows(f, i) {
  const g = state.group && state.group.active ? state.group : null;
  const holder = threatHolder(f, i);
  const players = g ? g.threatRows(f, i).map((r) => ({ ...r, id: r.me ? 'me' : r.id }))
    : [{ id: 'me', name: state.settings.playerName || 'You', me: true, threat: f.threat[i] || 0, cls: CLASS_ID }];
  const tb = state.tankBot;
  const bots = tb ? [{ id: tb.id, name: tb.name, cls: tb.classId, threat: tb.threatOn(i) }] : [];
  const rows = [...players, ...bots].map((r) => ({ ...r, aggro: r.id === holder }));
  const ref = (rows.find((r) => r.aggro) || rows.reduce((a, b) => (b.threat > a.threat ? b : a), rows[0] || { threat: 0 })).threat || 1;
  return rows.map((r) => ({ ...r, pct: r.threat / ref })).sort((a, b) => b.threat - a.threat);
}

// ---- edit mode -------------------------------------------------------------------------------------

// Edit mode (the side menu, Settings → HUD frames): every HUD frame, the raid pack's alerts and the raid frames move
// and size; the edit bar sizes the whole UI and the frame picked.
function setEditMode(on) {
  state.editMode = on;
  state.hudFrames.setUnlocked(on);
  state.raidPack.setUnlocked(on);
  state.raidFrames.setEditing(on);
  document.body.classList.toggle('edit-mode', on);
  $('#edit-bar').classList.toggle('hidden', !on);
  for (const [sel, off] of [['#hf-unlock', 'Edit mode'], ['#rp-unlock', 'Move alerts']]) {
    $(sel).textContent = on ? 'Done editing' : off;
    $(sel).classList.toggle('primary', on);
  }
  const side = document.querySelector('.side-menu [data-open=edit]');
  if (side) side.classList.toggle('active', on);
  state.editSel = null;
  drawEditBar();
}

// The edit bar: the UI's size, and the picked frame's (a HUD frame, or the raid frames).
function drawEditBar() {
  const s = state.settings;
  const sel = state.editSel;
  $('#ui-scale').value = s.uiScale || 1;
  $('#ui-scale-v').textContent = (s.uiScale || 1).toFixed(2);
  const v = !sel ? 1 : sel.kind === 'raidFrames' ? s.raidFrames.scale : state.hudFrames.scaleOf(sel.id);
  $('#edit-sel').textContent = sel ? sel.label : 'Click a frame to size it';
  $('#el-scale').disabled = !sel;
  $('#el-scale').value = v;
  $('#el-scale-v').textContent = sel ? v.toFixed(2) : '';
}

// The whole UI's size: every HUD frame, the raid frames and the raid pack's alerts.
function applyUiScale() {
  const v = state.settings.uiScale || 1;
  document.documentElement.style.setProperty('--ui-scale', v);
  state.hudFrames.applyScales();
  state.raidFrames.uiScale = v;
  state.raidFrames.place();
}

function bindEditMode() {
  state.hudFrames.onSelect = (id, label) => { state.editSel = id ? { kind: 'hud', id, label } : null; drawEditBar(); };
  state.hudFrames.onScale = () => drawEditBar();
  state.raidFrames.onEditSelect = () => { state.hudFrames.select(null); state.editSel = { kind: 'raidFrames', label: 'Raid frames' }; drawEditBar(); };
  $('#raid-frames').addEventListener('wheel', () => { if (state.editMode) { state.editSel = { kind: 'raidFrames', label: 'Raid frames' }; drawEditBar(); } });
  $('#ui-scale').addEventListener('input', (e) => {
    state.settings.uiScale = Math.round(Number(e.target.value) * 100) / 100;
    store.set('settings', state.settings);
    applyUiScale();
    drawEditBar();
  });
  $('#el-scale').addEventListener('input', (e) => {
    const sel = state.editSel;
    const v = Number(e.target.value);
    if (!sel) return;
    if (sel.kind === 'raidFrames') { state.raidFrames.setScale(v); $('#rf-scale').value = state.settings.raidFrames.scale; }
    else state.hudFrames.setScale(sel.id, v);
    drawEditBar();
  });
  $('#edit-reset-size').addEventListener('click', () => {
    state.settings.uiScale = 1;
    state.hudFrames.resetScales();
    state.raidFrames.setScale(RAID_FRAME_DEFAULTS.scale);
    applyUiScale();
    drawEditBar();
  });
  $('#edit-reset-pos').addEventListener('click', () => {
    state.hudFrames.reset();
    state.raidPack.resetPositions();
    state.raidFrames.resetPosition();
  });
  $('#edit-done').addEventListener('click', () => setEditMode(false));
  applyUiScale();
}

// ---- raid cooldowns (group play) --------------------------------------------------------------

// Raid members of the trainer's own: their cooldowns come when you ask. Alone you have all of them; in a group only those
// of the classes nobody in it plays (a priest in the group gives Power Infusion themselves).
const NPC_HELPERS = [
  { id: 'npc:priest', name: 'Eldrin', cls: 'priest', cds: ['powerInfusion', 'painSuppression'] },
  { id: 'npc:druid', name: 'Lunara', cls: 'druid', cds: ['innervate', 'rebirth'] },
  { id: 'npc:shaman', name: "Zul'jin", cls: 'shaman', cds: ['manaTideTotem'] },
  { id: 'npc:paladin', name: 'Aldric', cls: 'paladin', cds: ['blessingOfProtection', 'layOnHands'] },
  { id: 'npc:warlock', name: 'Morkath', cls: 'warlock', cds: ['soulstone'] },
];
const RES_WAIT = 60; // seconds a dead player can wait for a soulstone or a Rebirth before the fight ends for them

// Everyone's raid cooldowns as the tracker lists them: the group's (or yours alone), then the trainer's own raid's.
function allRaidCdRows(f) {
  if (!f) return [];
  const own = () => myRaidCds(f).map(([cd, left]) => ({ owner: 'me', name: (state.settings.playerName || 'You'), cls: CLASS_ID, me: true, cd, left }));
  return [...(state.group && state.group.active ? state.group.raidCdRows(f) : own()), ...npcRaidCdRows(f)];
}
// Who could bring you back with Rebirth now (a ready druid, not you).
const rebirthSources = (f) => allRaidCdRows(f).filter((r) => r.cd === 'rebirth' && r.left <= 0 && !r.me);

// Dead: what can bring you back, as buttons (the suggestion a dead player gets in a group, and alone).
function showResPopup() {
  const f = state.fight;
  const box = $('#rcd-asks');
  box.querySelectorAll('.res').forEach((el) => el.remove());
  const el = document.createElement('div');
  el.className = 'rcd-ask res';
  const stone = f.aura('soulstone');
  const druids = rebirthSources(f);
  el.innerHTML = `<img src="${iconUrl('spell_holy_resurrection')}" alt=""><div><b>You died.</b>${stone || druids.length ? ' Come back:' : ' Nobody can bring you back.'}</div>`;
  const add = (label, fn, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', fn);
    el.appendChild(b);
  };
  if (stone) add('Use Soulstone', () => { state.soulstone = false; f.dropAura('soulstone'); const s = RAID_COOLDOWNS.soulstone.soulstone; f.revive(s.health, s.mana, 'Soulstone'); }, 'primary');
  for (const d of druids) {
    add(`Ask ${d.name} for Rebirth`, () => {
      if (d.owner.startsWith('npc:')) askNpc(d.owner, 'rebirth');
      else { state.group.askRaidCd(d.owner, 'rebirth'); raidWarning(`Asked ${d.name} for Rebirth`); }
    }, stone ? '' : 'primary');
  }
  add('Release', () => { el.remove(); f.stop(); }, 'ghost');
  box.appendChild(el);
}
function npcRaidCdRows(f) {
  const g = state.group && state.group.active ? state.group : null;
  const played = new Set(g ? g.members.map((m) => (m.info && m.info.cls) || 'warrior') : []);
  const npcCds = f.npcCds || {};
  return NPC_HELPERS.filter((n) => !played.has(n.cls)).flatMap((n) => n.cds.map((cd) => ({
    owner: n.id, name: n.name, cls: n.cls, me: false, npc: true, cd, left: Math.max(0, Math.round(((npcCds[`${n.id}:${cd}`] || 0) - f.t) * 10) / 10),
  })));
}
// You ask one of them: it comes a moment later, and goes on their cooldown.
function askNpc(owner, cd) {
  const f = state.fight;
  const n = NPC_HELPERS.find((x) => x.id === owner);
  const rc = RAID_COOLDOWNS[cd];
  if (!f || !n || !rc || f.over || (f.dead && !rc.res)) return; // the dead can only ask for Rebirth
  const key = `${owner}:${cd}`;
  f.npcCds = f.npcCds || {};
  if ((f.npcCds[key] || 0) > f.t) { showError(`${rc.name} is not ready yet`); return; }
  f.npcCds[key] = f.t + rc.cd;
  raidWarning(`Asked ${n.name} for ${rc.name}`);
  setTimeout(() => { if (state.fight === f) raidCdGiven(n.name, cd); }, 700);
}

// Your raid cooldowns for the tracker: [id, seconds left], your class's (and your talent's).
function myRaidCds(f) {
  if (!f) return [];
  return Object.entries(RAID_COOLDOWNS)
    .filter(([, r]) => r.cls === CLASS_ID && (!r.talent || (f.tal && f.tal[r.talent])))
    .map(([id]) => [id, Math.max(0, Math.round(((f.cds[id] || 0) - f.t) * 10) / 10)]);
}

// The tracker in the top left: an icon, a bar filling as the cooldown comes back and the player's name in their class
// colour. Another player's ready external can be clicked to ask them for it.
function drawRaidCds(f) {
  const box = $('#raid-cds');
  // Never over the main menu (the stylesheet hides it too).
  box.style.visibility = $('#main-menu').classList.contains('hidden') ? '' : 'hidden';
  const rows = allRaidCdRows(f);
  box.classList.toggle('empty', !rows.length);
  const key = rows.map((r) => `${r.owner}:${r.name}:${r.cd}`).join('|');
  if (box.dataset.key !== key) {
    box.dataset.key = key;
    box.innerHTML = rows.map((r) => {
      const rc = RAID_COOLDOWNS[r.cd];
      return `<div class="rcd${r.me ? ' me' : ''}" data-owner="${esc(r.owner)}" data-name="${esc(r.name)}" data-cd="${r.cd}">
        <img src="${iconUrl(rc.icon)}" alt=""><div class="rcd-bar"><i></i><span class="rcd-name" style="color:${classColor(r.cls)}">${esc(r.name)}</span><span class="rcd-t"></span></div></div>`;
    }).join('');
  }
  rows.forEach((r, i) => {
    const el = box.children[i];
    const rc = RAID_COOLDOWNS[r.cd];
    const ready = r.left <= 0;
    // Rebirth is for the dead; everything else for the living. A soulstone is placed before the pull (it stays on you
    // from fight to fight until it is used).
    const ask = ready && !r.me && (rc.external || r.npc) && (rc.res ? !!f.dead : !f.dead) && !(rc.soulstone && (f.started || state.soulstone));
    el.classList.toggle('ready', ready);
    el.classList.toggle('ask', ask);
    el.title = `${rc.name} (${r.name}): ${rc.text}${ask ? ' Click to ask for it.' : ''}`;
    el.querySelector('i').style.width = `${(ready ? 1 : 1 - r.left / rc.cd) * 100}%`;
    el.querySelector('.rcd-t').textContent = ready ? 'Ready' : secs(r.left);
  });
}

// Loss of control (a fear): a big icon with the seconds left, and the screen's edges in its colour.
function drawLossOfControl() {
  const a = state.arena;
  const left = a.fearUntil ? a.fearUntil - a.time : 0;
  const el = $('#cc-alert');
  const on = left > 0;
  el.classList.toggle('hidden', !on);
  $('#arena').classList.toggle('cc-feared', on);
  if (on) el.querySelector('span').textContent = left.toFixed(1);
}

// Someone asks you for a cooldown: a pop-up to give it or not (it goes after 15 sec).
function raidCdAsked(from, name, cd) {
  const rc = RAID_COOLDOWNS[cd];
  if (!rc) return;
  const el = document.createElement('div');
  el.className = 'rcd-ask';
  el.innerHTML = `<img src="${iconUrl(rc.icon)}" alt=""><div><b>${esc(name)}</b> asks for <b>${esc(rc.name)}</b></div>
    <button type="button" class="primary">Give</button><button type="button">No</button>`;
  const [give, no] = el.querySelectorAll('button');
  give.addEventListener('click', () => { el.remove(); giveRaidCd(from, name, cd); });
  no.addEventListener('click', () => { el.remove(); state.group.declineRaidCd(from, cd); });
  $('#rcd-asks').appendChild(el);
  state.sound.play('proc');
  setTimeout(() => el.remove(), 15000);
}

// You give a cooldown: its mana (if your class casts it) and its cooldown are yours; Mana Tide is dropped as a totem.
function giveRaidCd(to, name, cd) {
  const f = state.fight;
  const rc = RAID_COOLDOWNS[cd];
  const no = (reason) => { showError(reason); state.group.declineRaidCd(to, cd); };
  if (!f || f.dead || f.over) { no('You cannot do that now'); return; }
  if ((f.cds[cd] || 0) - f.t > 0) { no(`${rc.name} is not ready yet`); return; }
  if (rc.party) {
    const r = f.press(cd); // the group gets it from your cast (group-play.js onLocalEvent)
    if (!r.ok) no(r.reason || `${rc.name} failed`);
    return;
  }
  const cost = ABILITIES[cd] && f.cost ? f.cost(cd) : 0;
  if (cost > 0 && f.maxMana) {
    if (f.mana < cost) { no('Not enough mana'); return; }
    f.spendMana(cost, cd);
  }
  f.cds[cd] = f.t + rc.cd;
  state.group.giveRaidCd(to, cd);
  raidWarning(`${rc.name} on ${name}`);
}

// Another player's cooldown lands on you: an aura with its effect (engine/unit.js externalMult), a full heal, or mana.
function raidCdGiven(fromName, cd) {
  const f = state.fight;
  const rc = RAID_COOLDOWNS[cd];
  if (!f || !rc || f.over) return;
  // Rebirth: back on your feet with its health and mana.
  if (rc.res) { if (f.dead) f.revive(rc.res.health, rc.res.mana, fromName); return; }
  if (f.dead) return;
  // A soulstone: kept until you die (then it can bring you back).
  if (rc.soulstone) { state.soulstone = true; f.setAura('soulstone', rc.duration, 0, { name: rc.name, icon: rc.icon }); raidWarning(`${fromName}: ${rc.name} on you`); return; }
  if (rc.fullHeal) f.heal(f.maxHealth);
  if (rc.pulse && f.maxMana) {
    for (let k = 1; k * rc.pulse.period <= rc.duration; k++) f.schedule(f.t + k * rc.pulse.period, () => f.addMana(rc.pulse.mana, rc.name));
  }
  if (rc.ext) {
    f.hasExternals = true;
    f.setAura(`ext:${cd}`, rc.duration, 0, { name: rc.name, icon: rc.icon, ext: rc.ext });
  }
  raidWarning(`${fromName}: ${rc.name} on you`);
  state.sound.play('proc');
}

// ---- the raid setup before a group pull -----------------------------------------------------------

// The host's last raid setup, per encounter and the last one of all: it comes back the next time.
const GROUP_RAID_KEY = 'groupRaidSetup.v1';
function saveGroupRaidSetup() {
  const raid = Object.fromEntries(HOST_RAID_KEYS.map((k) => [k, structuredClone(state.loadout[k] || {})]));
  raid.healing = state.settings.healing; // the external healing the host set
  raid.bossHpPct = state.settings.bossHpPct || 100;
  const saved = store.get(GROUP_RAID_KEY, {});
  store.set(GROUP_RAID_KEY, { ...saved, last: raid, [state.settings.encounter]: raid });
}

// The ready room (group play): opens for everyone on joining and at the host's Start. The host's last setup for the
// encounter comes back with it.
function openReadyRoom() {
  const g = state.group;
  if (!g || !g.active) return;
  if (g.isHost) {
    const saved = store.get(GROUP_RAID_KEY, {});
    const raid = saved[state.settings.encounter] || saved.last;
    if (raid) {
      for (const k of HOST_RAID_KEYS) if (raid[k]) state.loadout[k] = structuredClone(raid[k]);
      if (raid.healing != null) state.settings.healing = raid.healing;
      if (raid.bossHpPct != null) state.settings.bossHpPct = raid.bossHpPct;
      rebuild({ keepMsg: true });
      buildRaidSetup();
      g.shareSettings();
    }
  }
  $('#raid-setup-modal').classList.remove('hidden');
  drawReadyRoom();
}
const openRaidSetupPrompt = () => { const g = state.group; if (g && g.isHost) g.readyCheck(); openReadyRoom(); };

// Who brings each raid buff and debuff: [class, base specs it takes, if only some] (the ready room's suggestions).
const BRINGS = {
  battleShout: [['warrior']], furiousHowl: [['hunter']], strengthOfEarthTotem: [['shaman']], graceOfAirTotem: [['shaman']],
  windfuryTotem: [['shaman']], leaderOfThePack: [['druid', 'feralCat', 'feralBear']], giftOfTheWild: [['druid']],
  prayerOfFortitude: [['priest']], arcaneBrilliance: [['mage']], prayerOfSpirit: [['priest']], moonkinAura: [['druid', 'balance']],
  manaSpringTotem: [['shaman']], darkInspiration: [['priest']], greaterBlessingOfKings: [['paladin']], greaterBlessingOfMight: [['paladin']],
  greaterBlessingOfWisdom: [['paladin']], faerieFire: [['druid']], curseOfRecklessness: [['warlock']], dustCloud: [['hunter']],
  judgementOfWisdom: [['paladin']], curseOfElements: [['warlock']], judgementOfTheCrusader: [['paladin']], sunderArmor: [['warrior']],
  exposeArmor: [['rogue']],
};
const CLASS_NAMES = { warrior: 'Warrior', paladin: 'Paladin', hunter: 'Hunter', rogue: 'Rogue', priest: 'Priest', shaman: 'Shaman', mage: 'Mage', warlock: 'Warlock', druid: 'Druid' };
const buffSource = (key) => (BUFF_GROUPS.find((gr) => gr.buffs[key]) || {}).source || 'debuffs';
const buffName = (key) => ((BUFF_GROUPS.find((gr) => gr.buffs[key]) || { buffs: {} }).buffs[key] || {}).name || (key === 'sunderArmor' ? 'Sunder Armor' : key === 'exposeArmor' ? 'Expose Armor' : key);

// What the raid lacks: the buffs and debuffs nobody in it (the players, the NPC tank and raiders) brings, by the class
// that would, and the roles nobody fills. What it brings goes up by itself at the pull (autoBuff).
const SPEC_WORDS = { feralCat: 'Feral', balance: 'Balance' };
function raidSuggestions() {
  const g = state.group;
  const members = g ? g.members.map((m) => ({ name: m.name, ...(m.info || {}) })) : [];
  const have = compBuffs();
  const missing = new Map(); // who would bring them → their names
  for (const [key, who] of Object.entries(BRINGS)) {
    if (have.has(key) || (key === 'exposeArmor' && have.has('sunderArmor')) || (key === 'sunderArmor' && have.has('exposeArmor'))) continue;
    const by = who.map(([cls, ...specs]) => `${specs.length ? `${SPEC_WORDS[specs[0]]} ` : ''}${CLASS_NAMES[cls]}`).join(' or ');
    missing.set(by, [...(missing.get(by) || []), buffName(key)]);
  }
  const out = [...missing].map(([by, names]) => ({ kind: 'lack', text: `No ${by}: ${names.join(', ')}.` }));
  const enc = ENCOUNTERS[state.settings.encounter] || ENCOUNTERS.dummies;
  if (out.length && (state.settings.npcRaid || 0) < 20) out.push({ kind: 'hint', text: 'NPC raiders (the encounter, right) bring their classes\' buffs at a boss.' });
  if (enc.boss && !members.some((m) => m.tank)) out.unshift({ kind: 'role', text: `No tank in the group: the NPC tank (${(TANK_SPECS[state.settings.npcTank] || 'a stand-in')}) holds the boss.` });
  if (!members.some((m) => m.healer)) {
    const npcHealers = (state.raidBots || []).filter((b) => b.healer);
    out.unshift({ kind: 'role', text: npcHealers.length
      ? `No healer in the group: the NPC healers (${npcHealers.map((b) => b.name).join(', ')}) heal the raid, the tank first.`
      : `No healer in the group: ${state.settings.healing} external healing per second keeps whoever the boss hits up. Fill the raid with NPCs for NPC healers.` });
  }
  return out;
}

// The ready room's contents: the group and who is ready, the suggestions, the encounter and the raid setup (the host
// changes them; the others see them), and the Ready and Pull buttons.
function drawReadyRoom() {
  const modal = $('#raid-setup-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  const g = state.group;
  const inGroup = !!(g && g.active);
  const host = !inGroup || g.isHost;
  const s = state.settings;
  const enc = ENCOUNTERS[s.encounter] || ENCOUNTERS.dummies;
  modal.classList.toggle('guest', !host);
  $('#rs-enc').textContent = enc.name || 'Training dummies';
  // The room key, for whoever still has to join.
  $('#rs-key').classList.toggle('hidden', !(inGroup && g.key));
  $('#rs-key b').textContent = (inGroup && g.key) || '';
  $('#rs-host-note').textContent = host ? '(you set it for the group)' : `(the ${leader()} sets it)`;
  const members = inGroup ? g.members : [];
  $('#rs-group').innerHTML = members.map((m) => {
    const info = m.info || {};
    const ready = g.isReady(m.id);
    const role = info.tank ? 'Tank' : info.healer ? 'Healer' : 'DPS';
    return `<li class="${ready ? 'ready' : ''}"><b style="color:${classColor(info.cls)}">${esc(m.name)}</b><small>${esc(info.spec || '')} · ${role}${m.host ? ` · ${leader()}` : ''}</small><span class="rs-tick">${ready ? '✓ Ready' : 'Not ready'}</span></li>`;
  }).join('') + npcMemberRows('ready');
  const tips = raidSuggestions();
  $('#rs-suggest').innerHTML = tips.length ? tips.map((t) => `<li class="${t.kind}">${esc(t.text)}</li>`).join('') : '<li class="ok">The raid lacks nothing: everyone buffs during the pull timer.</li>';
  // The encounter's options: the host's to change.
  const encSel = $('#rs-encounter');
  if (!encSel.options.length) fillEncounters(encSel);
  encSel.value = s.encounter;
  $('#rs-hp').value = String(s.bossHpPct || 100);
  $('#rs-hp').closest('label').classList.toggle('hidden', !enc.health);
  $('#rs-healing').value = s.healing;
  $('#rs-tank').value = s.npcTank || 'prot';
  $('#rs-tank').closest('label').classList.toggle('hidden', !enc.boss);
  syncNpcRaid(); // the NPC raiders' size, the leader's to change
  for (const el of modal.querySelectorAll('#rs-encounter, #rs-hp, #rs-healing, #rs-tank, #rs-raid')) el.disabled = !host;
  // With healers in the raid there is no external healing to set.
  const healed = fightOpts(s, 1).raidHealers;
  if (healed) $('#rs-healing').disabled = true;
  $('#rs-healing').title = healed ? 'Off: the raid has healers (a player, or NPC healers)' : '';
  buildRaidSetup($('#rs-buffs'), { consumables: false });
  // Ready, and the host's Pull once everyone is.
  const meReady = inGroup && g.isReady(g.group.myId);
  $('#rs-ready').classList.toggle('hidden', !inGroup);
  $('#rs-ready').textContent = meReady ? '✓ Ready (click to undo)' : 'Ready';
  $('#rs-ready').classList.toggle('on', meReady);
  const all = inGroup && g.allReady();
  $('#rs-pull').classList.toggle('hidden', !host);
  $('#rs-pull').disabled = inGroup && !all;
  const waiting = inGroup ? members.filter((m) => !g.isReady(m.id)).map((m) => m.name) : [];
  $('#rs-status').textContent = !inGroup ? '' : all ? (host ? 'Everyone is ready: pull when you are.' : `Everyone is ready: the ${leader()} pulls.`) : `Waiting for ${waiting.join(', ')}.`;
}

// A guest takes the host's fight settings and raid buffs (for this session; their own saved settings stay).
function applyHostSettings(settings) {
  const fight = settings.fight || {};
  const changed = HOST_FIGHT_KEYS.some((k) => fight[k] !== undefined && fight[k] !== state.settings[k]) ||
    JSON.stringify(settings.raid) !== JSON.stringify(state.groupRaid);
  if (!changed) return;
  // The arena changes with the zone, and with a boss that has a room of its own (Onyxia's lair, the classic raids).
  const lookBefore = lookKey();
  for (const k of HOST_FIGHT_KEYS) if (fight[k] !== undefined) state.settings[k] = fight[k];
  state.groupRaid = settings.raid || null;
  for (const [sel, k] of [['#opt-duration', 'duration'], ['#opt-targets', 'targets'], ['#opt-zone', 'zone'], ['#opt-encounter', 'encounter'], ['#opt-end', 'endMode']]) {
    if ($(sel)) $(sel).value = state.settings[k];
  }
  if (lookKey() !== lookBefore) state.arena.setGraphics({ quality: state.settings.quality, time: lookKey() });
  rebuild({ keepMsg: true });
  raidWarning(`The ${leader()} set the fight`);
}

// In a group the party leader (raid leader past five players) leads: only they set the encounter, zone, fight length
// and targets, and pull.
const leader = () => (state.group && state.group.members.length > 5 ? 'raid leader' : 'party leader');
const leaderOnly = () => !!(state.group && state.group.active && !state.group.isHost);
function lockLeaderControls() {
  const locked = leaderOnly();
  for (const sel of ['#opt-encounter', '#opt-zone', '#opt-duration', '#opt-targets']) {
    const el = $(sel);
    if (!el) continue;
    el.disabled = locked || (sel === '#opt-targets' && !!(ENCOUNTERS[state.settings.encounter] || {}).boss);
    el.title = locked ? `The ${leader()} sets this` : '';
  }
}

function drawGroupPanel() {
  const g = state.group;
  if (!g) return;
  const active = g.active;
  lockLeaderControls();
  $('#group-start').classList.toggle('hidden', active);
  $('#group-in').classList.toggle('hidden', !active);
  const st = $('#group-status');
  st.textContent = g.status.text;
  st.className = `msg ${g.status.ok ? 'ok' : 'error'}`;
  document.querySelector('.side-menu [data-open=group]').classList.toggle('in-group', active);
  $('#raid-host-note').classList.toggle('hidden', !(active && !g.isHost));
  if (!active) return;
  $('#group-key').textContent = g.key || '';
  $('#group-role').textContent = g.isHost
    ? `You are the ${leader()}: your encounter, zone, fight and raid buffs count for everyone, and your Start pulls the whole group.`
    : `The ${leader()} sets the encounter, zone, fight and raid buffs, and pulls. Your spec, gear, talents, consumables, keys and bars stay yours.`;
  $('#group-members').innerHTML = g.members.map((m) => `<li>${esc(m.name)}${m.id === g.group.myId ? ' <span class="hint">you</span>' : ''}${m.host ? ` <span class="hint">${leader()}</span>` : ''}<small>${esc((m.info && m.info.spec) || '')}</small></li>`).join('') + npcMemberRows();
  syncNpcRaid();
}

function bindGroup() {
  // A name saved before names were kept civil gets its polite stand-in now.
  if (state.settings.playerName && cleanName(state.settings.playerName) !== state.settings.playerName) {
    state.settings.playerName = cleanName(state.settings.playerName);
    store.set('settings', state.settings);
  }
  $('#group-name').value = state.settings.playerName || '';
  // Your name in the group: it has to be chosen before you host or join, and can be changed while in one.
  // A name with a slur or swear word in it is played under its polite stand-in (name-filter.js), and shown as such.
  const name = () => {
    const typed = $('#group-name').value.trim();
    const n = cleanName(typed);
    if (n !== typed.slice(0, 24)) { $('#group-name').value = n; raidWarning(`Name polished: ${n}`); }
    return n;
  };
  const saveName = (n) => { state.settings.playerName = n; store.set('settings', state.settings); };
  const busy = (on) => { for (const b of ['#group-host', '#group-join']) $(b).disabled = on; };
  const fail = (e) => { state.group.status = { text: e.message || String(e), ok: false }; busy(false); drawGroupPanel(); };
  const named = () => {
    const n = name();
    if (n) { saveName(n); return n; }
    fail(new Error('Choose a name first: it is what the others see'));
    $('#group-name').focus();
    return null;
  };
  $('#group-name').addEventListener('change', () => {
    const n = name();
    if (!n) { $('#group-name').value = state.settings.playerName || ''; return; } // an empty name keeps the old one
    saveName(n);
    state.group.rename(n);
  });
  $('#group-host').addEventListener('click', async () => {
    const n = named();
    if (!n) return;
    busy(true);
    try { await state.group.host(n); } catch (e) { fail(e); return; }
    busy(false);
  });
  $('#group-join').addEventListener('click', async () => {
    const n = named();
    if (!n) return;
    busy(true);
    try { await state.group.join($('#group-key-in').value, n); } catch (e) { fail(e); state.group.leave(); state.group.status = { text: e.message || String(e), ok: false }; drawGroupPanel(); return; }
    busy(false);
  });
  // Raid frames: show, lock (unlocked: drag to move, wheel to size), size, layout.
  const rf = state.settings.raidFrames;
  const rfSync = () => {
    $('#rf-show').checked = rf.show;
    $('#rf-lock').checked = rf.locked;
    $('#rf-scale').value = rf.scale;
    $('#rf-grow').value = rf.grow;
  };
  const rfSave = () => { state.raidFrames.place(); store.set('settings', state.settings); };
  $('#rf-show').addEventListener('change', (e) => { rf.show = e.target.checked; rfSave(); });
  $('#rf-lock').addEventListener('change', (e) => { rf.locked = e.target.checked; rfSave(); });
  $('#rf-scale').addEventListener('input', (e) => state.raidFrames.setScale(Number(e.target.value)));
  $('#rf-grow').addEventListener('change', (e) => { rf.grow = e.target.value; rfSave(); });
  $('#rf-reset').addEventListener('click', () => { state.raidFrames.resetPosition(); rfSync(); });
  $('#raid-frames').addEventListener('wheel', () => { $('#rf-scale').value = rf.scale; });
  rfSync();
  $('#group-leave').addEventListener('click', () => {
    const wasGuest = !state.group.isHost;
    state.group.leave();
    if (wasGuest && state.groupRaid) { state.groupRaid = null; rebuild({ keepMsg: true }); } // back to your own raid setup
  });
  for (const sel of ['#group-copy', '#rs-key-copy']) $(sel).addEventListener('click', () => {
    navigator.clipboard.writeText(state.group.key || '').then(() => raidWarning('Room key copied'), () => {});
  });
  document.querySelector('[data-close-group]').addEventListener('click', () => $('#group-panel').classList.add('hidden'));
  drawGroupPanel();
}

// ---- spellbook and bar editing --------------------------------------------------------------------

// Open: the bars can be edited by drag and drop (spells from the book onto a bar, buttons between bars, a
// button dropped anywhere else comes off its bar), as in the game.
function showSpellbook(on) {
  state.editBars = on;
  $('#spellbook').classList.toggle('hidden', !on);
  document.body.classList.toggle('edit-bars', on);
  document.querySelector('.side-menu [data-open=spellbook]').classList.toggle('active', on);
  buildActionBar();
  if (on) drawSpellbook();
}

function drawSpellbook() {
  const book = spellbook(parseTalents(state.sheet.talents));
  if (!book.some((t) => t.name === state.spellbookTab)) state.spellbookTab = 'Fury';
  $('#sb-tabs').innerHTML = book.map((t) => `<button type="button" class="sb-tab ${t.name === state.spellbookTab ? 'active' : ''}" data-sbtab="${t.name}">${t.name}</button>`).join('');
  const onBars = new Set(Object.values(state.bars).flat());
  const tab = book.find((t) => t.name === state.spellbookTab);
  $('#sb-list').innerHTML = tab.spells.map((s) => {
    const can = castable(s.id);
    const info = can ? actionInfo(s.id) : { name: s.name, icon: s.icon };
    const have = can && hasAction(s.id);
    const byMacro = can && state.macros.find((m) => m.enabled && new RegExp(`\\b${ABILITIES[s.id].name}\\b`, 'i').test(m.text) && m.replaces !== s.id);
    const note = !can ? 'Not in the trainer yet' : !have ? (ABILITIES[s.id].item ? 'Nothing with a use effect' : byMacro ? `Cast by your ${byMacro.name} macro` : 'Not available') :
      onBars.has(s.id) ? `On your bars${state.binds[s.id] ? ` · ${state.binds[s.id]}` : ''}` : 'Not on your bars';
    return `<li class="sb-spell ${can ? '' : 'off'}" ${can ? `draggable="true" data-id="${s.id}" data-tt="spell:${s.id}"` : ''}>
      <img src="${iconUrl(info.icon)}" alt=""><span><b>${esc(info.name)}</b><small>${esc(note)}</small></span></li>`;
  }).join('');
}

function bindSpellbook() {
  state.spellbookTab = 'Fury';
  $('#sb-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sbtab]');
    if (b) { state.spellbookTab = b.dataset.sbtab; drawSpellbook(); }
  });
  // Clicking a spell in the book casts it, as in the game.
  $('#sb-list').addEventListener('click', (e) => {
    const li = e.target.closest('.sb-spell[data-id]');
    if (li) press(li.dataset.id, {});
  });
  document.querySelector('[data-close-spellbook]').addEventListener('click', () => showSpellbook(false));
  $('#bars-reset').addEventListener('click', () => { state.bars = structuredClone(DEFAULT_BARS); saveBars(); drawSpellbook(); });

  let drag = null; // { id, bar?, idx? }
  document.addEventListener('dragstart', (e) => {
    const src = e.target.closest && e.target.closest('.ab[draggable="true"], .sb-spell[draggable="true"]');
    if (!src) return;
    drag = { id: src.dataset.id, bar: src.dataset.bar || null };
    e.dataTransfer.setData('text/plain', drag.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  const slotOf = (e) => e.target.closest && e.target.closest('.ab[data-bar], .ab-slot');
  document.addEventListener('dragover', (e) => {
    const slot = drag && slotOf(e);
    if (!slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.drop-target').forEach((x) => x !== slot && x.classList.remove('drop-target'));
    slot.classList.add('drop-target');
  });
  document.addEventListener('drop', (e) => {
    const slot = drag && slotOf(e);
    if (!slot) return;
    e.preventDefault();
    const { id } = drag;
    drag = null;
    placeOnBar(id, slot.dataset.bar, Number(slot.dataset.idx)); // dropped on a button: goes in front of it
    drawSpellbook();
  });
  document.addEventListener('dragend', (e) => {
    document.querySelectorAll('.drop-target').forEach((x) => x.classList.remove('drop-target'));
    // A bar button dropped anywhere but a bar comes off the bar.
    if (drag && drag.bar && e.dataTransfer.dropEffect === 'none') { removeFromBars(drag.id); drawSpellbook(); }
    drag = null;
  });
}

// Actions this character does not have (no on-use trinket, no racial, untalented) are left off, as Fojji's
// load conditions do. Their keys still work.
function hasAction(id) {
  const ab = ABILITIES[id];
  const s = state.sheet;
  if (!ab || !s) return true;
  if (ab.item) return !!s.uses[ab.item];
  // The pet bar: only with a pet out, and only its own spells.
  if (ab.petCommand || ab.petSpell) {
    const kind = CLS.Fight.petKind ? CLS.Fight.petKind(s) : null;
    if (!ab.petSpell) return !!kind;
    return Array.isArray(ab.petSpell) ? ab.petSpell.includes(kind) : ab.petSpell === kind;
  }
  if (ab.racial) return !!(RACIALS[s.race] && RACIALS[s.race].active);
  if (ab.talent) return parseTalents(s.talents)[ab.talent] > 0;
  // Intercept gets its own button only when no macro (like Charge / Intercept) already casts it.
  if (id === 'intercept') return !state.macros.some((m) => m.enabled && /\bintercept\b/i.test(m.text));
  return true;
}

function buildActionBar() {
  const bar = $('#action-bar');
  bar.innerHTML = '';
  const editing = state.editBars;
  const extra = freeMacros().map((m) => `macro:${m.id}`);
  const layout = Object.entries(state.bars).map(([key, ids]) => ({ key, cls: BAR_CLASSES[key], ids }));
  const groups = extra.length ? [...layout, { cls: 'fj-cds fj-macros', ids: extra }] : layout;
  const stances = $('#fj-stances');
  stances.innerHTML = '';
  const petBar = $('#hf-petbar');
  petBar.innerHTML = '';
  const trinketBar = $('#hf-trinkets');
  trinketBar.innerHTML = '';
  const auraBar = $('#hf-aurabar');
  auraBar.innerHTML = '';
  for (const group of groups) {
    const row = document.createElement('div');
    row.className = `ab-row ${group.cls}`;
    group.ids.forEach((id, idx) => {
      // While editing, actions you do not have (untalented, no on-use trinket) show too, so they can be moved.
      if (!editing && !id.startsWith('macro:') && !replacingMacro(id) && !hasAction(id)) return;
      // An ability taken over by a macro keeps its slot and key but runs (and shows) the macro.
      const replaced = replacingMacro(id);
      const shown = replaced ? `macro:${replaced.id}` : id;
      const info = actionInfo(shown);
      const btn = document.createElement('button');
      btn.className = 'ab';
      btn.dataset.id = id;
      if (replaced) btn.dataset.macro = shown;
      btn.dataset.icon = info.icon;
      btn.dataset.tt = 'ab:'; // hover tooltip (abilityTip), built from the button's ability or macro
      btn.appendChild(iconImg(info.icon, info.name));
      btn.insertAdjacentHTML('beforeend', `<div class="cd"></div><div class="cdt"></div><span class="key"></span><span class="cost"></span><span class="apl"></span>`);
      if (shown.startsWith('macro:')) btn.insertAdjacentHTML('beforeend', `<span class="mname">${esc(info.name)}</span>`);
      if (editing && group.key) {
        btn.draggable = true;
        btn.dataset.bar = group.key;
        btn.dataset.idx = idx;
        btn.classList.toggle('not-had', !hasAction(id));
      } else {
        btn.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return; // other buttons can be key binds of their own
          e.preventDefault();
          press(id, { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });
        });
        // A pet spell's autocast: right-click turns it off or on.
        if (ABILITIES[id] && ABILITIES[id].petSpell) {
          btn.addEventListener('contextmenu', (e) => { e.preventDefault(); press(id, { toggle: true }); });
        }
      }
      row.appendChild(btn);
    });
    // While editing, an empty slot at the end of each bar takes a spell dropped on it.
    if (editing && group.key) row.insertAdjacentHTML('beforeend', `<div class="ab-slot" data-bar="${group.key}" data-idx="${group.ids.length}" title="Drop a spell here"></div>`);
    // The stance icons sit left of the player frame; the power bars are as wide as the main bar.
    if (group.cls === 'fj-stances') stances.appendChild(row);
    else if (group.cls === 'fj-pet') petBar.appendChild(row); // the pet bar, under your frame (movable)
    else if (group.cls === 'fj-trinkets') trinketBar.appendChild(row); // the trinket bar, above your frame (movable)
    else if (group.cls === 'fj-auras') auraBar.appendChild(row); // a paladin's auras, at the bottom of the screen (movable)
    else bar.appendChild(row);
    if (group.cls === 'fj-main') $('#fj-hud').style.setProperty('--main-n', Math.max(1, row.children.length));
  }
  refreshKeyLabels();
  scaleHud();
}

// Short key text for the icons, like action bar addons: "Shift+E" -> "SE", "Wheel Up" -> "WU", "Mouse 5" -> "M5".
function shortKey(k) {
  return (k || '').replace('Ctrl+', 'C').replace('Alt+', 'A').replace('Shift+', 'S')
    .replace('Wheel Up', 'WU').replace('Wheel Down', 'WD').replace('Middle Mouse', 'M3').replace('Mouse ', 'M');
}

function refreshKeyLabels() {
  document.querySelectorAll('.ab').forEach((btn) => {
    btn.querySelector('.key').textContent = shortKey(state.binds[btn.dataset.id]);
  });
  buildKeybindList();
}

// Preset picker above the keybind list. Picking a preset loads its keys. Changing a key while one of your
// own presets is active updates it; on a built-in preset it shows "(changed)" until you save it as your own.
function buildBindPresets() {
  const sel = $('#bind-preset');
  const active = presetById(state.bindPreset);
  const changed = active && builtInPresets().includes(active) &&
    Object.keys({ ...active.binds, ...state.binds }).some((id) => (active.binds[id] || '') !== (state.binds[id] || ''));
  sel.innerHTML = '';
  for (const p of builtInPresets()) sel.add(new Option(p.name + (p.id === state.bindPreset && changed ? ' (changed)' : ''), p.id));
  const own = ownPresets();
  if (own.length) {
    const group = document.createElement('optgroup');
    group.label = 'Your presets';
    for (const p of own) group.appendChild(new Option(p.name, p.id));
    sel.appendChild(group);
  }
  sel.value = state.bindPreset;
  $('#bind-delete').disabled = !own.some((p) => p.id === state.bindPreset);
}

function bindPresetControls() {
  const msg = (text) => { $('#bind-msg').textContent = text; };
  $('#bind-preset').addEventListener('change', (e) => {
    const p = presetById(e.target.value);
    if (!p) return;
    state.bindPreset = p.id;
    // Keys for macros that replace nothing are kept; every action gets the preset's key.
    const macroKeys = Object.fromEntries(Object.entries(state.binds).filter(([id]) => id.startsWith('macro:')));
    state.binds = { ...macroKeys, ...p.binds };
    saveBinds();
    refreshKeyLabels();
    msg(`Using the ${p.name} keybinds.`);
  });
  $('#bind-save').addEventListener('click', () => {
    const name = $('#bind-name').value.trim();
    if (!name) { msg('Type a name for the preset first.'); return; }
    const presets = store.get('bindPresets.v1', {});
    const own = presets[SPEC_KEY] || [];
    const existing = own.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const id = existing ? existing.id : `own-${Date.now().toString(36)}`;
    if (existing) existing.binds = { ...state.binds };
    else own.push({ id, name, binds: { ...state.binds } });
    presets[SPEC_KEY] = own;
    store.set('bindPresets.v1', presets);
    state.bindPreset = id;
    saveBinds();
    $('#bind-name').value = '';
    refreshKeyLabels();
    msg(existing ? `Updated your preset "${name}".` : `Saved the current keys as "${name}".`);
  });
  // Myslot import: the keys become one of your presets ("Myslot - <character>") and are used right away.
  $('#myslot-import').addEventListener('click', () => {
    let parsed;
    try { parsed = parseMyslot($('#myslot-text').value); } catch (err) { msg(err.message); return; }
    const items = {};
    for (const c of consumableOptions(5)) items[c.id] = 'explosive';
    for (const c of potionOptions(1)) items[c.id] = 'potion';
    for (const c of potionOptions(3)) items[c.id] ||= 'offensivePotion';
    for (const c of potionOptions(2)) items[c.id] ||= 'defensivePotion';
    // The potions you picked go to their own buttons.
    const picks = (state.loadout && state.loadout.consumables) || {};
    for (const [field, action] of [['resourcePotId', 'potion'], ['offensivePotId', 'offensivePotion'], ['defensivePotId', 'defensivePotion']]) if (picks[field]) items[picks[field]] = action;
    for (const g of state.gear || []) if (g.slot === 12 || g.slot === 13) items[g.id] = g.slot === 12 ? 'trinket1' : 'trinket2';
    const racial = RACIALS[state.sheet.race] && RACIALS[state.sheet.race].active;
    const { binds, found, missing } = myslotKeybinds(parsed, ALL_ACTIONS, { items, racial: racial && racial.name.toLowerCase() });
    if (!found.length) { msg('No keys found for the trainer\'s abilities in that export.'); return; }
    const name = `Myslot${parsed.player ? ` - ${parsed.player}` : ''}`;
    const presets = store.get('bindPresets.v1', {});
    const own = presets[SPEC_KEY] || [];
    const existing = own.find((p) => p.name === name);
    const full = Object.fromEntries(ALL_ACTIONS.map((id) => [id, binds[id] || '']));
    const id = existing ? existing.id : `own-${Date.now().toString(36)}`;
    if (existing) existing.binds = full; else own.push({ id, name, binds: full });
    presets[SPEC_KEY] = own;
    store.set('bindPresets.v1', presets);
    const macroKeys = Object.fromEntries(Object.entries(state.binds).filter(([k]) => k.startsWith('macro:')));
    state.binds = { ...macroKeys, ...full };
    state.bindPreset = id;
    saveBinds();
    refreshKeyLabels();
    $('#myslot-text').value = '';
    const names = (list) => list.map((a) => actionInfo(a).name).join(', ');
    msg(`Imported "${name}": keys for ${found.length} abilities.${missing.length ? ` Not on your bars (unbound): ${names(missing)}.` : ''}`);
  });
  $('#bind-delete').addEventListener('click', () => {
    const presets = store.get('bindPresets.v1', {});
    const own = presets[SPEC_KEY] || [];
    const gone = own.find((p) => p.id === state.bindPreset);
    if (!gone) return;
    presets[SPEC_KEY] = own.filter((p) => p.id !== gone.id);
    store.set('bindPresets.v1', presets);
    state.bindPreset = 'default'; // the keys in use stay until you pick another preset
    saveBinds();
    refreshKeyLabels();
    msg(`Deleted "${gone.name}". Your keys are unchanged; pick a preset to load one.`);
  });
}

// The movement keys (Settings → Keybinds, world/arena.js setMoveKeys), kept by physical key (e.code) in
// settings.moveKeys: the defaults are WASD where it sits on any keyboard (ZQSD on AZERTY), and Space to jump.
const MOVE_ACTIONS = [
  ['forward', 'Move forward', 'KeyW'], ['back', 'Move backward', 'KeyS'], ['left', 'Turn left', 'KeyA'], ['right', 'Turn right', 'KeyD'],
  ['strafeLeft', 'Strafe left', ''], ['strafeRight', 'Strafe right', ''], ['jump', 'Jump', 'Space'],
];
const moveKeys = () => ({ ...Object.fromEntries(MOVE_ACTIONS.map(([a, , code]) => [a, code])), ...(state.settings.moveKeys || {}) });
// A key code as it is printed on this keyboard (the browser's layout map where it has one: Z for KeyW on AZERTY).
function codeLabel(code) {
  if (!code) return '';
  const own = state.keyLayout && state.keyLayout.get(code);
  if (own) return own.length === 1 ? own.toUpperCase() : own;
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '');
}
if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
  navigator.keyboard.getLayoutMap().then((m) => { state.keyLayout = m; if (!$('#keybind-list').closest('.hidden')) buildKeybindList(); }).catch(() => {});
}

function buildKeybindList() {
  buildBindPresets();
  const ul = $('#keybind-list');
  ul.innerHTML = '<li class="kb-head">Movement <span class="hint">(by where the key sits; the arrow keys always move)</span></li>';
  const mk = moveKeys();
  for (const [action, name] of MOVE_ACTIONS) {
    const id = `move:${action}`;
    const li = document.createElement('li');
    li.innerHTML = `<span>${esc(name)}</span>`;
    const b = document.createElement('button');
    b.textContent = state.listening === id ? 'Press key…' : codeLabel(mk[action]) || '—';
    if (state.listening === id) b.classList.add('listening');
    b.addEventListener('click', () => { state.listening = state.listening === id ? null : id; buildKeybindList(); });
    li.appendChild(b);
    ul.appendChild(li);
  }
  ul.insertAdjacentHTML('beforeend', '<li class="kb-head">Abilities</li>');
  for (const id of [...ALL_ACTIONS, ...freeMacros().map((m) => `macro:${m.id}`)]) {
    const info = actionInfo(id);
    const li = document.createElement('li');
    li.appendChild(iconImg(info.icon, info.name));
    const rm = !id.startsWith('macro:') && replacingMacro(id);
    li.insertAdjacentHTML('beforeend', `<span>${esc(id.startsWith('macro:') ? `Macro: ${info.name}` : ABILITIES[id].name)}${rm ? ` <span class="hint">→ ${esc(rm.name)}</span>` : ''}</span>`);
    const b = document.createElement('button');
    b.textContent = state.listening === id ? 'Press key…' : state.binds[id] || '—';
    if (state.listening === id) b.classList.add('listening');
    b.addEventListener('click', () => { state.listening = state.listening === id ? null : id; buildKeybindList(); });
    li.appendChild(b);
    ul.appendChild(li);
  }
}

function keyName(e) {
  let k = e.key;
  if (k === ' ') k = 'Space';
  if (k.length === 1) k = k.toUpperCase();
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(k)) return null;
  // Shift+digit gives a symbol in e.key, so use the physical digit.
  if (e.shiftKey && /^Digit\d$/.test(e.code)) k = e.code.slice(5);
  return (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + k;
}

// Binds the key being listened for in Settings (Escape cancels). A key moves off any action that had it, a movement
// key's too.
function assignBind(k) {
  if (k !== 'Escape') {
    for (const [id, key] of Object.entries(state.binds)) if (key === k) state.binds[id] = '';
    state.binds[state.listening] = k;
    saveBinds();
    const mk = moveKeys();
    const freed = Object.keys(mk).filter((a) => mk[a] && codeLabel(mk[a]) === k);
    if (freed.length) { for (const a of freed) mk[a] = ''; saveMoveKeys(mk); }
  }
  state.listening = null;
  refreshKeyLabels();
}

// Binds a movement key (e.code; Escape cancels). It moves off any other movement and off an ability with that key.
function assignMoveKey(e) {
  const action = state.listening.slice(5);
  if (e.code !== 'Escape' && !/^(Shift|Control|Alt|Meta)/.test(e.code)) {
    const mk = moveKeys();
    for (const a of Object.keys(mk)) if (mk[a] === e.code) mk[a] = '';
    mk[action] = e.code;
    const label = codeLabel(e.code);
    for (const [id, key] of Object.entries(state.binds)) if (key === label) state.binds[id] = '';
    saveBinds();
    saveMoveKeys(mk);
  }
  state.listening = null;
  refreshKeyLabels();
}
function saveMoveKeys(mk) {
  state.settings.moveKeys = mk;
  store.set('settings', state.settings);
  state.arena.setMoveKeys(mk);
}

const boundTo = (k) => Object.keys(state.binds).find((a) => state.binds[a] === k);

// Presses a bound action. Ability keys would pull a new fight: not while the results are up, nor in the
// second after a fight ends.
function pressBound(id, e) {
  if (resultsOpen() || (state.fight && state.fight.over && performance.now() - (state.endedAt || 0) < 1500)) return;
  press(id, { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });
}

document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  const typing = (tag === 'INPUT' && e.target.type !== 'checkbox') || tag === 'TEXTAREA' || tag === 'SELECT';
  if (state.listening && state.listening.startsWith('move:')) { e.preventDefault(); e.stopPropagation(); assignMoveKey(e); return; }
  if (state.listening) {
    const k = keyName(e);
    if (!k) return;
    e.preventDefault();
    assignBind(k);
    return;
  }
  if (typing) return;
  if (e.key === 'Pause') { e.preventDefault(); togglePause(); return; } // the keyboard's Pause/Break key
  if (state.paused) return; // nothing is cast while the fight is paused
  if (e.key === 'Escape') {
    if (state.editMode) setEditMode(false);
    else if (resultsOpen()) $('#results').classList.add('hidden');
    else if (state.fight) { state.fight.cancelQueue(); clearTarget(); }
    return;
  }
  if (e.key === 'Tab') { e.preventDefault(); cycleTarget(); return; }
  const id = boundTo(keyName(e));
  if (id) { e.preventDefault(); pressBound(id, e); }
});

// The mouse wheel and the middle and side buttons bind like keys, as in WoW ("Wheel Up", "Shift+Mouse 4").
// Over the game a bound wheel direction presses its action instead of zooming; Ctrl+wheel always zooms.
const modPrefix = (e) => (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '');
const MOUSE_BUTTONS = { 1: 'Middle Mouse', 3: 'Mouse 4', 4: 'Mouse 5' };
// Over the raid frames (unless they are being moved) a bound wheel or button still casts: mouseover healing.
const overGame = (e) => !(e.target.closest && e.target.closest('.panel, .modal, .side-menu, .topbar, .meters, .raid-frames.unlocked, input, textarea, select'));
let lastWheelPress = 0;
window.addEventListener('wheel', (e) => {
  const delta = e.deltaY || e.deltaX; // Shift+wheel scrolls sideways in some browsers
  if (!delta || e.ctrlKey) return;
  const k = modPrefix(e) + (delta < 0 ? 'Wheel Up' : 'Wheel Down');
  if (state.listening) { e.preventDefault(); e.stopPropagation(); assignBind(k); return; }
  const id = overGame(e) && boundTo(k);
  if (!id) return; // not bound: the camera zooms as before
  e.preventDefault();
  e.stopPropagation();
  // One press per wheel notch (touchpads send a stream of small wheel events).
  const now = performance.now();
  if (now - lastWheelPress < 120) return;
  lastWheelPress = now;
  pressBound(id, e);
}, { capture: true, passive: false });
window.addEventListener('mousedown', (e) => {
  const name = MOUSE_BUTTONS[e.button];
  if (!name) return;
  e.preventDefault();
  const k = modPrefix(e) + name;
  if (state.listening) { assignBind(k); return; }
  const id = boundTo(k);
  if (id) pressBound(id, e);
}, true);
// Mouse 4 / 5 would otherwise go back / forward in the browser and leave the page.
for (const type of ['mouseup', 'auxclick']) {
  window.addEventListener(type, (e) => { if (e.button === 3 || e.button === 4) e.preventDefault(); }, true);
}

// ---- per-frame drawing ------------------------------------------------------------------------

function frame(now) {
  // The next frame first: an error in this one (a mismatched scene, a bad event) must not stop the game for good.
  requestAnimationFrame(frame);
  const f = state.fight;
  const dt = Math.min(0.25, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  if (f) {
    state.arena.combat = f.started && !f.over;
    state.arena.fiery = (f.aura('deathWish') ? 1 : 0) + (f.aura('recklessness') ? 1 : 0);
    // The ghost is placed before the arena renders this frame.
    // A bot that walks (a weaving hunter) stands where its own fight has it.
    const ghostAt = state.ghost && state.ghost.f.started && state.ghost.f.prepullRange != null ? state.ghost.f.geo.dist[0] : f.home || 0;
    if (state.ghostView) state.ghostView.update(dt, f.primary, f.started && !f.over, !!(state.ghost && state.ghost.away), ghostAt);
    state.arena.bossFocus = bossFocus(f);
    state.arena.noTarget = !!f.targetless;
    // The room's onlookers stand around only in the training ground; at a boss the raid is the NPC raiders.
    const env = state.arena.env;
    const watch = !state.arena.boss;
    if (env && env.watching !== watch) { env.watching = watch; for (const m of env.raid || []) m.visible = watch; }
    f.setGeometry(state.arena.update(dt, f.primary));
    // A shaman's totems stand in the arena (a new drop is a new totem).
    // A totem moved by Totemic Projection is a new one to the arena: it stands where you are now.
    if (f.totems) state.arena.setTotems(Object.fromEntries(Object.entries(f.totems).map(([slot, t]) => [slot, t && t.end > f.t ? `${t.id}@${t.end}#${t.moved || 0}` : null])));
    // A druid's form in place of the character: Cat or Dire Bear Form (Feral), Moonkin Form (Balance with the talent).
    // Shadowform darkens you, stealth makes you see-through.
    state.arena.setForm(f.form || (CLASS_ID === 'druid' && f.tal && f.tal.moonkinForm ? 'moonkin' : null));
    state.arena.setVeil({ alpha: f.aura('stealth') ? 0.5 : 1, shadow: !!f.aura('shadowform') });
    // A warlock's demon or a hunter's pet fights beside you; a Beast Mastery hunter's hawks circle the target.
    state.arena.setPet(f.pet ? f.pet.kind : null, f.pet && f.pet.category);
    state.arena.setPetState(f.pet ? { engaged: f.pet.engaged, stay: f.pet.stay } : null);
    // A hunter's range zones on the ground around the target.
    state.arena.setRangeZones(f.rangeZone ? f.rangeZone(f.primary) : null, f.primary);
    if (f.hawksUp) state.arena.setHawks(f.hawksUp());
    // A hunter holds the bow, gun or crossbow at range and the melee weapon in melee.
    if (f.heldWeapon) state.arena.setHeld(f.heldWeapon());
    // How fast you run (a hunter's aspect, a daze).
    state.arena.setSpeedMult(f.dead ? 0 : f.moveSpeedMult ? f.moveSpeedMult() : 1); // the dead stay where they fell
    // Shields and auras on you (world/spell-fx.js).
    state.arena.spellFx.setAuras(Object.keys(f.auras).filter((id) => f.aura(id)));
    // Paused: the fight's clock stands still, and with it the boss, the sim, the NPC tank and the raid.
    if (f.started && !f.over && !state.paused) f.advance(f.t + dt);
    else if (f.precast) f.tickPrecast(dt); // a spell cast before the pull: the fight starts as it lands
    if (state.group) state.group.frame(dt, f); // the other players, and your position for them
    if (f.raid) syncHealerRaid(f);
    state.raidFrames.draw(raidFrameRows(f));
    drawRaidCds(f);
    drawLossOfControl();
    if (state.drill && !state.paused) state.drill.update();
    // The sim plays up to your fight's clock (it stops where yours stops).
    if (state.ghost && f.started && (state.settings.simGhost || state.settings.simRace)) state.ghost.advanceTo(f.t);
    updateTankBot(f);
    updateRaidBots(f, dt);
    npcHeal(f);
    if (state.encounter && !state.paused) state.encounter.update();
    updateRaidPack(f);
    document.body.classList.toggle('in-fight', f.started && !f.over);
    draw(f, now);
    placeCombatText();
  }
}

// Target of target i: who it attacks ({ name, cls, hp, maxHp }) — you, another player, the NPC tank — or null
// (a training dummy nobody tanks, before the pull).
function totOf(f, i) {
  if (!f.started || f.over || f.targets[i].dead) return null;
  if (!f.o.tank) return state.arena.boss && state.arena.tank && i === 0 ? { name: 'Tank', cls: 'warrior', hp: 1, maxHp: 1 } : null;
  if (f.hasAggro(i)) return { name: state.settings.playerName || 'You', cls: state.sheet.classId, hp: f.health, maxHp: f.maxHealth };
  // The NPC tank, while it holds it (another player passing it takes it in a group).
  const tb = state.tankBot;
  const holder = threatHolder(f, i);
  if (tb && holder === tb.id) return { name: tb.name, cls: tb.classId, hp: tb.f.health, maxHp: tb.f.maxHealth };
  const g = state.group;
  const id = g && g.active ? g.aggroOn(f, i) : null;
  return id ? g.unitOf(id) : null;
}

// The compact target-of-target bar under the target frame (Fojji EUI): class-coloured health with the name.
function drawTargetOfTarget(el, u) {
  el.classList.toggle('hidden', !u);
  if (!u) return;
  const pct = u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 1;
  el.style.setProperty('--c', classColor(u.cls));
  el.querySelector('.fill').style.width = `${pct * 100}%`;
  const name = el.querySelector('.tot-name');
  if (name.textContent !== u.name) name.textContent = u.name;
  el.querySelector('.tot-hp').textContent = `${Math.round(pct * 100)}%`;
}

// Where a melee boss goes: to the NPC tank, else to whoever has its aggro (you, or another player in the arena);
// before the pull it stays.
function bossFocus(f) {
  const a = state.arena;
  if (!a.boss || !f.started || f.over) return null;
  if (f.hasAggro(0)) return a.player.position;
  const g = state.group;
  const id = threatHolder(f, 0);
  const p = g && g.active && id && !String(id).startsWith('bot:') ? g.positionOf(id) : null;
  return p || (a.tank ? a.tank.position : null); // back to the NPC tank
}

// Keeps the floating combat text anchors and nameplates above the targets (and the player) on screen.
function placeCombatText() {
  const f = state.fight;
  const show = state.settings.nameplates;
  document.querySelectorAll('.nameplate').forEach((np, i) => {
    const p = show ? state.arena.project(i, 0.15) : null;
    np.style.display = p ? '' : 'none';
    if (!p) return;
    np.style.left = `${p.x}px`;
    np.style.top = `${p.y}px`;
    np.classList.toggle('selected', i === f.primary);
    np.querySelector('.np-fill').style.width = `${f.healthPct(i) * 100}%`;
  });
  document.querySelectorAll('.dummy').forEach((d, j) => {
    const p = d.id === 'player-fct' ? state.arena.projectPlayer() : state.arena.project(j - 1, -0.4); // the text starts at the head
    if (!p) { d.style.display = 'none'; return; }
    d.style.display = '';
    d.style.left = `${p.x}px`;
    d.style.top = `${p.y}px`;
  });
  placeGhostTag(f);
}

// The sim's next cast: what the APL presses next in your fight, when, and the line and condition that pick it.
// Off-GCD actions due now (a stance swap, Heroic Strike) come first.
function drawSimNext(f, hint) {
  const box = $('#sim-next');
  const id = state.settings.simNext && !f.over ? hint.now[0] || hint.next : null;
  box.classList.toggle('hidden', !id);
  if (!id) return;
  const { name, icon } = actionInfo(id);
  const when = hint.now[0] ? 'now' : hint.at > 0.05 ? `in ${hint.at.toFixed(1)} s` : f.gcdLeft() > 0.05 ? `in ${f.gcdLeft().toFixed(1)} s` : 'now';
  const why = f.started ? explain(hint.why && hint.why[id]) : 'Charge to pull';
  const html = `<img src="${iconUrl(icon)}" alt=""><div><b>${esc(name)}</b><span class="when">${esc(when)}</span><span class="why">${esc(why)}</span></div>`
    + '<button type="button" class="sn-close" title="Hide (Settings → Show: the sim\'s next cast)">×</button>';
  if (box.innerHTML !== html) box.innerHTML = html;
}

// The ghost's name tag: it waits for you before the pull, shows its latest cast in the fight and its DPS after.
function placeGhostTag(f) {
  const tag = $('#ghost-tag');
  const g = state.ghost;
  const head = state.settings.simGhost && state.ghostView && state.ghostView.head();
  const p = head ? state.arena.toScreen(head) : null;
  tag.classList.toggle('hidden', !p);
  if (!p) return;
  tag.style.left = `${p.x}px`;
  tag.style.top = `${p.y}px`;
  let text = 'waits for you';
  if (f.over) text = `${fmtNum(g.metric())} ${metricName}`;
  else if (g.started) {
    const c = g.lastCast;
    text = c && g.f.t - c.t < 1.2 && ABILITIES[c.id] ? ABILITIES[c.id].name : `${fmtNum(g.metric())} ${metricName}`;
  }
  const html = `<b>SIM</b>${esc(text)}`;
  if (tag.innerHTML !== html) tag.innerHTML = html;
}

function draw(f, now) {
  // Rage, swings, GCD.
  $('#rage-fill').style.width = `${(f.rage / f.maxRage) * 100}%`;
  if (HUD && HUD.comboPoints) drawComboPoints(f.cp);
  const hpPct = f.health / f.maxHealth;
  $('#hp-fill').style.width = `${hpPct * 100}%`;
  $('#hp-text').textContent = `${fmtNum(f.health)} | ${Math.round(hpPct * 100)}%`;
  $('#hp-bar').classList.toggle('low', hpPct < 0.35);
  $('#rage-text').textContent = Math.floor(f.rage);
  const mhSpeed = f.c.mh.speed / f.hasteMult();
  const mhProg = f.started ? 1 - Math.max(0, f.mhNext - f.t) / mhSpeed : 0;
  $('#mh-fill').style.width = `${Math.min(1, mhProg) * 100}%`;
  $('#mh-fill').parentElement.classList.toggle('queued', !!f.queued);
  $('#mh-text').textContent = f.queued && ABILITIES[f.queued] ? ABILITIES[f.queued].name : 'Main Hand';
  $('#oh-bar').classList.toggle('hidden', !f.dual);
  if (f.dual) {
    const ohSpeed = f.c.oh.speed / f.hasteMult();
    const ohProg = f.started ? 1 - Math.max(0, f.ohNext - f.t) / ohSpeed : 0;
    $('#oh-fill').style.width = `${Math.min(1, ohProg) * 100}%`;
  }
  // A caster has no swing timer: the bar shows the five-second rule after the last mana spent (Fojji Mage UI).
  if (HUD && HUD.fiveSecondRule) {
    const left = Math.max(0, (f.fsrEnd || 0) - f.t);
    $('#mh-fill').style.width = `${(left / 5) * 100}%`;
    $('#oh-bar').classList.add('hidden');
  }
  if (f.swingState) drawHunterSwing(f);
  $('#gcd-fill').style.width = `${(gcdNow(f) / 1.5) * 100}%`;
  // Cast bar (Slam): fills over the cast, with the time left.
  // A cast before the pull runs on its own clock (f.precast).
  const c = f.casting || (f.precast && { id: f.precast.id, start: f.t - (f.precast.dur - f.precast.left), end: f.t + f.precast.left });
  $('#cast-bar').classList.toggle('hidden', !c);
  if (c) {
    $('#cast-fill').style.width = `${Math.min(1, (f.t - c.start) / Math.max(0.01, c.end - c.start)) * 100}%`;
    $('#cast-text').textContent = `${ABILITIES[c.id].name} ${Math.max(0, c.end - f.t).toFixed(1)}`;
    drawCastTicks(c.channel && ABILITIES[c.id].ticks ? ABILITIES[c.id].ticks : 0);
  }
  $('#clock').textContent = f.timed ? `${fmtTime(f.t)} / ${fmtTime(f.o.duration)}` : `${fmtTime(f.t)} · ${f.endMode === 'health' ? 'until they die' : 'until you end it'}`;
  $('#stance').textContent = IS_WARRIOR ? STANCES[f.stance].name : stanceLine(f);

  // Overpower alert: the window is open, also when you still have to switch to Battle Stance.
  const opWindow = f.aura('overpowerWindow');
  const opReady = opWindow && f.cdLeft('overpower') < opWindow.end - f.t;
  $('#proc-alert').classList.toggle('hidden', !opReady);
  if (opReady) {
    const left = opWindow.end - f.t;
    $('#proc-alert-text').textContent = f.stance === 'battle'
      ? `Use it now · ${left.toFixed(1)}s`
      : `Switch to Battle Stance (${state.binds.battleStance || 'no key'}) · ${left.toFixed(1)}s`;
    $('#proc-alert-fill').style.width = `${(left / ABILITIES.overpower.window) * 100}%`;
  }

  // Rotation helper: borders on the buttons the wowsims APL would press next.
  const wantHint = state.settings.rotationHelper || state.settings.simNext;
  const fullHint = wantHint ? suggest(f, currentApl().apl, { dance: danceAbilities(), items: aplItems() }) : { next: null, now: [] };
  const hint = state.settings.rotationHelper ? fullHint : { next: null, now: [] };
  drawSimNext(f, fullHint);

  // Action bar. A macro button shows the state of the spell it casts, and swaps its icon to match.
  document.querySelectorAll('.ab').forEach((btn) => {
    let id = btn.dataset.id;
    btn.classList.toggle('apl-next', hint.next === id);
    btn.classList.toggle('apl-now', hint.now.includes(id));
    const macroId = btn.dataset.macro || (id.startsWith('macro:') ? id : null);
    if (macroId) {
      const target = macroTarget(macroId);
      if (!target) return;
      const icon = actionInfo(target).icon;
      if (btn.dataset.icon !== icon) {
        btn.dataset.icon = icon;
        btn.querySelector('img, .icon-fallback').replaceWith(iconImg(icon, ''));
      }
      id = target;
    }
    const ab = ABILITIES[id];
    const cd = f.cdLeft(id);
    const gcd = ab.gcd ? gcdNow(f) : 0;
    const wait = Math.max(cd, gcd);
    const use = ab.item && f.c.uses[ab.item];
    const fullCd = ab.cd || ab.stanceCd || (use && Math.max(use.cd, use.ccd)) || f.gcdFor(id);
    const total = cd >= gcd ? fullCd : f.started ? f.gcdFor(id) : (state.prepullGcd || {}).total || f.gcdFor(id);
    btn.querySelector('.cd').style.setProperty('--p', wait > 0 ? Math.min(1, wait / total) : 0);
    btn.querySelector('.cdt').textContent = cd > 1.5 ? (cd >= 60 ? Math.ceil(cd / 60) + 'm' : Math.ceil(cd)) : '';
    const cost = f.cost(id);
    btn.querySelector('.cost').textContent = cost ? Math.round(cost) : '';
    const reason = f.blocker(id) || '';
    // Overpower and the Battle Stance button light up while the Overpower window is open.
    // A stance macro is usable when its spell would be after the swap, so it is not greyed out for the stance.
    const viaMacro = !!macroId;
    const proc = opReady && (id === 'overpower' || (id === 'battleStance' && f.stance !== 'battle'));
    const unusable = !proc && ((ab.talent && !f.tal[ab.talent]) || (ab.item && !use) || (ab.racial && !f.racial.active) ||
      (reason.startsWith('Must be in') && !viaMacro) || reason.startsWith('Already in') || reason.startsWith('Only one') ||
      reason === "Can't do that while in combat" || (HUD && HUD.unusable(reason)) ||
      (id === 'execute' && !f.executePhase()) || (id === 'overpower' && !opWindow));
    btn.classList.toggle('unusable', !!unusable);
    // Fojji icon states: desaturated on cooldown (not for the GCD alone), red tint out of range: a melee ability out of
    // melee range in the fight, anything too far or (a hunter's shot) too close.
    btn.classList.toggle('oncd', cd > 0 && cd > gcd);
    btn.classList.toggle('oor', (isMelee(id) && f.started && !f.inMelee()) || reason === 'Out of range' || reason === 'Target is too close');
    btn.classList.toggle('no-rage', !unusable && !proc && f.rage < cost);
    btn.classList.toggle('proc', !!proc);
    btn.classList.toggle('ready-glow', id === 'execute' && f.executePhase() && f.rage >= cost);
    // Always a real boolean: toggle() with undefined flips the class every frame (the buttons blinked).
    btn.classList.toggle('queued', f.queued === id || (!!ab.stance && f.stance === ab.stance) || (!!ab.aspect && f.aspect === id)); // the stance or aspect you hold
  });

  drawFojjiExtras(f, opWindow, opReady);
  drawHudFrames(f);

  // Player buffs: class auras plus item / consumable auras.
  const buffs = $('#buffs');
  // The Revenge window opens for any warrior who dodges or parries; only a tank spec shows it. An aura the popups
  // show is not shown twice.
  const shown = state.popupAuras || new Set();
  const active = Object.keys(f.auras).filter((id) => f.aura(id) && (AURAS[id] || f.auras[id].icon) && (id !== 'revengeWindow' || SPECS[SPEC].tank) && !shown.has(id));
  if (buffs.dataset.ids !== active.join()) {
    buffs.innerHTML = '';
    for (const id of active) {
      const a = f.auras[id];
      const info = AURAS[id] || { name: a.name, icon: a.icon };
      const d = document.createElement('div');
      d.className = 'buff';
      d.dataset.id = id;
      d.dataset.tt = `aura:${id}`;
      d.appendChild(iconImg(info.icon, info.name));
      d.insertAdjacentHTML('beforeend', '<span class="t"></span><span class="n"></span>');
      buffs.appendChild(d);
    }
    buffs.dataset.ids = active.join();
  }
  buffs.querySelectorAll('.buff').forEach((d) => {
    const a = f.aura(d.dataset.id);
    if (!a) return;
    const left = a.end - f.t;
    d.querySelector('.t').textContent = !Number.isFinite(left) ? '' : left >= 60 ? Math.ceil(left / 60) + 'm' : Math.ceil(left);
    d.querySelector('.n').textContent = a.stacks > 1 ? a.stacks : '';
  });

  // Targets.
  const hp = f.healthPct();
  document.querySelectorAll('.target-frame').forEach((fr, i) => {
    const t = f.targets[i];
    // An add has its own health, and its frame only while it is out.
    // No target (Escape): no target frame either.
    fr.style.display = (t.add && t.dead) || f.targetless ? 'none' : '';
    if ((t.add && t.dead) || f.targetless) return;
    const hpi = t.add ? f.healthPct(i) : hp;
    const bar = fr.querySelector('.health');
    bar.querySelector('.fill').style.width = `${hpi * 100}%`;
    bar.querySelector('span').textContent = `${(hpi * 100).toFixed(1)}%`;
    bar.classList.toggle('execute', hpi <= 0.2);
    fr.classList.toggle('primary', i === f.primary);
    const castBar = fr.querySelector('.cast');
    const c = state.encounter && state.encounter.casting;
    castBar.classList.toggle('hidden', !c);
    if (c) {
      castBar.querySelector('.fill').style.width = `${Math.min(1, (f.t - c.start) / (c.end - c.start)) * 100}%`;
      castBar.querySelector('span').textContent = c.name;
    }
    const dist = f.geo.dist[i];
    // A hunter's range zone (melee, dead zone, ranged, out of range) in its colour, with a gauge under the frame.
    const zone = f.rangeZone ? f.rangeZone(i) : null;
    const range = zone ? `<span class="zone-${zone}">${dist.toFixed(1)} yd · ${RANGE_ZONE_NAMES[zone]}</span>`
      : dist <= 5 ? `<span class="good">${dist.toFixed(1)} yd · melee</span>` : `<span class="bad">${dist.toFixed(1)} yd</span>`;
    if (zone) drawRangeGauge(fr, dist, zone);
    // In front is where a tank stands; a DPS standing there gets parried. "on you": the target attacks you.
    const tanking = f.o.tank && f.hasAggro(i);
    const side = f.geo.inFront[i] ? (tanking ? '<span class="good">in front · on you</span>' : '<span class="bad">in front (parry)</span>')
      : tanking ? '<span class="bad">behind · turn it to you</span>' : '<span class="good">behind</span>';
    const where = `${range}${side}`;
    const whereEl = fr.querySelector('.where');
    if (whereEl.innerHTML !== where) whereEl.innerHTML = where;
    drawTargetOfTarget(fr.querySelector('.tot'), totOf(f, i));
    // Raid debuffs (from other players) show too, without a timer.
    const debuffs = i === 0 || !state.encounter ? f.c.raidDebuffs.map((d) => ({ ...d, left: Infinity, n: 0, tt: `debuff:raid:${d.key}` })) : [];
    if (HUD) for (const d of HUD.targetDebuffs(f, t)) debuffs.push({ ...d, n: d.n || 0, tt: `debuff:${d.kind}:${i}` });
    if (t.sunderEnd > f.t) debuffs.unshift({ name: `Sunder Armor (${t.sunder})`, icon: 'ability_warrior_sunder', left: t.sunderEnd - f.t, n: t.sunder, tt: `debuff:sunder:${i}` });
    if (f.own(t).rendEnd > f.t) debuffs.push({ name: 'Rend', icon: 'ability_gouge', left: f.own(t).rendEnd - f.t, n: 0, tt: `debuff:rend:${i}` });
    if (t.shatterEnd > f.t) debuffs.push({ name: 'Armor Shatter', icon: 'inv_axe_12', left: t.shatterEnd - f.t, n: t.shatter, tt: `debuff:shatter:${i}` });
    if (t.tcEnd > f.t) debuffs.push({ name: 'Thunder Clap', icon: 'spell_nature_thunderclap', left: t.tcEnd - f.t, n: 0, tt: `debuff:thunderClap:${i}` });
    if (t.demoEnd > f.t) debuffs.push({ name: 'Demoralizing Shout', icon: 'ability_warrior_warcry', left: t.demoEnd - f.t, n: 0, tt: `debuff:demoralizingShout:${i}` });
    const deb = fr.querySelector('.debuffs');
    const leftText = (s) => (Number.isFinite(s) ? Math.ceil(s) : '');
    const key = debuffs.map((d) => `${d.name}${d.n}:${leftText(d.left)}`).join();
    if (deb.dataset.key !== key) {
      deb.dataset.key = key;
      deb.innerHTML = '';
      for (const db of debuffs) {
        const d = document.createElement('div');
        d.className = 'buff';
        d.dataset.tt = db.tt;
        d.appendChild(iconImg(db.icon, db.name));
        d.insertAdjacentHTML('beforeend', `<span class="t">${leftText(db.left)}</span><span class="n">${db.n > 1 ? db.n : ''}</span>`);
        deb.appendChild(d);
      }
    }
  });

  if (now - state.lastMeterDraw > 250) {
    state.lastMeterDraw = now;
    drawMeter();
    drawReview();
  }
}

// The colour of a caster's spell pose (world/spell-animation.js): the spell's school, else the class's own; null for
// what is not a spell (shots, melee abilities, items, racials, stances, the pet bar) and for the classes that fight
// with weapons (warrior, rogue, hunter, a feral druid).
const SPELL_SCHOOLS = new Set(['fire', 'frost', 'arcane', 'nature', 'holy', 'shadow']);
const CLASS_SPELL_COLOR = { mage: 'arcane', priest: 'shadow', warlock: 'shadow', shaman: 'nature', druid: 'nature', paladin: 'holy' };
// Spells without a damage school of their own whose look is not their class's colour (a priest's Holy buffs, a mage's
// Fire and Frost ones). For the look only: the fight never reads these.
const LOOK_SCHOOL = {
  powerInfusion: 'holy', innerFocus: 'holy', desperatePrayer: 'holy', elunesGrace: 'holy',
  combustion: 'fire', iceBarrier: 'frost', iceBlock: 'frost', coldSnap: 'frost', mageArmor: 'frost',
};
const schoolOf = (id, ab) => LOOK_SCHOOL[id] || ab.school;
function spellColor(id) {
  const ab = ABILITIES[id];
  if (!ab || !CLASS_SPELL_COLOR[CLASS_ID] || VARIANT === 'feral') return null;
  if (ab.item || ab.racial || ab.melee || ab.shot || ab.weapon || ab.stance || ab.nextMelee || ab.petCommand || ab.petSpell) return null;
  const school = schoolOf(id, ab);
  return SPELL_SCHOOLS.has(school) ? school : CLASS_SPELL_COLOR[CLASS_ID];
}

// ---- spell and ability visuals (world/spell-fx.js) --------------------------------------------------------
// Beyond the pose: a bolt to the target for a spell as it lands, a puff for a tick of damage over time, a beam while you
// channel on one target, an area on the ground, a nova around you, an arc for a melee ability, motes for a heal.
const BEAMS = new Set(['mindFlay', 'drainLife', 'drainSoul', 'wrack']);
const MISSILES = new Set(['arcaneMissiles', 'penance']);
const AREA_LOOK = { blizzard: 'blizzard', flamestrike: 'fire', rainOfFire: 'fire', hurricane: 'hurricane', hellfire: 'hellfire', volley: 'volley' };
const BLEEDS = new Set(['rend', 'deepWounds', 'rupture', 'garrote', 'rake', 'rip', 'lacerate', 'pounce']);
const WHITE = new Set(['mh', 'oh', 'windfury', 'extra', 'auto', 'autoShot', 'wand']);
let landed = null; // the ability that just landed: its damage is its hit, not a tick
function fxColor(key) {
  const id = key.replace(/Dot$/, '');
  const ab = ABILITIES[id];
  const school = ab && schoolOf(id, ab);
  if (ab && FX_COLORS[school] && school !== 'physical') return FX_COLORS[school];
  return CLASS_SPELL_COLOR[CLASS_ID] && VARIANT !== 'feral' ? FX_COLORS[CLASS_SPELL_COLOR[CLASS_ID]] : FX_COLORS.physical;
}
let chainFx = null; // the last target Chain Lightning hit, for its next jump's visual
function spellVisual(ev) {
  const fx = state.arena && state.arena.spellFx;
  const f = state.fight;
  if (!fx || !f) return;
  const ab = ABILITIES[ev.id];
  switch (ev.type) {
    case 'castStart':
      if (!ab || !ab.channel) return;
      if (AREA_LOOK[ev.id]) fx.area(ab.ground ? f.primary : null, AREA_LOOK[ev.id], ab.radius || 8, Math.max(0.1, ev.end - f.t));
      else if (BEAMS.has(ev.id)) fx.beam(f.primary, fxColor(ev.id), Math.max(0.1, ev.end - f.t));
      return;
    case 'castEnd':
      if (ev.cancelled) { fx.stopBeams(); return; }
      landed = { id: ev.id, t: f.t };
      // Flamestrike: the area burns on.
      if (ab && ab.ground && ab.burn) fx.area(f.primary, AREA_LOOK[ev.id] || 'fire', ab.radius, ab.burn.period * ab.burn.ticks);
      return;
    case 'cast':
      if (!ab) return;
      if (!ab.channel && !(f.castTime && f.castTime(ev.id) > 0)) landed = { id: ev.id, t: f.t };
      if (ab.radius && !ab.ground && !ab.channel && ab.gcd) fx.nova(fxColor(ev.id), ab.radius);
      return;
    case 'heal': fx.heal(); return;
    case 'damage': {
      if (!(ev.amount > 0) || PET_KEYS.has(ev.key) || WHITE.has(ev.key) || ev.key.startsWith('proc')) return;
      const key = ev.key;
      const a = ABILITIES[key];
      const color = fxColor(key);
      const crit = ev.outcome === 'crit';
      const justLanded = landed && landed.id === key && f.t - landed.t < 0.06;
      if (key === 'starshards') fx.star(ev.target, color);
      // Chain Lightning: from your hands to the target, then from each target hit to the next.
      else if (key === 'chainLightning' && justLanded) {
        const from = chainFx && f.t - chainFx.t < 0.06 ? fx.body(chainFx.i) : null;
        chainFx = { i: ev.target, t: f.t };
        fx.bolt(ev.target, color, { crit, from, speed: 60, size: 0.12 });
      }
      else if (MISSILES.has(key)) fx.bolt(ev.target, color, { size: 0.1, speed: 32, crit });
      else if (BEAMS.has(key) || AREA_LOOK[key] || key.endsWith('Dot')) fx.tick(ev.target, color);
      else if (BLEEDS.has(key)) { if (justLanded) fx.slash(ev.target, FX_COLORS.bleed, crit); else fx.tick(ev.target, FX_COLORS.bleed); }
      else if (!a || (a.shot && !AREA_LOOK[key])) return;
      else if (spellColor(key) || (a.school && a.school !== 'physical' && !a.melee)) {
        if (!justLanded) fx.tick(ev.target, color);
        else if (a.radius) fx.impact(fx.body(ev.target) || state.arena.player.position, color, crit);
        else fx.bolt(ev.target, color, { crit });
      } else fx.slash(ev.target, a.school && a.school !== 'physical' ? color : FX_COLORS.physical, crit);
      return;
    }
    default:
  }
}

// A channel's ticks on the cast bar: a line at each tick but the last (the bar's end).
function drawCastTicks(ticks) {
  const bar = $('#cast-bar');
  if (bar.dataset.ticks === String(ticks)) return;
  bar.dataset.ticks = String(ticks);
  bar.querySelectorAll('.tick').forEach((e) => e.remove());
  for (let k = 1; k < ticks; k++) {
    const line = document.createElement('i');
    line.className = 'tick';
    line.style.left = `${(k / ticks) * 100}%`;
    bar.appendChild(line);
  }
}

// A hunter's swing bar: Auto Shot's reload (blue: moving is safe), then its 0.5 s aim in the red zone at the bar's
// end (stand still: moving cancels the shot), red while a move holds a due shot, a red flash when a move cut an aim;
// in melee range the melee weapon's swing. The five-second rule moves to the thin bar above it.
function drawHunterSwing(f) {
  const s = f.swingState();
  const fill = $('#mh-fill');
  const bar = fill.parentElement;
  let aim = bar.querySelector('.aim');
  if (!aim) { aim = document.createElement('i'); aim.className = 'aim'; bar.insertBefore(aim, fill.nextSibling); }
  const t = f.t;
  let prog = 0;
  let state = '';
  let text = s.kind === 'melee' ? 'Melee' : 'Auto Shot';
  if (f.started && !f.over) {
    if (s.kind === 'melee') {
      prog = 1 - Math.max(0, s.next - t) / s.dur;
      state = 'melee';
      text = `Melee ${secs(Math.max(0, s.next - t))}`;
    } else if (s.held) {
      prog = 1;
      state = 'held';
      text = 'Moving · Auto Shot waits';
    } else {
      prog = 1 - Math.max(0, s.fire - t) / s.dur;
      state = s.aiming ? 'aiming' : 'reload';
      text = s.aiming ? 'Aiming · stand still' : `Auto Shot ${secs(Math.max(0, s.fire - t))} · free to move`;
    }
    if (s.clippedAt != null && t - s.clippedAt < 0.7) { state = 'clipped'; text = 'Moved · Auto Shot clipped'; }
  }
  bar.dataset.state = state;
  aim.style.width = s.kind === 'ranged' ? `${Math.min(1, s.aim / s.dur) * 100}%` : '0';
  fill.style.width = `${Math.max(0, Math.min(1, prog)) * 100}%`;
  $('#mh-text').textContent = text;
  if (HUD && HUD.fiveSecondRule) {
    $('#oh-bar').classList.remove('hidden');
    $('#oh-fill').style.width = `${(Math.max(0, (f.fsrEnd || 0) - t) / 5) * 100}%`;
  }
}

// A hunter's range zones: the name on the target frame, and a 0-40 yard gauge under it (melee to 5, the dead zone to
// 8, Auto Shot to 35, out of range past it) with a marker where you stand.
const RANGE_ZONE_NAMES = { melee: 'melee', dead: 'dead zone', ranged: 'ranged', out: 'out of range' };
const GAUGE_YARDS = 40;
function drawRangeGauge(fr, dist, zone) {
  let g = fr.querySelector('.range-gauge');
  if (!g) {
    g = document.createElement('div');
    g.className = 'range-gauge';
    const seg = (cls, from, to) => `<i class="${cls}" style="left:${(from / GAUGE_YARDS) * 100}%;width:${((to - from) / GAUGE_YARDS) * 100}%"></i>`;
    g.innerHTML = `${seg('melee', 0, 5)}${seg('dead', 5, 8)}${seg('ranged', 8, 35)}${seg('out', 35, GAUGE_YARDS)}<b></b>`;
    fr.appendChild(g);
  }
  g.dataset.zone = zone;
  g.querySelector('b').style.left = `${(Math.min(dist, GAUGE_YARDS) / GAUGE_YARDS) * 100}%`;
}

// Abilities that need melee range (their icons take Fojji's red out-of-range tint).
const MELEE_ACTIONS = new Set(['bloodthirst', 'whirlwind', 'execute', 'heroicStrike', 'cleave', 'overpower', 'rend', 'hamstring', 'sunderArmor',
  'mortalStrike', 'slam', 'spearingStrike', 'shieldSlam', 'revenge', 'concussionBlow', 'shieldBash', 'thunderClap']);

// Fills a row of Fojji icons ({ icon, name, text, n, cls }) only when what it shows changed.
function fillIcons(row, items) {
  const key = items.map((x) => `${x.icon}|${x.text}|${x.n || ''}|${x.cls || ''}|${x.key || ''}`).join();
  if (row.dataset.key === key) return;
  row.dataset.key = key;
  row.innerHTML = '';
  for (const x of items) {
    const d = document.createElement('div');
    d.className = `buff ${x.cls || ''}`;
    if (x.tt) d.dataset.tt = x.tt; else d.title = x.name;
    d.appendChild(iconImg(x.icon, x.name));
    d.insertAdjacentHTML('beforeend', `<span class="t">${x.text ?? ''}</span><span class="n">${x.n > 1 ? x.n : ''}</span>${x.key ? `<span class="k">${esc(x.key)}</span>` : ''}`);
    row.appendChild(d);
  }
}

const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);

// The Fojji pieces around the class stack: Overpower proc claws beside the character, popup icons, the
// target debuff row and the Battle Shout reminder above.
function drawFojjiExtras(f, opWindow, opReady) {
  if (!IS_WARRIOR) { drawClassExtras(f); return; }
  // Proc textures: both claws drain from the top as the Overpower window runs out.
  const opLeft = opReady ? opWindow.end - f.t : 0;
  for (const el of [$('#proc-l'), $('#proc-r')]) {
    el.classList.toggle('on', !!opReady);
    if (opReady) el.style.setProperty('--fill', Math.max(0, Math.min(1, opLeft / ABILITIES.overpower.window)));
  }

  // Popup icons: Overpower usable (any stance), Execute usable, Battle Shout running out.
  const popups = [];
  // Outside Battle Stance the popup shows the Battle Stance key in its corner.
  if (opReady) popups.push({ icon: ABILITIES.overpower.icon, name: 'Overpower usable', text: secs(opLeft), cls: 'glow', key: f.stance === 'battle' ? '' : shortKey(state.binds.battleStance), tt: 'spell:overpower' });
  if (f.executePhase() && f.rage >= f.cost('execute')) popups.push({ icon: ABILITIES.execute.icon, name: 'Execute usable', text: '', cls: 'glow', tt: 'spell:execute' });
  // Revenge usable (tank specs): you blocked, dodged or parried in the last 5 s and it is off cooldown.
  const rev = SPECS[SPEC].tank && f.aura('revengeWindow');
  if (rev && f.cdLeft('revenge') < rev.end - f.t) popups.push({ icon: ABILITIES.revenge.icon, name: 'Revenge usable', text: secs(rev.end - f.t), cls: 'glow', key: f.stance === 'defensive' ? '' : shortKey(state.binds.defensiveStance), tt: 'spell:revenge' });
  const shout = f.aura('battleShout');
  const ownShoutCounts = (f.c.externalShout || 0) < ABILITIES.battleShout.ap;
  if (shout && ownShoutCounts && shout.end - f.t < 10) popups.push({ icon: ABILITIES.battleShout.icon, name: 'Battle Shout expiring', text: secs(shout.end - f.t), tt: 'aura:battleShout' });
  showPopups(popups);

  // Target debuffs: Sunder Armor (yours and the raid's), Rend, Armor Shatter.
  const t = f.target;
  const debuffs = [];
  if (t.sunderEnd > f.t) debuffs.push({ icon: ABILITIES.sunderArmor.icon, name: 'Sunder Armor', text: secs(t.sunderEnd - f.t), n: t.sunder, tt: 'debuff:sunder' });
  if (f.own(t).rendEnd > f.t) debuffs.push({ icon: ABILITIES.rend.icon, name: 'Rend', text: secs(f.own(t).rendEnd - f.t), tt: 'debuff:rend' });
  if (t.shatterEnd > f.t) debuffs.push({ icon: 'inv_axe_12', name: 'Armor Shatter', text: secs(t.shatterEnd - f.t), n: t.shatter, tt: 'debuff:shatter' });
  if (t.tcEnd > f.t) debuffs.push({ icon: ABILITIES.thunderClap.icon, name: 'Thunder Clap', text: secs(t.tcEnd - f.t), tt: 'debuff:thunderClap' });
  if (t.demoEnd > f.t) debuffs.push({ icon: ABILITIES.demoralizingShout.icon, name: 'Demoralizing Shout', text: secs(t.demoEnd - f.t), tt: 'debuff:demoralizingShout' });
  fillIcons($('#fj-debuffs'), debuffs);

  // Reminder: Battle Shout missing in combat (and no stronger shout from the raid).
  const missing = f.started && !f.over && !shout && ownShoutCounts;
  fillIcons($('#fj-reminders'), missing ? [{ icon: ABILITIES.battleShout.icon, name: 'Battle Shout missing', text: '', cls: 'remind', tt: 'spell:battleShout' }] : []);
}

// Combo points: five pips on top of the energy bar (Fojji Rogue UI: Combo Point 1-5, 47.6 x 10 each).
function drawComboPoints(cp) {
  const el = $('#fj-combo');
  el.classList.remove('hidden');
  if (el.dataset.cp === String(cp)) return;
  el.dataset.cp = String(cp);
  el.querySelectorAll('i').forEach((pip, k) => pip.classList.toggle('on', k < cp));
  el.classList.toggle('full', cp >= 5);
}

// The info line under the bars: what a warrior's stance is there for, for another class (in stealth or not).
function stanceLine(f) {
  if (CLASS_ID === 'rogue') return f.aura('stealth') ? 'Stealth' : `${Math.floor(f.energy)} energy · ${f.cp} combo`;
  if (VARIANT === 'feral') return `${Math.floor(f.power)} ${f.resourceName.toLowerCase()}${f.cat ? ` · ${f.cp} combo` : ''} · ${Math.round((f.mana / Math.max(1, f.maxMana)) * 100)}% mana`;
  if (CLASS_ID === 'warlock') return `${Math.round((f.mana / Math.max(1, f.maxMana)) * 100)}% mana · ${f.shards} Soul Shards`;
  if (CLASS_ID === 'hunter' && f.pet) return `${Math.round((f.mana / Math.max(1, f.maxMana)) * 100)}% mana · ${f.pet.name} ${Math.floor(f.pet.focus)} focus · ${f.hawksUp()} hawks`;
  if (CLS.resource === 'mana') return `${Math.round((f.mana / Math.max(1, f.maxMana)) * 100)}% mana`;
  return CLS.name;
}

// The movable frames (js/hud-frames.js): the trinket bar (built with the action bars; lit while a buff is up), a
// shaman's totem bars, and every buff you have: the fight's auras with their timers, then the raid buffs, blessings
// and consumables of your raid setup, which last the fight.
function drawHudFrames(f) {
  // The trinket bar's buttons glow while their buff is up.
  for (const btn of $('#hf-trinkets').querySelectorAll('.ab')) btn.classList.toggle('up', !!f.aura(btn.dataset.id));

  const totems = $('#hf-totems');
  const list = f.totems ? Object.entries(f.totems).filter(([, t]) => t && t.end > f.t) : [];
  const key = list.map(([slot, t]) => `${slot}:${t.id}`).join();
  if (totems.dataset.key !== key) {
    totems.dataset.key = key;
    totems.innerHTML = list.map(([slot, t]) => `<div class="hf-totem ${slot}" data-tt="spell:${t.id}"><img src="${iconUrl(ABILITIES[t.id].icon)}" alt=""><div class="tb"><i></i><span><b>${esc(ABILITIES[t.id].name)}</b><em></em></span></div></div>`).join('');
  }
  list.forEach(([, t], i) => {
    const row = totems.children[i];
    if (!row) return;
    const left = t.end - f.t;
    row.querySelector('i').style.width = `${Math.max(0, Math.min(1, left / Math.max(1, t.end - (t.start ?? 0)))) * 100}%`;
    row.querySelector('em').textContent = secs(left);
  });

  const all = Object.keys(f.auras).filter((id) => f.aura(id) && (AURAS[id] || f.auras[id].icon) && id !== 'revengeWindow').map((id) => {
    const a = f.auras[id];
    const info = AURAS[id] || { name: a.name, icon: a.icon };
    return { icon: info.icon, name: info.name, text: secs(a.end - f.t), n: a.stacks, tt: `aura:${id}` };
  });
  fillIcons($('#hf-allbuffs'), [...all, ...staticBuffs()]);
  // The aura bar: the paladin aura in force lit.
  for (const btn of $('#hf-aurabar').querySelectorAll('.ab')) btn.classList.toggle('on', !!f.aura(btn.dataset.id));

  // The pet bar: the command and the mode in force lit, the spells on autocast marked.
  const p = f.pet;
  if (p) {
    for (const btn of $('#hf-petbar').querySelectorAll('.ab')) {
      const ab = ABILITIES[btn.dataset.id];
      if (!ab) continue;
      const cmd = ab.petCommand;
      const on = ab.petMode ? p.mode === cmd : cmd === 'attack' ? p.engaged : cmd === 'follow' ? !p.engaged && !p.stay : cmd === 'stay' ? p.stay : false;
      btn.classList.toggle('on', on);
      if (ab.petSpell) btn.classList.toggle('autocast', !!p.autocast[btn.dataset.id]);
    }
  }
}

// Your raid setup's buffs and consumables as icons (they last the fight), kept until the loadout changes.
function staticBuffs() {
  const lo = fightLoadout();
  const key = JSON.stringify([lo.raidBuffs, lo.partyBuffs, lo.buffs, lo.consumables]);
  if (state.staticBuffs && state.staticBuffs.key === key) return state.staticBuffs.list;
  const list = [];
  for (const group of BUFF_GROUPS) {
    if (group.source === 'debuffs') continue;
    for (const [k, def] of Object.entries(group.buffs)) {
      const lvl = Math.min(effectLevel((lo[group.source] || {})[k]), def.levels);
      if (lvl) list.push({ icon: def.icon, name: def.levelNames ? def.levelNames[lvl - 1] : def.name, text: '', tt: `buff:${group.source}:${k}` });
    }
  }
  const cons = lo.consumables || {};
  for (const id of [cons.flaskId, ...(cons.elixirIds || []), cons.foodId, cons.mhImbueId, cons.ohImbueId]) {
    const c = id && DB.consumables.find((x) => x.id === id);
    if (c) list.push({ icon: consumableIcon(c), name: c.n, text: '', tt: `cons:${c.id}` });
  }
  state.staticBuffs = { key, list };
  return list;
}

// The popup icons over the bars; an aura shown there is left out of the buff row (state.popupAuras).
function showPopups(list) {
  state.popupAuras = new Set(list.map((p) => /^aura:(.+)$/.exec(p.tt || '')).filter(Boolean).map((m) => m[1]));
  fillIcons($('#fj-popups'), list);
}

// The class's Fojji pieces (js/classes/<class>/hud.js): popups, target debuffs, reminders and the proc textures.
function drawClassExtras(f) {
  const x = HUD ? HUD.extras(f, { shortKey, binds: state.binds }) : { popups: [], debuffs: [], reminders: [], proc: 0 };
  for (const el of [$('#proc-l'), $('#proc-r')]) {
    el.classList.toggle('on', x.proc > 0);
    if (x.proc > 0) el.style.setProperty('--fill', x.proc);
  }
  showPopups(x.popups);
  fillIcons($('#fj-debuffs'), x.debuffs);
  fillIcons($('#fj-reminders'), x.reminders);
}

// Fojji sizes are for a 1440p screen; --s scales them (and the offsets) to the window. The unit frames are
// 285 wide like the EllesmereUI profile, narrower when the window has no room for them beside the bars.
function scaleHud() {
  const s = Math.max(0.85, Math.min(1.5, window.innerHeight / 900));
  document.documentElement.style.setProperty('--s', s.toFixed(3));
  // The buffs frame starts under the top bar, however tall it wraps.
  const top = document.querySelector('.topbar');
  if (top) document.documentElement.style.setProperty('--hf-top', `${Math.round(top.getBoundingClientRect().bottom + 8)}px`);
  const bars = $('#action-bar');
  const stances = $('#fj-stances');
  if (!bars || !stances) return;
  const gap = 16 * s;
  const room = (window.innerWidth - bars.offsetWidth) / 2 - gap - stances.offsetWidth - 8 * s - 12;
  document.documentElement.style.setProperty('--fw', `${Math.round(Math.max(150, Math.min(285 * s, room)))}px`);
}

// Meter rows with their key, biggest first.
function meterRows(f) {
  return Object.entries(f.meter).filter(([, m]) => m.damage > 0).sort((a, b) => b[1].damage - a[1].damage)
    .map(([key, m]) => ({ key, ...m }));
}

const meterIcon = (key, src) => `<img class="mi" src="${iconUrl(iconFor(key, src))}" alt="" onerror="this.style.visibility='hidden'">`;

// Meter numbers the EUI way: 12.3K above ten thousand.
const fmtShort = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : fmtNum(n));
// Spec icons for the players' meter rows (member info spec: "Fury Warrior").
const SPEC_ICONS = { Fury: 'ability_warrior_innerrage', Arms: 'ability_warrior_savageblow', Protection: 'ability_warrior_defensivestance',
  Assassination: 'ability_rogue_eviscerate', Combat: 'ability_backstab', Subtlety: 'ability_stealth',
  Arcane: 'spell_holy_magicalsentry', Fire: 'spell_fire_firebolt02', Frost: 'spell_frost_frostbolt02',
  Retribution: 'spell_holy_auraoflight', Holy: 'spell_holy_searinglight', Shadow: 'spell_shadow_shadowwordpain', Elemental: 'spell_nature_lightning', Enhancement: 'spell_nature_lightningshield', Balance: 'spell_nature_starfall',
  Marksmanship: 'ability_marksmanship', Survival: 'ability_hunter_swiftstrike', Affliction: 'spell_shadow_deathcoil', Demonology: 'spell_shadow_metamorphosis', Destruction: 'spell_shadow_rainoffire',
  'Feral Cat': 'ability_druid_catform', 'Feral Bear': 'ability_racial_bearform', 'Beast Mastery': 'ability_hunter_beasttaming' };
const specIcon = (spec) => { const w = String(spec || '').split(' '); return SPEC_ICONS[w.slice(0, 2).join(' ')] || SPEC_ICONS[w[0]] || 'inv_misc_questionmark'; };
const classColor = (cls) => CLASS_COLORS[cls] || CLASS_COLORS.warrior;

// One row of an EUI meter: a class-coloured bar `frac` of the way across, the icon, "rank. name" and the value.
function euiRow({ rank, name, value, frac, color, icon, cls = '', title = '' }) {
  return `<li class="${cls}" style="--c:${color}"${title ? ` title="${esc(title)}"` : ''}><div class="bar" style="width:${Math.max(0, Math.min(1, frac)) * 100}%"></div>`
    + `${icon ? `<img class="mi" src="${iconUrl(icon)}" alt="" onerror="this.style.visibility='hidden'">` : ''}`
    + `<span class="nm">${rank ? `<i>${rank}.</i>` : ''}${esc(name)}</span><span class="val">${value}</span></li>`;
}

// ---- healing (js/classes/healer.js, js/engine/raid.js) ------------------------------------------------------

// The raid frames of a healer: the raid with your heals over time, shields and debuffs on them, the heal you are
// casting as a lighter bar, whom you clicked and whom the mouse is over, and the main tank the boss is hitting.
function healerRows(f) {
  const inc = f.incomingHeal();
  const tank = f.raid.units.find((u) => u.role === 'tank' && !f.raid.isDead(u));
  return f.raid.rows().map((r) => ({
    ...r, incoming: inc && (inc.unit === r.id || (inc.unit === 'me' && r.me)) ? inc.amount : 0, selected: state.friendlyTarget === r.id,
    // In a group the players' aggro is the group's; alone the boss is on the first living tank.
    hover: state.mouseoverUnit === r.id, aggro: f.raid.group ? r.aggro : f.started && !f.over && tank && tank.id === r.id,
  }));
}

// A healer's events: heals and dispels shown on the raid frames, deaths and the raid's big hits called out.
function healerEvent(ev) {
  if (ev.type === 'raidHeal' && ev.amount > 0) state.raidFrames.flash(ev.unit, `+${fmtNum(ev.amount)}`, ev.crit ? 'crit' : ev.absorb ? 'absorb' : '');
  else if (ev.type === 'dispel') state.raidFrames.flash(ev.unit, `${ev.name} removed`, 'dispel');
  else if (ev.type === 'raidDeath') raidWarning(`${ev.name} died`);
  else if (ev.type === 'raidAoe') raidWarning(`${ev.name}!`);
}

// The healing meter: your heals, their share and their healing per second; the overhealing in the tooltip.
function drawHealMeter(f) {
  const rows = Object.entries(f.healMeter || {}).map(([key, m]) => ({ key, ...m })).sort((a, b) => b.healing - a.healing);
  const top = rows[0] ? rows[0].healing || 1 : 1;
  const total = f.healTotal || 0;
  const hps = fmtNum(f.hps());
  const pct = (m) => (total ? (m.healing / total) * 100 : 0).toFixed(1);
  $('#dps').textContent = hps;
  $('#live-dps').textContent = hps;
  $('#meter').innerHTML = rows.map((m) => `<li title="${m.count} heals · ${m.crits} crits · ${fmtNum(m.overheal)} overhealing">
      <div class="bg" style="width:${(m.healing / top) * 100}%"></div>
      <span class="mn"><img class="mi" src="${iconUrl(m.icon)}" alt="">${esc(m.name)}</span><span>${fmtNum(f.t > 0 ? m.healing / f.t : 0)} (${pct(m)}%)</span></li>`).join('')
    || '<li><span>No healing yet</span></li>';
  $('#live-meter').classList.remove('hidden');
  const over = total + f.overhealTotal > 0 ? f.overhealTotal / (total + f.overhealTotal) : 0;
  $('#live-meter').innerHTML = rows.slice(0, 7).map((m, i) => euiRow({
    rank: i + 1, name: m.name, icon: m.icon, color: classColor(state.sheet.classId), frac: m.healing / top,
    value: `${fmtShort(f.t > 0 ? m.healing / f.t : 0)} <small>(${pct(m)}%)</small>`, title: `${fmtNum(m.overheal)} overhealing`,
  })).join('') + (total ? `<li class="eui-note"><span class="nm">Overhealing ${(over * 100).toFixed(0)}%</span></li>` : '');
}

function drawMeter() {
  const f = state.fight;
  const g = state.group;
  const inGroup = !!(g && g.active);
  if (IS_HEALER) { drawHealMeter(f); drawThreatMeter(f, inGroup); return; }
  const rows = meterRows(f);
  const top = rows[0] ? rows[0].damage : 1;
  const src = iconSource(f);
  const dps = fmtNum(f.dps());
  $('#dps').textContent = dps;
  $('#live-dps').textContent = dps;
  $('#meter').innerHTML = rows.map((m) => {
    const pct = f.total ? (m.damage / f.total) * 100 : 0;
    const mdps = f.t > 0 ? m.damage / f.t : 0;
    return `<li title="${m.count} hits · ${m.crits} crits · ${m.misses} misses · ${m.dodges} dodges · ${m.glances} glancing">
      <div class="bg" style="width:${(m.damage / top) * 100}%"></div>
      <span class="mn">${meterIcon(m.key, src)}${esc(m.name)}</span><span>${fmtNum(mdps)} (${pct.toFixed(1)}%)</span></li>`;
  }).join('') || '<li><span>No damage yet</span></li>';
  // The damage window: alone, your abilities; in a group only the players (your breakdown is in the results).
  const color = classColor(state.sheet.classId);
  $('#live-meter').classList.toggle('hidden', inGroup);
  if (!inGroup) {
    $('#live-meter').innerHTML = rows.slice(0, 7).map((m, i) => euiRow({
      rank: i + 1, name: m.name, icon: iconFor(m.key, src), color, frac: m.damage / top,
      value: `${fmtShort(f.t > 0 ? m.damage / f.t : 0)} <small>(${(f.total ? (m.damage / f.total) * 100 : 0).toFixed(1)}%)</small>`,
    })).join('');
  }
  drawRace(f, inGroup);
  drawGroupMeter(f, inGroup);
  drawThreatMeter(f, inGroup);
}

// In a group: everyone's DPS this fight in their class colour, biggest first.
function drawGroupMeter(f, inGroup) {
  const ul = $('#group-meter');
  ul.classList.toggle('hidden', !inGroup);
  if (!inGroup) return;
  const rows = state.group.meterRows(state.settings.playerName || 'You', f.started ? f.dps() : 0, f.total);
  const top = Math.max(1, ...rows.map((r) => r.dps));
  const all = rows.reduce((s, r) => s + (r.total || 0), 0) || 1;
  ul.innerHTML = rows.map((r, i) => euiRow({
    rank: i + 1, name: r.name, icon: specIcon(r.spec), color: classColor(r.cls), frac: r.dps / top, cls: r.me ? 'me' : '',
    value: r.dps ? `${fmtShort(r.dps)} <small>(${(((r.total || 0) / all) * 100).toFixed(1)}%)</small>` : '–',
  })).join('');
}

// The threat window, above the damage window while the targets hit back or in a group. Alone: your threat by
// ability. In a group: everyone's threat on your target, as a share of whoever has aggro (shield on their row);
// past 100% you are close to pulling it (110%).
function drawThreatMeter(f, inGroup) {
  const box = $('#threat-box');
  const on = inGroup || f.o.tank;
  box.classList.toggle('hidden', !on);
  if (!on) return;
  $('#live-tps').textContent = fmtNum(f.tps());
  const ul = $('#threat-meter');
  const color = classColor(state.sheet.classId);
  const npcs = !!state.tankBot;
  if (!inGroup && !npcs) {
    const rows = Object.entries(f.threatMeter).filter(([, m]) => m.threat > 0).sort((a, b) => b[1].threat - a[1].threat).slice(0, 5);
    const top = rows[0] ? rows[0][1].threat : 1;
    const src = iconSource(f);
    ul.innerHTML = rows.map(([key, m], i) => euiRow({
      rank: i + 1, name: m.name, icon: iconFor(key, src), color, frac: m.threat / top,
      value: `${fmtShort(f.t > 0 ? m.threat / f.t : 0)} <small>(${((m.threat / (f.threatTotal || 1)) * 100).toFixed(1)}%)</small>`,
    })).join('') || '<li class="empty"><span class="nm">No threat yet</span></li>';
    return;
  }
  // The top eight, and always you: how close you are to pulling it.
  const all = npcs ? npcThreatRows(f, f.primary) : state.group.threatRows(f, f.primary);
  const rows = all.slice(0, 8);
  const me = all.find((r) => r.me);
  if (me && !rows.includes(me)) rows.splice(7, 1, me);
  const top = Math.max(1, ...rows.map((r) => r.threat));
  ul.innerHTML = rows.map((r, i) => euiRow({
    rank: i + 1, name: r.name, icon: r.aggro ? 'ability_warrior_defensivestance' : null, color: classColor(r.cls), frac: r.threat / top,
    cls: `${r.me ? 'me' : ''} ${r.aggro ? 'aggro' : r.pct >= 1 ? 'danger' : ''}`,
    title: r.aggro ? 'Has aggro' : r.pct >= 1 ? 'About to pull aggro (110% in melee, 130% at range)' : '',
    value: `${fmtShort(r.threat)} <small>(${Math.round(r.pct * 100)}%)</small>`,
  })).join('');
}

// The key "your best" is kept under: the fight length and targets, or the encounter.
function bestKey() {
  const s = state.settings;
  const length = s.endMode === 'time' ? `${s.duration}s` : s.endMode === 'health' ? `${s.dummyHealth}hp` : s.endMode;
  const drills = s.moveEvery || s.hitEvery ? `-m${s.moveEvery}x${s.moveFor}-h${s.hitEvery}` : '';
  const spec = SPEC === 'fury' ? '' : `${SPEC}-`; // Fury keeps the keys from before there were specs
  return spec + (s.encounter === 'dummies' ? `${length}-${s.targets}t` : `${s.encounter}-${length}`) + drills;
}

// Race the sim live: you, the sim's ghost fight and your best, with how far ahead or behind the sim you are.
// Not in a group: there the meter lists the players.
function drawRace(f, inGroup) {
  const ul = $('#sim-race');
  const on = state.settings.simRace && state.ghost && !inGroup && !IS_HEALER;
  ul.classList.toggle('hidden', !on);
  if (!on) return;
  const you = f.started ? metricOfFight(f) : 0; // TPS for a tank
  const sim = state.ghost.metric();
  const best = store.get('best', {})[bestKey()] || 0;
  const top = Math.max(you, sim, best, 1);
  const diff = f.started && sim > 0 ? you - sim : 0;
  const lead = diff ? `<i class="${diff >= 0 ? 'ahead' : 'behind'}">${diff >= 0 ? '+' : '−'}${fmtShort(Math.abs(diff))}</i> ` : '';
  const row = (cls, name, v, color, extra = '') => euiRow({ name, color, cls: `race ${cls}`, frac: v / top,
    value: `${extra}${v || (cls === 'you' && f.started) ? fmtShort(v) : '–'}` });
  ul.innerHTML = row('you', `You (${metricName})`, you, classColor(state.sheet.classId), lead)
    + row('sim', state.ghost.started ? 'Sim' : 'Sim (waits for you)', sim, '#6f8cff') + row('best', 'Your best', best, '#8a8a8a');
}

function reviewHtml(f) {
  const r = f.review;
  const cls = (v, warn) => (v > warn ? 'bad' : 'good');
  // A paladin: mana, time without a seal, Judgement ready but unused; tanking, threat and the swings taken.
  if (CLASS_ID === 'paladin') {
    const tank = f.o.tank && SPECS[SPEC].tank;
    return `${tank ? `<dt>Threat per second</dt><dd>${fmtNum(f.tps())}</dd>` : ''}
      <dt>Mana left</dt><dd>${fmtNum(f.mana)} (${Math.round((f.mana / Math.max(1, f.maxMana)) * 100)}%)</dd>
      <dt>Mana lost at full</dt><dd class="${cls(r.manaWasted, 200)}">${fmtNum(r.manaWasted)}</dd>
      <dt>Time without a seal</dt><dd class="${cls(r.sealDown, 3)}">${r.sealDown.toFixed(1)} s</dd>
      <dt>Judgement ready but unused</dt><dd class="${cls(r.judgementIdle, 5)}">${r.judgementIdle.toFixed(1)} s</dd>
      <dt>Main-hand time out of range</dt><dd class="${cls(r.outOfRange, 2)}">${r.outOfRange.toFixed(1)} s</dd>
      ${r.damageTaken ? `<dt>Damage taken</dt><dd>${fmtNum(r.damageTaken)}</dd>` : ''}
      ${tank ? `<dt>Swings missed, dodged or parried</dt><dd>${r.avoided || 0}</dd><dt>Damage blocked</dt><dd>${fmtNum(r.blocked || 0)}</dd>` : ''}`;
  }
  // A caster: mana left, time doing nothing, casts cancelled by moving.
  if (CLS.resource === 'mana') {
    return `<dt>Mana left</dt><dd>${fmtNum(f.mana)} (${Math.round((f.mana / Math.max(1, f.maxMana)) * 100)}%)</dd>
      <dt>Mana lost at full</dt><dd class="${cls(r.manaWasted, 200)}">${fmtNum(r.manaWasted)}</dd>
      <dt>Time not casting</dt><dd class="${cls(r.idle, 3)}">${r.idle.toFixed(1)} s</dd>
      <dt>Casts cancelled</dt><dd class="${cls(r.castsCancelled, 0)}">${r.castsCancelled}</dd>
      ${r.damageTaken ? `<dt>Damage taken</dt><dd>${fmtNum(r.damageTaken)}</dd>` : ''}`;
  }
  // A cat: energy lost at the cap, combo points wasted past 5, time without Rip, mana left for Shifting Power.
  if (VARIANT === 'feral' && f.cat) {
    return `<dt>Energy lost at the cap</dt><dd class="${cls(r.energyWasted, 30)}">${r.energyWasted.toFixed(0)}</dd>
      <dt>Combo points wasted</dt><dd class="${cls(r.cpWasted, 2)}">${r.cpWasted}</dd>
      <dt>Time without Rip</dt><dd class="${cls(r.ripDown, 8)}">${r.ripDown.toFixed(1)} s</dd>
      <dt>Mana left</dt><dd>${fmtNum(f.mana)} (${Math.round((f.mana / Math.max(1, f.maxMana)) * 100)}%)</dd>
      <dt>Attacks parried (stood in front)</dt><dd class="${cls(r.parried, 0)}">${r.parried}</dd>
      <dt>Time out of range</dt><dd class="${cls(r.outOfRange, 2)}">${r.outOfRange.toFixed(1)} s</dd>`;
  }
  // A rogue: energy lost at the cap, combo points wasted past 5, time without Slice and Dice.
  if (CLASS_ID === 'rogue') {
    return `<dt>Energy lost at the cap</dt><dd class="${cls(r.energyWasted, 30)}">${r.energyWasted.toFixed(0)}</dd>
      <dt>Combo points wasted</dt><dd class="${cls(r.cpWasted, 2)}">${r.cpWasted}</dd>
      <dt>Time without Slice and Dice</dt><dd class="${cls(r.sndDown, 4)}">${r.sndDown.toFixed(1)} s</dd>
      <dt>Attacks parried (stood in front)</dt><dd class="${cls(r.parried, 0)}">${r.parried}</dd>
      <dt>Main-hand time out of range</dt><dd class="${cls(r.outOfRange, 2)}">${r.outOfRange.toFixed(1)} s</dd>
      ${r.damageTaken ? `<dt>Damage taken</dt><dd>${fmtNum(r.damageTaken)}</dd>` : ''}`;
  }
  // A bear: threat, rage, what the targets' swings did, Mauls swung.
  if (VARIANT === 'feral') {
    return `<dt>Threat per second</dt><dd>${fmtNum(f.tps())}</dd>
      <dt>Rage lost at 100</dt><dd class="${cls(r.rageWasted, 20)}">${r.rageWasted.toFixed(0)}</dd>
      <dt>Damage taken</dt><dd>${fmtNum(r.damageTaken)}</dd>
      <dt>Swings missed or dodged</dt><dd>${r.avoided || 0}</dd>
      <dt>Rage from damage taken</dt><dd>${r.rageFromDamage.toFixed(0)}</dd>
      <dt>Time out of range</dt><dd class="${cls(r.outOfRange, 2)}">${r.outOfRange.toFixed(1)} s</dd>
      <dt>Maul swings</dt><dd>${r.mauls}</dd>`;
  }
  // A tank: threat, Revenge windows let pass, and what the targets' swings did.
  if (f.o.tank && SPECS[SPEC].tank) {
    return `<dt>Threat per second</dt><dd>${fmtNum(f.tps())}</dd>
      <dt>Revenge windows missed</dt><dd class="${cls(r.revengeMissed || 0, 1)}">${r.revengeMissed || 0}</dd>
      <dt>Rage lost at 100</dt><dd class="${cls(r.rageWasted, 20)}">${r.rageWasted.toFixed(0)}</dd>
      <dt>Damage taken</dt><dd>${fmtNum(r.damageTaken)}</dd>
      <dt>Swings missed, dodged or parried</dt><dd>${r.avoided || 0}</dd>
      <dt>Damage blocked</dt><dd>${fmtNum(r.blocked || 0)}</dd>
      <dt>Rage from damage taken</dt><dd>${r.rageFromDamage.toFixed(0)}</dd>
      <dt>Main-hand time out of range</dt><dd class="${cls(r.outOfRange, 2)}">${r.outOfRange.toFixed(1)} s</dd>
      <dt>Heroic Strike / Cleave swings</dt><dd>${r.hsQueued}</dd>`;
  }
  return `${f.tal.bloodthirst ? `<dt>Bloodthirst ready but unused</dt><dd class="${cls(r.btIdle, 3)}">${r.btIdle.toFixed(1)} s</dd>` : ''}
    <dt>Whirlwind ready but unused</dt><dd class="${cls(r.wwIdle, 3)}">${r.wwIdle.toFixed(1)} s</dd>
    <dt>Rage lost at 100</dt><dd class="${cls(r.rageWasted, 20)}">${r.rageWasted.toFixed(0)}</dd>
    <dt>Rage lost to stance swaps</dt><dd>${r.stanceRageLost.toFixed(0)}</dd>
    <dt>Overpower windows missed</dt><dd>${r.overpowerMissed}</dd>
    <dt>Attacks parried (stood in front)</dt><dd class="${cls(r.parried, 0)}">${r.parried}</dd>
    <dt>Main-hand time out of range</dt><dd class="${cls(r.outOfRange, 2)}">${r.outOfRange.toFixed(1)} s</dd>
    ${r.damageTaken ? `<dt>Damage taken</dt><dd>${fmtNum(r.damageTaken)}</dd>
    <dt>Rage from damage taken</dt><dd>${r.rageFromDamage.toFixed(0)}</dd>
    ${Object.entries(r.hitsTaken).map(([n, c]) => `<dt>Hit by ${esc(n)}</dt><dd class="${['Fire Nova'].includes(n) ? '' : 'bad'}">${c}×</dd>`).join('')}` : ''}
    <dt>Heroic Strike / Cleave swings</dt><dd>${r.hsQueued}</dd>`;
}

function drawReview() {
  $('#review').innerHTML = reviewHtml(state.fight);
}

// Called the moment the fight ends, before a key press can replace state.fight with a new one.
function saveResults() {
  const f = state.fight;
  const s = state.settings;
  const key = bestKey();
  const best = store.get('best', {});
  const dps = metricOfFight(f); // TPS for a tank
  const isBest = !f.dead && (!best[key] || dps > best[key]);
  if (isBest) { best[key] = dps; store.set('best', best); }
  const meta = { encounter: (ENCOUNTERS[s.encounter] || ENCOUNTERS.dummies).name, best: best[key], isBest, when: Date.now(), metric: metricName };
  if (state.ghost && state.ghost.started) {
    state.ghost.advanceTo(f.t);
    meta.simDps = state.ghost.metric();
  }
  state.lastResults = { fight: snapshotResults(f), log: state.fightLog, meta, id: newReportId() };
  state.endedAt = performance.now();
  keepReport(state.lastResults, f);
  // Kept so the last results open again after a reload; without the log if it does not fit.
  try {
    localStorage.setItem('furytrainer.lastResults', JSON.stringify(state.lastResults));
  } catch {
    store.set('lastResults', { ...state.lastResults, log: [] });
  }
  $('#btn-results').disabled = false;
  setTimeout(openResults, 300);
  scoreResults(state.lastResults, f);
}

// ---- scoring ----------------------------------------------------------------------------------

// A short key for "the same setup": the character sheet, the fight options and the APL.
function setupKey(sheet, opts, apl) {
  const text = JSON.stringify([sheet, opts, apl]);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const SCORE_RUNS = 16;
// Setup key -> { source, dps (sorted; for wowsims 201 quantiles of its iterations), runs, avg, skipped };
// the last 20 setups.
const SCORE_CACHE = 'scoreRefs.v4'; // v4: wowsims gets the starting stance

// The game zone wowsims gets, for the Natural flasks' zone bonus. The Barrow Deeps lies beneath Mount Hyjal
// and has no zone of its own in the wowsims database.
function simZoneId() {
  const z = ZONES[state.settings.zone];
  if (!z) return 0;
  return z.gameId || (z.flaskBonus ? ZONES.mountHyjal.gameId : 0);
}

// The reference for a setup: the real wowsims sim (js/wowsims-sim.js); the rotation helper's bot if wowsims
// cannot be reached (offline, or the site changed).
async function scoreReference(f, opts, apl, onProgress) {
  try {
    // wowsims has no "move out every N s" or training hits; with those on, the bot (which does both) is the reference.
    if (opts.moveEvery || opts.hitEvery) throw new Error('moving and training hits are only played by the bot');
    const ws = await wowsimsReference({ loadout: state.loadout, apl, zoneId: simZoneId(), fight: wsFight(opts, f.c) });
    const q = Array.from({ length: 201 }, (_, i) => ws.dps[Math.round((ws.dps.length - 1) * i / 200)]);
    return { source: 'wowsims', dps: q.map((v) => Math.round(v * 10) / 10), runs: ws.iterations, avg: ws.avg, skipped: ws.skipped };
  } catch (e) {
    console.warn('wowsims sim unavailable, scoring against the bot:', e);
    const dps = await botReference({
      sheet: f.c, opts, apl, items: aplItems(), runs: SCORE_RUNS,
      onProgress,
      busy: () => !!(state.fight && state.fight.started && !state.fight.over), // never slow down a fight
    });
    return { source: 'bot', dps: dps.map((v) => Math.round(v * 10) / 10), runs: dps.length, error: String(e.message || e) };
  }
}

// Scores a finished fight like a Warcraft Logs parse (js/score.js): the reference for this setup comes from
// the cache, or is run now in the background while the results show "Scoring...".
async function scoreResults(r, f) {
  if (f.dead || metricOfFight(f) <= 0) return;
  // A fight that did not end by the clock is measured as a timed fight of the same length, with its execute rule.
  // In a group the reference still plays alone (when the targets hit back, it tanks them).
  const opts = { ...f.o, group: false, ...(f.timed ? {} : { end: 'time', duration: Math.max(10, Math.round(f.t)) }) };
  const apl = currentApl().apl;
  const key = setupKey(f.c, { ...opts, zone: state.settings.zone }, apl);
  const refresh = () => {
    if (state.lastResults !== r) return;
    try { localStorage.setItem('furytrainer.lastResults', JSON.stringify(r)); } catch { /* storage full: keep it in memory */ }
    const slot = document.querySelector('#results .parse-slot');
    if (slot && resultsOpen()) slot.innerHTML = parseHtml(r.meta);
  };
  const cache = store.get(SCORE_CACHE, {});
  let ref = cache[key];
  if (!ref) {
    r.meta.scoring = 'running wowsims';
    refresh();
    ref = await scoreReference(f, opts, apl, (done, runs) => { r.meta.scoring = `${done}/${runs}`; refresh(); });
    const fresh = store.get(SCORE_CACHE, {});
    fresh[key] = ref;
    const keys = Object.keys(fresh);
    for (const k of keys.slice(0, Math.max(0, keys.length - 20))) delete fresh[k];
    store.set(SCORE_CACHE, fresh);
  }
  const pct = parsePercent(metricOfFight(f), ref.dps);
  const bests = store.get('bestParse', {});
  const bestPct = Math.max(pct, bests[key] || 0);
  bests[key] = bestPct;
  store.set('bestParse', bests);
  delete r.meta.scoring;
  r.meta.parse = { pct, ...referenceSummary(ref.dps), runs: ref.runs, avg: ref.avg, source: ref.source, skipped: ref.skipped, error: ref.error, bestPct };
  refresh();
  if (r.id) Promise.resolve(reportSaves.get(r.id)).then(() => updateReport(r.id, { parse: pct }, { parse: r.meta.parse })).then(() => maybeUpload(r.id)).catch(() => {});
}

// ---- fight history (history.js) and Numen Logs (logs.html) ------------------------------------------

// A finished fight kept in your history: the results and log, who fought it with what, and what it was. A real
// encounter is a classic boss at its full classic health, fought to the death; at less of it, it is practice.
function fightReport(r, f) {
  const s = state.settings;
  const enc = ENCOUNTERS[s.encounter] || ENCOUNTERS.dummies;
  const toDeath = f.o.end === 'health';
  const specName = `${SPECS[SPEC].name} ${CLS.name}`;
  const value = metricOfFight(f);
  const summary = {
    id: r.id, when: r.meta.when, encounter: s.encounter, encounterName: enc.name, raidName: enc.raid || (enc.lair ? "Onyxia's Lair" : ''),
    real: !!(enc.health && toDeath && f.o.health >= enc.health), bossHpPct: enc.health && toDeath ? Math.round((f.o.health / enc.health) * 100) : null,
    kill: !!(enc.boss && f.targets[0] && f.targets[0].dead), dead: !!f.dead, duration: f.t, metric: metricName, value, dps: f.dps(), tps: f.tps(),
    parse: null, raidSize: raidComp().length, group: !!(state.group && state.group.active), uploaded: null,
    player: { name: s.playerName || 'You', cls: CLASS_ID, spec: SPEC, specName, specIcon: specIcon(specName), race: state.sheet.race },
  };
  return {
    id: r.id, summary, fight: r.fight, log: r.log, meta: r.meta,
    raid: raidComp().map((m) => ({ name: m.name, cls: m.cls, spec: m.label || '', npc: !!m.npc, me: !!m.me })),
    gear: (state.gear || []).map((g) => ({ slot: SLOT_NAMES[g.slot], name: g.name, icon: g.icon, quality: g.quality, enchant: g.enchant || '' })),
  };
}
const reportSaves = new Map(); // report id -> its save, so the parse (scored later) lands after it
function keepReport(r, f) {
  const saved = saveReport(fightReport(r, f)).catch((e) => console.warn('The fight could not be kept in your history:', e));
  reportSaves.set(r.id, saved);
  // A fight that is not scored (you died, or did nothing) goes up as it is; a scored one once it has its score.
  if (f.dead || metricOfFight(f) <= 0) saved.then(() => maybeUpload(r.id));
}

// A real encounter goes up to Numen Logs for the rankings, once a server is set (js/logs/remote.js), unless
// Settings → Fight keeps your logs to yourself.
async function maybeUpload(id) {
  if (!remoteOn() || state.settings.uploadLogs === false) return;
  try {
    const rep = await getReport(id);
    if (!rep || !rep.summary.real || rep.summary.uploaded) return;
    await uploadReport(rep);
    await updateReport(id, { uploaded: Date.now() });
    raidWarning('Your log is up on Numen Logs');
  } catch (e) { console.warn('Numen Logs upload failed:', e); }
}

// The results window's history: your past fights to open again, and the fight in Numen Logs.
async function drawResultsNav(box) {
  const head = box.querySelector('.results-head');
  if (!head) return;
  let nav = head.querySelector('.results-nav');
  if (!nav) { nav = document.createElement('div'); nav.className = 'results-nav'; head.appendChild(nav); }
  let all = [];
  try { all = await listReports(); } catch { /* no IndexedDB (a private window): only the last fight */ }
  const r = state.lastResults;
  const when = (x) => new Date(x.when).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  nav.innerHTML = `<label>Past fights <select>${all.slice(0, 100).map((x) => `<option value="${x.id}"${r && x.id === r.id ? ' selected' : ''}>${esc(when(x))} · ${esc(x.encounterName)} · ${fmtNum(x.value)} ${esc(x.metric)}${x.kill ? ' · kill' : ''}</option>`).join('')}</select></label>`
    + `${r && r.id ? `<a href="logs.html#report/${r.id}" target="_blank" rel="noopener">Open in Numen Logs ↗</a>` : ''}`;
  nav.querySelector('select').addEventListener('change', async (e) => {
    const rep = await getReport(e.target.value);
    if (!rep) return;
    state.lastResults = { fight: rep.fight, log: rep.log || [], meta: { ...rep.meta, isBest: false }, id: rep.id };
    openResults();
  });
}

function loadResults() {
  const r = store.get('lastResults', null);
  if (!r || !r.fight || !r.fight.stats) return;
  r.meta.isBest = false;
  state.lastResults = r;
  $('#btn-results').disabled = false;
}

const resultsOpen = () => !$('#results').classList.contains('hidden');

// The results of the last fight, like the wowsims Results tab.
function openResults() {
  const r = state.lastResults;
  if (!r) return;
  const box = $('#results .results-box');
  renderResults(box, r.fight, r.log, r.meta);
  box.querySelector('[data-close]').addEventListener('click', () => $('#results').classList.add('hidden'));
  $('#results').classList.remove('hidden');
  drawResultsNav(box);
}

// ---- tooltips ---------------------------------------------------------------------------------

const pctText = (x) => `${Math.round(x * 1000) / 10}%`;
const durText = (s) => (s >= 60 ? `${Math.round(s / 6) / 10} min` : `${Math.round(s * 10) / 10} sec`);
const STAT_LABELS = {
  str: 'Strength', agi: 'Agility', sta: 'Stamina', int: 'Intellect', spi: 'Spirit', ap: 'Attack Power', hit: 'Hit Rating',
  crit: 'Crit Rating', haste: 'Haste Rating', arpen: 'Armor Penetration', expertise: 'Expertise Rating', armor: 'Armor',
  bonusArmor: 'Armor', health: 'Health', physDmg: 'Weapon Damage',
};
const STAT_BY_ID = Object.fromEntries(Object.entries(STAT).map(([k, v]) => [v, k]));
// "+25 Agility, +2% Crit" from a wowsims sparse stat list (stat id -> amount).
const sparseStatText = (s) => Object.entries(s || {}).filter(([k]) => STAT_LABELS[STAT_BY_ID[k]]).map(([k, v]) => `+${v} ${STAT_LABELS[STAT_BY_ID[k]]}`);
// The same for an aura's stats as the engine keeps them (str, ap, critRating, hastePct...).
const AURA_STAT_LABELS = { str: 'Strength', agi: 'Agility', ap: 'Attack Power', hitRating: 'Hit Rating', critRating: 'Crit Rating', hasteRating: 'Haste Rating', arpen: 'Armor Penetration' };
const auraStatText = (stats) => Object.entries(stats || {}).map(([k, v]) => (k === 'critPct' ? `+${v}% crit` : k === 'dmgPct' ? `+${v}% damage` : k === 'hastePct' ? `+${v}% attack speed` : AURA_STAT_LABELS[k] ? `+${v} ${AURA_STAT_LABELS[k]}` : null)).filter(Boolean);

// What an item or consumable effect does, read from its spell's effects (the same data the engine uses).
function effectText(fx) {
  if (!fx) return [];
  const sp = DB.spells[fx.b];
  const out = [];
  for (const e of (sp && sp.fx) || []) {
    if (e.t === 'E_ENERGIZE' && e.m === 1) { const mid = e.bp / 10; const half = (mid * (e.v || 0)) / 2; out.push(half ? `Restores ${Math.round(mid - half)} to ${Math.round(mid + half)} rage` : `Restores ${mid} rage`); }
    else if (e.t === 'E_SCHOOL_DAMAGE') out.push(`Deals ${e.bp} ${e.v ? `(±${Math.round(e.v * 50)}%) ` : ''}damage`);
    else if (e.a === 'A_MOD_STAT') out.push(`+${e.bp} ${['Strength', 'Agility', 'Stamina', 'Intellect', 'Spirit'][e.m || 0] || 'to all stats'}`);
    else if (e.a === 'A_MOD_ATTACK_POWER') out.push(`+${e.bp} attack power`);
    else if (e.a === 'A_MOD_CRIT_PCT' || e.a === 'A_MOD_WEAPON_CRIT_PERCENT') out.push(`+${e.bp}% crit`);
    else if (e.a === 'A_MOD_HIT_CHANCE') out.push(e.bp ? `+${e.bp}% hit` : 'hit (no amount in the game data, not counted)');
    else if (/HASTE/.test(e.a || '')) out.push(`+${e.bp}% attack speed`);
    else if (e.a === 'A_MOD_DAMAGE_DONE') out.push(`+${e.bp} spell damage`);
    else if (e.a === 'A_SCHOOL_ABSORB') out.push(`Absorbs ${e.bp} damage`);
  }
  for (const t of sparseStatText(fx.s)) if (!out.includes(t)) out.push(t);
  const ms = fx.d > 0 ? fx.d : sp && sp.d > 0 ? sp.d : 0;
  if (!out.length && sp) out.push(sp.n);
  return [`${out.join(', ')}${ms ? ` for ${durText(ms / 1000)}` : ''}.`];
}

function racialText(r) {
  if (!r) return 'Your race has no offensive racial.';
  const parts = [];
  if (r.apMult) parts.push(`+${pctText(r.apMult - 1)} attack power`);
  if (r.hasteMult) parts.push(`+${pctText(r.hasteMult - 1)} attack speed`);
  if (r.critPct) parts.push(`+${r.critPct}% crit`);
  if (r.costPct) parts.push(`abilities cost ${-r.costPct}% less rage`);
  if (r.damagePct) parts.push(`+${r.damagePct}% ability damage`);
  return `${parts.join(', ')} for ${durText(r.duration)}.`;
}

// Ability descriptions, written from the numbers the engine uses (js/data/warrior.js).
const ABILITY_TEXT = {
  bloodthirst: (a) => `Instantly attack the target for ${a.base} plus ${pctText(a.apCoef)} of your attack power.`,
  whirlwind: (a, f) => `Attack up to ${a.maxTargets} enemies within 8 yards with your main-hand weapon${f && f.tal.ragingBlows ? ', and with your off hand (Raging Blows)' : ''}.`,
  hamstring: (a) => `Maim the enemy for ${a.base} damage and slow its movement. Woven in for Windfury procs.`,
  overpower: (a) => `Instantly overpower the enemy for weapon damage plus ${a.bonus}. Usable for ${a.window} sec after the target dodges. Cannot be dodged, blocked or parried.`,
  rend: (a) => `Wound the target, causing ${a.tickBase} plus ${pctText(a.tickApCoef)} of your attack power as bleed damage every ${a.tick} sec for ${a.duration} sec.`,
  charge: (a) => `Charge an enemy ${a.minRange}-${a.maxRange} yards away and generate ${a.rage} rage. Out of combat only.`,
  intercept: (a) => `Charge an enemy ${a.minRange}-${a.maxRange} yards away, causing ${a.damage} damage and stunning it for ${a.stun} sec (raid bosses are immune). Usable in combat.`,
  battleStance: () => 'A balanced stance. Overpower, Rend and Charge need it. Swapping stance keeps only the rage your Tactical Mastery allows.',
  berserkerStance: () => `An aggressive stance: +${STANCES.berserker.crit}% crit. Whirlwind, Berserker Rage and Recklessness need it.`,
  heroicStrike: (a) => `Replace your next main-hand swing with a strong attack that adds ${a.bonus} damage. Off the global cooldown; the rage is spent when it hits.`,
  cleave: (a) => `Replace your next main-hand swing with an attack on the target and ${a.maxTargets - 1} other enemy, adding ${a.bonus} damage to each.`,
  execute: (a) => `Finish off a target below 20% health for ${a.base} damage plus ${a.perRage} for each extra point of rage. Uses all your rage.`,
  sunderArmor: (a) => `Reduce the target's armor by ${a.armor} per application, stacking up to ${a.maxStacks} times. Lasts ${a.duration} sec.`,
  bloodrage: (a) => `Generate ${a.instantRage} rage now and ${a.tickRage * a.ticks} more over ${a.duration} sec, at the cost of some health.`,
  berserkerRage: (a, f) => `Go berserk for ${a.duration} sec: immune to fear${f && f.tal.improvedBerserkerRage ? ` and gain ${f.tal.improvedBerserkerRage * TALENT.improvedBerserkerRage.ragePerRank} rage (Improved Berserker Rage)` : ''}.`,
  deathWish: (a) => `Your physical damage is increased by ${pctText(a.damage)} for ${a.duration} sec.`,
  recklessness: (a) => `All your attacks are critical strikes for ${a.duration} sec.`,
  battleShout: (a, f) => `Increase the attack power of your party by ${a.ap + (f && f.c.bsT2 ? a.t2Bonus : 0)} for ${durText(a.duration)}.`,
  mortalStrike: (a) => `A vicious strike for normalized weapon damage plus ${a.bonus}.`,
  slam: (a) => `Slam the target for weapon damage plus ${a.bonus}. ${a.castTime} sec cast.`,
  sweepingStrikes: (a) => `Your next ${a.charges} melee hits within ${a.duration} sec also strike another nearby enemy.`,
  spearingStrike: (a) => `Strike the target for ${pctText(a.weaponShare)} of your normalized weapon damage.`,
  defensiveStance: () => `A defensive stance: 10% less damage taken and 10% less damage done, ${pctText(THREAT.stance.defensive - 1)} more threat (more with Defiance). Revenge, Shield Block, Shield Wall and Taunt need it.`,
  shieldSlam: (a) => `Slam the target with your shield for ${a.base} plus your block value.`,
  revenge: (a) => `Instantly counterattack for ${a.base} plus ${pctText(a.apCoef)} of your attack power, with ${THREAT.revenge.mult}x threat. Usable for ${a.window} sec after you block, dodge or parry.`,
  shieldBlock: (a) => `+${a.blockPct}% chance to block for ${a.duration} sec or ${a.charges} blocks. Blocks also open Revenge.`,
  thunderClap: (a) => `Blast up to ${a.maxTargets} enemies within 8 yards for ${a.base} plus ${pctText(a.apCoef)} of your attack power; their attacks are ${pctText(a.slow)} slower for ${a.duration} sec. Rolls like a spell (17% miss on a boss).`,
  demoralizingShout: (a) => `Enemies within 10 yards lose ${Math.round(a.apReduction)} attack power for ${a.duration} sec, so they hit you softer. Rolls like a spell.`,
  lastStand: (a) => `Gain ${pctText(TALENT.lastStand.healthPct)} of your maximum health for ${a.duration} sec.`,
  shieldWall: (a) => `Take 60% less damage for ${a.duration} sec.`,
  taunt: (a) => `The target attacks you for ${a.duration} sec and your threat on it rises to the highest anyone has.`,
  concussionBlow: () => 'Stun the target for 5 sec. Raid bosses are immune.',
  shieldBash: (a) => `Bash the target with your shield for ${a.damage} damage and interrupt its spellcasting.`,
};
// The active class's text for an ability (the warrior's are above).
const abilityText = (id) => (HUD && HUD.ABILITY_TEXT[id]) || (IS_WARRIOR && ABILITY_TEXT[id]) || (ABILITIES[id] && ABILITIES[id].desc ? () => ABILITIES[id].desc : null);

// Tooltip for an action: what it does, its cost, cooldown, stance and key, and the macro on its button.
function spellTip(id, macro) {
  const f = state.fight;
  const ab = ABILITIES[id];
  if (!ab) return macro ? `<div class="tt-name">${ttEsc(macro.name)}</div><pre>${ttEsc(macro.text)}</pre>` : '';
  const info = actionInfo(id);
  const use = ab.item && state.sheet && state.sheet.uses[ab.item];
  const racial = ab.racial && RACIALS[state.sheet.race] && RACIALS[state.sheet.race].active;
  const cost = f ? f.cost(id) : ab.cost;
  const range = isMelee(id) ? 'Melee range' : ab.maxRange ? `${ab.minRange}-${ab.maxRange} yd range` : '';
  let cdSec = use ? Math.max(use.cd, use.ccd || 0) : racial ? racial.cd : ab.cd || ab.stanceCd || 0;
  if (id === 'intercept' && f) cdSec -= f.tal.improvedIntercept * TALENT.improvedIntercept.cdPerRank;
  const desc = ab.item ? (use ? effectText(use.fx)[0] : `No ${ab.name.toLowerCase()} with a use effect.`) : ab.racial ? racialText(racial) : abilityText(id) ? abilityText(id)(ab, f) : '';
  const left = f ? f.cdLeft(id) : 0;
  const stanceReq = ab.stances && f && !ab.stances.includes(f.stance) ? `Requires ${ab.stances.map((s) => STANCES[s].name).join(' or ')}` : '';
  const key = state.binds[macro ? (macro.replaces || `macro:${macro.id}`) : id];
  return `<div class="tt-name">${ttEsc(info.name)}</div>${ttRows([
    (cost || range) ? [cost ? `${Math.round(cost)} ${HUD ? HUD.resource : 'Rage'}` : '', range] : null,
    [ab.queue ? 'Next melee' : 'Instant', cdSec ? `${durText(cdSec)} cooldown` : ''],
    stanceReq ? `<span class="tt-req">${stanceReq}</span>` : null,
  ])}${desc ? `<div class="tt-desc">${ttEsc(desc)}</div>` : ''}${ttRows([
    left > 0 ? `<span class="tt-dim">Ready in ${durText(left)}</span>` : null,
    key ? `<span class="tt-dim">Key: ${ttEsc(key)}</span>` : null,
  ])}${macro ? `<div class="tt-dim">Macro "${ttEsc(macro.name)}":</div><pre>${ttEsc(macro.text)}</pre>` : ''}`;
}

// What each of your auras does (class auras; item and consumable auras list their stats).
function auraText(id, a, f) {
  const own = HUD && HUD.auraText(id, a, f);
  if (own) return own;
  switch (id) {
    case 'flurry': return `+${Math.round(f.tal.flurry * TALENT.flurry.hastePerRank * 100)}% attack speed for your next ${TALENT.flurry.charges} swings.`;
    case 'deathWish': return ABILITY_TEXT.deathWish(ABILITIES.deathWish);
    case 'recklessness': return ABILITY_TEXT.recklessness(ABILITIES.recklessness);
    case 'berserkerRage': return 'Immune to fear.';
    case 'bloodrage': return 'Generating rage.';
    case 'battleShout': return `+${ABILITIES.battleShout.ap + (f.c.bsT2 ? ABILITIES.battleShout.t2Bonus : 0)} attack power.`;
    case 'overpowerWindow': return 'The target dodged: Overpower is usable.';
    case 'enrage': return `+${Math.round(f.tal.enrage * TALENT.enrage.dmgPerRank * 100)}% physical damage after being hit.`;
    case 'bloodCraze': return 'Regenerating health after a big hit.';
    case 'revengeWindow': return 'You blocked, dodged or parried: Revenge is usable.';
    case 'shieldBlock': return `+${ABILITIES.shieldBlock.blockPct}% block chance for ${a.stacks || 1} more block${a.stacks > 1 ? 's' : ''}.`;
    case 'lastStand': return `+${Math.round(f.lastStandHealth || 0)} maximum health.`;
    case 'shieldWall': return '60% less damage taken.';
    case 'taunt': return 'The target is attacking you.';
    case 'racial': return racialText(f.racial.active);
    default: return auraStatText(a.stats).join(', ') || '';
  }
}

function auraTip(id) {
  const f = state.fight;
  const a = f && f.aura(id);
  if (!a) return '';
  const info = AURAS[id] || { name: a.name || id };
  const left = a.end - f.t;
  return `<div class="tt-name">${ttEsc(id === 'racial' && f.racial.active ? f.racial.active.name : info.name)}${a.stacks > 1 ? ` (${a.stacks})` : ''}</div>
    <div class="tt-desc">${ttEsc(auraText(id, a, f))}</div>${Number.isFinite(left) ? `<div class="tt-dim">${durText(left)} remaining</div>` : ''}`;
}

// Target debuffs: yours and the raid's.
function debuffTip(arg) {
  const f = state.fight;
  const [kind, rest] = [arg.split(':')[0], arg.split(':').slice(1).join(':')];
  const t = f && f.targets[Number(rest) || f.primary];
  if (kind === 'raid') {
    if (rest === 'exposeArmor') return `<div class="tt-name">Expose Armor</div><div class="tt-desc">Armor reduced by 2250 (5 combo points). Does not stack with Sunder Armor.</div><div class="tt-dim">From the raid</div>`;
    const def = BUFF_GROUPS.find((g) => g.source === 'debuffs').buffs[rest];
    return def ? `<div class="tt-name">${ttEsc(def.name)}</div><div class="tt-desc">${ttEsc(def.desc[0])}</div><div class="tt-dim">From the raid</div>` : '';
  }
  if (!t) return '';
  const left = (end) => (end > f.t && Number.isFinite(end) ? `<div class="tt-dim">${durText(end - f.t)} remaining</div>` : '');
  const own = HUD && HUD.debuffTip(kind, t, f);
  if (own) return `<div class="tt-name">${ttEsc(own.name)}</div><div class="tt-desc">${ttEsc(own.text)}</div>`;
  if (kind === 'sunder') return `<div class="tt-name">Sunder Armor (${t.sunder})</div><div class="tt-desc">Armor reduced by ${t.sunder * ABILITIES.sunderArmor.armor}.</div>${left(t.sunderEnd)}`;
  if (kind === 'rend') return `<div class="tt-name">Rend</div><div class="tt-desc">Bleeding every ${ABILITIES.rend.tick} sec.</div>${left(f.own(t).rendEnd)}`;
  if (kind === 'shatter') return `<div class="tt-name">Armor Shatter (${t.shatter})</div><div class="tt-desc">Armor reduced by ${t.shatter * 165}.</div>${left(t.shatterEnd)}`;
  if (kind === 'thunderClap') return `<div class="tt-name">Thunder Clap</div><div class="tt-desc">Attacks ${pctText(t.slow)} slower.</div>${left(t.tcEnd)}`;
  if (kind === 'demoralizingShout') return `<div class="tt-name">Demoralizing Shout</div><div class="tt-desc">Attack power reduced by ${Math.round(t.apReduction)}.</div>${left(t.demoEnd)}`;
  return '';
}

// Raid tab buff tiles: the effect of the current level, what it does not stack with, and how to click it.
function raidBuffTip(arg) {
  const [source, key] = arg.split(':');
  const group = BUFF_GROUPS.find((g) => g.source === source);
  const def = group && group.buffs[key];
  if (!def) return '';
  const lvl = Math.min(effectLevel((state.loadout[source] || {})[key]), def.levels);
  const name = lvl && def.levelNames ? def.levelNames[lvl - 1] : def.name;
  const cat = def.cat && BUFF_CATEGORIES[def.cat] ? `Does not stack with other ${BUFF_CATEGORIES[def.cat].title.toLowerCase()} effects; the strongest counts.` : '';
  return `<div class="tt-name">${ttEsc(name)}</div><div class="tt-desc">${ttEsc((def.desc || [])[Math.max(0, lvl - 1)] || '')}</div>${ttRows([
    cat ? `<span class="tt-dim">${ttEsc(cat)}</span>` : null,
    `<span class="${lvl ? 'tt-good' : 'tt-dim'}">${lvl ? 'On' : 'Off'}</span>`,
    `<span class="tt-dim">Click: ${def.levels > 1 ? 'off → Battle Shout → Enhanced' : 'turn on or off'}</span>`,
  ])}`;
}

function consumableTip(id) {
  const c = DB.consumables.find((x) => x.id === Number(id));
  if (!c) return '';
  // A consumable's stats usually repeat in its effect; list them once.
  const effects = (c.fx || []).flatMap((fx) => effectText(fx));
  const lines = [...sparseStatText(c.s).filter((s) => !effects.some((e) => e.toLowerCase().includes(s.toLowerCase()))), ...effects];
  if (c.wd) lines.unshift(`+${c.wd} weapon damage`);
  return `<div class="tt-name uncommon">${ttEsc(c.n)}</div>${lines.map((l) => `<div class="tt-desc">${ttEsc(l)}</div>`).join('')}`;
}

function setupTooltips() {
  initTooltips({
    // Action bar buttons: the ability, or the macro that has taken the button over.
    ab: (_, el) => {
      const slot = el.dataset.id;
      const macro = slot.startsWith('macro:') ? macroOf(slot) : replacingMacro(slot);
      const id = macro ? macroTarget(`macro:${macro.id}`) || (macro.replaces || '') : slot;
      return spellTip(id, macro);
    },
    spell: (id) => spellTip(id, null),
    aura: auraTip,
    debuff: debuffTip,
    buff: raidBuffTip,
    cons: consumableTip,
    talent: talentTip,
  });
}

// ---- settings ---------------------------------------------------------------------------------

function showAplStatus() {
  const { apl, from } = currentApl();
  const where = { pasted: 'the APL you pasted here', imported: 'the APL of your imported wowsims export', default: 'the default wowsims Fury APL' }[from];
  $('#apl-status').textContent = `Following ${where} (${apl.priorityList.filter((e) => !e.hide).length} entries).`;
  $('#apl-reset').disabled = from !== 'pasted';
}

function bindAplSettings() {
  state.pastedApl = aplFrom(store.get(APL_KEY, null));
  const msg = (text, ok) => { $('#apl-msg').textContent = text; $('#apl-msg').className = `msg ${ok ? 'ok' : 'error'}`; };
  $('#apl-use').addEventListener('click', () => {
    const text = $('#apl-text').value.trim();
    if (/^https?:\/\//.test(text)) { msg('That is a wowsims link. Open it, choose Export → JSON and paste the JSON here.', false); return; }
    let json;
    try { json = JSON.parse(text); } catch { msg('This is not valid JSON. In wowsims use Export → JSON and copy the whole text.', false); return; }
    const apl = aplFrom(json);
    if (!apl) { msg('No APL found. Set the wowsims rotation to APL (not Simple) and export again.', false); return; }
    state.pastedApl = apl;
    store.set(APL_KEY, apl);
    $('#apl-text').value = '';
    msg('The helper now follows this APL.', true);
    showAplStatus();
  });
  $('#apl-reset').addEventListener('click', () => {
    state.pastedApl = null;
    store.set(APL_KEY, null);
    msg('Back to the default APL (or your imported export’s).', true);
    showAplStatus();
  });
  showAplStatus();
}

function bindSettings() {
  const s = state.settings;
  const encSel = $('#opt-encounter');
  fillEncounters(encSel);
  encSel.value = ENCOUNTERS[s.encounter] ? s.encounter : 'dummies';
  encSel.addEventListener('change', () => {
    s.encounter = encSel.value;
    store.set('settings', s);
    encSel.blur();
    state.arena.setGraphics({ quality: s.quality, time: lookKey() }); // Onyxia's Lair, or back to the zone
    refreshSalvation(); // a boss's NPC raiders may bring a paladin
    // Its abilities are in the journal (no tactics thrown on the screen); an open journal turns to it.
    if (!$('#tab-journal').classList.contains('hidden')) { $('#journal-enc').value = s.encounter; drawJournal(); }
  });
  $('#opt-duration').value = s.duration;
  $('#opt-targets').value = s.targets;
  for (const el of document.querySelectorAll('.warrior-only')) el.classList.toggle('hidden', !IS_WARRIOR); // rage and Battle Shout
  $('#opt-start-rage').value = s.startRage;
  $('#opt-queue').value = s.queueWindow;
  $('#opt-shout').checked = s.precastShout;
  // Graphics: quality and time of day rebuild the scenery; nameplates are drawn per frame.
  const qSel = $('#opt-quality');
  for (const [key, q] of Object.entries(QUALITY)) qSel.add(new Option(q.label, key));
  qSel.value = QUALITY[s.quality] ? s.quality : 'medium';
  const tSel = $('#opt-time');
  for (const [key, t] of Object.entries(TIMES)) tSel.add(new Option(t.label, key));
  tSel.value = TIMES[s.timeOfDay] ? s.timeOfDay : 'sunset';
  const applyGraphics = () => {
    s.quality = qSel.value;
    s.timeOfDay = tSel.value;
    store.set('settings', s);
    state.arena.setGraphics({ quality: s.quality, time: lookKey() });
  };
  qSel.addEventListener('change', applyGraphics);
  tSel.addEventListener('change', applyGraphics);

  // Zone: the arena's look and the Natural flasks' zone bonus. Time of day only applies to the Training Grounds.
  const zSel = $('#opt-zone');
  for (const [key, z] of Object.entries(ZONES)) zSel.add(new Option(z.name, key));
  zSel.value = ZONES[s.zone] ? s.zone : DEFAULT_ZONE;
  s.zone = zSel.value;
  const zoneTimeHint = () => {
    tSel.disabled = s.zone !== 'trainingGrounds';
    tSel.title = tSel.disabled ? `${ZONES[s.zone].name} has its own look; time of day is for the Training Grounds.` : '';
    zSel.title = ZONES[s.zone].note;
  };
  zoneTimeHint();
  zSel.addEventListener('change', () => {
    s.zone = zSel.value;
    store.set('settings', s);
    zSel.blur();
    zoneTimeHint();
    rebuild(); // the Natural flasks' bonus depends on the zone
    state.arena.setGraphics({ quality: s.quality, time: lookKey() });
    raidWarning(ZONES[s.zone].name);
  });
  $('#opt-helper').checked = s.rotationHelper;
  $('#opt-helper').addEventListener('change', () => { s.rotationHelper = $('#opt-helper').checked; store.set('settings', s); });
  bindAplSettings();
  $('#opt-nameplates').checked = s.nameplates;
  $('#opt-nameplates').addEventListener('change', () => { s.nameplates = $('#opt-nameplates').checked; store.set('settings', s); });
  // Spec: each has its own saved character, keybinds, bars and APL, so switching reloads the page with them.
  const specSel = $('#opt-spec');
  // A spec with several wowsims builds lists each: "Survival Hunter · SV".
  const specLabel = (key) => {
    const sp = SPECS[key];
    return `${sp.name} ${CLASSES_BY_ID[sp.classId || 'warrior']}${buildsOf(baseSpec(key)).length > 1 ? ` · ${sp.build}` : ''}`;
  };
  for (const key of Object.keys(SPECS)) specSel.add(new Option(specLabel(key), key));
  specSel.value = SPEC;
  $('#spec-name').textContent = specLabel(SPEC);
  specSel.addEventListener('change', () => {
    s.spec = specSel.value;
    store.set('settings', s);
    location.reload();
  });
  // Show: the sim as a ghost, racing it in the meter, its next cast.
  const showGhost = () => {
    state.ghostView.setVisible(s.simGhost && !IS_HEALER); // a healer has no sim to race
    $('#sim-toggle').classList.toggle('on', !!s.simGhost);
    $('#opt-sim-ghost').checked = !!s.simGhost;
  };
  for (const [box, key] of [['#opt-sim-ghost', 'simGhost'], ['#opt-sim-race', 'simRace'], ['#opt-sim-next', 'simNext']]) {
    $(box).checked = !!s[key];
    $(box).addEventListener('change', () => {
      s[key] = $(box).checked;
      store.set('settings', s);
      showGhost();
      if (state.fight) drawMeter();
    });
  }
  // The Ghost switch on the damage meter: one click to show or hide the sim beside you.
  $('#sim-toggle').addEventListener('click', (e) => {
    e.currentTarget.blur();
    s.simGhost = !s.simGhost;
    store.set('settings', s);
    showGhost();
  });
  showGhost();
  // Noggenfogger Elixir: the skeleton form, a look only (the model is in js/world/skeleton.js).
  const applyNoggen = () => state.arena.setAppearance({ transform: s.noggenfogger ? 'noggenfogger' : null });
  $('#opt-noggen').checked = !!s.noggenfogger;
  applyNoggen();
  $('#opt-noggen').addEventListener('change', () => {
    s.noggenfogger = $('#opt-noggen').checked;
    store.set('settings', s);
    applyNoggen();
    if (state.group) state.group.updateInfo(); // the others see the skeleton too
  });
  const num = (sel, lo, hi, def) => { const v = Number($(sel).value); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def; };
  // How the fight ends, the dummies' health and the drills.
  const showFight = () => {
    $('#opt-end').value = s.endMode;
    $('#opt-health').value = s.dummyHealth;
    $('#opt-move-every').value = s.moveEvery;
    $('#opt-move-for').value = s.moveFor;
    $('#opt-hit-every').value = s.hitEvery;
    $('#opt-target-hits').value = s.targetHits;
    $('#opt-healing').value = s.healing;
    $('#opt-real-boss').checked = !!s.realBoss;
    $('#opt-npc-tank').value = s.npcTank || 'prot';
    $('#opt-npc-raid').value = String(s.npcRaid || 0);
    $('#opt-upload-logs').checked = s.uploadLogs !== false;
    $('#row-health').classList.toggle('hidden', s.endMode !== 'health');
    $('#opt-duration').disabled = s.endMode !== 'time';
    $('#opt-duration').title = s.endMode === 'time' ? '' : 'This fight does not end by the clock (Settings → Fight)';
    $('#opt-duration').value = s.duration;
    $('#opt-targets').value = s.targets;
  };
  showFight();
  const save = () => {
    s.duration = Number($('#opt-duration').value);
    s.targets = Number($('#opt-targets').value);
    s.startRage = num('#opt-start-rage', 0, 100, 0);
    s.queueWindow = num('#opt-queue', 0, 500, 400);
    s.precastShout = $('#opt-shout').checked;
    s.endMode = $('#opt-end').value;
    s.dummyHealth = num('#opt-health', 5000, 2000000, 50000);
    s.moveEvery = num('#opt-move-every', 0, 120, 0);
    s.moveFor = num('#opt-move-for', 0, 30, 0);
    s.hitEvery = num('#opt-hit-every', 0, 60, 0);
    s.targetHits = $('#opt-target-hits').value;
    s.healing = num('#opt-healing', 0, 5000, 815);
    s.realBoss = $('#opt-real-boss').checked;
    s.npcTank = $('#opt-npc-tank').value;
    s.npcRaid = Number($('#opt-npc-raid').value) || 0;
    s.uploadLogs = $('#opt-upload-logs').checked;
    store.set('settings', s);
    showFight();
    refreshSalvation(); // the NPC tank or raiders may bring a paladin
  };
  for (const sel of ['#opt-duration', '#opt-targets', '#opt-start-rage', '#opt-queue', '#opt-shout', '#opt-end', '#opt-health',
    '#opt-move-every', '#opt-move-for', '#opt-hit-every', '#opt-target-hits', '#opt-healing', '#opt-real-boss', '#opt-npc-tank', '#opt-npc-raid', '#opt-upload-logs']) $(sel).addEventListener('change', save);
  document.querySelectorAll('.fight-presets button').forEach((b) => b.addEventListener('click', () => {
    Object.assign(s, FIGHT_PRESETS[b.dataset.preset]);
    if (state.settings.encounter !== 'dummies') { s.encounter = 'dummies'; $('#opt-encounter').value = 'dummies'; $('#opt-encounter').dispatchEvent(new Event('change')); }
    store.set('settings', s);
    showFight();
    newFight();
    raidWarning(b.textContent);
  }));
}

// ---- macros editor ----------------------------------------------------------------------------

function saveMacros() {
  store.set(MACROS_KEY, state.macros);
  buildActionBar();
  buildMacroList();
}

// The macro list in Settings: an on/off switch, the macro and the ability it replaces.
function buildMacroList() {
  const ul = $('#macro-list');
  ul.innerHTML = '';
  if (!state.macros.some((m) => m.id === state.editingMacro)) state.editingMacro = state.macros.length ? state.macros[0].id : null;
  for (const m of state.macros) {
    const li = document.createElement('li');
    li.classList.toggle('active', m.id === state.editingMacro);
    const on = document.createElement('input');
    on.type = 'checkbox';
    on.checked = !!m.enabled;
    on.title = 'On: the macro takes over the ability’s button and key';
    on.addEventListener('click', (e) => e.stopPropagation());
    on.addEventListener('change', () => {
      m.enabled = on.checked;
      if (m.enabled && m.replaces) for (const o of state.macros) if (o !== m && o.replaces === m.replaces) o.enabled = false;
      saveMacros();
    });
    li.appendChild(on);
    li.appendChild(iconImg(actionInfo(`macro:${m.id}`).icon, m.name));
    const target = m.replaces && ABILITIES[m.replaces] ? `replaces ${ABILITIES[m.replaces].name}` : 'own button';
    li.insertAdjacentHTML('beforeend', `<span>${esc(m.name)} <span class="hint">· ${esc(target)}</span></span>`);
    li.addEventListener('click', () => { state.editingMacro = m.id; buildMacroList(); });
    ul.appendChild(li);
  }
  const sel = $('#macro-replaces');
  if (!sel.options.length) {
    sel.add(new Option('Nothing (own button)', ''));
    for (const id of ALL_ACTIONS) sel.add(new Option(ABILITIES[id].name, id));
  }
  const m = state.macros.find((x) => x.id === state.editingMacro);
  $('#macro-name').value = m ? m.name : '';
  $('#macro-text').value = m ? m.text : '';
  sel.value = m && m.replaces ? m.replaces : '';
  $('#macro-msg').textContent = '';
}

function bindMacroEditor() {
  const msg = (text, kind) => { $('#macro-msg').textContent = text; $('#macro-msg').className = 'msg ' + kind; };
  $('#macro-save').addEventListener('click', () => {
    const m = state.macros.find((x) => x.id === state.editingMacro);
    if (!m) return;
    const text = $('#macro-text').value;
    const names = spellNames(state.sheet);
    const unknown = parseMacro(text).lines.flat().map((o) => o.spell).filter((s) => !names.has(s.toLowerCase()));
    m.name = $('#macro-name').value.trim() || 'Macro';
    m.text = text;
    m.replaces = $('#macro-replaces').value || null;
    // One macro per ability: another macro replacing the same ability is switched off.
    if (m.replaces && m.enabled) for (const o of state.macros) if (o !== m && o.replaces === m.replaces) o.enabled = false;
    saveMacros();
    if (unknown.length) msg(`Saved, but these spells are unknown: ${unknown.join(', ')}`, 'error');
    else msg('Saved.', 'ok');
  });
  $('#macro-new').addEventListener('click', () => {
    const id = `m${Date.now().toString(36)}`;
    // A plain start: your bar's first spell, with your racial and trinkets after it.
    const first = ABILITIES[(state.bars.main || [])[0]];
    const spell = first ? first.name : 'Spell';
    state.macros.push({ id, name: 'New macro', replaces: null, enabled: true, text: `#showtooltip ${spell}\n/cast ${spell}\n/cast Racial\n/use 13\n/use 14` });
    state.editingMacro = id;
    saveMacros();
  });
  $('#macro-delete').addEventListener('click', () => {
    state.macros = state.macros.filter((x) => x.id !== state.editingMacro);
    delete state.binds[`macro:${state.editingMacro}`];
    saveBinds();
    state.editingMacro = null;
    saveMacros();
  });
  $('#macro-defaults').addEventListener('click', () => {
    state.macros = defaultMacros();
    state.editingMacro = null;
    saveMacros();
  });
}

// ---- side menu and panels -----------------------------------------------------------------------

function showTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-body').forEach((b) => b.classList.toggle('hidden', b.id !== 'tab-' + name));
  document.querySelectorAll('.side-menu [data-open]').forEach((b) => b.classList.toggle('active', b.dataset.open === name && !$('#panel').classList.contains('hidden')));
  $('#panel').classList.toggle('wide', name === 'talents'); // three talent trees side by side
  if (name === 'settings') buildMacroList();
  if (name === 'talents') drawTalents();
  if (name === 'journal') { $('#journal-enc').value = state.settings.encounter; drawJournal(); }
}

// An encounter list (the top bar, the ready room, the journal) grouped by raid: the training ones first, then each raid's
// bosses under its name.
function fillEncounters(sel) {
  const groups = new Map();
  for (const [key, e] of Object.entries(ENCOUNTERS)) {
    const raid = e.raid || (e.lair ? "Onyxia's Lair" : 'Training');
    if (!groups.has(raid)) groups.set(raid, []);
    groups.get(raid).push([key, e.name]);
  }
  for (const [raid, list] of groups) {
    const g = document.createElement('optgroup');
    g.label = raid;
    for (const [key, name] of list) g.appendChild(new Option(name, key));
    sel.appendChild(g);
  }
}

// The encounter journal: the encounter picked (the one you fight when it opens), its abilities with their icons.
function drawJournal() {
  const sel = $('#journal-enc');
  if (!sel.options.length) {
    fillEncounters(sel);
    sel.addEventListener('change', drawJournal);
  }
  if (!ENCOUNTERS[sel.value]) sel.value = 'dummies';
  const p = journalOf(sel.value);
  const sub = [p.raid, p.health ? `${fmtNum(p.health)} health (classic)` : ''].filter(Boolean).join(' · ');
  $('#journal-page').innerHTML = `<h2>${esc(p.name)}</h2>${sub ? `<p class="j-sub">${esc(sub)}</p>` : ''}<p class="j-overview">${esc(p.overview)}</p>`
    + (p.abilities.length ? `<ul>${p.abilities.map((ab) => `<li><img src="${iconUrl(ab.icon)}" alt=""><div><b>${esc(ab.name)}</b><span class="j-when">${esc(ab.when)}</span><p>${esc(ab.text)}</p></div></li>`).join('')}</ul>` : '');
}

function togglePanel(name) {
  const panel = $('#panel');
  const current = document.querySelector('.tab.active');
  if (!panel.classList.contains('hidden') && current && current.dataset.tab === name) {
    panel.classList.add('hidden');
  } else {
    panel.classList.remove('hidden');
  }
  showTab(name);
}

// ---- sound and raid pack settings ---------------------------------------------------------------------

function bindSound() {
  const snd = state.settings.sound;
  const rp = state.settings.raidPack;
  const save = () => store.set('settings', state.settings);
  // The speaker button opens a small panel: all sound, music and effects, each with a mute and a volume. The
  // same settings are in Settings → Sound; both show the same values.
  const pop = $('#sound-pop');
  const isOn = (key) => (key === 'muted' ? !snd.muted : !!snd[key]);
  const sync = () => {
    const allOff = snd.muted || (!snd.music && !snd.sfx);
    $('#btn-mute').textContent = allOff ? '🔇' : '🔊';
    $('#btn-mute').classList.toggle('off', allOff);
    pop.querySelectorAll('[data-mute]').forEach((b) => { const on = isOn(b.dataset.mute); b.textContent = on ? '🔊' : '🔇'; b.classList.toggle('off', !on); b.title = on ? 'Mute' : 'Unmute'; });
    pop.querySelectorAll('[data-vol]').forEach((r) => { r.value = snd[r.dataset.vol]; });
    $('#snd-volume').value = snd.volume;
    $('#snd-music-volume').value = snd.musicVolume;
    $('#snd-sfx-volume').value = snd.sfxVolume;
    $('#snd-sfx').checked = !!snd.sfx;
    $('#snd-music').checked = !!snd.music;
    $('#snd-gtfo').checked = !!snd.gtfo;
  };
  const apply = () => { state.sound.unlock(); state.sound.apply(); save(); sync(); };
  $('#btn-mute').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.blur();
    pop.style.left = `${Math.max(8, Math.min(window.innerWidth - 270, r.left))}px`;
    pop.style.top = `${r.bottom + 6}px`;
    pop.classList.toggle('hidden');
  });
  document.addEventListener('pointerdown', (e) => { if (!pop.contains(e.target) && e.target.id !== 'btn-mute') pop.classList.add('hidden'); });
  pop.querySelectorAll('[data-mute]').forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.mute;
    if (key === 'muted') snd.muted = !snd.muted; else snd[key] = !snd[key];
    apply();
  }));
  pop.querySelectorAll('[data-vol]').forEach((r) => r.addEventListener('input', () => {
    snd[r.dataset.vol] = Number(r.value);
    // Turning a volume up unmutes it.
    if (r.dataset.vol === 'musicVolume') snd.music = true;
    if (r.dataset.vol === 'sfxVolume') snd.sfx = true;
    if (r.dataset.vol === 'volume') snd.muted = false;
    apply();
  }));
  for (const [sel, key] of [['#snd-volume', 'volume'], ['#snd-music-volume', 'musicVolume'], ['#snd-sfx-volume', 'sfxVolume']]) {
    $(sel).addEventListener('input', (e) => { snd[key] = Number(e.target.value); apply(); });
  }
  for (const [sel, key] of [['#snd-sfx', 'sfx'], ['#snd-music', 'music'], ['#snd-gtfo', 'gtfo']]) {
    $(sel).addEventListener('change', (e) => { snd[key] = e.target.checked; apply(); });
  }
  sync();
  // Raid pack: on/off, each kind of alert, sounds, callouts, moving the anchors.
  $('#rp-kinds').innerHTML = Object.entries(ALERT_KINDS).map(([k, label]) => `<label class="inline"><input type="checkbox" data-kind="${k}"> ${label}</label>`).join('');
  $('#rp-kinds').querySelectorAll('[data-kind]').forEach((b) => {
    b.checked = !!rp.show[b.dataset.kind];
    b.addEventListener('change', () => { rp.show[b.dataset.kind] = b.checked; save(); });
  });
  for (const [sel, key] of [['#rp-on', 'on'], ['#rp-sound', 'sound'], ['#rp-voice', 'voice']]) {
    $(sel).checked = !!rp[key];
    $(sel).addEventListener('change', (e) => { rp[key] = e.target.checked; save(); });
  }
  $('#rp-unlock').addEventListener('click', (e) => {
    const on = !state.raidPack.unlocked;
    state.raidPack.setUnlocked(on);
    e.currentTarget.textContent = on ? 'Done moving' : 'Move alerts';
    e.currentTarget.classList.toggle('primary', on);
  });
  $('#rp-reset').addEventListener('click', () => state.raidPack.resetPositions());
  $('#hf-unlock').addEventListener('click', () => setEditMode(!state.editMode));
  $('#hf-reset').addEventListener('click', () => state.hudFrames.reset());
  $('#rp-test').addEventListener('click', () => {
    state.sound.unlock();
    state.raidPack.warn('WAR STOMP <i class="y">»</i> RUN OUT', { icon: 'ability_warstomp', voice: 'run out' });
    state.raidPack.icon('test', { icon: 'ability_warstomp', label: 'Run Out', duration: 3 });
    state.raidPack.line('test', 'Cleave', { icon: 'ability_warrior_cleave', duration: 3 });
  });
}

// ---- main menu ----------------------------------------------------------------------------------

// The main menu (js/main-menu.js) opens when the page does, once per browser session: picking a spec reloads the
// page, and the menu does not come back after that.
const MENU_SEEN = 'numen-gym.menuSeen';
const menuOpen = () => !$('#main-menu').classList.contains('hidden');
function showMainMenu(on) {
  $('#main-menu').classList.toggle('hidden', !on);
  $('#btn-menu').classList.toggle('active', on);
}

function bindMainMenu() {
  const s = state.settings;
  const current = () => ({ spec: SPEC, race: state.loadout.race, bodyType: s.bodyType || 'body1', name: s.playerName });
  const menu = buildMainMenu($('#main-menu'), {
    races: Object.fromEntries(Object.entries(RACES).map(([k, r]) => [k, { name: r.name }])),
    classRaces: CLASS_RACES,
    current: current(),
    onPlay: ({ spec, race, bodyType, name }) => {
      try { sessionStorage.setItem(MENU_SEEN, '1'); } catch { /* private mode: the menu shows on every load */ }
      if (name) name = cleanName(name.trim()); // kept civil (name-filter.js)
      if (name && name !== s.playerName) {
        s.playerName = name;
        $('#group-name').value = name;
        if (state.group) state.group.rename(name);
      }
      if (bodyType !== s.bodyType) {
        s.bodyType = bodyType;
        state.arena.setAppearance({ bodyType });
        if (state.group) state.group.updateInfo(); // the others draw you with it
      }
      if (spec !== SPEC) {
        if (state.group && state.group.active && !confirm('Switching spec reloads the page and leaves your group. Switch?')) return;
        // The race goes with that spec's saved character.
        const key = loadoutKeyOf(spec);
        const lo = store.get(key, structuredClone(SPECS[spec].loadout));
        lo.race = race;
        store.set(key, lo);
        s.spec = spec;
        store.set('settings', s);
        location.reload();
        return;
      }
      store.set('settings', s);
      if (race !== state.loadout.race) {
        state.loadout.race = race;
        rebuild();
      }
      menu.set(current());
      showMainMenu(false);
    },
  });
  // Your class's outfit and starter look (the race decides which classes it can be; js/world/appearance.js).
  state.arena.setAppearance({ classId: CLASS_ID, ...(s.bodyType ? { bodyType: s.bodyType } : {}) });
  $('#btn-menu').addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (!menuOpen()) { menu.set(current()); menu.reset(); }
    showMainMenu(!menuOpen());
  });
  // While it is open, keys do not reach the game (Esc closes it).
  window.addEventListener('keydown', (e) => {
    if (!menuOpen()) return;
    if (e.key === 'Escape') showMainMenu(false);
    e.stopPropagation();
  }, true);
  let seen = false;
  try { seen = !!sessionStorage.getItem(MENU_SEEN); } catch { /* as above */ }
  menu.reset();
  showMainMenu(!seen);
}

function bindPanels() {
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
  document.querySelectorAll('.side-menu [data-open]').forEach((b) => b.addEventListener('click', () => {
    b.blur();
    if (b.dataset.open === 'details') {
      $('#details').classList.toggle('hidden');
      b.classList.toggle('active', !$('#details').classList.contains('hidden'));
    } else if (b.dataset.open === 'spellbook') {
      showSpellbook(!state.editBars);
    } else if (b.dataset.open === 'edit') {
      setEditMode(!state.editMode);
    } else if (b.dataset.open === 'logs') {
      window.open('logs.html', '_blank', 'noopener'); // Numen Logs: your reports and the rankings
    } else if (b.dataset.open === 'group') {
      $('#group-panel').classList.toggle('hidden');
      drawGroupPanel();
    } else {
      togglePanel(b.dataset.open);
    }
  }));
  document.querySelector('[data-close-panel]').addEventListener('click', () => { $('#panel').classList.add('hidden'); showTab(document.querySelector('.tab.active').dataset.tab); });
  document.querySelector('[data-close-details]').addEventListener('click', () => {
    $('#details').classList.add('hidden');
    document.querySelector('.side-menu [data-open=details]').classList.remove('active');
  });
}

function init() {
  // The menus, buttons and highlights in your class's colour.
  document.documentElement.style.setProperty('--fj-class', classColor(CLASS_ID));
  state.bars = loadBars();
  bindPanels();
  bindMacroEditor();
  $('#btn-start').addEventListener('click', (e) => {
    e.currentTarget.blur();
    const f = state.fight;
    const g = state.group;
    if (f && f.started && !f.over) { f.stop(); if (g && g.isHost) g.end(); return; }
    // In a group the host pulls for everyone.
    if (g && g.active && !g.isHost) { raidWarning(`The ${leader()} pulls for the group`); return; }
    // The host first sees the raid setup (the last one chosen for this encounter), then pulls from there.
    if (g && g.isHost) { openRaidSetupPrompt(); return; }
    countdown();
  });
  $('#btn-pause').addEventListener('click', (e) => { e.currentTarget.blur(); togglePause(); });
  $('#btn-reset').addEventListener('click', (e) => {
    e.currentTarget.blur();
    newFight();
    if (state.group && state.group.isHost) state.group.reset(); // the host resets the whole group
  });
  $('#btn-import').addEventListener('click', doImport);
  $('#btn-export').addEventListener('click', doExport);
  $('#btn-default').addEventListener('click', resetCharacter);
  $('#char-form').addEventListener('change', () => {
    const form = $('#char-form');
    state.loadout.race = form.elements.race.value;
    state.loadout.talentsString = form.elements.talents.value.trim() || DEFAULT_TALENTS;
    const choices = CLS.Fight.PET_CHOICES;
    if (choices) state.loadout.classOptions = { ...(state.loadout.classOptions || {}), [choices.option]: form.elements.pet.value || null };
    rebuild();
  });
  $('#adjust-form').addEventListener('change', () => {
    const af = $('#adjust-form');
    state.loadout.adjust = Object.fromEntries(['ap', 'critPct', 'hitPct', 'hastePct', 'expertisePct'].map((k) => [k, Number(af.elements[k].value) || 0]));
    rebuild();
  });
  for (const f of ['#char-form', '#adjust-form']) $(f).addEventListener('submit', (e) => e.preventDefault());
  $('#modal-close').addEventListener('click', () => $('#modal').classList.add('hidden'));
  $('#btn-results').addEventListener('click', (e) => { e.currentTarget.blur(); openResults(); });
  $('#results').addEventListener('click', (e) => { if (e.target.id === 'results') $('#results').classList.add('hidden'); });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').classList.add('hidden'); });

  scaleHud();
  window.addEventListener('resize', scaleHud);
  state.arena = new Arena($('#arena'), { quality: state.settings.quality, time: lookKey() });
  state.arena.setMoveKeys(moveKeys()); // your movement keys (Settings → Keybinds)
  state.ghostView = new GhostView(state.arena);
  state.group = new GroupPlay(groupContext());
  state.settings.raidFrames = { ...RAID_FRAME_DEFAULTS, ...(state.settings.raidFrames || {}) };
  // Raid frames still at the old default spot move right of the raid cooldowns.
  if (state.settings.raidFrames.x === 136 && state.settings.raidFrames.y === 140) Object.assign(state.settings.raidFrames, { x: RAID_FRAME_DEFAULTS.x, y: RAID_FRAME_DEFAULTS.y });
  state.raidFrames = new RaidFrames($('#raid-frames'), state.settings.raidFrames, () => store.set('settings', state.settings));
  // A healer hovers the raid frames to heal (mouseover casting) and clicks one to make it their target.
  state.raidFrames.onHover = (id) => { state.mouseoverUnit = id; };
  state.raidFrames.onClick = (id) => { state.friendlyTarget = state.friendlyTarget === id ? null : id; };
  if (IS_HEALER) {
    const head = $('#damage-box .eui-head span');
    if (head.firstChild && head.firstChild.nodeType === 3) head.firstChild.textContent = 'Healing Done ';
    const unit = $('#live-dps').nextSibling;
    if (unit && unit.nodeType === 3) unit.textContent = ' HPS';
  }
  // Sound (js/audio.js) and the raid pack's alerts (js/raid-pack.js), with their saved settings.
  const saved = state.settings;
  saved.sound = { ...SOUND_DEFAULTS, ...(saved.sound || {}) };
  const rpSaved = saved.raidPack || {};
  saved.raidPack = { ...RAID_PACK_DEFAULTS, ...rpSaved, show: { ...RAID_PACK_DEFAULTS.show, ...(rpSaved.show || {}) }, pos: rpSaved.pos || {} };
  state.sound = new Sound(saved.sound);
  state.raidPack = new RaidPack($('#raid-pack'), saved.raidPack, { sound: state.sound, save: () => store.set('settings', state.settings) });
  // Movable HUD frames (js/hud-frames.js): trinkets, totem bars, every buff, the pet bar.
  state.hudFrames = new HudFrames(state.settings, () => store.set('settings', state.settings));
  state.hudFrames.register('trinkets', $('#hf-trinkets'), 'Trinkets');
  state.hudFrames.register('totems', $('#hf-totems'), 'Totems');
  state.hudFrames.register('totemSet', $('#hf-totemset'), 'Totem set');
  buildTotemSet();
  state.hudFrames.register('allBuffs', $('#hf-allbuffs'), 'Buffs');
  state.hudFrames.register('petBar', $('#hf-petbar'), 'Pet bar');
  state.hudFrames.register('auraBar', $('#hf-aurabar'), 'Aura bar');
  state.hudFrames.register('raidCds', $('#raid-cds'), 'Raid cooldowns', { inPlace: true });
  // A click on another player's ready cooldown asks them for it.
  $('#raid-cds').addEventListener('click', (e) => {
    const row = e.target.closest('.rcd.ask');
    if (!row || state.hudFrames.unlocked) return;
    if (row.dataset.owner.startsWith('npc:')) { askNpc(row.dataset.owner, row.dataset.cd); return; }
    if (!state.group || !state.group.active) return;
    state.group.askRaidCd(row.dataset.owner, row.dataset.cd);
    raidWarning(`Asked ${row.dataset.name} for ${RAID_COOLDOWNS[row.dataset.cd].name}`);
  });
  $('#rs-tank').addEventListener('change', () => {
    state.settings.npcTank = $('#rs-tank').value;
    $('#opt-npc-tank').value = state.settings.npcTank;
    store.set('settings', state.settings);
    refreshSalvation();
    if (state.group && state.group.isHost) state.group.shareSettings();
    drawReadyRoom();
  });
  // The NPC raiders' size, from the ready room or the Group panel (Settings → Fight has its own save).
  for (const sel of ['#rs-raid', '#group-npc-raid']) $(sel).addEventListener('change', (e) => {
    state.settings.npcRaid = Number(e.target.value) || 0;
    store.set('settings', state.settings);
    syncNpcRaid();
    refreshSalvation();
    if (state.group && state.group.isHost) state.group.shareSettings();
    drawReadyRoom();
    drawGroupPanel();
  });
  // The ready room's own controls.
  $('#rs-ready').addEventListener('click', () => { const g = state.group; if (g && g.active) g.setReady(!g.isReady(g.group.myId)); });
  $('#group-ready-room').addEventListener('click', () => openReadyRoom());
  document.querySelectorAll('[data-rs-open]').forEach((b) => b.addEventListener('click', () => {
    // Your own setup in its panel; the Group panel's Ready room button brings the room back.
    $('#raid-setup-modal').classList.add('hidden');
    const side = document.querySelector(`.side-menu [data-open=${b.dataset.rsOpen}]`);
    if (side) side.click();
  }));
  $('#rs-encounter').addEventListener('change', () => {
    const sel = $('#opt-encounter');
    sel.value = $('#rs-encounter').value;
    sel.dispatchEvent(new Event('change')); // the encounter's arena, the fight, and the group (shareSettings)
    openReadyRoom();
  });
  $('#rs-hp').addEventListener('change', () => {
    state.settings.bossHpPct = Number($('#rs-hp').value) || 100;
    store.set('settings', state.settings);
    newFight();
    if (state.group && state.group.isHost) state.group.shareSettings();
    drawReadyRoom();
  });
  $('#rs-healing').addEventListener('change', () => {
    const hps = Math.max(0, Math.min(5000, Math.round(Number($('#rs-healing').value) || 0)));
    state.settings.healing = hps;
    $('#opt-healing').value = hps;
    store.set('settings', state.settings);
    newFight();
    if (state.group && state.group.isHost) state.group.shareSettings();
    drawReadyRoom();
  });
  $('#rs-real').addEventListener('change', () => {
    state.settings.realBoss = $('#rs-real').checked;
    $('#opt-real-boss').checked = state.settings.realBoss;
    store.set('settings', state.settings);
    newFight();
  });
  $('#rs-pull').addEventListener('click', () => {
    const gp = state.group;
    if (gp && gp.active && !gp.allReady()) { raidWarning('Not everyone is ready'); return; }
    $('#raid-setup-modal').classList.add('hidden');
    autoBuff(); // what the raid brings goes up before the leader's setup goes out with the pull
    saveGroupRaidSetup();
    const g = state.group;
    if (g && g.isHost) { g.shareSettings(); g.pull(); }
    countdown();
  });
  $('#rs-cancel').addEventListener('click', () => $('#raid-setup-modal').classList.add('hidden'));
  // Everything else on the screen moves by an offset from its own place.
  for (const [id, sel, label] of [
    ['reminders', '#fj-reminders', 'Reminders'], ['procLeft', '#proc-l', 'Proc (left)'], ['procRight', '#proc-r', 'Proc (right)'],
    ['popups', '#fj-popups', 'Procs and cooldowns'], ['debuffs', '#fj-debuffs', 'Target debuffs'], ['castBar', '.fj-castslot', 'Cast bar'],
    ['buffs', '#buffs', 'Buffs'], ['bars', '.fj-bars', 'Swing and resource bars'], ['player', '#fj-player', 'Player frame'],
    ['stances', '#fj-stances', 'Stances'], ['actionBar', '#action-bar', 'Action bars'], ['target', '#targets', 'Target frame'],
    ['info', '.fj-info', 'Race and clock'], ['meters', '#meters', 'Meters'],
    ['countdown', '#countdown', 'Countdown'], ['errors', '#error-text', 'Error text'], ['raidWarning', '#raid-warning', 'Raid warnings'],
    ['topbar', '.arena > .topbar', 'Top bar'], ['sideMenu', '.arena > .side-menu', 'Side menu'], ['controlsHint', '.controls-hint', 'Controls'],
  ]) state.hudFrames.registerOffset(id, document.querySelector(sel), label);
  // The sim's next cast: dragged out of the way at any time, or hidden with its cross.
  state.hudFrames.registerOffset('simNext', $('#sim-next'), "The sim's next cast", { always: true });
  bindEditMode();
  $('#sim-next').addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.sn-close')) return;
    state.settings.simNext = false;
    $('#opt-sim-next').checked = false;
    store.set('settings', state.settings);
    $('#sim-next').classList.add('hidden');
  });
  // Browsers start audio after the first click or key press.
  for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => state.sound.unlock(), true);
  window.furyTrainer = state; // handle for debugging in the browser console
  // The NPCs' part of a frame, for tests that run a fight faster than the screen draws it.
  state.npcStep = (f, dt) => { updateTankBot(f); updateRaidBots(f, dt); npcHeal(f); };
  state.arena.onSelect = (i) => state.fight.setPrimary(i);
  bindSettings();
  bindPresetControls();
  bindTalents();
  bindSpellbook();
  bindGroup();
  bindSound();
  bindMainMenu();
  setTimeout(warmUpWowsims, 4000); // after the arena has loaded, so the score's sim is ready by the first fight's end
  setupTooltips();
  rebuild();
  loadResults();
  buildRaidSetup();
  buildMacroList();
  requestAnimationFrame(frame);
}

init();
