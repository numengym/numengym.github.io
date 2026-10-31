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

// The Demonology builds' cooldowns, saved for Bane of Doom's last seconds (its one big tick) or used while no Doom is
// up: the Talisman, the racials and a Searing Pain or Shadow Bolt as it ends, the potion in its last 30 s, Life Tap
// below 2600 mana in its last 22 s.
const doomEnding = (s) => or(and(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c(s)), dotUp(DOOM)), not(dotUp(DOOM)));
const demoCooldowns = (nuke, nukeAt) => ({
  name: 'Cooldowns',
  actions: [
    item(EPHEMERAL_POWER, doomEnding('15s')),
    item(OFFENSIVE_POTION, doomEnding('30s')),
    cast(EUREKA, doomEnding('8s')),
    cast(BLOOD_FURY, doomEnding('15s')),
    cast(BERSERKING, doomEnding('15s')),
    cast(nuke, and(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c(nukeAt)), dotUp(DOOM), cmp({ numberTargets: {} }, 'OpEq', c(1)))),
    cast(LIFE_TAP, and(or(cmp({ dotRemainingTime: S(DOOM) }, 'OpLt', c('22s')), not(dotUp(DOOM))), cmp({ currentMana: {} }, 'OpLt', c(2600)), cmp(LEFT, 'OpGt', c('60s')))),
  ],
});
// The cooldowns run while Doom is up, or once no whole Doom fits in what is left.
const DOOM_WINDOW = or(and(cmp({ math: { op: 'OpDiv', lhs: { math: { op: 'OpSub', lhs: LEFT, rhs: c('5s') } }, rhs: c('60s') } }, 'OpLt', c(1)), not(dotUp(DOOM))), dotUp(DOOM));

// Affliction (Wrack): Blood Fury and the potion at once, every affliction up, Berserking once they all are, Shadow Bolt
// for Shadow Vulnerability and on Shadow Trance, Wrack while Corruption and Bane of Agony have 4 sec left, Shadow Bolt,
// Life Tap.
export const AFFLICTION_APL = {
  groups: [{ name: 'Boosts', actions: [cast(BLOOD_FURY), item(OFFENSIVE_POTION)] }],
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    group('Boosts'),
    cast(AMPLIFY, and(not(dotUp(AGONY)), not({ auraIsActive: { auraId: { spellId: AMPLIFY } } }))),
    cast(AGONY, not(dotUp(AGONY))),
    cast(CORRUPTION, not(dotUp(CORRUPTION))),
    cast(SIPHON_LIFE, not(dotUp(SIPHON_LIFE))),
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(IMMOLATE, not(dotUp(IMMOLATE))),
    cast(BERSERKING, and(dotUp(AGONY), dotUp(CORRUPTION), dotUp(SIPHON_LIFE), dotUp(IMMOLATE), onTarget(ELEMENTS))),
    cast(SHADOW_BOLT, not(onTarget(17794))),
    cast(SHADOW_BOLT, { auraIsActive: { auraId: { spellId: 17941 } } }),
    { action: { channelSpell: S(WRACK), condition: cmp({ min: { vals: [{ dotRemainingTime: S(CORRUPTION) }, { dotRemainingTime: S(AGONY) }] } }, 'OpGe', c('4s')) } },
    cast(SHADOW_BOLT),
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

// Destruction: Incinerate and Immolate before the pull; the curse, Bane of Doom while a whole minute is left, else
// Amplify Curse and Bane of Agony, Immolate and Corruption kept up, Conflagrate on Immolate, Shadowburn, Incinerate,
// Life Tap.
export const DESTRUCTION_APL = {
  prepullActions: [precast(INCINERATE), at(IMMOLATE, '-0.5s')],
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(DOOM, cmp(LEFT, 'OpGt', c('60s'))),
    cast(AMPLIFY, and(not(dotUp(DOOM)), not(dotUp(AGONY)))),
    cast(AGONY, and(not(dotUp(DOOM)), not(dotUp(AGONY)))),
    cast(IMMOLATE, cmp({ dotRemainingTime: S(IMMOLATE) }, 'OpLe', { spellCastTime: S(IMMOLATE) })),
    cast(CORRUPTION, cmp({ dotRemainingTime: S(CORRUPTION) }, 'OpLe', { spellCastTime: S(CORRUPTION) })),
    cast(18932, dotUp(IMMOLATE)),
    cast(18871),
    cast(LIFE_TAP, MANA_LOW),
    cast(1293813),
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
