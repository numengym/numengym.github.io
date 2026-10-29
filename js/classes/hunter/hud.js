// The hunter's HUD pieces, after the Fojji Hunter UI (ForeverAuras class pack): the mana bar with the five-second rule,
// the Auto Shot timer on the swing bar, Hunter's Mark and Serpent Sting on the target, Rapid Fire and Quick Shots, and
// the tooltips' shot texts.
import { ABILITIES } from '../../data/hunter.js';

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
    serpentSting: (a) => `${a.dot.tick} Nature damage plus ${rap(a.dot.rapCoef)} every ${a.dot.period} sec for ${a.dot.period * a.dot.ticks} sec.`,
    huntersMark: (a) => `Your ranged attacks on the target gain ${a.rap} attack power for ${a.duration / 60} min.`,
    rapidFire: (a) => `Your shots are ${Math.round(a.haste * 100)}% faster for ${a.duration} sec.`,
  },

  auraText(id) {
    switch (id) {
      case 'rapidFire': return 'Your shots are 40% faster.';
      case 'quickShots': return 'Your shots are 30% faster.';
      case 'rapidRecuperation': return 'Part of your mana regeneration continues while casting.';
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.hmEnd > f.t) out.push({ icon: ABILITIES.huntersMark.icon, name: "Hunter's Mark", left: own.hmEnd - f.t, kind: 'huntersMark' });
    if (own.serpentSting && own.serpentStingEnd > f.t) out.push({ icon: ABILITIES.serpentSting.icon, name: 'Serpent Sting', left: own.serpentStingEnd - f.t, kind: 'serpentSting' });
    return out;
  },

  debuffTip(kind) {
    if (kind === 'huntersMark') return { name: "Hunter's Mark", text: 'Your ranged attacks on it gain attack power.' };
    if (kind === 'serpentSting') return { name: 'Serpent Sting', text: 'Your Nature damage over time.' };
    return null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const rf = f.aura('rapidFire');
    if (rf) popups.push({ icon: ABILITIES.rapidFire.icon, name: 'Rapid Fire', text: secs(rf.end - f.t), cls: '', tt: 'aura:rapidFire' });
    const qs = f.aura('quickShots');
    if (qs) popups.push({ icon: 'ability_warrior_innerrage', name: 'Quick Shots', text: secs(qs.end - f.t), cls: 'glow', tt: 'aura:quickShots' });
    const debuffs = HUNTER_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    if (f.started && !f.over && !(f.own(f.target).hmEnd > f.t)) reminders.push({ icon: ABILITIES.huntersMark.icon, name: "Hunter's Mark missing", text: '', cls: 'remind', tt: 'spell:huntersMark', key: shortKey(binds.huntersMark) });
    return { popups, debuffs, reminders, proc: qs ? Math.max(0, Math.min(1, (qs.end - f.t) / 12)) : 0 };
  },

  unusable: (reason) => /^(Already active|Target is too close)/.test(reason),
};
