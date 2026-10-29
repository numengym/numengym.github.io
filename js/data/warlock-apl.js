// The warlock's rotations, the single-target parts of the wowsims Forever builds (ui/specs/warlock/dps/builds:
// aff_wrack, demo_fire_brand, destro), with the assigned curse cast by name and without the pre-pull, the multi-target
// groups and the moving. The rotation helper and the sim both play them.
const S = (id) => ({ spellId: { spellId: id } });
const c = (v) => ({ const: { val: String(v) } });
const cmp = (lhs, op, rhs) => ({ cmp: { lhs, op, rhs } });
const and = (...vals) => ({ and: { vals } });
const not = (val) => ({ not: { val } });
const cast = (id, condition) => ({ action: { castSpell: S(id), ...(condition ? { condition } : {}) } });
const dotUp = (id) => ({ dotIsActive: S(id) });
const onTarget = (id) => ({ auraIsActive: { auraId: { spellId: id }, sourceUnit: { type: 'CurrentTarget' } } });
const LEFT = { remainingTime: {} };
const MANA_LOW = and(cmp({ currentManaPercent: {} }, 'OpLt', c('30%')), cmp(LEFT, 'OpGt', c('60s')));

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

// Affliction (Wrack): every affliction up, Shadow Bolt for Shadow Vulnerability and on Shadow Trance, Wrack while
// Corruption and Bane of Agony have 4 sec left, Shadow Bolt, Life Tap.
export const AFFLICTION_APL = {
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(AMPLIFY, and(not(dotUp(AGONY)), not({ auraIsActive: { auraId: { spellId: AMPLIFY } } }))),
    cast(AGONY, not(dotUp(AGONY))),
    cast(CORRUPTION, not(dotUp(CORRUPTION))),
    cast(SIPHON_LIFE, not(dotUp(SIPHON_LIFE))),
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(IMMOLATE, not(dotUp(IMMOLATE))),
    cast(SHADOW_BOLT, not(onTarget(17794))),
    cast(SHADOW_BOLT, { auraIsActive: { auraId: { spellId: 17941 } } }),
    { action: { channelSpell: S(WRACK), condition: cmp({ min: { vals: [{ dotRemainingTime: S(CORRUPTION) }, { dotRemainingTime: S(AGONY) }] } }, 'OpGe', c('4s')) } },
    cast(SHADOW_BOLT),
    cast(LIFE_TAP),
  ],
};

// Demonology (Fire Brand): the curse, Bane of Doom, Searing Pain to keep the Imp's brand, the damage over time, Soul
// Fire on Decimation, Death Coil at the end, Searing Pain, Life Tap.
export const DEMONOLOGY_APL = {
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(ELEMENTS, not(onTarget(ELEMENTS))),
    cast(DOOM, cmp(LEFT, 'OpGt', c('60s'))),
    cast(17923, and(not({ spellIsCasting: S(17923) }), { or: { vals: [not(onTarget(1293696)), cmp({ auraRemainingTime: { auraId: { spellId: 1293696 }, sourceUnit: { type: 'CurrentTarget' } } }, 'OpLt', c('2.5s'))] } })),
    cast(AGONY, and(not(dotUp(DOOM)), not(dotUp(AGONY)), cmp(LEFT, 'OpGt', c('24s')))),
    cast(IMMOLATE, and(not(dotUp(IMMOLATE)), cmp(LEFT, 'OpGt', c('15s')))),
    cast(CORRUPTION, and(not(dotUp(CORRUPTION)), cmp(LEFT, 'OpGt', c('18s')))),
    cast(17924, { auraIsActive: { auraId: { spellId: 440873 } } }),
    cast(17926, cmp({ spellCastTime: S(17923) }, 'OpGt', LEFT)),
    cast(LIFE_TAP, MANA_LOW),
    cast(17923),
    cast(LIFE_TAP),
  ],
};

// Destruction: the curse, Bane of Doom while a whole minute is left, else Amplify Curse and Bane of Agony, Immolate and
// Corruption kept up, Conflagrate on Immolate, Shadowburn, Incinerate, Life Tap.
export const DESTRUCTION_APL = {
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
