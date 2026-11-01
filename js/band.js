// Radio Numen's band songs (js/radio.js): rock, metal, blues and country instrumentals. Built on the modern EDM player's
// mix (edm-modern.js: compressor, limiter, reverb, delay) with instruments of their own: plucked strings by Karplus-Strong
// synthesis (distorted for rock and metal, clean for country), a bass, an organ, a fiddle, and drum patterns per genre
// (a triplet shuffle for the blues). No sung or rapped vocals: AI voices cannot carry them.
import { ModernEdmPlayer } from './edm-modern.js';
import { hz } from './music.js';

// The recorded clips, found from this file (so the tools' pages find them too).
export const CLIPS = new URL('../assets/radio/', import.meta.url).href;

// A clip's name: a hash of its words (radio.js uses it for the hosts' lines too).
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// The silence a recording starts and ends with, cut down to `pad` seconds.
export function trimSilence(ctx, buf, pad) {
  const data = buf.getChannelData(0);
  const loud = (i) => Math.abs(data[i]) > 0.012;
  let a = 0;
  let b = data.length - 1;
  while (a < b && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  const p = Math.round(pad * buf.sampleRate);
  a = Math.max(0, a - p);
  b = Math.min(data.length - 1, b + p);
  if (b - a < 16) return buf;
  const out = ctx.createBuffer(buf.numberOfChannels, b - a + 1, buf.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) out.copyToChannel(buf.getChannelData(ch).subarray(a, b + 1), ch);
  return out;
}

// The songs. genre: 'rock', 'metal', 'blues', 'country'; chords: scale degrees, a bar each (the blues: its twelve bars, in
// semitones).
export const BAND_TRACKS = {
  parkingTicket: { name: 'Parking Ticket', style: 'Rock', genre: 'rock', bpm: 142, root: 52, scale: 'minor', chords: [0, 0, 5, 6, 0, 0, 3, 4], seed: 301, level: 0.46, kick: 'punch' },
  microwaveBlues: { name: 'Microwave Blues', style: 'Blues', genre: 'blues', bpm: 82, root: 45, scale: 'pentaMinor', twelveBar: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], shuffle: true, seed: 307, level: 0.69, kick: 'punch' },
  taxSeason: { name: 'Tax Season', style: 'Thrash metal', genre: 'metal', thrash: true, bpm: 184, root: 40, scale: 'phrygian', chords: [0, 0, 1, 0, 0, 0, 6, 5], seed: 401, level: 0.22, kick: 'punch' },
  dentistAppointment: { name: 'Dentist Appointment', style: 'Groove metal', genre: 'metal', bpm: 96, root: 38, scale: 'minor', chords: [0, 0, 3, 1], seed: 409, level: 0.32, kick: 'big' },
  twoLeftBoots: { name: 'Two Left Boots', style: 'Country', genre: 'country', bpm: 116, root: 43, scale: 'major', chords: [0, 0, 3, 3, 4, 4, 0, 0], seed: 311, level: 0.69, kick: 'punch' },
};

// Plucked-string samples (Karplus-Strong), made once per note and damping in each audio context.
const STRINGS = new WeakMap();
function stringBuffer(ctx, midi, damp, secs) {
  let cache = STRINGS.get(ctx);
  if (!cache) STRINGS.set(ctx, (cache = new Map()));
  const key = `${midi}|${damp}|${secs}`;
  if (cache.has(key)) return cache.get(key);
  const sr = ctx.sampleRate;
  const n = Math.max(2, Math.round(sr / hz(midi)));
  const len = Math.floor(sr * secs);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const ring = new Float32Array(n);
  for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % n;
    d[i] = ring[idx];
    ring[idx] = damp * 0.5 * (ring[idx] + ring[next]);
    idx = next;
  }
  cache.set(key, buf);
  return buf;
}

export class BandPlayer extends ModernEdmPlayer {
  constructor(ctx, dest, noise, track, key) {
    super(ctx, dest, noise, track);
    this.key = key;
    // The band plays without the EDM pump.
    this.pump.gain.value = 1;
    this.perBeat = track.shuffle ? 3 : 4; // a blues shuffle counts in triplets
    this.perBar = this.perBeat * 4;
    this.plan = this.planOf();
    this.ended = false;
  }

  // The song's sections and bars.
  planOf() {
    if (this.track.genre === 'blues') return [['intro', 2], ['rhythm', 24], ['solo', 24], ['rhythm', 12], ['solo', 12], ['outro', 2]];
    return [['intro', 4], ['A', 16], ['B', 8], ['A', 16], ['solo', 16], ['B', 8], ['outro', 4]];
  }

  sectionAt(bar) {
    let b = bar;
    for (const [name, n] of this.plan) {
      if (b < n) return { name, at: b, bars: n };
      b -= n;
    }
    return null;
  }

  schedule() {
    const stepLen = 60 / this.track.bpm / this.perBeat;
    while (this.next < this.ctx.currentTime + 0.25) {
      this.playStep(this.step, this.next, stepLen);
      this.next += stepLen;
      this.step++;
    }
  }

  playStep(step, t, stepLen) {
    const tr = this.track;
    const bar = Math.floor(step / this.perBar);
    const st = step % this.perBar;
    const sec = this.sectionAt(bar);
    if (!sec) {
      if (!this.ended) { this.ended = true; if (this.onRound) this.onRound(); }
      return;
    }
    const beat = st / this.perBeat; // 0..4
    const onBeat = st % this.perBeat === 0;
    const barLen = stepLen * this.perBar;
    if (st === 0 && sec.at === 0 && sec.name !== 'intro') this.crash(t);
    switch (tr.genre) {
      case 'rock': this.rock(sec, bar, st, t, stepLen, barLen); break;
      case 'blues': this.blues(sec, bar, st, beat, onBeat, t, stepLen, barLen); break;
      case 'country': this.country(sec, bar, st, t, stepLen, barLen); break;
      case 'metal': this.metal(sec, bar, st, t, stepLen, barLen); break;
      default: break;
    }
  }

  crash(t) { this.noiseHit(t, 'highpass', 5000, 0.05, 1.8, 0.5, this.fxBus); }

  // ---- the genres -----------------------------------------------------------------------------------------------------

  rock(sec, bar, st, t, stepLen, barLen) {
    const deg = this.track.chords[bar % this.track.chords.length];
    const root = this.note(deg, -1);
    const full = sec.name !== 'intro' && sec.name !== 'outro';
    // Drums: a driving beat, the hats in eighths, the kick pushing ahead into the chorus.
    if (full || sec.at >= 2) {
      if (st === 0 || st === 8 || (sec.name === 'B' && st === 10) || st === 7) this.kick(t);
      if (st === 4 || st === 12) this.snare(t, 1);
      if (st % 2 === 0) this.hat(t, sec.name === 'B' ? 0.05 : 0.035, sec.name === 'B' && st % 4 === 2);
    }
    // Guitars: palm-muted eighths on the root in the verses, ringing power chords in the chorus and the solo.
    if (sec.name === 'A' || sec.name === 'intro') { if (st % 2 === 0) this.guitar([root, root + 7], t, stepLen * 1.6, 0.05, { mute: true }); }
    else if (st === 0 || st === 6 || st === 10) this.guitar([root, root + 7, root + 12], t, barLen * (st ? 0.25 : 0.38), 0.06);
    if (full && st % 2 === 0) this.bassNote(root - 12, t, stepLen * 1.8, 0.24);
    if (sec.name === 'solo' || sec.name === 'B') this.lead(bar, st, t, stepLen, 'rock');
  }

  blues(sec, bar, st, beat, onBeat, t, stepLen, barLen) {
    const semi = this.track.twelveBar[bar % 12];
    const root = this.track.root + semi;
    const shuffle = st % 3 !== 1; // the triplet's first and last
    if (sec.name !== 'intro' || sec.at === 1) {
      if (onBeat && (beat === 0 || beat === 2)) this.kick(t);
      if (onBeat && (beat === 1 || beat === 3)) this.snare(t, 0.7);
      if (shuffle) this.hat(t, st % 3 ? 0.018 : 0.03, false); // the ride's shuffle
    }
    // The shuffle bass: root, third, fifth, sixth up and back, on the shuffled eighths.
    if (sec.name !== 'intro' && shuffle) {
      const walk = [0, 4, 7, 9, 10, 9, 7, 4];
      this.bassNote(root - 12 + walk[(Math.floor(st / 3) * 2 + (st % 3 ? 1 : 0)) % 8], t, stepLen * 1.6, 0.22);
    }
    // The rhythm guitar's shuffle, root and fifth to sixth; the organ holding the dominant seventh.
    if (shuffle && sec.name !== 'outro') this.guitar([root, root + (st % 6 < 3 ? 7 : 9)], t, stepLen * 1.4, 0.035, { mute: true, clean: true });
    if (st === 0) this.organ([root + 12, root + 16, root + 19, root + 22], t, barLen, 0.016);
    if (sec.name === 'solo') this.lead(bar, st, t, stepLen, 'blues');
    if (sec.name === 'outro' && st === 0 && sec.at === sec.bars - 1) this.guitar([root, root + 7, root + 10, root + 16], t, 3, 0.05, { clean: true });
  }

  country(sec, bar, st, t, stepLen, barLen) {
    const deg = this.track.chords[bar % this.track.chords.length];
    const chord = [0, 2, 4].map((i) => this.note(deg + i, 0));
    const root = this.note(deg, -1);
    // The train beat: kick on one and three, a brushed snare on two and four, sixteenths on the hat.
    if (sec.name !== 'intro' || sec.at >= 2) {
      if (st === 0 || st === 8) this.kick(t);
      if (st === 4 || st === 12) this.snare(t, 0.55);
      this.hat(t, st % 4 === 0 ? 0.022 : 0.012, false);
    }
    // Boom-chick: the bass on one and three (root, then fifth), a strum on two and four.
    if (st === 0 || st === 8) this.bassNote(st === 0 ? root - 12 : root - 5, t, stepLen * 3, 0.24);
    if (st === 4 || st === 12) this.guitar(chord, t, stepLen * 3, 0.035, { clean: true });
    if (sec.name === 'B' || sec.name === 'solo') this.lead(bar, st, t, stepLen, 'country');
  }

  // Metal: double-tracked, low and heavily driven. Thrash gallops with the double kick and blasts through the chorus;
  // groove metal chugs a syncopated riff over a half-time beat.
  metal(sec, bar, st, t, stepLen, barLen) {
    const tr = this.track;
    const deg = tr.chords[bar % tr.chords.length];
    const root = this.note(deg, 0);
    const full = sec.name !== 'intro' || sec.at >= 2;
    const blast = tr.thrash && sec.name === 'B';
    if (full) {
      if (tr.thrash) {
        if (blast) { this.kick(t); if (st % 2) this.snare(t, 0.7); }
        else {
          if (st % 4 !== 1) this.kick(t); // the double kick under the gallop
          if (st === 4 || st === 12) this.snare(t, 1);
        }
        if (st % 2 === 0) this.hat(t, 0.03, blast);
      } else {
        if (this.groove[st] || st === 0) this.kick(t);
        if (st === 8) this.snare(t, 1);
        if (st % 4 === 0) this.hat(t, 0.045, true); // the ride
      }
    }
    // Guitars: the gallop (x.xx) or the groove's chugs, open power chords at each bar's top in the chorus.
    const chug = tr.thrash ? st % 4 !== 1 : this.groove[st];
    if (sec.name === 'B' && !tr.thrash && st === 0) this.guitar([root, root + 7, root + 12], t, barLen * 0.9, 0.06, { wide: true });
    else if (sec.name === 'B' && tr.thrash && st % 8 === 0) this.guitar([root, root + 7, root + 12], t, stepLen * 7.5, 0.06, { wide: true });
    else if (chug && sec.name !== 'outro') this.guitar([root, root + 7], t, stepLen * 0.95, 0.055, { mute: true, wide: true, heavy: true });
    if (full && chug) this.bassNote(root - 12, t, stepLen * 0.95, 0.22);
    if (sec.name === 'solo') this.lead(bar, st, t, stepLen * (tr.thrash ? 0.5 : 1), 'rock');
    if (sec.name === 'outro' && sec.at === sec.bars - 1 && st === 0) this.guitar([root, root + 7, root + 12], t, 3, 0.06, { wide: true });
  }

  // A melody over the chords, from the song's hook (edm.js compose), voiced for the genre.
  lead(bar, st, t, stepLen, kind) {
    for (const n of this.melody[bar % this.melody.length]) {
      if (n.step !== st) continue;
      const m = this.note(n.degree, kind === 'country' ? 1 : 0) + (kind === 'blues' ? 12 : 0);
      if (kind === 'country') this.fiddle(hz(m), t, stepLen * n.len * 1.4, 0.03);
      else this.guitar([m], t, Math.max(0.3, stepLen * n.len * 1.6), kind === 'rock' ? 0.05 : 0.045, { lead: true, clean: kind === 'blues' && false });
    }
  }

  // ---- the instruments ------------------------------------------------------------------------------------------------

  // A guitar: plucked strings, strummed a few milliseconds apart; distorted unless clean, palm-muted (short and dark)
  // when muted.
  // wide: double-tracked, one take hard left and a second, a hair late, hard right (metal); heavy: driven harder.
  guitar(midis, t, len, gain, { mute = false, clean = false, lead = false, wide = false, heavy = false } = {}) {
    const c = this.ctx;
    const out = this.env(t, gain, 0.002, len, lead ? this.leadBus : this.padBus);
    const tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = mute ? (heavy ? 2200 : 1400) : clean ? 5000 : 3600;
    tone.connect(out);
    let into = tone;
    if (!clean) {
      const drive = this.shaper(heavy ? 14 : lead ? 9 : 6);
      drive.connect(tone);
      into = drive;
    }
    const takes = wide ? [[-0.9, 0], [0.9, 0.012]] : [[0, 0]];
    for (const [pan, late] of takes) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      p.connect(into);
      midis.forEach((m, i) => {
        const src = c.createBufferSource();
        src.buffer = stringBuffer(c, Math.round(m), mute ? 0.985 : 0.997, 2);
        src.detune.value = late ? 6 : 0;
        const g = c.createGain();
        g.gain.value = clean ? 1 : 0.6;
        src.connect(g);
        g.connect(p);
        src.start(t + late + i * 0.011);
        src.stop(t + late + len + 0.1);
      });
    }
  }

  bassNote(m, t, len, gain) {
    const c = this.ctx;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(this.env(t, gain, 0.003, len, this.out));
    const src = c.createBufferSource();
    src.buffer = stringBuffer(c, Math.round(m), 0.996, 2);
    src.connect(lp);
    src.start(t);
    src.stop(t + len + 0.1);
    this.osc('sine', hz(m), t, len, this.env(t, gain * 0.5, 0.005, len, this.out));
  }

  // An organ: drawbars of sine harmonics with a tremolo.
  organ(midis, t, len, gain) {
    const c = this.ctx;
    const e = this.env(t, gain, 0.03, len, this.padBus);
    const trem = c.createGain();
    const lfo = c.createOscillator();
    lfo.frequency.value = 6;
    const depth = c.createGain();
    depth.gain.value = 0.3;
    lfo.connect(depth);
    depth.connect(trem.gain);
    trem.connect(e);
    for (const m of midis) for (const [k, g] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.2]]) this.osc('sine', hz(m) * k, t, len, (() => { const x = c.createGain(); x.gain.value = g; x.connect(trem); return x; })());
    lfo.start(t);
    lfo.stop(t + len + 0.05);
  }

  // A fiddle: a sawtooth with a slow bow and vibrato.
  fiddle(f, t, len, gain) {
    const c = this.ctx;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.connect(this.env(t, gain, 0.06, len, this.leadBus));
    const o = this.osc('sawtooth', f, t, len, lp);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = c.createGain();
    depth.gain.value = 18;
    lfo.connect(depth);
    depth.connect(o.detune);
    lfo.start(t);
    lfo.stop(t + len + 0.05);
  }
}
