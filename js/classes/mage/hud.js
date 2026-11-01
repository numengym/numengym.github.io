// The mage's HUD pieces, after the Fojji Mage UI (ForeverAuras class pack): the mana bar with the five-second rule
// under it, the Clearcasting / Missile Barrage / Heating Up / Fingers of Frost proc textures and popups, your
// debuffs on the target, and the tooltips' spell texts.
import { ABILITIES, TALENT } from '../../data/mage.js';

const pctText = (v) => `${Math.round(v * 1000) / 10}%`;
const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);
const sp = (a) => `${Math.round(a.coef * 1000) / 10}% of your spell power`;

export const MAGE_HUD = {
  resource: 'Mana',
  // Fojji colours: Mana Bar 0, 0.38, 0.79; Swing / cast bar 0.25, 0.78, 0.92.
  comboPoints: false,
  fiveSecondRule: true,

  ABILITY_TEXT: {
    frostbolt: (a) => `${Math.round(a.base)} Frost damage plus ${sp(a)}. ${a.castTime} sec cast. A Chill effect.`,
    fireball: (a) => `${a.base} Fire damage plus ${sp(a)}, and ${a.dot.tick * a.dot.ticks} more over ${a.dot.period * a.dot.ticks} sec. ${a.castTime} sec cast.`,
    frostfireBolt: (a) => `${a.base} Frostfire damage plus ${sp(a)}, and ${a.dot.tick * a.dot.ticks} more over ${a.dot.period * a.dot.ticks} sec; slows the target. A Fire and a Frost spell to your talents, and a Chill. ${a.castTime} sec cast.`,
    scorch: (a) => `${Math.round(a.base)} Fire damage plus ${sp(a)}. With Improved Scorch the target takes more Fire damage from you.`,
    fireBlast: (a) => `${a.base} Fire damage plus ${sp(a)}, instantly.`,
    pyroblast: (a) => `${a.base} Fire damage plus ${sp(a)}, and ${a.dot.tick * a.dot.ticks} more over ${a.dot.period * a.dot.ticks} sec. ${a.castTime} sec cast, 25% faster per Heating Up stack.`,
    arcaneBlast: (a) => `${a.base} Arcane damage plus ${sp(a)}, and an Arcane Charge: 12% of your Intellect as spell power for 18 sec, Arcane Blast costs 100% more per charge.`,
    arcaneMissiles: (a) => `A ${a.channel} sec channel: ${a.ticks} missiles of ${Math.round(a.base)} Arcane damage plus ${sp(a)} each. Missile Barrage makes it free and twice as fast.`,
    arcaneWrath: (a) => `${a.base} Arcane damage plus ${sp(a)} and ${pctText(a.manaShare)} of your maximum mana.`,
    coneOfCold: (a) => `${a.base} Frost damage plus ${sp(a)} to enemies within ${a.range} yards in front of you. Spends Winter's Chill.`,
    iceLance: (a) => `${Math.round(a.base)} Frost damage plus ${sp(a)}; four times the damage against a Frozen target (Fingers of Frost). Shares an 8 sec cooldown with Fire Blast.`,
    arcanePower: (a) => `${pctText(a.dmg)} more spell damage and ${pctText(a.costMore)} more mana cost for ${a.duration} sec.`,
    presenceOfMind: () => 'Your next spell with a cast time is instant. The cooldown starts when it is spent.',
    combustion: (a) => `Each of your Fire hits adds ${a.critPerStack}% crit to your Fire spells, until ${a.charges} of them crit.`,
    coldSnap: () => 'Finishes the cooldowns of Cone of Cold and Ice Barrier.',
    iceBarrier: (a) => `A shield for ${a.duration} sec; while it holds, your Frost spells deal ${pctText(a.frostDmg)} more damage. Frigid Power: ${pctText(a.frigidPower)} more again for 1 min.`,
    evocation: (a) => `Channel for ${a.channel} sec: your mana regenerates ${a.regen} times as fast.`,
    mageArmor: (a) => `${pctText(a.casting)} of your mana regeneration continues while casting.`,
    manaGem: (a) => `Restore about ${a.mana} mana. One per fight.`,
    arcaneExplosion: (a) => `${Math.round(a.base)} Arcane damage plus ${sp(a)} to every enemy within ${a.radius} yards of you.`,
    blastWave: (a) => `${a.base} Fire damage plus ${sp(a)} to every enemy within ${a.radius} yards of you; dazes them.`,
    blizzard: (a) => `A ${a.channel} sec channel: ${a.tick} Frost damage plus ${sp(a)} each second to every enemy in a ${a.radius} yard area at your target.`,
    flamestrike: (a) => `${Math.round(a.base)} Fire damage plus ${sp(a)} in a ${a.radius} yard area at your target, then ${a.burn.tick} every ${a.burn.period} sec for ${a.burn.period * a.burn.ticks} sec there. ${a.castTime} sec cast.`,
    frostNova: (a) => `${Math.round(a.base)} Frost damage plus ${sp(a)} to every enemy within ${a.radius} yards of you, and roots them (not a boss or a dummy).`,
    iceBlock: (a) => `${a.duration} sec immune to all damage; you can do nothing.`,
    blink: (a) => `Teleport ${a.leap} yards ahead, the way you face; frees you from stuns and roots for ${a.duration} sec.`,
  },

  auraText(id, a) {
    switch (id) {
      case 'arcaneCharges': return `${a.stacks} charge${a.stacks > 1 ? 's' : ''}: ${15 * a.stacks}% of your Intellect as spell power; Arcane Blast costs ${175 * a.stacks}% more.`;
      case 'missileBarrage': return 'Your next Arcane Missiles is free and fires twice as fast.';
      case 'clearcasting': return 'Your next damage spell costs no mana.';
      case 'heatingUp': return `Pyroblast casts ${25 * a.stacks}% faster.`;
      case 'fingersOfFrost': return `Your next ${a.stacks} spell${a.stacks > 1 ? 's treat' : ' treats'} the target as Frozen: Ice Lance deals four times the damage, Shatter crits.`;
      case 'arcanePower': return '30% more spell damage, 30% more mana cost.';
      case 'presenceOfMind': return 'Your next spell with a cast time is instant.';
      case 'combustion': return `+${10 * a.stacks}% crit with Fire spells.`;
      case 'iceBarrier': return 'Shielded; Frost spells deal 5% more damage.';
      case 'mageArmor': return '50% of your mana regeneration continues while casting.';
      case 'evocation': return 'Mana regenerates 16 times as fast.';
      case 'blink': return 'Immune to stuns and roots.';
      case 'iceBlock': return 'Immune to all damage. You can do nothing.';
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.fvEnd > f.t && own.fv) out.push({ icon: 'spell_fire_soulburn', name: 'Fire Vulnerability', left: own.fvEnd - f.t, n: own.fv, kind: 'fireVulnerability' });
    if (own.wcEnd > f.t && own.wc) out.push({ icon: 'spell_frost_chillingblast', name: "Winter's Chill", left: own.wcEnd - f.t, n: own.wc, kind: 'wintersChill' });
    if (own.igniteEnd > f.t) out.push({ icon: 'spell_fire_incinerate', name: 'Ignite', left: own.igniteEnd - f.t, kind: 'ignite' });
    if (own.pyroblastDotEnd > f.t) out.push({ icon: ABILITIES.pyroblast.icon, name: 'Pyroblast', left: own.pyroblastDotEnd - f.t, kind: 'pyroblast' });
    if (own.fireballDotEnd > f.t) out.push({ icon: ABILITIES.fireball.icon, name: 'Fireball', left: own.fireballDotEnd - f.t, kind: 'fireball' });
    return out;
  },

  debuffTip(kind, t, f) {
    const own = f.own(t);
    const text = {
      fireVulnerability: `Takes ${3 * (own.fv || 0)}% more Fire damage from you.`,
      wintersChill: `Your next Cone of Cold deals ${5 * (own.wc || 0)}% more and gains ${7 * (own.wc || 0)}% of your spell power.`,
      ignite: 'Burning.', pyroblast: 'Burning.', fireball: 'Burning.',
    }[kind];
    return text ? { name: { fireVulnerability: 'Fire Vulnerability', wintersChill: "Winter's Chill", ignite: 'Ignite', pyroblast: 'Pyroblast', fireball: 'Fireball' }[kind], text } : null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const cc = f.aura('clearcasting');
    if (cc) popups.push({ icon: 'spell_shadow_manaburn', name: 'Clearcasting', text: secs(cc.end - f.t), cls: 'glow', tt: 'aura:clearcasting' });
    const mb = f.aura('missileBarrage');
    if (mb) popups.push({ icon: 'ability_mage_missilebarrage', name: 'Missile Barrage', text: secs(mb.end - f.t), cls: 'glow', key: shortKey(binds.arcaneMissiles), tt: 'aura:missileBarrage' });
    const hu = f.aura('heatingUp');
    if (hu) popups.push({ icon: 'spell_fire_firebolt', name: 'Heating Up', text: secs(hu.end - f.t), n: hu.stacks, cls: hu.stacks >= 3 ? 'glow' : '', key: hu.stacks >= 3 ? shortKey(binds.pyroblast) : '', tt: 'aura:heatingUp' });
    const fof = f.aura('fingersOfFrost');
    if (fof) popups.push({ icon: 'ability_mage_wintersgrasp', name: 'Fingers of Frost', text: secs(fof.end - f.t), n: fof.stacks, cls: 'glow', key: shortKey(binds.iceLance), tt: 'aura:fingersOfFrost' });
    const debuffs = MAGE_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    if (!f.aura('mageArmor')) reminders.push({ icon: 'spell_magearmor', name: 'Mage Armor missing', text: '', cls: 'remind', tt: 'spell:mageArmor' });
    if (f.tal.iceBarrier && f.started && !f.over && !f.aura('iceBarrier') && f.cdLeft('iceBarrier') <= 0) reminders.push({ icon: 'spell_ice_lament', name: 'Ice Barrier missing', text: '', cls: 'remind', tt: 'spell:iceBarrier' });
    // The proc textures beside the character: Clearcasting, Missile Barrage, 3 Heating Up or Fingers of Frost.
    const procAura = cc || mb || (hu && hu.stacks >= 3 ? hu : null) || fof;
    return { popups, debuffs, reminders, proc: procAura ? Math.max(0, Math.min(1, (procAura.end - f.t) / 15)) : 0 };
  },

  unusable: (reason) => /^(Already active|You have no more)/.test(reason),
};
