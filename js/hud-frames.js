// Movable HUD frames: your trinkets above the player frame, a shaman's totem bars under it, and every buff you have in
// the top right corner. Each starts at its own place (css/style.css); unlocked (Settings), a frame can be dragged
// anywhere, and keeps that spot (settings.hudFrames: { id: { left, top } } as fractions of the window).
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
  register(id, el, label) {
    this.frames[id] = { el, home: el.parentNode, next: el.nextSibling };
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
    if (f.el.parentNode !== document.body) document.body.appendChild(f.el);
    f.el.classList.add('moved');
    f.el.style.left = `${Math.round(pos.left * window.innerWidth)}px`;
    f.el.style.top = `${Math.round(pos.top * window.innerHeight)}px`;
  }

  setUnlocked(on) {
    this.unlocked = on;
    for (const { el } of Object.values(this.frames)) el.classList.toggle('unlocked', on);
  }

  reset() {
    this.settings.hudFrames = {};
    this.save();
    for (const id of Object.keys(this.frames)) this.place(id);
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
