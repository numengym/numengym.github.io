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
const MANA_LOW = and(cmp({ currentManaPercent: {} }, 'OpLt', c('30%')), cmp(LEFT, 'OpGt', c('60s')));
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
// last 30 s, Life Tap below 2600 mana in its last 22 s.
const doomEnding = (s) => or(and(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c(s)), dotUp(DOOM)), not(dotUp(DOOM)));
const doomLast = (s) => and(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c(s)), dotUp(DOOM), cmp({ numberTargets: {} }, 'OpEq', c(1)));
const doomCooldowns = (trinket, nukes) => ({
  name: 'Cooldowns',
  actions: [
    item(trinket, doomEnding('15s')),
    item(OFFENSIVE_POTION, doomEnding('30s')),
    cast(EUREKA, doomEnding('8s')),
    cast(BLOOD_FURY, doomEnding('15s')),
    cast(BERSERKING, doomEnding('15s')),
    ...nukes,
    cast(LIFE_TAP, and(or(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c('22s')), not(dotUp(DOOM))), cmp({ currentMana: {} }, 'OpLt', c(2600)), cmp(LEFT, 'OpGt', c('60s')))),
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

// Affliction (Wrack), wowsims a6a598a/b12d5ff: Shadow Bolt before the pull; the curse, Bane of Doom while a whole one fits,
// else Amplify Curse and Bane of Agony, Corruption and Siphon Life while they will tick out, Shadow Bolt on Shadow Trance,
// the cooldowns (above) around Doom with Wrack in its last 15 s while Shadow Vulnerability is down, Death Coil at the
// end, Wrack, Life Tap. (wowsims' Shadow Bolt on Revelation needs the Revelation weapon enchant, which this set lacks.)
const WRACK_CHANNEL = (condition) => ({ action: { channelSpell: { ...S(WRACK), interruptIf: {} }, ...(condition ? { condition } : {}) } });
export const AFFLICTION_APL = {
  prepullActions: [precast(SHADOW_BOLT)],
  groups: [doomCooldowns(FROZEN_HEART, [WRACK_CHANNEL(and(doomLast('15s'), not(onTarget(17794))))])],
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(DOOM, fits('60s')),
    ...baneOfAgony(),
    cast(CORRUPTION, and(not(dotUp(CORRUPTION)), fits('18s'))),
    cast(SIPHON_LIFE, and(not(dotUp(SIPHON_LIFE)), fits('30s'))),
    cast(SHADOW_BOLT, { auraIsActive: { auraId: { spellId: 17941 } } }),
    group('Cooldowns', DOOM_WINDOW),
    cast(DEATH_COIL, cmp({ math: { op: 'OpAdd', lhs: { spellCastTime: S(SHADOW_BOLT) }, rhs: { spellTravelTime: S(SHADOW_BOLT) } } }, 'OpGt', LEFT)),
    cast(LIFE_TAP, MANA_LOW),
    WRACK_CHANNEL(),
    cast(LIFE_TAP),
  ],
};

// Demonology (Fire Brand), Sesam's: Soul Fire and Immolate before the pull; the curse, Bane of Doom, Searing Pain to
// keep the Imp's brand, the damage over time while it will tick out, the cooldowns (above) around Doom, Soul Fire on
// Decimation while it lands in time, Death Coil at the end, Searing Pain, Life Tap.
export const DEMONOLOGY_APL = {
  prepullActions: [precast(SOUL_FIRE), at(IMMOLATE, '-0.1s')],
  groups: [demoCooldowns(SEARING_PAIN, '22s')],
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
    cast(LIFE_TAP, MANA_LOW),
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
