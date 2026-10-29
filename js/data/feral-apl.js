// The Feral druid's rotations, simplified from the wowsims Forever adaptive APLs (ui/specs/druid/feralcat/apls and
// feralbear/apls): no Prowl opener, Faerie Fire, Dash, item swaps or defensive cooldowns. The rotation helper and the
// sim both play them.
const S = (id) => ({ spellId: { spellId: id } });
const c = (v) => ({ const: { val: String(v) } });
const cmp = (lhs, op, rhs) => ({ cmp: { lhs, op, rhs } });
const and = (...vals) => ({ and: { vals } });
const not = (val) => ({ not: { val } });
const cast = (id, condition) => ({ action: { castSpell: S(id), ...(condition ? { condition } : {}) } });

const CP = { currentComboPoints: {} };
const LEFT = { remainingTime: {} };

// Cat: Clearcasting on Shred, Rip at 5 combo points, Ferocious Bite at 5 while Rip has time, Shifting Power when energy
// runs low, Rake kept up, Shred; Berserk and the consumables as the sim's major cooldowns.
export const CAT_APL = {
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(22829, and(cmp(LEFT, 'OpLe', c('1s')), cmp(CP, 'OpGe', c(2)))),
    cast(9830, { auraIsActive: { auraId: { spellId: 16870 } } }),
    cast(9896, and(cmp(CP, 'OpGe', c(5)), not({ dotIsActive: S(9896) }), cmp(LEFT, 'OpGt', c('6s')))),
    cast(22829, and(cmp(CP, 'OpGe', c(5)), cmp({ dotRemainingTime: S(9896) }, 'OpGe', c('4s')))),
    cast(1322605, cmp({ currentEnergy: {} }, 'OpLe', c(57))),
    cast(9904, and(not({ dotIsActive: S(9904) }), cmp(LEFT, 'OpGt', c('6s')))),
    cast(9830, cmp(CP, 'OpLt', c(5))),
    cast(29166, and(cmp({ currentMana: {} }, 'OpLt', c(700)), cmp(LEFT, 'OpGt', c('20s')))),
  ],
};

const LACERATE_STACKS = { auraNumStacks: { auraId: { spellId: 1235827 }, sourceUnit: { type: 'CurrentTarget' } } };

// Bear: Enrage when rage is short, five Lacerates kept up, Primal Bite on cooldown, Berserk once Lacerate has five
// stacks, Lacerate as the filler and Maul on the swings with rage to spare.
export const BEAR_APL = {
  priorityList: [
    { action: { autocastOtherCooldowns: {} } },
    cast(5229, cmp({ currentRage: {} }, 'OpLt', c(15))),
    cast(1235827, and(cmp(LACERATE_STACKS, 'OpGe', c(5)), cmp({ dotRemainingTime: S(1235827) }, 'OpLe', c('3s')))),
    cast(1235827, cmp(LACERATE_STACKS, 'OpLt', c(5))),
    cast(1238073),
    cast(417141, cmp(LACERATE_STACKS, 'OpGe', c(5))),
    cast(1235827),
    cast(9881, cmp({ currentRage: {} }, 'OpGe', c(35))),
  ],
};
