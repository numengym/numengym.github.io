// The Feral druid's HUD pieces, after the Fojji Druid UI (ForeverAuras class pack): the energy bar with five combo points
// (Cat) or the rage bar (Bear), Clearcasting and Berserk, the target's bleeds, and the tooltips' ability texts.
import { ABILITIES, ENRAGE } from '../../data/feral.js';

const pctText = (v) => `${Math.round(v * 1000) / 10}%`;
const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);

const ABILITY_TEXT = {
  shred: (a) => `Shred the target from behind for ${pctText(a.weapon)} paw damage plus ${Math.round(a.base * a.weapon)}. Awards 1 combo point.`,
  claw: (a) => `Claw the target for ${pctText(a.weapon)} paw damage plus ${Math.round(a.base * a.weapon)}. Awards 1 combo point.`,
  rake: (a) => `Rake the target for ${a.base}, then ${a.tick} plus ${pctText(a.apCoef)} of your attack power every ${a.period} sec for ${a.duration} sec. Awards 1 combo point.`,
  rip: (a) => `Finisher: a bleed of ${a.tick} plus ${a.perPoint} and ${pctText(a.apPerPoint)} of your attack power per combo point every ${a.period} sec for ${a.period * a.ticks} sec.`,
  ferociousBite: (a) => `Finisher: ${a.base} plus ${a.perPoint} and ${pctText(a.apPerPoint)} of your attack power per combo point, and ${a.perEnergy} per energy left, which it spends.`,
  shiftingPower: (a) => `Gain ${a.energy} energy for ${pctText(a.costPct)} of your base mana. Not at full energy.`,
  maul: (a) => `Your next swing deals paw damage plus ${a.base}.`,
  lacerate: (a) => `A bleed of ${a.tick} per stack every ${a.period} sec for ${a.duration} sec, up to ${a.maxStacks} stacks; the hit deals ${pctText(a.perStack)} paw damage per stack already on.`,
  primalBite: (a) => `Bite the target for paw damage plus ${a.base}.`,
  swipe: (a) => `Swipe up to ${a.targets} enemies for ${a.base} plus ${pctText(a.apCoef)} of your attack power.`,
  enrage: () => `Gain ${ENRAGE.now} rage now and ${ENRAGE.perSec} every second for ${ENRAGE.duration} sec; your armor is lower meanwhile.`,
  berserk: () => 'For 15 sec Shred, Claw and Rake crit 100% more often; in Bear Form Primal Bite has no cooldown and bites 3 more targets.',
  innervate: (a) => `For ${a.duration} sec your mana regenerates ${a.regen} times as fast.`,
};

function auraText(id) {
  switch (id) {
    case 'clearcasting': return 'Your next ability costs nothing.';
    case 'berserk': return ABILITY_TEXT.berserk();
    case 'enrage': return `${ENRAGE.perSec} rage every second; less armor.`;
    case 'innervate': return 'Mana regenerates 5 times as fast.';
    case 'catForm': return 'Energy and combo points; your paw swings once a second.';
    case 'bearForm': return 'Rage, more armor and health; your paw swings every 2.5 sec.';
    default: return null;
  }
}

function targetDebuffs(f, t) {
  const own = f.own(t);
  const out = [];
  if (own.rip && own.ripEnd > f.t) out.push({ icon: ABILITIES.rip.icon, name: 'Rip', left: own.ripEnd - f.t, kind: 'rip' });
  if (own.rake && own.rakeEnd > f.t) out.push({ icon: ABILITIES.rake.icon, name: 'Rake', left: own.rakeEnd - f.t, kind: 'rake' });
  if (own.lacerate && own.lacerateEnd > f.t) out.push({ icon: ABILITIES.lacerate.icon, name: 'Lacerate', left: own.lacerateEnd - f.t, n: own.lacerateStacks, kind: 'lacerate' });
  return out;
}

function debuffTip(kind, t, f) {
  const own = f.own(t);
  const name = { rip: 'Rip', rake: 'Rake', lacerate: 'Lacerate' }[kind];
  if (!name) return null;
  return { name, text: kind === 'lacerate' ? `Bleeding, ${own.lacerateStacks || 0} stacks.` : 'Bleeding.' };
}

// Fojji popups: Clearcasting and Berserk; reminders: Rip or Rake missing (Cat), Lacerate missing (Bear).
function extras(f, { shortKey, binds }) {
  const popups = [];
  const cc = f.aura('clearcasting');
  if (cc) popups.push({ icon: 'spell_shadow_manaburn', name: 'Clearcasting', text: secs(cc.end - f.t), cls: 'glow', key: shortKey(binds.shred), tt: 'aura:clearcasting' });
  const bz = f.aura('berserk');
  if (bz) popups.push({ icon: ABILITIES.berserk.icon, name: 'Berserk', text: secs(bz.end - f.t), cls: '', tt: 'aura:berserk' });
  const debuffs = targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
  const reminders = [];
  const own = f.own(f.target);
  if (f.started && !f.over && f.cat && !(own.rakeEnd > f.t)) reminders.push({ icon: ABILITIES.rake.icon, name: 'Rake missing', text: '', cls: 'remind', tt: 'spell:rake' });
  if (f.started && !f.over && !f.cat && !(own.lacerateEnd > f.t)) reminders.push({ icon: ABILITIES.lacerate.icon, name: 'Lacerate missing', text: '', cls: 'remind', tt: 'spell:lacerate' });
  return { popups, debuffs, reminders, proc: cc ? Math.max(0, Math.min(1, (cc.end - f.t) / 15)) : 0 };
}

const unusable = (reason) => /^(Must be in|You must be behind|You are at full energy)/.test(reason);

const shared = { ABILITY_TEXT, auraText, targetDebuffs, debuffTip, extras, unusable, mana: true };

export const CAT_HUD = {
  ...shared,
  resource: 'Energy',
  colors: { power: '#fff569', mh: '#d9bfc2', oh: '#a69094', cast: '#fff569' },
  comboPoints: true,
};

export const BEAR_HUD = {
  ...shared,
  resource: 'Rage',
  colors: { power: '#e0302c', mh: '#d9bfc2', oh: '#a69094', cast: '#e0302c' },
  comboPoints: false,
};
