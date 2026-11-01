// Modern EDM for the training dummies (Settings → Sound → EDM): ten club tracks in today's styles, played with the classic
// dummies track in a random order, a new one after each round (audio.js). They keep edm.js's arrangement (intro, build,
// drop, breakdown, build, drop) but not its soft, lofi mix: a glue compressor and a limiter instead of the low-pass, wide
// stereo supersaws, reverb and a ping-pong delay, a silent beat before each drop and an impact on it, and modern voices:
// punchy saturated kicks (a distorted one for hardstyle), two-step drum and bass and half-time patterns with trap hat rolls,
// reese, sub, growl, bounce and hardstyle basses, future-bass chords and vocal chops.
import { EdmPlayer, ROUND_BARS, sectionOf } from './edm.js';
import { hz, seeded } from './music.js';

// The tracks. drums: 'four' (four on the floor), 'dnb' (two-step), 'half' (half time); kick: 'punch', 'big' (a long
// tuned tail), 'hard' (distorted); bass: 'offbeat', 'rolling', 'sub', 'reese', 'growl', 'reverse' (hardstyle), 'groove'
// (tech house), 'bounce' (future house); pads: the chords, 'hold', 'stab', 'pluck' or 'future'; lead: 'supersaw',
// 'bigroom', 'pluck', 'chop' (a vocal chop), 'square'; perc: rims and shakers; level: so each plays about as loud.
export const MODERN_TRACKS = {
  pullTimer: { name: 'Pull Timer', style: 'Progressive house', bpm: 126, root: 57, scale: 'minor', chords: [0, 5, 2, 6], drums: 'four', kick: 'punch', bass: 'offbeat', pads: 'pluck', lead: 'supersaw', arp: true, seed: 201, level: 0.41 },
  critChain: { name: 'Crit Chain', style: 'Big room', bpm: 128, root: 53, scale: 'minor', chords: [0, 0, 5, 6], drums: 'four', kick: 'big', bass: 'sub', pads: 'stab', lead: 'bigroom', seed: 211, level: 0.29 },
  enrageTimer: { name: 'Enrage Timer', style: 'Drum and bass', bpm: 174, root: 50, scale: 'minor', chords: [0, 5, 3, 4], drums: 'dnb', kick: 'punch', bass: 'reese', pads: 'hold', lead: 'pluck', arp: true, seed: 223, level: 0.40 },
  executePhase: { name: 'Execute Phase', style: 'Melodic dubstep', bpm: 140, root: 52, scale: 'minor', chords: [0, 5, 2, 6], drums: 'half', kick: 'big', bass: 'growl', pads: 'hold', lead: 'chop', seed: 227, level: 0.40 },
  procRate: { name: 'Proc Rate', style: 'Future bass', bpm: 150, root: 54, scale: 'major', chords: [3, 4, 5, 2], drums: 'half', kick: 'punch', bass: 'sub', pads: 'future', lead: 'chop', seed: 233, level: 0.45 },
  heroicStrike: { name: 'Heroic Strike', style: 'Trance', bpm: 138, root: 56, scale: 'minor', chords: [0, 5, 6, 4], drums: 'four', kick: 'punch', bass: 'rolling', pads: 'hold', lead: 'supersaw', arp: true, seed: 239, level: 0.39 },
  secondWind: { name: 'Second Wind', style: 'Tech house', bpm: 126, root: 55, scale: 'dorian', chords: [0, 0, 3, 3], drums: 'four', kick: 'punch', bass: 'groove', pads: 'stab', lead: 'chop', perc: true, seed: 241, level: 0.40 },
  bloodlust: { name: 'Bloodlust', style: 'Electro house', bpm: 128, root: 52, scale: 'phrygian', chords: [0, 1, 0, 6], drums: 'four', kick: 'big', bass: 'growl', pads: 'stab', lead: 'square', seed: 251, level: 0.31 },
  lastStand: { name: 'Last Stand', style: 'Hardstyle', bpm: 150, root: 50, scale: 'harmonic', chords: [0, 5, 3, 4], drums: 'four', kick: 'hard', bass: 'reverse', pads: 'hold', lead: 'supersaw', seed: 257, level: 0.32 },
  afterglow: { name: 'Afterglow', style: 'Future house', bpm: 124, root: 58, scale: 'minor', chords: [0, 3, 4, 5], drums: 'four', kick: 'punch', bass: 'bounce', pads: 'pluck', lead: 'chop', perc: true, seed: 263, level: 0.40 },
};

// A reverb's impulse: stereo noise dying away, made once per audio context.
const IMPULSES = new WeakMap();
function impulse(ctx) {
  if (IMPULSES.has(ctx)) return IMPULSES.get(ctx);
  const len = Math.floor(ctx.sampleRate * 2.6);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  IMPULSES.set(ctx, buf);
  return buf;
}
// A saturation curve (tanh), by drive.
const CURVES = new Map();
function curve(drive) {
  if (!CURVES.has(drive)) {
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = Math.tanh(drive * x) / Math.tanh(drive); }
    CURVES.set(drive, c);
  }
  return CURVES.get(drive);
}
// A vocal chop's vowels: two formants each (Hz).
const VOWELS = [[800, 1200], [500, 900], [400, 2200], [300, 2300], [650, 1700]];

export class ModernEdmPlayer extends EdmPlayer {
  constructor(ctx, dest, noise, track) {
    super(ctx, dest, noise, track);
    // The mix: the classic tracks' soft low-pass opened up, then a glue compressor and a limiter.
    this.out.disconnect();
    this.out.frequency.value = 18000;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.18; glue.knee.value = 8;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -3; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.06; limit.knee.value = 0;
    this.out.connect(glue);
    glue.connect(limit);
    limit.connect(this.fade);
    this.padFilter.Q.value = 0.7;
    // Reverb and a ping-pong delay (dotted eighths), pumping with the rest.
    this.verbIn = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    this.verbIn.connect(verb);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.55;
    verb.connect(verbOut);
    verbOut.connect(this.pump);
    this.delayIn = ctx.createGain();
    const beat = 60 / track.bpm;
    const left = ctx.createDelay(2);
    const right = ctx.createDelay(2);
    left.delayTime.value = right.delayTime.value = beat * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3500;
    this.delayIn.connect(left);
    left.connect(right);
    right.connect(tone);
    tone.connect(feedback);
    feedback.connect(left);
    for (const [node, pan] of [[left, -0.75], [right, 0.75]]) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      node.connect(g);
      g.connect(p);
      p.connect(this.pump);
    }
    // The buses: the leads (reverb and delay), the chords (some reverb), the claps and snares (reverb, not pumped).
    this.leadBus = this.bus(this.pump, 0.28, 0.22);
    this.padBus = this.bus(this.pump, 0.2, 0);
    this.padFilter.disconnect();
    this.padFilter.connect(this.padBus);
    this.fxBus = this.bus(this.out, 0.22, 0);
    this.groove = this.grooveOf(seeded((track.seed || 1) * 7));
  }

  // A bus to `dest` with reverb and delay sends.
  bus(dest, verb, delay) {
    const g = this.ctx.createGain();
    g.connect(dest);
    for (const [amount, send] of [[verb, this.verbIn], [delay, this.delayIn]]) {
      if (!amount) continue;
      const s = this.ctx.createGain();
      s.gain.value = amount;
      g.connect(s);
      s.connect(send);
    }
    return g;
  }

  // A bar's sixteenths for the rhythmic basses (growl, groove): on or off, from the track's seed.
  grooveOf(rng) {
    return Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? rng() < 0.75 : i % 2 === 0 ? rng() < 0.5 : rng() < 0.3));
  }

  playStep(step, t, stepLen) {
    const tr = this.track;
    const bar = Math.floor(step / 16);
    const st = step % 16;
    if (st === 0 && bar > 0 && bar % ROUND_BARS === 0 && this.onRound) this.onRound(); // a round is over (audio.js)
    const sec = sectionOf(bar);
    const drop = sec.name === 'drop';
    const build = sec.name === 'build';
    const brk = sec.name === 'break';
    const intro = sec.name === 'intro';
    const lastTwo = build && sec.at >= sec.bars - 2;
    // The beat before a drop is silent: everything holds its breath.
    const gap = build && sec.at === sec.bars - 1 && st >= 12;
    const barLen = stepLen * 16;
    const deg = tr.chords[Math.floor(bar / 2) % tr.chords.length];
    const half = tr.drums === 'half';

    if (st === 0 && sec.at === 0) {
      if (drop) { this.impact(t); this.sweep(16000, t, 0.03); }
      if (build) { this.riser(t, barLen * sec.bars - stepLen * 4); this.sweep(9000, t + barLen * sec.bars, barLen * sec.bars); }
      if (brk) { this.downlifter(t, barLen * 2); this.sweep(1200, t, barLen); }
      if (intro) this.sweep(2200, t, 0.5);
    }
    if (gap) return;

    // ---- drums
    const drums = drop || (intro && bar >= 4) || (build && !lastTwo);
    if (drums) {
      if (tr.drums === 'dnb') {
        const ghost = bar % 2 === 1 && st === 7;
        if (st === 0 || st === 10 || ghost) { this.kick(t); this.duck(t, stepLen * 3); }
        if (st === 4 || st === 12) this.snare(t, 1);
        else if (drop && (st === 14 || st === 9) && bar % 2) this.snare(t, 0.3);
        if (st % 2 === 0) this.hat(t, 0.028, false);
        if (drop && st === 2) this.hat(t, 0.04, true);
      } else if (half) {
        const extra = bar % 2 === 1 && (st === 10 || st === 13);
        if (st === 0 || extra) { this.kick(t); this.duck(t, stepLen * 5); }
        if (st === 8) this.snare(t, 1);
        if (st % 2 === 0) this.hat(t, 0.03, false);
        // A trap roll at the end of every fourth bar: thirty-seconds.
        if (bar % 4 === 3 && st >= 12) this.hat(t + stepLen / 2, 0.022, false);
      } else {
        if (st % 4 === 0) { this.kick(t); this.duck(t, stepLen * (tr.kick === 'hard' ? 3.5 : 3)); }
        if ((drop || build) && (st === 4 || st === 12)) this.clap(t);
        if (st % 4 === 2) this.hat(t, drop ? 0.05 : 0.035, true);
        else if (st % 2 === 1) this.hat(t, 0.02, false);
      }
      if (tr.perc && (drop || brk)) {
        if (st === 3 || st === 11 || (st === 14 && bar % 2)) this.rim(t);
        this.noiseHit(t, 'highpass', 7000, st % 2 ? 0.01 : 0.017, 0.045);
      }
    }
    // The build's snare roll: quarters, eighths, sixteenths, rising, into the gap.
    if (build) {
      const every = sec.at < sec.bars - 4 ? 0 : sec.at < sec.bars - 2 ? 4 : sec.at < sec.bars - 1 ? 2 : 1;
      if (every && st % every === 0) this.snare(t, 0.35 + (sec.at + st / 16) / sec.bars * 0.5, 1 + (sec.at / sec.bars) * 0.8);
    }

    // ---- bass
    const bassOn = drop || (intro && bar >= 4) || (build && !lastTwo);
    if (bassOn) {
      const m = this.note(deg, -2);
      const f = hz(m);
      switch (tr.bass) {
        case 'offbeat': if (st % 4 === 2) this.bass(f, t, stepLen * 1.8, 0.2); break;
        case 'rolling': if (st % 4 !== 0) this.bass(f, t, stepLen * 0.9, 0.16); break;
        case 'sub': if (st === 0 && bar % 2 === 0) this.sub(f, t, barLen * 2, 0.32); break;
        case 'reese': if (st === 0 && bar % 2 === 0) this.reese(f, t, barLen * 2); break;
        case 'growl': if (drop ? this.groove[st] : st % 8 === 0) this.growl(f, t, stepLen * (drop ? 1.7 : 3.5), stepLen); break;
        case 'reverse': if (st % 4 === 2) this.reverseBass(f, t, stepLen * 1.8); break;
        case 'groove': if (this.groove[st]) this.grooveBass(hz(m + (st % 8 === 6 ? 12 : 0)), t, stepLen * 1.2); break;
        case 'bounce': if (st % 4 === 2 || (drop && st === 7)) this.bounce(f, t, stepLen * 1.6); break;
        default: break;
      }
    }

    // ---- chords
    const chord = (oct) => [0, 2, 4].map((i) => this.note(deg + i, oct));
    switch (tr.pads) {
      case 'stab':
        if (drop && st % 4 === 2) this.wide(chord(0), t, stepLen * 1.2, 0.03, this.padFilter);
        else if (!drop && bar % 2 === 0 && st === 0) this.wide(chord(0), t, barLen * 2, 0.026, this.padFilter, 0.3);
        break;
      case 'pluck':
        if ([0, 3, 6, 8, 11, 14].includes(st) && (drop || brk || build)) for (const n of chord(0)) this.pluck(hz(n), t, 0.3, drop ? 0.022 : 0.016, this.padFilter);
        else if (intro && bar % 2 === 0 && st === 0) this.wide(chord(0), t, barLen * 2, 0.02, this.padFilter, 0.4);
        break;
      case 'future':
        // Future-bass chords: chopped on a rhythm in the drops with a wobble of vibrato, held elsewhere.
        if (drop && [0, 3, 6, 10, 12].includes(st)) this.wide([...chord(0), this.note(deg + 6, 0)], t, stepLen * (st === 12 ? 3.5 : 2.5), 0.03, this.padFilter, 0.01, 22);
        else if (!drop && bar % 2 === 0 && st === 0) this.wide([...chord(0), this.note(deg + 6, 0)], t, barLen * 2, 0.026, this.padFilter, 0.25);
        break;
      default:
        if (bar % 2 === 0 && st === 0) this.wide(chord(0), t, barLen * 2, drop ? 0.034 : 0.026, this.padFilter, drop ? 0.02 : 0.3);
    }

    // ---- arpeggio and lead
    if (tr.arp && !drop && st % 2 === 0) {
      const notes = [0, 2, 4, 7].map((i) => this.note(deg + i, 1));
      this.pluck(hz(notes[(st / 2) % 4]), t, 0.22, 0.02, this.leadBus);
    }
    if (drop || brk) {
      for (const n of this.melody[bar % this.melody.length]) {
        if (n.step !== st) continue;
        const f = hz(this.note(n.degree, 1));
        const len = stepLen * n.len;
        if (brk) { this.pluck(f, t, Math.max(0.3, len), 0.018, this.leadBus); continue; }
        this.leadVoice(tr.lead, f, t, len, n.degree);
      }
    }
  }

  // ---- drums ---------------------------------------------------------------------------------------------------------

  shaper(drive) {
    const s = this.ctx.createWaveShaper();
    s.curve = curve(drive);
    s.oversample = '2x';
    return s;
  }

  kick(t) {
    const kind = this.track.kick;
    const hard = kind === 'hard';
    const big = kind === 'big';
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(hard ? 320 : 240, t);
    o.frequency.exponentialRampToValueAtTime(hard ? 62 : 55, t + 0.045);
    o.frequency.exponentialRampToValueAtTime(hard ? 50 : 42, t + (big ? 0.55 : 0.3));
    const sat = this.shaper(hard ? 7 : 1.8);
    o.connect(sat);
    sat.connect(this.env(t, hard ? 0.5 : 0.7, 0.001, big ? 0.62 : hard ? 0.5 : 0.36, this.out));
    o.start(t);
    o.stop(t + 0.7);
    this.noiseHit(t, 'highpass', 4500, hard ? 0.09 : 0.06, 0.01); // the click
  }

  clap(t) {
    for (const d of [0, 0.01, 0.021]) this.noiseHit(t + d, 'bandpass', 1400, 0.1, d ? 0.03 : 0.2, 1.4, this.fxBus);
  }

  snare(t, gain, pitch = 1) {
    this.noiseHit(t, 'bandpass', 1900 * pitch, 0.11 * gain, 0.17, 0.8, this.fxBus);
    this.osc('triangle', 190 * pitch, t, 0.12, this.env(t, 0.12 * gain, 0.001, 0.11, this.fxBus));
  }

  hat(t, gain, open) { this.noiseHit(t, 'highpass', open ? 8500 : 9500, gain, open ? 0.2 : 0.03); }
  rim(t) {
    this.osc('square', 1700, t, 0.03, this.env(t, 0.03, 0.001, 0.03, this.fxBus));
    this.noiseHit(t, 'bandpass', 3200, 0.03, 0.03, 3, this.fxBus);
  }

  // The drop lands: a sub boom and a crash.
  impact(t) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.4);
    o.connect(this.env(t, 0.35, 0.002, 1.5, this.out));
    o.start(t);
    o.stop(t + 1.6);
    this.noiseHit(t, 'highpass', 4000, 0.07, 2.4, 0.5, this.fxBus);
  }

  // Noise falling away into a breakdown.
  downlifter(t, len) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(7000, t);
    f.frequency.exponentialRampToValueAtTime(250, t + len);
    src.connect(f);
    f.connect(this.env(t, 0.04, 0.01, len, this.fxBus));
    src.start(t);
    src.stop(t + len + 0.1);
  }

  // ---- basses --------------------------------------------------------------------------------------------------------

  // A clean sub with a little grit.
  sub(f, t, len, gain) {
    const s = this.shaper(1.4);
    this.osc('sine', f, t, len, s);
    s.connect(this.env(t, gain, 0.008, len));
  }

  // A reese: two detuned saws an octave up through a slowly moving low-pass, over the sub.
  reese(f, t, len) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 2;
    lp.frequency.value = 650;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.35;
    const depth = this.ctx.createGain();
    depth.gain.value = 380;
    lfo.connect(depth);
    depth.connect(lp.frequency);
    const sat = this.shaper(2.5);
    lp.connect(sat);
    sat.connect(this.env(t, 0.1, 0.02, len));
    for (const det of [-16, 16]) this.osc('sawtooth', f * 2, t, len, lp, det);
    this.sub(f, t, len, 0.22);
    lfo.start(t);
    lfo.stop(t + len + 0.05);
  }

  // A growl: an FM saw through a band-pass the rhythm swings, distorted, over the sub.
  growl(f, t, len, stepLen) {
    const c = this.ctx;
    const car = c.createOscillator();
    car.type = 'sawtooth';
    car.frequency.value = f * 2;
    const mod = c.createOscillator();
    mod.frequency.value = f * 3;
    const modGain = c.createGain();
    modGain.gain.setValueAtTime(f * 4, t);
    modGain.gain.exponentialRampToValueAtTime(f * 0.5, t + len);
    mod.connect(modGain);
    modGain.connect(car.frequency);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + Math.min(len, stepLen));
    bp.frequency.exponentialRampToValueAtTime(500, t + len);
    const sat = this.shaper(5);
    car.connect(bp);
    bp.connect(sat);
    sat.connect(this.env(t, 0.09, 0.004, len));
    for (const o of [car, mod]) { o.start(t); o.stop(t + len + 0.05); }
    this.sub(f, t, len, 0.2);
  }

  // Hardstyle's off-beat bass: a distorted saw pitched down into the next kick.
  reverseBass(f, t, len) {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.9, t + len);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + len);
    const sat = this.shaper(8);
    o.connect(sat);
    sat.connect(lp);
    lp.connect(this.env(t, 0.12, 0.004, len));
    o.start(t);
    o.stop(t + len + 0.05);
    this.sub(f, t, len, 0.16);
  }

  // Tech house: a short, round bass that moves.
  grooveBass(f, t, len) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 4;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + len);
    lp.connect(this.env(t, 0.12, 0.003, len));
    this.osc('sawtooth', f * 2, t, len, lp);
    this.sub(f, t, len, 0.2);
  }

  // Future house: a bouncing square that drops an octave into the note.
  bounce(f, t, len) {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(f * 4, t);
    o.frequency.exponentialRampToValueAtTime(f * 2, t + 0.05);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 5;
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + len);
    o.connect(lp);
    lp.connect(this.env(t, 0.1, 0.002, len));
    o.start(t);
    o.stop(t + len + 0.05);
    this.sub(f, t, len, 0.18);
  }

  // ---- chords and leads ----------------------------------------------------------------------------------------------

  // A wide supersaw: each note's voices spread left, centre and right. attack in seconds; vibrato in cents.
  wide(notes, t, len, gain, dest, attack = 0.01, vibrato = 0) {
    const c = this.ctx;
    const e = this.env(t, gain, attack, len, dest);
    let lfo = null;
    let depth = null;
    if (vibrato) {
      lfo = c.createOscillator();
      lfo.frequency.value = 5.5;
      depth = c.createGain();
      depth.gain.value = vibrato;
      lfo.connect(depth);
      lfo.start(t);
      lfo.stop(t + len + 0.05);
    }
    for (const [pan, dets] of [[-0.8, [-22, -7]], [0, [0]], [0.8, [7, 22]]]) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      p.connect(e);
      for (const m of notes) for (const det of dets) {
        const o = this.osc('sawtooth', hz(m), t, len, p, det);
        if (depth) depth.connect(o.detune);
      }
    }
  }

  // A bright pluck: a saw and a square through a quickly closing filter.
  pluck(f, t, len, gain, dest) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(16000, f * 10), t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.18);
    lp.connect(this.env(t, gain, 0.002, len, dest));
    this.osc('sawtooth', f, t, len, lp);
    this.osc('square', f * 2, t, len, lp, 5);
  }

  leadVoice(voice, f, t, len, degree) {
    switch (voice) {
      case 'bigroom': // short, loud stabs, an octave doubled and driven
        this.wide([69 + 12 * Math.log2(f / 440), 81 + 12 * Math.log2(f / 440)], t, Math.min(len, 0.18), 0.03, this.leadBus);
        break;
      case 'pluck':
        this.pluck(f, t, Math.max(0.25, len), 0.04, this.leadBus);
        break;
      case 'square':
        this.osc('square', f, t, len, this.env(t, 0.035, 0.004, len, this.leadBus));
        this.osc('sawtooth', f * 2, t, len, this.env(t, 0.015, 0.004, len, this.leadBus), 9);
        break;
      case 'chop': { // a vocal chop: a pulse through two formants of a vowel, the pitch bending in
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 0.94, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
        const [f1, f2] = VOWELS[((degree % VOWELS.length) + VOWELS.length) % VOWELS.length];
        const e = this.env(t, 0.09, 0.006, Math.max(0.12, len * 0.9), this.leadBus);
        for (const [fq, g] of [[f1, 1], [f2, 0.6]]) {
          const bp = c.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = fq;
          bp.Q.value = 6;
          const gg = c.createGain();
          gg.gain.value = g;
          o.connect(bp);
          bp.connect(gg);
          gg.connect(e);
        }
        o.start(t);
        o.stop(t + len + 0.05);
        break;
      }
      default: // a wide supersaw lead
        this.wide([69 + 12 * Math.log2(f / 440)], t, len + 0.04, 0.03, this.leadBus, 0.006);
    }
  }
}
