// The hunter's rotations: the wowsims Forever turret APL (ui/specs/hunter/dps/apls/turret.apl.json) as its MM and SV
// presets set its variables, without the walk to the shooting spot (you start there). The rotation helper and the sim
// both play them.
const S = (id) => ({ spellId: { spellId: id } });
const cast = (id, condition) => ({ action: { castSpell: S(id), ...(condition ? { condition } : {}) } });
const not = (val) => ({ not: { val } });
const COOLDOWNS = { action: { autocastOtherCooldowns: {}, condition: { cmp: { lhs: { currentTime: {} }, op: 'OpGe', rhs: { const: { val: '5s' } } } } } };
const MARK = cast(14325, not({ auraIsActive: { auraId: { spellId: 14325 }, sourceUnit: { type: 'CurrentTarget' } } }));
const STING = cast(25295, not({ dotIsActive: S(25295) }));
// Hunter's Mark and Aspect of the Hawk before the pull (the trainer holds the aspect through the fight).
const PREPULL = [
  { action: { castSpell: S(14325) }, doAtValue: { const: { val: '-22s' } } },
  { action: { castSpell: S(25296) }, doAtValue: { const: { val: '-20s' } } },
];

// MM: Hunter's Mark, Aimed Shot, Serpent Sting, Arcane Shot; Rapid Fire and the consumables from 5 sec in.
export const MARKSMANSHIP_APL = { prepullActions: PREPULL, priorityList: [COOLDOWNS, MARK, cast(20904), STING, cast(14287)] };
// SV: Hunter's Mark, Serpent Sting, Arcane Shot, Multi-Shot.
export const SURVIVAL_APL = { prepullActions: PREPULL, priorityList: [COOLDOWNS, MARK, STING, cast(14287), cast(2643)] };
