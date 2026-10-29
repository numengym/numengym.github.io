// The paladin's HUD pieces, after the Fojji Paladin UI (ForeverAuras class pack): the mana bar and a big swing timer
// (the seals hang off white hits), the active seal, Judgement of the Crusader and Consecration on the target, and the
// tooltips' spell texts.
import { ABILITIES, SEALS, TWIST_OF_LIGHT } from '../../data/paladin.js';

const pctText = (v) => `${Math.round(v * 1000) / 10}%`;
const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);
const sp = (c) => `${Math.round(c * 1000) / 10}% of your spell power`;

export const PALADIN_HUD = {
  resource: 'Mana',
  comboPoints: false,
  fiveSecondRule: false,

  ABILITY_TEXT: {
    sealOfRighteousness: () => 'For 30 sec your white hits deal extra Holy damage (more with a slow two-hander). Judgement: Judgement of Righteousness.',
    sealOfCommand: (a) => `For 30 sec your white hits can deal ${pctText(a.weapon)} of a weapon hit as Holy damage (${a.ppm} a minute). Judgement: Judgement of Command.`,
    sealOfTheCrusader: (a) => `For 30 sec: +${Math.round(a.ap)} attack power and ${pctText(a.speed - 1)} faster swings that each deal less. Judgement: the target takes ${a.judge.holyTaken} more Holy damage per hit for ${a.judge.duration} sec.`,
    sealOfFury: (a) => `For 30 sec your white hits deal ${a.procBase} + ${sp(a.procCoef)} Holy damage. Judgement: Judgement of Fury, which taunts.`,
    judgement: () => 'Unleash your seal on the target (Judgement of Righteousness, Command, the Crusader or Fury). The seal stays.',
    swiftJudgement: () => 'Judgement is ready again and the next one costs no mana.',
    holyStrike: (a) => `Strike for (${a.base} + normalized weapon damage + ${sp(a.coef)}) x ${pctText(a.weapon)} Holy damage.`,
    consecration: (a) => `Consecrate the ground for ${a.ticks} sec: ${a.tick} Holy damage a second to enemies in it, ${a.markTick} + ${sp(a.coef)} more to your target.`,
    holyShock: (a) => `${a.base} Holy damage plus ${sp(a.coef)}.`,
    exorcism: (a) => `${a.base} Holy damage plus ${sp(a.coef)}.`,
    holyWrath: (a) => `${Math.round(a.base)} Holy damage plus ${sp(a.coef)} to every undead and demon within ${a.radius} yards. ${a.castTime} sec cast.`,
    retributionAura: (a) => `Every attack that lands on you deals ${a.damage} Holy damage plus ${sp(a.coef)} back to the attacker. One aura at a time.`,
    devotionAura: (a) => `+${a.armor} armor. One aura at a time.`,
    concentrationAura: (a) => `${a.pushback}% less pushback while casting. One aura at a time.`,
    shadowResistanceAura: (a) => `+${a.amount} Shadow resistance. One aura at a time.`,
    frostResistanceAura: (a) => `+${a.amount} Frost resistance. One aura at a time.`,
    fireResistanceAura: (a) => `+${a.amount} Fire resistance. One aura at a time.`,
    hammerOfWrath: (a) => `${a.base} Holy damage plus ${sp(a.coef)} to a target below 20% health. ${a.castTime} sec cast.`,
    holyShield: (a) => `+${a.blockPct}% block for ${a.duration} sec or ${a.charges} blocks; each block deals ${a.damage} + ${sp(a.coef)} Holy damage.`,
    righteousFury: (a) => `${pctText(a.holyThreat)} more threat from your Holy damage.`,
  },

  auraText(id, a) {
    if (SEALS.includes(id)) return PALADIN_HUD.ABILITY_TEXT[id](ABILITIES[id]);
    switch (id) {
      case 'swiftJudgement': return 'Your next Judgement costs no mana.';
      case 'holyShield': return `+30% block; ${a.stacks || 0} blocks left.`;
      case 'righteousFury': return '90% more threat from Holy damage.';
      case 'echo': return 'Twist of Light: your next white hit that lands applies this seal\'s effect too.';
      case 'retributionAura': return 'Attacks that land on you deal Holy damage back.';
      case 'devotionAura': return `+${ABILITIES.devotionAura.armor} armor.`;
      case 'concentrationAura': return '35% less pushback while casting.';
      case 'shadowResistanceAura': case 'frostResistanceAura': case 'fireResistanceAura':
        return `+${ABILITIES[id].amount} ${ABILITIES[id].resist[0].toUpperCase()}${ABILITIES[id].resist.slice(1)} resistance.`;
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.jotcEnd > f.t) out.push({ icon: 'spell_holy_holysmite', name: 'Judgement of the Crusader', left: own.jotcEnd - f.t, kind: 'crusader' });
    if (own.consecrationEnd > f.t) out.push({ icon: 'spell_holy_innerfire', name: 'Consecration', left: own.consecrationEnd - f.t, kind: 'consecration' });
    return out;
  },

  debuffTip(kind) {
    if (kind === 'crusader') return { name: 'Judgement of the Crusader', text: 'Takes more Holy damage from your hits.' };
    if (kind === 'consecration') return { name: 'Consecration', text: 'Burning; Consecrated Ground raises your Holy damage on it.' };
    return null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const seal = f.activeSeal();
    if (seal) {
      const a = f.aura(seal);
      if (a.end - f.t < 5) popups.push({ icon: ABILITIES[seal].icon, name: `${ABILITIES[seal].name} expiring`, text: secs(a.end - f.t), cls: 'glow', key: shortKey(binds[seal]), tt: `aura:${seal}` });
    }
    // Twist of Light: an Echo waiting for your next swing, or a seal you could twist now (swap it for another).
    if (f.tal.twistOfLight && f.started && !f.over) {
      if (f.echo && f.aura('echo')) {
        popups.push({ icon: ABILITIES[f.echo].icon, name: `${f.aura('echo').name}: next swing`, text: '', cls: 'glow', tt: 'aura:echo' });
      } else if (seal && TWIST_OF_LIGHT.echoes[seal]) {
        const other = seal === 'sealOfCommand' ? 'sealOfRighteousness' : 'sealOfCommand';
        popups.push({ icon: TWIST_OF_LIGHT.icon, name: `Twist ready: ${ABILITIES[other].name}`, text: '', cls: 'glow', key: shortKey(binds[other]), tt: `spell:${other}` });
      }
    }
    if (f.cdLeft('judgement') <= 0 && seal && f.started) popups.push({ icon: ABILITIES.judgement.icon, name: 'Judgement ready', text: '', cls: 'glow', key: shortKey(binds.judgement), tt: 'spell:judgement' });
    const debuffs = PALADIN_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    if (f.started && !f.over && !seal) reminders.push({ icon: 'spell_holy_righteousnessaura', name: 'No seal active', text: '', cls: 'remind' });
    if (f.o.tank && !f.aura('righteousFury')) reminders.push({ icon: ABILITIES.righteousFury.icon, name: 'Righteous Fury missing', text: '', cls: 'remind', tt: 'spell:righteousFury' });
    return { popups, debuffs, reminders, proc: 0 };
  },

  unusable: (reason) => /^(You have no seal|Target's health is above|Exorcism works only)/.test(reason),
};
