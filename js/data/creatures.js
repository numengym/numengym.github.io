// Each encounter's creature type, as the classic tooltip has it (a hunter tracks it: Improved Tracking). 'none' is a
// boss of no type (Not specified), which no tracking finds; an encounter left out (the training dummies) counts as
// whatever you track, as wowsims takes every target. Sources: warcraft.wiki.gg and Wowpedia's boss pages, classic
// raid guides; Kurinnaxx, Moam, Buru and Hakkar list no type.
export const CREATURE_TYPES = {
  brute: 'humanoid',
  onyxia: 'dragonkin',
  // Molten Core: the Flamewakers are humanoids, the core hounds beasts, the fire lords elementals.
  lucifron: 'humanoid', magmadar: 'beast', geddon: 'elemental', golemagg: 'giant', sulfuron: 'humanoid', majordomo: 'humanoid',
  ragnaros: 'elemental',
  // Blackwing Lair: dragonkin all.
  broodlord: 'dragonkin', vaelastrasz: 'dragonkin', chromaggus: 'dragonkin', nefarian: 'dragonkin',
  // Naxxramas's Construct and Plague Quarters.
  patchwerk: 'undead', grobbulus: 'undead', gluth: 'undead', loatheb: 'undead',
  // Zul'Gurub: the Gurubashi high priests are trolls, Hakkar has no type.
  venoxis: 'humanoid', jeklik: 'humanoid', marli: 'humanoid', thekal: 'humanoid', mandokir: 'humanoid', hakkar: 'none',
  // The Ruins of Ahn'Qiraj.
  kurinnaxx: 'none', rajaxx: 'humanoid', moam: 'none', buru: 'none', ayamiss: 'beast', ossirian: 'giant',
};

export const CREATURE_NAMES = { beast: 'Beast', humanoid: 'Humanoid', undead: 'Undead', elemental: 'Elemental', demon: 'Demon', giant: 'Giant', dragonkin: 'Dragonkin', none: 'Not specified' };
