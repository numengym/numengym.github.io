// The pet bar every pet class shares, as in the game: Attack, Follow and Stay, and the pet's mode. Assist (the
// default, and what wowsims sims) sends the pet at your target when the fight starts; Defensive only when something
// hits you; Passive never on its own. The pet's own abilities sit beside them: a click casts one as soon as it can,
// a right-click or Ctrl+key turns its autocast off or on (classes/caster.js).
export const PET_COMMANDS = {
  petAttack: { name: 'Attack', icon: 'ability_ghoulfrenzy', key: '', cost: 0, petCommand: 'attack', desc: 'Your pet attacks your target.' },
  petFollow: { name: 'Follow', icon: 'ability_tracking', key: '', cost: 0, petCommand: 'follow', desc: 'Your pet stops attacking and follows you.' },
  petStay: { name: 'Stay', icon: 'spell_nature_timestop', key: '', cost: 0, petCommand: 'stay', desc: 'Your pet stops attacking and stays where it is.' },
  petAssist: { name: 'Assist', icon: 'ability_racial_bloodrage', key: '', cost: 0, petCommand: 'assist', petMode: true, desc: 'Your pet attacks your target when you fight.' },
  petDefensive: { name: 'Defensive', icon: 'ability_defend', key: '', cost: 0, petCommand: 'defensive', petMode: true, desc: 'Your pet attacks only what attacks you.' },
  petPassive: { name: 'Passive', icon: 'ability_seal', key: '', cost: 0, petCommand: 'passive', petMode: true, desc: 'Your pet attacks only when you tell it to.' },
};
export const PET_COMMAND_IDS = Object.keys(PET_COMMANDS);
