// The hunter's HUD pieces, after the Fojji Hunter UI (ForeverAuras class pack): the mana bar with the five-second rule,
// the Auto Shot timer on the swing bar, Hunter's Mark and Serpent Sting on the target, Rapid Fire and Quick Shots,
// Bestial Wrath and the pet's Frenzy, and the tooltips' shot texts.
import { ABILITIES, DAZED, HAWKS, QUICK_STRIKES, TRAP } from '../../data/hunter.js';

const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);
const rap = (c) => `${Math.round(c * 1000) / 10}% of your ranged attack power`;

export const HUNTER_HUD = {
  resource: 'Mana',
  comboPoints: false,
  fiveSecondRule: true,

  ABILITY_TEXT: {
    aimedShot: (a) => `Normalized ranged weapon damage plus ${a.base}. ${a.castTime} sec cast (faster with your shots). Shares a 6 sec cooldown with Multi-Shot.`,
    multiShot: (a) => `Normalized ranged weapon damage to up to ${a.targets} targets. ${a.castTime} sec cast. Shares a 6 sec cooldown with Aimed Shot.`,
    arcaneShot: (a) => `${a.base} Arcane damage plus ${rap(a.rapCoef)}, instantly.`,
    scorpidSting: (a) => `The target's attacks have ${Math.round(a.hit * 100)}% less chance to hit for ${a.duration} sec. It takes the place of your Serpent Sting.`,
    counterattack: (a) => `After you parry: ${Math.round(a.weaponPct * 100)}% weapon damage plus ${a.bonus}, and the target is rooted. It cannot be dodged, parried or blocked.`,
    volley: (a) => `A ${a.channel} sec channel: ${a.tick} Arcane damage each second to every enemy within ${a.radius} yards of your target.`,
    sniperShot: (a) => `Normalized ranged weapon damage plus ${a.base}. ${a.castTime} sec cast.`,
    serpentSting: (a) => `${a.dot.tick} Nature damage plus ${rap(a.dot.rapCoef)} every ${a.dot.period} sec for ${a.dot.period * a.dot.ticks} sec.`,
    huntersMark: (a) => `Your ranged attacks on the target gain ${a.rap} attack power for ${a.duration / 60} min.`,
    rapidFire: (a) => `Your shots are ${Math.round(a.haste * 100)}% faster for ${a.duration} sec.`,
    summonHawk: () => `A hawk dives at the target for ${HAWKS.dive.base} plus ${rap(HAWKS.dive.rapCoef)}, then fights beside you for ${HAWKS.duration} sec (${HAWKS.count} at a time). Shares a 6 sec cooldown with Arcane Shot.`,
    bestialWrath: (a) => `Your pet deals ${Math.round(a.dmg * 100)}% more damage for ${a.duration} sec. No global cooldown.`,
    intimidation: () => "Your pet's next attack is a critical strike.",
    raptorStrike: (a) => `Your next melee swing deals ${a.bonus} more damage. No global cooldown.`,
    mongooseBite: (a) => `Normalized melee weapon damage plus ${a.bonus}. Usable for 5 sec after you dodge, or when Expose Prey lets you.`,
    wingClip: (a) => `${a.flat} damage and the target moves 60% slower for 10 sec.`,
    striderKick: () => 'Normalized melee weapon damage, and you run 30% faster for 3 sec.',
    aspectOfTheHawk: (a) => `Your ranged attacks gain ${a.rap} attack power, and Auto Shot can give Quick Shots (Deadly Aspects). One aspect at a time.`,
    aspectOfTheBeast: (a) => `You gain ${a.ap} attack power, and your melee swings can give Quick Strikes: ${Math.round(QUICK_STRIKES.haste * 100)}% faster swings for ${QUICK_STRIKES.duration} sec (Deadly Aspects). One aspect at a time.`,
    aspectOfTheMonkey: (a) => `You dodge ${a.dodge}% more often (Improved Aspect of the Monkey more). One aspect at a time.`,
    aspectOfTheCheetah: (a) => `You run ${Math.round(a.speed * 100)}% faster; a hit dazes you, ${Math.round(DAZED.slow * 100)}% slower for ${DAZED.duration} sec. One aspect at a time.`,
    aspectOfThePack: (a) => `You and your party run ${Math.round(a.speed * 100)}% faster; a hit dazes you, ${Math.round(DAZED.slow * 100)}% slower for ${DAZED.duration} sec. One aspect at a time.`,
    aspectOfTheWild: () => 'You and your raid gain 60 Nature resistance. One aspect at a time.',
    immolationTrap: (a) => `A trap at your feet, armed after ${TRAP.arm} sec: the first enemy within ${TRAP.radius} yards burns for ${a.trap.tick} Fire plus a share of ${rap(TRAP.rapShare)} every ${a.trap.period} sec for ${a.trap.period * a.trap.ticks} sec. Lasts 1 min. Shares a cooldown with Explosive Trap.`,
    explosiveTrap: (a) => `A trap at your feet, armed after ${TRAP.arm} sec: it bursts for ${Math.round(a.trap.hit * (1 - a.trap.spread))}-${Math.round(a.trap.hit * (1 + a.trap.spread))} Fire to every enemy within ${a.trap.radius} yards, then ${a.trap.tick} every ${a.trap.period} sec for ${a.trap.period * a.trap.ticks} sec. Lasts 1 min. Shares a cooldown with Immolation Trap.`,
    freezingTrap: (a) => `A trap at your feet, armed after ${TRAP.arm} sec: the first enemy within ${TRAP.radius} yards is frozen for ${a.trap.duration} sec (bosses are immune). Shares a cooldown with Frost Trap.`,
    frostTrap: (a) => `A trap at your feet, armed after ${TRAP.arm} sec: ice spreads ${a.trap.radius} yards around it, enemies there move 60% slower for ${a.trap.duration} sec (bosses are immune). Shares a cooldown with Freezing Trap.`,
  },

  auraText(id) {
    switch (id) {
      case 'rapidFire': return 'Your shots are 40% faster.';
      case 'quickShots': return 'Your shots are 30% faster.';
      case 'rapidRecuperation': return 'Part of your mana regeneration continues while casting.';
      case 'bestialWrath': return 'Your pet deals 50% more damage.';
      case 'frenzy': return 'Your pet attacks 30% faster.';
      case 'intimidation': return "Your pet's next attack is a critical strike.";
      case 'quickStrikes': return `Your melee swings are ${Math.round(QUICK_STRIKES.haste * 100)}% faster.`;
      case 'dazed': return `You move ${Math.round(DAZED.slow * 100)}% slower.`;
      case 'aspectOfTheHawk': return 'Your ranged attacks gain 120 attack power.';
      case 'aspectOfTheBeast': return 'You gain 110 attack power.';
      case 'aspectOfTheMonkey': return 'You dodge more often.';
      case 'aspectOfTheCheetah': return 'You run 30% faster; a hit dazes you.';
      case 'aspectOfThePack': return 'You and your party run 30% faster; a hit dazes you.';
      case 'aspectOfTheWild': return 'You and your raid gain 60 Nature resistance.';
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.hmEnd > f.t) out.push({ icon: ABILITIES.huntersMark.icon, name: "Hunter's Mark", left: own.hmEnd - f.t, kind: 'huntersMark' });
    if (own.scorpidStingEnd > f.t) out.push({ icon: ABILITIES.scorpidSting.icon, name: 'Scorpid Sting', left: own.scorpidStingEnd - f.t, kind: 'scorpidSting' });
    if (own.serpentSting && own.serpentStingEnd > f.t) out.push({ icon: ABILITIES.serpentSting.icon, name: 'Serpent Sting', left: own.serpentStingEnd - f.t, kind: 'serpentSting' });
    if (own.savageRend && own.savageRendEnd > f.t) out.push({ icon: 'ability_hunter_pet_raptor', name: 'Savage Rend', left: own.savageRendEnd - f.t, kind: 'savageRend' });
    if (own.immolationTrapEnd > f.t) out.push({ icon: ABILITIES.immolationTrap.icon, name: 'Immolation Trap', left: own.immolationTrapEnd - f.t, kind: 'immolationTrap' });
    return out;
  },

  debuffTip(kind) {
    if (kind === 'huntersMark') return { name: "Hunter's Mark", text: 'Your ranged attacks on it gain attack power.' };
    if (kind === 'serpentSting') return { name: 'Serpent Sting', text: 'Your Nature damage over time.' };
    if (kind === 'scorpidSting') return { name: 'Scorpid Sting', text: 'Its attacks hit less often.' };
    if (kind === 'savageRend') return { name: 'Savage Rend', text: "Your pet's bleed." };
    if (kind === 'immolationTrap') return { name: 'Immolation Trap', text: 'Your trap burns it.' };
    return null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const rf = f.aura('rapidFire');
    if (rf) popups.push({ icon: ABILITIES.rapidFire.icon, name: 'Rapid Fire', text: secs(rf.end - f.t), cls: '', tt: 'aura:rapidFire' });
    const qs = f.aura('quickShots');
    if (qs) popups.push({ icon: 'ability_warrior_innerrage', name: 'Quick Shots', text: secs(qs.end - f.t), cls: 'glow', tt: 'aura:quickShots' });
    const bw = f.aura('bestialWrath');
    if (bw) popups.push({ icon: ABILITIES.bestialWrath.icon, name: 'Bestial Wrath', text: secs(bw.end - f.t), cls: 'glow', tt: 'aura:bestialWrath' });
    // Mongoose Bite usable: you dodged (Defensive State) or Expose Prey opened it.
    const bite = f.aura('defensiveState') || f.aura('exposePrey');
    if (bite && f.cdLeft('mongooseBite') < bite.end - f.t) popups.push({ icon: ABILITIES.mongooseBite.icon, name: 'Mongoose Bite usable', text: secs(bite.end - f.t), cls: 'glow', tt: 'spell:mongooseBite', key: shortKey(binds.mongooseBite) });
    const frenzy = f.aura('frenzy');
    if (frenzy) popups.push({ icon: 'inv_misc_monsterclaw_03', name: 'Frenzy', text: secs(frenzy.end - f.t), cls: '', tt: 'aura:frenzy' });
    const debuffs = HUNTER_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    if (f.started && !f.over && !(f.own(f.target).hmEnd > f.t)) reminders.push({ icon: ABILITIES.huntersMark.icon, name: "Hunter's Mark missing", text: '', cls: 'remind', tt: 'spell:huntersMark', key: shortKey(binds.huntersMark) });
    return { popups, debuffs, reminders, proc: qs ? Math.max(0, Math.min(1, (qs.end - f.t) / 12)) : 0 };
  },

  unusable: (reason) => /^(Already active|Already queued|You do not have a pet|Requires a dodge)/.test(reason),
};
