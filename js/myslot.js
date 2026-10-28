// Reads a Myslot export (https://github.com/tg123/myslot) for its keybinds: which spell or macro sits on each
// action bar slot, and which key presses that slot's button. Macros themselves are not imported; a macro button
// counts for the trainer ability it casts.
//
// Format: comment lines starting with "#", then base64 of 8 header bytes (version, 3 unused, CRC32) followed by a
// protobuf "Charactor" message (protobuf/MySlot.proto): repeated Slot slot = 1, repeated Bind bind = 2,
// repeated Macro macro = 3, string name = 15.
import { ABILITIES } from './data/warrior.js';
import { MYSLOT_BINDS, MYSLOT_KEYS, MYSLOT_MODS, SPELL_RANKS } from './data/myslot-tables.js';

const SLOT_SPELL = 1;
const SLOT_ITEM = 2;
const SLOT_MACRO = 3;
const CUSTOM_BIND = 0xffff;

// ---- protobuf (just the wire format: varints and length-delimited fields) ------------------------------------

function readFields(bytes, start, end) {
  const fields = [];
  let p = start;
  const varint = () => {
    let v = 0;
    let mul = 1;
    for (;;) {
      const b = bytes[p++];
      v += (b & 0x7f) * mul;
      if (b < 0x80) return v;
      mul *= 128;
    }
  };
  while (p < end) {
    const tag = varint();
    const field = Math.floor(tag / 8);
    const wire = tag & 7;
    if (wire === 0) fields.push({ field, value: varint() });
    else if (wire === 2) { const len = varint(); fields.push({ field, start: p, end: p + len }); p += len; }
    else if (wire === 5) { p += 4; } else if (wire === 1) { p += 8; } else throw new Error('Not a Myslot export (unknown protobuf field).');
  }
  return fields;
}

const utf8 = new TextDecoder();
const text = (bytes, f) => utf8.decode(bytes.subarray(f.start, f.end));
const sub = (bytes, f) => readFields(bytes, f.start, f.end);
const num = (fields, n) => { const f = fields.find((x) => x.field === n); return f ? f.value : undefined; };

// Myslot key -> the trainer's key name ("Shift+E", "Wheel Up", "Mouse 4", "F1").
const SPECIAL_KEYS = {
  MOUSEWHEELUP: 'Wheel Up', MOUSEWHEELDOWN: 'Wheel Down', BUTTON3: 'Middle Mouse', BUTTON4: 'Mouse 4', BUTTON5: 'Mouse 5',
  SPACE: 'Space', ENTER: 'Enter', BACKSPACE: 'Backspace', DELETE: 'Delete', INSERT: 'Insert', HOME: 'Home', END: 'End',
  PAGEUP: 'PageUp', PAGEDOWN: 'PageDown', UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight',
  CAPSLOCK: 'CapsLock', ESCAPE: 'Escape', TAB: 'Tab',
};
function keyName(bytes, f) {
  const k = sub(bytes, f);
  const custom = k.find((x) => x.field === 15);
  let key = custom ? text(bytes, custom) : MYSLOT_KEYS[num(k, 1) || 0];
  if (!key || key === 'KEYCODE') return null;
  const numpad = key.match(/^NUMPAD(\d)$/);
  key = SPECIAL_KEYS[key] || (numpad ? numpad[1] : key);
  if (/^BUTTON\d+$/.test(key)) return null; // other mouse buttons cannot be bound in a browser
  const mods = (MYSLOT_MODS[num(k, 2) || 0] || 'NONE').split('-');
  return (mods.includes('CTRL') ? 'Ctrl+' : '') + (mods.includes('ALT') ? 'Alt+' : '') + (mods.includes('SHIFT') ? 'Shift+' : '') + key;
}

// Parses the export. Returns { player, slots: [{ id, type, index }], binds: { command: [keys] }, macros: { id: { name, body } } }.
export function parseMyslot(input) {
  const lines = String(input || '').split(/\r?\n/);
  const player = (lines.find((l) => /^#\s*Player:/.test(l)) || '').replace(/^#\s*Player:\s*/, '').trim();
  const b64 = lines.filter((l) => l.trim() && !l.trim().startsWith('#')).join('').replace(/\s+/g, '');
  if (!b64) throw new Error('Paste the whole Myslot export (the block that ends with "# END OF MYSLOT").');
  let bin;
  try { bin = atob(b64); } catch { throw new Error('This is not a Myslot export: the text is not base64.'); }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (bytes.length < 9) throw new Error('This Myslot export is empty.');
  const out = { player, slots: [], binds: {}, macros: {} };
  for (const f of readFields(bytes, 8, bytes.length)) {
    if (f.field === 1 && f.start != null) {
      const s = sub(bytes, f);
      out.slots.push({ id: num(s, 1), type: num(s, 2), index: num(s, 3) });
    } else if (f.field === 2 && f.start != null) {
      const b = sub(bytes, f);
      const id = num(b, 1);
      const custom = b.find((x) => x.field === 15);
      const command = id === CUSTOM_BIND && custom ? text(bytes, custom) : MYSLOT_BINDS[id];
      if (!command) continue;
      const keys = b.filter((x) => (x.field === 2 || x.field === 3) && x.start != null).map((x) => keyName(bytes, x)).filter(Boolean);
      if (keys.length) out.binds[command] = keys;
    } else if (f.field === 3 && f.start != null) {
      const m = sub(bytes, f);
      const get = (n) => { const x = m.find((y) => y.field === n); return x && x.start != null ? text(bytes, x) : ''; };
      out.macros[num(m, 3)] = { name: get(1), body: get(2) };
    }
  }
  return out;
}

// The action bar button that presses a slot: 1-12 the main bar, then the extra bars (WoW slot numbering).
// Warrior stance bars (73-84 battle, 85-96 defensive, 97-108 berserker) are pressed with the main bar keys.
function buttonOf(slot) {
  const bars = [[1, 'ACTIONBUTTON'], [25, 'MULTIACTIONBAR3BUTTON'], [37, 'MULTIACTIONBAR4BUTTON'], [49, 'MULTIACTIONBAR2BUTTON'],
    [61, 'MULTIACTIONBAR1BUTTON'], [73, 'ACTIONBUTTON'], [85, 'ACTIONBUTTON'], [97, 'ACTIONBUTTON'],
    [145, 'MULTIACTIONBAR5BUTTON'], [157, 'MULTIACTIONBAR6BUTTON'], [169, 'MULTIACTIONBAR7BUTTON']];
  for (const [first, name] of bars) if (slot >= first && slot < first + 12) return `${name}${slot - first + 1}`;
  return null;
}

// Trainer actions a macro casts, most important first: the #showtooltip spell, then /cast spells (stances last,
// since a stance-dance macro is for the spell after the swap), then /use items.
function macroActions(body, ctx) {
  const byName = new Map(Object.entries(ABILITIES).map(([id, ab]) => [ab.name.toLowerCase(), id]));
  const resolve = (raw) => {
    const name = raw.replace(/\[[^\]]*\]/g, '').replace(/\(.*\)$/, '').trim().toLowerCase();
    if (byName.has(name)) return byName.get(name);
    if (name === '13') return 'trinket1';
    if (name === '14') return 'trinket2';
    const item = name.match(/^item:(\d+)$/);
    if (item) return ctx.items[item[1]] || null;
    if (/rage potion/.test(name)) return 'potion';
    if (ctx.racial && name === ctx.racial) return 'racial';
    return null;
  };
  const found = [];
  const tip = body.match(/^#showtooltip\s+(.+)$/mi);
  if (tip) { const id = resolve(tip[1]); if (id) found.push(id); }
  const casts = [];
  const uses = [];
  let castsOther = false; // a spell besides stances, even one the trainer does not have
  for (const line of body.split('\n')) {
    const m = line.trim().match(/^\/(cast|use)\s+(.*)$/i);
    if (!m) continue;
    for (const part of m[2].split(';')) {
      const id = resolve(part);
      if (id) (m[1].toLowerCase() === 'use' && !ABILITIES[id].stance && ABILITIES[id].item ? uses : casts).push(id);
      if (m[1].toLowerCase() === 'cast' && !(id && ABILITIES[id].stance) && part.replace(/\[[^\]]*\]/g, '').trim()) castsOther = true;
    }
  }
  // A macro that swaps stance for another spell ("[nostance:1] Battle Stance; Spearing Strike") is that spell's
  // button, not a stance button; only a macro that casts nothing but a stance counts for the stance.
  const stances = castsOther ? [] : casts.filter((id) => ABILITIES[id].stance);
  for (const id of [...casts.filter((id) => !ABILITIES[id].stance), ...uses, ...stances]) if (!found.includes(id)) found.push(id);
  return found;
}

// Builds trainer keybinds from a parsed export. ctx: { items: { itemId: action }, racial: racial spell name }.
// Returns { binds: { action: key }, found: [action], missing: [action] } for the given actions.
export function myslotKeybinds(parsed, actions, ctx = {}) {
  const binds = {};
  // Main bar first, so a spell on both the main bar and a stance bar gets the main bar's key.
  const slots = [...parsed.slots].sort((a, b) => a.id - b.id);
  for (const slot of slots) {
    const button = buttonOf(slot.id);
    const key = button && parsed.binds[button] && parsed.binds[button][0];
    if (!key) continue;
    let acts = [];
    if (slot.type === SLOT_SPELL && SPELL_RANKS[slot.index]) acts = [SPELL_RANKS[slot.index]];
    else if (slot.type === SLOT_ITEM && ctx.items && ctx.items[slot.index]) acts = [ctx.items[slot.index]];
    else if (slot.type === SLOT_MACRO && parsed.macros[slot.index]) acts = macroActions(parsed.macros[slot.index].body, { items: {}, ...ctx });
    // A button counts for its main action; a key already used keeps its first action.
    const act = acts.find((a) => actions.includes(a) && !binds[a]);
    if (act && !Object.values(binds).includes(key)) binds[act] = key;
  }
  const found = actions.filter((a) => binds[a]);
  return { binds, found, missing: actions.filter((a) => !binds[a]) };
}
