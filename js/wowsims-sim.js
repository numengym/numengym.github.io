// Runs the real wowsims Forever sim in this page, for the score's reference: the same Go engine the wowsims
// site runs (its sim_worker.js and lib.wasm, loaded from www.wowsims.com), in a Web Worker so a fight never
// stutters. Each request is the player's setup as a wowsims RaidSimRequest in JSON (proto/api.proto); the
// sim's build has no item database of its own, so the request carries the equipped items' data from the
// wowsims db.json, as the wowsims site does.
import { toWowsimsExport } from './wowsims.js';
import { classOf } from './classes/index.js';

const WS = 'https://www.wowsims.com/forever/';

// SimItem / SimEnchant fields (proto/db.proto); db.json entries also carry icons, sources and the like.
const ITEM_FIELDS = ['id', 'name', 'type', 'armorType', 'weaponType', 'handType', 'rangedWeaponType', 'qualityModifier',
  'weaponSpeed', 'setName', 'setId', 'scalingOptions', 'itemEffects', 'limitCategory', 'unique', 'pseudoStats',
  'classAllowlist', 'spellSchool'];
const ENCHANT_FIELDS = ['effectId', 'name', 'type', 'stats', 'enchantEffects', 'enchantType', 'extraTypes', 'pseudoStats',
  'weaponDamage', 'procKind'];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

let workerPromise = null;
let dbPromise = null;
let nextId = 0;

// The wowsims worker: their sim_worker.js asks for the compiled wasm module, then says "ready".
function simWorker() {
  if (workerPromise) return workerPromise;
  workerPromise = new Promise((resolve, reject) => {
    const src = new Blob([`importScripts('${WS}sim_worker.js');`], { type: 'text/javascript' });
    const worker = new Worker(URL.createObjectURL(src));
    const module = (async () => {
      const res = await fetch(`${WS}lib.wasm.gz`);
      if (!res.ok) throw new Error(`lib.wasm.gz: HTTP ${res.status}`);
      const bytes = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      return WebAssembly.compile(bytes);
    })();
    const timer = setTimeout(() => reject(new Error('The wowsims sim did not start')), 60000);
    worker.onerror = (e) => { clearTimeout(timer); reject(new Error(e.message || 'The wowsims worker failed')); };
    worker.onmessage = async ({ data }) => {
      if (data.msg === 'wasmModuleRequest') {
        try { worker.postMessage({ msg: 'wasmModule', module: await module }); } catch (e) { clearTimeout(timer); reject(e); }
      } else if (data.msg === 'ready') {
        clearTimeout(timer);
        worker.onmessage = null;
        resolve(worker);
      }
    };
  }).catch((e) => { workerPromise = null; throw e; });
  return workerPromise;
}

function wowsimsDb() {
  if (!dbPromise) {
    dbPromise = fetch(`${WS}assets/database/db.json`).then((r) => {
      if (!r.ok) throw new Error(`db.json: HTTP ${r.status}`);
      return r.json();
    }).catch((e) => { dbPromise = null; throw e; });
  }
  return dbPromise;
}

async function raidSimJson(request, msg = 'raidSimJson') {
  const worker = await simWorker();
  const id = `ng${++nextId}`;
  const reply = await new Promise((resolve) => {
    const onMessage = ({ data }) => {
      if (data.id !== id) return;
      worker.removeEventListener('message', onMessage);
      resolve(data);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ msg, id, inputData: JSON.stringify(request) });
  });
  if (reply.error) throw new Error(reply.error);
  if (reply.outputData == null) throw new Error(`The wowsims sim gave no result: ${JSON.stringify(reply).slice(0, 400)}`);
  const text = typeof reply.outputData === 'string' ? reply.outputData : new TextDecoder().decode(reply.outputData);
  const result = JSON.parse(text);
  if (result.error && result.error.message) throw new Error(result.error.message.split('\n')[0]);
  return result;
}

// The RaidSimRequest for a loadout and the trainer's fight settings.
// fight: { duration, targets, startRage, sunderMode, execute: 'last20' | 'always' | 'never', startStance, prot, tank, hps }; apl:
// the APL the rotation helper follows; zoneId: the game zone. prot: the Protection Warrior spec; tank: the targets
// attack you and your healers heal hps per second (the wowsims healing model at a 0.3 s cadence).
function buildRequest(db, loadout, fight, apl, zoneId, iterations, seed) {
  const root = JSON.parse(toWowsimsExport(loadout));
  const player = { ...root.player, name: 'Player', class: 'ClassWarrior' };
  if (loadout.consumables) player.consumables = loadout.consumables;
  const itemById = new Map(db.items.map((i) => [i.id, i]));
  const enchantById = new Map(db.enchants.map((e) => [e.effectId, e]));
  // Items wowsims does not know (any more) would stop the sim: they are left out and reported.
  const skipped = [];
  player.equipment = {
    items: player.equipment.items.map((it) => {
      if (!it.id || itemById.has(it.id)) return it;
      skipped.push(it.id);
      return {};
    }),
  };
  const items = player.equipment.items.filter((it) => it.id);
  player.database = {
    items: items.map((it) => pick(itemById.get(it.id), ITEM_FIELDS)),
    enchants: items.map((it) => enchantById.get(it.enchant)).filter(Boolean).map((e) => pick(e, ENCHANT_FIELDS)),
    randomSuffixes: db.randomSuffixes.filter((s) => items.some((it) => it.randomSuffix === s.id)),
    consumables: db.consumables.map(({ icon, ...c }) => c),
    spellEffects: db.spellEffects || [],
    itemEffectRandPropPoints: db.itemEffectRandPropPoints || [],
  };
  player.rotation = { type: 'TypeAPL', ...apl };
  // Another class: its wowsims spec message (classes/index.js), and melee distance as the wowsims presets have it.
  const cls = classOf(fight.classId || 'warrior', loadout.variant);
  if (cls.wowsims.spec) {
    player.class = cls.wowsims.cls;
    delete player.dpsWarrior;
    delete player.protectionWarrior;
    Object.assign(player, cls.wowsims.spec(fight));
    player.distanceFromTarget = cls.wowsims.distance ?? 5;
    if (fight.tank) {
      player.inFrontOfTarget = true;
      player.healingModel = { hps: fight.hps || 0, cadenceSeconds: 0.3 };
    }
    return requestOf(db, root, player, fight, zoneId, iterations, seed, skipped);
  }
  const spec = player.dpsWarrior || player.protectionWarrior || {};
  const options = spec.options || {};
  // The stance the fight starts in (proto WarriorStance; unset it would be none at all): Berserker for Fury,
  // Battle for Arms, Defensive for Protection, as the trainer starts you.
  const defaultStance = { battle: 'WarriorStanceBattle', defensive: 'WarriorStanceDefensive' }[fight.startStance] || 'WarriorStanceBerserker';
  // Protection takes the wowsims Protection defaults (presets.ts DefaultOptions) under the export's own options.
  const protDefaults = fight.prot ? { queueDelay: 250, useBattleShout: true, stanceSnapshot: true } : {};
  const specOptions = { ...spec, options: { ...options, classOptions: { ...protDefaults, ...(options.classOptions || {}), startingRage: fight.startRage || 0, defaultStance } } };
  delete player.dpsWarrior;
  delete player.protectionWarrior;
  if (fight.prot) player.protectionWarrior = specOptions; else player.dpsWarrior = specOptions;
  if (fight.tank) {
    player.inFrontOfTarget = true;
    player.healingModel = { hps: fight.hps || 0, cadenceSeconds: 0.3 };
  }
  return requestOf(db, root, player, fight, zoneId, iterations, seed, skipped);
}

// The request around a finished player: the raid, its buffs and debuffs and the encounter.
function requestOf(db, root, player, fight, zoneId, iterations, seed, skipped) {
  // The wowsims "Raid Target" (level 63 boss, 3731 armor), once per target; in a tank fight they attack player 0.
  const preset = (db.encounters.find((e) => e.path === 'Default/Raid Target') || db.encounters[0]).targets[0].target;
  const targets = Array.from({ length: fight.targets || 1 }, (_, i) => ({ ...preset, name: i ? `${preset.name} ${i + 1}` : preset.name, ...(fight.tank ? { tankIndex: 0 } : {}) }));
  // wowsims' raid Sunder Armor is up all fight. When other warriors only help stack it at the pull, you keep it
  // up yourself in the trainer, so the sim does its own Sunders too (its APL stacks and refreshes them).
  const debuffs = { ...(root.debuffs || {}) };
  if (fight.sunderMode === 'help') delete debuffs.sunderArmor;
  return {
    request: {
      raid: {
        parties: [{ players: [player], buffs: root.partyBuffs || {} }],
        numActiveParties: 1,
        buffs: root.raidBuffs || {},
        debuffs,
        ...(fight.tank ? { tanks: [{ type: 'Player', index: 0 }] } : {}),
      },
      encounter: {
        duration: fight.duration, durationVariation: 0, zoneId: zoneId || 0, targets,
        executeProportion20: fight.execute === 'always' ? 1 : fight.execute === 'never' ? 0 : 0.2,
      },
      simOptions: { iterations, randomSeed: seed, saveAllValues: true },
      type: 'SimTypeIndividual',
    },
    skipped,
  };
}

// The wowsims sim's DPS for this setup: every iteration's DPS, sorted, plus its average and the item IDs it
// had to leave out. 500 iterations for a 2 minute fight, about 6 seconds (fewer for longer fights, to keep it quick).
export async function wowsimsReference({ loadout, fight, apl, zoneId, seed = 20261104 }) {
  const started = performance.now();
  const db = await wowsimsDb();
  const iterations = Math.max(200, Math.min(1000, Math.round(500 * 120 / Math.max(30, fight.duration))));
  const { request, skipped } = buildRequest(db, loadout, fight, apl, zoneId, iterations, seed);
  const result = await raidSimJson(request);
  const player = result.raidMetrics.parties[0].players[0];
  // A tank spec is measured on threat per second; its every-iteration values are the threat's.
  const metrics = fight.metric === 'tps' ? player.threat : player.dps;
  const values = (metrics.allValues || []).slice().sort((a, b) => a - b);
  if (!values.length) throw new Error('The wowsims sim returned no results');
  // Per action (spell, item or auto attack): DPS, TPS and casts per fight, for comparing the trainer's engine.
  const n = values.length;
  const actions = (player.actions || []).map((a) => {
    const sum = (k) => a.targets.reduce((s, t) => s + (t[k] || 0), 0);
    const id = a.id.spellId || a.id.itemId || `${a.id.otherId}${a.id.tag ? `/${a.id.tag}` : ''}`;
    return { id, dps: sum('damage') / n / fight.duration, tps: sum('threat') / n / fight.duration, casts: sum('casts') / n, hits: sum('hits') / n, crits: sum('crits') / n,
      ticks: sum('ticks') / n, critTicks: sum('critTicks') / n };
  }).filter((a) => a.dps > 0 || a.casts > 0 || a.tps > 0).sort((a, b) => b.dps - a.dps);
  return { dps: values, avg: metrics.avg, stdev: metrics.stdev, iterations: n, skipped, actions, ms: performance.now() - started,
    other: { dps: player.dps && player.dps.avg, tps: player.threat && player.threat.avg, dtps: player.dtps && player.dtps.avg } };
}

// One wowsims fight with its combat log, for checking the trainer's engine against wowsims line by line
// (from the browser console). Same arguments as wowsimsReference.
export async function wowsimsLog({ loadout, fight, apl, zoneId, seed = 1 }) {
  const db = await wowsimsDb();
  const { request } = buildRequest(db, loadout, fight, apl, zoneId, 1, seed);
  request.simOptions.debug = true;
  const result = await raidSimJson(request);
  return result.logs || '';
}

// The wowsims character sheet for a setup (its computeStats: final stats with buffs, consumables and talents), for
// checking the trainer's sheet from the browser console. Same arguments as wowsimsReference.
export async function wowsimsStats({ loadout, fight, apl, zoneId }) {
  const db = await wowsimsDb();
  const { request } = buildRequest(db, loadout, fight, apl, zoneId, 1, 1);
  return raidSimJson({ raid: request.raid, encounter: request.encounter }, 'computeStatsJson');
}

// Starts loading the sim (about 5 MB, cached by the browser) before the first fight ends.
export function warmUpWowsims() {
  Promise.all([simWorker(), wowsimsDb()]).catch(() => { /* the score falls back to the bot */ });
}
