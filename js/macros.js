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
  // Plain words for the item buttons, as players write them: "/use Potion", "/use Offensive Potion", "/use Trinket 1",
  // "/cast Racial". The potions are whichever ones are chosen in Raid → Consumables.
  const alias = (n, id) => { if (!names.has(n) && ABILITIES[id]) names.set(n, id); };
  for (const n of ['potion', 'resource potion', 'rage potion', 'great rage potion', 'mighty rage potion', 'mana potion', 'major mana potion', 'energy potion']) alias(n, 'potion');
  for (const n of ['offensive potion', 'damage potion', 'dps potion']) alias(n, 'offensivePotion');
  for (const n of ['defensive potion', 'health potion', 'healing potion']) alias(n, 'defensivePotion');
  for (const [n, id] of [['trinket 1', 'trinket1'], ['trinket1', 'trinket1'], ['trinket 2', 'trinket2'], ['trinket2', 'trinket2'], ['racial', 'racial'], ['weapon', 'weapon']]) alias(n, id);
  return names;
}

// Parses macro text into { tooltip, lines }, each line a list of { conds, spell } options.
export function parseMacro(text) {
  let tooltip = null;
  const lines = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const tip = line.match(/^#show(?:tooltip)?(?:\s+(.*)|$)/i);
    if (tip) { tooltip = (tip[1] || '').trim() || null; continue; }
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

// ---- the macro checker (Settings → Macros) ------------------------------------------------------------

// The conditions a macro can use here.
const COND_KEYS = new Set(['stance', 'combat', 'mod', 'modifier', 'harm', 'exists', 'help', 'dead', 'equipped']);
// Commands players carry over from the game: what each does here.
const IGNORED_COMMANDS = {
  startattack: 'You attack on your own here: /startattack is not needed.',
  stopattack: 'Ignored: your auto attack runs all fight.',
  stopcasting: 'Ignored: a press never stops a cast here.',
  targetenemy: 'Ignored: Tab targets the next enemy.',
  target: 'Ignored: click or Tab to target.',
  assist: 'Ignored: there is no one to assist.',
  focus: 'Ignored: there is no focus target.',
  petattack: 'Ignored: your pet attacks your target on its own.',
  say: 'Ignored.', yell: 'Ignored.', raid: 'Ignored.', rw: 'Ignored.', p: 'Ignored.', s: 'Ignored.', e: 'Ignored.', emote: 'Ignored.',
  run: 'Ignored: no scripts.', script: 'Ignored: no scripts.', console: 'Ignored.', equip: 'Ignored: gear changes in the Character tab.',
};

// The closest name a misspelled one may mean: one that contains it, or the fewest edits away.
function closest(word, candidates) {
  const w = word.toLowerCase();
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    if (/^\d+$|^item:/.test(c)) continue;
    const d = c.includes(w) || w.includes(c) ? Math.abs(c.length - w.length) * 0.3 : editDistance(w, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best && bestD <= Math.max(2, w.length / 3) ? best : null;
}
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Checks a macro line by line: what each line does here, or why it will not work and how to set it up.
// ctx: { names (spellNames), uses (the sheet's item uses), racial (your race's active one, or null), classId,
//        talents (ranks by key), known(id) (the spell is one of yours) }.
// Returns { level: 'ok' | 'warn' | 'error', summary, lines: [{ text, level ('ok', 'info', 'warn', 'error'), msg }] }.
export function checkMacro(text, ctx) {
  const { names, uses = {}, racial = null, classId, talents = {}, known = () => true } = ctx;
  const out = [];
  const note = (line, level, msg) => out.push({ text: line, level, msg });
  const casts = []; // what a press casts, in order: { id, gcd, conditional }
  let cancels = false;
  const nameOf = (id) => (ABILITIES[id] ? ABILITIES[id].name : id);

  // What a spell or item name is here, with a fix when it is nothing.
  const resolve = (spell) => {
    const id = names.get(spell.toLowerCase());
    if (id) return { id };
    const low = spell.toLowerCase();
    if (/potion|elixir|flask/.test(low)) return { error: `"${spell}" is not a potion here. Use /use Offensive Potion, /use Defensive Potion or /use Potion (your resource potion); pick them in Raid → Consumables.` };
    if (/trinket/.test(low)) return { error: `"${spell}" is not known. Use /use 13 (top trinket) or /use 14 (bottom trinket).` };
    if (/racial/.test(low)) return { error: `Write /cast Racial for your race's racial${racial ? ` (${racial.name})` : ''}.` };
    const guess = closest(spell, names.keys());
    return { error: `"${spell}" is not a spell or item here.${guess ? ` Did you mean "${titleCase(guess)}"?` : ' Check its spelling against your spellbook.'}` };
  };

  // Why an ability you named may still do nothing: no such item, not your talent, no racial.
  const usable = (id) => {
    const ab = ABILITIES[id];
    if (!ab) return null;
    if (ab.racial && !racial) return 'Your race has no racial to use here.';
    if (ab.item) {
      if (uses[ab.item]) return null;
      if (ab.item === 'trinket1' || ab.item === 'trinket2') return `Your ${ab.item === 'trinket1' ? 'top (13)' : 'bottom (14)'} trinket has no use effect: equip one with "Use:" in the Character tab, or drop this line.`;
      if (ab.item === 'weapon') return 'Your weapon has no use effect.';
      return `No ${ab.name.toLowerCase()} is chosen: pick one in Raid → Consumables.`;
    }
    if (ab.talent && !(talents[ab.talent] > 0)) return `${ab.name} needs its talent: take it in the Talents tab.`;
    if (!known(id)) return `${ab.name} is not one of your spells.`;
    return null;
  };

  for (const r of String(text || '').split('\n')) {
    const line = r.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const tip = line.match(/^#show(?:tooltip)?(?:\s+(.*)|$)/i);
      if (!tip) { note(line, 'warn', 'Only #showtooltip is read here; this line is ignored.'); continue; }
      const spell = (tip[1] || '').trim();
      if (!spell) { note(line, 'ok', 'The button shows the spell the macro casts.'); continue; }
      const res = resolve(spell);
      note(line, res.id ? 'ok' : 'warn', res.id ? `The button shows ${nameOf(res.id)}.` : `${res.error} The button shows the last spell instead.`);
      continue;
    }
    const cmd = line.match(/^\/(\w+)\s*(.*)$/);
    if (!cmd) { note(line, 'error', 'A macro line starts with / (a command like /cast) or # (#showtooltip).'); continue; }
    const word = cmd[1].toLowerCase();
    if (word === 'castsequence') { note(line, 'error', '/castsequence is not supported: put each spell on its own /cast line (a press goes down them in order), or pick one with [conditions].'); continue; }
    if (!['cast', 'use', 'cancelaura'].includes(word)) {
      note(line, IGNORED_COMMANDS[word] ? 'info' : 'warn', IGNORED_COMMANDS[word] || `/${word} is not known here; the line is ignored. Use /cast, /use or /cancelaura.`);
      continue;
    }
    if (!cmd[2].trim()) { note(line, 'error', `/${word} needs a spell or item after it, e.g. /${word} ${word === 'use' ? '13' : 'Racial'}.`); continue; }
    const options = cmd[2].split(';').map((part) => part.trim()).filter(Boolean);
    const msgs = [];
    const did = [];
    let level = 'ok';
    const worse = (l) => { if (l === 'error' || (l === 'warn' && level === 'ok')) level = l; };
    for (const part of options) {
      const m = part.match(/^((?:\[[^\]]*\]\s*)*)(.*)$/);
      const conds = [...m[1].matchAll(/\[([^\]]*)\]/g)].flatMap((g) => g[1].split(',').map((c) => c.trim()).filter(Boolean));
      for (const c of conds) {
        const [rawKey, value] = c.split(':');
        const no = /^no/i.test(rawKey);
        const key = rawKey.replace(/^no/i, '').toLowerCase();
        if (key.startsWith('@') || key.startsWith('target=')) continue;
        if (!COND_KEYS.has(key)) { worse('warn'); msgs.push(`[${c}] is not known here and always counts as true.`); continue; }
        if (key === 'stance') {
          if (classId !== 'warrior') { worse('warn'); msgs.push(`[${c}]: only a warrior's stances are read here; for you it ${no ? 'always' : 'never'} holds.`); }
          else if (value && value.split('/').some((v) => !['1', '2', '3'].includes(v))) { worse('error'); msgs.push(`[${c}]: the stances are 1 Battle, 2 Defensive, 3 Berserker.`); }
        }
        if ((key === 'help' || key === 'dead') && !no) { worse('warn'); msgs.push(`[${c}] never holds: your target is always a living enemy.`); }
      }
      const spell = m[2].replace(/\(.*\)$/, '').trim();
      if (!spell) { worse('error'); msgs.push('An option with conditions needs a spell after them.'); continue; }
      const res = resolve(spell);
      if (!res.id) { worse('error'); msgs.push(res.error); continue; }
      if (word === 'cancelaura') { cancels = true; did.push(`takes ${nameOf(res.id)} off`); continue; }
      const why = usable(res.id);
      if (why) { worse('warn'); msgs.push(why); }
      const ab = ABILITIES[res.id] || {};
      const label = ab.item && uses[ab.item] ? uses[ab.item].name : ab.racial && racial ? racial.name : nameOf(res.id);
      const when = conds.length ? `with [${conds.join(', ')}] ` : options.length > 1 && did.length ? 'otherwise ' : '';
      did.push(`${when}${word === 'use' ? 'uses' : 'casts'} ${label}`);
      casts.push({ id: res.id, label, gcd: !!ab.gcd && !/Stance$|Form$/.test(res.id), conditional: conds.length > 0 || options.length > 1 });
    }
    const what = did.length ? `${did.join('; ')}.` : '';
    note(line, level, [what && what[0].toUpperCase() + what.slice(1), ...msgs].filter(Boolean).join(' '));
  }

  // One press casts one spell on the global cooldown: one after it goes only if the first could not.
  const gcds = casts.filter((c) => c.gcd && !c.conditional);
  if (gcds.length > 1) {
    note('', 'warn', `${gcds.map((c) => c.label).join(' and ')} are all on the global cooldown: a press casts the first that can go, the rest wait for another press. Off-GCD ones (racial, trinkets, potions, stances) all go out on the same press.`);
  }
  if (text.length > 255) note('', 'info', `It is ${text.length} characters; the game's limit is 255 (here it still works).`);
  if (!casts.length && !cancels) note('', 'error', 'Nothing in it casts or uses anything: add a /cast or /use line.');

  const level = out.some((l) => l.level === 'error') ? 'error' : out.some((l) => l.level === 'warn') ? 'warn' : 'ok';
  const pressed = [...new Set(casts.map((c) => c.label))];
  const summary = level === 'error' ? 'This macro will not work as written: see the red lines.'
    : level === 'warn' ? 'This macro works, but check the yellow notes.'
    : `This macro works${pressed.length ? `: one press uses ${pressed.join(', ')}` : ''}.`;
  return { level, summary, lines: out };
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
