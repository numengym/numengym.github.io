// A song for every encounter, made on the fly with Web Audio like the rest of the trainer's sound (js/audio.js): each
// raid has a sound of its own (its scale, instruments and drums) and each boss a song in it (its tempo, key, groove and
// a melody of its own, the same every time it plays). The training dummies keep the lofi loop (audio.js LofiMusic).
//
// A song: bpm; steps per bar (16, or 12 for three beats); root (MIDI) and scale (semitones); chords (scale degrees, one
// per `barsPerChord` bars); pad / bass / lead voices; drums (one 16- or 12-step pattern per drum: x hit, X accent,
// . rest); a melody seed (the lead's tune is drawn from it once, then repeats) and how busy it is; extra colour (drone,
// wind, choir); a level, so every song plays about as loud as the lofi loop.

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// Scales, in semitones from the root.
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  hijaz: [0, 1, 4, 5, 7, 8, 10], // Phrygian dominant: the desert's
  pentaMinor: [0, 3, 5, 7, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

// ---- the raids' sounds ---------------------------------------------------------------------------------------
// Each boss's song is its raid's, with the boss's own changes on top.
const RAIDS = {
  // Ragefire Chasm: a light, driving fire tune for the first boss.
  ragefire: {
    bpm: 112, root: 50, scale: 'dorian', chords: [0, 6, 5, 6], barsPerChord: 1,
    pad: { wave: 'sawtooth', gain: 0.03, cutoff: 1400 }, bass: { wave: 'triangle', gain: 0.2, pattern: 'x.x...x.x.x...x.' },
    lead: { voice: 'pluck', gain: 0.07, octave: 1 },
    drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', tom: '..............xx' },
    busy: 0.55,
  },
  // Onyxia's Lair: a deep cave, low brass and a slow, heavy beat under a choir.
  onyxia: {
    bpm: 72, root: 38, scale: 'minor', chords: [0, 5, 3, 4], barsPerChord: 2,
    pad: { wave: 'sawtooth', gain: 0.04, cutoff: 900 }, bass: { wave: 'sawtooth', gain: 0.16, cutoff: 300, pattern: 'x.......x.......' },
    lead: { voice: 'brass', gain: 0.07, octave: 1 }, choir: 0.03,
    drums: { taiko: 'x.....x...x.....', tom: '........x.....x.', hat: '..x...x...x...x.' },
    busy: 0.35, drone: 0.05,
  },
  // Molten Core: fire and stone. Phrygian, pounding drums, an anvil, a low hum of lava.
  moltenCore: {
    bpm: 96, root: 40, scale: 'phrygian', chords: [0, 1, 0, 6], barsPerChord: 2,
    pad: { wave: 'sawtooth', gain: 0.035, cutoff: 1100 }, bass: { wave: 'sawtooth', gain: 0.17, cutoff: 420, pattern: 'x..x..x.x..x..x.' },
    lead: { voice: 'brass', gain: 0.07, octave: 1 },
    drums: { taiko: 'x.....x.x.......', kick: 'x.......x.......', snare: '....x.......x...', anvil: '......x.......x.', tom: '............x.xx' },
    busy: 0.45, drone: 0.05,
  },
  // Blackwing Lair: dark and draconic, harmonic minor, a gothic organ and a choir, a march underneath.
  blackwingLair: {
    bpm: 88, root: 36, scale: 'harmonic', chords: [0, 5, 3, 4], barsPerChord: 2,
    pad: { wave: 'square', gain: 0.022, cutoff: 1300, organ: true }, bass: { wave: 'sawtooth', gain: 0.15, cutoff: 380, pattern: 'x...x...x...x...' },
    lead: { voice: 'brass', gain: 0.065, octave: 2 }, choir: 0.035,
    drums: { kick: 'x.......x.......', snare: '....x.......x.x.', taiko: 'x...........x...', hat: 'x...x...x...x...' },
    busy: 0.4, drone: 0.04,
  },
  // Naxxramas: cold and dead. A music box over a low drone, sparse ticking, wind.
  naxxramas: {
    bpm: 66, root: 35, scale: 'locrian', chords: [0, 1, 0, 4], barsPerChord: 2,
    pad: { wave: 'triangle', gain: 0.035, cutoff: 1600 }, bass: { wave: 'sine', gain: 0.18, pattern: 'x...............' },
    lead: { voice: 'bell', gain: 0.06, octave: 3 },
    drums: { tick: 'x...x...x...x...', tom: 'x...............' },
    busy: 0.4, drone: 0.06, wind: 0.02,
  },
  // Zul'Gurub: the jungle. Hand drums and shakers, a wooden marimba and a flute, minor pentatonic.
  zulGurub: {
    bpm: 104, root: 45, scale: 'pentaMinor', chords: [0, 3, 2, 3], barsPerChord: 1,
    pad: { wave: 'triangle', gain: 0.025, cutoff: 1200 }, bass: { wave: 'sine', gain: 0.2, pattern: 'x..x..x...x..x..' },
    lead: { voice: 'flute', gain: 0.06, octave: 1 }, lead2: { voice: 'marimba', gain: 0.06, octave: 1 },
    drums: { doum: 'x..x..x...x.....', tek: '..x...x.x...x.xx', shaker: 'xxxxxxxxxxxxxxxx', tom: '........x..x....' },
    busy: 0.5,
  },
  // Ruins of Ahn'Qiraj: the desert. Phrygian dominant, an oud over a darbuka's groove and a drone, wind in the sand.
  ruinsOfAhnQiraj: {
    bpm: 92, root: 38, scale: 'hijaz', chords: [0, 1, 0, 6], barsPerChord: 2,
    pad: { wave: 'sawtooth', gain: 0.022, cutoff: 1000 }, bass: { wave: 'triangle', gain: 0.18, pattern: 'x.....x...x.....' },
    lead: { voice: 'oud', gain: 0.075, octave: 1 },
    drums: { doum: 'x.....x.........', tek: '...x....x.x.x...', shaker: '..x...x...x...x.', taiko: 'x...............' },
    busy: 0.5, drone: 0.05, wind: 0.012,
  },
};

// ---- the encounters' songs --------------------------------------------------------------------------------------
// raid: whose sound; then the boss's own: tempo, key (semitones from the raid's), chords, groove, melody seed and
// busyness, voices.
const SONGS = {
  brute: { raid: 'ragefire', seed: 11 },
  onyxia: { raid: 'onyxia', seed: 23, level: 1.1 },
  // Molten Core
  lucifron: { raid: 'moltenCore', seed: 31, level: 0.88, bpm: 84, shift: -2, scale: 'locrian', chords: [0, 1, 4, 1], drone: 0.07 },
  magmadar: { raid: 'moltenCore', seed: 37, level: 0.6, bpm: 120, bass: { pattern: 'x.xxx.xxx.xxx.xx' }, drums: { kick: 'x...x...x...x...', taiko: 'x.x...x.x.x...x.', snare: '....x.......x...', anvil: '..............x.' } },
  geddon: { raid: 'moltenCore', seed: 41, level: 1.25, bpm: 100, shift: 3, drums: { kick: 'x.......x.......', tick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', anvil: 'x...........x...' } },
  golemagg: { raid: 'moltenCore', seed: 43, level: 1.1, bpm: 70, shift: -3, drums: { taiko: 'x.......x.......', tom: '....x.......x...', anvil: '..........x.....' }, busy: 0.3 },
  sulfuron: { raid: 'moltenCore', seed: 47, level: 0.88, bpm: 96, shift: 1, drums: { kick: 'x...x...x...x...', snare: '....x..x....x.xx', taiko: 'x.......x.......', anvil: '......x.......x.' } },
  majordomo: { raid: 'moltenCore', seed: 53, level: 0.88, bpm: 90, scale: 'harmonic', chords: [0, 3, 4, 0], choir: 0.03, busy: 0.55 },
  ragnaros: { raid: 'moltenCore', seed: 59, level: 0.58, bpm: 132, shift: 2, choir: 0.035, busy: 0.6, bass: { pattern: 'x.xxx.xxx.xxx.xx' },
    drums: { kick: 'x.x.x...x.x.x...', taiko: 'x.....x.x.....x.', snare: '....x.......x.x.', anvil: '..x...x...x...x.', tom: '............xxxx' } },
  // Blackwing Lair
  broodlord: { raid: 'blackwingLair', seed: 61, level: 0.9, bpm: 100, drums: { kick: 'x...x...x...x...', snare: '..x...x...x...xx', taiko: 'x.......x.......', hat: 'x.x.x.x.x.x.x.x.' } },
  vaelastrasz: { raid: 'blackwingLair', seed: 67, level: 1.3, bpm: 64, shift: 3, scale: 'minor', chords: [0, 5, 2, 6], busy: 0.3, drums: { taiko: 'x.......x.......', hat: '....x.......x...' } },
  chromaggus: { raid: 'blackwingLair', seed: 71, bpm: 92, shift: 1, scale: 'locrian', chords: [0, 1, 0, 2], lead: { voice: 'brass', octave: 2, chromatic: true } },
  nefarian: { raid: 'blackwingLair', seed: 73, level: 0.68, bpm: 120, choir: 0.045, busy: 0.6, bass: { pattern: 'x.x.x.x.x.x.x.x.' },
    drums: { kick: 'x.x.x...x.x.x...', snare: '....x.......x.x.', taiko: 'x.....x.x.......', hat: 'x.x.x.x.x.x.x.x.', tom: '............xxxx' } },
  // Naxxramas
  patchwerk: { raid: 'naxxramas', seed: 79, bpm: 132, steps: 12, chords: [0, 4, 0, 1], bass: { pattern: 'x.....x.....' },
    drums: { kick: 'x...........', tick: '....x...x...', tom: 'x...........' }, lead: { voice: 'bell', octave: 2 }, busy: 0.5 },
  grobbulus: { raid: 'naxxramas', seed: 83, level: 1.6, bpm: 78, shift: 2, scale: 'phrygian', pad: { wave: 'sawtooth', gain: 0.025, cutoff: 900, wobble: true }, lead: { voice: 'pluck', octave: 2 } },
  gluth: { raid: 'naxxramas', seed: 89, level: 0.78, bpm: 140, scale: 'harmonic', bass: { pattern: 'x.x.x.x.x.x.x.x.' },
    drums: { kick: 'x...x...x...x...', tick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', tom: '..............xx' }, busy: 0.55 },
  loatheb: { raid: 'naxxramas', seed: 97, level: 1.2, bpm: 60, shift: -1, chords: [0, 1, 6, 1], drone: 0.08, wind: 0.03, busy: 0.25 },
  // Zul'Gurub
  venoxis: { raid: 'zulGurub', seed: 101, level: 1.15, bpm: 84, scale: 'phrygian', lead: { voice: 'flute', octave: 1 }, lead2: null, busy: 0.4 },
  jeklik: { raid: 'zulGurub', seed: 103, level: 1.3, bpm: 126, shift: 5, lead: { voice: 'flute', octave: 2 }, drums: { tek: 'x.xx.xx.x.xx.xxx' } },
  marli: { raid: 'zulGurub', seed: 107, bpm: 110, shift: 2, lead: { voice: 'marimba', octave: 1 }, lead2: { voice: 'pluck', octave: 2 } },
  thekal: { raid: 'zulGurub', seed: 109, level: 1.2, bpm: 96, shift: -2, drums: { doum: 'x.....x...x.....', tek: '...x.......x..x.', shaker: 'x.x.x.x.x.x.x.x.', tom: '..............x.' } },
  mandokir: { raid: 'zulGurub', seed: 113, level: 0.82, bpm: 120, shift: 3, bass: { pattern: 'x.xx.xx.x.xx.xx.' }, drums: { doum: 'x.xx.xx.x.xx.xx.', tek: '....x.......x...', shaker: 'xxxxxxxxxxxxxxxx' } },
  hakkar: { raid: 'zulGurub', seed: 127, level: 0.72, bpm: 116, scale: 'harmonic', chords: [0, 5, 4, 0], choir: 0.03, drone: 0.05, busy: 0.6,
    drums: { doum: 'x..x..x...x..x..', tek: '..x...x.x...x.xx', shaker: 'xxxxxxxxxxxxxxxx', taiko: 'x.......x.....x.', tom: '............xxxx' } },
  // Ruins of Ahn'Qiraj
  kurinnaxx: { raid: 'ruinsOfAhnQiraj', seed: 131, level: 1.25, bpm: 80, wind: 0.025, busy: 0.4 },
  rajaxx: { raid: 'ruinsOfAhnQiraj', seed: 137, bpm: 104, shift: 2, drums: { kick: 'x...x...x...x...', snare: '....x.......x.xx', doum: 'x.....x.........', tek: '...x....x.x.x...' } },
  moam: { raid: 'ruinsOfAhnQiraj', seed: 139, level: 1.15, bpm: 70, shift: -2, pad: { wave: 'triangle', gain: 0.035, cutoff: 1800 }, lead: { voice: 'bell', octave: 2 }, busy: 0.35 },
  buru: { raid: 'ruinsOfAhnQiraj', seed: 149, level: 1.2, bpm: 68, shift: -3, drums: { taiko: 'x.......x.......', doum: '....x.......x...', tek: '..........x.....' }, busy: 0.3 },
  ayamiss: { raid: 'ruinsOfAhnQiraj', seed: 151, level: 1.6, bpm: 124, shift: 5, lead: { voice: 'oud', octave: 2 }, drums: { tek: 'x.xx.xx.x.xx.xxx', shaker: 'xxxxxxxxxxxxxxxx' } },
  ossirian: { raid: 'ruinsOfAhnQiraj', seed: 157, level: 0.85, bpm: 112, choir: 0.03, busy: 0.6,
    drums: { doum: 'x.....x...x.....', tek: '...x....x.x.x.xx', shaker: 'x.x.x.x.x.x.x.x.', taiko: 'x.......x.....x.', tom: '............xxxx' } },
};

// The full song for an encounter: its raid's sound with the boss's changes (an object field merges, null drops it).
export function songFor(key) {
  const own = SONGS[key];
  if (!own) return null;
  const base = RAIDS[own.raid];
  const song = { ...base };
  for (const [k, v] of Object.entries(own)) {
    if (v === null) delete song[k];
    else if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && k !== 'drums') song[k] = { ...base[k], ...v };
    else song[k] = v;
  }
  song.key = key;
  return song;
}

// A small seeded random, so a song's melody is the same every time.
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ---- the player ------------------------------------------------------------------------------------------------

export class SongPlayer {
  constructor(ctx, dest, noise, song) {
    this.ctx = ctx;
    this.noise = noise;
    this.song = song;
    this.steps = song.steps || 16;
    this.scale = SCALES[song.scale] || SCALES.minor;
    this.root = song.root + (song.shift || 0);
    // A gentle low-pass over everything, and a fade in.
    this.out = ctx.createBiquadFilter();
    this.out.type = 'lowpass';
    this.out.frequency.value = 5200;
    this.fade = ctx.createGain();
    this.fade.gain.value = 0.0001;
    this.out.connect(this.fade);
    this.fade.connect(dest);
    this.step = 0;
    this.next = 0;
    this.timer = null;
    this.melody = this.compose(seeded(song.seed || 1));
  }

  // A note of the scale: degree d (any integer; 7 is the root an octave up) over the song's root.
  note(d, octave = 0) {
    const n = this.scale.length;
    const o = Math.floor(d / n);
    return this.root + 12 * (o + octave) + this.scale[((d % n) + n) % n];
  }

  // The lead's tune for one pass through the chords: a two-bar phrase per chord, the first phrase coming back at the
  // end (A B A' C as the chords go), notes leaning on the chord's tones. [{ step, degree, len }] per bar.
  compose(rng) {
    const s = this.song;
    const bars = s.chords.length * (s.barsPerChord || 1);
    const phrase = () => {
      const out = [];
      let d = 2 + Math.floor(rng() * 3);
      for (let b = 0; b < 2; b++) {
        const notes = [];
        for (let st = 0; st < this.steps; st += 2) {
          const strong = st % (this.steps / 4 === 3 ? 6 : 4) === 0;
          if (rng() < (strong ? (s.busy || 0.4) + 0.25 : (s.busy || 0.4) * 0.7)) {
            d += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rng() * 8)];
            d = Math.max(-2, Math.min(9, d));
            const len = rng() < 0.3 ? 4 : 2;
            notes.push({ step: st, degree: d, len });
          }
        }
        out.push(notes);
      }
      return out;
    };
    const a = phrase();
    const b = phrase();
    const c = phrase();
    const a2 = a.map((bar, i) => (i === 1 ? phrase()[1] : bar)); // the A phrase with a new ending
    const order = [a, b, a2, c];
    const tune = [];
    for (let i = 0; i < bars; i++) tune.push(order[Math.floor(i / 2) % 4][i % 2]);
    return tune;
  }

  start() {
    const t = this.ctx.currentTime;
    this.fade.gain.setValueAtTime(0.0001, t);
    this.fade.gain.exponentialRampToValueAtTime(this.song.level || 1, t + 2.5);
    this.next = t + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
    if (this.song.wind) this.windLoop(this.song.wind);
  }

  // Fades out over `secs`, then stops.
  stop(secs = 1.5) {
    const t = this.ctx.currentTime;
    this.fade.gain.cancelScheduledValues(t);
    this.fade.gain.setValueAtTime(Math.max(0.0001, this.fade.gain.value), t);
    this.fade.gain.exponentialRampToValueAtTime(0.0001, t + secs);
    setTimeout(() => {
      clearInterval(this.timer);
      if (this.windSrc) try { this.windSrc.stop(); } catch { /* already stopped */ }
      this.fade.disconnect();
    }, secs * 1000 + 100);
  }

  schedule() {
    const stepLen = 60 / this.song.bpm / 4;
    while (this.next < this.ctx.currentTime + 0.25) {
      this.playStep(this.step, this.next, stepLen);
      this.next += stepLen;
      this.step++;
    }
  }

  playStep(step, t, stepLen) {
    const s = this.song;
    const bar = Math.floor(step / this.steps);
    const st = step % this.steps;
    const per = s.barsPerChord || 1;
    const loopBars = s.chords.length * per;
    const deg = s.chords[Math.floor(bar / per) % s.chords.length];
    const barLen = stepLen * this.steps;
    // The first two bars of a song bring the drums in after the pad.
    const intro = bar < 2;
    // Pad: the chord (root, third, fifth, seventh above the degree) held through each chord.
    if (st === 0 && bar % per === 0) this.pad([0, 2, 4, 6].map((i) => this.note(deg + i, 1)), t, barLen * per, s.pad);
    if (s.choir && st === 0 && bar % per === 0) this.choir([this.note(deg, 2), this.note(deg + 4, 2)], t, barLen * per, s.choir);
    if (s.drone && st === 0 && bar % loopBars === 0) this.drone(hz(this.note(0, -1)), t, barLen * loopBars, s.drone);
    // Bass on its pattern: the chord's root, a fifth now and then.
    const bp = s.bass.pattern;
    if (bp && bp[st % bp.length] === 'x') {
      const fifth = st > 0 && (st / 2) % 3 === 2;
      this.bass(hz(this.note(deg + (fifth ? 4 : 0), -1)), t, stepLen * 2.2, s.bass);
    }
    // Drums.
    if (!intro) {
      for (const [drum, pattern] of Object.entries(s.drums || {})) {
        const ch = pattern[st % pattern.length];
        if (ch === 'x' || ch === 'X') this.drum(drum, t, ch === 'X' ? 1.4 : 1);
      }
    }
    // The lead's tune, from the third bar on; a second voice answers it an octave up on every other pass.
    if (bar >= 2) {
      const notes = this.melody[(bar - 2) % this.melody.length];
      const pass = Math.floor((bar - 2) / this.melody.length);
      for (const n of notes) {
        if (n.step !== st) continue;
        const d = n.degree + (s.lead.chromatic && Math.random() < 0.15 ? 0.5 : 0);
        const m = s.lead.chromatic && d % 1 ? this.note(Math.floor(d), s.lead.octave) + 1 : this.note(d, s.lead.octave);
        this.lead(s.lead.voice, hz(m), t, stepLen * n.len, s.lead.gain);
        if (s.lead2 && pass % 2 === 1) this.lead(s.lead2.voice, hz(this.note(n.degree, s.lead2.octave)), t, stepLen * n.len, s.lead2.gain || s.lead.gain);
      }
    }
  }

  // ---- voices ----------------------------------------------------------------------------------------------------

  env(t, peak, attack, len) {
    const e = this.ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(peak, t + attack);
    e.gain.exponentialRampToValueAtTime(0.0001, t + len);
    e.connect(this.out);
    return e;
  }

  osc(type, f, t, len, dest, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(t + len + 0.1);
    return o;
  }

  // Held chords: two detuned oscillators a note through a low-pass, a slow swell (an organ swells fast; a wobble
  // sweeps the filter).
  pad(notes, t, len, p) {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = p.cutoff || 1200;
    if (p.wobble) {
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.8;
      const depth = c.createGain();
      depth.gain.value = (p.cutoff || 1200) * 0.6;
      lfo.connect(depth);
      depth.connect(f.frequency);
      lfo.start(t);
      lfo.stop(t + len + 0.2);
    }
    const e = this.env(t, p.gain, p.organ ? 0.08 : Math.min(1.2, len * 0.3), len + 0.4);
    f.connect(e);
    for (const m of notes) for (const det of [-7, 7]) this.osc(p.wave, hz(m), t, len + 0.4, f, det);
  }

  // A choir: "ah" through two formant filters, with a slow vibrato.
  choir(notes, t, len, gain) {
    const c = this.ctx;
    const e = this.env(t, gain, Math.min(1.5, len * 0.35), len + 0.6);
    for (const [freq, q] of [[750, 6], [1150, 8]]) {
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      f.connect(e);
      for (const m of notes) {
        const o = this.osc('sawtooth', hz(m), t, len + 0.6, f, (Math.random() - 0.5) * 10);
        const lfo = c.createOscillator();
        lfo.frequency.value = 5;
        const depth = c.createGain();
        depth.gain.value = 6;
        lfo.connect(depth);
        depth.connect(o.detune);
        lfo.start(t);
        lfo.stop(t + len + 0.7);
      }
    }
  }

  drone(f, t, len, gain) {
    const e = this.env(t, gain, 2, len + 1);
    this.osc('sawtooth', f, t, len + 1, this.lowpass(e, 260));
    this.osc('sine', f * 1.5, t, len + 1, e);
  }

  lowpass(dest, freq) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    f.connect(dest);
    return f;
  }

  bass(f, t, len, b) {
    const e = this.env(t, b.gain, 0.015, len);
    this.osc(b.wave, f, t, len, b.cutoff ? this.lowpass(e, b.cutoff) : e);
  }

  lead(voice, f, t, len, gain) {
    const c = this.ctx;
    switch (voice) {
      case 'flute': { // a breathy sine with vibrato
        const e = this.env(t, gain, 0.06, len + 0.15);
        const o = this.osc('sine', f, t, len + 0.15, e);
        const lfo = c.createOscillator();
        lfo.frequency.value = 5.5;
        const depth = c.createGain();
        depth.gain.value = 12;
        lfo.connect(depth);
        depth.connect(o.detune);
        lfo.start(t);
        lfo.stop(t + len + 0.25);
        this.noiseBurst(t, { type: 'bandpass', freq: f * 2, gain: gain * 0.25, len: len * 0.6, q: 4 });
        break;
      }
      case 'marimba': { // wood: a sine and its fourth harmonic, quickly gone
        const e = this.env(t, gain, 0.004, 0.45);
        this.osc('sine', f, t, 0.45, e);
        this.osc('sine', f * 4, t, 0.12, this.env(t, gain * 0.25, 0.002, 0.1));
        break;
      }
      case 'pluck': {
        this.osc('triangle', f, t, 0.6, this.env(t, gain, 0.005, 0.55));
        break;
      }
      case 'oud': { // a plucked string with a bright attack through a closing filter
        const fl = c.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.setValueAtTime(f * 8, t);
        fl.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.4);
        const e = this.env(t, gain, 0.003, Math.max(0.5, len));
        fl.connect(e);
        this.osc('sawtooth', f, t, Math.max(0.5, len), fl);
        break;
      }
      case 'bell': { // a music box: a sine bent by an inharmonic one
        const e = this.env(t, gain, 0.003, 1.6);
        const o = this.osc('sine', f, t, 1.6, e);
        const mod = c.createOscillator();
        mod.frequency.value = f * 3.5;
        const depth = c.createGain();
        depth.gain.setValueAtTime(f * 1.2, t);
        depth.gain.exponentialRampToValueAtTime(1, t + 1.2);
        mod.connect(depth);
        depth.connect(o.frequency);
        mod.start(t);
        mod.stop(t + 1.7);
        break;
      }
      default: { // brass: a saw whose filter opens as it is blown
        const fl = c.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.setValueAtTime(f * 1.2, t);
        fl.frequency.exponentialRampToValueAtTime(f * 5, t + 0.12);
        fl.frequency.exponentialRampToValueAtTime(f * 2.5, t + len);
        const e = this.env(t, gain, 0.05, len + 0.2);
        fl.connect(e);
        this.osc('sawtooth', f, t, len + 0.2, fl, -5);
        this.osc('sawtooth', f, t, len + 0.2, fl, 5);
      }
    }
  }

  noiseBurst(t, { type, freq, gain, len, q = 1 }) {
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

  // A pitched thump: from `from` Hz down to `to`.
  thump(t, from, to, gain, len) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + len * 0.5);
    const e = this.env(t, gain, 0.003, len);
    o.connect(e);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  drum(name, t, accent) {
    switch (name) {
      case 'kick': this.thump(t, 120, 42, 0.3 * accent, 0.35); break;
      case 'taiko': this.thump(t, 90, 48, 0.32 * accent, 0.7); this.noiseBurst(t, { type: 'lowpass', freq: 400, gain: 0.08 * accent, len: 0.15 }); break;
      case 'tom': this.thump(t, 160, 90, 0.16 * accent, 0.3); break;
      case 'snare': this.noiseBurst(t, { type: 'bandpass', freq: 1800, gain: 0.1 * accent, len: 0.2, q: 0.8 }); this.thump(t, 200, 170, 0.05, 0.1); break;
      case 'hat': this.noiseBurst(t, { type: 'highpass', freq: 7500, gain: 0.025 * accent, len: 0.04 }); break;
      case 'shaker': this.noiseBurst(t, { type: 'highpass', freq: 5000, gain: 0.014 * accent * (0.6 + Math.random() * 0.6), len: 0.05 }); break;
      case 'tick': this.noiseBurst(t, { type: 'bandpass', freq: 3200, gain: 0.04 * accent, len: 0.02, q: 6 }); break;
      case 'doum': this.thump(t, 110, 75, 0.22 * accent, 0.3); break;
      case 'tek': this.noiseBurst(t, { type: 'bandpass', freq: 2600, gain: 0.06 * accent, len: 0.05, q: 3 }); this.thump(t, 420, 380, 0.04, 0.05); break;
      case 'anvil': { // metal: a few inharmonic squares, high-passed, ringing
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1500;
        hp.connect(this.env(t, 0.035 * accent, 0.002, 0.6));
        for (const f of [587, 845, 1243, 1677]) this.osc('square', f, t, 0.6, hp);
        break;
      }
      default: break;
    }
  }

  // Wind: noise through a slowly sweeping band-pass, under the whole song.
  windLoop(gain) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 1.5;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = c.createGain();
    depth.gain.value = 350;
    lfo.connect(depth);
    depth.connect(f.frequency);
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    src.start();
    lfo.start();
    this.windSrc = src;
  }
}
