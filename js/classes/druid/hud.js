// The druid's HUD pieces, after the Fojji Druid UI (ForeverAuras class pack): the mana bar with the five-second rule,
// Moonfire and Insect Swarm on the target, Eclipse charges, Nature's Grace and Innervate, and the tooltips' spell
// texts.
import { ABILITIES } from '../../data/druid.js';

const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);
const sp = (c) => `${Math.round(c * 1000) / 10}% of your spell power`;

export const DRUID_HUD = {
  resource: 'Mana',
  comboPoints: false,
  fiveSecondRule: true,

  ABILITY_TEXT: {
    wrath: (a) => `${a.base} Nature damage plus ${sp(a.coef)}. ${a.castTime} sec cast (faster with Improved Wrath). With Eclipse it charges your next Starfires.`,
    starfire: (a) => `${a.base} Arcane damage plus ${sp(a.coef)}. ${a.castTime} sec cast, faster with Improved Starfire and each Eclipse charge.`,
    moonfire: (a) => `${a.base} Arcane damage plus ${sp(a.coef)} now, then ${a.dot.tick} plus ${sp(a.dot.coef)} every ${a.dot.period} sec.`,
    insectSwarm: (a) => `${a.dot.tick} Nature damage plus ${sp(a.dot.coef)} every ${a.dot.period} sec for ${a.dot.period * a.dot.ticks} sec.`,
    innervate: (a) => `For ${a.duration} sec your mana regenerates ${a.regen} times as fast, all of it while casting.`,
  },

  auraText(id, a) {
    switch (id) {
      case 'eclipse': return `Your next ${a.stacks || 1} Starfire${(a.stacks || 1) > 1 ? 's' : ''} cast 0.5 sec faster.`;
      case 'naturesGrace': return 'You cast 10% faster, with a shorter global cooldown.';
      case 'innervate': return 'Mana regenerates 5 times as fast, all of it while casting.';
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.moonfireEnd > f.t) out.push({ icon: ABILITIES.moonfire.icon, name: 'Moonfire', left: own.moonfireEnd - f.t, kind: 'moonfire' });
    if (own.insectSwarmEnd > f.t) out.push({ icon: ABILITIES.insectSwarm.icon, name: 'Insect Swarm', left: own.insectSwarmEnd - f.t, kind: 'insectSwarm' });
    return out;
  },

  debuffTip(kind) {
    if (kind === 'moonfire') return { name: 'Moonfire', text: 'Your Arcane damage over time.' };
    if (kind === 'insectSwarm') return { name: 'Insect Swarm', text: 'Your Nature damage over time.' };
    return null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const ec = f.aura('eclipse');
    if (ec) popups.push({ icon: 'ability_druid_eclipse', name: 'Eclipse', text: secs(ec.end - f.t), n: ec.stacks, cls: 'glow', key: shortKey(binds.starfire), tt: 'aura:eclipse' });
    const ng = f.aura('naturesGrace');
    if (ng) popups.push({ icon: 'spell_nature_naturesblessing', name: "Nature's Grace", text: secs(ng.end - f.t), cls: '', tt: 'aura:naturesGrace' });
    const debuffs = DRUID_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    const own = f.own(f.target);
    if (f.started && !f.over && !(own.moonfireEnd > f.t)) reminders.push({ icon: ABILITIES.moonfire.icon, name: 'Moonfire missing', text: '', cls: 'remind', tt: 'spell:moonfire' });
    if (f.started && !f.over && f.tal.insectSwarm && !(own.insectSwarmEnd > f.t)) reminders.push({ icon: ABILITIES.insectSwarm.icon, name: 'Insect Swarm missing', text: '', cls: 'remind', tt: 'spell:insectSwarm' });
    return { popups, debuffs, reminders, proc: ec ? Math.max(0, Math.min(1, (ec.end - f.t) / 15)) : 0 };
  },

  unusable: (reason) => /^(Already active|You have no more)/.test(reason),
};
