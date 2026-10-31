// The Feral druid's rotations, simplified from the wowsims Forever adaptive APLs (ui/specs/druid/feralcat/apls and
// feralbear/apls): no pre-pull, Prowl opener, Faerie Fire, Feral Charge or running in, item swaps (the MCP), Elune's
// Light, Thistle Tea, Healthstone or defensive cooldowns (Barkskin, Frenzied Regeneration), and no Cat Form checks
// (the cat stays in Cat Form). The rotation helper and the sim both play them.
const S = (id) => ({ spellId: { spellId: id } });
const OTHER = (id) => ({ spellId: { otherId: id } });
const c = (v) => ({ const: { val: String(v) } });
const cmp = (lhs, op, rhs) => ({ cmp: { lhs, op, rhs } });
const math = (lhs, op, rhs) => ({ math: { op, lhs, rhs } });
const and = (...vals) => ({ and: { vals } });
const or = (...vals) => ({ or: { vals } });
const not = (val) => ({ not: { val } });
const cast = (id, condition) => ({ action: { castSpell: S(id), ...(condition ? { condition } : {}) } });
const castOther = (id, condition) => ({ action: { castSpell: OTHER(id), ...(condition ? { condition } : {}) } });
const cost = (id) => ({ spellCurrentCost: S(id) });
const known = (id) => ({ spellIsKnown: S(id) });
const onTarget = (id) => ({ sourceUnit: { type: 'CurrentTarget' }, auraId: { spellId: id } });
const talentRank = (id) => ({ talentRank: { talentId: { spellId: id } } });

const CP = { currentComboPoints: {} };
const LEFT = { remainingTime: {} };
const ENERGY = { currentEnergy: {} };
const MANA = { currentMana: {} };
const RAGE = { currentRage: {} };
const GCD_READY = cmp({ gcdTimeToReady: {} }, 'OpLe', c('0s'));
const CLEARCASTING = { auraIsActive: { auraId: { spellId: 16870 } } };
const RIP_MIN_LEFT = 8; // seconds of fight a Rip needs left

// Blood Frenzy and Shifting Power decide how many combo points Rip waits for and whether Bite spends spare ones.
const NO_BLOOD_FRENZY = cmp(talentRank(16958), 'OpEq', c(0));
const TWO_BLOOD_FRENZY_WITH_SHIFTING_POWER = and(cmp(talentRank(16958), 'OpGe', c(2)), { talentIsKnown: { talentId: { spellId: 1322605 } } });
// One more Shred still leaves the energy for a Rip on the next global.
const ONE_MORE_SHRED_FUNDS_RIP = and(
  { spellCanCast: S(9830) },
  cmp(LEFT, 'OpGe', c(`${RIP_MIN_LEFT + 1}s`)),
  cmp(math(ENERGY, 'OpAdd', c(10)), 'OpGe', math(cost(9830), 'OpAdd', cost(9896))),
);
// Rip at 4 combo points; with no or two Blood Frenzy points at 5, unless one more Shred would leave Rip unfunded.
const RIP_DUE = and(
  cmp(CP, 'OpGe', c(4)),
  or(not(or(NO_BLOOD_FRENZY, TWO_BLOOD_FRENZY_WITH_SHIFTING_POWER)), cmp(CP, 'OpGe', c(5)), not(ONE_MORE_SHRED_FUNDS_RIP)),
  { auraIsInactive: { ...onTarget(9896), includeReactionTime: true } },
  cmp(LEFT, 'OpGe', c(`${RIP_MIN_LEFT}s`)),
);
// Ferocious Bite with Predatory Discipline (its spare energy kept): at 4 combo points with Rip up 2 more seconds, once
// energy reaches 85 (60 with Clearcasting), at 5 combo points 70 (50); until then Shred and Claw wait, pooling for it.
const PREDATORY_DISCIPLINE = { talentIsKnown: { talentId: { spellId: 1328613 } } };
const BITE_WINDOW = and(PREDATORY_DISCIPLINE, cmp(CP, 'OpGe', c(4)), cmp({ dotRemainingTime: S(9896) }, 'OpGe', c('2s')));
const BITE_NOW = and(BITE_WINDOW, or(
  and(CLEARCASTING, cmp(ENERGY, 'OpGe', c(60))),
  and(not(CLEARCASTING), cmp(ENERGY, 'OpGe', c(85))),
  and(cmp(CP, 'OpGe', c(5)), or(and(not(CLEARCASTING), cmp(ENERGY, 'OpGe', c(70))), and(CLEARCASTING, cmp(ENERGY, 'OpGe', c(50))))),
));
const POOL_FOR_BITE = and(BITE_WINDOW, not(BITE_NOW));
const RAKE_DUE = and({ auraIsInactive: { ...onTarget(9904), includeReactionTime: true } }, cmp(LEFT, 'OpGt', c('6s')));
// The mana potion when it fits under your maximum mana with 5 seconds of regeneration on top; with Judgement of
// Wisdom on the target only when the rest of the fight (up to 2 minutes, at 20 mana a second) and a Shifting Power
// would not cover it.
const MANA_POTION_NEEDED = and(
  { spellIsKnown: OTHER('OtherActionResourcePotion') },
  GCD_READY,
  cmp({ spellTimeToReady: OTHER('OtherActionResourcePotion') }, 'OpLe', c('0s')),
  cmp(math({ maxMana: {} }, 'OpSub', MANA), 'OpGe', math(c(2250), 'OpAdd', math({ currentManaRegen: {} }, 'OpMul', c(5)))),
  or(
    not(and({ auraIsKnown: { ...onTarget(20355) } }, { auraIsActive: { ...onTarget(20355) } })),
    cmp(MANA, 'OpLt', math(math(math({ min: { vals: [LEFT, c('120s')] } }, 'OpDiv', c('1s')), 'OpMul', c(20)), 'OpAdd', cost(1322605))),
  ),
);

// Cat: Ferocious Bite in the last second, the cooldowns and the mana potion, the pooled Bite (above), Shifting Power
// when energy runs low, Bite at the fight's end, Clearcasting on Shred, Rip and Rake kept up, then Shred (or Claw)
// unless pooling for Bite, and Innervate when mana runs short.
export const CAT_APL = {
  priorityList: [
    cast(22829, and(cmp(LEFT, 'OpLe', c('1s')), cmp(CP, 'OpGe', c(2)))),
    { action: { autocastOtherCooldowns: {} } },
    castOther('OtherActionResourcePotion', MANA_POTION_NEEDED),
    cast(22829, BITE_NOW),
    cast(1322605, and(cmp(ENERGY, 'OpLe', c(57)), { spellCanCast: S(1322605) })),
    castOther('OtherActionOffensivePotion'),
    cast(22829, and(cmp(CP, 'OpGe', c(5)), or(PREDATORY_DISCIPLINE, cmp(ENERGY, 'OpLe', c(55))), cmp(LEFT, 'OpLt', c(`${RIP_MIN_LEFT}s`)))),
    cast(9830, and(CLEARCASTING, not(POOL_FOR_BITE))),
    cast(9896, RIP_DUE),
    cast(9904, RAKE_DUE),
    cast(9830, and(cmp(ENERGY, 'OpGe', cost(9830)), not(POOL_FOR_BITE))),
    cast(9850, and(not({ spellCanCast: S(9830) }), cmp(ENERGY, 'OpGe', cost(9830)), cmp(ENERGY, 'OpGe', cost(9850)), not(POOL_FOR_BITE))),
    cast(29166, and(
      { spellIsReady: S(29166) },
      cmp(MANA, 'OpLt', c(1400)),
      cmp(MANA, 'OpLt', math(LEFT, 'OpMul', c(50))),
      GCD_READY,
      cmp(ENERGY, 'OpLe', c(30)),
      not(CLEARCASTING),
      cmp(LEFT, 'OpGe', c('15s')),
    )),
  ],
};

const LACERATE_STACKS = { auraNumStacks: { auraId: { spellId: 1235827 }, sourceUnit: { type: 'CurrentTarget' } } };
const PRIMAL_BITE = 1238070;
const PRIMAL_BITE_READY = and(known(PRIMAL_BITE), { spellIsReady: S(PRIMAL_BITE) });
// Enrage when the rage is short of the next attack: Primal Bite when it is ready, Lacerate otherwise.
const ENRAGE_RESCUES = and(
  known(5229),
  { gcdIsReady: {} },
  or(
    and(PRIMAL_BITE_READY, cmp(RAGE, 'OpLt', cost(PRIMAL_BITE))),
    and(not(PRIMAL_BITE_READY), cmp(RAGE, 'OpLt', cost(1235827))),
  ),
);
const FIVE_LACERATES_NEAR_EXPIRY = and(
  { dotIsActive: S(1235827) },
  cmp(LACERATE_STACKS, 'OpGe', c(5)),
  cmp({ dotRemainingTime: S(1235827) }, 'OpLe', c('3s')),
);
// Maul leaves the rage for a Primal Bite due within 1.5 seconds.
const MAUL_LEAVES_PRIMAL_BITE = or(
  not(known(PRIMAL_BITE)),
  cmp({ spellTimeToReady: S(PRIMAL_BITE) }, 'OpGt', c('1.5s')),
  cmp(math(RAGE, 'OpSub', cost(9881)), 'OpGe', cost(PRIMAL_BITE)),
);

// Bear: the defensive potion on cooldown, else the offensive potion when rage is short, Enrage when rage is short of
// the next attack, five Lacerates refreshed before they run out, Demoralizing Roar kept up, Primal Bite on cooldown,
// Swipe on two targets or more while they bleed, Lacerate as the filler and Maul at 20 rage while it leaves enough for
// a coming Primal Bite. wowsims also counts a raid's Vindication as covering Demoralizing Roar; the trainer has none.
export const BEAR_APL = {
  priorityList: [
    castOther('OtherActionDefensivePotion', { spellIsKnown: OTHER('OtherActionDefensivePotion') }),
    castOther('OtherActionOffensivePotion', and(
      { spellIsKnown: OTHER('OtherActionOffensivePotion') },
      not({ spellIsKnown: OTHER('OtherActionDefensivePotion') }),
      cmp(RAGE, 'OpLt', c(20)),
    )),
    { action: { autocastOtherCooldowns: {} } },
    cast(5229, ENRAGE_RESCUES),
    cast(1235827, FIVE_LACERATES_NEAR_EXPIRY),
    cast(9898, { auraShouldRefresh: { auraId: { spellId: 9898 }, maxOverlap: c('0s') } }),
    cast(PRIMAL_BITE, known(PRIMAL_BITE)),
    cast(9908, and(cmp({ numberTargets: {} }, 'OpGe', c(2)), { druidBleedIsActive: {} })),
    cast(1235827),
    cast(9881, and(cmp(RAGE, 'OpGe', c(20)), MAUL_LEAVES_PRIMAL_BITE)),
  ],
};
