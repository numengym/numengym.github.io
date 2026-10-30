// Boss encounters. As a DPS an NPC tank holds the boss, so it faces away from you and its melee goes to the
// tank; when a player tanks there is no NPC tank and the boss turns to and follows whoever has aggro. The mechanics hit whoever stands in the wrong place, and every hit you take gives rage
// and can proc Enrage. The Brute's damage is a share of your maximum health before armor and stance modifiers; the
// classic bosses' is their abilities' own numbers.
import { ONYXIA_WHELPS } from './onyxia.js';
import { shapeBoss } from './raid-bosses.js';

// Each mechanic: its kind, first cast, repeat interval, cast time (telegraph), and what happens when it lands.
//   cleave: a cone in front of the boss; patch: fire on the ground where you stand, burning while you stay; nova: the
//   whole raid; stomp: everyone near the boss, thrown back; fear: everyone near the boss runs in fear (no casting or
//   attacking); berserk: the boss's enrage timer, a blow every few seconds that ends the raid.
//   damage: a share of your maximum health (the Brute); amount: the ability's damage (the classic bosses).
//   quiet: a steady pulse (Loatheb's Poison Aura) that is not announced each time.
const BRUTE = {
  cleave: { kind: 'cleave', name: 'Cleave', first: 6, every: 8, cast: 1.5, radius: 9, halfAngle: Math.PI / 3, damage: 0.9 },
  patch: { kind: 'patch', name: 'Flame Patch', first: 9, every: 15, cast: 1.5, radius: 3, duration: 10, tick: 1, damage: 0.1 },
  nova: { kind: 'nova', name: 'Fire Nova', first: 14, every: 20, cast: 1.2, damage: 0.12 },
  stomp: { kind: 'stomp', name: 'War Stomp', first: 25, every: 30, cast: 2, radius: 8, damage: 0.15, knockback: 12 },
};

// Each mechanic's name and icon, for the raid pack's timers and alerts (main.js).
export const BRUTE_INFO = {
  cleave: { name: 'Cleave', icon: 'ability_warrior_cleave' },
  patch: { name: 'Flame Patch', icon: 'spell_fire_fire' },
  nova: { name: 'Fire Nova', icon: 'spell_fire_sealoffire' },
  stomp: { name: 'War Stomp', icon: 'ability_warstomp' },
};

// health: the boss's classic 40-man health (APPROX: no Classic database at hand gives them; Settings → Fight, "Real
// boss health", fights to the death against it). look: the boss's skin and size (the Brute's body recoloured).
export const ENCOUNTERS = {
  dummies: { name: 'Training dummies' },
  brute: {
    name: 'Ragefire Brute',
    boss: true, mechanics: BRUTE, info: BRUTE_INFO,
    description: 'Stay behind it (frontal Cleave), move out of Flame Patches, keep your distance when it starts War Stomp, and live through Fire Nova.',
  },
  // Onyxia in her lair (js/world/onyxia.js): her whelps are extra targets (adds), and the arena becomes the lair.
  onyxia: {
    name: 'Onyxia', boss: 'onyxia', adds: ONYXIA_WHELPS, addName: 'Onyxian Whelp', lair: 'onyxiasLair', health: 1110000,
    description: "Onyxia's Lair: fight from her side (Flame Breath in front, Tail Sweep behind). At 65% she flies: kill the whelps, get out of Deep Breath. At 40% she lands: Bellowing Roar fears, the lava cracks erupt.",
  },
  // ---- Molten Core ----
  lucifron: {
    name: 'Lucifron', raid: 'Molten Core', area: 'moltenCore', boss: true, health: 363000, look: { skin: 0x5a1612, scale: 2.5, shape: 'lucifron' },
    mechanics: {
      shadowShock: { kind: 'nova', name: 'Shadow Shock', first: 5, every: 9, cast: 0.5, amount: 700, school: 'shadow' },
      // Impending Doom: 2000 Shadow to everyone near him (the debuff's 10 sec run as its cast).
      doom: { kind: 'stomp', name: 'Impending Doom', first: 12, every: 20, cast: 3, radius: 20, amount: 2000, school: 'shadow', knockback: 0 },
    },
    info: { shadowShock: { name: 'Shadow Shock', icon: 'spell_shadow_shadowbolt' }, doom: { name: 'Impending Doom', icon: 'spell_shadow_nightofthedead' } },
    description: 'Lucifron: Shadow Shock hits the raid; get 20 yards away from him before Impending Doom lands.',
  },
  magmadar: {
    name: 'Magmadar', raid: 'Molten Core', area: 'moltenCore', boss: true, health: 798000, look: { skin: 0xc8601c, scale: 3.4, shape: 'magmadar' },
    mechanics: {
      lavaBomb: { kind: 'patch', name: 'Lava Bomb', first: 6, every: 12, cast: 1.5, radius: 3, duration: 8, tick: 1, amount: 450, school: 'fire' },
      // Panic: everyone within 40 yards flees in fear for 8 sec (a Fear Ward or a tremor would save you).
      panic: { kind: 'fear', name: 'Panic', first: 15, every: 30, cast: 1.5, radius: 40, duration: 8 },
    },
    info: { lavaBomb: { name: 'Lava Bomb', icon: 'spell_fire_selfdestruct' }, panic: { name: 'Panic', icon: 'spell_shadow_deathscream' } },
    description: 'Magmadar: move out of Lava Bombs; Panic fears everyone near him every 30 sec.',
  },
  ragnaros: {
    name: 'Ragnaros', raid: 'Molten Core', area: 'moltenCore', boss: true, rooted: true, health: 1099000, look: { skin: 0xff6a1c, scale: 5.2, shape: 'ragnaros' }, // rooted: he never leaves his lava
    mechanics: {
      // Wrath of Ragnaros: fire and a throw back for everyone in melee.
      wrath: { kind: 'stomp', name: 'Wrath of Ragnaros', first: 25, every: 25, cast: 1.5, radius: 12, amount: 2300, school: 'fire', knockback: 16 },
      lavaSplash: { kind: 'patch', name: 'Lava Splash', first: 8, every: 14, cast: 1.5, radius: 3.5, duration: 6, tick: 1, amount: 550, school: 'fire' },
      magmaBlast: { kind: 'nova', name: 'Magma Blast', first: 40, every: 40, cast: 2, amount: 1200, school: 'fire' },
    },
    info: { wrath: { name: 'Wrath of Ragnaros', icon: 'spell_fire_soulburn' }, lavaSplash: { name: 'Lava Splash', icon: 'spell_fire_volcano' }, magmaBlast: { name: 'Magma Blast', icon: 'spell_fire_fireball02' } },
    description: 'Ragnaros: melee get thrown back by Wrath of Ragnaros every 25 sec; step out of Lava Splash.',
  },
  geddon: {
    name: 'Baron Geddon', raid: 'Molten Core', area: 'moltenCore', boss: true, health: 700000, look: { skin: 0xff7a2a, scale: 3.0, shape: 'geddon' },
    mechanics: {
      inferno: { kind: 'stomp', name: 'Inferno', first: 14, every: 25, cast: 2, radius: 10, amount: 1600, school: 'fire', knockback: 0 },
      livingBomb: { kind: 'patch', name: 'Living Bomb', first: 9, every: 15, cast: 3, radius: 6, duration: 1, tick: 1, amount: 1800, school: 'fire' },
      igniteMana: { kind: 'nova', name: 'Ignite Mana', first: 20, every: 30, cast: 0.5, amount: 400, school: 'fire' },
    },
    info: { inferno: { name: 'Inferno', icon: 'spell_fire_incinerate' }, livingBomb: { name: 'Living Bomb', icon: 'inv_enchant_essenceastralsmall' }, igniteMana: { name: 'Ignite Mana', icon: 'spell_fire_incinerate' } },
    description: 'Baron Geddon: run out of Inferno, and when Living Bomb is on you, get away from the raid before it goes off.',
  },
  golemagg: {
    name: 'Golemagg the Incinerator', raid: 'Molten Core', area: 'moltenCore', boss: true, health: 900000, look: { skin: 0x5a3a2a, scale: 3.8, shape: 'golemagg' },
    mechanics: {
      pyroblast: { kind: 'nova', name: 'Pyroblast', first: 7, every: 9, cast: 0.5, amount: 700, school: 'fire' },
      earthquake: { kind: 'stomp', name: 'Earthquake', first: 12, every: 16, cast: 1, radius: 9, amount: 900, knockback: 0 },
      magmaSplash: { kind: 'cleave', name: 'Magma Splash', first: 5, every: 7, cast: 0.5, radius: 9, halfAngle: Math.PI / 3, amount: 1200, school: 'fire' },
    },
    info: { pyroblast: { name: 'Pyroblast', icon: 'spell_fire_fireball02' }, earthquake: { name: 'Earthquake', icon: 'spell_nature_earthquake' }, magmaSplash: { name: 'Magma Splash', icon: 'spell_fire_immolation' } },
    description: 'Golemagg the Incinerator: Pyroblast lands on the raid again and again; stay out of his front (Magma Splash) and his Earthquakes near him.',
  },
  // ---- Blackwing Lair ----
  broodlord: {
    name: 'Broodlord Lashlayer', raid: 'Blackwing Lair', area: 'blackwingLair', boss: true, health: 1070000, look: { skin: 0x3a4aa0, scale: 2.8, shape: 'broodlord' },
    mechanics: {
      blastWave: { kind: 'stomp', name: 'Blast Wave', first: 10, every: 20, cast: 1, radius: 10, amount: 1300, school: 'fire', knockback: 6 },
      cleave: { kind: 'cleave', name: 'Cleave', first: 6, every: 9, cast: 1, radius: 9, halfAngle: Math.PI / 3, amount: 1800 },
    },
    info: { blastWave: { name: 'Blast Wave', icon: 'spell_holy_excorcism_02' }, cleave: { name: 'Cleave', icon: 'ability_warrior_cleave' } },
    description: 'Broodlord Lashlayer: stay out of his front (Cleave); Blast Wave hits everyone near him every 20 sec.',
  },
  vaelastrasz: {
    name: 'Vaelastrasz the Corrupt', raid: 'Blackwing Lair', area: 'blackwingLair', boss: true, health: 1000000, look: { skin: 0x9a2a1a, scale: 3.4, shape: 'vaelastrasz' },
    mechanics: {
      flameBreath: { kind: 'cleave', name: 'Flame Breath', first: 6, every: 11, cast: 1.5, radius: 14, halfAngle: Math.PI / 4, amount: 2200, school: 'fire' },
      fireNova: { kind: 'nova', name: 'Fire Nova', first: 4, every: 6, cast: 0.5, amount: 300, school: 'fire', quiet: true },
      burningAdrenaline: { kind: 'patch', name: 'Burning Adrenaline', first: 15, every: 15, cast: 1, radius: 5, duration: 3, tick: 1, amount: 900, school: 'fire' },
    },
    info: { flameBreath: { name: 'Flame Breath', icon: 'spell_fire_fire' }, fireNova: { name: 'Fire Nova', icon: 'spell_fire_sealoffire' }, burningAdrenaline: { name: 'Burning Adrenaline', icon: 'inv_gauntlets_03' } },
    description: 'Vaelastrasz the Corrupt: a race, Fire Nova never stops; never in front of him (Flame Breath), and away from the raid with Burning Adrenaline.',
  },
  chromaggus: {
    name: 'Chromaggus', raid: 'Blackwing Lair', area: 'blackwingLair', boss: true, health: 1500000, look: { skin: 0x8a5a2a, scale: 3.6, shape: 'chromaggus' },
    mechanics: {
      incinerate: { kind: 'nova', name: 'Incinerate', first: 30, every: 60, cast: 2, amount: 1500, school: 'fire' },
      corrosiveAcid: { kind: 'nova', name: 'Corrosive Acid', first: 60, every: 60, cast: 2, amount: 1200, school: 'nature' },
      frenzy: { kind: 'cleave', name: 'Frenzied Bite', first: 6, every: 8, cast: 0.5, radius: 9, halfAngle: Math.PI / 3, amount: 1400 },
    },
    info: { incinerate: { name: 'Incinerate', icon: 'spell_fire_flameshock' }, corrosiveAcid: { name: 'Corrosive Acid', icon: 'spell_nature_acid_01' }, frenzy: { name: 'Frenzied Bite', icon: 'ability_druid_ferociousbite' } },
    description: 'Chromaggus: his breaths (Incinerate, Corrosive Acid) hit the whole raid every 30 seconds in turn; keep out of his front.',
  },
  nefarian: {
    name: 'Nefarian', raid: 'Blackwing Lair', area: 'blackwingLair', boss: true, health: 2000000, look: { skin: 0x1a1418, scale: 3.8, shape: 'nefarian' },
    mechanics: {
      shadowFlame: { kind: 'cleave', name: 'Shadow Flame', first: 10, every: 14, cast: 2, radius: 15, halfAngle: Math.PI / 4, amount: 2600, school: 'shadow' },
      bellowingRoar: { kind: 'fear', name: 'Bellowing Roar', first: 18, every: 30, cast: 1.5, radius: 40, duration: 3 },
      veilOfShadow: { kind: 'nova', name: 'Veil of Shadow', first: 14, every: 16, cast: 0.5, amount: 500, school: 'shadow' },
    },
    info: { shadowFlame: { name: 'Shadow Flame', icon: 'spell_fire_incinerate' }, bellowingRoar: { name: 'Bellowing Roar', icon: 'spell_shadow_psychicscream' }, veilOfShadow: { name: 'Veil of Shadow', icon: 'spell_shadow_gathershadows' } },
    description: 'Nefarian: never in front of him (Shadow Flame); Bellowing Roar fears everyone; Veil of Shadow hits the raid.',
  },
  // ---- Naxxramas ----
  patchwerk: {
    name: 'Patchwerk', raid: 'Naxxramas', area: 'naxxramas', boss: true, health: 4264000, look: { skin: 0x8c9a72, scale: 4.2, width: 1.3, shape: 'patchwerk' },
    mechanics: {
      // A tank-and-spank: Hateful Strike is the tanks' worry; at 7 min he goes berserk and the raid dies.
      berserk: { kind: 'berserk', name: 'Berserk', first: 420, every: 2, cast: 0, amount: 6000 },
    },
    info: { berserk: { name: 'Berserk', icon: 'racial_troll_berserk' } },
    description: 'Patchwerk: a pure damage race. Kill him before he goes berserk at 7 minutes.',
  },
  grobbulus: {
    name: 'Grobbulus', raid: 'Naxxramas', area: 'naxxramas', boss: true, health: 1800000, look: { skin: 0x5a8a4a, scale: 3.8, width: 1.25, shape: 'grobbulus' },
    mechanics: {
      slimeSpray: { kind: 'cleave', name: 'Slime Spray', first: 8, every: 15, cast: 1, radius: 12, halfAngle: Math.PI / 3, amount: 1500, school: 'nature' },
      poisonCloud: { kind: 'patch', name: 'Poison Cloud', first: 12, every: 15, cast: 1.5, radius: 5, duration: 15, tick: 1, amount: 450, school: 'nature' },
      injection: { kind: 'nova', name: 'Mutating Injection', first: 18, every: 20, cast: 1, amount: 600, school: 'nature' },
    },
    info: { slimeSpray: { name: 'Slime Spray', icon: 'inv_misc_slime_01' }, poisonCloud: { name: 'Poison Cloud', icon: 'spell_nature_abolishmagic' }, injection: { name: 'Mutating Injection', icon: 'spell_shadow_callofbone' } },
    description: 'Grobbulus: out of his front (Slime Spray) and out of the Poison Clouds he leaves behind him.',
  },
  gluth: {
    name: 'Gluth', raid: 'Naxxramas', area: 'naxxramas', boss: true, health: 1700000, look: { skin: 0x6a7a5a, scale: 3.6, shape: 'gluth' },
    mechanics: {
      roar: { kind: 'fear', name: 'Terrifying Roar', first: 12, every: 20, cast: 1, radius: 20, duration: 3 },
      decimate: { kind: 'nova', name: 'Decimate', first: 105, every: 105, cast: 3, amount: 2600 },
      enrage: { kind: 'berserk', name: 'Berserk', first: 480, every: 2, cast: 0, amount: 6000 },
    },
    info: { roar: { name: 'Terrifying Roar', icon: 'ability_devour' }, decimate: { name: 'Decimate', icon: 'inv_shield_01' }, enrage: { name: 'Berserk', icon: 'racial_troll_berserk' } },
    description: 'Gluth: Terrifying Roar fears those near him; every 105 seconds Decimate tears into the whole raid: be healed up for it. Berserk at 8 minutes.',
  },
  loatheb: {
    name: 'Loatheb', raid: 'Naxxramas', area: 'naxxramas', boss: true, health: 2500000, look: { skin: 0x6a7a4a, scale: 3.6, shape: 'loatheb' },
    mechanics: {
      poisonAura: { kind: 'nova', name: 'Poison Aura', first: 3, every: 3, cast: 0, amount: 120, school: 'nature', quiet: true },
      inevitableDoom: { kind: 'nova', name: 'Inevitable Doom', first: 30, every: 30, cast: 1, amount: 1600, school: 'shadow' },
      enrage: { kind: 'berserk', name: 'Berserk', first: 600, every: 2, cast: 0, amount: 6000 },
    },
    info: { poisonAura: { name: 'Poison Aura', icon: 'spell_nature_corrosivebreath' }, inevitableDoom: { name: 'Inevitable Doom', icon: 'spell_shadow_nightofthedead' }, enrage: { name: 'Berserk', icon: 'racial_troll_berserk' } },
    description: 'Loatheb: Poison Aura never stops; Inevitable Doom hits everyone every 30 seconds. Healing is scarce in the real fight (Corrupted Mind); here it is a damage race.',
  },
  // ---- Zul'Gurub (20 players; health APPROX like the others) ----
  venoxis: {
    name: 'High Priest Venoxis', raid: "Zul'Gurub", area: 'zulGurub', boss: true, health: 210000, look: { skin: 0x4a7a5a, scale: 3.2, shape: 'venoxis' },
    mechanics: {
      holyNova: { kind: 'nova', name: 'Holy Nova', first: 8, every: 14, cast: 1.5, amount: 650, school: 'holy' },
      poisonCloud: { kind: 'patch', name: 'Poison Cloud', first: 11, every: 16, cast: 1.5, radius: 4, duration: 10, tick: 1, amount: 320, school: 'nature' },
    },
    info: { holyNova: { name: 'Holy Nova', icon: 'spell_holy_holynova' }, poisonCloud: { name: 'Poison Cloud', icon: 'spell_nature_acid_01' } },
    description: 'High Priest Venoxis: Holy Nova hits the whole raid; step out of the Poison Clouds he leaves under you.',
  },
  jeklik: {
    name: 'High Priestess Jeklik', raid: "Zul'Gurub", area: 'zulGurub', boss: true, health: 240000, look: { skin: 0x5a6a7a, scale: 3.0, shape: 'jeklik' },
    mechanics: {
      sonicBurst: { kind: 'stomp', name: 'Sonic Burst', first: 8, every: 20, cast: 2, radius: 12, amount: 900, school: 'nature', knockback: 0 },
      screech: { kind: 'fear', name: 'Terrifying Screech', first: 16, every: 30, cast: 1.5, radius: 25, duration: 4 },
      fireBomb: { kind: 'patch', name: 'Bat Rider Bomb', first: 12, every: 14, cast: 1.5, radius: 4, duration: 8, tick: 1, amount: 450, school: 'fire' },
    },
    info: { sonicBurst: { name: 'Sonic Burst', icon: 'spell_holy_silence' }, screech: { name: 'Terrifying Screech', icon: 'spell_shadow_psychicscream' }, fireBomb: { name: 'Bat Rider Bomb', icon: 'spell_fire_selfdestruct' } },
    description: 'High Priestess Jeklik: get out of Sonic Burst\'s reach, live through Terrifying Screech, and out of the bat riders\' fire.',
  },
  marli: {
    name: "High Priestess Mar'li", raid: "Zul'Gurub", area: 'zulGurub', boss: true, health: 260000, look: { skin: 0x4a6a8a, scale: 3.0, shape: 'marli' },
    mechanics: {
      poisonVolley: { kind: 'nova', name: 'Poison Bolt Volley', first: 6, every: 12, cast: 1, amount: 550, school: 'nature' },
      webs: { kind: 'stomp', name: 'Enveloping Webs', first: 15, every: 25, cast: 2, radius: 10, amount: 300, school: 'nature', knockback: 0 },
    },
    info: { poisonVolley: { name: 'Poison Bolt Volley', icon: 'spell_nature_corrosivebreath' }, webs: { name: 'Enveloping Webs', icon: 'spell_nature_web' } },
    description: "High Priestess Mar'li: Poison Bolt Volley hits the raid over and over; get away from her before Enveloping Webs land.",
  },
  thekal: {
    name: 'High Priest Thekal', raid: "Zul'Gurub", area: 'zulGurub', boss: true, health: 260000, look: { skin: 0xc87a3a, scale: 3.1, shape: 'thekal' },
    mechanics: {
      mortalCleave: { kind: 'cleave', name: 'Mortal Cleave', first: 6, every: 9, cast: 1, radius: 9, halfAngle: Math.PI / 3, amount: 1800 },
      forcePunch: { kind: 'stomp', name: 'Force Punch', first: 14, every: 22, cast: 1.5, radius: 8, amount: 1000, knockback: 14 },
    },
    info: { mortalCleave: { name: 'Mortal Cleave', icon: 'ability_warrior_savageblow' }, forcePunch: { name: 'Force Punch', icon: 'ability_gouge' } },
    description: 'High Priest Thekal: stay out of his front (Mortal Cleave); Force Punch throws everyone near him back.',
  },
  mandokir: {
    name: 'Bloodlord Mandokir', raid: "Zul'Gurub", area: 'zulGurub', boss: true, health: 300000, look: { skin: 0x3a6a8a, scale: 3.6, shape: 'mandokir' },
    mechanics: {
      cleave: { kind: 'cleave', name: 'Cleave', first: 5, every: 8, cast: 1, radius: 9, halfAngle: Math.PI / 3, amount: 1600 },
      whirlwind: { kind: 'stomp', name: 'Whirlwind', first: 12, every: 20, cast: 2, radius: 9, amount: 1400, knockback: 0 },
    },
    info: { cleave: { name: 'Cleave', icon: 'ability_warrior_cleave' }, whirlwind: { name: 'Whirlwind', icon: 'ability_whirlwind' } },
    description: 'Bloodlord Mandokir: never in front of him (Cleave), and out of reach when he starts to Whirlwind.',
  },
  hakkar: {
    name: 'Hakkar the Soulflayer', raid: "Zul'Gurub", area: 'zulGurub', boss: true, health: 550000, look: { skin: 0x9a1e1e, scale: 4.4, shape: 'hakkar' },
    mechanics: {
      corruptedBlood: { kind: 'nova', name: 'Corrupted Blood', first: 10, every: 10, cast: 0.5, amount: 350, school: 'shadow' },
      causeInsanity: { kind: 'fear', name: 'Cause Insanity', first: 30, every: 35, cast: 1.5, radius: 30, duration: 6 },
      bloodSiphon: { kind: 'nova', name: 'Blood Siphon', first: 90, every: 90, cast: 5, amount: 2400, school: 'shadow' },
      enrage: { kind: 'berserk', name: 'Enrage', first: 600, every: 2, cast: 0, amount: 6000 },
    },
    info: {
      corruptedBlood: { name: 'Corrupted Blood', icon: 'spell_shadow_shadowwordpain' }, causeInsanity: { name: 'Cause Insanity', icon: 'spell_shadow_shadowworddominate' },
      bloodSiphon: { name: 'Blood Siphon', icon: 'spell_shadow_lifedrain02' }, enrage: { name: 'Enrage', icon: 'racial_troll_berserk' },
    },
    description: 'Hakkar the Soulflayer: Corrupted Blood ticks on the raid, Cause Insanity takes someone for a while, and every 90 seconds Blood Siphon drains everyone: be healed up for it. He enrages at 10 minutes.',
  },
  // ---- Ruins of Ahn'Qiraj (20 players; health APPROX) ----
  kurinnaxx: {
    name: 'Kurinnaxx', raid: "Ruins of Ahn'Qiraj", area: 'ruinsOfAhnQiraj', boss: true, health: 300000, look: { skin: 0x9a7a4a, scale: 3.4, shape: 'kurinnaxx' },
    mechanics: {
      wideSlash: { kind: 'cleave', name: 'Wide Slash', first: 6, every: 10, cast: 1, radius: 9, halfAngle: Math.PI / 3, amount: 1500 },
      sandTrap: { kind: 'patch', name: 'Sand Trap', first: 10, every: 15, cast: 1.5, radius: 4, duration: 8, tick: 1, amount: 400, school: 'nature' },
    },
    info: { wideSlash: { name: 'Wide Slash', icon: 'ability_warrior_cleave' }, sandTrap: { name: 'Sand Trap', icon: 'ability_hunter_snaketrap' } },
    description: 'Kurinnaxx: stay out of his front (Wide Slash) and out of the Sand Traps that open under you.',
  },
  rajaxx: {
    name: 'General Rajaxx', raid: "Ruins of Ahn'Qiraj", area: 'ruinsOfAhnQiraj', boss: true, health: 350000, look: { skin: 0x7a5a3a, scale: 3.2, shape: 'rajaxx' },
    mechanics: {
      thundercrash: { kind: 'nova', name: 'Thundercrash', first: 12, every: 20, cast: 1.5, amount: 1100 },
      thunderclap: { kind: 'stomp', name: 'Thunderclap', first: 7, every: 14, cast: 1, radius: 10, amount: 700, knockback: 0 },
    },
    info: { thundercrash: { name: 'Thundercrash', icon: 'spell_nature_thunderclap' }, thunderclap: { name: 'Thunderclap', icon: 'ability_thunderclap' } },
    description: 'General Rajaxx: Thundercrash hits the whole raid hard; get out of Thunderclap\'s reach.',
  },
  moam: {
    name: 'Moam', raid: "Ruins of Ahn'Qiraj", area: 'ruinsOfAhnQiraj', boss: true, health: 400000, look: { skin: 0x2a2a34, scale: 3.8, shape: 'moam' },
    mechanics: {
      trample: { kind: 'stomp', name: 'Trample', first: 9, every: 16, cast: 1.5, radius: 8, amount: 900, knockback: 6 },
      arcaneEruption: { kind: 'nova', name: 'Arcane Eruption', first: 50, every: 50, cast: 3, amount: 1700, school: 'arcane' },
    },
    info: { trample: { name: 'Trample', icon: 'ability_warstomp' }, arcaneEruption: { name: 'Arcane Eruption', icon: 'spell_nature_wispsplode' } },
    description: 'Moam: Trample throws back everyone near him; when his mana fills (every 50 seconds here) Arcane Eruption hits the whole raid: be healed up for it.',
  },
  buru: {
    name: 'Buru the Gorger', raid: "Ruins of Ahn'Qiraj", area: 'ruinsOfAhnQiraj', boss: true, health: 500000, look: { skin: 0x6a5a3a, scale: 3.4, shape: 'buru' },
    mechanics: {
      eggs: { kind: 'patch', name: 'Exploding Egg', first: 12, every: 18, cast: 2, radius: 5, duration: 3, tick: 1, amount: 700, school: 'physical' },
      creepingPlague: { kind: 'nova', name: 'Creeping Plague', first: 20, every: 12, cast: 1, amount: 400, school: 'nature' },
    },
    info: { eggs: { name: 'Exploding Egg', icon: 'inv_egg_02' }, creepingPlague: { name: 'Creeping Plague', icon: 'spell_shadow_creepingplague' } },
    description: 'Buru the Gorger: get away from the eggs before they burst; Creeping Plague eats at the whole raid.',
  },
  ayamiss: {
    name: 'Ayamiss the Hunter', raid: "Ruins of Ahn'Qiraj", area: 'ruinsOfAhnQiraj', boss: true, health: 330000, look: { skin: 0x8a6a1a, scale: 3.0, shape: 'ayamiss' },
    mechanics: {
      stingerSpray: { kind: 'nova', name: 'Stinger Spray', first: 8, every: 12, cast: 1, amount: 550, school: 'nature' },
      swarm: { kind: 'patch', name: 'Hive Zara Swarm', first: 14, every: 18, cast: 1.5, radius: 4.5, duration: 6, tick: 1, amount: 350, school: 'nature' },
    },
    info: { stingerSpray: { name: 'Stinger Spray', icon: 'inv_misc_monsterspidercarapace_01' }, swarm: { name: 'Hive Zara Swarm', icon: 'spell_nature_insectswarm' } },
    description: 'Ayamiss the Hunter: Stinger Spray hits the whole raid; step out of her larvae\'s swarm.',
  },
  ossirian: {
    name: 'Ossirian the Unscarred', raid: "Ruins of Ahn'Qiraj", area: 'ruinsOfAhnQiraj', boss: true, health: 650000, look: { skin: 0x8a6a4a, scale: 3.9, shape: 'ossirian' },
    mechanics: {
      warStomp: { kind: 'stomp', name: 'War Stomp', first: 10, every: 18, cast: 1.5, radius: 10, amount: 1000, knockback: 6 },
      sandVortex: { kind: 'patch', name: 'Sand Vortex', first: 14, every: 16, cast: 1.5, radius: 5, duration: 8, tick: 1, amount: 500 },
      supreme: { kind: 'berserk', name: 'Supreme Mode', first: 480, every: 2, cast: 0, amount: 6000 },
    },
    info: { warStomp: { name: 'War Stomp', icon: 'ability_warstomp' }, sandVortex: { name: 'Sand Vortex', icon: 'spell_nature_cyclone' }, supreme: { name: 'Supreme Mode', icon: 'spell_nature_unrelentingstorm' } },
    description: 'Ossirian the Unscarred: get out of War Stomp\'s reach and the Sand Vortexes; kill him before he turns supreme (here at 8 minutes, without the crystals to weaken him).',
  },
};

const HEALING_PER_SECOND = 0.03; // your healers, as a share of maximum health
const BRUTE_SKIN = 0xb5442c;     // models.js RACE_LOOKS.brute, recoloured for each boss

// A classic boss's body: the Brute's, in its own skin colour, size and pieces (world/raid-bosses.js). area: the raid
// it is fought in (world/environment.js ZONE_LOOKS).
export function dressBoss(model, look) {
  if (!model || !look) return;
  if (look.skin != null) {
    model.traverse((o) => {
      for (const m of [].concat(o.material || [])) if (m.color && m.color.getHex() === BRUTE_SKIN) m.color.setHex(look.skin);
    });
  }
  if (look.scale) {
    const k = look.scale / model.scale.x;
    model.scale.setScalar(look.scale);
    model.userData.height *= k;
    model.userData.radius *= k;
  }
  if (look.width) { model.scale.x *= look.width; model.scale.z *= look.width; model.userData.radius *= look.width; }
  if (look.shape) shapeBoss(model, look.shape, look.skin);
}

export class BruteEncounter {
  // onMessage(text): a plain raid warning. onAlert({ key, phase: 'cast' | 'land', cast }): the raid pack's alerts;
  // when it is given (and returns true) it replaces the raid warning for that mechanic. def: the encounter (its
  // mechanics and their info; the Brute's by default).
  constructor(fight, arena, onMessage, onAlert = null, def = ENCOUNTERS.brute) {
    this.f = fight;
    this.a = arena;
    this.say = onMessage;
    this.alert = onAlert;
    this.mech = def.mechanics || BRUTE;
    this.info = def.info || BRUTE_INFO;
    this.casting = null; // { name, start, end } for the boss cast bar
    this.patches = [];
    this.next = Object.fromEntries(Object.entries(this.mech).map(([k, m]) => [k, m.first]));
    this.lastHeal = 0;
    this.lastTankSwing = 0;
  }

  // Called every frame after the fight has advanced.
  update() {
    const f = this.f;
    if (!f.started || f.over) return;
    const t = f.t;

    // Healers keep you up.
    while (this.lastHeal + 1 <= t) {
      this.lastHeal += 1;
      if (!f.dead) f.heal(f.maxHealth * HEALING_PER_SECOND);
    }
    // The boss beats on the NPC tank (a player tank's hits come from the fight, see main.js).
    if (this.a.tank && t - this.lastTankSwing >= 2) {
      this.lastTankSwing = t;
      if (!this.casting) this.a.bossSwing(false);
    }

    for (const [key, m] of Object.entries(this.mech)) {
      if (t >= this.next[key] - m.cast && !this.pending(key)) this.begin(key, m);
    }
    this.resolve(t);
    this.burn(t);
  }

  pending(key) { return this.casting && this.casting.key === key; }

  // A mechanic's damage on you: its own number, or a share of your health (the Brute).
  dmg(m) { return m.amount != null ? m.amount : this.f.maxHealth * m.damage; }

  // Seconds until each mechanic lands, for the boss timers: [{ key, left, total }].
  timers() {
    const t = this.f.t;
    return Object.entries(this.mech).map(([key, m]) => {
      const left = this.pending(key) ? this.casting.end - t : this.next[key] - t;
      return { key, left, total: this.pending(key) ? m.cast : m.every };
    });
  }

  // Standing in fire on the ground (GTFO).
  inFire() {
    const p = this.a.playerPos();
    return this.patches.some((patch) => patch.end > this.f.t && Math.hypot(p.x - patch.x, p.z - patch.z) <= patch.radius);
  }

  // The raid pack's alert, or the plain raid warning when there is none.
  notify(key, phase, text) {
    const handled = this.alert && this.alert({ key, phase, cast: this.mech[key].cast, info: this.info[key] });
    if (!handled && text) this.say(text);
  }

  // Starts a cast: shows the telegraph and the cast bar.
  begin(key, m) {
    if (this.casting) return; // one cast at a time; the next one waits
    const t = this.f.t;
    this.casting = { key, name: m.name, start: t, end: t + m.cast };
    const p = this.a.playerPos();
    const bossRadius = this.a.dummies[0].userData.radius;
    if (m.kind === 'cleave') { this.a.telegraphCone(m.radius + bossRadius, m.halfAngle, m.cast); this.notify(key, 'cast', null); }
    if (m.kind === 'patch') {
      this.casting.x = p.x;
      this.casting.z = p.z;
      this.a.groundCircle(p.x, p.z, m.radius, m.cast, 'warn');
      this.notify(key, 'cast', `${m.name} under you - move!`);
    }
    if (m.kind === 'stomp') {
      this.a.ring(m.radius + bossRadius, m.cast, 0xffb020);
      this.notify(key, 'cast', `${m.name} - get away from the boss!`);
    }
    if (m.kind === 'fear') {
      this.a.ring(m.radius + bossRadius, m.cast, 0x9a5cff);
      this.notify(key, 'cast', `${m.name} - fear incoming!`);
    }
    if (m.kind === 'nova' && !m.quiet) this.notify(key, 'cast', `${m.name} incoming`); // quiet: a steady pulse, not worth a warning
    if (m.kind === 'berserk' && !this.berserk) { this.berserk = true; this.say(`${m.name}! The boss is enraged.`); }
  }

  // Lands the cast that just finished.
  resolve(t) {
    const c = this.casting;
    if (!c || t < c.end) return;
    const m = this.mech[c.key];
    const f = this.f;
    const g = f.geo;
    this.casting = null;
    this.next[c.key] = c.end + m.every;
    const school = m.school || 'physical';

    if (m.kind === 'cleave') {
      this.a.bossSwing(true);
      this.a.shake(0.15);
      if (g.dist[0] <= m.radius && g.angle[0] < m.halfAngle) {
        f.takeDamage(this.dmg(m), { school, name: m.name });
        this.a.shake(0.45);
        this.notify(c.key, 'hit', `You were hit by ${m.name} - stand behind the boss!`);
      }
    } else if (m.kind === 'patch') {
      this.patches.push({ x: c.x, z: c.z, radius: m.radius, m, end: t + m.duration, nextTick: t, effect: this.a.groundCircle(c.x, c.z, m.radius, m.duration, 'fire') });
    } else if (m.kind === 'nova' || m.kind === 'berserk') {
      this.a.ring(30, 0.8, school === 'shadow' ? 0x8a4cff : 0xff5a1a);
      this.a.shake(0.12);
      f.takeDamage(this.dmg(m), { school, name: m.name });
    } else if (m.kind === 'stomp') {
      this.a.bossSwing(true);
      this.a.shake(0.7); // the ground shakes for everyone
      if (g.dist[0] <= m.radius) {
        f.takeDamage(this.dmg(m), { school, name: m.name });
        if (m.knockback) this.a.knockback(m.knockback);
      }
    } else if (m.kind === 'fear') {
      // You run in fear (world/arena.js), which stops a cast, unless you are immune (Berserker Rage, Death Wish, Will of
      // the Forsaken: arena.fearImmune).
      if (g.dist[0] <= m.radius && !f.dead && this.a.fear(m.duration)) {
        this.notify(c.key, 'hit', `${m.name}: you are feared for ${m.duration} sec`);
      }
    }
    // The rest of the raid (main.js: the NPC tank and raiders) gets it too, and gets out of it or not.
    if (this.onLand) this.onLand(m);
  }

  // Fire on the ground burns while you stand in it.
  burn(t) {
    const p = this.a.playerPos();
    this.patches = this.patches.filter((patch) => patch.end > t);
    for (const patch of this.patches) {
      if (t < patch.nextTick) continue;
      patch.nextTick = t + patch.m.tick;
      if (Math.hypot(p.x - patch.x, p.z - patch.z) <= patch.radius) {
        this.f.takeDamage(this.dmg(patch.m), { school: patch.m.school || 'fire', name: patch.m.name });
      }
    }
  }
}
