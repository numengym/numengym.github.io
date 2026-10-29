// What every caster shares on top of the core unit (engine/unit.js): mana with the five-second rule (sim/core/mana.go),
// no melee, casts with a cast time, channels, the global cooldown, pressing and queueing, and the review's idle time.
// A class module (mage, priest, ...) extends it with its spells: completeCast(c) resolves a cast, and the hooks below
// (castingShare, castTime, cost, classBlocker, spellRange, ...) say how its spells differ.
import { MANA } from '../data/class-stats.js';
import { Unit } from '../engine/unit.js';

export const CASTER_GCD = 1.5;
const RANGE = 30;
const REVELATION_TRIGGER = 1248806; // Enchant Weapon - Revelation's proc spell
const REVELATION_DURATION = 15;
const JOW_CHANCE = 0.5; // as the melee proc in engine/unit.js

export class CasterFight extends Unit {
  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    // No melee: a caster casts. (A wand is not modelled.)
    this.mhNext = Infinity;
    this.ohNext = Infinity;
    this.dual = false;
    this.fsrEnd = -Infinity; // the five-second rule: spirit regen is cut until 5 s after the last mana spent
    this.icd = {};
    Object.assign(this.review, { manaWasted: 0, castsCancelled: 0, idle: 0 });
    Object.assign(this.stats, { rage: [], rageGain: {}, rageWaste: {}, rageSpent: {} }); // the resource (mana) for the results
  }

  // Intellect and mana once the class knows its talents: intMore is the extra Intellect from talents, maxManaMult a
  // multiplier on the maximum (Gnome Expansive Mind).
  initMana(intMore = 0, maxManaMult = 1) {
    const sheet = this.c;
    this.int = sheet.int + intMore;
    this.maxMana = ((sheet.mana || 0) + intMore * MANA.perInt) * maxManaMult;
    this.baseCritPct = (sheet.spellCritPct || 0) + intMore * this.cs.critPerInt;
    this.manaNow = this.maxMana;
    this.manaAt = 0;
  }

  get resourceName() { return 'Mana'; }
  get power() { return this.mana; }
  get maxPower() { return this.maxMana; }
  get rage() { return this.mana; }
  set rage(v) { this.mana = v; }
  get maxRage() { return this.maxMana; }

  // ---- mana ---------------------------------------------------------------------------------------

  spiritRegen() {
    const spi = (this.c.spi || 0) + this.tempStats().spi;
    return MANA.spiritBase + spi * MANA.perSpirit;
  }
  // The share of the spirit regen that goes on while casting (Meditation, Mage Armor...).
  castingShare() { return 0; }
  // Mana per second outside and inside the five-second rule (mana.go).
  regenRates() {
    // Another druid's Innervate (group play): the spirit regen 5 times as fast, all of it while casting.
    const inn = this.auras['ext:innervate'];
    const spirit = this.spiritRegen() * (inn ? inn.ext.regen : 1);
    const mp5 = ((this.c.mp5 || 0) + this.tempStats().mp5) / 5;
    return { free: mp5 + spirit, casting: mp5 + spirit * (inn ? 1 : Math.min(1, this.castingShare())) };
  }

  syncMana() {
    const from = this.manaAt;
    const to = this.t;
    if (to <= from) return;
    const r = this.regenRates();
    const fsr = Math.max(from, Math.min(to, this.fsrEnd));
    const gained = (fsr - from) * r.casting + (to - fsr) * r.free;
    const room = this.maxMana - this.manaNow;
    if (gained > room) {
      if (this.started) this.review.manaWasted += gained - room;
      this.manaNow = this.maxMana;
    } else this.manaNow += gained;
    if (this.started) this.stats.rageGain.Regeneration = (this.stats.rageGain.Regeneration || 0) + gained;
    this.manaAt = to;
  }

  get mana() { this.syncMana(); return this.manaNow; }
  set mana(v) { this.syncMana(); this.manaNow = Math.max(0, Math.min(this.maxMana, v)); }

  gain(amount, source) { this.addMana(amount, source); }
  spend(amount, by) { this.spendMana(amount, by); }
  energize(misc, amount, source) { if (misc === 0) this.addMana(amount, source); }

  addMana(amount, source) {
    const before = this.mana;
    this.mana = before + amount;
    const s = this.stats;
    s.rageGain[source] = (s.rageGain[source] || 0) + amount;
    const wasted = amount - (this.manaNow - before);
    if (wasted > 1e-9) s.rageWaste[source] = (s.rageWaste[source] || 0) + wasted;
    this.emit({ type: 'rage', resource: 'mana', amount, source, total: this.manaNow });
  }

  spendMana(amount, by = 'other') {
    if (amount <= 0) return;
    this.mana -= amount;
    this.fsrEnd = this.t + MANA.fiveSecondRule;
    this.stats.rageSpent[by] = (this.stats.rageSpent[by] || 0) + amount;
  }

  sampleResource() {
    const r = this.stats.rage;
    if (!r.length || this.t - r[r.length - 1][0] >= 0.25) r.push([this.t, this.mana]);
  }

  // Auras that change the regeneration (Evocation, Mage Armor, Dark Inspiration): the mana up to their start or end
  // is counted at the old rate.
  regenAura() { return false; }
  setAura(id, ...args) { if (this.regenAura(id) || id === 'ext:innervate') this.syncMana(); super.setAura(id, ...args); }
  expire(id, end) { if (this.regenAura(id) || id === 'ext:innervate') this.syncMana(); super.expire(id, end); }
  dropAura(id) { if (this.regenAura(id) || id === 'ext:innervate') this.syncMana(); super.dropAura(id); }

  intellect() { return this.int + this.tempStats().int * (this.c.statMult || 1); }

  // Judgement of Wisdom on the target (a raid debuff): a spell landing on it has the paladin's chance to give mana
  // back (sim/core/buffs/paladin.go: any direct attack or spell that lands).
  judgementOfWisdom() {
    if (this.c.jow && this.rng() < JOW_CHANCE) this.addMana(this.c.jow, 'Judgement of Wisdom');
  }

  // The targets an area spell reaches: around you (radius yards), or on the ground under your target (ground: the world
  // gives each target's distance from you only, so those within radius of your target's distance).
  areaTargets(radius, ground = false) {
    const d0 = this.geo.dist[this.primary];
    return this.targets.filter((t) => !t.dead && (ground ? Math.abs(this.geo.dist[t.i] - d0) <= radius : this.geo.dist[t.i] <= radius));
  }

  // Touch of the Grave (Undead): a damaging spell landing has a chance (once in 15 sec) to drain 5% of your maximum
  // health from the target as Shadow damage, which rolls to hit and takes no modifiers (a spell landing for Judgement of
  // Wisdom).
  touchOfTheGrave(target) {
    const tog = this.racial.touchOfTheGrave;
    if (!tog || (this.procIcd.tog || 0) > this.t || this.rng() >= tog.casterChance) return;
    this.procIcd.tog = this.t + tog.icd;
    if (this.rng() >= this.hitChance('shadow')) { this.record('touchOfTheGrave', 'Touch of the Grave', 0, 'miss', target.i); return; }
    this.record('touchOfTheGrave', 'Touch of the Grave', tog.healthPct * this.c.health, 'hit', target.i);
    this.judgementOfWisdom();
  }

  // Enchant Weapon - Revelation (8217, sim/common/forever/enchants.go): a direct spell landing without a crit has the
  // enchant's chance to give the class's Revelation: the next of `spells` is a sure crit (one charge, 15 s).
  initRevelation(spells) {
    const rev = (this.c.procs || []).find((p) => p.fx && p.fx.b === REVELATION_TRIGGER);
    this.revelationChance = rev ? rev.chance : 0;
    this.revelationSpells = spells;
  }
  rollRevelation(crit) {
    if (!crit && this.revelationChance && this.rng() < this.revelationChance) this.setAura('revelation', REVELATION_DURATION);
  }
  // Revelation is spent by the next spell it names: that one is a sure crit.
  takeRevelation(id) {
    if (!this.revelationSpells || !this.revelationSpells.has(id) || !this.aura('revelation')) return false;
    this.dropAura('revelation');
    return true;
  }

  // ---- casting -------------------------------------------------------------------------------------------

  gcdFor() { return CASTER_GCD; }
  castResets() { return false; }
  castTime(id) {
    const ab = this.A[id];
    return ab && ab.castTime ? Math.max(0, ab.castTime / this.hasteMult()) : 0;
  }
  cost(id) {
    const ab = this.A[id];
    if (!ab) return 0;
    return ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
  }
  spellRange(id) { return this.A[id].range || RANGE; }
  // The class's own reasons a spell cannot be cast (an aura already up, a missing form), checked before range.
  classBlocker() { return null; }
  // Abilities usable before the pull without starting the fight.
  get prepull() { return this.constructor.PREPULL || new Set(); }
  // Abilities whose cooldown starts later than the cast (Presence of Mind, Inner Focus: when they are spent).
  cdOnCast(id) { return !!this.A[id].cd; }

  blocker(id) {
    const ab = this.A[id];
    if (!ab) return 'Unknown ability';
    if (this.over) return 'The fight is over';
    if (ab.talent && !this.tal[ab.talent]) return `${ab.name} is not talented`;
    if (ab.item) {
      const use = this.c.uses[ab.item];
      if (!use) return `No ${ab.name.toLowerCase()} with a use effect`;
      if (use.oncePerFight && this.used[id]) return 'Only one potion per fight';
    }
    if (ab.racial && !this.racial.active) return 'Your race has no offensive racial';
    if (ab.once && this.used[id]) return 'You have no more of those';
    const own = this.classBlocker(id);
    if (own) return own;
    if (ab.spell) {
      const d = this.geo.dist[this.primary];
      if (d > this.spellRange(id)) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if ((ab.castTime || ab.channel) && this.geo.moving && this.castTime(id) + (ab.channel || 0) > 0) return "Can't do that while moving";
    if (this.casting) return 'Ability is not ready yet';
    if (this.cdLeft(id) > 0) return 'Ability is not ready yet';
    if (ab.gcd && this.gcdLeft() > 0) return 'Ability is not ready yet';
    if (this.mana < this.cost(id)) return 'Not enough mana';
    return null;
  }

  wouldFail(id) {
    let reason = this.blocker(id);
    if (reason === 'Ability is not ready yet' && this.readyIn(id) <= this.o.queueWindow) reason = null;
    return reason;
  }

  press(id, mods = {}) {
    const ab = this.A[id];
    if (!ab) return { ok: false, reason: 'Unknown ability' };
    if (ab.petCommand || ab.petSpell) return this.pressPet(id, ab, mods);
    if (!this.started) {
      if (this.over) return { ok: false, reason: 'The fight is over' };
      if (this.precast) return { ok: false, reason: 'Ability is not ready yet' };
      const reason = this.blocker(id);
      if (reason) return { ok: false, reason };
      if (this.prepull.has(id)) { this.cast(id); return { ok: true }; }
      // A cast begun before the fight lands at the pull (a dummy's fight starts with the first hit).
      if (!ab.channel && !ab.item && this.castTime(id) > 0) { this.beginPrecast(id); return { ok: true }; }
      this.start();
    }
    const reason = this.blocker(id);
    if (!reason) { this.cast(id); return { ok: true }; }
    const wait = this.readyIn(id);
    if (reason === 'Ability is not ready yet' && wait <= this.o.queueWindow) {
      this.pending = { id, at: this.t + wait };
      return { ok: true, queued: true };
    }
    return { ok: false, reason };
  }

  cancelQueue() {}

  // ---- before the pull ---------------------------------------------------------------------------------
  // A spell cast before the fight: the fight clock waits for it and starts as it lands, as the wowsims pre-pull casts
  // (doAtValue: minus the cast time) and a dummy's fight in the game. The world ticks it (tickPrecast); moving stops
  // it. The bots resolve theirs at once (resolvePrepull).
  beginPrecast(id) {
    const dur = this.castTime(id);
    this.precast = { id, dur, left: dur };
    this.emit({ type: 'castStart', id, end: this.t + dur });
  }
  tickPrecast(dt) {
    const p = this.precast;
    if (!p) return;
    if (this.geo.moving) {
      this.precast = null;
      this.emit({ type: 'castEnd', id: p.id, cancelled: true });
      this.emit({ type: 'error', reason: 'Interrupted' });
      return;
    }
    p.left -= dt;
    if (p.left > 0) return;
    this.precast = null;
    this.emit({ type: 'castEnd', id: p.id });
    this.start();
    this.resolvePrepull(p.id);
  }
  // The fight started some other way (the Start button) during a pre-pull cast: the cast goes on in the fight.
  start() {
    const p = this.precast;
    this.precast = null;
    super.start();
    if (!p) return;
    const ab = this.A[p.id];
    if (ab.cd && this.cdOnCast(p.id)) this.cds[p.id] = this.t + this.cooldownFor(p.id);
    this.stats.casts.push({ t: this.t, id: p.id });
    const c = { id: p.id, start: this.t - (p.dur - p.left), end: this.t + Math.max(0, p.left), resets: false };
    this.casting = c;
    this.schedule(c.end, () => this.finishCast(c));
  }
  // A pre-pull ability resolved with no wait: its cooldown, the cast's effect; the fight does not start for it.
  resolvePrepull(id) {
    const ab = this.A[id];
    if (!ab || this.blocker(id)) return;
    if (ab.cd && this.cdOnCast(id)) this.cds[id] = this.t + this.cooldownFor(id);
    this.stats.casts.push({ t: this.t, id });
    this.emit({ type: 'cast', id });
    if (ab.item) { this.useItem(id); return; }
    this.completeCast({ id, instant: !ab.castTime });
  }

  // A channel stopped early (you moved): the class's clean-up (Evocation's regen ends).
  onChannelCancelled() {}
  // A cast is cancelled (you moved): nothing was spent; a channel stops where it is.
  cancelCast(reason = 'Interrupted') {
    const c = this.casting;
    if (!c) return;
    this.casting = null;
    if (c.channel) this.onChannelCancelled(c); else this.cds[c.id] = 0;
    if (this.started) this.review.castsCancelled++;
    this.emit({ type: 'castEnd', id: c.id, cancelled: true });
    this.emit({ type: 'error', reason });
  }

  cast(id) {
    const ab = this.A[id];
    if (ab.gcd && this.started) this.gcdEnd = this.t + this.gcdFor(id);
    if (ab.cd && this.cdOnCast(id)) this.cds[id] = this.t + this.cooldownFor(id);
    this.stats.casts.push({ t: this.t, id });
    this.emit({ type: 'cast', id });

    if (ab.item) { this.useItem(id); return; }
    if (ab.channel) { this.beginChannel(id); return; }
    const castTime = this.castTime(id);
    if (castTime > 0) {
      const c = { id, start: this.t, end: this.t + castTime, resets: false };
      this.casting = c;
      this.emit({ type: 'castStart', id, end: c.end });
      this.schedule(c.end, () => this.finishCast(c));
      return;
    }
    this.completeCast({ id, instant: true });
  }

  // A cast lands: the class spends its mana and resolves the spell.
  completeCast() {}

  // A channel: its mana is spent at the start; channelTick(c, k) runs each of its ticks (k from 1).
  channelPeriod(id) { const ab = this.A[id]; return ab.channel / ab.ticks / this.hasteMult(); }
  channelTick() {}
  beginChannel(id) {
    const ab = this.A[id];
    const period = this.channelPeriod(id);
    this.spendMana(this.cost(id), id);
    const c = { id, start: this.t, end: this.t + period * ab.ticks, channel: true, resets: false };
    this.casting = c;
    this.emit({ type: 'castStart', id, end: c.end });
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + period * k, () => {
        if (this.casting !== c) return;
        this.channelTick(c, k);
        if (k === ab.ticks) { this.casting = null; this.emit({ type: 'castEnd', id }); }
      });
    }
  }

  // ---- the pull, the review ------------------------------------------------------------------------------

  onStart() {
    this.manaAt = this.t;
  }

  // ---- your pet (a warlock's demon, a hunter's pet) ---------------------------------------------------------
  // pet.mode: 'assist' (it goes at your target when the fight starts), 'defensive' (when something hits you) or
  // 'passive'; pet.engaged: it is fighting; pet.stay: it holds its place; pet.autocast: its spells it casts on its
  // own; pet.queued: a spell you told it to cast next. The class engages and disengages it (petEngage, petDisengage).
  initPet(pet, spells) {
    Object.assign(pet, { mode: 'assist', engaged: false, stay: false, queued: null, autocast: Object.fromEntries(spells.map((id) => [id, true])) });
    return pet;
  }
  petEngage() {}
  petDisengage() {}
  // The pull: an assisting pet goes in.
  petPull() { if (this.pet && this.pet.mode === 'assist' && !this.pet.stay) this.petEngage(); }

  // The pet bar. Attack starts the fight; the other commands and the modes can be set before it.
  pressPet(id, ab, mods) {
    const p = this.pet;
    if (!p) return { ok: false, reason: 'You do not have a pet' };
    if (ab.petSpell) {
      if (!(Array.isArray(ab.petSpell) ? ab.petSpell.includes(p.kind) : ab.petSpell === p.kind)) return { ok: false, reason: `Your ${p.name || 'pet'} does not have that` };
      if (mods.toggle) {
        p.autocast[id] = !p.autocast[id];
        if (p.autocast[id]) this.petCastNow();
        this.emit({ type: 'petAutocast', id, on: p.autocast[id] });
        return { ok: true };
      }
      p.queued = id;
      if (p.engaged) this.petCastNow();
      return { ok: true };
    }
    const cmd = ab.petCommand;
    if (ab.petMode) {
      p.mode = cmd;
      if (cmd === 'passive') this.petDisengage();
      else if (cmd === 'assist' && this.started && !this.over && !p.stay) this.petEngage();
      return { ok: true };
    }
    if (cmd === 'attack') {
      if (this.over) return { ok: false, reason: 'The fight is over' };
      p.stay = false;
      if (!this.started) this.start(); // the pull engages an assisting pet
      this.petEngage();
      return { ok: true };
    }
    p.stay = cmd === 'stay';
    this.petDisengage();
    return { ok: true };
  }
  // A spell you queued: the class casts it as soon as it can.
  petCastNow() {}
  // A defensive pet goes at what hits you.
  onDamageTaken(...args) {
    super.onDamageTaken(...args);
    if (this.pet && this.pet.mode === 'defensive' && !this.pet.stay && this.started) this.petEngage();
  }

  trackReview(newT) {
    if (newT <= this.t || !this.started) return;
    if (!this.casting) this.review.idle += Math.max(0, newT - Math.max(this.t, this.gcdEnd));
  }
}
