// WoW-style macros: "#showtooltip Spell", "/cast [conditions] Spell; Other Spell", "/use 13".
// Every /cast line runs in order on one key press, so a macro can swap stance and cast in one go.
import { RACIALS } from './data/warrior.js';
import { ABILITIES } from './active-class.js';

// replaces: the ability whose button and key the macro takes over while it is on. A macro that
// replaces nothing gets its own button on an extra row.
export const DEFAULT_MACROS = [
  { id: 'op', name: 'OP Dance', replaces: 'overpower', enabled: true, text: '#showtooltip Overpower\n/cast [nostance:1] Battle Stance\n/cast Overpower' },
  { id: 'rend', name: 'Rend Dance', replaces: 'rend', enabled: true, text: '#showtooltip Rend\n/cast [nostance:1] Battle Stance\n/cast Rend' },
  // One button: Charge out of combat (Battle Stance), Intercept in combat (Berserker Stance).
  { id: 'charge', name: 'Charge / Intercept', replaces: 'charge', enabled: true, text: '#showtooltip\n/cast [nocombat,nostance:1] Battle Stance; [combat,nostance:3] Berserker Stance\n/cast [nocombat] Charge; Intercept' },
  { id: 'ww', name: 'WW Dance', replaces: 'whirlwind', enabled: true, text: '#showtooltip Whirlwind\n/cast [nostance:3] Berserker Stance\n/cast Whirlwind' },
  { id: 'bt', name: 'BT Dance', replaces: 'bloodthirst', enabled: false, text: '#showtooltip Bloodthirst\n/cast [nostance:3] Berserker Stance\n/cast Bloodthirst' },
  // Cooldowns lined up on one press. The racial, trinkets and potion are off the global cooldown, so
  // they all go out with Death Wish. "Racial" is your race's racial; "Potion" is the one in the Raid tab.
  { id: 'burst', name: 'DW Burst', replaces: 'deathWish', enabled: true, text: '#showtooltip Death Wish\n/cast Death Wish\n/cast Racial\n/use 13\n/use 14\n/use Potion' },
  { id: 'reckburst', name: 'Reck Burst', replaces: 'recklessness', enabled: false, text: '#showtooltip Recklessness\n/cast [nostance:3] Berserker Stance\n/cast Recklessness\n/cast Racial\n/use 13\n/use 14\n/use Potion' },
];

// The other classes' built-in macros. Ice Block: the second press takes it off (in it you can do nothing else).
export const CLASS_MACROS = {
  mage: [
    { id: 'iceBlock', name: 'Ice Block', replaces: 'iceBlock', enabled: true, text: '#showtooltip Ice Block\n/cancelaura Ice Block\n/cast Ice Block' },
  ],
};

// Earlier versions of default macros: a saved macro still exactly like one is updated to the current default.
const OLD_DEFAULTS = {
  charge: '#showtooltip Charge\n/cast [nostance:1] Battle Stance\n/cast Charge',
};

// Default macros added after a player saved their list are merged in once.
export function mergeNewDefaults(saved, seen, defaults = DEFAULT_MACROS) {
  const macros = saved.map((m) => {
    if (OLD_DEFAULTS[m.id] !== m.text) return m;
    const def = defaults.find((d) => d.id === m.id);
    return def ? { ...m, name: def.name, text: def.text } : m;
  });
  const have = new Set(macros.map((m) => m.id));
  const added = defaults.filter((m) => !have.has(m.id) && !seen.includes(m.id)).map((m) => ({ ...m }));
  return { macros: [...macros, ...added], seen: defaults.map((m) => m.id) };
}

// WoW stance numbers for warriors.
const STANCE_NUMBER = { battle: 1, defensive: 2, berserker: 3 };

// Spell name -> action id, including the equipped trinkets, consumables and the racial by name.
export function spellNames(sheet) {
  const names = new Map();
  for (const [id, ab] of Object.entries(ABILITIES)) names.set(ab.name.toLowerCase(), id);
  for (const [slot, use] of Object.entries((sheet && sheet.uses) || {})) {
    names.set(use.name.toLowerCase(), slot);
    if (use.id) names.set(`item:${use.id}`, slot); // "/use item:10646"
  }
  const racial = sheet && RACIALS[sheet.race] && RACIALS[sheet.race].active;
  if (racial) names.set(racial.name.toLowerCase(), 'racial');
  names.set('13', 'trinket1');
  names.set('14', 'trinket2');
  names.set('16', 'weapon');
  // Common potion names point at whichever rage potion is chosen in the Raid tab.
  for (const n of ['rage potion', 'great rage potion', 'mighty rage potion']) if (!names.has(n)) names.set(n, 'potion');
  return names;
}

// Parses macro text into { tooltip, lines }, each line a list of { conds, spell } options.
export function parseMacro(text) {
  let tooltip = null;
  const lines = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const tip = line.match(/^#showtooltip\s*(.*)$/i);
    if (tip) { tooltip = tip[1].trim() || null; continue; }
    const cmd = line.match(/^\/(cast|use|cancelaura)\s+(.*)$/i);
    if (!cmd) continue; // /startattack and other commands do nothing here
    const options = cmd[2].split(';').map((part) => {
      const m = part.trim().match(/^((?:\[[^\]]*\]\s*)*)(.*)$/);
      const conds = [...m[1].matchAll(/\[([^\]]*)\]/g)].map((g) => g[1].split(',').map((c) => c.trim()).filter(Boolean));
      return { conds, spell: m[2].replace(/\(.*\)$/, '').trim() };
    }).filter((o) => o.spell);
    if (options.length) lines.push(Object.assign(options, { cmd: cmd[1].toLowerCase() }));
  }
  return { tooltip, lines };
}

// One condition group like "nostance:1, combat". All of it must hold.
function condsHold(group, fight, mods) {
  return group.every((c) => {
    const [rawKey, value] = c.split(':');
    const no = rawKey.startsWith('no');
    const key = no ? rawKey.slice(2) : rawKey;
    let holds = true;
    if (key === 'stance') holds = value ? value.split('/').includes(String(STANCE_NUMBER[fight.stance])) : true;
    else if (key === 'combat') holds = fight.started && !fight.over;
    else if (key === 'mod' || key === 'modifier') holds = value ? !!mods[value] : mods.shift || mods.ctrl || mods.alt;
    // The trainer's target is always a living enemy, and a Fury warrior holds no shield.
    else if (key === 'harm' || key === 'exists') holds = true;
    else if (key === 'help' || key === 'dead') holds = false;
    else if (key === 'equipped') holds = !/shield/i.test(value || '');
    else if (key.startsWith('@')) holds = true; // @focus, @mouseover...: the current target stands in
    return no ? !holds : holds;
  });
}

// The option of a line that applies now: the first whose condition groups (any of them) hold.
function pickOption(line, fight, mods) {
  return line.find((o) => !o.conds.length || o.conds.some((group) => condsHold(group, fight, mods)));
}

const STANCE_IDS = new Set(['battleStance', 'berserkerStance']);

// Runs a macro. Returns { ok, reason }: ok if any line cast something; reason is shown when nothing
// was cast or when the macro's main spell failed.
// A stance-dance macro first checks that its main spell could be cast after the swap. If it could
// not (in combat for Charge, out of range, on cooldown...), it does not swap at all, so you keep your
// stance and rage and see the real reason. Missing rage is the exception: as in the game, the stance
// still changes and only the spell fails ("Not enough rage").
export function runMacro(macro, fight, names, mods = {}) {
  const parsed = parseMacro(macro.text);
  const main = macroAction(macro, fight, names);
  const chosen = parsed.lines.map((line) => pickOption(line, fight, mods)).filter(Boolean);
  const swaps = chosen.some((o) => STANCE_IDS.has(names.get(o.spell.toLowerCase())));
  if (swaps && main && !STANCE_IDS.has(main)) {
    const reason = fight.wouldFail(main);
    if (reason && reason !== 'Not enough rage') return { ok: false, reason };
  }
  let ok = false;
  let reason = null;
  let mainFailed = null;
  let cancelled = false;
  // Conditions are read again per line, as in WoW: a line after a stance swap sees the new stance.
  for (const line of parsed.lines) {
    const opt = pickOption(line, fight, mods);
    if (!opt) continue;
    const id = names.get(opt.spell.toLowerCase());
    if (!id) { reason = `${opt.spell} is not in the trainer`; continue; }
    // /cancelaura: takes your aura off (Ice Block); what the press tried after it is not an error.
    if (line.cmd === 'cancelaura') { if (fight.cancelAura && fight.cancelAura(id)) cancelled = true; continue; }
    const res = fight.press(id);
    if (res.ok) ok = true;
    else {
      reason = res.reason;
      if (id === main) mainFailed = res.reason;
    }
  }
  if (cancelled) return { ok: true, reason: null };
  return { ok, reason: mainFailed || (ok ? null : reason || 'Nothing to cast') };
}

// The ability a macro shows on its button: the #showtooltip spell, otherwise the last line's spell.
export function macroAction(macro, fight, names) {
  const parsed = parseMacro(macro.text);
  if (parsed.tooltip && names.get(parsed.tooltip.toLowerCase())) return names.get(parsed.tooltip.toLowerCase());
  for (let i = parsed.lines.length - 1; i >= 0; i--) {
    if (parsed.lines[i].cmd === 'cancelaura') continue;
    const opt = fight ? pickOption(parsed.lines[i], fight, {}) : parsed.lines[i][0];
    if (opt && names.get(opt.spell.toLowerCase())) return names.get(opt.spell.toLowerCase());
  }
  return null;
}
