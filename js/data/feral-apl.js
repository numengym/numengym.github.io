// The Feral druid's rotations, from the wowsims Forever adaptive APLs (ui/specs/druid/feralcat/apls and
// feralbear/apls, as simplified in wowsims 513fc9b, PR #1087 "Simplify single-target Cat and Bear APLs"): no pre-pull,
// Prowl opener, Faerie Fire, Feral Charge or running in, item swaps (the MCP), Thistle Tea, Demonic Rune, Healthstone or
// the hidden optional on-use items, and no Cat Form checks (the cat stays in Cat Form). The rotation helper and the sim
// both play them.
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

// wowsims' value variables (the adaptive cat's tuning).
const SHREDDING_ATTACKS = { talentIsKnown: { talentId: { spellId: 16966 } } };
const BLOOD_FRENZY = { talentIsKnown: { talentId: { spellId: 16958 } } };
const ONE_BLOOD_FRENZY = cmp(talentRank(16958), 'OpEq', c(1));
const TWO_BLOOD_FRENZY = cmp(talentRank(16958), 'OpGe', c(2));
const SHIFTING_POWER = { talentIsKnown: { talentId: { spellId: 1322605 } } };
const PREDATORY_DISCIPLINE = { talentIsKnown: { talentId: { spellId: 1328613 } } };
// Idol of Ferocity's equip aura (27851): its tunings apply only while it is worn.
const IDOL_OF_FEROCITY = and({ auraIsKnown: { auraId: { spellId: 27851 } } }, { auraIsActive: { auraId: { spellId: 27851 } } });
const USE_FEROCITY_HYBRID = and(not(BLOOD_FRENZY), not(SHREDDING_ATTACKS), PREDATORY_DISCIPLINE, SHIFTING_POWER, IDOL_OF_FEROCITY);
const USE_FEROCITY_TWO_BLOOD_FRENZY = and(and(TWO_BLOOD_FRENZY, SHIFTING_POWER), not(SHREDDING_ATTACKS), PREDATORY_DISCIPLINE, SHIFTING_POWER, IDOL_OF_FEROCITY);
// "Use the short Claw Bite window": Claw builds (no Shredding Attacks) in a fight of 60 seconds or less.
const SHORT_CLAW_BITE_WINDOW = and(not(SHREDDING_ATTACKS), not(USE_FEROCITY_HYBRID), cmp(math({ currentTime: {} }, 'OpAdd', LEFT), 'OpLe', c('60s')));
const RIP_LEFT = (s) => cmp({ dotRemainingTime: S(9896) }, 'OpGe', c(`${s}s`));

// "One more builder funds next-global Rip": Shred (Claw without Shredding Attacks) leaves the energy for a Rip.
const ONE_MORE_BUILDER_FUNDS_RIP = and(
  cmp(LEFT, 'OpGe', c(`${RIP_MIN_LEFT + 1}s`)),
  or(
    and(SHREDDING_ATTACKS, { spellCanCast: S(9830) }, cmp(math(ENERGY, 'OpAdd', c(10)), 'OpGe', math(cost(9830), 'OpAdd', cost(9896)))),
    and(not(SHREDDING_ATTACKS), { spellCanCast: S(9850) }, cmp(math(ENERGY, 'OpAdd', c(10)), 'OpGe', math(cost(9850), 'OpAdd', cost(9896)))),
  ),
);
// "Rip due": at 4 combo points; with no or two Blood Frenzy points and Shifting Power at 5, unless one more builder
// would leave Rip unfunded.
const RIP_DUE = and(
  cmp(CP, 'OpGe', c(4)),
  or(not(or(not(BLOOD_FRENZY), and(TWO_BLOOD_FRENZY, SHIFTING_POWER))), cmp(CP, 'OpGe', c(5)), not(ONE_MORE_BUILDER_FUNDS_RIP)),
  { auraIsInactive: { ...onTarget(9896), includeReactionTime: true } },
  cmp(LEFT, 'OpGe', c(`${RIP_MIN_LEFT}s`)),
);
const RAKE_DUE = and({ auraIsInactive: { ...onTarget(9904), includeReactionTime: true } }, cmp(LEFT, 'OpGt', c('6s')));

// Ferocious Bite with Predatory Discipline. "Bite combo points and Rip window": 4 combo points with Blood Frenzy while
// Rip has 3 more seconds; 5 without it while Rip has 4 more (2 in a short Claw fight). "Bite energy is funded": 45
// energy with Clearcasting, else 75, or 60 at 5 combo points (or with two Blood Frenzy points and Claw builds).
const BITE_WINDOW = and(
  PREDATORY_DISCIPLINE,
  or(and(BLOOD_FRENZY, cmp(CP, 'OpGe', c(4))), and(not(BLOOD_FRENZY), cmp(CP, 'OpGe', c(5)))),
  or(
    and(BLOOD_FRENZY, RIP_LEFT(3)),
    and(not(BLOOD_FRENZY), or(and(SHORT_CLAW_BITE_WINDOW, RIP_LEFT(2)), and(not(SHORT_CLAW_BITE_WINDOW), RIP_LEFT(4)))),
  ),
);
const BITE_FUNDED = or(
  and(CLEARCASTING, cmp(ENERGY, 'OpGe', c(45))),
  and(not(CLEARCASTING), or(
    cmp(ENERGY, 'OpGe', c(75)),
    and(or(cmp(CP, 'OpGe', c(5)), and(TWO_BLOOD_FRENZY, not(SHREDDING_ATTACKS))), cmp(ENERGY, 'OpGe', c(60))),
  )),
);
const POOL_FOR_BITE = and(BITE_WINDOW, not(BITE_FUNDED));
// "Paid builder fits the energy pool": not while pooling for Bite; with one Blood Frenzy point always, else from 60
// energy, or below 4 combo points (no Blood Frenzy, or two with Idol of Ferocity), below 3 with two points.
const PAID_BUILDER_FITS = and(not(POOL_FOR_BITE), or(
  ONE_BLOOD_FRENZY,
  cmp(ENERGY, 'OpGe', c(60)),
  and(or(not(BLOOD_FRENZY), and(TWO_BLOOD_FRENZY, USE_FEROCITY_TWO_BLOOD_FRENZY)), cmp(CP, 'OpLt', c(4))),
  and(TWO_BLOOD_FRENZY, not(USE_FEROCITY_TWO_BLOOD_FRENZY), cmp(CP, 'OpLt', c(3))),
));
// The mana potion once you miss 2250 mana, below 1400 mana with 15 seconds of fight left.
const MANA_POTION_NEEDED = and(
  { spellIsKnown: OTHER('OtherActionResourcePotion') },
  GCD_READY,
  cmp({ spellTimeToReady: OTHER('OtherActionResourcePotion') }, 'OpLe', c('0s')),
  cmp(math({ maxMana: {} }, 'OpSub', MANA), 'OpGe', c(2250)),
  cmp(MANA, 'OpLt', c(1400)),
  cmp(LEFT, 'OpGe', c('15s')),
);
const RACIAL = 1259799;

// Cat: Ferocious Bite in the last second, the cooldowns, the mana potion and the racial, the funded Bite (above),
// Shifting Power at 53 energy or less, the offensive potion, Bite at the fight's end, Clearcasting on Shred, Rip and
// Rake kept up, then Shred (Claw without Shredding Attacks) while it fits the pool, Claw when Shred cannot land, and
// Innervate when mana runs short. The trainer plays it on any target count, as wowsims does.
export const CAT_APL = {
  priorityList: [
    cast(22829, and(cmp(LEFT, 'OpLe', c('1s')), cmp(CP, 'OpGe', c(2)))),
    { action: { autocastOtherCooldowns: {} } },
    castOther('OtherActionResourcePotion', MANA_POTION_NEEDED),
    cast(RACIAL, known(RACIAL)),
    cast(22829, and(BITE_WINDOW, BITE_FUNDED)),
    cast(1322605, and(cmp(ENERGY, 'OpLe', c(53)), { spellCanCast: S(1322605) })),
    castOther('OtherActionOffensivePotion'),
    cast(22829, and(cmp(CP, 'OpGe', c(5)), or(PREDATORY_DISCIPLINE, cmp(ENERGY, 'OpLe', c(55))), cmp(LEFT, 'OpLt', c(`${RIP_MIN_LEFT}s`)))),
    cast(9830, CLEARCASTING),
    cast(9896, RIP_DUE),
    cast(9904, RAKE_DUE),
    cast(9830, and(SHREDDING_ATTACKS, cmp(ENERGY, 'OpGe', cost(9830)), PAID_BUILDER_FITS)),
    cast(9850, and(not(SHREDDING_ATTACKS), cmp(ENERGY, 'OpGe', cost(9850)), PAID_BUILDER_FITS)),
    cast(9850, and(not({ spellCanCast: S(9830) }), cmp(ENERGY, 'OpGe', cost(9830)), or(CLEARCASTING, not(POOL_FOR_BITE)), cmp(ENERGY, 'OpGe', cost(9850)))),
    cast(29166, and(
      { spellIsReady: S(29166) },
      not(and({ auraIsKnown: { auraId: { spellId: 1270842 } } }, { auraIsActive: { auraId: { spellId: 1270842 } } })),
      cmp(MANA, 'OpLt', c(1400)),
      GCD_READY,
      cmp(ENERGY, 'OpLe', c(30)),
      not(CLEARCASTING),
      cmp(LEFT, 'OpGe', c('15s')),
    )),
  ],
};

const PRIMAL_BITE = 1238070;
// "Maul leaves rage for a nearby Primal Bite": it leaves the rage for a Primal Bite due within 1.5 seconds.
const MAUL_LEAVES_PRIMAL_BITE = or(
  not(known(PRIMAL_BITE)),
  cmp({ spellTimeToReady: S(PRIMAL_BITE) }, 'OpGt', c('1.5s')),
  cmp(math(RAGE, 'OpSub', cost(9881)), 'OpGe', cost(PRIMAL_BITE)),
);
// "Attack-power reduction is covered": Demoralizing Roar up, or a raid's Vindication on the target.
const AP_REDUCTION_COVERED = or(
  not({ auraShouldRefresh: { auraId: { spellId: 9898 }, maxOverlap: c('0s') } }),
  and({ auraIsKnown: { sourceUnit: { type: 'CurrentTarget' }, auraId: { spellId: 440667, tag: -1 } } },
    { auraIsActive: { sourceUnit: { type: 'CurrentTarget' }, auraId: { spellId: 440667, tag: -1 } } }),
);

// Bear (one list for every target count since wowsims 513fc9b): Barkskin at 60% health or less, the racial, the
// Goblin Sapper Charge, the defensive potion when ready (with none, the offensive one below 20 rage), Frenzied
// Regeneration below 25% health, Enrage when rage is short of a Lacerate, Demoralizing Roar kept up, Primal Bite on
// cooldown, Lacerate as the filler, and Maul at 20 rage while it leaves enough for a coming Primal Bite.
export const BEAR_APL = {
  priorityList: [
    cast(22812, cmp({ currentHealthPercent: {} }, 'OpLe', c('60%'))),
    cast(RACIAL, known(RACIAL)),
    { action: { condition: { spellIsKnown: { spellId: { itemId: 10646 } } }, castSpell: { spellId: { itemId: 10646 } } } },
    castOther('OtherActionDefensivePotion', { spellIsKnown: OTHER('OtherActionDefensivePotion') }),
    castOther('OtherActionOffensivePotion', and(
      { spellIsKnown: OTHER('OtherActionOffensivePotion') },
      not({ spellIsKnown: OTHER('OtherActionDefensivePotion') }),
      cmp(RAGE, 'OpLt', c(20)),
    )),
    cast(22842, cmp({ currentHealthPercent: {} }, 'OpLt', c('25%'))),
    cast(5229, and(known(1235827), { gcdIsReady: {} }, cmp(RAGE, 'OpLt', cost(1235827)))),
    cast(9898, not(AP_REDUCTION_COVERED)),
    cast(PRIMAL_BITE, known(PRIMAL_BITE)),
    cast(1235827),
    cast(9881, and(cmp(RAGE, 'OpGe', c(20)), MAUL_LEAVES_PRIMAL_BITE)),
  ],
};
