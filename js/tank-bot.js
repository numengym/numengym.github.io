// The NPC tank as a player of the trainer's own: a tank spec (Protection Warrior or Paladin, Feral Bear) with its
// wowsims preset gear, talents and APL plays the boss in a fight of its own (as the sim's ghost does), takes the boss's
// swings there with the raid's external healing on it, and holds the boss by its threat: yours has to pass 110% of it
// to pull (engine/unit.js setOthersThreat, as in a group). Its damage comes off the boss in a fight to the death.
import { computeSheet } from './character.js';
import { SPECS } from './data/specs.js';
import { SimGhost } from './ghost.js';

// The tanks to pick from (Settings → Fight, the raid setup), and each one's name over its head.
export const TANK_SPECS = { prot: 'Protection Warrior', protPaladin: 'Protection Paladin', feralBear: 'Feral Bear' };
const NAMES = { prot: 'Thorgrim', protPaladin: 'Aldric', feralBear: 'Brakka' };

const CLASS_LABELS = { warrior: 'Warrior', paladin: 'Paladin', hunter: 'Hunter', rogue: 'Rogue', priest: 'Priest', shaman: 'Shaman', mage: 'Mage', warlock: 'Warlock', druid: 'Druid' };
// The melee specs: they stand at the boss's flanks (and in its stomps and fears); the rest stand back.
const MELEE = new Set(['fury', 'arms', 'assassination', 'combat', 'subtlety', 'retribution', 'enhancement', 'feralCat', 'prot', 'protPaladin', 'feralBear']);

export class TankBot {
  // opts: your fight's options (the same boss, length and drills); zone: for its flasks.
  // tank: holds the boss (the NPC tank); else an NPC raider of a DPS spec (raid-bots.js), named `name`.
  constructor(spec, opts, zone, { tank = true, name = null } = {}) {
    const def = SPECS[spec];
    this.spec = spec;
    this.tank = tank;
    this.name = name || NAMES[spec] || 'Tank';
    this.classId = def.classId || 'warrior';
    this.label = TANK_SPECS[spec] || `${def.name} ${CLASS_LABELS[this.classId] || ''}`.trim();
    this.melee = MELEE.has(spec);
    this.skill = 0.6 + Math.random() * 0.35; // how often it gets out of the boss's mechanics in time
    this.fearedUntil = 0;
    // A raider is blessed with Salvation (30% less threat), as you are by default; the tank is not.
    const loadout = tank ? { ...def.loadout } : { ...def.loadout, buffs: { ...(def.loadout.buffs || {}), greaterBlessingOfSalvation: true } };
    const { sheet, gear } = computeSheet(loadout, { zone, classId: this.classId });
    this.sheet = sheet;
    this.gear = gear;
    // Its trinkets for its APL, as aplItems() gives yours.
    const items = {};
    for (const g of gear) if (g.slot === 12 || g.slot === 13) items[g.id] = g.slot === 12 ? 'trinket1' : 'trinket2';
    this.ghost = new SimGhost(sheet, tank
      ? { ...opts, tank: true, group: false, firstAggro: true, metric: 'tps', startStance: def.startStance }
      : { ...opts, tank: false, group: false, hps: 0, startStance: def.startStance, botTank: null }, def.apl, items);
    this.dealt = []; // its damage on each target, for a shared health pool
    this.swung = 0;  // its melee hits, for its model's swings
    this.ghost.on((ev) => {
      if (ev.type !== 'damage' || !(ev.amount > 0)) return;
      this.dealt[ev.target] = (this.dealt[ev.target] || 0) + ev.amount;
      this.swung++;
    });
  }

  get f() { return this.ghost.f; }
  get dead() { return !!this.f.dead; }
  get form() { return this.sheet.form || null; } // a Feral tank fights in Dire Bear Form

  // Plays its fight up to your fight's clock. Feared, it runs off out of reach of the boss until the fear breaks.
  advanceTo(t) {
    const f = this.f;
    const feared = this.fearedUntil > f.t;
    if (feared !== !!this.wasFeared) {
      this.wasFeared = feared;
      f.geo = { ...f.geo, dist: f.geo.dist.map(() => (feared ? 40 : f.home || 0)) };
    }
    this.ghost.advanceTo(t);
  }

  // Its threat on target i (none once it is dead: the boss turns to the raid).
  threatOn(i) { return this.dead ? 0 : this.f.threat[i] || 0; }
}
