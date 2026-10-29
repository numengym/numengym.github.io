// The warlock's HUD pieces, after the Fojji Warlock UI (ForeverAuras class pack): the mana bar with the five-second
// rule, your damage over time, curse, Shadow Vulnerability and Demonic Brand on the target, Shadow Trance, Decimation,
// Amplify Curse, the Soul Shards, and the tooltips' spell texts.
import { ABILITIES } from '../../data/warlock.js';

const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);
const sp = (c) => `${Math.round(c * 1000) / 10}% of your spell power`;
const dotText = (a) => `${a.dot.tick} plus ${sp(a.dot.coef)} every ${a.dot.period} sec for ${a.dot.period * a.dot.ticks} sec.`;

const DEBUFFS = [
  ['corruption', 'Corruption'], ['baneOfAgony', 'Bane of Agony'], ['baneOfDoom', 'Bane of Doom'], ['siphonLife', 'Siphon Life'], ['immolate', 'Immolate'],
];

export const WARLOCK_HUD = {
  resource: 'Mana',
  comboPoints: false,
  fiveSecondRule: true,

  ABILITY_TEXT: {
    shadowBolt: (a) => `${a.base} Shadow damage plus ${sp(a.coef)}. ${a.castTime} sec cast (faster with Bane).`,
    incinerate: (a) => `${a.base} Fire damage plus ${sp(a.coef)}; 25% more with Immolate on the target.`,
    searingPain: (a) => `${a.base} Fire damage plus ${sp(a.coef)}. ${a.castTime} sec cast.`,
    immolate: (a) => `${a.base} Fire damage plus ${sp(a.coef)} now, then ${dotText(a)}`,
    corruption: (a) => `Shadow damage over time: ${dotText(a)}`,
    baneOfAgony: (a) => `Shadow damage over time, weak at first and strong at the end: ${dotText(a)} One Bane per target.`,
    baneOfDoom: (a) => `${a.dot.tick} Shadow damage plus ${sp(a.dot.coef)} after 60 sec. One Bane per target.`,
    siphonLife: (a) => `Shadow damage over time that heals you: ${dotText(a)}`,
    wrack: (a) => `Channel for ${a.channel} sec: ${a.tick} Shadow damage plus ${sp(a.coef)} a second, more per affliction on the target; your Corruption and Bane of Agony deal 10% more meanwhile.`,
    conflagrate: (a) => `${a.base} Fire damage plus ${sp(a.coef)}. Needs your Immolate on the target.`,
    shadowburn: (a) => `${a.base} Shadow damage plus ${sp(a.coef)}, instantly, for a Soul Shard.`,
    soulFire: (a) => `${a.base} Fire damage plus ${sp(a.coef)}, for a Soul Shard. ${a.castTime} sec cast (faster with Bane).`,
    deathCoil: (a) => `${a.base} Shadow damage plus ${sp(a.coef)}, instantly; heals you for it.`,
    curseOfElements: () => 'The target takes 10% more magic damage for 5 min.',
    curseOfRecklessness: (a) => `The target's armor is ${a.armor} lower for ${a.duration / 60} min. One curse of yours on a target.`,
    curseOfWeakness: (a) => `The target deals ${a.weakness} less damage per hit for ${a.duration / 60} min. One curse of yours on a target.`,
    drainLife: (a) => `Channel for ${a.channel} sec: ${a.tick} Shadow damage plus ${sp(a.coef)} a second, more per affliction on the target; you heal as much.`,
    drainSoul: (a) => `Channel for ${a.channel} sec: ${a.tick} Shadow damage plus ${sp(a.coef)} every ${a.channel / a.ticks} sec, more per affliction on the target.`,
    hellfire: (a) => `Channel for ${a.channel} sec: ${Math.round(a.tick)} Fire damage plus ${sp(a.coef)} a second to every enemy within ${a.radius} yards of you, and to you.`,
    rainOfFire: (a) => `Channel for ${a.channel} sec: a wave of ${Math.round(a.tick)} Fire damage plus ${sp(a.coef)} every ${a.channel / a.ticks} sec on every enemy in an ${a.radius} yard area at your target.`,
    amplifyCurse: () => 'Your next Bane of Agony deals 50% more.',
    lifeTap: (a) => `Turn ${a.base} health plus your Spirit into as much mana.`,
  },

  auraText(id) {
    switch (id) {
      case 'shadowTrance': return 'Your next Shadow Bolt is instant.';
      case 'amplifyCurse': return 'Your next Bane of Agony deals 50% more.';
      case 'decimation': return 'Soul Fire casts faster and takes no Soul Shard.';
      case 'shadowAndFlameShadow': return 'Your Shadow damage is higher.';
      case 'shadowAndFlameFire': return 'Your Fire damage is higher.';
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    for (const [id, name] of DEBUFFS) if (own[id] && own[`${id}End`] > f.t) out.push({ icon: ABILITIES[id].icon, name, left: own[`${id}End`] - f.t, kind: id });
    if (own.coeEnd > f.t) out.push({ icon: ABILITIES.curseOfElements.icon, name: 'Curse of the Elements', left: own.coeEnd - f.t, kind: 'curseOfElements' });
    if (own.corEnd > f.t) out.push({ icon: ABILITIES.curseOfRecklessness.icon, name: 'Curse of Recklessness', left: own.corEnd - f.t, kind: 'curseOfRecklessness' });
    if (own.cowEnd > f.t) out.push({ icon: ABILITIES.curseOfWeakness.icon, name: 'Curse of Weakness', left: own.cowEnd - f.t, kind: 'curseOfWeakness' });
    if (own.isbEnd > f.t) out.push({ icon: 'spell_shadow_shadowbolt', name: 'Shadow Vulnerability', left: own.isbEnd - f.t, kind: 'shadowVulnerability' });
    if (own.brandCharges > 0 && own.brandEnd > f.t) out.push({ icon: 'ability_demonhunter_chaoticimprint_fire', name: 'Demonic Brand', left: own.brandEnd - f.t, n: own.brandCharges, kind: 'demonicBrand' });
    return out;
  },

  debuffTip(kind) {
    const text = {
      corruption: 'Your Shadow damage over time.', baneOfAgony: 'Your Bane: Shadow damage over time.', baneOfDoom: 'Your Bane: a big hit at the end.',
      siphonLife: 'Your Shadow damage over time, healing you.', immolate: 'Burning: Conflagrate and Incinerate want it.',
      curseOfElements: 'Takes 10% more magic damage.', shadowVulnerability: 'Takes more Shadow damage from you.',
      curseOfRecklessness: 'Armor lower.', curseOfWeakness: 'Deals less damage per hit.',
      demonicBrand: 'Your demon\'s next hits on it deal extra damage.',
    }[kind];
    return text ? { name: kind, text } : null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const st = f.aura('shadowTrance');
    if (st) popups.push({ icon: 'spell_shadow_twilight', name: 'Shadow Trance', text: secs(st.end - f.t), cls: 'glow', key: shortKey(binds.shadowBolt), tt: 'aura:shadowTrance' });
    const dec = f.aura('decimation');
    if (dec) popups.push({ icon: ABILITIES.soulFire.icon, name: 'Decimation', text: secs(dec.end - f.t), cls: 'glow', key: shortKey(binds.soulFire), tt: 'aura:decimation' });
    const amp = f.aura('amplifyCurse');
    if (amp) popups.push({ icon: ABILITIES.amplifyCurse.icon, name: 'Amplify Curse', text: secs(amp.end - f.t), cls: '', tt: 'aura:amplifyCurse' });
    const debuffs = WARLOCK_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    const own = f.own(f.target);
    if (f.started && !f.over && !(own.coeEnd > f.t || own.corEnd > f.t || own.cowEnd > f.t)) reminders.push({ icon: ABILITIES.curseOfElements.icon, name: 'Curse of the Elements missing', text: '', cls: 'remind', tt: 'spell:curseOfElements' });
    const proc = st || dec;
    return { popups, debuffs, reminders, proc: proc ? Math.max(0, Math.min(1, (proc.end - f.t) / 10)) : 0 };
  },

  unusable: (reason) => /^(Already active|You have no Soul Shards|Requires your Immolate)/.test(reason),
};
