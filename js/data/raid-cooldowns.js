// Raid cooldowns and externals for group play: the tracker in the top left shows everyone's, and a click on another
// player's asks them for it (they get a pop-up to give it or not). Who has one comes from their class (and talent);
// the numbers are the WoW Forever spell rows (wowsims sim/core/spelldata/spells_auto_gen.go).
//   external: cast on one other player; party: on everyone (Mana Tide Totem).
//   ext: what it does on the player who gets it, read by the engine (engine/unit.js externalMult, caster.js regen):
//     dmgDone / dmgTaken: a share more or less; physImmune: no physical damage; regen: spirit regen times this, all of
//     it while casting. fullHeal: health back to full. pulse: mana every period seconds while it lasts.
export const RAID_COOLDOWNS = {
  // 10060: A_MOD_DAMAGE_PERCENT_DONE and A_MOD_HEALING_DONE_PERCENT 20, 15 sec, 3 min.
  powerInfusion: { name: 'Power Infusion', spellId: 10060, icon: 'spell_holy_powerinfusion', cls: 'priest', talent: 'powerInfusion',
    cd: 180, duration: 15, external: true, ext: { dmgDone: 0.2 }, text: '20% more damage and healing for 15 sec.' },
  // 402004: A_MOD_DAMAGE_PERCENT_TAKEN -40, 8 sec, 3 min.
  painSuppression: { name: 'Pain Suppression', spellId: 402004, icon: 'spell_holy_painsupression', cls: 'priest',
    cd: 180, duration: 8, external: true, ext: { dmgTaken: -0.4 }, text: '40% less damage taken for 8 sec.' },
  // 29166: A_MOD_POWER_REGEN_PERCENT 400 (5 times the spirit regen) and A_MOD_MANA_REGEN_INTERRUPT 100, 20 sec, 6 min.
  innervate: { name: 'Innervate', spellId: 29166, icon: 'spell_nature_lightning', cls: 'druid',
    cd: 360, duration: 20, external: true, ext: { regen: 5 }, text: 'Mana regeneration 5 times as fast, all of it while casting, for 20 sec.' },
  // 10278 (Rank 3): immune to physical damage for 10 sec, 5 min.
  blessingOfProtection: { name: 'Blessing of Protection', spellId: 10278, icon: 'spell_holy_sealofprotection', cls: 'paladin',
    cd: 300, duration: 10, external: true, ext: { physImmune: 1 }, text: 'Immune to physical damage for 10 sec.' },
  // 10310 (Rank 3): E_HEAL_MAX_HEALTH, 20 min.
  layOnHands: { name: 'Lay on Hands', spellId: 10310, icon: 'spell_holy_layonhands', cls: 'paladin',
    cd: 1200, duration: 0, external: true, fullHeal: true, text: 'Heals the target to full health.' },
  // 1325256: the water totem the shaman drops; 290 mana every 3 sec for 12 sec to the party (here: the group).
  manaTideTotem: { name: 'Mana Tide Totem', spellId: 1325256, icon: 'spell_frost_summonwaterelemental', cls: 'shaman', talent: 'manaTideTotem',
    cd: 300, duration: 12, party: true, pulse: { mana: 290, period: 3 }, text: '290 mana every 3 sec for 12 sec to the group.' },
};
