// EDM, the other music style (Settings → Sound): a track for the training dummies and one for each raid, made on the fly
// with Web Audio like the rest of the trainer's sound. A track plays in sections, as a club track does: an intro, a
// build with a snare roll and a riser into the drop (four-on-the-floor kick, claps, open hats, a supersaw chord stab
// pumping under the kick, the bass, the lead), a breakdown, another build, another drop, round again. Each boss plays
// its raid's track in its own key and with a lead of its own (music.js SONGS: shift, seed).
import { SCALES, SONGS, hz, seeded } from './music.js';

// The tracks. bpm; root (MIDI) and scale; chords (scale degrees, two bars each); bass: 'offbeat' (house), 'rolling'
// (sixteenths), 'wobble' (a held note through a swinging filter, half-time drums); lead: its voice; arp: the chord's
// notes in sixteenths through the intro and the builds; extra percussion; level so every track plays about as loud.
const TRACKS = {
  dummies: { name: 'Training Floor', bpm: 124, root: 57, scale: 'minor', chords: [5, 3, 0, 4], bass: 'offbeat', lead: 'pluck', arp: true, seed: 3, level: 0.68 },
  ragefire: { name: 'Ragefire', bpm: 128, root: 50, scale: 'dorian', chords: [0, 6, 5, 6], bass: 'rolling', lead: 'square', arp: true, seed: 11, level: 0.65 },
  onyxia: { name: 'Broodmother', bpm: 140, root: 50, scale: 'minor', chords: [0, 5, 3, 4], bass: 'wobble', lead: 'saw', half: true, seed: 23, level: 0.61 },
  moltenCore: { name: 'Core Meltdown', bpm: 128, root: 52, scale: 'phrygian', chords: [0, 1, 0, 6], bass: 'rolling', lead: 'saw', arp: true, seed: 31, level: 0.61 },
  blackwingLair: { name: 'Black Wing', bpm: 126, root: 48, scale: 'harmonic', chords: [0, 5, 3, 4], bass: 'offbeat', lead: 'square', arp: true, seed: 61, level: 0.65 },
  naxxramas: { name: 'Necropolis', bpm: 122, root: 47, scale: 'minor', chords: [0, 1, 0, 4], bass: 'rolling', lead: 'bell', arp: true, seed: 79, level: 0.68 },
  zulGurub: { name: 'Jungle Heat', bpm: 112, root: 57, scale: 'pentaMinor', chords: [0, 3, 2, 3], bass: 'offbeat', lead: 'marimba', shaker: true, seed: 101, level: 0.68 },
  ruinsOfAhnQiraj: { name: 'Sandstorm Ruins', bpm: 124, root: 50, scale: 'hijaz', chords: [0, 1, 0, 6], bass: 'offbeat', lead: 'oud', shaker: true, seed: 131, level: 0.68 },
};

// A section a bar is in: the 64-bar round (intro 8, build 8, drop 16, breakdown 8, build 8, drop 16).
const ROUND = [['intro', 8], ['build', 8], ['drop', 16], ['break', 8], ['build', 8], ['drop', 16]];
const ROUND_BARS = ROUND.reduce((a, [, n]) => a + n, 0);
function sectionOf(bar) {
  let b = bar % ROUND_BARS;
  for (const [name, n] of ROUND) {
    if (b < n) return { name, at: b, bars: n };
    b -= n;
  }
  return { name: 'drop', at: 0, bars: 16 };
}

// The track for an encounter (null for none: the dummies' track): its raid's, in the boss's key with its own lead.
export function edmFor(key) {
  const song = SONGS[key];
  const base = TRACKS[song ? song.raid : 'dummies'] || TRACKS.dummies;
  return { ...base, key: key || 'dummies', shift: song ? song.shift || 0 : 0, seed: song ? song.seed : base.seed };
}

export class EdmPlayer {
  constructor(ctx, dest, noise, track) {
    this.ctx = ctx;
    this.noise = noise;
    this.track = track;
    this.style = 'edm';
    this.scale = SCALES[track.scale] || SCALES.minor;
    this.root = track.root + (track.shift || 0);
    this.fade = ctx.createGain();
    this.fade.gain.value = 0.0001;
    this.fade.connect(dest);
    // A gentle master low-pass, the drums straight to it, the rest through the pump (the sidechain under the kick).
    this.out = ctx.createBiquadFilter();
    this.out.type = 'lowpass';
    this.out.frequency.value = 9000;
    this.out.connect(this.fade);
    this.pump = ctx.createGain();
    this.pump.connect(this.out);
    // The chords' filter, opened through a build and at the drop.
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padFilter.Q.value = 2;
    this.padFilter.connect(this.pump);
    this.step = 0;
    this.next = 0;
    this.timer = null;
    this.melody = this.compose(seeded(track.seed || 1));
  }

  note(d, octave = 0) {
    const n = this.scale.length;
    return this.root + 12 * (Math.floor(d / n) + octave) + this.scale[((d % n) + n) % n];
  }

  // The lead's hook: a two-bar phrase per chord, the first coming back (A B A' C), on eighths and sixteenths.
  compose(rng) {
    const phrase = () => {
      const bars = [];
      let d = 4 + Math.floor(rng() * 3);
      for (let b = 0; b < 2; b++) {
        const notes = [];
        for (let st = 0; st < 16; st += rng() < 0.25 ? 1 : 2) {
          if (rng() < (st % 4 === 0 ? 0.85 : 0.55)) {
            d = Math.max(0, Math.min(11, d + [-2, -1, 0, 1, 1, 2, -3, 3][Math.floor(rng() * 8)]));
            notes.push({ step: st, degree: d, len: rng() < 0.3 ? 3 : 1.5 });
          }
        }
        bars.push(notes);
      }
      return bars;
    };
    const a = phrase();
    const b = phrase();
    const c = phrase();
    const a2 = [a[0], phrase()[1]];
    return [a, b, a2, c].flat();
  }

  start() {
    const t = this.ctx.currentTime;
    this.fade.gain.setValueAtTime(0.0001, t);
    this.fade.gain.exponentialRampToValueAtTime(this.track.level || 1, t + 2);
    this.next = t + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
  }

  stop(secs = 1.5) {
    const t = this.ctx.currentTime;
    this.fade.gain.cancelScheduledValues(t);
    this.fade.gain.setValueAtTime(Math.max(0.0001, this.fade.gain.value), t);
    this.fade.gain.exponentialRampToValueAtTime(0.0001, t + secs);
    setTimeout(() => { clearInterval(this.timer); this.fade.disconnect(); }, secs * 1000 + 100);
  }

  schedule() {
    const stepLen = 60 / this.track.bpm / 4;
    while (this.next < this.ctx.currentTime + 0.25) {
      this.playStep(this.step, this.next, stepLen);
      this.next += stepLen;
      this.step++;
    }
  }

  playStep(step, t, stepLen) {
    const tr = this.track;
    const bar = Math.floor(step / 16);
    const st = step % 16;
    const sec = sectionOf(bar);
    const drop = sec.name === 'drop';
    const build = sec.name === 'build';
    const lastTwo = build && sec.at >= sec.bars - 2;
    const barLen = stepLen * 16;
    const deg = tr.chords[Math.floor(bar / 2) % tr.chords.length];

    // Section starts: a crash and the chords' filter wide open at a drop; a riser over a build, the filter opening.
    if (st === 0 && sec.at === 0) {
      if (drop) { this.crash(t); this.sweep(4500, t, 0.05); }
      if (build) { this.riser(t, barLen * sec.bars); this.sweep(4000, t + barLen * sec.bars, barLen * sec.bars); }
      if (sec.name === 'intro' || sec.name === 'break') this.sweep(sec.name === 'break' ? 700 : 1100, t, 0.5);
    }

    // Drums. Half time (a wobble track) puts the kick on one and the snare on three.
    const kickOn = tr.half ? st === 0 || st === 10 : st % 4 === 0;
    const kicks = (drop || (sec.name === 'intro' && bar >= 2) || (build && !lastTwo)) && kickOn;
    if (kicks) { this.kick(t); this.duck(t, stepLen * 3); }
    if ((drop || (build && sec.at < 4)) && (tr.half ? st === 8 : st === 4 || st === 12)) this.clap(t);
    if (drop || sec.name === 'intro') {
      if (st % 4 === 2) this.hat(t, 0.05, true);
      else if (drop && st % 2 === 1) this.hat(t, 0.018, false);
    }
    if (tr.shaker && (drop || sec.name === 'break')) this.noiseHit(t, 'highpass', 6000, 0.012 * (st % 2 ? 0.7 : 1.2), 0.05);
    // The build's snare roll: quarters, then eighths, then sixteenths, rising.
    if (build) {
      const every = sec.at < sec.bars - 4 ? 0 : sec.at < sec.bars - 2 ? 4 : sec.at < sec.bars - 1 ? 2 : 1;
      if (every && st % every === 0) this.snare(t, 0.4 + (sec.at + st / 16) / sec.bars * 0.6, 1 + (sec.at / sec.bars) * 0.6);
    }

    // Bass.
    const bassOn = drop || sec.name === 'intro' || (build && !lastTwo);
    if (bassOn) {
      const f = hz(this.note(deg, -2));
      if (tr.bass === 'wobble') { if (st === 0 && bar % 2 === 0) this.wobble(f, t, barLen * 2, stepLen); }
      else if (tr.bass === 'rolling') { if (st % 4 !== 0) this.bass(f, t, stepLen * 0.9, 0.16); }
      else if (st % 4 === 2) this.bass(f, t, stepLen * 1.8, 0.2);
    }

    // Chords: a held supersaw over two bars; in a drop, stabs on the offbeats as well.
    if (bar % 2 === 0 && st === 0) this.supersaw([0, 2, 4].map((i) => this.note(deg + i, 0)), t, barLen * 2, drop ? 0.05 : 0.035);
    if (drop && (st === 6 || st === 14)) this.supersaw([0, 2, 4].map((i) => this.note(deg + i, 1)), t, stepLen * 1.5, 0.03);

    // The arpeggio through the intro, the builds and the breakdown; the lead in the drops (and quietly in the breakdown).
    if (tr.arp && !drop && st % 2 === 0) {
      const chord = [0, 2, 4, 7].map((i) => this.note(deg + i, 1));
      this.lead('pluck', hz(chord[(st / 2) % 4]), t, stepLen * 1.5, 0.035);
    }
    if (drop || sec.name === 'break') {
      for (const n of this.melody[bar % this.melody.length]) {
        if (n.step === st) this.lead(sec.name === 'break' ? 'bell' : tr.lead, hz(this.note(n.degree, 1)), t, stepLen * n.len, sec.name === 'break' ? 0.03 : 0.055);
      }
    }
  }

  // ---- voices ------------------------------------------------------------------------------------------------------

  env(t, peak, attack, len, dest = this.pump) {
    const e = this.ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(peak, t + attack);
    e.gain.exponentialRampToValueAtTime(0.0001, t + len);
    e.connect(dest);
    return e;
  }

  osc(type, f, t, len, dest, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(t + len + 0.05);
    return o;
  }

  // The sidechain: everything but the drums drops under each kick and swells back.
  duck(t, len) {
    const g = this.pump.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.25, t);
    g.linearRampToValueAtTime(1, t + len);
  }

  // Moves the chords' filter to `freq` over `len` seconds from t.
  sweep(freq, t, len) {
    const f = this.padFilter.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(freq, t + Math.max(0.05, len));
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    o.connect(this.env(t, 0.5, 0.002, 0.32, this.out));
    o.start(t);
    o.stop(t + 0.35);
    this.noiseHit(t, 'highpass', 3000, 0.04, 0.012); // the click
  }

  noiseHit(t, type, freq, gain, len, q = 1, dest = this.out) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(this.env(t, gain, 0.001, len, dest));
    src.connect(f);
    src.start(t, Math.random() * 1.5);
    src.stop(t + len + 0.05);
  }

  clap(t) { for (const d of [0, 0.012, 0.024]) this.noiseHit(t + d, 'bandpass', 1500, 0.09, 0.14, 1.2); }
  hat(t, gain, open) { this.noiseHit(t, 'highpass', 8000, gain, open ? 0.16 : 0.035); }
  snare(t, gain, pitch) { this.noiseHit(t, 'bandpass', 2000 * pitch, 0.07 * gain, 0.09, 0.9); }
  crash(t) { this.noiseHit(t, 'highpass', 5000, 0.06, 1.8, 0.5); }

  // White noise rising through a band-pass across a build.
  riser(t, len) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(9000, t + len);
    const e = this.ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.045, t + len * 0.95);
    e.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
    src.connect(f);
    f.connect(e);
    e.connect(this.out);
    src.start(t);
    src.stop(t + len + 0.1);
  }

  bass(f, t, len, gain) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(160, t + len);
    lp.connect(this.env(t, gain, 0.005, len));
    this.osc('sawtooth', f, t, len, lp);
    this.osc('sine', f / 2, t, len, this.env(t, gain * 0.8, 0.005, len));
  }

  // A wobble: a held saw through a filter an LFO swings in eighths.
  wobble(f, t, len, stepLen) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.value = 500;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 1 / (stepLen * 2);
    const depth = this.ctx.createGain();
    depth.gain.value = 420;
    lfo.connect(depth);
    depth.connect(lp.frequency);
    lp.connect(this.env(t, 0.13, 0.01, len));
    for (const det of [-8, 8]) this.osc('sawtooth', f, t, len, lp, det);
    this.osc('sine', f / 2, t, len, this.env(t, 0.12, 0.01, len));
    lfo.start(t);
    lfo.stop(t + len + 0.05);
  }

  // A supersaw: five detuned saws a note, through the chords' filter.
  supersaw(notes, t, len, gain) {
    const e = this.env(t, gain, 0.01, len, this.padFilter);
    for (const m of notes) for (const det of [-18, -9, 0, 9, 18]) this.osc('sawtooth', hz(m), t, len, e, det);
  }

  lead(voice, f, t, len, gain) {
    switch (voice) {
      case 'pluck': {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(f * 6, t);
        lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.2);
        lp.connect(this.env(t, gain, 0.003, 0.3));
        this.osc('sawtooth', f, t, 0.3, lp);
        break;
      }
      case 'marimba':
        this.osc('sine', f, t, 0.4, this.env(t, gain, 0.003, 0.4));
        this.osc('sine', f * 4, t, 0.1, this.env(t, gain * 0.2, 0.002, 0.08));
        break;
      case 'bell': {
        const o = this.osc('sine', f, t, 1.2, this.env(t, gain, 0.003, 1.2));
        const mod = this.ctx.createOscillator();
        mod.frequency.value = f * 3.5;
        const depth = this.ctx.createGain();
        depth.gain.setValueAtTime(f, t);
        depth.gain.exponentialRampToValueAtTime(1, t + 0.9);
        mod.connect(depth);
        depth.connect(o.frequency);
        mod.start(t);
        mod.stop(t + 1.25);
        break;
      }
      case 'oud': {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(f * 8, t);
        lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.35);
        lp.connect(this.env(t, gain, 0.003, Math.max(0.4, len)));
        this.osc('sawtooth', f, t, Math.max(0.4, len), lp);
        break;
      }
      case 'square':
        this.osc('square', f, t, len, this.env(t, gain * 0.7, 0.005, len));
        this.osc('square', f * 2, t, len, this.env(t, gain * 0.15, 0.005, len), 7);
        break;
      default: { // a bright detuned saw lead
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = f * 5;
        lp.connect(this.env(t, gain, 0.008, len + 0.05));
        for (const det of [-10, 10]) this.osc('sawtooth', f, t, len + 0.05, lp, det);
      }
    }
  }
}
