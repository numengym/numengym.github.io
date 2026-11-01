// Healing on top of a class's fight (the priest's, paladin's, shaman's or druid's): the class keeps all of its own
// spells, and gains its heals (data/healing.js), cast on a player of the raid (engine/raid.js): the one under your
// mouse on the raid frames, else the one you clicked, else you (healTarget(), set by main.js). There is no healing
// sim or APL in wowsims; the numbers are the spell rows. Heals and dispels are handled here in full (their mana,
// cooldown, cast and effect), every other ability by the class.
import { HEALS } from '../data/healing.js';
import { SimRaid } from '../engine/raid.js';

const HEAL_GCD = 1.5;
const HEAL_CRIT_MULT = 1.5; // a heal's crit heals 50% more

export function withHealing(Base, cls) {
  const own = Object.fromEntries(Object.entries(HEALS).filter(([, h]) => h.cls === cls));
  return class HealerFight extends Base {
    static ABILITIES = { ...Base.ABILITIES, ...own };
    static HEALS = own;

    constructor(sheet, opts, rng = Math.random, encounter = null) {
      super(sheet, opts, rng, encounter);
      this.raid = new SimRaid(this, { name: opts.playerName || 'You', cls });
      this.healMeter = {};   // key -> { name, icon, healing, overheal, count, crits }
      this.healTotal = 0;
      this.overhealTotal = 0;
      this.healTarget = () => 'me';
    }

    get healer() { return true; }
    isHeal(id) { return !!own[id]; }

    start() {
      const first = !this.started;
      super.start();
      if (first) this.raid.start(); // the boss's damage on the raid begins with the pull
    }

    hps() { return this.t > 0 ? this.healTotal / this.t : 0; }

    // ---- what a heal costs and takes ----------------------------------------------------------------------

    cost(id) {
      const h = own[id];
      if (!h) return super.cost(id);
      return h.costPct ? h.costPct * this.cs.base.mana : h.cost || 0;
    }
    castTime(id) {
      const h = own[id];
      if (!h) return super.castTime(id);
      return h.castTime ? Math.max(0, h.castTime - this.castTimeBonus(id)) / this.hasteMult() : 0;
    }
    gcdFor(id) { return own[id] ? HEAL_GCD : super.gcdFor(id); }
    // Holy Shock's heal shares its damage's cooldown.
    cdLeft(id) {
      const h = own[id];
      return super.cdLeft(h && h.cdKey ? h.cdKey : id);
    }

    // Your healing power: +healing and spell damage gear, and temporary spell power.
    healPower() { return (this.c.healingPower ?? this.c.spellPower ?? 0) + this.tempStats().spellPower; }
    // Power Infusion (yours, or another priest's in a group) heals 20% more.
    healMult() { return (this.aura('powerInfusion') ? 1.2 : 1) * (this.hasExternals ? this.externalMult('dmgDone') : 1); }
    healCritChance() {
      const int = typeof this.intellect === 'function' ? this.intellect() : this.int || 0;
      const cs = this.cs || {};
      return Math.min(1, ((cs.spellCrit || 0) + (this.c.spellCritPct || 0) + int * (cs.critPerInt || 0)) / 100);
    }

    blocker(id) {
      const h = own[id];
      if (!h) return super.blocker(id);
      if (this.over) return 'The fight is over';
      if (this.dead) return 'You are dead';
      if (h.talent && !this.tal[h.talent]) return `${h.name} is not talented`;
      const u = this.raid.unit(this.healTarget());
      if (!u || this.raid.isDead(u)) return 'Your target is dead';
      if (h.dispel && !u.debuffs.some((d) => h.dispel.includes(d.type))) return 'Nothing to dispel';
      if (h.shield && u.weakenedUntil > this.t) return 'Your target has Weakened Soul';
      if (h.swiftmend && !['rejuvenation', 'regrowth'].some((x) => u.hots[x] && u.hots[x].end > this.t)) return 'Needs your Rejuvenation or Regrowth on the target';
      if (h.castTime && this.geo.moving) return "Can't do that while moving";
      if (this.casting) return 'Ability is not ready yet';
      if (this.cdLeft(id) > 0) return 'Ability is not ready yet';
      if (this.gcdLeft() > 0) return 'Ability is not ready yet';
      if (this.mana < this.cost(id)) return 'Not enough mana';
      return null;
    }

    // A heal before the pull pulls (the raid starts taking damage), then is cast as in the fight.
    press(id, mods = {}) {
      if (own[id] && !this.started && !this.over) {
        const reason = this.blocker(id);
        if (reason) return { ok: false, reason };
        this.start();
      }
      return super.press(id, mods);
    }

    // A heal begins on the player chosen now; it lands on them when the cast ends.
    cast(id) {
      const h = own[id];
      if (!h) { super.cast(id); return; }
      const unit = this.healTarget();
      if (this.started) this.gcdEnd = this.t + this.gcdFor(id);
      if (h.cd) this.cds[h.cdKey || id] = this.t + h.cd;
      this.stats.casts.push({ t: this.t, id });
      this.emit({ type: 'cast', id });
      const castTime = this.castTime(id);
      if (castTime > 0) {
        const c = { id, start: this.t, end: this.t + castTime, resets: false, unit };
        this.casting = c;
        this.emit({ type: 'castStart', id, end: c.end, unit });
        this.schedule(c.end, () => this.finishCast(c));
        return;
      }
      this.completeCast({ id, instant: true, unit });
    }

    // What the cast you are in will heal its target for (an average), for the raid frames' incoming heal.
    incomingHeal() {
      const c = this.casting;
      const h = c && own[c.id];
      if (!h || !h.base) return null;
      return { unit: c.unit, amount: (h.base + h.coef * this.healPower()) * this.healMult() };
    }

    // ---- what a heal does ---------------------------------------------------------------------------------

    completeCast(c) {
      const h = own[c.id];
      if (!h) { super.completeCast(c); return; }
      this.spendMana(this.cost(c.id), c.id);
      const raid = this.raid;
      const u = raid.unit(c.unit) || raid.me;
      if (raid.isDead(u)) return;
      if (h.dispel) {
        const i = u.debuffs.findIndex((d) => h.dispel.includes(d.type));
        if (i >= 0) { const [d] = u.debuffs.splice(i, 1); this.emit({ type: 'dispel', unit: u.id, name: d.name }); }
        return;
      }
      if (h.shield) {
        const amount = (h.shield.amount + h.shield.coef * this.healPower()) * this.healMult();
        raid.shield(u, amount, h.shield.duration, h.shield.weakened);
        this.trackHeal(c.id, h, u, 0, 0, false, amount);
        return;
      }
      // A mark of yours on one ally (Oath of Light, Light's Vigil): one at a time, shown with your heals over time; the
      // class reads it (healMods, beforeHeal).
      if (h.mark) {
        for (const m of raid.units) delete m.hots[c.id];
        u.hots[c.id] = { end: this.t + h.mark.duration, icon: h.icon };
        return;
      }
      if (h.swiftmend) {
        const eat = u.hots.rejuvenation && u.hots.rejuvenation.end > this.t ? 'rejuvenation' : 'regrowth';
        const hot = own[eat].hot;
        delete u.hots[eat];
        this.landHeal(c.id, h, u, { amount: (hot.tick + hot.coef * this.healPower()) * (eat === 'rejuvenation' ? 4 : 6) * this.healMult(), crit: false });
        return;
      }
      if (h.base) {
        // The class's say on a direct heal (a paladin's: Light's Vigil on the target, the talents and Divine Favor).
        if (this.beforeHeal) this.beforeHeal(c.id, h, u);
        const mods = this.healMods ? this.healMods(c.id, h, u) : null;
        if (mods) { this.landHeal(c.id, h, u, this.rollHeal(h, mods)); return; }
        if (h.party) {
          for (const m of raid.groupOf(u)) if (!raid.isDead(m)) this.landHeal(c.id, h, m, this.rollHeal(h));
        } else if (h.chain) {
          // Chain Heal: the target, then the most hurt others, half as much each jump.
          const hit = [u];
          let mult = 1;
          for (let k = 0; k < h.chain.jumps; k++) {
            const target = k === 0 ? u : raid.mostHurt(hit, 1)[0];
            if (!target) break;
            if (k > 0) hit.push(target);
            const r = this.rollHeal(h);
            // Your Riptide on the first target: 25% more, and it stays (Forever; consuming it is later expansions).
            const tide = k === 0 && target.hots.riptide && target.hots.riptide.end > this.t;
            this.landHeal(c.id, h, target, { amount: r.amount * mult * (tide ? 1.25 : 1), crit: r.crit });
            mult *= h.chain.mult;
          }
          this.emit({ type: 'chainHeal', key: c.id, units: hit.map((target) => target.id) });
        } else this.landHeal(c.id, h, u, this.rollHeal(h));
      }
      if (h.hot) this.applyHot(c.id, h, u);
    }

    // A direct heal's amount: its roll, your healing power at its coefficient, a crit for 50% more. mods (the class's
    // healMods): { flat (added to the roll), mult, critPct, critMult (times the whole crit), forceCrit }.
    rollHeal(h, mods = null) {
      const m = mods || {};
      let amount = (h.base * (1 + (this.rng() - 0.5) * (h.variance || 0)) + (m.flat || 0) + h.coef * this.healPower()) * this.healMult() * (m.mult || 1);
      const crit = !!m.forceCrit || this.rng() < Math.min(1, this.healCritChance() + (m.critPct || 0) / 100);
      if (crit) amount *= HEAL_CRIT_MULT * (m.critMult || 1);
      return { amount, crit };
    }

    // Your heal over time on a player: a new one replaces your last.
    applyHot(id, h, u) {
      const token = Symbol(id);
      u.hots[id] = { end: this.t + h.hot.period * h.hot.ticks, icon: h.icon, token };
      for (let k = 1; k <= h.hot.ticks; k++) {
        this.schedule(this.t + h.hot.period * k, () => {
          const cur = u.hots[id];
          if (!cur || cur.token !== token || this.raid.isDead(u)) return;
          this.landHeal(id, h, u, { amount: (h.hot.tick + h.hot.coef * this.healPower()) * this.healMult(), crit: false, tick: true });
          if (k === h.hot.ticks) delete u.hots[id];
        });
      }
    }

    landHeal(key, h, u, { amount, crit, tick = false }) {
      const r = this.raid.heal(u, amount);
      this.trackHeal(key, h, u, r.done, r.over, crit, 0, tick);
      if (crit && this.onHealCrit) this.onHealCrit(key, h);
    }

    // The healing meter (healing done, overhealing, absorbs) and the event the raid frames show.
    trackHeal(key, h, u, done, over, crit, absorb = 0, tick = false) {
      const m = this.healMeter[key] || (this.healMeter[key] = { name: h.name, icon: h.icon, healing: 0, overheal: 0, count: 0, crits: 0 });
      m.healing += done + absorb;
      m.overheal += over;
      m.count++;
      if (crit) m.crits++;
      this.healTotal += done + absorb;
      this.overhealTotal += over;
      this.emit({ type: 'raidHeal', key, name: h.name, unit: u.id, amount: Math.round(done + absorb), overheal: Math.round(over), crit, absorb: absorb > 0, tick });
    }
  };
}
