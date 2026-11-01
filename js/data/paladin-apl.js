// Paladin APLs, from wowsims Forever (ui/specs/paladin/*/apls) after PR 772 (hotfix push 113554, the reworked tree);
// the rotation helper and the sim both play them.
//   Protection: protection/apls/default.apl.json, as it is: Righteous Fury, Retribution Aura and Seal of the Crusader
//   (at -1.5 s) before the pull; Judgement, Swift Judgement only right after a Judgement (once Judgement's cooldown is
//   past the reaction time), Seal of Fury, Consecration, Holy Shock (the heal's id 25903, which the helper reads as the
//   shock) while Consecrated Ground is on the target, Holy Shield, Holy Strike, Exorcism.
//   Retribution: retribution/apls/default.apl.json, the APL of the Unsealed Wrath preset (and of its Simple rotation,
//   whose seal choice sets Use Seal of Command / Use Seal of Righteousness: both on with Unsealed Wrath). With Unsealed
//   Wrath it keeps Seal of Command up until three swings have stored three Echoes of Command, then puts Seal of
//   Righteousness up for one swing, which spends them and stores an Echo of Righteousness, and Seal of Command goes
//   back up; without it, it keeps one seal up (Seal of Command when talented). Every seal waits until Judgement's
//   cooldown is past the reaction time (Judge realism protection). Judgement and Holy Strike wait 0.1 s clear of a
//   swing; Consecration and Exorcism only fill a long gap between swings while Judgement and Holy Strike are cooling down.
//   Holy Shock: retribution/apls/holy_shock.apl.json. Judgement, Consecration, the selected seal (Seal of Righteousness
//   unless Seal of Command alone is chosen; renewed early in a lull), Holy Strike, Divine Favor when Holy Shock is
//   ready, Holy Shock, Hammer of Wrath right after a swing (or at once when Champion of the Light makes it instant),
//   Exorcism.
// Both Retribution lists open with Retribution Aura and Seal of the Crusader, whose first Judgement puts Judgement of the
// Crusader on the target (the presets' assigned judgement). Left out: the walk in from 25 yards (the pull-range move and
// the Move to melee group, which wowsims skips when the fight starts in melee), the pre-pull seals of a paladin with no
// assigned judgement, and Holy Shock's Manual Crowd Pummeler swap (the MCP swap group: Shin Blade while it cools down).
export const PROT_PALADIN_APL = {"prepullActions":[{"action":{"castSpell":{"spellId":{"spellId":25780}}},"doAtValue":{"const":{"val":"-20s"}}},{"action":{"castSpell":{"spellId":{"rank":5,"spellId":10301}}},"doAtValue":{"const":{"val":"-18.5s"}}},{"action":{"castSpell":{"spellId":{"rank":6,"spellId":20308}}},"doAtValue":{"const":{"val":"-1.5s"}}}],"priorityList":[{"action":{"autocastOtherCooldowns":{}}},{"action":{"castSpell":{"spellId":{"spellId":20271}}}},{"action":{"castSpell":{"spellId":{"spellId":1310994}},"condition":{"cmp":{"lhs":{"spellTimeToReady":{"spellId":{"spellId":20271}}},"op":"OpLe","rhs":{"math":{"lhs":{"spellFullCooldown":{"spellId":{"spellId":20271}}},"op":"OpSub","rhs":{"inputDelay":{}}}}}}}},{"action":{"castSpell":{"spellId":{"rank":7,"spellId":20423}},"condition":{"and":{"vals":[{"cmp":{"lhs":{"auraRemainingTime":{"auraId":{"rank":7,"spellId":20423}}},"op":"OpLt","rhs":{"autoTimeToNext":{"autoType":"MainHandAuto"}}}},{"auraIsInactive":{"auraId":{"rank":7,"spellId":20423}}}]}}}},{"action":{"castSpell":{"spellId":{"rank":8,"spellId":20293}},"condition":{"and":{"vals":[{"cmp":{"lhs":{"auraRemainingTime":{"auraId":{"rank":8,"spellId":20293}}},"op":"OpLt","rhs":{"autoTimeToNext":{"autoType":"MainHandAuto"}}}},{"auraIsInactive":{"auraId":{"rank":8,"spellId":20293}}}]}}},"hide":true},{"action":{"castSpell":{"spellId":{"rank":5,"spellId":20924}}}},{"action":{"castSpell":{"spellId":{"rank":4,"spellId":25903}},"condition":{"or":{"vals":[{"not":{"val":{"talentIsKnown":{"talentId":{"rank":1,"spellId":1310905}}}}},{"auraIsActive":{"auraId":{"spellId":1280353},"sourceUnit":{"type":"CurrentTarget"}}}]}}}},{"action":{"castSpell":{"spellId":{"rank":3,"spellId":20928}}}},{"action":{"castSpell":{"spellId":{"rank":8,"spellId":10333}}}},{"action":{"castSpell":{"spellId":{"rank":6,"spellId":10314}}}}]};

const S = (spellId, rank) => ({ spellId: rank ? { spellId, rank } : { spellId } });
const c = (v) => ({ const: { val: String(v) } });
const cmp = (lhs, op, rhs) => ({ cmp: { lhs, op, rhs } });
const and = (...vals) => ({ and: { vals } });
const or = (...vals) => ({ or: { vals } });
const not = (val) => ({ not: { val } });
const v = (name) => ({ variableRef: { name } });
const cast = (s, condition) => ({ action: { castSpell: s, ...(condition ? { condition } : {}) } });
const group = (groupName, condition) => ({ action: { groupReference: { groupName }, ...(condition ? { condition } : {}) } });
const prepull = (s, at) => ({ action: { castSpell: s }, doAtValue: c(at) });
const talent = (id) => ({ talentIsKnown: { talentId: { spellId: id, rank: 1 } } });
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
const DIVINE_FAVOR = S(20216);
const UNSEALED_WRATH = 1310735;
const SEAL_OF_COMMAND_TALENT = 20375;
const ECHO_OF_COMMAND = 1311703;
const ECHO_OF_RIGHTEOUSNESS = 1311704;

// The seal is missing or runs out before the next swing.
const sealDue = (s) => or({ auraIsInactive: { auraId: s.spellId } },
  and({ auraIsActive: { auraId: s.spellId } }, cmp({ auraRemainingTime: { auraId: s.spellId } }, 'OpLe', TO_SWING)));
// The seal is not up (with the reaction time), and an Echo's stacks.
const sealGone = (s) => ({ auraIsInactive: { auraId: s.spellId, includeReactionTime: true } });
const echoStacks = (id, op, n) => cmp({ auraNumStacks: { auraId: { spellId: id }, includeReactionTime: true } }, op, c(n));
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
    // Seal of Command when it is your seal (or Unsealed Wrath's), it is missing or runs out by the next swing, and with
    // Unsealed Wrath once a swing under Seal of Righteousness has stored its Echo.
    { name: 'Should refresh SoC', value: and(
      or(v('Use Seal of Command'), not(v('Use Seal of Righteousness')), talent(UNSEALED_WRATH)),
      sealDue(SEAL_OF_COMMAND),
      or(not(talent(UNSEALED_WRATH)), and(sealGone(SEAL_OF_COMMAND), echoStacks(ECHO_OF_RIGHTEOUSNESS, 'OpGe', 1))),
      v('Judge realism protection')) },
    // Seal of Righteousness when it is your seal (no Seal of Command), or with Unsealed Wrath once three swings have
    // stored three Echoes of Command.
    { name: 'Should refresh SoR', value: and(
      or(v('Use Seal of Righteousness'), not(talent(SEAL_OF_COMMAND_TALENT)), talent(UNSEALED_WRATH)),
      or(not(v('Use Seal of Command')), not(talent(SEAL_OF_COMMAND_TALENT)), talent(UNSEALED_WRATH)),
      sealDue(SEAL_OF_RIGHTEOUSNESS),
      or(not(talent(UNSEALED_WRATH)), not(talent(SEAL_OF_COMMAND_TALENT)), and(sealGone(SEAL_OF_RIGHTEOUSNESS), echoStacks(ECHO_OF_COMMAND, 'OpEq', 3))),
      v('Judge realism protection')) },
    // Judgement's cooldown has run past the reaction time: nothing goes in the same instant as a Judgement.
    { name: 'Judge realism protection', value: cmp({ spellTimeToReady: JUDGEMENT }, 'OpLe', { math: { op: 'OpSub', lhs: { spellFullCooldown: JUDGEMENT }, rhs: { inputDelay: {} } } }) },
  ],
  groups: [
    // wowsims' Move to melee group without the walk: the opening Judgement (of the Crusader), then the seal to fight
    // with (move1: Seal of Command for Unsealed Wrath, whose Should refresh SoC waits for an Echo of Righteousness and
    // so never puts it up first; move2: Seal of Righteousness), each once. Upstream runs it on the walk in from its
    // preset's 25 yards (and between Judgement and the seal waits the reaction time); the trainer starts in melee.
    { name: 'Opening', actions: [
      { action: { condition: and(talent(SEAL_OF_COMMAND_TALENT), or(v('Use Seal of Command'), not(v('Use Seal of Righteousness')), talent(UNSEALED_WRATH)),
        not({ sequenceIsComplete: { sequenceName: 'move1' } })), sequence: { name: 'move1', actions: [{ castSpell: JUDGEMENT }, { castSpell: SEAL_OF_COMMAND }] } } },
      { action: { condition: and(or(not(talent(UNSEALED_WRATH)), not(talent(SEAL_OF_COMMAND_TALENT)), not(v('Use Seal of Command'))),
        not({ sequenceIsComplete: { sequenceName: 'move2' } })), sequence: { name: 'move2', actions: [{ castSpell: JUDGEMENT }, { castSpell: SEAL_OF_RIGHTEOUSNESS }] } } },
    ] },
    filler('Exorcism', EXORCISM), filler('Consecration', CONSECRATION),
  ],
  priorityList: [
    group('Opening'),
    cast(JUDGEMENT, v('WF guard')),
    COOLDOWNS,
    HAMMER,
    // Holy Strike clear of a swing, and not in the same instant as a Judgement.
    cast(HOLY_STRIKE, and(v('WF guard'), not({ spellIsReady: JUDGEMENT }), v('Judge realism protection'))),
    cast(SEAL_OF_COMMAND, v('Should refresh SoC')),
    cast(SEAL_OF_RIGHTEOUSNESS, v('Should refresh SoR')),
    group('Consecration'),
    group('Exorcism'),
  ],
};

// Not ready within the global cooldown of the seal.
const busy = (s, seal) => cmp({ spellTimeToReady: s }, 'OpGe', { spellGcdHastedDuration: seal });
const mob = (mobType) => ({ targetIsMobType: { mobType } });
// The seal when it is missing, or has 10 s or less while nothing else (Consecration, Holy Shock, Holy Strike, Exorcism
// on undead and demons) is ready within its global cooldown.
const refresh = (seal) => or({ auraIsInactive: { auraId: seal.spellId } },
  and(cmp({ auraRemainingTime: { auraId: seal.spellId } }, 'OpLe', c('10s')),
    busy(CONSECRATION, seal), busy(HOLY_SHOCK, seal), busy(HOLY_STRIKE, seal),
    or(and(not(mob('MobTypeUndead')), not(mob('MobTypeDemon'))), busy(EXORCISM, seal))));

export const HOLY_SHOCK_APL = {
  prepullActions: PREPULL,
  valueVariables: [
    { name: 'Use Seal of Righteousness', value: c(true) },
    { name: 'Use Seal of Command', value: c(true) },
    { name: 'Delay Major CDs', value: c('0s') },
    { name: 'Should refresh SoR', value: refresh(SEAL_OF_RIGHTEOUSNESS) },
    { name: 'Should refresh SoC', value: refresh(SEAL_OF_COMMAND) },
    { name: 'Should refresh seal', value: or(and(v('Is using Seal of Righteousness'), v('Should refresh SoR')), and(v('Is using Seal of Command'), v('Should refresh SoC'))) },
    // Seal of Righteousness unless Seal of Command alone is chosen (and talented); neither chosen: Seal of Righteousness.
    { name: 'Is using Seal of Righteousness', value: or(not(talent(SEAL_OF_COMMAND_TALENT)), v('Use Seal of Righteousness'),
      and(not(v('Use Seal of Righteousness')), not(v('Use Seal of Command')))) },
    { name: 'Is using Seal of Command', value: and(talent(SEAL_OF_COMMAND_TALENT), v('Use Seal of Command'), not(v('Use Seal of Righteousness'))) },
  ],
  groups: [{ name: 'Cast selected seal', actions: [cast(SEAL_OF_RIGHTEOUSNESS, v('Is using Seal of Righteousness')), cast(SEAL_OF_COMMAND, v('Is using Seal of Command'))] }],
  priorityList: [
    COOLDOWNS,
    cast(JUDGEMENT),
    cast(CONSECRATION),
    group('Cast selected seal', v('Should refresh seal')),
    cast(HOLY_STRIKE),
    cast(DIVINE_FAVOR, { spellIsReady: HOLY_SHOCK }),
    cast(HOLY_SHOCK),
    HAMMER,
    cast(EXORCISM),
  ],
};
