// The rogue's HUD pieces, after the Fojji Rogue UI (ForeverAuras class pack): the energy bar with five combo points on
// top, the Slice and Dice and Cutthroat popups, the target's bleeds and poisons, and the tooltips' ability texts.
import { ABILITIES, POISONS, TALENT } from '../../data/rogue.js';

const pctText = (v) => `${Math.round(v * 1000) / 10}%`;
const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);

export const ROGUE_HUD = {
  resource: 'Energy',
  // Fojji colours: Energy Bar 1, 0.96, 0.41; Swing Timer [MH] 0.85, 0.75, 0.76; Cast Bar as the energy.
  colors: { power: '#fff569', mh: '#d9bfc2', oh: '#a69094', cast: '#fff569' },
  comboPoints: true,

  ABILITY_TEXT: {
    sinisterStrike: (a) => `An instant strike for ${a.base} plus your normalized main-hand weapon damage. Awards 1 combo point.`,
    backstab: (a) => `Backstab the target from behind for ${pctText(a.weapon)} weapon damage plus ${a.base * a.weapon}. Needs a dagger in the main hand. Awards 1 combo point.`,
    mutilate: (a) => `Strike with both daggers for ${pctText(a.weapon)} weapon damage plus ${a.base} each, ${pctText(a.poisoned)} more on a poisoned target. Awards ${a.cp} combo points.`,
    hemorrhage: (a) => `Strike for normalized weapon damage (${pctText(a.daggerWeapon)} with a dagger); the target takes ${pctText(a.rupture)} more Rupture damage from you for ${a.duration} sec. Awards 1 combo point.`,
    ghostlyStrike: (a) => `Strike for ${pctText(a.weapon)} weapon damage (${pctText(a.daggerWeapon)} with a dagger). Awards 1 combo point.`,
    ambush: (a) => `Ambush the target from stealth and behind for ${pctText(a.weapon)} weapon damage plus ${a.base * a.weapon}. Needs a dagger. Awards 1 combo point.`,
    garrote: (a) => `Garrote the target from stealth: ${a.tick} plus ${pctText(a.apCoef)} of your attack power every ${a.period} sec for ${a.duration} sec. Awards 1 combo point.`,
    eviscerate: (a) => `Finisher: ${a.base} (±50%) plus ${a.perPoint} and ${pctText(a.apPerPoint)} of your attack power per combo point.`,
    sliceAndDice: (a) => `Finisher: ${pctText(a.haste)} attack speed for ${a.base} sec plus ${a.perPoint} sec per combo point.`,
    exposeArmor: (a) => `Finisher: the target's armor is ${a.perPoint} lower per combo point for ${a.duration} sec (not with Sunder Armor: the larger counts).`,
    rupture: (a) => `Finisher: a bleed of ${a.tick} plus ${a.perPoint} per combo point and a share of your attack power every ${a.period} sec, for ${a.baseTicks} ticks plus 1 per combo point.`,
    venom: (a) => `Finisher: your poisons deal ${pctText(a.damage)} more damage and are ${pctText(a.chance)} more likely for ${a.base} sec plus ${a.perPoint} sec per combo point.`,
    bladeFlurry: (a) => `${pctText(a.haste)} attack speed for ${a.duration} sec, and your melee hits strike a second nearby enemy.`,
    adrenalineRush: (a) => `Your energy regenerates twice as fast for ${a.duration} sec.`,
    coldBlood: () => 'Your next Sinister Strike, Backstab, Ambush, Eviscerate or Mutilate is a critical strike.',
    premeditation: (a) => `Add ${a.cp} combo points.`,
    preparation: () => 'Finish the cooldowns of Cold Blood, Premeditation, Vanish, Ghostly Strike, Blade Flurry and Adrenaline Rush.',
    vanish: () => 'Vanish into stealth (your swings stop): Garrote or Ambush again.',
    stealth: () => 'Enter stealth before the pull: open with Garrote or Ambush. Your swings start when you attack.',
    kick: (a) => `Kick the target for ${a.damage} damage and interrupt its spellcasting.`,
    feint: (a) => `Feint: ${a.threat} less threat on the target.`,
    evasion: (a) => `+${a.dodge}% dodge for ${a.duration} sec.`,
  },

  auraText(id, a, f) {
    switch (id) {
      case 'stealth': return 'Stealthed: your swings wait; Garrote and Ambush can be used.';
      case 'sliceAndDice': return `${pctText(ABILITIES.sliceAndDice.haste)} attack speed.`;
      case 'bladeFlurry': return ROGUE_HUD.ABILITY_TEXT.bladeFlurry(ABILITIES.bladeFlurry);
      case 'adrenalineRush': return 'Energy regenerates twice as fast.';
      case 'coldBlood': return 'Your next Sinister Strike, Backstab, Ambush, Eviscerate or Mutilate crits.';
      case 'venom': return `Poisons deal ${pctText(ABILITIES.venom.damage)} more damage and are ${pctText(ABILITIES.venom.chance)} more likely.`;
      case 'cutthroat': return 'Ambush can be used without stealth.';
      case 'thousandCuts': return `Backstab and Hemorrhage cost ${TALENT.thousandCuts.cost * (a.stacks || 1)} less energy.`;
      case 'evasion': return `+${ABILITIES.evasion.dodge}% dodge.`;
      default: return null;
    }
  },

  // Your bleeds, poisons and Hemorrhage on a target (target frame and the Fojji debuff row).
  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.rupture && own.ruptureEnd > f.t) out.push({ icon: ABILITIES.rupture.icon, name: 'Rupture', left: own.ruptureEnd - f.t, kind: 'rupture' });
    if (own.garrote && own.garroteEnd > f.t) out.push({ icon: ABILITIES.garrote.icon, name: 'Garrote', left: own.garroteEnd - f.t, kind: 'garrote' });
    if (own.hemoEnd > f.t) out.push({ icon: ABILITIES.hemorrhage.icon, name: 'Hemorrhage', left: own.hemoEnd - f.t, kind: 'hemorrhage' });
    if (t.exposeEnd > f.t) out.push({ icon: ABILITIES.exposeArmor.icon, name: 'Expose Armor', left: t.exposeEnd - f.t, kind: 'exposeArmor' });
    if (own.dp && own.dp.end > f.t) out.push({ icon: POISONS.deadly.icon, name: 'Deadly Poison', left: own.dp.end - f.t, n: own.dp.stacks, kind: 'deadlyPoison' });
    return out;
  },

  debuffTip(kind, t, f) {
    const own = f.own(t);
    const text = {
      rupture: 'Bleeding.', garrote: 'Bleeding.', hemorrhage: `Takes ${pctText(ABILITIES.hemorrhage.rupture)} more Rupture damage from you.`,
      exposeArmor: `Armor ${Math.round(t.exposeArmor || 0)} lower.`,
      deadlyPoison: `${(own.dp && own.dp.stacks) || 0} stacks, nature damage every ${POISONS.deadly.period} sec.`,
    }[kind];
    return text ? { name: { rupture: 'Rupture', garrote: 'Garrote', hemorrhage: 'Hemorrhage', deadlyPoison: 'Deadly Poison', exposeArmor: 'Expose Armor' }[kind], text } : null;
  },

  // Fojji popups: Slice and Dice running out, Cutthroat (Ambush usable), Cold Blood up; reminders: Slice and Dice
  // missing in combat, a weapon without poison.
  extras(f, { shortKey, binds }) {
    const popups = [];
    const snd = f.aura('sliceAndDice');
    if (snd && snd.end - f.t < 3) popups.push({ icon: ABILITIES.sliceAndDice.icon, name: 'Slice and Dice expiring', text: secs(snd.end - f.t), cls: 'glow', tt: 'aura:sliceAndDice' });
    const ct = f.aura('cutthroat');
    if (ct) popups.push({ icon: ABILITIES.ambush.icon, name: 'Ambush usable (Cutthroat)', text: secs(ct.end - f.t), cls: 'glow', key: shortKey(binds.ambush), tt: 'spell:ambush' });
    if (f.aura('coldBlood')) popups.push({ icon: ABILITIES.coldBlood.icon, name: 'Cold Blood', text: '', tt: 'aura:coldBlood' });
    const debuffs = ROGUE_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    const reminders = [];
    if (f.started && !f.over && !snd) reminders.push({ icon: ABILITIES.sliceAndDice.icon, name: 'Slice and Dice missing', text: '', cls: 'remind', tt: 'spell:sliceAndDice' });
    if (!f.poison.mh) reminders.push({ icon: POISONS.instant.icon, name: 'No poison on your main hand', text: 'MH', cls: 'remind' });
    if (f.dual && !f.poison.oh) reminders.push({ icon: POISONS.deadly.icon, name: 'No poison on your off hand', text: 'OH', cls: 'remind' });
    // The proc textures beside the character: Cutthroat, draining as it runs out.
    const procs = ct ? ct.end - f.t : 0;
    return { popups, debuffs, reminders, proc: ct ? Math.max(0, Math.min(1, procs / TALENT.cutthroat.duration)) : 0 };
  },

  // A button that cannot be used for a reason that will not go away by waiting.
  unusable: (reason) => /^(You must be stealthed|Requires a dagger|You must be behind|You are already stealthed)/.test(reason),
};
