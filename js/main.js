import { createFight } from './engine/fight.js';
import { Arena } from './world/arena.js';
import { QUALITY, TIMES } from './world/environment.js';
import { gearLook } from './world/models.js';
import { BRUTE_INFO, BruteEncounter, ENCOUNTERS } from './world/encounter.js';
import { SOUND_DEFAULTS, Sound } from './audio.js';
import { ALERT_KINDS, RAID_PACK_DEFAULTS, RaidPack } from './raid-pack.js';
import { iconFor, iconSource, parseHtml, renderResults, snapshotResults } from './results.js';
import { botReference, parsePercent, referenceSummary } from './score.js';
import { warmUpWowsims, wowsimsReference } from './wowsims-sim.js';
import { aplFrom, explain, suggest } from './apl.js';
import { GhostView, SimGhost } from './ghost.js';
import { MoveDrill } from './drills.js';
import { GroupPlay } from './group-play.js';
import { CLASS_COLORS, RAID_FRAME_DEFAULTS, RaidFrames } from './raid-frames.js';
import { buildMainMenu } from './main-menu.js';

import { canAdd, canRemove, spentIn, spentTotal, talentOpen, talentRanks, talentString } from './talents.js';

import { CONSUMABLE_ICONS } from './data/consumable-icons.js';
import { BIND_PRESETS } from './data/keybinds.js';
import { DEFAULT_SPEC, SPECS } from './data/specs.js';
import { DEFAULT_ZONE, ZONES } from './data/zones.js';
import { myslotKeybinds, parseMyslot } from './myslot.js';
import { initTooltips, ttEsc, ttRows } from './tooltip.js';
import { DB } from './data/db.js';
import { DEFAULT_MACROS, macroAction, mergeNewDefaults, parseMacro, runMacro, spellNames } from './macros.js';
import { RACES, RACIALS, STANCES, STAT, TALENT, THREAT, iconUrl } from './data/warrior.js';
import {
  ABILITIES, ALL_ACTIONS, AURAS, BUILT_IN_BUILDS, CLASS_ID, CLS, DEFAULT_TALENTS, IS_WARRIOR, MAX_TALENT_POINTS, NO_DPS_EFFECT, POINTS_PER_TIER, SPEC,
  TALENT_EFFECTS, TALENT_TREES, TALENT_TREE_DATA, castable, parseTalents, spellbook,
} from './active-class.js';
import { CLASS_RACES } from './data/class-stats.js';
import { ROGUE_HUD } from './classes/rogue/hud.js';
import { CLASSES } from './classes/index.js';

const CLASSES_BY_ID = Object.fromEntries(Object.entries(CLASSES).map(([k, c]) => [k, c.name]));

// The class's HUD pieces and texts (js/classes/<class>/hud.js); the warrior's are the ones written out below.
const HUD = { rogue: ROGUE_HUD }[CLASS_ID] || null;
document.body.classList.add(`cls-${CLASS_ID}`);
// Melee range abilities (their icons take Fojji's red out-of-range tint).
const isMelee = (id) => MELEE_ACTIONS.has(id) || !!(ABILITIES[id] && ABILITIES[id].melee);
import { ARMOR_DEBUFFS, BUFF_CATEGORIES, BUFF_GROUPS, CONSUMABLE_SLOTS, armorDebuffOf, effectLevel, levelValue } from './data/buffs.js';
import { DEFAULT_LOADOUT, SLOT_NAMES, computeSheet, consumableOptions } from './character.js';
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

const DEFAULT_SETTINGS = {
  duration: 120, targets: 1, startRage: 0, queueWindow: 400, precastShout: true, encounter: 'dummies',
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
function fightOpts(s, targets) {
  const g = state.group;
  return {
    duration: s.duration, targets, startRage: s.startRage,
    queueWindow: s.queueWindow / 1000, precastShout: s.precastShout,
    end: s.endMode === 'execute' ? 'never' : s.endMode,
    execute: s.endMode === 'execute' ? 'always' : s.endMode === 'never' ? 'never' : 'last20',
    health: s.dummyHealth, moveEvery: s.moveEvery, moveFor: s.moveFor, hitEvery: s.hitEvery,
    startStance: SPECS[SPEC].startStance,
    tank: targetsHit(s), hps: s.healing, metric: METRIC, group: !!(g && g.active),
    firstAggro: !!(g && g.active && g.puller() === g.group.myId), // the tank (or the host) pulls
  };
}
// Keybinds: the active preset per spec and the binds in use ("binds.v3"), plus the player's own presets
// ("bindPresets.v1"), both keyed by spec so more classes can be added. Built-in presets: js/data/keybinds.js.
const builtInPresets = () => BIND_PRESETS[SPEC_KEY] || [];
const ownPresets = () => (store.get('bindPresets.v1', {})[SPEC_KEY] || []);
const presetById = (id) => [...builtInPresets(), ...ownPresets()].find((p) => p.id === id);

function loadBinds() {
  const saved = store.get('binds.v3', {})[SPEC_KEY];
  if (saved && presetById(saved.preset)) return { preset: saved.preset, binds: { ...saved.binds } };
  return { preset: 'default', binds: { ...builtInPresets()[0].binds } };
}

// Saves the binds in use; while one of the player's own presets is active it is updated too.
function saveBinds() {
  const all = store.get('binds.v3', {});
  all[SPEC_KEY] = { preset: state.bindPreset, binds: state.binds };
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
const defaultMacros = () => DEFAULT_MACROS.map((m) => ({ ...m }));

// Saved macros, plus any default macros added since they were saved (merged in once).
// Macros are stored under v4. v3 briefly held the Myslot macros (ids "my-..."), which the player
// preferred the earlier built-in set to; v2 still holds that earlier set as they left it.
// The warrior's macros are under the keys from before there were classes; another class keeps its own, with no
// built-in macros (they are stance dances).
const MACROS_KEY = IS_WARRIOR ? 'macros.v4' : `macros.${CLASS_ID}.v1`;
function loadMacros() {
  if (!IS_WARRIOR) return store.get(MACROS_KEY, []);
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
  return g && g.active && !g.isHost && state.groupRaid ? { ...state.loadout, ...state.groupRaid } : state.loadout;
}

function rebuild({ keepMsg = false } = {}) {
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

function fillCharacter() {
  const s = state.sheet;
  const form = $('#char-form');
  const raceSel = form.elements.race;
  if (!raceSel.options.length) for (const key of CLASS_RACES[CLASS_ID]) raceSel.add(new Option(RACES[key].name, key));
  raceSel.value = s.race;
  form.elements.talents.value = s.talents;
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
    startStance: o.startStance, prot: SPEC === 'prot', tank: !!o.tank, hps: o.hps, metric: METRIC, classId: CLASS_ID,
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
    items.push({ icon: u.icon, text: u.name, kind: `use · ${ABILITIES[slot].name} button` });
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

function buildRaidSetup() {
  const root = $('#raid-setup');
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
      const lvl = Math.min(effectLevel(settings[key]), def.levels);
      const tile = document.createElement('button');
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

  root.insertAdjacentHTML('beforeend', '<h2>Consumables</h2>');
  const box = document.createElement('div');
  box.className = 'raid-group';
  const cons = lo.consumables || (lo.consumables = {});
  for (const slot of CONSUMABLE_SLOTS) {
    const options = consumableOptions(slot.type);
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

// Fallback icons for consumables without one in CONSUMABLE_ICONS, by wowsims ConsumableType.
const CONSUMABLE_TYPE_ICONS = { 1: 'inv_potion_41', 2: 'inv_potion_97', 3: 'inv_misc_food_14', 5: 'spell_fire_selfdestruct', 6: 'inv_stone_sharpening_04', 11: 'inv_potion_32' };
const consumableIcon = (id, type) => CONSUMABLE_ICONS[id] || CONSUMABLE_TYPE_ICONS[type] || 'inv_misc_questionmark';

// A dropdown with icons (a <select> cannot show them): the chosen item, and a list to pick from.
function consumablePicker(slot, options, current, choose) {
  const wrap = document.createElement('div');
  wrap.className = 'cons-pick';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `cons-current${current ? '' : ' none'}`;
  btn.appendChild(iconImg(current ? consumableIcon(current.id, slot.type) : 'inv_misc_questionmark', ''));
  btn.insertAdjacentHTML('beforeend', `<span>${esc(current ? current.n : 'None')}</span><span class="caret">▾</span>`);
  if (current) btn.dataset.tt = `cons:${current.id}`;
  const menu = document.createElement('div');
  menu.className = 'cons-menu hidden';
  for (const c of [null, ...options]) {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = `cons-opt${(c ? c.id : 0) === (current ? current.id : 0) ? ' active' : ''}`;
    opt.appendChild(iconImg(c ? consumableIcon(c.id, slot.type) : 'inv_misc_questionmark', ''));
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
  const v = levelValue(levels, level);
  if (v === undefined) delete settings[key]; else settings[key] = v;
  rebuild();
  buildRaidSetup(); // the icon tiles show the new state
}

// ---- fight lifecycle --------------------------------------------------------------------------

function newFight() {
  clearInterval(state.countdownTimer);
  $('#countdown').classList.add('hidden');
  const s = state.settings;
  const enc = ENCOUNTERS[s.encounter] || ENCOUNTERS.dummies;
  const targets = enc.boss ? 1 : s.targets;
  const opts = fightOpts(s, targets);
  state.fight = createFight(state.sheet, { ...opts }); // the class's fight (js/classes)
  state.drill = new MoveDrill(state.fight, state.arena, raidWarning, drillAlert);
  state.fight.on(onFightEvent);
  if (state.group) state.group.attach(state.fight); // a group: the shared targets, the host's settings
  // The sim's fight: same setup and options, its own dice; it starts when you pull.
  state.ghost = new SimGhost(state.sheet, { ...opts }, currentApl().apl, aplItems());
  state.ghost.on((ev) => { if (state.ghostView) state.ghostView.onEvent(ev); });
  state.fightLog = [];
  state.arena.setRace(state.sheet.race, gearLook(state.gear));
  // A boss has an NPC tank unless the targets hit back at players (you tank, or a tank is in your group).
  state.arena.setScene({ boss: !!enc.boss, targets, npcTank: !opts.tank });
  state.arena.reset();
  if (state.ghostView) state.ghostView.placed = false; // back beside you
  state.encounter = enc.boss ? new BruteEncounter(state.fight, state.arena, raidWarning, bruteAlert) : null;
  if (state.raidPack) state.raidPack.reset();
  if (state.sound) state.sound.setGtfo(null);
  $('#opt-targets').disabled = !!enc.boss;
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
  if (gf) { gf.o.tank = o.tank; gf.holder = gf.targets.map(() => (o.tank ? 'me' : null)); }
}

// The fight engine emits 'start' when you pull (Charge, an attack or the end of the countdown).
function onStart() {
  $('#countdown').classList.add('hidden');
  clearInterval(state.countdownTimer);
  // While the fight runs the button ends it (the only way out of an infinite-health fight).
  $('#btn-start').disabled = false;
  $('#btn-start').textContent = 'End';
}

function countdown() {
  if (state.fight && (state.fight.started || state.fight.over)) newFight();
  let n = 3;
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
    for (const t of state.encounter.timers()) timers.push({ ...t, ...BRUTE_INFO[t.key] });
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
  if (!state.fight || state.fight.over) newFight();
  const m = id.startsWith('macro:') ? macroOf(id) : replacingMacro(id);
  if (m) {
    const res = runMacro(m, state.fight, spellNames(state.sheet), mods);
    if (res.reason) showError(res.reason);
    return;
  }
  if (id.startsWith('macro:')) return;
  const res = state.fight.press(id);
  if (!res.ok) showError(res.reason);
}

function cycleTarget() {
  const f = state.fight;
  f.setPrimary((f.primary + 1) % f.targets.length);
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

function onFightEvent(ev) {
  if (state.group) state.group.onLocalEvent(ev); // debuffs on the shared targets and your swings, for the group
  // Keep every event for the Log tab of the results.
  if (ev.type !== 'queue' && ev.type !== 'target') {
    const entry = { ...ev };
    if (ev.type === 'aura') {
      const a = state.fight.auras[ev.id];
      entry.name = (a && a.name) || (AURAS[ev.id] && AURAS[ev.id].name) || ev.id;
    }
    if (state.fightLog) state.fightLog.push(entry);
  }
  switch (ev.type) {
    case 'start': onStart(); break;
    case 'charge': state.arena.charge(ev.target); break;
    case 'hurt':
      hurtText(ev);
      logLine(ev);
      if (ev.amount > 0) state.arena.hurt();
      state.sound.play(ev.outcome === 'block' || ev.outcome === 'parry' ? 'block' : ev.amount > 0 ? 'hurt' : 'miss');
      break;
    case 'aggro': aggroAlert(ev); logLine(ev); break;
    case 'bossSwing': if (state.arena.boss && ev.target === 0) state.arena.bossSwing(false); break; // a player tank: the boss swings at them
    case 'death': raidWarning('You died'); logLine(ev); state.arena.die(); state.sound.play('death'); break;
    case 'damage': {
      floatText(ev);
      logLine(ev);
      const direct = !ev.key.startsWith('proc') && !['deepWounds', 'rend', 'touchOfTheGrave'].includes(ev.key);
      if (direct && !SPIN.has(ev.key)) state.arena.animate(OFF_HAND.has(ev.key) ? 'oh' : 'mh');
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
    case 'cast':
      logLine(ev);
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
    case 'end': saveResults(); $('#btn-start').disabled = false; $('#btn-start').textContent = 'Again'; break;
    case 'rage': if (!['Main Hand', 'Off Hand', 'refund', 'damage taken'].includes(ev.source)) logLine(ev); break;
    default: break;
  }
}

function logLine(ev) {
  const log = $('#log');
  const li = document.createElement('li');
  const t = `<span class="t">${ev.t.toFixed(1).padStart(5, ' ')}</span> `;
  if (ev.type === 'damage') {
    const what = ev.outcome === 'miss' ? 'missed' : ev.outcome === 'dodge' ? 'was dodged' : ev.outcome === 'parry' ? 'was parried' :
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
  const word = { miss: 'Miss', dodge: 'Dodge', parry: 'Parry' }[ev.outcome];
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
  const word = { miss: 'Miss', dodge: 'Dodge', parry: 'Parry' }[ev.outcome];
  span.textContent = word || fmtNum(ev.amount) + (ev.outcome === 'glance' ? ' (glancing)' : ev.outcome === 'block' ? ' (blocked)' : '');
  span.style.left = `${Math.round(Math.random() * 80 - 40)}px`;
  dummy.appendChild(span);
  setTimeout(() => span.remove(), 1300);
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
    const name = enc.boss ? enc.name : `Training Dummy${f.targets.length > 1 ? ' ' + (i + 1) : ''}`;
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
const lookKey = () => (state.settings.zone === 'trainingGrounds' || !ZONES[state.settings.zone] ? state.settings.timeOfDay : state.settings.zone);

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
const DEFAULT_BARS = SPECS[SPEC].bars;
const BAR_CLASSES = { main: 'fj-main', stances: 'fj-stances', cds: 'fj-cds' };

function loadBars() {
  const saved = store.get('bars.v1', {})[SPEC_KEY];
  const bars = structuredClone(DEFAULT_BARS);
  if (saved) for (const k of Object.keys(bars)) if (Array.isArray(saved[k])) bars[k] = saved[k].filter((id) => ABILITIES[id]);
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
const HOST_FIGHT_KEYS = ['duration', 'targets', 'endMode', 'dummyHealth', 'moveEvery', 'moveFor', 'hitEvery', 'encounter', 'zone', 'targetHits', 'healing'];
// The raid's buffs and debuffs the host decides for everyone (each player's consumables stay their own).
const HOST_RAID_KEYS = ['raidBuffs', 'partyBuffs', 'debuffs', 'trainer'];

function groupContext() {
  return {
    arena: state.arena,
    container: $('#arena'),
    info: () => ({
      race: state.sheet ? state.sheet.race : 'RaceOrc',
      look: gearLook(state.gear),
      transform: state.settings.noggenfogger ? 'noggenfogger' : null,
      bodyType: state.settings.bodyType || null,
      spec: `${SPECS[SPEC].name} ${CLS.name}`,
      cls: (state.sheet && state.sheet.classId) || 'warrior', // raid frame and meter colour
      tank: !!SPECS[SPEC].tank, // with a tank in the group the targets hit back (Settings → Fight, Auto)
    }),
    hostSettings: () => ({
      fight: Object.fromEntries(HOST_FIGHT_KEYS.map((k) => [k, state.settings[k]])),
      raid: Object.fromEntries(HOST_RAID_KEYS.map((k) => [k, state.loadout[k]])),
    }),
    applySettings: applyHostSettings,
    pull: () => countdown(),
    end: () => { if (state.fight && state.fight.started && !state.fight.over) state.fight.stop(); },
    reset: () => { newFight(); raidWarning('The host reset the fight'); },
    onChange: () => { drawGroupPanel(); refreshTankOpts(); if (state.fight) drawMeter(); },
    say: raidWarning,
  };
}

// A guest takes the host's fight settings and raid buffs (for this session; their own saved settings stay).
function applyHostSettings(settings) {
  const fight = settings.fight || {};
  const changed = HOST_FIGHT_KEYS.some((k) => fight[k] !== undefined && fight[k] !== state.settings[k]) ||
    JSON.stringify(settings.raid) !== JSON.stringify(state.groupRaid);
  if (!changed) return;
  const zoneChanged = fight.zone !== undefined && fight.zone !== state.settings.zone;
  for (const k of HOST_FIGHT_KEYS) if (fight[k] !== undefined) state.settings[k] = fight[k];
  state.groupRaid = settings.raid || null;
  for (const [sel, k] of [['#opt-duration', 'duration'], ['#opt-targets', 'targets'], ['#opt-zone', 'zone'], ['#opt-encounter', 'encounter'], ['#opt-end', 'endMode']]) {
    if ($(sel)) $(sel).value = state.settings[k];
  }
  if (zoneChanged) state.arena.setGraphics({ quality: state.settings.quality, time: lookKey() });
  rebuild({ keepMsg: true });
  raidWarning('The host set the fight');
}

function drawGroupPanel() {
  const g = state.group;
  if (!g) return;
  const active = g.active;
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
    ? 'You host: your fight settings and raid buffs count for everyone, and your Start pulls the whole group.'
    : 'The host sets the fight and the raid buffs and pulls. Your spec, gear, talents, consumables, keys and bars stay yours.';
  $('#group-members').innerHTML = g.members.map((m) => `<li>${esc(m.name)}${m.id === g.group.myId ? ' <span class="hint">you</span>' : ''}${m.host ? ' <span class="hint">host</span>' : ''}<small>${esc((m.info && m.info.spec) || '')}</small></li>`).join('');
}

function bindGroup() {
  $('#group-name').value = state.settings.playerName || '';
  // Your name in the group: it has to be chosen before you host or join, and can be changed while in one.
  const name = () => $('#group-name').value.trim().slice(0, 24);
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
  $('#group-copy').addEventListener('click', () => {
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
      }
      row.appendChild(btn);
    });
    // While editing, an empty slot at the end of each bar takes a spell dropped on it.
    if (editing && group.key) row.insertAdjacentHTML('beforeend', `<div class="ab-slot" data-bar="${group.key}" data-idx="${group.ids.length}" title="Drop a spell here"></div>`);
    // The stance icons sit left of the player frame; the power bars are as wide as the main bar.
    if (group.cls === 'fj-stances') stances.appendChild(row);
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
    for (const c of consumableOptions(1)) items[c.id] = 'potion';
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

function buildKeybindList() {
  buildBindPresets();
  const ul = $('#keybind-list');
  ul.innerHTML = '';
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

// Binds the key being listened for in Settings (Escape cancels). A key moves off any action that had it.
function assignBind(k) {
  if (k !== 'Escape') {
    for (const [id, key] of Object.entries(state.binds)) if (key === k) state.binds[id] = '';
    state.binds[state.listening] = k;
    saveBinds();
  }
  state.listening = null;
  refreshKeyLabels();
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
  if (state.listening) {
    const k = keyName(e);
    if (!k) return;
    e.preventDefault();
    assignBind(k);
    return;
  }
  if (typing) return;
  if (e.key === 'Escape') {
    if (resultsOpen()) $('#results').classList.add('hidden');
    else if (state.fight) state.fight.cancelQueue();
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
const overGame = (e) => !(e.target.closest && e.target.closest('.panel, .modal, .side-menu, .topbar, .meters, .raid-frames, input, textarea, select'));
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
  const f = state.fight;
  const dt = Math.min(0.25, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  if (f) {
    state.arena.combat = f.started && !f.over;
    state.arena.fiery = (f.aura('deathWish') ? 1 : 0) + (f.aura('recklessness') ? 1 : 0);
    // The ghost is placed before the arena renders this frame.
    if (state.ghostView) state.ghostView.update(dt, f.primary, f.started && !f.over, !!(state.ghost && state.ghost.away));
    state.arena.bossFocus = bossFocus(f);
    f.setGeometry(state.arena.update(dt, f.primary));
    if (f.started && !f.over) f.advance(f.t + dt);
    if (state.group) state.group.frame(dt, f); // the other players, and your position for them
    state.raidFrames.draw(state.group && state.group.active ? state.group.raidRows(f) : []);
    if (state.drill) state.drill.update();
    // The sim plays up to your fight's clock (it stops where yours stops).
    if (state.ghost && f.started && (state.settings.simGhost || state.settings.simRace)) state.ghost.advanceTo(f.t);
    if (state.encounter) state.encounter.update();
    updateRaidPack(f);
    document.body.classList.toggle('in-fight', f.started && !f.over);
    draw(f, now);
    placeCombatText();
  }
  requestAnimationFrame(frame);
}

// Target of target i: who it attacks ({ name, cls, hp, maxHp }) — you, another player, the NPC tank — or null
// (a training dummy nobody tanks, before the pull).
function totOf(f, i) {
  if (!f.started || f.over || f.targets[i].dead) return null;
  if (!f.o.tank) return state.arena.boss && state.arena.tank && i === 0 ? { name: 'Tank', cls: 'warrior', hp: 1, maxHp: 1 } : null;
  if (f.hasAggro(i)) return { name: state.settings.playerName || 'You', cls: state.sheet.classId, hp: f.health, maxHp: f.maxHealth };
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
  if (a.tank) return a.tank.position;
  if (f.hasAggro(0)) return a.player.position;
  const g = state.group;
  const id = g && g.active ? g.aggroOn(f, 0) : null;
  return (id && g.positionOf(id)) || null;
}

// Keeps the floating combat text anchors and nameplates above the targets (and the player) on screen.
function placeCombatText() {
  const f = state.fight;
  const show = state.settings.nameplates;
  document.querySelectorAll('.nameplate').forEach((np, i) => {
    const p = show ? state.arena.project(i) : null;
    np.style.display = p ? '' : 'none';
    if (!p) return;
    np.style.left = `${p.x}px`;
    np.style.top = `${p.y}px`;
    np.classList.toggle('selected', i === f.primary);
    np.querySelector('.np-fill').style.width = `${f.healthPct(i) * 100}%`;
  });
  document.querySelectorAll('.dummy').forEach((d, j) => {
    const p = d.id === 'player-fct' ? state.arena.projectPlayer() : state.arena.project(j - 1);
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
  const html = `<img src="${iconUrl(icon)}" alt=""><div><b>${esc(name)}</b><span class="when">${esc(when)}</span><span class="why">${esc(why)}</span></div>`;
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
  $('#gcd-fill').style.width = `${(f.gcdLeft() / 1.5) * 100}%`;
  // Cast bar (Slam): fills over the cast, with the time left.
  const c = f.casting;
  $('#cast-bar').classList.toggle('hidden', !c);
  if (c) {
    $('#cast-fill').style.width = `${Math.min(1, (f.t - c.start) / Math.max(0.01, c.end - c.start)) * 100}%`;
    $('#cast-text').textContent = `${ABILITIES[c.id].name} ${Math.max(0, c.end - f.t).toFixed(1)}`;
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
    const gcd = ab.gcd ? f.gcdLeft() : 0;
    const wait = Math.max(cd, gcd);
    const use = ab.item && f.c.uses[ab.item];
    const fullCd = ab.cd || ab.stanceCd || (use && Math.max(use.cd, use.ccd)) || f.gcdFor(id);
    const total = cd >= gcd ? fullCd : f.gcdFor(id);
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
      reason === "Can't do that while in combat" || reason === 'Target is too close' || (HUD && HUD.unusable(reason)) ||
      (id === 'execute' && !f.executePhase()) || (id === 'overpower' && !opWindow));
    btn.classList.toggle('unusable', !!unusable);
    // Fojji icon states: desaturated on cooldown (not for the GCD alone), red tint out of melee range.
    btn.classList.toggle('oncd', cd > 0 && cd > gcd);
    btn.classList.toggle('oor', isMelee(id) && f.started && !f.inMelee());
    btn.classList.toggle('no-rage', !unusable && !proc && f.rage < cost);
    btn.classList.toggle('proc', !!proc);
    btn.classList.toggle('ready-glow', id === 'execute' && f.executePhase() && f.rage >= cost);
    // Always a real boolean: toggle() with undefined flips the class every frame (the buttons blinked).
    btn.classList.toggle('queued', f.queued === id || (!!ab.stance && f.stance === ab.stance));
  });

  drawFojjiExtras(f, opWindow, opReady);

  // Player buffs: class auras plus item / consumable auras.
  const buffs = $('#buffs');
  // The Revenge window opens for any warrior who dodges or parries; only a tank spec shows it.
  const active = Object.keys(f.auras).filter((id) => f.aura(id) && (AURAS[id] || f.auras[id].icon) && (id !== 'revengeWindow' || SPECS[SPEC].tank));
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
    const bar = fr.querySelector('.health');
    bar.querySelector('.fill').style.width = `${hp * 100}%`;
    bar.querySelector('span').textContent = `${(hp * 100).toFixed(1)}%`;
    bar.classList.toggle('execute', hp <= 0.2);
    fr.classList.toggle('primary', i === f.primary);
    const castBar = fr.querySelector('.cast');
    const c = state.encounter && state.encounter.casting;
    castBar.classList.toggle('hidden', !c);
    if (c) {
      castBar.querySelector('.fill').style.width = `${Math.min(1, (f.t - c.start) / (c.end - c.start)) * 100}%`;
      castBar.querySelector('span').textContent = c.name;
    }
    const dist = f.geo.dist[i];
    const range = dist <= 5 ? `<span class="good">${dist.toFixed(1)} yd · melee</span>` : `<span class="bad">${dist.toFixed(1)} yd</span>`;
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
  fillIcons($('#fj-popups'), popups);

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
  return CLS.name;
}

// The class's Fojji pieces (js/classes/<class>/hud.js): popups, target debuffs, reminders and the proc textures.
function drawClassExtras(f) {
  const x = HUD ? HUD.extras(f, { shortKey, binds: state.binds }) : { popups: [], debuffs: [], reminders: [], proc: 0 };
  for (const el of [$('#proc-l'), $('#proc-r')]) {
    el.classList.toggle('on', x.proc > 0);
    if (x.proc > 0) el.style.setProperty('--fill', x.proc);
  }
  fillIcons($('#fj-popups'), x.popups);
  fillIcons($('#fj-debuffs'), x.debuffs);
  fillIcons($('#fj-reminders'), x.reminders);
}

// Fojji sizes are for a 1440p screen; --s scales them (and the offsets) to the window. The unit frames are
// 285 wide like the EllesmereUI profile, narrower when the window has no room for them beside the bars.
function scaleHud() {
  const s = Math.max(0.85, Math.min(1.5, window.innerHeight / 900));
  document.documentElement.style.setProperty('--s', s.toFixed(3));
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
  Assassination: 'ability_rogue_eviscerate', Combat: 'ability_backstab', Subtlety: 'ability_stealth' };
const specIcon = (spec) => SPEC_ICONS[String(spec || '').split(' ')[0]] || 'inv_misc_questionmark';
const classColor = (cls) => CLASS_COLORS[cls] || CLASS_COLORS.warrior;

// One row of an EUI meter: a class-coloured bar `frac` of the way across, the icon, "rank. name" and the value.
function euiRow({ rank, name, value, frac, color, icon, cls = '', title = '' }) {
  return `<li class="${cls}" style="--c:${color}"${title ? ` title="${esc(title)}"` : ''}><div class="bar" style="width:${Math.max(0, Math.min(1, frac)) * 100}%"></div>`
    + `${icon ? `<img class="mi" src="${iconUrl(icon)}" alt="" onerror="this.style.visibility='hidden'">` : ''}`
    + `<span class="nm">${rank ? `<i>${rank}.</i>` : ''}${esc(name)}</span><span class="val">${value}</span></li>`;
}

function drawMeter() {
  const f = state.fight;
  const g = state.group;
  const inGroup = !!(g && g.active);
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
  if (!inGroup) {
    const rows = Object.entries(f.threatMeter).filter(([, m]) => m.threat > 0).sort((a, b) => b[1].threat - a[1].threat).slice(0, 5);
    const top = rows[0] ? rows[0][1].threat : 1;
    const src = iconSource(f);
    ul.innerHTML = rows.map(([key, m], i) => euiRow({
      rank: i + 1, name: m.name, icon: iconFor(key, src), color, frac: m.threat / top,
      value: `${fmtShort(f.t > 0 ? m.threat / f.t : 0)} <small>(${((m.threat / (f.threatTotal || 1)) * 100).toFixed(1)}%)</small>`,
    })).join('') || '<li class="empty"><span class="nm">No threat yet</span></li>';
    return;
  }
  const rows = state.group.threatRows(f, f.primary);
  const top = Math.max(1, ...rows.map((r) => r.threat));
  ul.innerHTML = rows.map((r, i) => euiRow({
    rank: i + 1, name: r.name, icon: r.aggro ? 'ability_warrior_defensivestance' : null, color: classColor(r.cls), frac: r.threat / top,
    cls: `${r.me ? 'me' : ''} ${r.aggro ? 'aggro' : r.pct >= 1 ? 'danger' : ''}`,
    title: r.aggro ? 'Has aggro' : r.pct >= 1 ? 'About to pull aggro (110%)' : '',
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
  const on = state.settings.simRace && state.ghost && !inGroup;
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
  // A rogue: energy lost at the cap, combo points wasted past 5, time without Slice and Dice.
  if (CLASS_ID === 'rogue') {
    return `<dt>Energy lost at the cap</dt><dd class="${cls(r.energyWasted, 30)}">${r.energyWasted.toFixed(0)}</dd>
      <dt>Combo points wasted</dt><dd class="${cls(r.cpWasted, 2)}">${r.cpWasted}</dd>
      <dt>Time without Slice and Dice</dt><dd class="${cls(r.sndDown, 4)}">${r.sndDown.toFixed(1)} s</dd>
      <dt>Attacks parried (stood in front)</dt><dd class="${cls(r.parried, 0)}">${r.parried}</dd>
      <dt>Main-hand time out of range</dt><dd class="${cls(r.outOfRange, 2)}">${r.outOfRange.toFixed(1)} s</dd>
      ${r.damageTaken ? `<dt>Damage taken</dt><dd>${fmtNum(r.damageTaken)}</dd>` : ''}`;
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
  state.lastResults = { fight: snapshotResults(f), log: state.fightLog, meta };
  state.endedAt = performance.now();
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
const abilityText = (id) => (HUD && HUD.ABILITY_TEXT[id]) || (IS_WARRIOR && ABILITY_TEXT[id]) || null;

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
  for (const [key, enc] of Object.entries(ENCOUNTERS)) encSel.add(new Option(enc.name, key));
  encSel.value = ENCOUNTERS[s.encounter] ? s.encounter : 'dummies';
  encSel.addEventListener('change', () => {
    s.encounter = encSel.value;
    store.set('settings', s);
    encSel.blur();
    newFight();
    const enc = ENCOUNTERS[s.encounter];
    if (enc.description) raidWarning(enc.description);
  });
  $('#opt-duration').value = s.duration;
  $('#opt-targets').value = s.targets;
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
  for (const [key, sp] of Object.entries(SPECS)) specSel.add(new Option(`${sp.name} ${CLASSES_BY_ID[sp.classId || 'warrior']}`, key));
  specSel.value = SPEC;
  $('#spec-name').textContent = `${SPECS[SPEC].name} ${CLS.name}`;
  specSel.addEventListener('change', () => {
    s.spec = specSel.value;
    store.set('settings', s);
    location.reload();
  });
  // Show: the sim as a ghost, racing it in the meter, its next cast.
  const showGhost = () => {
    state.ghostView.setVisible(s.simGhost);
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
    store.set('settings', s);
    showFight();
    newFight();
  };
  for (const sel of ['#opt-duration', '#opt-targets', '#opt-start-rage', '#opt-queue', '#opt-shout', '#opt-end', '#opt-health',
    '#opt-move-every', '#opt-move-for', '#opt-hit-every', '#opt-target-hits', '#opt-healing']) $(sel).addEventListener('change', save);
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
    state.macros.push({ id, name: 'New macro', replaces: null, enabled: true, text: '#showtooltip Hamstring\n/cast [nostance:3] Berserker Stance\n/cast Hamstring' });
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
  if (s.bodyType) state.arena.setAppearance({ bodyType: s.bodyType });
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
  state.bars = loadBars();
  bindPanels();
  bindMacroEditor();
  $('#btn-start').addEventListener('click', (e) => {
    e.currentTarget.blur();
    const f = state.fight;
    const g = state.group;
    if (f && f.started && !f.over) { f.stop(); if (g && g.isHost) g.end(); return; }
    // In a group the host pulls for everyone.
    if (g && g.active && !g.isHost) { raidWarning('The host pulls for the group'); return; }
    if (g && g.isHost) g.pull();
    countdown();
  });
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
  state.ghostView = new GhostView(state.arena);
  state.group = new GroupPlay(groupContext());
  state.settings.raidFrames = { ...RAID_FRAME_DEFAULTS, ...(state.settings.raidFrames || {}) };
  state.raidFrames = new RaidFrames($('#raid-frames'), state.settings.raidFrames, () => store.set('settings', state.settings));
  // Sound (js/audio.js) and the raid pack's alerts (js/raid-pack.js), with their saved settings.
  const saved = state.settings;
  saved.sound = { ...SOUND_DEFAULTS, ...(saved.sound || {}) };
  const rpSaved = saved.raidPack || {};
  saved.raidPack = { ...RAID_PACK_DEFAULTS, ...rpSaved, show: { ...RAID_PACK_DEFAULTS.show, ...(rpSaved.show || {}) }, pos: rpSaved.pos || {} };
  state.sound = new Sound(saved.sound);
  state.raidPack = new RaidPack($('#raid-pack'), saved.raidPack, { sound: state.sound, save: () => store.set('settings', state.settings) });
  // Browsers start audio after the first click or key press.
  for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => state.sound.unlock(), true);
  window.furyTrainer = state; // handle for debugging in the browser console
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
