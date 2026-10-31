// Sound for the trainer, all made in the browser with Web Audio (no sound files to license): effects for your
// attacks and what hits you, a GTFO-style alarm while you stand in fire (after the WoW addon GTFO), the raid pack's
// alert sounds, and music in one of two styles: Lofi, a song of its own for each encounter (js/music.js) and a soft
// lofi loop at the dummies; or EDM, a club track for each raid and the dummies (js/edm.js).
// settings.sound: { volume, muted, sfx, sfxVolume, music, musicVolume, musicStyle, gtfo } (main.js): sfx / music false
// mutes them; musicStyle 'lofi' | 'edm'.

// Least time between two plays of the same effect, so a burst of hits does not stack into noise.
const MIN_GAP = { hit: 0.05, yellow: 0.05, crit: 0.06, miss: 0.08, hurt: 0.08, block: 0.08, error: 0.25, proc: 0.3, alert: 0.3, warning: 0.5 };

import { SongPlayer, songFor } from './music.js';
import { EdmPlayer, edmFor } from './edm.js';

export const SOUND_DEFAULTS = { volume: 0.7, muted: false, sfx: true, sfxVolume: 1, music: true, musicVolume: 0.35, musicStyle: 'lofi', gtfo: true };
export const MUSIC_STYLES = { lofi: 'Lofi', edm: 'EDM' };

export class Sound {
  constructor(settings) {
    this.s = settings;
    this.ctx = null;
    this.last = {};
    this.gtfoLevel = null;
    this.gtfoTimer = null;
    this.music = null;
    this.songKey = null; // the encounter whose song plays (none: the lofi loop)
  }

  // The encounter's song (setSong(encounterKey)); a change fades the old one out and the new one in.
  setSong(key) {
    const next = songFor(key) ? key : null;
    if (next === this.songKey) return;
    this.songKey = next;
    if (!this.music) return;
    this.music.stop(1.5);
    this.music = this.newMusic();
    this.music.start();
  }

  newMusic() {
    if (this.s.musicStyle === 'edm') return new EdmPlayer(this.ctx, this.musicBus, this.noise, edmFor(this.songKey));
    const song = songFor(this.songKey);
    return song ? new SongPlayer(this.ctx, this.musicBus, this.noise, song) : new LofiMusic(this.ctx, this.musicBus, this.noise);
  }

  // Browsers start audio only after a click or a key press: called on the first one, and again whenever a setting
  // changes.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.apply();
  }

  // Volumes and on/off from the settings.
  apply() {
    if (!this.ctx) return;
    const s = this.s;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.volume, now, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx ? s.sfxVolume : 0, now, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music ? s.musicVolume : 0, now, 0.3);
    // A new style plays at once, crossfaded.
    if (s.music && this.music && (this.music instanceof EdmPlayer) !== (s.musicStyle === 'edm')) { this.music.stop(1.5); this.music = null; }
    if (s.music && !this.music) { this.music = this.newMusic(); this.music.start(); }
    if (!s.music && this.music) { const m = this.music; this.music = null; setTimeout(() => m.stop(0.05), 1200); }
    if (!s.gtfo) this.setGtfo(null);
  }

  // ---- building blocks -------------------------------------------------------------------------------

  // A tone: frequency (to `to` over the note if given), length, wave, loudness, attack and a filter.
  tone(freq, dur, { type = 'sine', gain = 0.3, attack = 0.005, to = null, when = 0, lowpass = 0, dest = this.sfxBus } = {}) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lowpass) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; o.connect(f); node = f; }
    node.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // A burst of filtered noise (a thump, a whoosh, a clang's sizzle).
  burst(dur, { type = 'lowpass', freq = 1000, to = null, q = 1, gain = 0.3, when = 0, dest = this.sfxBus } = {}) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  // ---- effects -----------------------------------------------------------------------------------------

  play(name) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.s.sfx) return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] || -1) < (MIN_GAP[name] || 0.02)) return;
    this.last[name] = now;
    switch (name) {
      case 'hit': // a white swing landing: a soft thump
        this.burst(0.09, { freq: 900, gain: 0.22 });
        this.tone(120, 0.1, { to: 60, gain: 0.18 });
        break;
      case 'yellow': // an ability landing: heavier, with a bite
        this.burst(0.12, { freq: 1400, gain: 0.26 });
        this.tone(150, 0.14, { to: 70, gain: 0.22 });
        this.tone(320, 0.08, { type: 'triangle', gain: 0.06 });
        break;
      case 'crit':
        this.burst(0.16, { freq: 1800, gain: 0.32 });
        this.burst(0.12, { type: 'bandpass', freq: 2800, q: 3, gain: 0.16 });
        this.tone(170, 0.18, { to: 60, gain: 0.28 });
        break;
      case 'miss': // a whoosh
        this.burst(0.18, { type: 'bandpass', freq: 700, to: 2600, q: 1.5, gain: 0.12 });
        break;
      case 'block': // shield or weapon clang (block, parry)
        this.tone(620, 0.28, { type: 'triangle', gain: 0.09 });
        this.tone(931, 0.22, { type: 'triangle', gain: 0.06 });
        this.burst(0.06, { type: 'highpass', freq: 3000, gain: 0.1 });
        break;
      case 'hurt': // you are hit
        this.tone(95, 0.2, { to: 48, gain: 0.3 });
        this.burst(0.14, { freq: 450, gain: 0.25 });
        break;
      case 'shout': // Battle Shout, Demoralizing Shout: a short horn
        this.tone(196, 0.55, { type: 'sawtooth', gain: 0.07, attack: 0.04, lowpass: 1100 });
        this.tone(294, 0.55, { type: 'sawtooth', gain: 0.05, attack: 0.05, lowpass: 1100 });
        break;
      case 'charge':
        this.burst(0.35, { type: 'bandpass', freq: 400, to: 1800, q: 1, gain: 0.16 });
        this.tone(110, 0.2, { to: 55, gain: 0.25, when: 0.3 });
        break;
      case 'stance':
        this.burst(0.03, { type: 'highpass', freq: 2500, gain: 0.12 });
        this.tone(440, 0.05, { type: 'triangle', gain: 0.05 });
        break;
      case 'error': // something you cannot do yet: a soft, low blip
        this.tone(150, 0.07, { type: 'square', gain: 0.035, lowpass: 900 });
        break;
      case 'proc': // Overpower / Revenge usable: a little chime
        this.tone(1320, 0.4, { gain: 0.08 });
        this.tone(1760, 0.35, { gain: 0.05, when: 0.06 });
        break;
      case 'tick': // pull countdown
        this.tone(880, 0.09, { gain: 0.1 });
        break;
      case 'go': // the pull: a gong
        for (const [f, g] of [[196, 0.16], [294, 0.08], [392, 0.06], [523, 0.03]]) this.tone(f, 1.6, { gain: g, attack: 0.004 });
        this.burst(0.2, { freq: 600, gain: 0.15 });
        break;
      case 'death':
        this.tone(330, 1.2, { to: 70, type: 'triangle', gain: 0.12 });
        break;
      case 'alert': // raid pack: a timer ran out (the WeakAuras "aggro" kind: two quick tones)
        this.tone(988, 0.09, { type: 'square', gain: 0.05, lowpass: 3000 });
        this.tone(740, 0.11, { type: 'square', gain: 0.05, lowpass: 3000, when: 0.1 });
        break;
      case 'warning': // raid pack: a special warning (raid warning horn)
        for (const [f, d] of [[523, 0], [659, 0], [784, 0]]) this.tone(f, 0.5, { type: 'sawtooth', gain: 0.035, attack: 0.02, lowpass: 2200, when: d });
        this.tone(1047, 0.25, { type: 'triangle', gain: 0.05, when: 0.18 });
        break;
      default: break;
    }
  }

  // ---- GTFO ------------------------------------------------------------------------------------------

  // While you stand in something that hurts, an alarm repeats like the GTFO addon's: 'high' (fire, the patch under
  // you) a fast harsh double beep, 'low' a slower single one; null stops it.
  setGtfo(level) {
    if (!this.s.gtfo || !this.ctx) level = null;
    if (level === this.gtfoLevel) return;
    this.gtfoLevel = level;
    clearInterval(this.gtfoTimer);
    this.gtfoTimer = null;
    if (!level) return;
    const beep = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (level === 'high') {
        this.tone(1250, 0.1, { type: 'square', gain: 0.07, attack: 0.002, lowpass: 4000 });
        this.tone(1250, 0.1, { type: 'square', gain: 0.07, attack: 0.002, lowpass: 4000, when: 0.15 });
      } else {
        this.tone(760, 0.14, { type: 'square', gain: 0.05, attack: 0.002, lowpass: 3000 });
      }
    };
    beep();
    this.gtfoTimer = setInterval(beep, level === 'high' ? 550 : 950);
  }
}

// ---- lofi music --------------------------------------------------------------------------------------------

// A cosy, endless lofi loop made on the fly: a jazzy four-chord progression on a soft electric piano, a round
// bass, a swung boom-bap beat, a little pentatonic melody now and then, and vinyl crackle. 74 BPM.
const BPM = 74;
const SWING = 0.58; // the off-beat sixteenths come late
// Cmaj9 - Am9 - Dm9 - G13, then Fmaj9 - Em7 - Dm9 - Gsus: MIDI voicings, bass root.
const PROGRESSIONS = [
  [[[60, 64, 67, 71, 74], 48], [[57, 60, 64, 67, 71], 45], [[62, 65, 69, 72, 76], 50], [[55, 59, 64, 65, 69], 43]],
  [[[65, 69, 72, 76, 79], 41], [[64, 67, 71, 74], 40], [[62, 65, 69, 72, 76], 50], [[55, 60, 62, 65, 69], 43]],
];
const PENTA = [72, 74, 76, 79, 81, 84]; // C major pentatonic, upper octave
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export class LofiMusic {
  constructor(ctx, dest, noise) {
    this.ctx = ctx;
    this.noise = noise;
    // Everything goes through a warm low-pass, like an old tape.
    this.out = ctx.createBiquadFilter();
    this.out.type = 'lowpass';
    this.out.frequency.value = 3200;
    this.fade = ctx.createGain();
    this.out.connect(this.fade);
    this.fade.connect(dest);
    this.step = 0;      // sixteenth notes since the start
    this.prog = 0;
    this.next = 0;      // audio time of the next step
    this.timer = null;
    this.mel = 2;       // index into PENTA for the melody's random walk
  }

  start() {
    this.next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
    this.crackle();
  }

  // Fades out over `secs`, then stops.
  stop(secs = 1.5) {
    const t = this.ctx.currentTime;
    this.fade.gain.setValueAtTime(1, t);
    this.fade.gain.exponentialRampToValueAtTime(0.0001, t + secs);
    setTimeout(() => {
      clearInterval(this.timer);
      clearInterval(this.crackleTimer);
      if (this.hiss) try { this.hiss.stop(); } catch { /* already stopped */ }
      this.fade.disconnect();
    }, secs * 1000 + 100);
  }

  // Schedules the steps that start in the next quarter second.
  schedule() {
    const sixteenth = 60 / BPM / 4;
    while (this.next < this.ctx.currentTime + 0.25) {
      const s = this.step % 16;
      const swing = s % 2 === 1 ? (SWING - 0.5) * 2 * sixteenth : 0;
      this.playStep(this.step, this.next + swing);
      this.next += sixteenth;
      this.step++;
    }
  }

  playStep(step, t) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    if (s === 0 && bar % 8 === 0 && bar) this.prog = (this.prog + 1) % PROGRESSIONS.length; // a new progression every 8 bars
    const [chord, root] = PROGRESSIONS[this.prog][bar % 4];
    // Keys: the chord on the one, a softer re-strike on the "and" of two.
    if (s === 0) this.keys(chord, t, 0.055, 2.6);
    if (s === 6 && Math.random() < 0.7) this.keys(chord.slice(1), t, 0.035, 1.4);
    // Bass on one and the "and" of two, sometimes a fifth on four.
    if (s === 0 || s === 6) this.bass(hz(root), t, s === 0 ? 0.9 : 0.4);
    if (s === 12 && Math.random() < 0.4) this.bass(hz(root + 7), t, 0.35);
    // Drums: kick on 1 and the "and" of 3, snare on 2 and 4, swung hats.
    if (s === 0 || s === 10) this.kick(t);
    if (s === 4 || s === 12) this.snare(t);
    if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.035 : 0.022);
    else if (Math.random() < 0.25) this.hat(t, 0.012);
    // Melody: a gentle random walk on the pentatonic, now and then.
    if (s % 2 === 0 && bar % 2 === 1 && Math.random() < 0.38) {
      this.mel = Math.max(0, Math.min(PENTA.length - 1, this.mel + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      this.pluck(hz(PENTA[this.mel]), t);
    }
  }

  // Soft electric piano: sine plus a quiet detuned triangle per note, slow decay.
  keys(notes, t, gain, len) {
    const c = this.ctx;
    for (const m of notes) {
      for (const [type, g, det] of [['sine', gain, 0], ['triangle', gain * 0.35, 6]]) {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = hz(m);
        o.detune.value = det + (Math.random() - 0.5) * 8; // a little tape wobble
        const e = c.createGain();
        e.gain.setValueAtTime(0.0001, t);
        e.gain.exponentialRampToValueAtTime(g, t + 0.02);
        e.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(e);
        e.connect(this.out);
        o.start(t);
        o.stop(t + len + 0.1);
      }
    }
  }

  bass(f, t, len) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const e = c.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    e.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(e);
    e.connect(this.out);
    o.start(t);
    o.stop(t + len + 0.1);
  }

  pluck(f, t) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const e = c.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.045, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(e);
    e.connect(this.out);
    o.start(t);
    o.stop(t + 0.8);
  }

  kick(t) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const e = c.createGain();
    e.gain.setValueAtTime(0.32, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(e);
    e.connect(this.out);
    o.start(t);
    o.stop(t + 0.4);
  }

  noiseHit(t, { type, freq, gain, len, q = 1 }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const e = c.createGain();
    e.gain.setValueAtTime(gain, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f);
    f.connect(e);
    e.connect(this.out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + len + 0.05);
  }

  snare(t) {
    this.noiseHit(t, { type: 'bandpass', freq: 1800, gain: 0.12, len: 0.22, q: 0.8 });
    const o = this.ctx.createOscillator();
    o.frequency.value = 185;
    const e = this.ctx.createGain();
    e.gain.setValueAtTime(0.05, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(e);
    e.connect(this.out);
    o.start(t);
    o.stop(t + 0.15);
  }

  hat(t, gain) { this.noiseHit(t, { type: 'highpass', freq: 7000, gain, len: 0.05 }); }

  // Vinyl: a quiet hiss under everything and random crackles.
  crackle() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 0.5;
    const g = c.createGain();
    g.gain.value = 0.006;
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    src.start();
    this.hiss = src;
    this.crackleTimer = setInterval(() => {
      const n = Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) this.noiseHit(c.currentTime + Math.random() * 0.3, { type: 'highpass', freq: 3000, gain: 0.02 + Math.random() * 0.04, len: 0.008 });
    }, 300);
  }
}
