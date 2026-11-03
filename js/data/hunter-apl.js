// The hunter's rotations: the wowsims Forever turret APL (ui/specs/hunter/dps/apls/turret.apl.siml, with walk_in and
// common.apl.siml it uses), which the MM and SV builds both run (SV since wowsims 45bf54d), without the walk from Pull
// range to the shooting spot (you start there). The rotation helper and the sim both play them.
const S = (id) => ({ spellId: { spellId: id } });
const cast = (id, condition) => ({ action: { castSpell: S(id), ...(condition ? { condition } : {}) } });
const not = (val) => ({ not: { val } });
const COOLDOWNS = { action: { autocastOtherCooldowns: {}, condition: { cmp: { lhs: { currentTime: {} }, op: 'OpGe', rhs: { const: { val: '5s' } } } } } };
const MARK = cast(14325, not({ auraIsActive: { auraId: { spellId: 14325 }, sourceUnit: { type: 'CurrentTarget' } } }));
const STING = cast(13555, not({ dotIsActive: S(13555) }));
// Hunter's Mark and Aspect of the Hawk before the pull (the fight starts in the aspect).
const PREPULL = [
  { action: { castSpell: S(14325) }, doAtValue: { const: { val: '-22s' } } },
  { action: { castSpell: S(14322) }, doAtValue: { const: { val: '-20s' } } },
];

// MM (wowsims 192fa29): Hunter's Mark, Serpent Sting, Arcane Shot, Aimed Shot, then Sniper Shot (the least damage per
// second of casting, so it fills the gaps); Rapid Fire and the consumables from 5 sec in. A Sniper Shot is started one
// cast before the pull, so it lands as the fight starts.
const SNIPER = 1310786;
export const MARKSMANSHIP_APL = {
  prepullActions: [...PREPULL, { action: { castSpell: S(SNIPER) }, doAtValue: { math: { op: 'OpMul', lhs: { spellCastTime: S(SNIPER) }, rhs: { const: { val: '-1' } } } } }],
  priorityList: [COOLDOWNS, MARK, STING, cast(14287), cast(20904), cast(SNIPER)],
};
// SV: the same turret (wowsims 45bf54d: Aimed Shot takes the cooldown it shares with Multi-Shot; turret_multi stays a
// preset in wowsims only). The SV build does not learn Sniper Shot, so its lines do nothing there.
export const SURVIVAL_APL = MARKSMANSHIP_APL;
// BM: the same turret since wowsims a6b9f13 (Arcane Shot now outdamages the hawks it shares a cooldown with; turret_hawk
// stays a preset in wowsims only). Bestial Wrath goes out with the other cooldowns from 5 sec in.
export const BEAST_MASTERY_APL = MARKSMANSHIP_APL;
