// Raid pack: alerts for boss mechanics laid out like the Fojji raid packs (WeakAuras "Fojji - Raid Pack Anchors
// [Classic]", decoded from its wago export): the same anchors, sizes, colours and font sizes, on the 1440p offsets
// from the screen centre that the class HUD uses too (scaled by --s). Like FojjiCore's raid pack menu, each kind of
// alert can be turned off, its sound and spoken callouts too, and an unlock mode shows every anchor with a sample
// so it can be dragged (or nudged with the arrow keys) somewhere else. settings.raidPack holds it all.
import { iconUrl } from './data/warrior.js';

// Anchors (x, y: offset of the anchor point from the screen centre, y up, Fojji units; self: which side of the
// group sits on it; grow: where more entries go).
export const ANCHORS = {
  bossTimers: { name: 'Boss Timers', x: 384, y: 74, self: 'bottom', grow: 'up' },             // 220x20 blue bars
  emphasize: { name: 'Boss Timers Emphasize', x: 384, y: 62, self: 'top', grow: 'down' },    // 220x21 red bars, last 5 s
  specialWarnings: { name: 'Special Warnings', x: 0, y: 178, self: 'top', grow: 'down' },     // big text (26)
  text: { name: 'Text', x: 0, y: 218, self: 'top', grow: 'down' },                            // text with icons (18)
  largeIcons: { name: 'Large Icons', x: -134, y: 15, self: 'right', grow: 'left' },          // 60x60 icons with a countdown
};
// What can be switched off (Emphasize goes with Boss Timers).
export const ALERT_KINDS = { bossTimers: 'Boss timers', specialWarnings: 'Special warnings', text: 'Mechanic text', largeIcons: 'Large icons' };

export const RAID_PACK_DEFAULTS = { on: true, sound: true, voice: false, show: { bossTimers: true, specialWarnings: true, text: true, largeIcons: true }, pos: {} };

const EMPHASIZE_AT = 5; // seconds left when a timer turns red and moves to Emphasize
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const secs = (s) => (s >= 10 ? Math.ceil(s) : s.toFixed(1));
const now = () => performance.now() / 1000;

export class RaidPack {
  // root: the layer the anchors go in. settings: settings.raidPack (changed in place). sound: the Sound (audio.js).
  // save(): store the settings.
  constructor(root, settings, { sound, save }) {
    this.root = root;
    this.s = settings;
    this.sound = sound;
    this.save = save;
    this.unlocked = false;
    this.selected = null;
    this.timers = [];
    this.warnings = [];   // { text, sub, icon, until }
    this.lines = new Map(); // key -> { text, icon, until }
    this.icons = new Map(); // key -> { icon, label, until, total }
    this.el = {};
    for (const [key, a] of Object.entries(ANCHORS)) {
      const d = document.createElement('div');
      d.className = `rp-anchor rp-${key} self-${a.self} grow-${a.grow}`;
      d.dataset.key = key;
      d.dataset.name = a.name;
      root.appendChild(d);
      this.el[key] = d;
    }
    this.place();
    this.bindMove();
  }

  // ---- what the fight shows --------------------------------------------------------------------------

  // Boss timers this frame: [{ key, name, icon, left, total }] (seconds).
  setTimers(list) { this.timers = list; }

  // A special warning: big text above the centre for a few seconds, with its sound and callout.
  warn(text, { icon = null, sub = '', voice = null, duration = 2.5, sound = 'warning' } = {}) {
    if (!this.s.on) return;
    if (this.s.show.specialWarnings) {
      this.warnings = [{ text, sub, icon, until: now() + duration }, ...this.warnings.filter((w) => w.text !== text)].slice(0, 3);
    }
    if (this.s.sound && sound) this.sound.play(sound);
    this.say(voice);
  }

  // A line of mechanic text with the icon on both sides, until it is cleared or runs out.
  line(key, text, { icon = null, duration = 3 } = {}) {
    if (!this.s.on || !this.s.show.text) return;
    this.lines.set(key, { text, icon, until: now() + duration });
  }

  // A large icon with a countdown (seconds) and a label under it ("Move Out").
  icon(key, { icon, label = '', duration = 3 }) {
    if (!this.s.on || !this.s.show.largeIcons) return;
    this.icons.set(key, { icon, label, until: now() + duration, total: duration });
  }

  clear(key) { this.lines.delete(key); this.icons.delete(key); }

  // Spoken callouts (FojjiCore's "Audio & Voices" uses voice packs; this is the browser's text to speech).
  say(text) {
    if (!text || !this.s.on || !this.s.voice || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.15;
    u.volume = Math.min(1, (this.sound.s.volume || 0.7) * 1.2);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // A fight ended or reset.
  reset() {
    this.timers = [];
    this.warnings = [];
    this.lines.clear();
    this.icons.clear();
  }

  // ---- drawing (every frame) ---------------------------------------------------------------------------

  frame() {
    const t = now();
    this.warnings = this.warnings.filter((w) => w.until > t);
    for (const [k, l] of this.lines) if (l.until <= t) this.lines.delete(k);
    for (const [k, i] of this.icons) if (i.until <= t) this.icons.delete(k);
    if (this.unlocked) return; // samples stay up while moving the anchors
    const on = this.s.on;
    const show = this.s.show;
    const bars = on && show.bossTimers ? [...this.timers].sort((a, b) => a.left - b.left) : [];
    this.fill('bossTimers', bars.filter((b) => b.left > EMPHASIZE_AT).map((b) => this.barHtml(b, false)));
    this.fill('emphasize', bars.filter((b) => b.left <= EMPHASIZE_AT).map((b) => this.barHtml(b, true)));
    this.fill('specialWarnings', on ? this.warnings.map((w) => this.warnHtml(w)) : []);
    this.fill('text', on ? [...this.lines.values()].map((l) => this.lineHtml(l)) : []);
    this.fill('largeIcons', on ? [...this.icons.values()].map((i) => this.iconHtml(i, t)) : []);
  }

  fill(key, parts) {
    const html = parts.join('');
    const el = this.el[key];
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
  }

  img(icon, cls = '') { return icon ? `<img class="${cls}" src="${iconUrl(icon)}" alt="">` : ''; }

  // Fojji boss timer bar: icon, name on the left, time on the right; 220x20 blue, 220x21 red when emphasized.
  barHtml(b, emph) {
    const frac = b.total > 0 ? Math.max(0, Math.min(1, b.left / b.total)) : 0;
    return `<div class="rp-bar${emph ? ' emph' : ''}">${this.img(b.icon, 'rp-bar-icon')}<div class="rp-bar-body"><div class="fill" style="width:${frac * 100}%"></div>
      <span class="name">${esc(b.name)}</span><span class="time">${secs(Math.max(0, b.left))}</span></div></div>`;
  }

  warnHtml(w) {
    return `<div class="rp-warn">${this.img(w.icon)}<span>${w.text}</span>${this.img(w.icon)}</div>${w.sub ? `<div class="rp-warn-sub">${w.sub}</div>` : ''}`;
  }

  lineHtml(l) { return `<div class="rp-line">${this.img(l.icon)}<span>${l.text}</span>${this.img(l.icon)}</div>`; }

  iconHtml(i, t) {
    const left = Math.max(0, i.until - t);
    return `<div class="rp-icon">${this.img(i.icon)}<b>${Math.ceil(left)}</b><span>${esc(i.label)}</span></div>`;
  }

  // ---- where the anchors are -------------------------------------------------------------------------------

  // Anchor point = screen centre + the Fojji offset + your move, in Fojji units times --s.
  place() {
    for (const [key, a] of Object.entries(ANCHORS)) {
      const own = this.s.pos[key] || { x: 0, y: 0 };
      const el = this.el[key];
      el.style.left = `calc(50% + var(--s, 1) * ${a.x + own.x}px)`;
      el.style.top = `calc(50% - var(--s, 1) * ${a.y + own.y}px)`;
    }
  }

  // Unlock mode: every anchor shows a sample and an outline; drag one, or click it and nudge with the arrow keys
  // (Shift: 10 at a time).
  setUnlocked(on) {
    this.unlocked = on;
    this.root.classList.toggle('unlocked', on);
    if (!on) { this.selected = null; this.frame(); return; }
    this.fill('bossTimers', [this.barHtml({ name: 'Boss Timer', icon: 'spell_fire_selfdestruct', left: 12, total: 20 }, false), this.barHtml({ name: 'Boss Timer', icon: 'ability_warrior_cleave', left: 8, total: 20 }, false)]);
    this.fill('emphasize', [this.barHtml({ name: 'Emphasized Timer', icon: 'ability_warstomp', left: 3.2, total: 20 }, true)]);
    this.fill('specialWarnings', [this.warnHtml({ text: '(<i class="y">1</i>) SPECIAL WARNING', icon: 'spell_fire_selfdestruct', sub: '(<i class="c">!</i>) MOVE OUT OF RANGE (<i class="c">!</i>)' })]);
    this.fill('text', [this.lineHtml({ text: 'Mechanic text', icon: 'ability_warrior_cleave' })]);
    this.fill('largeIcons', [this.iconHtml({ icon: 'ability_warstomp', label: 'Move Out', until: now() + 5 }, now())]);
  }

  resetPositions() {
    this.s.pos = {};
    this.place();
    this.save();
  }

  nudge(key, dx, dy) {
    const p = this.s.pos[key] || (this.s.pos[key] = { x: 0, y: 0 });
    p.x += dx;
    p.y += dy;
    this.place();
  }

  bindMove() {
    let drag = null;
    this.root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.rp-anchor');
      if (!this.unlocked || !el) return;
      e.preventDefault();
      e.stopPropagation();
      this.selected = el.dataset.key;
      for (const a of Object.values(this.el)) a.classList.toggle('selected', a === el);
      const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
      drag = { key: el.dataset.key, x: e.clientX, y: e.clientY, scale };
      el.setPointerCapture(e.pointerId);
    });
    this.root.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.nudge(drag.key, (e.clientX - drag.x) / drag.scale, -(e.clientY - drag.y) / drag.scale);
      drag.x = e.clientX;
      drag.y = e.clientY;
    });
    const drop = () => { if (drag) { drag = null; this.save(); } };
    this.root.addEventListener('pointerup', drop);
    this.root.addEventListener('pointercancel', drop);
    window.addEventListener('keydown', (e) => {
      if (!this.unlocked || !this.selected) return;
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (!d) return;
      e.preventDefault();
      e.stopPropagation();
      this.nudge(this.selected, d[0], d[1]);
      this.save();
    }, true);
  }
}
