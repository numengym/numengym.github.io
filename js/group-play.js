// Group play: several players fight the same dummies together, each in their own browser (net/group.js).
//   The host sets the fight (length, targets, how it ends, zone, drills) and the raid's buffs and debuffs, and
//   pulls, ends and resets for everyone. Each player keeps their own spec, gear, talents, consumables, keys and bars.
//   Each browser runs its own fight on its own copy of the encounter (engine/target.js); what players put on the
//   targets is passed on, so another warrior's Sunder Armor counts on your dummy, and in a health-pool fight
//   everyone's damage comes off the same pool.
//   The other players stand in your arena, swing when they hit and have name tags; the meter shows their DPS.
import * as THREE from 'three';
import { Group } from './net/group.js';
import { animateCharacter, disposeCharacter, makeCharacter } from './world/characters.js';

const STATE_EVERY = 0.1; // seconds between your position/DPS messages
const SPIN = new Set(['whirlwind', 'whirlwindOh']);
const NOT_A_SWING = new Set(['deepWounds', 'rend', 'touchOfTheGrave', 'sweepingStrikes']);

// Your health and power for the others' raid frames (warriors: rage).
const unitOf = (f) => ({ hp: Math.round(f.health), maxHp: Math.round(f.maxHealth), power: Math.floor(f.rage ?? 0), maxPower: f.maxRage ?? 100, powerType: 'rage' });

// Another player in the arena: their character, moved to where they say they are and animated by their swings.
class RemoteView {
  constructor(arena, member, container) {
    this.arena = arena;
    this.id = member.id;
    this.look = '';
    this.pos = new THREE.Vector3(0, 0, 8);
    this.want = new THREE.Vector3(0, 0, 8);
    this.yaw = Math.PI;
    this.moving = false;
    this.combat = false;
    this.spin = 0;
    this.model = null;
    this.tag = document.createElement('div');
    this.tag.className = 'player-tag';
    container.appendChild(this.tag);
    this.update(member);
  }

  // A member's info: name, race, gear look, transform (Noggenfogger).
  update(member) {
    const info = member.info || {};
    this.name = member.name;
    this.tag.textContent = `${member.name}${info.spec ? ` · ${info.spec}` : ''}`;
    const look = JSON.stringify([info.race, info.look, info.transform]);
    if (look === this.look) return;
    this.look = look;
    this.dispose(false);
    this.model = makeCharacter({ race: info.race || 'RaceOrc', role: 'player', gear: info.look || null, transform: info.transform || null });
    this.model.position.copy(this.pos);
    this.arena.scene.add(this.model);
  }

  setState(s) {
    this.want.set(s.x, 0, s.z);
    this.yaw = s.yaw;
    this.moving = !!s.moving;
    this.combat = !!s.combat;
  }

  animate(kind) {
    if (!this.model) return;
    const anim = this.model.userData.anim;
    if (kind === 'spin') { this.spin = 1; anim.spin = 1; } else if (kind === 'oh') anim.oh = 1; else anim.mh = 1;
  }

  frame(dt) {
    if (!this.model) return;
    const gap = this.want.distanceTo(this.pos);
    if (gap > 8) this.pos.copy(this.want); else this.pos.lerp(this.want, Math.min(1, dt * 12));
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    animateCharacter(this.model, { dt, speed: this.moving || gap > 0.2 ? 1 : 0, strafe: 0, air: false, combat: this.combat });
    if (this.spin > 0) {
      this.model.rotation.y = this.yaw + (1 - this.spin) * Math.PI * 2;
      this.spin = Math.max(0, this.spin - dt * 2.2);
    }
    const head = this.pos.clone().setY((this.model.userData.height || 2) + 0.35);
    const p = this.arena.toScreen(head);
    this.tag.style.display = p ? '' : 'none';
    if (p) { this.tag.style.left = `${p.x}px`; this.tag.style.top = `${p.y}px`; }
  }

  dispose(withTag = true) {
    if (this.model) { this.arena.scene.remove(this.model); disposeCharacter(this.model); this.model = null; }
    if (withTag) this.tag.remove();
  }
}

export class GroupPlay {
  // ctx (from main.js):
  //   arena, container: the arena and the element name tags go in
  //   info(): your { race, look, transform, spec } for the others to draw you
  //   hostSettings(): what the host shares ({ fight, raid }); applySettings(settings): a guest takes them
  //   pull(), end(): start the countdown / end the fight here
  //   onChange(): the group changed (panel, meter); say(text): a short message on screen
  constructor(ctx) {
    this.ctx = ctx;
    this.views = new Map();  // member id -> RemoteView
    this.stats = new Map();  // member id -> { dps, total, taken: [] }
    this.fight = null;
    this.ownDamage = [];
    this.sendIn = 0;
    this.group = new Group({
      onMessage: (m) => this.receive(m),
      onMembers: (members) => this.syncMembers(members),
      onStatus: (text, ok) => { this.status = { text, ok }; this.ctx.onChange(); },
    });
    this.status = { text: 'Not in a group', ok: true };
  }

  get active() { return this.group.active; }
  get isHost() { return this.group.isHost; }
  get key() { return this.group.key; }
  get members() { return this.group.members; }

  async host(name) {
    await this.group.host(name, this.ctx.info());
    this.shareSettings();
    this.ctx.onChange();
  }

  async join(key, name) {
    await this.group.join(key, name, this.ctx.info());
    this.ctx.onChange();
  }

  leave() {
    this.group.leave();
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.stats.clear();
    this.status = { text: 'Not in a group', ok: true };
    this.ctx.onChange();
  }

  // Your look changed (race, gear, spec, Noggenfogger).
  updateInfo() { if (this.active) this.group.updateInfo(this.ctx.info()); }

  rename(name) { if (this.active) this.group.rename(name); }

  shareSettings() { if (this.active && this.isHost) this.group.broadcast({ type: 'settings', settings: this.ctx.hostSettings() }); }

  // The host pulls, ends and resets for everyone.
  pull() { if (this.isHost) this.group.broadcast({ type: 'pull' }); }
  end() { if (this.isHost) this.group.broadcast({ type: 'end' }); }
  reset() { if (this.isHost) this.group.broadcast({ type: 'reset' }); }

  syncMembers(members) {
    const ids = new Set(members.map((m) => m.id));
    for (const [id, v] of this.views) if (!ids.has(id)) { v.dispose(); this.views.delete(id); this.stats.delete(id); }
    for (const m of members) {
      if (m.id === this.group.myId) continue;
      const v = this.views.get(m.id);
      if (v) v.update(m); else this.views.set(m.id, new RemoteView(this.ctx.arena, m, this.ctx.container));
    }
    if (this.isHost) this.shareSettings(); // someone new gets the fight and raid settings right away
    this.ctx.onChange();
  }

  // A new fight here: the host tells everyone the settings it was made with.
  attach(fight) {
    this.fight = fight;
    for (const s of this.stats.values()) s.taken = [];
    // Your own damage per target this fight: what you send for the shared health pool.
    const own = [];
    this.ownDamage = own;
    fight.on((ev) => { if (ev.type === 'damage' && ev.amount > 0) own[ev.target] = (own[ev.target] || 0) + ev.amount; });
    if (this.isHost) this.shareSettings();
  }

  // Your fight's events that matter to the others: debuffs on the shared targets and your swings.
  onLocalEvent(ev) {
    if (!this.active) return;
    const f = this.fight;
    if (ev.type === 'sunder' && ev.outcome !== 'miss' && ev.outcome !== 'dodge' && ev.outcome !== 'parry') this.group.share({ type: 'debuff', kind: 'sunder', target: f.primary });
    else if (ev.type === 'shatter') this.group.share({ type: 'debuff', kind: 'shatter', target: ev.target, duration: ev.duration });
    else if (ev.type === 'cast' && ev.id === 'whirlwind') this.group.share({ type: 'anim', kind: 'spin' });
    else if (ev.type === 'damage' && !ev.key.startsWith('proc') && !NOT_A_SWING.has(ev.key) && !SPIN.has(ev.key)) this.group.share({ type: 'anim', kind: ev.key === 'oh' ? 'oh' : 'mh' });
  }

  receive(m) {
    const f = this.fight;
    switch (m.type) {
      case 'settings': if (!this.isHost) this.ctx.applySettings(m.settings); break;
      case 'pull': if (!this.isHost) this.ctx.pull(); break;
      case 'end': if (!this.isHost) this.ctx.end(); break;
      case 'reset': if (!this.isHost) this.ctx.reset(); break;
      case 'hostLeft': this.leave(); this.ctx.say('The host left the group'); break;
      case 'left': { const v = this.views.get(m.from); if (v) { v.dispose(); this.views.delete(m.from); } this.stats.delete(m.from); this.ctx.onChange(); break; }
      case 'debuff': {
        // Their debuff on the shared target, on your copy of it.
        if (!f || !f.started || f.over) break;
        const t = f.targets[m.target];
        if (!t) break;
        if (m.kind === 'sunder') f.enc.addSunder(t, f.t);
        if (m.kind === 'shatter') f.enc.addShatter(t, f.t, m.duration || 45);
        break;
      }
      case 'anim': { const v = this.views.get(m.from); if (v) v.animate(m.kind); break; }
      case 'state': {
        const v = this.views.get(m.from);
        if (v) v.setState(m);
        const s = this.stats.get(m.from) || { dps: 0, total: 0, taken: [] };
        s.dps = m.dps;
        s.total = m.total;
        Object.assign(s, { hp: m.hp, maxHp: m.maxHp, power: m.power, maxPower: m.maxPower, powerType: m.powerType });
        // Health pools: their damage on each target comes off your copy of it too.
        if (f && f.started && !f.over && f.endMode === 'health' && Array.isArray(m.taken)) {
          m.taken.forEach((amount, i) => {
            const delta = amount - (s.taken[i] || 0);
            if (delta > 0) f.woundTarget(i, delta);
          });
        }
        s.taken = m.taken || [];
        this.stats.set(m.from, s);
        break;
      }
      default: break;
    }
  }

  // Every frame: move the others, and about ten times a second tell them where you are and how you are doing.
  frame(dt, f) {
    for (const v of this.views.values()) v.frame(dt);
    if (!this.active || !f) return;
    this.sendIn -= dt;
    if (this.sendIn > 0) return;
    this.sendIn = STATE_EVERY;
    const a = this.ctx.arena;
    const p = a.player.position;
    const taken = f.targets.map((t) => Math.round(this.ownDamage[t.i] || 0));
    this.group.share({ type: 'state', x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +a.yaw.toFixed(3), moving: !!f.geo.moving, combat: f.started && !f.over, dps: Math.round(f.dps()), total: Math.round(f.total), taken, ...unitOf(f) });
  }

  // The raid frames: everyone in the group in raid order (the host first, then as they joined), you included.
  raidRows(f) {
    return this.members.map((m) => {
      const me = m.id === this.group.myId;
      const s = me ? unitOf(f) : this.stats.get(m.id) || {};
      return {
        id: m.id, name: m.name, cls: (m.info && m.info.cls) || 'warrior', host: !!m.host, me,
        hp: s.hp ?? 1, maxHp: s.maxHp ?? 1, power: s.power ?? 0, maxPower: s.maxPower ?? 100, powerType: s.powerType || 'rage',
      };
    });
  }

  // Everyone's DPS for the meter: you first, then the others by DPS.
  meterRows(myName, myDps) {
    const rows = [{ name: myName, dps: myDps, me: true }];
    for (const m of this.members) {
      if (m.id === this.group.myId) continue;
      const s = this.stats.get(m.id);
      rows.push({ name: m.name, dps: s ? s.dps : 0, spec: m.info && m.info.spec });
    }
    return [rows[0], ...rows.slice(1).sort((a, b) => b.dps - a.dps)];
  }
}
