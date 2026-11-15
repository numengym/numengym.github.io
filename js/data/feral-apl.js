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

// The adaptive cat's single-target group (wowsims 944f2ac, PR #972 "Update Feral rotations, presets and idol
// effects") tunes its pools by talent path: Shredding Attacks or not (without it Claw is the paid builder, "Use Claw
// for paid builders") and 0, 1 or 2 points of Blood Frenzy. Its Idol of the Dream and Idol of Ferocity tunings are
// left out (the presets wear the Howling Idol).
const CLAW_BUILDS = cmp(talentRank(16966), 'OpEq', c(0));
const SHRED_BUILDS = not(CLAW_BUILDS);
const BUILDER = (shred, claw) => or(and(SHRED_BUILDS, shred), and(CLAW_BUILDS, claw));
const NO_BLOOD_FRENZY = cmp(talentRank(16958), 'OpEq', c(0));
const ONE_BLOOD_FRENZY = cmp(talentRank(16958), 'OpEq', c(1));
const TWO_BLOOD_FRENZY = cmp(talentRank(16958), 'OpGe', c(2));
const TWO_BLOOD_FRENZY_WITH_SHIFTING_POWER = and(TWO_BLOOD_FRENZY, { talentIsKnown: { talentId: { spellId: 1322605 } } });
// One more builder (Shred, or Claw without Shredding Attacks) still leaves the energy for a Rip on the next global.
const ONE_MORE_BUILDER_FUNDS_RIP = BUILDER(...[9830, 9850].map((id) => and(
  { spellCanCast: S(id) },
  cmp(LEFT, 'OpGe', c(`${RIP_MIN_LEFT + 1}s`)),
  cmp(math(ENERGY, 'OpAdd', c(10)), 'OpGe', math(cost(id), 'OpAdd', cost(9896))),
)));
// Rip at 4 combo points; with no or two Blood Frenzy points at 5, unless one more builder would leave Rip unfunded.
const RIP_DUE = and(
  cmp(CP, 'OpGe', c(4)),
  or(not(or(NO_BLOOD_FRENZY, TWO_BLOOD_FRENZY_WITH_SHIFTING_POWER)), cmp(CP, 'OpGe', c(5)), not(ONE_MORE_BUILDER_FUNDS_RIP)),
  { auraIsInactive: { ...onTarget(9896), includeReactionTime: true } },
  cmp(LEFT, 'OpGe', c(`${RIP_MIN_LEFT}s`)),
);
// Ferocious Bite with Predatory Discipline (its spare energy kept): at 4 combo points while Rip has 3 more seconds,
// once energy reaches 75 (45 with Clearcasting), at 5 combo points 70 (40); until then the builders wait, pooling for
// it. Without Blood Frenzy, Shred needs Rip 4 seconds out and 100 (55) energy, 60 (40) at 5 points; Claw Rip 2
// seconds out (4 in a fight over a minute) and 90 energy, 70 (35) at 5; Claw with two Blood Frenzy points 65 (45),
// 60 (40) at 5.
const PREDATORY_DISCIPLINE = { talentIsKnown: { talentId: { spellId: 1328613 } } };
const RIP_LEFT = (s) => cmp({ dotRemainingTime: S(9896) }, 'OpGe', c(`${s}s`));
const BITE_ENERGY = (four, fourCc, five, fiveCc) => or(
  and(not(CLEARCASTING), cmp(ENERGY, 'OpGe', c(four))),
  and(CLEARCASTING, cmp(ENERGY, 'OpGe', c(fourCc))),
  and(cmp(CP, 'OpGe', c(5)), or(and(not(CLEARCASTING), cmp(ENERGY, 'OpGe', c(five))), and(CLEARCASTING, cmp(ENERGY, 'OpGe', c(fiveCc))))),
);
const SHRED_NO_BLOOD_FRENZY = and(NO_BLOOD_FRENZY, SHRED_BUILDS);
const CLAW_NO_BLOOD_FRENZY = and(NO_BLOOD_FRENZY, CLAW_BUILDS);
const CLAW_TWO_BLOOD_FRENZY = and(TWO_BLOOD_FRENZY, CLAW_BUILDS);
const BITE_PATHS = [
  { when: SHRED_NO_BLOOD_FRENZY, window: RIP_LEFT(4), energy: BITE_ENERGY(100, 55, 60, 40) },
  {
    when: CLAW_NO_BLOOD_FRENZY,
    window: and(RIP_LEFT(2), or(cmp(math({ currentTime: {} }, 'OpAdd', LEFT), 'OpLe', c('60s')), RIP_LEFT(4))),
    energy: or(cmp(ENERGY, 'OpGe', c(90)), and(cmp(CP, 'OpGe', c(5)), or(and(not(CLEARCASTING), cmp(ENERGY, 'OpGe', c(70))), and(CLEARCASTING, cmp(ENERGY, 'OpGe', c(35)))))),
  },
  { when: CLAW_TWO_BLOOD_FRENZY, window: RIP_LEFT(3), energy: BITE_ENERGY(65, 45, 60, 40) },
  { when: not(or(SHRED_NO_BLOOD_FRENZY, CLAW_NO_BLOOD_FRENZY, CLAW_TWO_BLOOD_FRENZY)), window: RIP_LEFT(3), energy: BITE_ENERGY(75, 45, 70, 40) },
];
const BITE_BASE = and(PREDATORY_DISCIPLINE, cmp(CP, 'OpGe', c(4)));
const BITE_NOW = and(BITE_BASE, or(...BITE_PATHS.map((p) => and(p.when, p.window, p.energy))));
const POOL_FOR_BITE = and(BITE_BASE, or(...BITE_PATHS.map((p) => and(p.when, p.window, not(p.energy)))));
// A paid builder (not Clearcasting's) also waits below 60 energy once you have 4 combo points without Blood Frenzy,
// 3 with two points; with one point it never does ("Paid builder fits the energy pool").
const PAID_BUILDER_FITS = and(not(POOL_FOR_BITE), or(
  ONE_BLOOD_FRENZY,
  cmp(ENERGY, 'OpGe', c(60)),
  and(NO_BLOOD_FRENZY, cmp(CP, 'OpLt', c(4))),
  and(TWO_BLOOD_FRENZY, cmp(CP, 'OpLt', c(3))),
));
// Shifting Power at or below 53 energy without Blood Frenzy, 55 with one point, 50 with two.
const SHIFTING_POWER_CEILING = or(
  and(NO_BLOOD_FRENZY, cmp(ENERGY, 'OpLe', c(53))),
  and(ONE_BLOOD_FRENZY, cmp(ENERGY, 'OpLe', c(55))),
  and(TWO_BLOOD_FRENZY, cmp(ENERGY, 'OpLe', c(50))),
);
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
// when energy runs low, Bite at the fight's end, Clearcasting on Shred, Rip and Rake kept up, then Shred (Claw without
// Shredding Attacks) while it fits the pool, Claw when Shred cannot land, and Innervate when mana runs short. wowsims'
// two- and three-target groups (target switching for Rake and Rip) are not in the trainer: it plays this on any count.
export const CAT_APL = {
  priorityList: [
    cast(22829, and(cmp(LEFT, 'OpLe', c('1s')), cmp(CP, 'OpGe', c(2)))),
    { action: { autocastOtherCooldowns: {} } },
    castOther('OtherActionResourcePotion', MANA_POTION_NEEDED),
    cast(22829, BITE_NOW),
    cast(1322605, and(SHIFTING_POWER_CEILING, { spellCanCast: S(1322605) })),
    castOther('OtherActionOffensivePotion'),
    cast(22829, and(cmp(CP, 'OpGe', c(5)), or(PREDATORY_DISCIPLINE, cmp(ENERGY, 'OpLe', c(55))), cmp(LEFT, 'OpLt', c(`${RIP_MIN_LEFT}s`)))),
    cast(9830, and(CLEARCASTING, not(POOL_FOR_BITE))),
    cast(9896, RIP_DUE),
    cast(9904, RAKE_DUE),
    cast(9830, and(SHRED_BUILDS, cmp(ENERGY, 'OpGe', cost(9830)), PAID_BUILDER_FITS)),
    cast(9850, and(CLAW_BUILDS, cmp(ENERGY, 'OpGe', cost(9850)), PAID_BUILDER_FITS)),
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

// Maul in two- and three-target cleave (wowsims 944f2ac): with two Feral Instinct or two Blood Frenzy points from 10
// rage, still leaving a Primal Bite (with three Feral Instinct points one that is ready now; otherwise one due within
// 1.5 seconds), else from 20 as on one target; on three targets it also leaves a Swipe.
const FERAL_INSTINCT = talentRank(16947);
const CLEAVE_TALENT_MAUL = or(cmp(FERAL_INSTINCT, 'OpGe', c(2)), cmp(talentRank(16958), 'OpGe', c(2)));
const CLEAVE_MAUL_RESERVES_PRIMAL_BITE = or(
  and(cmp(FERAL_INSTINCT, 'OpGe', c(3)), or(
    not(known(PRIMAL_BITE)),
    cmp({ spellTimeToReady: S(PRIMAL_BITE) }, 'OpGt', c('0s')),
    cmp(math(RAGE, 'OpSub', cost(9881)), 'OpGe', cost(PRIMAL_BITE)),
  )),
  and(not(cmp(FERAL_INSTINCT, 'OpGe', c(3))), MAUL_LEAVES_PRIMAL_BITE),
);
const MAUL_LEAVES_SWIPE = cmp(RAGE, 'OpGe', math(cost(9881), 'OpAdd', cost(9908)));
const MAUL_ON_TWO = or(
  and(CLEAVE_TALENT_MAUL, cmp(RAGE, 'OpGe', c(10)), CLEAVE_MAUL_RESERVES_PRIMAL_BITE),
  and(not(CLEAVE_TALENT_MAUL), cmp(RAGE, 'OpGe', c(20)), MAUL_LEAVES_PRIMAL_BITE),
);
const MAUL_ON_THREE = or(
  and(CLEAVE_TALENT_MAUL, cmp(RAGE, 'OpGe', c(10)), MAUL_LEAVES_SWIPE, or(not(cmp(FERAL_INSTINCT, 'OpGe', c(3))), CLEAVE_MAUL_RESERVES_PRIMAL_BITE)),
  and(not(CLEAVE_TALENT_MAUL), cmp(RAGE, 'OpGe', c(20)), MAUL_LEAVES_SWIPE),
);
const DEMO_ROAR = cast(9898, { auraShouldRefresh: { auraId: { spellId: 9898 }, maxOverlap: c('0s') } });
// Lacerate on a target with no bleed of yours (the trainer assumes one, as wowsims' Assume Bleed Active).
const LACERATE_FOR_BLEED = cast(1235827, and(not({ druidBleedIsActive: {} }), { auraIsInactive: { ...onTarget(1235827), includeReactionTime: true } }));
const TARGETS = { numberTargets: {} };

// Bear: the defensive potion on cooldown, else the offensive potion when rage is short, Enrage when rage is short of
// the next attack, then by target count (wowsims 944f2ac). One target, or four and more: five Lacerates refreshed
// before they run out, Demoralizing Roar kept up, Primal Bite on cooldown, Swipe on two targets or more while they
// bleed, Lacerate as the filler and Maul at 20 rage while it leaves enough for a coming Primal Bite. Two targets:
// Demoralizing Roar, Maul (the cleave rule above), Primal Bite, Swipe. Three: Maul, Demoralizing Roar, Swipe, Primal
// Bite. Left out: its two-target Swipe (three Feral Instinct points) for a target dying within 3 seconds, the Maul
// queued before the pull on three targets, and a raid's Vindication counted as covering Demoralizing Roar.
export const BEAR_APL = {
  priorityList: [
    castOther('OtherActionDefensivePotion', { spellIsKnown: OTHER('OtherActionDefensivePotion') }),
    castOther('OtherActionOffensivePotion', and(
      { spellIsKnown: OTHER('OtherActionOffensivePotion') },
      not({ spellIsKnown: OTHER('OtherActionDefensivePotion') }),
      cmp(RAGE, 'OpLt', c(20)),
    )),
    // No Autocast Other Cooldowns: wowsims dropped it from the adaptive bear (b19089f), which names every cooldown it
    // uses, so the bear casts no racial, explosive or on-use item on its own.
    cast(5229, ENRAGE_RESCUES),
    { action: { condition: cmp(TARGETS, 'OpEq', c(2)), groupReference: { groupName: 'Two targets' } } },
    { action: { condition: cmp(TARGETS, 'OpEq', c(3)), groupReference: { groupName: 'Three targets' } } },
    { action: { condition: and(not(cmp(TARGETS, 'OpEq', c(2))), not(cmp(TARGETS, 'OpEq', c(3)))), groupReference: { groupName: 'Single target and larger packs' } } },
  ],
  groups: [
    {
      name: 'Two targets',
      actions: [
        DEMO_ROAR,
        LACERATE_FOR_BLEED,
        cast(9881, MAUL_ON_TWO),
        cast(PRIMAL_BITE, known(PRIMAL_BITE)),
        cast(9908, cmp(TARGETS, 'OpGe', c(2))),
      ],
    },
    {
      name: 'Three targets',
      actions: [
        cast(9881, MAUL_ON_THREE),
        DEMO_ROAR,
        LACERATE_FOR_BLEED,
        cast(9908, cmp(TARGETS, 'OpGe', c(3))),
        cast(PRIMAL_BITE, known(PRIMAL_BITE)),
      ],
    },
    {
      name: 'Single target and larger packs',
      actions: [
        cast(1235827, FIVE_LACERATES_NEAR_EXPIRY),
        DEMO_ROAR,
        cast(PRIMAL_BITE, known(PRIMAL_BITE)),
        cast(9908, and(cmp(TARGETS, 'OpGe', c(2)), { druidBleedIsActive: {} })),
        cast(1235827),
        cast(9881, and(cmp(RAGE, 'OpGe', c(20)), MAUL_LEAVES_PRIMAL_BITE)),
      ],
    },
  ],
};
