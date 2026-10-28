// Zones (areas) a fight can take place in. A zone sets the arena's look and whether the Natural flasks give
// their zone bonus: wowsims sim/common/forever/consumables_natural_flasks.go grants it in Mount Hyjal, Hyjal
// Summit and the Barrow Deeps (and takes every fight to be there). Zone ids 616 and 3606 are the game's
// (wowsims db.json); the Barrow Deeps is a Forever raid inside Mount Hyjal.
export const ZONES = {
  hyjalSummit: { name: 'Hyjal Summit', gameId: 3606, flaskBonus: true, note: '20-player raid at the peak of Mount Hyjal, by Nordrassil' },
  barrowDeeps: { name: 'The Barrow Deeps', gameId: null, flaskBonus: true, note: '10-player raid beneath Mount Hyjal' },
  mountHyjal: { name: 'Mount Hyjal', gameId: 616, flaskBonus: true, note: 'The open world of Mount Hyjal' },
  trainingGrounds: { name: 'Training Grounds', gameId: null, flaskBonus: false, note: 'A practice yard outside Hyjal: Natural flasks give Stamina only' },
};

export const DEFAULT_ZONE = 'hyjalSummit';

// The four Natural flasks (items) whose zone bonus wowsims applies.
export const NATURAL_FLASKS = new Set([274273, 274274, 274275, 274276]);
