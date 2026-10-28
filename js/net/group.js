// Group connection over WebRTC, browser to browser, with PeerJS and its free public connection service (it only
// introduces the browsers; the game's messages go directly between them). One player hosts: their room key is
// what the others type to join. The host relays: a guest's messages go to the host, who passes them on to the
// other guests. Messages are small JSON objects: { type, from, ... }.
import { Peer } from 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/+esm';

const PREFIX = 'numen-gym-room-';
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to mix up
const MAX_GUESTS = 39; // a 40-player raid

export const makeKey = () => Array.from({ length: 6 }, () => KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)]).join('');

// "?localgroup" in the address: tabs of this browser talk through a BroadcastChannel instead of WebRTC (testing,
// or two windows on one PC). It stands in for the few PeerJS calls used here.
const LOCAL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('localgroup');
class LocalConn {
  constructor(channel, me, other) {
    this.ch = channel; this.me = me; this.peer = other; this.open = false; this.handlers = {};
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  fire(ev, arg) { for (const fn of this.handlers[ev] || []) fn(arg); }
  send(msg) { this.ch.postMessage({ kind: 'data', from: this.me, to: this.peer, msg }); }
  close() { this.ch.postMessage({ kind: 'close', from: this.me, to: this.peer }); this.open = false; this.fire('close'); }
}
class LocalPeer {
  constructor(id) {
    this.id = id || `local-${Math.random().toString(36).slice(2, 10)}`;
    this.open = true; this.destroyed = false; this.handlers = {}; this.conns = new Map();
    this.ch = new BroadcastChannel('numen-gym-local-group');
    this.ch.onmessage = ({ data }) => {
      if (data.to !== this.id) return;
      if (data.kind === 'connect') {
        const conn = new LocalConn(this.ch, this.id, data.from);
        this.conns.set(data.from, conn);
        this.fire('connection', conn);
        conn.open = true;
        conn.fire('open');
        this.ch.postMessage({ kind: 'accept', from: this.id, to: data.from });
      } else if (data.kind === 'accept') {
        const conn = this.conns.get(data.from);
        if (conn) { conn.open = true; conn.fire('open'); }
      } else if (data.kind === 'data') {
        const conn = this.conns.get(data.from);
        if (conn) conn.fire('data', data.msg);
      } else if (data.kind === 'close') {
        const conn = this.conns.get(data.from);
        if (conn) { conn.open = false; this.conns.delete(data.from); conn.fire('close'); }
      }
    };
    setTimeout(() => this.fire('open', this.id), 0);
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  fire(ev, arg) { for (const fn of this.handlers[ev] || []) fn(arg); }
  connect(id) {
    const conn = new LocalConn(this.ch, this.id, id);
    this.conns.set(id, conn);
    this.ch.postMessage({ kind: 'connect', from: this.id, to: id });
    return conn;
  }
  reconnect() {}
  destroy() {
    for (const conn of this.conns.values()) conn.close();
    this.destroyed = true; this.open = false; this.ch.close();
  }
}

function openPeer(id) {
  return new Promise((resolve, reject) => {
    const peer = LOCAL ? new LocalPeer(id) : id ? new Peer(id) : new Peer();
    const timer = setTimeout(() => { peer.destroy(); reject(new Error('The connection service did not answer')); }, 12000);
    peer.on('open', () => { clearTimeout(timer); resolve(peer); });
    peer.on('error', (e) => { clearTimeout(timer); reject(new Error(e.type === 'unavailable-id' ? 'That room key is taken, try again' : e.message || e.type)); });
  });
}

export class Group {
  // handlers: { onMessage(msg), onMembers(members), onStatus(text, ok) }
  constructor(handlers) {
    this.h = handlers;
    this.peer = null;
    this.key = null;
    this.isHost = false;
    this.myId = null;
    this.conns = new Map(); // host: guest id -> connection
    this.hostConn = null;   // guest: the connection to the host
    this.members = [];      // [{ id, name, info }]
    this.myInfo = null;
  }

  get active() { return !!this.peer; }

  async host(name, info) {
    this.key = makeKey();
    this.peer = await openPeer(PREFIX + this.key);
    this.isHost = true;
    this.myId = 'host';
    this.myInfo = info;
    this.members = [{ id: 'host', name, info, host: true }];
    this.peer.on('connection', (conn) => this.accept(conn));
    this.peer.on('disconnected', () => this.peer && this.peer.reconnect());
    this.h.onMembers(this.members);
    this.h.onStatus(`Hosting. Room key ${this.key}`, true);
    return this.key;
  }

  accept(conn) {
    if (this.conns.size >= MAX_GUESTS) { conn.on('open', () => conn.close()); return; }
    conn.on('open', () => this.conns.set(conn.peer, conn));
    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      msg.from = conn.peer; // the host stamps who it came from
      if (msg.type === 'hello') {
        this.members = this.members.filter((m) => m.id !== conn.peer).concat({ id: conn.peer, name: String(msg.name || 'Player').slice(0, 24), info: msg.info });
        this.sendMembers();
      } else if (msg.type === 'info') {
        const m = this.members.find((x) => x.id === conn.peer);
        if (m) { m.info = msg.info; this.sendMembers(); }
      }
      if (msg.relay) for (const [id, c] of this.conns) if (id !== conn.peer && c.open) c.send(msg);
      this.h.onMessage(msg);
    });
    conn.on('close', () => {
      this.conns.delete(conn.peer);
      this.members = this.members.filter((m) => m.id !== conn.peer);
      this.sendMembers();
      this.h.onMessage({ type: 'left', from: conn.peer });
    });
  }

  sendMembers() {
    this.broadcast({ type: 'members', members: this.members });
    this.h.onMembers(this.members);
  }

  async join(key, name, info) {
    key = String(key || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(key)) throw new Error('A room key is 6 letters and numbers');
    this.peer = await openPeer();
    this.myId = this.peer.id;
    this.myInfo = info;
    const conn = this.peer.connect(PREFIX + key, { reliable: true });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No room with that key answered')), 12000);
      conn.on('open', () => { clearTimeout(timer); resolve(); });
      conn.on('error', (e) => { clearTimeout(timer); reject(e); });
      this.peer.on('error', (e) => { clearTimeout(timer); reject(new Error(e.type === 'peer-unavailable' ? 'No room with that key' : e.message || e.type)); });
    });
    this.key = key;
    this.hostConn = conn;
    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'members') { this.members = msg.members; this.h.onMembers(this.members); }
      this.h.onMessage(msg);
    });
    conn.on('close', () => { this.h.onStatus('The host left the room', false); this.h.onMessage({ type: 'hostLeft' }); this.leave(); });
    conn.send({ type: 'hello', name, info });
    this.h.onStatus(`In room ${key}`, true);
  }

  // Host: to every guest. Guest: to the host, who relays it to the others when relay is set.
  broadcast(msg) {
    msg.from = this.myId;
    if (this.isHost) { for (const c of this.conns.values()) if (c.open) c.send(msg); } else if (this.hostConn && this.hostConn.open) this.hostConn.send(msg);
  }

  // A message for every other player (a guest's goes through the host).
  share(msg) { this.broadcast({ ...msg, relay: true }); }

  updateInfo(info) {
    this.myInfo = info;
    if (this.isHost) {
      const me = this.members.find((m) => m.id === 'host');
      if (me) { me.info = info; this.sendMembers(); }
    } else this.broadcast({ type: 'info', info });
  }

  leave() {
    const peer = this.peer;
    this.peer = null;
    this.conns.clear();
    this.hostConn = null;
    this.members = [];
    this.isHost = false;
    this.key = null;
    if (peer) peer.destroy();
    this.h.onMembers([]);
  }
}
