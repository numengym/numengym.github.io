// The main menu: pick a class and spec and the name the others see in a group, laid out like the wowsims Forever
// start page (a card per class with its specs). Only the warrior specs are playable so far; the other classes are
// listed for what comes next.
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

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// el: the menu's container. current: the spec being played; name: the saved name.
// onPick(spec, name): a playable spec was picked (the same one closes the menu, another switches to it).
export function buildMainMenu(el, { current, name, onPick }) {
  const cards = MENU_CLASSES.map((c) => {
    const playable = c.specs.some((s) => s.spec);
    const specs = c.specs.map((s) => `<button type="button" class="mm-spec${s.spec ? '' : ' soon'}${s.spec === current ? ' current' : ''}"
        ${s.spec ? `data-spec="${s.spec}"` : 'disabled title="Not in the trainer yet"'}><img src="${iconUrl(s.icon)}" alt="">${esc(s.name)}</button>`).join('');
    return `<div class="mm-card${playable ? '' : ' soon'}" style="--c:${CLASS_COLORS[c.id]}">
        <div class="mm-class"><img src="${iconUrl(c.icon)}" alt=""><div><b>${c.name}</b><small>${playable ? 'Playable' : 'Coming later'}</small></div></div>
        <div class="mm-specs">${specs}</div>
      </div>`;
  }).join('');
  el.innerHTML = `<div class="mm-box">
      <header class="mm-head">
        <img src="${iconUrl('ability_warrior_innerrage')}" alt="">
        <div><h1>Numen Gym</h1><p>WoW Forever rotation practice. Pick your class and spec.</p></div>
      </header>
      <label class="mm-name">Your name <input id="mm-name" type="text" maxlength="24" placeholder="The name the others see in a group" value="${esc(name || '')}"></label>
      <div class="mm-grid">${cards}</div>
      <p class="mm-foot">Each spec keeps its own character, talents, keys and bars. Numbers from <a href="https://www.wowsims.com/forever/" target="_blank" rel="noopener">wowsims Forever</a>.</p>
    </div>`;
  el.querySelectorAll('[data-spec]').forEach((b) => b.addEventListener('click', () => {
    onPick(b.dataset.spec, el.querySelector('#mm-name').value.trim().slice(0, 24));
  }));
}
