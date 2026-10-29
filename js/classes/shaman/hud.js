// The shaman's HUD pieces, after the Fojji Shaman UI (ForeverAuras class pack): the mana bar with the five-second rule,
// Flame Shock on the target, the totems standing and how long they have left, Clearcasting, Elemental Mastery and
// Revelation, and the tooltips' spell texts.
import { ABILITIES, TOTEM_SLOTS } from '../../data/shaman.js';

const secs = (s) => (!Number.isFinite(s) ? '' : s >= 60 ? `${Math.ceil(s / 60)}m` : s < 3 ? s.toFixed(1) : `${Math.ceil(s)}`);
const sp = (c) => `${Math.round(c * 1000) / 10}% of your spell power`;

export const SHAMAN_HUD = {
  resource: 'Mana',
  comboPoints: false,
  fiveSecondRule: true,

  ABILITY_TEXT: {
    lightningBolt: (a) => `${a.base} Nature damage plus ${sp(a.coef)}. ${a.castTime} sec cast (faster with Elemental Alacrity). Lightning Overload can cast a half-strength copy.`,
    lightningBoltR8: (a) => `A cheaper Lightning Bolt: ${a.base} Nature damage plus ${sp(a.coef)}, ${a.cost} mana.`,
    lavaBurst: (a) => `${a.base} Fire damage plus ${sp(a.coef)}; 20% more with your Flame Shock on the target. ${a.cd} sec cooldown.`,
    flameShock: (a) => `${a.base} Fire damage plus ${sp(a.coef)} now, then ${a.dot.tick} plus ${sp(a.dot.coef)} every ${a.dot.period} sec. Shares a 6 sec cooldown with Earth Shock.`,
    earthShock: (a) => `${a.base} Nature damage plus ${sp(a.coef)}, instantly. Shares a 6 sec cooldown with Flame Shock.`,
    chainLightning: (a) => `${a.base} Nature damage plus ${sp(a.coef)}, jumping to ${a.jumps - 1} more targets for 30% less each time.`,
    searingTotem: (a) => `A fire totem for ${a.duration} sec that attacks your target every ${a.attack.period} sec for ${a.attack.base} Fire damage.`,
    manaSpringTotem: (a) => `A water totem for ${a.duration / 60} min: ${a.manaPerSec * 2} mana every 2 sec.`,
    strengthOfEarthTotem: () => 'An earth totem for 5 min: Strength for your party\'s melee.',
    windfuryTotem: () => 'An air totem for 5 min: Windfury for your party\'s melee.',
    elementalMastery: (a) => `For ${a.duration} sec, Lightning Bolt and Lava Burst cast ${a.castCut} sec faster.`,
  },

  auraText(id) {
    switch (id) {
      case 'clearcasting': return 'Your next Lightning Bolt, Chain Lightning, shock or Lava Burst costs no mana.';
      case 'elementalMastery': return 'Lightning Bolt and Lava Burst cast 0.5 sec faster.';
      case 'revelation': return 'Your next Lightning Bolt, Chain Lightning, Earth Shock or Lava Burst is a sure crit.';
      default: return null;
    }
  },

  targetDebuffs(f, t) {
    const own = f.own(t);
    const out = [];
    if (own.flameShockEnd > f.t) out.push({ icon: ABILITIES.flameShock.icon, name: 'Flame Shock', left: own.flameShockEnd - f.t, kind: 'flameShock' });
    return out;
  },

  debuffTip(kind) {
    if (kind === 'flameShock') return { name: 'Flame Shock', text: 'Burning; Lava Burst deals 20% more to it.' };
    return null;
  },

  extras(f, { shortKey, binds }) {
    const popups = [];
    const cc = f.aura('clearcasting');
    if (cc) popups.push({ icon: 'spell_shadow_manaburn', name: 'Clearcasting', text: secs(cc.end - f.t), cls: 'glow', tt: 'aura:clearcasting' });
    const rev = f.aura('revelation');
    if (rev) popups.push({ icon: 'inv_misc_note_01', name: 'Revelation', text: secs(rev.end - f.t), cls: 'glow', key: shortKey(binds.earthShock), tt: 'aura:revelation' });
    if (f.started && !f.over && f.cdLeft('lavaBurst') <= 0 && f.tal.lavaBurst && f.own(f.target).flameShockEnd > f.t) {
      popups.push({ icon: ABILITIES.lavaBurst.icon, name: 'Lava Burst ready', text: '', cls: 'glow', key: shortKey(binds.lavaBurst), tt: 'spell:lavaBurst' });
    }
    const debuffs = SHAMAN_HUD.targetDebuffs(f, f.target).map((d) => ({ ...d, text: secs(d.left), tt: `debuff:${d.kind}` }));
    // The totems standing, as the Fojji totem bar shows them; a missing fire totem is a reminder.
    const reminders = [];
    for (const slot of TOTEM_SLOTS) {
      const t = f.totems[slot];
      if (t && t.end > f.t) popups.push({ icon: ABILITIES[t.id].icon, name: ABILITIES[t.id].name, text: secs(t.end - f.t), cls: '', tt: `spell:${t.id}` });
    }
    if (f.started && !f.over && !f.totemUp('fire')) reminders.push({ icon: ABILITIES.searingTotem.icon, name: 'No fire totem', text: '', cls: 'remind', tt: 'spell:searingTotem' });
    const procAura = rev || cc;
    return { popups, debuffs, reminders, proc: procAura ? Math.max(0, Math.min(1, (procAura.end - f.t) / 15)) : 0 };
  },

  unusable: (reason) => /^(Already active|You have no more)/.test(reason),
};
