// Radio Numen's band songs (js/radio.js): a rock, a blues and a country instrumental, and two hip-hop tracks rapped by AI
// voices (assets/radio, tools/radio-voices.ps1), the lyrics about anything but Azeroth. Built on the modern EDM player's
// mix (edm-modern.js: compressor, limiter, reverb, delay) with instruments of their own: plucked strings by Karplus-Strong
// synthesis (distorted for rock, clean for country), a bass, an organ, a Rhodes, 808s, and drum patterns per genre (a
// triplet shuffle for the blues, a swung boom bap, half-time trap). A rap's verse and chorus are each one take; the
// song makes its verse and chorus as many bars long as the take runs.
import { ModernEdmPlayer } from './edm-modern.js';
import { hz } from './music.js';

export const CLIPS = 'assets/radio/';

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

// The rappers: OpenAI's gpt-4o-mini-tts, which takes a direction (tools/radio-voices.ps1 -Model gpt-4o-mini-tts).
export const RAPPERS = {
  mc1: { name: 'MC Pocketlint', voice: 'echo', speed: 1, instructions: 'Rap this as a confident, playful old-school hip-hop MC over a 90 BPM boom bap beat. Keep a steady rhythm, land every rhyme on the beat, a short breath at the end of each line, a grin in the voice. Rap it, do not sing it and do not read it flat.' },
  mc2: { name: 'Lil Read Receipt', voice: 'nova', speed: 1, instructions: 'Rap this as a cocky, fast modern trap rapper over a 140 BPM beat. Tight and punchy, hit each rhyme hard, a little attitude and swagger. Rap it, do not sing it and do not read it flat.' },
};

// The songs. genre: 'rock', 'blues', 'country', 'boombap', 'trap'; chords: scale degrees, a bar each (the blues: its
// twelve bars, in semitones); rapper, verse, chorus: a rap's.
export const BAND_TRACKS = {
  parkingTicket: { name: 'Parking Ticket', style: 'Rock', genre: 'rock', bpm: 142, root: 52, scale: 'minor', chords: [0, 0, 5, 6, 0, 0, 3, 4], seed: 301, level: 0.46, kick: 'punch' },
  microwaveBlues: { name: 'Microwave Blues', style: 'Blues', genre: 'blues', bpm: 82, root: 45, scale: 'pentaMinor', twelveBar: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], shuffle: true, seed: 307, level: 0.69, kick: 'punch' },
  taxSeason: { name: 'Tax Season', style: 'Thrash metal', genre: 'metal', thrash: true, bpm: 184, root: 40, scale: 'phrygian', chords: [0, 0, 1, 0, 0, 0, 6, 5], seed: 401, level: 0.22, kick: 'punch' },
  dentistAppointment: { name: 'Dentist Appointment', style: 'Groove metal', genre: 'metal', bpm: 96, root: 38, scale: 'minor', chords: [0, 0, 3, 1], seed: 409, level: 0.32, kick: 'big' },
  twoLeftBoots: { name: 'Two Left Boots', style: 'Country', genre: 'country', bpm: 116, root: 43, scale: 'major', chords: [0, 0, 3, 3, 4, 4, 0, 0], seed: 311, level: 0.69, kick: 'punch' },
  lostMyKeys: {
    name: 'Lost My Keys', style: 'Boom bap hip-hop', genre: 'boombap', bpm: 90, root: 50, scale: 'dorian', chords: [0, 3, 5, 4], seed: 317, level: 0.55, kick: 'punch', rapper: 'mc1',
    verse: [
      'Woke up late, sun is out, coffee machine is crying,',
      'reached into my pocket and my keys are out here hiding.',
      'Checked the couch, checked the fridge, checked the dog\'s own bed,',
      'checked the spot I always put them, found a sock instead.',
      'Called my mom, she said you lost them back in two thousand nine,',
      'mom, that was a different set, but thank you, that is fine.',
      'Turned the house upside down like a cop on TV,',
      'found a pizza from last summer and it\'s looking at me.',
      'Neighbor peeking through the fence like I\'m robbing my own place,',
      'got a lamp in one hand and the panic on my face.',
      'Bus already left, my boss is texting me in caps,',
      'I\'m on my hands and knees negotiating with the cat.',
      'Cat just blinks real slow like she knows exactly where,',
      'I would pay her in tuna, but she\'s got that billionaire stare.',
      'Then I feel a little jingle in the jacket I have on,',
      'they were in my pocket the whole time. And the whole day\'s gone.',
    ],
    chorus: [
      'Lost my keys again, lost my keys again,',
      'every single morning, man, it never ends.',
      'Lost my keys again, gotta check it twice,',
      'if they\'re in the freezer, well, at least they\'re on ice.',
    ],
  },
  groupChat: {
    name: 'Group Chat', style: 'Trap', genre: 'trap', bpm: 140, root: 49, scale: 'minor', chords: [0, 0, 5, 6], seed: 331, level: 0.4, kick: 'big', rapper: 'mc2',
    verse: [
      'Group chat popping at a quarter past three,',
      'forty-seven messages and none are for me.',
      'Somebody posted a picture of soup,',
      'now everybody\'s arguing in a loop.',
      'Uncle Dave sent a meme from two thousand and nine,',
      'with a minion and a sunset and an inspirational line.',
      'Karen says she\'s leaving, but she never really goes,',
      'she\'s been leaving since the summer, everybody knows.',
      'I muted the chat, but the badge still glows,',
      'red dot on my phone like a clown\'s red nose.',
      'Planning a birthday, nobody agrees,',
      'twelve restaurant ideas and they all serve cheese.',
      'Somebody voice-noted for eleven minutes straight,',
      'I play it on double speed, sorry, can\'t wait.',
      'Then the chat goes quiet, finally, I breathe,',
      'then somebody asks who\'s bringing ice, and it\'s me.',
    ],
    chorus: [
      'Group chat, group chat, never gonna sleep,',
      'thumbs up, thumbs up, everybody beep.',
      'Group chat, group chat, left me on read,',
      'now I\'m in the corner with my phone in bed.',
    ],
  },
};

// A rap part's clip: its song, part and words.
export const rapClip = (key, part, lines) => `rap-${key}-${part}-${hash(lines.join('\n'))}.mp3`;

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
    this.vocalBus = this.bus(this.out, 0.12, 0);
    this.vocalBus.gain.value = 1.35;
    this.takes = {}; // a rap's verse and chorus takes, once loaded
    this.plan = this.planOf();
    this.ended = false;
    if (track.rapper) {
      for (const part of ['verse', 'chorus']) {
        fetch(CLIPS + rapClip(key, part, track[part])).then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((b) => (b ? ctx.decodeAudioData(b) : null)).then((b) => {
            if (!b) return;
            this.takes[part] = trimSilence(ctx, b, 0.03);
            this.plan = this.planOf();
          }).catch(() => {});
      }
    }
  }

  // The song's sections and bars: a rap's verse and chorus as long as their takes (16 and 8 bars without them).
  planOf() {
    const g = this.track.genre;
    if (g === 'blues') return [['intro', 2], ['rhythm', 24], ['solo', 24], ['rhythm', 12], ['solo', 12], ['outro', 2]];
    if (g === 'boombap' || g === 'trap') {
      const barLen = 60 / this.track.bpm * 4;
      const bars = (take, min) => (take ? Math.max(min, Math.ceil(take.duration / barLen / 2) * 2) : min);
      const verse = bars(this.takes.verse, 8);
      const chorus = bars(this.takes.chorus, 4);
      return [['intro', 4 + (this.extraIntro || 0)], ['chorus', chorus], ['verse', verse], ['chorus', chorus], ['break', 8], ['chorus', chorus], ['outro', 4]];
    }
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
      // Boom bap swings its off sixteenths late.
      const swing = this.track.genre === 'boombap' && this.step % 2 ? stepLen * 0.22 : 0;
      this.playStep(this.step, this.next + swing, stepLen);
      this.next += stepLen;
      this.step++;
    }
  }

  playStep(step, t, stepLen) {
    const tr = this.track;
    const bar = Math.floor(step / this.perBar);
    const st = step % this.perBar;
    // The radio's hosts come first (radio.js sets hold while they talk): a rap's intro goes round two more bars at a
    // time until they are done, so no verse runs under them (16 bars at most).
    if (this.hold && tr.rapper && st === 0 && bar === this.plan[0][1] && (this.extraIntro || 0) < 16) {
      this.extraIntro = (this.extraIntro || 0) + 2;
      this.plan = this.planOf();
    }
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
      default: this.hiphop(sec, bar, st, t, stepLen, barLen);
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

  hiphop(sec, bar, st, t, stepLen, barLen) {
    const tr = this.track;
    const trap = tr.genre === 'trap';
    const deg = tr.chords[bar % tr.chords.length];
    const drums = sec.name !== 'intro' || sec.at >= 2;
    if (drums) {
      if (trap) {
        if (st === 0 || (bar % 2 && st === 11) || st === 6) { this.kick(t); this.sub808(hz(this.note(deg, -2)), t, stepLen * 5, bar % 4 === 3 && st === 6); }
        if (st === 8) { this.clap(t); this.snare(t, 0.6); }
        this.hat(t, st % 2 ? 0.015 : 0.025, false);
        if (bar % 2 === 1 && st >= 12) this.hat(t + stepLen / 2, 0.014, false); // a roll
      } else {
        if (st === 0 || st === 7 || st === 10) { this.kick(t); this.bassNote(this.note(deg, -2), t, stepLen * 3, 0.24); }
        if (st === 4 || st === 12) this.snare(t, 1);
        if (st % 2 === 0) this.hat(t, 0.03, false);
        this.noiseHit(t, 'highpass', 3000, 0.004, 0.02); // vinyl crackle
      }
    }
    // Chords: a Rhodes on the boom bap, a dark held pad on the trap.
    if (st === 0) {
      const notes = [0, 2, 4, 6].map((i) => this.note(deg + i, 0));
      if (trap) this.wide(notes, t, barLen, 0.012, this.padFilter, 0.2);
      else this.rhodes(notes, t, barLen * 0.9, 0.02);
    }
    if (trap && st % 4 === 2 && sec.name !== 'verse') this.pluck(hz(this.note(deg + [4, 2, 6, 7][(st / 4 | 0) % 4], 1)), t, 0.25, 0.012, this.leadBus);
    // The rap: each take starts on its section's first beat.
    if (st === 0 && sec.at === 0 && (sec.name === 'verse' || sec.name === 'chorus')) {
      const take = this.takes[sec.name];
      if (take) {
        const src = this.ctx.createBufferSource();
        src.buffer = take;
        src.connect(this.vocalBus);
        src.start(t);
      }
    }
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

  // A Rhodes: a sine with a bell-like FM attack, swaying side to side.
  rhodes(midis, t, len, gain) {
    const c = this.ctx;
    const pan = c.createStereoPanner();
    const lfo = c.createOscillator();
    lfo.frequency.value = 3;
    const depth = c.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth);
    depth.connect(pan.pan);
    pan.connect(this.padBus);
    const e = this.env(t, gain, 0.005, len, pan);
    for (const m of midis) {
      const o = this.osc('sine', hz(m), t, len, e);
      const mod = c.createOscillator();
      mod.frequency.value = hz(m);
      const md = c.createGain();
      md.gain.setValueAtTime(hz(m) * 1.2, t);
      md.gain.exponentialRampToValueAtTime(1, t + 0.4);
      mod.connect(md);
      md.connect(o.frequency);
      mod.start(t);
      mod.stop(t + len + 0.05);
    }
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

  // An 808: a sine sub with a long tail, sliding down into the note on a slide.
  sub808(f, t, len, slide) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(slide ? f * 2 : f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    const sat = this.shaper(2);
    o.connect(sat);
    sat.connect(this.env(t, 0.3, 0.004, len, this.out));
    o.start(t);
    o.stop(t + len + 0.05);
  }
}
