// The priest's HUD pieces, after the Fojji Priest UI (ForeverAuras class pack): the mana bar with the five-second
// rule under it, Shadow Word: Pain, Devouring Plague and Shadow Weaving on the target, Inner Focus and Dark
// Inspiration, and the tooltips' spell texts.
import { ABILITIES, TALENT } from '../../data/priest.js';

const pctText = (v) => `${Math.round(v * 1000) / 10}%`;
const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);
const sp = (c) => `${Math.round(c * 1000) / 10}% of your spell power`;

export const PRIEST_HUD = {
  resource: 'Mana',
  // Fojji colours: Mana Bar 0, 0.47, 0.78; the five-second rule tick under it.
  comboPoints: false,
  fiveSecondRule: true,

  ABILITY_TEXT: {
    shadowWordPain: (a) => `${a.dot.tick} Shadow damage plus ${sp(a.dot.coef)} every ${a.dot.period} sec for ${a.dot.period * a.dot.ticks} sec (longer with Improved Shadow Word: Pain).`,
    mindBlast: (a) => `${Math.round(a.base)} Shadow damage plus ${sp(a.coef)}. ${a.castTime} sec cast.`,
    mindFlay: (a) => `A ${a.channel} sec channel: ${a.ticks} ticks of ${a.tick} Shadow damage plus ${sp(a.coef)}, each more than the last with Improved Mind Flay.`,
    devouringPlague: (a) => `${a.dot.tick} Shadow damage plus ${sp(a.dot.coef)} every ${a.dot.period} sec for ${a.dot.period * a.dot.ticks} sec; heals you as much.`,
    shadowWordDeath: (a) => `${a.base} Shadow damage plus ${sp(a.coef)}, instantly. Costs you 10% of your health.`,
    shadowform: (a) => `Shadow damage ${pctText(a.dmg)} higher, Shadow spells cost ${pctText(a.costCut)} less and crit for 200%.`,
    innerFocus: (a) => `Your next spell costs no mana and, if it is not periodic, crits ${a.critPct}% more.`,
  },

  auraText(id) {
    switch (id) {
      case 'shadowform': return 'Shadow damage +10%; Shadow spells cost 50% less and crit for 200%.';
      case 'innerFocus': return 'Your next spell is free; a direct one crits 25% more.';
      case 'darkInspiration': return 'Spirit raised: more mana regeneration.';
      case 'revelation': return 'Your next Mind Blast, Mind Flay or Shadow Word: Death is a sure crit (Mind Flay on every tick).';
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.shadowWordPainEnd > f.t) out.push({ icon: ABILITIES.shadowWordPain.icon, name: 'Shadow Word: Pain', left: own.shadowWordPainEnd - f.t, kind: 'shadowWordPain' });
    if (own.devouringPlagueEnd > f.t) out.push({ icon: ABILITIES.devouringPlague.icon, name: 'Devouring Plague', left: own.devouringPlagueEnd - f.t, kind: 'devouringPlague' });
    if (own.swEnd > f.t && own.sw) out.push({ icon: 'spell_shadow_blackplague', name: 'Shadow Weaving', left: own.swEnd - f.t, n: own.sw, kind: 'shadowWeaving' });
    return out;
  },

  debuffTip(kind, t, f) {
    const own = f.own(t);
    if (kind === 'shadowWeaving') return { name: 'Shadow Weaving', text: `Takes ${Math.round(TALENT.shadowWeaving.perStack * 100 * (own.sw || 0))}% more Shadow damage from you.` };
    if (kind === 'shadowWordPain') return { name: 'Shadow Word: Pain', text: 'Your Shadow damage over time.' };
    if (kind === 'devouringPlague') return { name: 'Devouring Plague', text: 'Your Shadow damage over time; it heals you.' };
    return null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const own = f.own(f.target);
    // Shadow Word: Pain about to run out: refresh it.
    if (f.started && !f.over && own.shadowWordPainEnd > f.t && own.shadowWordPainEnd - f.t < 3) {
      popups.push({ icon: ABILITIES.shadowWordPain.icon, name: 'Shadow Word: Pain fading', text: secs(own.shadowWordPainEnd - f.t), cls: 'glow', key: shortKey(binds.shadowWordPain), tt: 'spell:shadowWordPain' });
    }
    const focus = f.aura('innerFocus');
    if (focus) popups.push({ icon: ABILITIES.innerFocus.icon, name: 'Inner Focus', text: '', cls: 'glow', key: shortKey(binds.mindFlay), tt: 'aura:innerFocus' });
    const rev = f.aura('revelation');
    if (rev) popups.push({ icon: 'inv_misc_note_01', name: 'Revelation', text: secs(rev.end - f.t), cls: 'glow', key: shortKey(binds.mindFlay), tt: 'aura:revelation' });
    const debuffs = PRIEST_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    if (f.tal.shadowform && !f.aura('shadowform')) reminders.push({ icon: ABILITIES.shadowform.icon, name: 'Shadowform missing', text: '', cls: 'remind', tt: 'spell:shadowform' });
    if (f.started && !f.over && !(own.shadowWordPainEnd > f.t)) reminders.push({ icon: ABILITIES.shadowWordPain.icon, name: 'Shadow Word: Pain missing', text: '', cls: 'remind', tt: 'spell:shadowWordPain' });
    return { popups, debuffs, reminders, proc: rev ? Math.max(0, Math.min(1, (rev.end - f.t) / 15)) : focus ? 1 : 0 };
  },

  unusable: (reason) => /^(Already active|You have no more)/.test(reason),
};
