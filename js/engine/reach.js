// Range as WoW measures it. Every unit has a combat reach (a player's is 1.5 yards; a target's here is its model's
// radius). A spell's range runs from your reach to the target's: centre to centre, less both reaches. Melee is
// centre to centre within the larger of 5 yards (NOMINAL_MELEE_RANGE) and both reaches plus 4/3 yard, so a big
// target is in reach from no further off its edge than a small one, never 5 yards past it. A fight's geo.dist is the
// first (spells, Auto Shot, the 8-yard dead zone), geo.reach each target's melee reach on that same scale.
export const PLAYER_REACH = 1.5;
const NOMINAL_MELEE = 5;
const MELEE_EXTRA = 4 / 3;

// Yards from your reach to the target's (0 when they touch), from the distance between your centres.
export const rangeOf = (centre, targetReach, reach = PLAYER_REACH) => Math.max(0, centre - targetReach - reach);

// How far in that measure you can be and still swing.
export const meleeReachOf = (targetReach, reach = PLAYER_REACH) => Math.max(NOMINAL_MELEE - targetReach - reach, MELEE_EXTRA);

// The circle around a target's centre a melee attacker's centre has to be inside.
export const meleeCircleOf = (targetReach, reach = PLAYER_REACH) => Math.max(NOMINAL_MELEE, targetReach + reach + MELEE_EXTRA);
