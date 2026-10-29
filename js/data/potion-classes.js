// Generated from wowsims/forever assets/database/db.json (consumables[].potionClasses, tools/database/
// consumable_potion_classes.go): consumable item id -> its potion classes, 1 resource (restores mana, rage or energy),
// 2 defensive (heals, absorbs, armor, avoidance, health or a resistance), 3 offensive (any other buff, or damage).
// The settings offer a potion under each class it has, as wowsims' three potion pickers do.
export const POTION_CLASS = { RESOURCE: 1, DEFENSIVE: 2, OFFENSIVE: 3 };
export const POTION_CLASSES = {
  858:[2], 929:[2], 1072:[1], 1177:[2], 1400:[3], 1710:[2], 2455:[1], 2456:[1,2], 3087:[1], 3384:[2], 3385:[1],
  3827:[1], 3928:[2], 4376:[2], 4386:[2], 4546:[3], 4623:[2], 5206:[3], 5631:[1], 5633:[1], 6048:[2], 6049:[2],
  6050:[2], 6051:[2], 6052:[2], 6149:[1], 8410:[3], 8411:[2], 8412:[3], 8423:[3], 8424:[1], 9036:[2], 9144:[1,2],
  9224:[3], 12451:[3], 13442:[1,3], 13443:[1], 13444:[1], 13446:[2], 13455:[2], 13456:[2], 13457:[2], 13458:[2],
  13459:[2], 13460:[2], 13461:[2], 14894:[1,2], 17048:[2], 17348:[2], 17349:[2], 17351:[1], 17352:[1], 18253:[1,2],
  18269:[2], 18284:[1], 18839:[2], 18841:[1], 20079:[2], 22192:[2], 22193:[2], 22236:[2], 22237:[3], 22238:[3],
  22239:[3], 23164:[2], 23194:[2], 23195:[2], 23196:[2], 23326:[3], 23327:[3], 23435:[2], 250932:[3], 250933:[3],
  250934:[3], 250935:[3], 250936:[3], 250937:[3], 250938:[3], 250939:[3], 250940:[3], 250941:[3], 250942:[3],
  250943:[3], 250944:[3], 250945:[3], 250946:[3], 250947:[3], 250948:[3], 250949:[3], 250951:[3], 250953:[3],
  250954:[3], 250955:[3], 255663:[1,2], 268881:[2], 268882:[2], 268883:[2], 274935:[1,2], 282011:[2], 282013:[1]
};

// The actions that drink a potion: the resource, offensive and defensive picks (one potion a fight between them).
export const POTION_ACTIONS = ['potion', 'offensivePotion', 'defensivePotion'];
