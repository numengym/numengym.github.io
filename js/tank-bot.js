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

export class TankBot {
  // opts: your fight's options (the same boss, length and drills); zone: for its flasks.
  constructor(spec, opts, zone) {
    const def = SPECS[spec];
    this.spec = spec;
    this.name = NAMES[spec] || 'Tank';
    this.label = TANK_SPECS[spec] || def.name;
    this.classId = def.classId || 'warrior';
    const { sheet, gear } = computeSheet({ ...def.loadout }, { zone, classId: this.classId });
    this.sheet = sheet;
    this.gear = gear;
    // Its trinkets for its APL, as aplItems() gives yours.
    const items = {};
    for (const g of gear) if (g.slot === 12 || g.slot === 13) items[g.id] = g.slot === 12 ? 'trinket1' : 'trinket2';
    this.ghost = new SimGhost(sheet, { ...opts, tank: true, group: false, firstAggro: true, metric: 'tps', startStance: def.startStance }, def.apl, items);
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

  // Plays its fight up to your fight's clock.
  advanceTo(t) { this.ghost.advanceTo(t); }

  // Its threat on target i (none once it is dead: the boss turns to the raid).
  threatOn(i) { return this.dead ? 0 : this.f.threat[i] || 0; }
}
