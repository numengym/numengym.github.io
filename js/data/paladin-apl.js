// Paladin APLs, from wowsims Forever (ui/specs/paladin/*/apls); the rotation helper and the sim both play them.
//   Protection: protection/apls/default.apl.json.
//   Retribution: retribution/apls/default.apl.json, the APL of the Twist of Light preset. It reads the talents: with
//   Twist of Light it twists Seal of Command and Seal of Righteousness, putting each seal back up once its Echo has been
//   used; without it, it keeps one seal up (Seal of Command when talented). Judgement and Holy Strike wait 0.1 s clear of
//   a swing; Consecration and Exorcism only fill a long gap between swings while Judgement and Holy Strike are cooling down.
//   Holy Shock: retribution/apls/holy_shock.apl.json. Judgement, Consecration, Seal of Righteousness (renewed early in a
//   lull), Holy Strike, Holy Shock while the target stands in your Consecration (Consecrated Ground), Hammer of Wrath
//   right after a swing, Exorcism.
// Both Retribution lists open with Retribution Aura and Seal of the Crusader, whose first Judgement puts Judgement of the
// Crusader on the target (the presets' assigned judgement). Left out: the walk in from 25 yards (the pull-range move and
// the Move to melee group, which wowsims skips when the fight starts in melee), the pre-pull seals of a paladin with no
// assigned judgement, Holy Shock's Manual Crowd Pummeler swap, and two Holy Shock lines for spells the trainer does not
// have: Light's Vigil (cast after a swing while its mark is not on the target and Holy Shock's mana is left) and Divine
// Favor (just before Holy Shock).
export const PROT_PALADIN_APL = {"prepullActions":[{"action":{"castSpell":{"spellId":{"spellId":25780}}},"doAtValue":{"const":{"val":"-20s"}}},{"action":{"castSpell":{"spellId":{"spellId":10301,"rank":5}}},"doAtValue":{"const":{"val":"-18.5s"}}},{"action":{"castSpell":{"spellId":{"spellId":20308,"rank":6}}},"doAtValue":{"const":{"val":"-17s"}}}],"priorityList":[{"action":{"autocastOtherCooldowns":{}}},{"action":{"castSpell":{"spellId":{"spellId":20271}}}},{"action":{"castSpell":{"spellId":{"spellId":1310994}}}},{"action":{"condition":{"and":{"vals":[{"cmp":{"op":"OpLt","lhs":{"auraRemainingTime":{"auraId":{"spellId":20423,"rank":7}}},"rhs":{"autoTimeToNext":{"autoType":"MainHandAuto"}}}},{"auraIsInactive":{"auraId":{"spellId":20423,"rank":7}}}]}},"castSpell":{"spellId":{"spellId":20423,"rank":7}}}},{"hide":true,"action":{"condition":{"and":{"vals":[{"cmp":{"op":"OpLt","lhs":{"auraRemainingTime":{"auraId":{"spellId":20293,"rank":8}}},"rhs":{"autoTimeToNext":{"autoType":"MainHandAuto"}}}},{"auraIsInactive":{"auraId":{"spellId":20293,"rank":8}}}]}},"castSpell":{"spellId":{"spellId":20293,"rank":8}}}},{"action":{"castSpell":{"spellId":{"spellId":20924,"rank":5}}}},{"action":{"condition":{"or":{"vals":[{"not":{"val":{"talentIsKnown":{"talentId":{"spellId":1310905,"rank":1}}}}},{"auraIsActive":{"sourceUnit":{"type":"CurrentTarget"},"auraId":{"spellId":1280353}}}]}},"castSpell":{"spellId":{"spellId":25903,"rank":4}}}},{"action":{"castSpell":{"spellId":{"spellId":20928,"rank":3}}}},{"action":{"castSpell":{"spellId":{"spellId":10333,"rank":8}}}},{"action":{"castSpell":{"spellId":{"spellId":10314,"rank":6}}}}]};

const S = (spellId, rank) => ({ spellId: rank ? { spellId, rank } : { spellId } });
const c = (v) => ({ const: { val: String(v) } });
const cmp = (lhs, op, rhs) => ({ cmp: { lhs, op, rhs } });
const and = (...vals) => ({ and: { vals } });
const or = (...vals) => ({ or: { vals } });
const not = (val) => ({ not: { val } });
const v = (name) => ({ variableRef: { name } });
const cast = (s, condition) => ({ action: { castSpell: s, ...(condition ? { condition } : {}) } });
const group = (groupName) => ({ action: { groupReference: { groupName } } });
const prepull = (s, at) => ({ action: { castSpell: s }, doAtValue: c(at) });
const talent = (id) => ({ talentIsKnown: { talentId: { spellId: id, rank: 1 } } });
const onTarget = (id) => ({ auraIsActive: { auraId: { spellId: id }, sourceUnit: { type: 'CurrentTarget' } } });
const MH = { autoType: 'MainHandAuto' };
const SINCE_SWING = { autoTimeSinceLast: MH };
const TO_SWING = { autoTimeToNext: MH };

const JUDGEMENT = S(20271);
const SEAL_OF_COMMAND = S(20920, 5);
const SEAL_OF_RIGHTEOUSNESS = S(20293, 8);
const SEAL_OF_THE_CRUSADER = S(20308, 6);
const RETRIBUTION_AURA = S(10301, 5);
const HOLY_STRIKE = S(10333, 8);
const HAMMER_OF_WRATH = S(24239, 3);
const CONSECRATION = S(20924, 5);
const EXORCISM = S(10314, 6);
const HOLY_SHOCK = S(25902, 4);
const TWIST_OF_LIGHT = 1310735;
const SEAL_OF_COMMAND_TALENT = 20375;

// The seal is missing or runs out before the next swing.
const sealDue = (s) => or({ auraIsInactive: { auraId: s.spellId } },
  and({ auraIsActive: { auraId: s.spellId } }, cmp({ auraRemainingTime: { auraId: s.spellId } }, 'OpLe', TO_SWING)));
// Twist of Light's Echo of the seal is not waiting for a swing.
const noEcho = (id) => ({ auraIsInactive: { auraId: { spellId: id }, includeReactionTime: true } });
// Major cooldowns from the fight time Delay Major CDs says (0 s: at once).
const COOLDOWNS = { action: { condition: cmp({ currentTime: {} }, 'OpGe', v('Delay Major CDs')), autocastOtherCooldowns: {} } };
// Hammer of Wrath when it is instant, else right after a swing so its cast fits before the next.
const HAMMER = cast(HAMMER_OF_WRATH, or(cmp({ spellCastTime: HAMMER_OF_WRATH }, 'OpEq', c('0s')), cmp(SINCE_SWING, 'OpLt', c('0.2s'))));
const PREPULL = [prepull(RETRIBUTION_AURA, '-20s'), prepull(SEAL_OF_THE_CRUSADER, '-1.5s')];

// Consecration and Exorcism: when the next swing is more than 1.5 s off, at 10% mana or more, while Judgement and
// Holy Strike are not ready.
const filler = (name, s) => ({ name, actions: [cast(s, and(cmp(TO_SWING, 'OpGt', c('1.5s')), cmp({ currentManaPercent: {} }, 'OpGe', c('10%')),
  not({ spellIsReady: JUDGEMENT }), not({ spellIsReady: HOLY_STRIKE })))] });

export const RET_APL = {
  prepullActions: PREPULL,
  valueVariables: [
    { name: 'Use Seal of Command', value: c(true) },
    { name: 'Use Seal of Righteousness', value: c(true) },
    { name: 'Delay Major CDs', value: c('0s') },
    // Not within 0.1 s of a swing either side (the Windfury Totem guard).
    { name: 'WF guard', value: and(cmp(SINCE_SWING, 'OpGe', c('0.1s')), cmp(TO_SWING, 'OpGe', c('0.1s'))) },
    // Seal of Command when it is your seal (or you twist), its Echo has been used, and it is missing or runs out by the next swing.
    { name: 'Should refresh SoC', value: and(
      or(v('Use Seal of Command'), not(v('Use Seal of Righteousness')), talent(TWIST_OF_LIGHT)),
      or(not(talent(TWIST_OF_LIGHT)), noEcho(1311703)),
      sealDue(SEAL_OF_COMMAND)) },
    // Seal of Righteousness the same way, when it is your seal (no Seal of Command) or you twist.
    { name: 'Should refresh SoR', value: and(
      or(v('Use Seal of Righteousness'), not(talent(SEAL_OF_COMMAND_TALENT)), talent(TWIST_OF_LIGHT)),
      or(not(v('Use Seal of Command')), not(talent(SEAL_OF_COMMAND_TALENT)), talent(TWIST_OF_LIGHT)),
      or(not(talent(TWIST_OF_LIGHT)), noEcho(1311704)),
      sealDue(SEAL_OF_RIGHTEOUSNESS)) },
  ],
  groups: [filler('Consecration', CONSECRATION), filler('Exorcism', EXORCISM)],
  priorityList: [
    cast(JUDGEMENT, v('WF guard')),
    COOLDOWNS,
    HAMMER,
    // Holy Strike clear of a swing, and not in the same instant as a Judgement.
    cast(HOLY_STRIKE, and(v('WF guard'), not({ spellIsReady: JUDGEMENT }),
      cmp({ spellTimeToReady: JUDGEMENT }, 'OpLe', { math: { op: 'OpSub', lhs: { spellFullCooldown: JUDGEMENT }, rhs: c('0.1s') } }))),
    cast(SEAL_OF_COMMAND, v('Should refresh SoC')),
    cast(SEAL_OF_RIGHTEOUSNESS, v('Should refresh SoR')),
    group('Consecration'),
    group('Exorcism'),
  ],
};

// Not ready within the global cooldown of a Seal of Righteousness.
const busy = (s) => cmp({ spellTimeToReady: s }, 'OpGe', { spellGcdHastedDuration: SEAL_OF_RIGHTEOUSNESS });
const mob = (mobType) => ({ targetIsMobType: { mobType } });

export const HOLY_SHOCK_APL = {
  prepullActions: PREPULL,
  valueVariables: [
    { name: 'Delay Major CDs', value: c('0s') },
    // Seal of Righteousness when it is missing, or has 10 s or less while nothing else (Consecration, Holy Shock, Holy
    // Strike, Exorcism on undead and demons) is ready within its global cooldown.
    { name: 'Should refresh SoR', value: or({ auraIsInactive: { auraId: SEAL_OF_RIGHTEOUSNESS.spellId } },
      and(cmp({ auraRemainingTime: { auraId: SEAL_OF_RIGHTEOUSNESS.spellId } }, 'OpLe', c('10s')),
        busy(CONSECRATION), busy(HOLY_SHOCK), busy(HOLY_STRIKE),
        or(and(not(mob('MobTypeUndead')), not(mob('MobTypeDemon'))), busy(EXORCISM)))) },
    // Holy Shock in your Consecration with Consecrated Ground, and on Light's Vigil's mark with Light's Vigil.
    { name: 'Consecrated Ground check', value: or(not(talent(1310905)), onTarget(1280353)) },
    { name: "Light's Vigil check", value: or(not(talent(1310911)), onTarget(1311599)) },
  ],
  priorityList: [
    COOLDOWNS,
    cast(JUDGEMENT),
    cast(CONSECRATION),
    cast(SEAL_OF_RIGHTEOUSNESS, v('Should refresh SoR')),
    cast(HOLY_STRIKE),
    cast(HOLY_SHOCK, or(v('Consecrated Ground check'), v("Light's Vigil check"))),
    HAMMER,
    cast(EXORCISM),
  ],
};
