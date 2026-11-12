// The warlock's rotations, the single-target parts of the wowsims Forever builds (ui/specs/warlock/dps/builds:
// aff_wrack, demo_fire_brand, demo_shadow_brand, destro, sm_ruin), with the assigned curse cast by name and without the
// multi-target groups and the moving. The rotation helper and the sim both play them.
const S = (id) => ({ spellId: { spellId: id } });
const c = (v) => ({ const: { val: String(v) } });
const cmp = (lhs, op, rhs) => ({ cmp: { lhs, op, rhs } });
const and = (...vals) => ({ and: { vals } });
const not = (val) => ({ not: { val } });
const cast = (id, condition) => ({ action: { castSpell: S(id), ...(condition ? { condition } : {}) } });
const dotUp = (id) => ({ dotIsActive: S(id) });
const or = (...vals) => ({ or: { vals } });
const onTarget = (id) => ({ auraIsActive: { auraId: { spellId: id }, sourceUnit: { type: 'CurrentTarget' } } });
const LEFT = { remainingTime: {} };
const manaLow = (pct) => and(cmp({ currentManaPercent: {} }, 'OpLt', c(pct)), cmp(LEFT, 'OpGt', c('60s')));
const MANA_LOW = manaLow('30%');
const item = (id, condition) => ({ action: { castSpell: { spellId: { itemId: id } }, ...(condition ? { condition } : {}) } });
const group = (name, condition) => ({ action: { groupReference: { groupName: name }, ...(condition ? { condition } : {}) } });
// A pre-pull cast landing as the fight starts (its cast time before, as wowsims times it), or one at a fixed time.
const precast = (id) => ({ action: { castSpell: S(id) }, doAtValue: { math: { op: 'OpMul', lhs: { math: { op: 'OpAdd', lhs: { spellCastTime: S(id) }, rhs: { spellTravelTime: S(id) } } }, rhs: c('-0.9') } } });
const at = (id, when) => ({ action: { castSpell: S(id) }, doAtValue: c(when) });

const SHADOW_BOLT = 25307;
const IMMOLATE = 25309;
const CORRUPTION = 25311;
const AGONY = 11713;
const DOOM = 603;
const SIPHON_LIFE = 18881;
const WRACK = 1316697;
const ELEMENTS = 1311680;
const AMPLIFY = 18288;
const LIFE_TAP = 11689;
const SEARING_PAIN = 17923;
const SOUL_FIRE = 17924;
const DEATH_COIL = 17926;
const INCINERATE = 1293813;
const BLOOD_FURY = 20572;
const BERSERKING = 20554;
const EUREKA = 1259821; // the warlock's Gnome Eureka!
const EPHEMERAL_POWER = 18820; // Talisman of Ephemeral Power
const OFFENSIVE_POTION = 250937;
const FROZEN_HEART = 249469; // Frozen Heart of the Mountain

// The Bane of Doom builds' cooldowns, saved for Doom's last seconds (its one big tick) or used while no Doom is up: the
// trinket, the racials and the nukes as it ends (`nukes`, cast in its last seconds on one target), the potion in its
// last 30 s, Life Tap below 2600 mana (`tapMana`) in its last 22 s.
const doomEnding = (s) => or(and(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c(s)), dotUp(DOOM)), not(dotUp(DOOM)));
const doomLast = (s) => and(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c(s)), dotUp(DOOM), cmp({ numberTargets: {} }, 'OpEq', c(1)));
const doomCooldowns = (trinket, nukes, { berserking = true, tapMana = 2600 } = {}) => ({
  name: 'Cooldowns',
  actions: [
    item(trinket, doomEnding('15s')),
    item(OFFENSIVE_POTION, doomEnding('30s')),
    cast(EUREKA, doomEnding('8s')),
    cast(BLOOD_FURY, doomEnding('15s')),
    ...(berserking ? [cast(BERSERKING, doomEnding('15s'))] : []),
    ...nukes,
    cast(LIFE_TAP, and(or(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c('22s')), not(dotUp(DOOM))), cmp({ currentMana: {} }, 'OpLt', c(tapMana)), cmp(LEFT, 'OpGt', c('60s')))),
  ],
});
// The Demonology builds: the Talisman, and a Searing Pain or Shadow Bolt as Doom ends.
const demoCooldowns = (nuke, nukeAt) => doomCooldowns(EPHEMERAL_POWER, [cast(nuke, doomLast(nukeAt))]);
// Amplify Curse and Bane of Agony while no Doom is up and Doom is not ready or no whole Doom fits; then the damage over
// time whose whole duration fits in what is left (wowsims' "Single Target DoT Logic").
const fits = (s) => cmp(LEFT, 'OpGt', c(s));
const baneOfAgony = () => [
  cast(AMPLIFY, and(not(dotUp(DOOM)), or(not({ spellIsReady: S(DOOM) }), cmp(LEFT, 'OpLt', c('60s'))), not(dotUp(AGONY)), fits('24s'))),
  cast(AGONY, and(not(dotUp(DOOM)), not(dotUp(AGONY)), fits('24s'))),
];

// The cooldowns run while Doom is up, or once no whole Doom fits in what is left.
const DOOM_WINDOW = or(and(cmp({ math: { op: 'OpDiv', lhs: { math: { op: 'OpSub', lhs: LEFT, rhs: c('5s') } }, rhs: c('60s') } }, 'OpLt', c(1)), not(dotUp(DOOM))), dotUp(DOOM));

// Affliction (Wrack), wowsims 202831a (one target): Shadow Bolt before the pull; the curse, no Bane of Doom (wowsims
// casts it only on more than one target), Amplify Curse and Bane of Agony once Agony is gone (while 12 s are left),
// Corruption (9 s), Siphon Life while it will tick out and neither Shadow Vulnerability nor Blood Fury is up, Shadow
// Bolt on Shadow Trance, the cooldowns, Death Coil at the end, Life Tap below 30% with over a minute left, Wrack, Life
// Tap. The cooldowns (no Berserking) wait for Corruption, Agony and Siphon Life all ticking on the target ("Wrack Dots
// Up"), and for an amplified Agony (Amplify Curse used within Agony's 24 s + 1.5 s, "Amp Agony Up") unless waiting for
// the next one (Amplify's cooldown left + 24 s, "Amp Agony Wait") would cost a use in the fight ("Waiting Costs ...":
// under that left, or it would push the uses that fit in what is left, up to 3 cooldowns, below the count); Life Tap
// below 1800 mana there with over a minute left. (wowsims' Shadow Bolt on Revelation needs the Revelation weapon
// enchant, which this set lacks; its Siphon Life also waits out a Wrack channel, which the bots never cut.) Not yet
// here: wowsims cuts Wrack after two ticks when Corruption, or Agony and Doom, fell off, or when Blood Fury is ready
// (its interruptIf); the bots channel Wrack to its end.
const WRACK_CHANNEL = (condition) => ({ action: { channelSpell: { ...S(WRACK), interruptIf: {} }, ...(condition ? { condition } : {}) } });
const AGONY_DURATION = '24s'; // dotBaseDuration of Bane of Agony 11713: 12 ticks of 2 s
const ref = (name) => ({ variableRef: { name } });
const math = (op, lhs, rhs) => ({ math: { op, lhs, rhs } });
const waitingCosts = (name, spellId) => ({
  name: `Waiting Costs ${name}`,
  value: or(cmp(LEFT, 'OpLt', ref('Amp Agony Wait')), ...[1, 2, 3].map((n) => {
    const cds = n === 1 ? { spellFullCooldown: { spellId } } : math('OpMul', c(n), { spellFullCooldown: { spellId } });
    return and(cmp(LEFT, 'OpGe', cds), cmp(math('OpSub', LEFT, ref('Amp Agony Wait')), 'OpLt', cds));
  })),
});
// A cooldown on one target: Doom's end, as the other builds (always true with no Doom), the damage over time all up and
// an amplified Agony, or waiting for one costs a use.
const affCooldown = (s, name) => and(doomEnding(s), ref('Wrack Dots Up'), or(ref('Amp Agony Up'), ref(`Waiting Costs ${name}`)));
export const AFFLICTION_APL = {
  valueVariables: [
    { name: 'Wrack Dots Up', value: and(dotUp(CORRUPTION), dotUp(AGONY), or(dotUp(SIPHON_LIFE), not({ spellIsKnown: S(SIPHON_LIFE) }))) },
    { name: 'Amp Agony Up', value: and(dotUp(AGONY), not({ spellIsReady: S(AMPLIFY) }), cmp(math('OpSub', { spellFullCooldown: S(AMPLIFY) }, { spellTimeToReady: S(AMPLIFY) }), 'OpLe', math('OpAdd', c(AGONY_DURATION), c('1.5s')))) },
    { name: 'Amp Agony Wait', value: math('OpAdd', { spellTimeToReady: S(AMPLIFY) }, c(AGONY_DURATION)) },
    waitingCosts('Frozen Heart', { itemId: FROZEN_HEART }),
    waitingCosts('Potion', { itemId: OFFENSIVE_POTION }),
    waitingCosts('Eureka', { spellId: EUREKA }),
    waitingCosts('Blood Fury', { spellId: BLOOD_FURY }),
  ],
  prepullActions: [precast(SHADOW_BOLT)],
  groups: [{
    name: 'Cooldowns',
    actions: [
      item(FROZEN_HEART, affCooldown('15s', 'Frozen Heart')),
      item(OFFENSIVE_POTION, affCooldown('30s', 'Potion')),
      cast(EUREKA, affCooldown('8s', 'Eureka')),
      cast(BLOOD_FURY, affCooldown('15s', 'Blood Fury')),
      cast(LIFE_TAP, and(or(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c('22s')), not(dotUp(DOOM))), cmp({ currentMana: {} }, 'OpLt', c(1800)), cmp(LEFT, 'OpGt', c('60s')))),
    ],
  }],
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(AMPLIFY, and(not(dotUp(AGONY)), fits('12s'))),
    cast(AGONY, and(not(dotUp(AGONY)), fits('12s'))),
    cast(CORRUPTION, and(not(dotUp(CORRUPTION)), fits('9s'))),
    cast(SIPHON_LIFE, and(not(dotUp(SIPHON_LIFE)), fits('30s'), not(onTarget(17794)), not({ auraIsActive: { auraId: { spellId: BLOOD_FURY } } }))),
    cast(SHADOW_BOLT, { auraIsActive: { auraId: { spellId: 17941 } } }),
    group('Cooldowns'),
    cast(DEATH_COIL, cmp({ math: { op: 'OpAdd', lhs: { spellCastTime: S(SHADOW_BOLT) }, rhs: { spellTravelTime: S(SHADOW_BOLT) } } }, 'OpGt', LEFT)),
    cast(LIFE_TAP, MANA_LOW),
    WRACK_CHANNEL(),
    cast(LIFE_TAP),
  ],
};

// Demonology (Fire Brand), Sesam's, wowsims 60b9eec: Soul Fire and Immolate before the pull; the curse, Bane of Doom,
// Searing Pain to keep the Imp's brand, the damage over time while it will tick out, the cooldowns (above) around Doom
// with Searing Pain in its last 15 s, Soul Fire on Decimation while it lands in time, Death Coil at the end, Life Tap
// below 35% mana, Searing Pain, Life Tap.
export const DEMONOLOGY_APL = {
  prepullActions: [precast(SOUL_FIRE), at(IMMOLATE, '-0.1s')],
  groups: [demoCooldowns(SEARING_PAIN, '15s')],
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(DOOM, cmp(LEFT, 'OpGt', c('60s'))),
    cast(SEARING_PAIN, and(not({ spellIsCasting: S(SEARING_PAIN) }), or(not(onTarget(1293696)), cmp({ auraRemainingTime: { auraId: { spellId: 1293696 }, sourceUnit: { type: 'CurrentTarget' } } }, 'OpLt', c('2.5s'))))),
    cast(AGONY, and(not(dotUp(DOOM)), not(dotUp(AGONY)), cmp(LEFT, 'OpGt', c('24s')))),
    cast(IMMOLATE, and(not(dotUp(IMMOLATE)), cmp(LEFT, 'OpGt', c('15s')))),
    cast(CORRUPTION, and(not(dotUp(CORRUPTION)), cmp(LEFT, 'OpGt', c('18s')))),
    group('Cooldowns', DOOM_WINDOW),
    cast(SOUL_FIRE, and({ auraIsActive: { auraId: { spellId: 440873 } } }, cmp(LEFT, 'OpGt', { spellCastTime: S(SOUL_FIRE) }), not({ spellIsCasting: S(SOUL_FIRE) }))),
    cast(DEATH_COIL, cmp({ spellCastTime: S(SEARING_PAIN) }, 'OpGt', LEFT)),
    cast(LIFE_TAP, manaLow('35%')),
    cast(SEARING_PAIN),
    cast(LIFE_TAP),
  ],
};

// Destruction, wowsims 495d6d7: Soul Fire and Immolate before the pull; the curse, Bane of Doom while a whole one fits,
// else Amplify Curse and Bane of Agony, Immolate and Corruption while they will tick out, Conflagrate on Immolate or to
// bring back Shadow and Flame's Shadow buff, Shadowburn, the cooldowns (above) around Doom with Immolate and Incinerate in
// its last 15 s, Searing Pain and Death Coil at the end, Life Tap below 35% mana, Immolate before it falls off, Incinerate,
// Life Tap.
export const DESTRUCTION_APL = {
  prepullActions: [precast(SOUL_FIRE), at(IMMOLATE, '-0.1s')],
  groups: [doomCooldowns(FROZEN_HEART, [
    cast(IMMOLATE, and(doomLast('15s'), cmp({ dotRemainingTime: S(IMMOLATE) }, 'OpLt', { spellCastTime: S(INCINERATE) }))),
    cast(INCINERATE, doomLast('15s')),
  ])],
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(DOOM, fits('60s')),
    ...baneOfAgony(),
    cast(IMMOLATE, and(not(dotUp(IMMOLATE)), fits('15s'))),
    cast(CORRUPTION, and(not(dotUp(CORRUPTION)), fits('18s'))),
    cast(18932, or(dotUp(IMMOLATE), not({ auraIsActive: { auraId: { spellId: 1293816 } } }))),
    cast(18871),
    group('Cooldowns', DOOM_WINDOW),
    cast(SEARING_PAIN, cmp({ math: { op: 'OpAdd', lhs: { spellCastTime: S(INCINERATE) }, rhs: { spellTravelTime: S(INCINERATE) } } }, 'OpGt', LEFT)),
    cast(DEATH_COIL, cmp({ spellCastTime: S(SEARING_PAIN) }, 'OpGt', LEFT)),
    cast(LIFE_TAP, and(cmp({ currentManaPercent: {} }, 'OpLt', c('35%')), cmp(LEFT, 'OpGt', c('60s')))),
    cast(IMMOLATE, cmp({ dotRemainingTime: S(IMMOLATE) }, 'OpLt', { spellCastTime: S(INCINERATE) })),
    cast(INCINERATE),
    cast(LIFE_TAP),
  ],
};

// SM/Ruin (ui/specs/warlock/dps/builds/sm_ruin): the curse, Bane of Doom while a whole minute is left, Shadow Bolt on
// Shadow Trance, else Amplify Curse and Bane of Agony, Corruption, Siphon Life and Immolate kept up, Shadow Bolt, Life
// Tap. The sim weighs each damage over time against Shadow Bolt's damage per cast time; on one target with this gear
// they all win, so they are cast whenever they are down and will tick out.
export const SM_RUIN_APL = {
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(DOOM, cmp(LEFT, 'OpGe', c('60s'))),
    cast(SHADOW_BOLT, { auraIsActive: { auraId: { spellId: 17941 } } }),
    cast(AMPLIFY, and(not(dotUp(DOOM)), not(dotUp(AGONY)), not({ auraIsActive: { auraId: { spellId: AMPLIFY } } }))),
    cast(AGONY, and(not(dotUp(DOOM)), not(dotUp(AGONY)), cmp(LEFT, 'OpGt', c('12s')))),
    cast(CORRUPTION, and(not(dotUp(CORRUPTION)), cmp(LEFT, 'OpGt', c('9s')))),
    cast(SIPHON_LIFE, and(not(dotUp(SIPHON_LIFE)), cmp(LEFT, 'OpGt', c('15s')))),
    cast(IMMOLATE, and(not(dotUp(IMMOLATE)), cmp(LEFT, 'OpGt', c('7.5s')))),
    cast(LIFE_TAP, MANA_LOW),
    cast(SHADOW_BOLT),
    cast(LIFE_TAP),
  ],
};

// Demonology (Shadow Brand) (ui/specs/warlock/dps/builds/demo_shadow_brand), Sesam's, one target: Shadow Bolt and
// Corruption before the pull; the curse, Bane of Doom, Searing Pain to keep the brand, Bane of Agony, Corruption and
// Immolate while they tick out, the cooldowns (above) around Doom, Searing Pain and Death Coil at the end, Shadow Bolt,
// Life Tap. (Its Shadow Bolt on Revelation is left out: the trainer has no Revelation.)
export const DEMO_SHADOW_BRAND_APL = {
  prepullActions: [precast(SHADOW_BOLT), at(CORRUPTION, '-0.1s')],
  groups: [demoCooldowns(SHADOW_BOLT, '15s')],
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(DOOM, cmp(LEFT, 'OpGt', c('60s'))),
    cast(SEARING_PAIN, and(not({ spellIsCasting: S(SEARING_PAIN) }), or(not(onTarget(1293696)), cmp({ auraRemainingTime: { auraId: { spellId: 1293696 }, sourceUnit: { type: 'CurrentTarget' } } }, 'OpLt', c('2.5s'))))),
    cast(AGONY, and(not(dotUp(DOOM)), not(dotUp(AGONY)), cmp(LEFT, 'OpGt', c('24s')))),
    cast(CORRUPTION, and(not(dotUp(CORRUPTION)), cmp(LEFT, 'OpGt', c('18s')))),
    cast(IMMOLATE, and(not(dotUp(IMMOLATE)), cmp(LEFT, 'OpGt', c('15s')))),
    group('Cooldowns', DOOM_WINDOW),
    cast(SEARING_PAIN, cmp({ spellCastTime: S(SHADOW_BOLT) }, 'OpGt', LEFT)),
    cast(DEATH_COIL, cmp({ spellCastTime: S(SEARING_PAIN) }, 'OpGt', LEFT)),
    cast(LIFE_TAP, MANA_LOW),
    cast(SHADOW_BOLT),
    cast(LIFE_TAP),
  ],
};
