// The main menu, in two steps like the game's character screen: first the class (a card per class with its specs,
// laid out like the wowsims Forever start page), then the race, body type, spec and the name the others see in a
// group. Only the warrior specs are playable so far; the other classes are listed for what comes next.
import { iconUrl } from './data/warrior.js';
import { CLASS_COLORS } from './raid-frames.js';

// Each class with its specs as wowsims Forever lists them. spec: the trainer's spec key (js/data/specs.js) when it
// can be played.
export const MENU_CLASSES = [
  { id: 'warrior', name: 'Warrior', icon: 'classicon_warrior', specs: [
    { name: 'Fury', icon: 'ability_warrior_innerrage', spec: 'fury' },
    { name: 'Arms', icon: 'ability_warrior_savageblow', spec: 'arms' },
    { name: 'Protection', icon: 'ability_warrior_defensivestance', spec: 'prot' },
  ] },
  { id: 'druid', name: 'Druid', icon: 'classicon_druid', specs: [
    { name: 'Balance', icon: 'spell_nature_starfall' }, { name: 'Feral Cat', icon: 'ability_druid_catform' },
    { name: 'Feral Bear', icon: 'ability_racial_bearform' }, { name: 'Restoration', icon: 'spell_nature_healingtouch' },
  ] },
  { id: 'hunter', name: 'Hunter', icon: 'classicon_hunter', specs: [{ name: 'All Specializations', icon: 'ability_hunter_aimedshot' }] },
  { id: 'mage', name: 'Mage', icon: 'classicon_mage', specs: [{ name: 'All Specializations', icon: 'spell_fire_firebolt02' }] },
  { id: 'paladin', name: 'Paladin', icon: 'classicon_paladin', specs: [
    { name: 'Holy', icon: 'spell_holy_holybolt' }, { name: 'Protection', icon: 'spell_holy_devotionaura' },
    { name: 'Retribution', icon: 'spell_holy_auraoflight' },
  ] },
  { id: 'priest', name: 'Priest', icon: 'classicon_priest', specs: [
    { name: 'DPS', icon: 'spell_shadow_shadowwordpain' }, { name: 'Healer', icon: 'spell_holy_guardianspirit' },
  ] },
  { id: 'rogue', name: 'Rogue', icon: 'classicon_rogue', specs: [{ name: 'All Specializations', icon: 'ability_rogue_eviscerate' }] },
  { id: 'shaman', name: 'Shaman', icon: 'classicon_shaman', specs: [
    { name: 'Elemental', icon: 'spell_nature_lightning' }, { name: 'Enhancement', icon: 'spell_nature_lightningshield' },
    { name: 'Restoration', icon: 'spell_nature_magicimmunity' },
  ] },
  { id: 'warlock', name: 'Warlock', icon: 'classicon_warlock', specs: [{ name: 'All Specializations', icon: 'spell_shadow_metamorphosis' }] },
];

// Race icons by body type (the game's race icons; Skyborne have none of their own).
const RACE_ICONS = {
  RaceHuman: 'race_human', RaceDwarf: 'race_dwarf', RaceNightElf: 'race_nightelf', RaceGnome: 'race_gnome',
  RaceOrc: 'race_orc', RaceUndead: 'race_scourge', RaceTauren: 'race_tauren', RaceTroll: 'race_troll',
};
const raceIcon = (race, bodyType) => (RACE_ICONS[race] ? `${RACE_ICONS[race]}_${bodyType === 'body2' ? 'female' : 'male'}` : 'ability_druid_flightform');
const BODY_TYPES = [['body1', 'Body 1'], ['body2', 'Body 2']];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// el: the menu's container. races: { RaceOrc: { name }, ... }. current: { spec, race, bodyType, name } in use.
// onPlay({ spec, race, bodyType, name }): Play was pressed.
export function buildMainMenu(el, { races, current, onPlay }) {
  const pick = { ...current, cls: null };

  const classStep = () => {
    const cards = MENU_CLASSES.map((c) => {
      const playable = c.specs.some((s) => s.spec);
      const specs = c.specs.map((s) => `<span class="mm-spec${s.spec ? '' : ' soon'}${s.spec && s.spec === current.spec ? ' current' : ''}"
          ${s.spec ? `data-spec="${s.spec}"` : ''}><img src="${iconUrl(s.icon)}" alt="">${esc(s.name)}</span>`).join('');
      return `<div class="mm-card${playable ? ' playable' : ' soon'}" ${playable ? `data-class="${c.id}" role="button" tabindex="0"` : 'title="Not in the trainer yet"'}
          style="--c:${CLASS_COLORS[c.id]}">
          <div class="mm-class"><img src="${iconUrl(c.icon)}" alt=""><div><b>${c.name}</b><small>${playable ? 'Playable' : 'Coming later'}</small></div></div>
          <div class="mm-specs">${specs}</div>
        </div>`;
    }).join('');
    return `<header class="mm-head"><img src="${iconUrl('ability_warrior_innerrage')}" alt="">
        <div><h1>Numen Gym</h1><p>WoW Forever rotation practice. Choose your class.</p></div></header>
      <div class="mm-grid">${cards}</div>
      <p class="mm-foot">Each spec keeps its own character, talents, keys and bars. Numbers from <a href="https://www.wowsims.com/forever/" target="_blank" rel="noopener">wowsims Forever</a>.</p>`;
  };

  const characterStep = () => {
    const c = MENU_CLASSES.find((x) => x.id === pick.cls);
    const raceButtons = Object.entries(races).map(([key, r]) => `<button type="button" class="mm-race${key === pick.race ? ' current' : ''}" data-race="${key}">
        <img src="${iconUrl(raceIcon(key, pick.bodyType))}" alt="">${esc(r.name)}</button>`).join('');
    const bodyButtons = BODY_TYPES.map(([key, label]) => `<button type="button" class="mm-spec${key === pick.bodyType ? ' current' : ''}" data-body="${key}">
        <img src="${iconUrl(raceIcon(pick.race, key))}" alt="">${label}</button>`).join('');
    const specButtons = c.specs.filter((s) => s.spec).map((s) => `<button type="button" class="mm-spec${s.spec === pick.spec ? ' current' : ''}" data-pick-spec="${s.spec}">
        <img src="${iconUrl(s.icon)}" alt="">${esc(s.name)}</button>`).join('');
    return `<header class="mm-head" style="--c:${CLASS_COLORS[c.id]}"><img class="round" src="${iconUrl(c.icon)}" alt="">
        <div><h1 style="color:var(--c)">${c.name}</h1><p>Choose your race, body type and spec.</p></div>
        <button type="button" class="ghost mm-back" data-back>← Classes</button></header>
      <section class="mm-step" style="--c:${CLASS_COLORS[c.id]}">
        <h2>Race</h2><div class="mm-races">${raceButtons}</div>
        <h2>Body type</h2><div class="mm-specs">${bodyButtons}</div>
        <h2>Spec</h2><div class="mm-specs">${specButtons}</div>
        <label class="mm-name">Your name <input id="mm-name" type="text" maxlength="24" placeholder="The name the others see in a group" value="${esc(pick.name || '')}"></label>
        <div class="row"><button type="button" class="primary mm-play" data-play ${pick.spec ? '' : 'disabled'}>Play</button></div>
      </section>`;
  };

  const render = () => {
    el.innerHTML = `<div class="mm-box">${pick.cls ? characterStep() : classStep()}</div>`;
    if (!pick.cls) {
      el.querySelectorAll('[data-class]').forEach((card) => {
        const open = (spec) => {
          pick.cls = card.dataset.class;
          const c = MENU_CLASSES.find((x) => x.id === pick.cls);
          if (spec) pick.spec = spec;
          else if (!c.specs.some((s) => s.spec === pick.spec)) pick.spec = (c.specs.find((s) => s.spec) || {}).spec;
          render();
        };
        card.addEventListener('click', (e) => open(e.target.closest('[data-spec]') && e.target.closest('[data-spec]').dataset.spec));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });
      return;
    }
    const keepName = () => { const n = el.querySelector('#mm-name'); if (n) pick.name = n.value.trim().slice(0, 24); };
    el.querySelector('[data-back]').addEventListener('click', () => { keepName(); pick.cls = null; render(); });
    el.querySelectorAll('[data-race]').forEach((b) => b.addEventListener('click', () => { keepName(); pick.race = b.dataset.race; render(); }));
    el.querySelectorAll('[data-body]').forEach((b) => b.addEventListener('click', () => { keepName(); pick.bodyType = b.dataset.body; render(); }));
    el.querySelectorAll('[data-pick-spec]').forEach((b) => b.addEventListener('click', () => { keepName(); pick.spec = b.dataset.pickSpec; render(); }));
    el.querySelector('[data-play]').addEventListener('click', () => {
      keepName();
      onPlay({ spec: pick.spec, race: pick.race, bodyType: pick.bodyType, name: pick.name });
    });
  };

  // Opening the menu starts at the classes.
  return { reset: () => { Object.assign(pick, current, { cls: null }); render(); }, set: (cur) => Object.assign(current, cur) };
}
