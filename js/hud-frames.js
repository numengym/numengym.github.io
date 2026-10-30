// Movable HUD frames: your trinkets above the player frame, a shaman's totem bars under it, and every buff you have in
// the top right corner. Each starts at its own place (css/style.css); unlocked (Settings), a frame can be dragged
// anywhere, and keeps that spot (settings.hudFrames: { id: { left, top } } as fractions of the window).
// Every other part of the screen (unit frames, action bars, cast bar, the bars, meters, the top bar...) moves by an
// offset from its own place instead (registerOffset, settings.hudOffsets: { id: { x, y } } in pixels): it stays in its
// layout, with the styles it takes from there.
export class HudFrames {
  // save(): stores the settings object frames are kept in.
  constructor(settings, save) {
    this.settings = settings;
    this.save = save;
    this.frames = {};
    this.unlocked = false;
    window.addEventListener('resize', () => { for (const id of Object.keys(this.frames)) this.place(id); });
  }

  // A frame and where it goes back to when its spot is reset.
  // inPlace: a frame outside the HUD stack (no transform to escape) stays in its parent when moved, so the panels and
  // the main menu still cover it.
  register(id, el, label, { inPlace = false } = {}) {
    this.frames[id] = { el, home: el.parentNode, next: el.nextSibling, inPlace };
    el.dataset.label = label;
    el.addEventListener('pointerdown', (e) => this.drag(id, e));
    this.place(id);
  }

  // A moved frame is fixed to the window (out of the HUD stack, whose transform would move it with the stack).
  place(id) {
    const f = this.frames[id];
    const pos = (this.settings.hudFrames || {})[id];
    if (!pos) {
      f.el.classList.remove('moved');
      f.el.style.left = f.el.style.top = '';
      if (f.el.parentNode !== f.home) f.home.insertBefore(f.el, f.next && f.next.parentNode === f.home ? f.next : null);
      return;
    }
    if (!f.inPlace && f.el.parentNode !== document.body) document.body.appendChild(f.el);
    f.el.classList.add('moved');
    f.el.style.left = `${Math.round(pos.left * window.innerWidth)}px`;
    f.el.style.top = `${Math.round(pos.top * window.innerHeight)}px`;
  }

  // An element moved by an offset: its pixels from where the layout puts it.
  // always: it can be dragged at any time, not only while the frames are unlocked (its buttons still work).
  registerOffset(id, el, label, { always = false } = {}) {
    if (!el) return;
    this.offsets ||= {};
    this.offsets[id] = el;
    if (always) (this.always ||= new Set()).add(id);
    el.classList.add('hfo');
    el.dataset.label = label;
    el.addEventListener('pointerdown', (e) => this.dragOffset(id, e));
    this.placeOffset(id);
  }
  placeOffset(id) {
    const el = this.offsets[id];
    const o = (this.settings.hudOffsets || {})[id];
    el.style.translate = o ? `${o.x}px ${o.y}px` : '';
  }
  dragOffset(id, e) {
    const free = !this.unlocked && this.always && this.always.has(id);
    if ((!this.unlocked && !free) || e.button !== 0) return;
    if (free && e.target.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    const o = (this.settings.hudOffsets || {})[id] || { x: 0, y: 0 };
    const x0 = e.clientX - o.x;
    const y0 = e.clientY - o.y;
    let moved = false;
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return;
      moved = true;
      (this.settings.hudOffsets ||= {})[id] = { x: Math.round(ev.clientX - x0), y: Math.round(ev.clientY - y0) };
      this.placeOffset(id);
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) { this.save(); return; }
      if (free) return;
      // A click without a drag still reaches what is under it (the side menu's Settings, to lock the frames again).
      // Every movable frame is let through for the look (an empty one held open to be grabbed can lie over a button).
      const all = Object.values(this.offsets);
      for (const x of all) x.classList.remove('unlocked');
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      for (const x of all) x.classList.add('unlocked');
      const target = under && under.closest('button, a, select, input, label, [data-open], [data-tab]');
      if (target) target.click();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  setUnlocked(on) {
    this.unlocked = on;
    for (const { el } of Object.values(this.frames)) el.classList.toggle('unlocked', on);
    for (const el of Object.values(this.offsets || {})) {
      el.classList.toggle('unlocked', on);
      // Its name over it while it can be moved.
      let tag = el.querySelector(':scope > .hfo-label');
      if (on && !tag) {
        tag = document.createElement('span');
        tag.className = 'hfo-label';
        tag.textContent = el.dataset.label;
        if (getComputedStyle(el).position === 'static') el.classList.add('hfo-anchor');
        el.appendChild(tag);
      } else if (!on && tag) tag.remove();
    }
  }

  reset() {
    this.settings.hudFrames = {};
    this.settings.hudOffsets = {};
    this.save();
    for (const id of Object.keys(this.frames)) this.place(id);
    for (const id of Object.keys(this.offsets || {})) this.placeOffset(id);
  }

  drag(id, e) {
    if (!this.unlocked || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = this.frames[id].el;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const move = (ev) => {
      const left = Math.max(0, Math.min(window.innerWidth - r.width, ev.clientX - dx));
      const top = Math.max(0, Math.min(window.innerHeight - r.height, ev.clientY - dy));
      (this.settings.hudFrames ||= {})[id] = { left: left / window.innerWidth, top: top / window.innerHeight };
      this.place(id);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.save();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
}
