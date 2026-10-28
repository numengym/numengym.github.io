// Raid frames in a group, styled like the Fojji EllesmereUI raid frames: flat class-coloured health on a dark
// background with the name on it, the missing health on the right and a thin power bar under it. Five to a
// group; the groups go side by side (each a column, as in WoW) or stacked.
// Unlocked (Group panel) they can be dragged anywhere and sized with the mouse wheel; where they are and how
// big is kept in the settings (settings.raidFrames).

const CLASS_COLORS = {
  warrior: '#c69b6d', paladin: '#f48cba', hunter: '#aad372', rogue: '#fff468', priest: '#ffffff',
  shaman: '#0070dd', mage: '#3fc7eb', warlock: '#8788ee', druid: '#ff7c0a',
};
const POWER_COLORS = { rage: '#c71f1f', mana: '#0070de', energy: '#ffe14d' };
const PER_GROUP = 5;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

// Left of the middle, just right of the side menu.
export const RAID_FRAME_DEFAULTS = { show: true, locked: true, scale: 1, x: 136, y: 140, grow: 'columns' };

const short = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));

export class RaidFrames {
  // el: the frames' container; settings: settings.raidFrames (changed in place); save(): store the settings.
  constructor(el, settings, save) {
    this.el = el;
    this.s = settings;
    this.save = save;
    this.key = '';
    this.units = new Map(); // member id -> { el, hp, def, pow, last }
    this.bindMove();
    window.addEventListener('resize', () => this.place());
    this.place();
  }

  // Unlocked: drag to move, wheel to size.
  bindMove() {
    let drag = null;
    this.el.addEventListener('pointerdown', (e) => {
      if (this.s.locked || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      drag = { x: e.clientX - this.s.x, y: e.clientY - this.s.y };
      this.el.setPointerCapture(e.pointerId);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.s.x = e.clientX - drag.x;
      this.s.y = e.clientY - drag.y;
      this.place();
    });
    const drop = () => { if (drag) { drag = null; this.place(); this.save(); } };
    this.el.addEventListener('pointerup', drop);
    this.el.addEventListener('pointercancel', drop);
    this.el.addEventListener('wheel', (e) => {
      if (this.s.locked) return;
      e.preventDefault();
      e.stopPropagation();
      this.setScale(this.s.scale - Math.sign(e.deltaY) * 0.1);
    }, { passive: false });
  }

  setScale(v) {
    this.s.scale = Math.round(Math.max(MIN_SCALE, Math.min(MAX_SCALE, v)) * 100) / 100;
    this.place();
    this.save();
  }

  // Back to where they start, at the normal size.
  resetPosition() {
    Object.assign(this.s, { x: RAID_FRAME_DEFAULTS.x, y: RAID_FRAME_DEFAULTS.y, scale: RAID_FRAME_DEFAULTS.scale });
    this.place();
    this.save();
  }

  // Size, layout and position, kept inside the window.
  place() {
    const el = this.el;
    el.style.setProperty('--rf', this.s.scale);
    el.classList.toggle('unlocked', !this.s.locked);
    el.classList.toggle('stacked', this.s.grow === 'rows');
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = Math.max(0, Math.min(window.innerWidth - Math.min(w, window.innerWidth), this.s.x));
    const y = Math.max(0, Math.min(window.innerHeight - Math.min(h, window.innerHeight), this.s.y));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  // rows: [{ id, name, cls, host, me, hp, maxHp, power, maxPower, powerType }] in raid order. None: hidden.
  draw(rows) {
    const show = rows.length > 0 && this.s.show;
    this.el.classList.toggle('hidden', !show);
    if (!show) { this.key = ''; return; }
    const key = rows.map((r) => `${r.id}:${r.name}:${r.cls}:${r.host ? 1 : 0}`).join('|');
    if (key !== this.key) { this.build(rows); this.key = key; this.place(); }
    for (const r of rows) this.update(r);
  }

  build(rows) {
    this.units.clear();
    this.el.textContent = '';
    for (let g = 0; g < rows.length; g += PER_GROUP) {
      const group = document.createElement('div');
      group.className = 'rf-group';
      for (const r of rows.slice(g, g + PER_GROUP)) {
        const unit = document.createElement('div');
        unit.className = `rf-unit${r.me ? ' me' : ''}`;
        unit.innerHTML = `<div class="rf-hp"><div class="rf-fill"></div>${r.host ? '<i class="rf-lead" title="Group leader">♛</i>' : ''}<span class="rf-name"></span><span class="rf-def"></span></div><div class="rf-pow"><div class="rf-fill"></div></div>`;
        unit.querySelector('.rf-name').textContent = r.name;
        unit.querySelector('.rf-hp .rf-fill').style.background = CLASS_COLORS[r.cls] || CLASS_COLORS.warrior;
        group.appendChild(unit);
        this.units.set(r.id, { el: unit, hp: unit.querySelector('.rf-hp .rf-fill'), def: unit.querySelector('.rf-def'), pow: unit.querySelector('.rf-pow .rf-fill'), last: '' });
      }
      this.el.appendChild(group);
    }
  }

  // Only touches the page when something shown changed.
  update(r) {
    const u = this.units.get(r.id);
    if (!u) return;
    const hp = Math.max(0, Math.min(1, r.maxHp > 0 ? r.hp / r.maxHp : 1));
    const pow = Math.max(0, Math.min(1, r.maxPower > 0 ? r.power / r.maxPower : 0));
    const dead = r.maxHp > 0 && r.hp <= 0;
    const missing = r.maxHp - r.hp;
    const last = `${hp.toFixed(3)}|${pow.toFixed(2)}|${r.powerType}|${dead}`;
    if (last === u.last) return;
    u.last = last;
    u.hp.style.width = `${hp * 100}%`;
    u.pow.style.width = `${pow * 100}%`;
    u.pow.style.background = POWER_COLORS[r.powerType] || POWER_COLORS.rage;
    u.def.textContent = dead ? 'Dead' : missing >= 1 ? `-${short(missing)}` : '';
    u.el.classList.toggle('dead', dead);
  }
}
