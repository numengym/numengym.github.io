// Radio Numen 104.2, the third music style (Settings → Sound): the dummies' EDM tracks (edm.js, edm-modern.js) and the
// band's rock, metal, blues, country and hip-hop (band.js) as a radio station in the manner of the Grand Theft Auto
// stations. A song plays through; then the next one starts and the hosts talk over its intro, the music ducked under them:
// the last song's outro, then banter, a station ID, the news, a caller
// or the listener's last fight roasted, every third break an ad break, and the next song's intro (js/data/radio.js). The
// hosts are recorded AI voices (assets/radio, tools/radio-voices.ps1): a clip for each line, for each song a line names,
// and the numbers stitched from clips of their words. It plays on through every encounter, as a radio does.
// onRadio({ type: 'song', track } | { type: 'say', who, text } | { type: 'quiet' } | null), set on the Sound, shows it on
// screen (main.js).
import { EdmPlayer, edmFor } from './edm.js';
import { MODERN_TRACKS, ModernEdmPlayer } from './edm-modern.js';
import { BAND_TRACKS, BandPlayer, CLIPS, RAPPERS, hash, rapClip, trimSilence } from './band.js';
import { SONGS as BOSS_SONGS, SongPlayer, songFor } from './music.js';
import { ADS, AD_BREAK_IN, AD_BREAK_OUT, BANTER, BITES, BOSS_INTROS, BOSS_OUTROS, CALLERS, HOSTS, INTROS, NEWS, OUTROS, ROASTS, SOUND_BITES, STATION_IDS, WELCOME } from './data/radio.js';

const CLASSIC = { name: 'Training Floor', style: 'Classic house' };
const DUCK = 0.3; // the music under the hosts
const AD_DUCK = 0.12; // and under an ad
const BOSS_SONG_SECS = 105; // a boss's song loops: this long on the radio
const NUMBER_HOSTS = ['rex', 'candi']; // the hosts who read numbers out

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The songs, as the hosts name them: the EDM tracks and the band's (band.js).
const SONGS = [{ key: 'classic', ...CLASSIC }, ...Object.entries({ ...MODERN_TRACKS, ...BAND_TRACKS }).map(([key, t]) => ({ key, name: t.name, style: t.style }))];

// ---- the clips ---------------------------------------------------------------------------------------------------
// A line's clip: its host and a hash of its words. A number is read out word by word, each word its own clip.

const lineClip = (who, text) => `${who}-${hash(text)}.mp3`;
const numberClip = (who, word) => `num-${who}-${word}.mp3`;

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const NUMBER_WORDS = [...ONES, ...TENS.slice(2), 'hundred', 'thousand'];
// 612 → six hundred twelve; up to 99,999.
export function numberWords(n) {
  n = Math.max(0, Math.round(n));
  if (n < 20) return [ONES[n]];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], ONES[n % 10]] : [TENS[n / 10]];
  if (n < 1000) return [ONES[Math.floor(n / 100)], 'hundred', ...(n % 100 ? numberWords(n % 100) : [])];
  return [...numberWords(Math.floor(n / 1000)), 'thousand', ...(n % 1000 ? numberWords(n % 1000) : [])];
}

// A line's parts to play: its clips in order, the numbers as their words' clips.
function partsOf(who, text, v) {
  const out = [];
  text.split(/\{(dps|parse)\}/).forEach((piece, i) => {
    if (i % 2) for (const w of numberWords(v[piece])) out.push(numberClip(who, w));
    else if (piece.trim()) out.push(lineClip(who, piece.trim()));
  });
  return out;
}

// The songs' names into a line ({track} {style} {prev} {prevStyle}); the numbers stay for partsOf.
const fillSongs = (line, v) => line.replace(/\{(track|style|prev|prevStyle)\}/g, (_, k) => v[k] ?? '');

// Every clip there is, for tools/radio-voices.ps1: { file, who, voice, instructions, text } (radio-clips.json).
export function allClips() {
  const out = new Map();
  const add = (who, text) => {
    const file = lineClip(who, text);
    if (!out.has(file)) out.set(file, { file, who, voice: HOSTS[who].voice, instructions: HOSTS[who].instructions, text });
  };
  const lines = [STATION_IDS, WELCOME, INTROS, OUTROS, BOSS_INTROS, BOSS_OUTROS, BANTER, BITES, ROASTS, NEWS, CALLERS, ADS, AD_BREAK_IN, AD_BREAK_OUT].flat(2);
  for (const [who, line] of lines) {
    if (who.startsWith('bite:')) continue; // a real clip, not a voice to record
    const variants = /\{(track|style)\}/.test(line) ? SONGS.map((s) => fillSongs(line, { track: s.name, style: s.style }))
      : /\{(prev|prevStyle)\}/.test(line) ? SONGS.map((s) => fillSongs(line, { prev: s.name, prevStyle: s.style })) : [line];
    for (const text of variants) for (const piece of text.split(/\{(?:dps|parse)\}/)) if (piece.trim()) add(who, piece.trim());
  }
  // The raps: a take for each verse and chorus, in its rapper's voice.
  for (const [key, t] of Object.entries(BAND_TRACKS)) {
    if (!t.rapper) continue;
    const r = RAPPERS[t.rapper];
    for (const part of ['verse', 'chorus']) {
      const file = rapClip(key, part, t[part]);
      out.set(file, { file, who: t.rapper, voice: r.voice, instructions: r.instructions, text: t[part].join('\n') });
    }
  }
  for (const who of NUMBER_HOSTS) for (const w of NUMBER_WORDS) {
    const file = numberClip(who, w);
    out.set(file, { file, who, voice: HOSTS[who].voice, instructions: `${HOSTS[who].instructions} Say just this one word, as part of reading out a number.`, text: w });
  }
  return [...out.values()];
}

// ---- the station -------------------------------------------------------------------------------------------------

export class RadioNumen {
  // sound: the Sound (audio.js): its context, music bus, noise and settings; radioContext(): the listener's last fight
  // ({ dps, parse }) for the roasts.
  constructor(sound) {
    this.sound = sound;
    this.ctx = sound.ctx;
    this.bus = this.ctx.createGain();
    this.bus.connect(sound.musicBus);
    // The hosts: a little above the music, a touch of compression, as radio voices are; a caller through a phone line.
    this.voice = this.ctx.createGain();
    this.voice.gain.value = 1.5;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.voice.connect(comp);
    comp.connect(sound.musicBus);
    this.phone = this.ctx.createBiquadFilter();
    this.phone.type = 'bandpass';
    this.phone.frequency.value = 1400;
    this.phone.Q.value = 0.9;
    this.phone.connect(this.voice);
    this.buffers = new Map(); // clip → Promise<AudioBuffer | null>
    this.player = null;
    this.trackKey = null;
    this.track = null;
    this.songs = 0;
    this.stopped = false;
    this.talkId = 0;
    this.source = null;
  }

  start() { this.nextSong(); }

  stop(secs = 1.5) {
    this.stopped = true;
    clearTimeout(this.songTimer);
    this.talkId++;
    if (this.source) { try { this.source.stop(); } catch { /* already over */ } }
    if (this.player) this.player.stop(secs);
    const t = this.ctx.currentTime;
    this.bus.gain.setTargetAtTime(0.0001, t, secs / 4);
    this.voice.gain.setTargetAtTime(0.0001, t, 0.1);
    setTimeout(() => { this.bus.disconnect(); this.voice.disconnect(); }, secs * 1000 + 300);
    this.emit(null);
  }

  emit(ev) { if (this.sound.onRadio) this.sound.onRadio(ev); }

  // The next song from a shuffled bag of them all (each once before any comes back, never the last one twice running),
  // with the hosts over its intro. The bosses' songs (music.js) play BOSS_SONG_SECS, the others to their end.
  nextSong() {
    if (this.stopped) return;
    if (!this.bag || !this.bag.length) {
      this.bag = ['classic', ...Object.keys(MODERN_TRACKS), ...Object.keys(BAND_TRACKS), ...Object.keys(BOSS_SONGS).map((k) => `boss:${k}`)]
        .filter((k) => k !== this.trackKey).sort(() => Math.random() - 0.5);
    }
    const key = this.bag.pop();
    const prev = this.track;
    const boss = key.startsWith('boss:') ? key.slice(5) : null;
    const names = (boss && this.sound.songNames && this.sound.songNames[boss]) || {};
    const track = boss ? { name: names.name || boss, style: `${names.raid || 'Raid'} boss theme`, boss: true }
      : key === 'classic' ? { ...edmFor(null), ...CLASSIC } : MODERN_TRACKS[key] || BAND_TRACKS[key];
    this.trackKey = key;
    this.track = track;
    const player = boss ? new SongPlayer(this.ctx, this.bus, this.sound.noise, songFor(boss))
      : key === 'classic' ? new EdmPlayer(this.ctx, this.bus, this.sound.noise, edmFor(null))
        : BAND_TRACKS[key] ? new BandPlayer(this.ctx, this.bus, this.sound.noise, track, key)
          : new ModernEdmPlayer(this.ctx, this.bus, this.sound.noise, track);
    player.onRound = () => {
      if (this.player !== player) return;
      player.stop(3);
      this.nextSong();
    };
    clearTimeout(this.songTimer);
    if (boss) this.songTimer = setTimeout(() => player.onRound(), BOSS_SONG_SECS * 1000);
    this.player = player;
    player.hold = true; // the hosts talk first: a rap waits for them (say lets it go)
    player.start();
    this.emit({ type: 'song', track });
    const segment = this.segment(prev, track);
    this.songs++;
    this.say(segment, 1.8);
  }

  // What the hosts say before a song: the welcome first; then an outro, a filler, the intro. Every third break is an
  // ad break. Each line: { who, text (as shown), parts (its clips) }.
  segment(prev, next) {
    const v = { track: next.name, style: next.style, prev: prev && prev.name, prevStyle: prev && prev.style, ...this.listener() };
    const parts = [];
    if (!this.songs) parts.push(pick(WELCOME));
    else {
      if (prev && Math.random() < 0.65) parts.push(pick(prev.boss ? BOSS_OUTROS : OUTROS));
      if (this.songs % 3 === 0) {
        parts.push(pick(AD_BREAK_IN), ...this.ads(), pick(AD_BREAK_OUT));
      } else {
        const fillers = [STATION_IDS, BANTER, BANTER, NEWS, CALLERS, BITES];
        if (v.dps) fillers.push(ROASTS, ROASTS);
        parts.push(pick(pick(fillers)));
      }
      parts.push(pick(next.boss ? BOSS_INTROS : INTROS));
    }
    // A part needing a value there is none of (no fight yet) drops out whole: no half a joke.
    const needs = (line) => [...line.matchAll(/\{(\w+)\}/g)].every(([, k]) => v[k] != null && v[k] !== '');
    return parts.filter((part) => part.every(([, line]) => needs(line))).flat().map(([who, line]) => {
      // A sound bite: its clip, its caption, its bleeps.
      if (who.startsWith('bite:')) { const b = SOUND_BITES[who.slice(5)]; return { who, text: b.text, parts: [b.file], bite: b }; }
      const text = fillSongs(line, v);
      return { who, text: text.replace(/\{(dps|parse)\}/g, (_, k) => v[k]), parts: partsOf(who, text, v) };
    });
  }

  // One or two ads, different.
  ads() {
    const first = pick(ADS);
    const second = Math.random() < 0.5 ? pick(ADS.filter((a) => a !== first)) : null;
    return second ? [first, second] : [first];
  }

  listener() {
    try { return (this.sound.radioContext && this.sound.radioContext()) || {}; } catch { return {}; }
  }

  // A clip, fetched and decoded once (null when it is missing).
  load(file) {
    if (!this.buffers.has(file)) {
      this.buffers.set(file, fetch(CLIPS + file).then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((b) => (b ? this.ctx.decodeAudioData(b) : null)).then((b) => b && (file.startsWith('bite-') ? b : trimSilence(this.ctx, b, file.startsWith('num-') ? 0.01 : 0.04)))
        .catch(() => null));
    }
    return this.buffers.get(file);
  }


  // The hosts speak, one line after another, the music ducked under them; then it comes back up. A new break cuts one
  // still going (a song cut short). The clips load while the song starts.
  async say(lines, delay = 0) {
    const id = ++this.talkId;
    if (this.source) { try { this.source.stop(); } catch { /* already over */ } }
    const buffers = await Promise.all(lines.map((l) => Promise.all(l.parts.map((p) => this.load(p)))));
    await new Promise((r) => setTimeout(r, delay * 1000));
    if (this.stopped || id !== this.talkId) return;
    for (let i = 0; i < lines.length; i++) {
      const { who, text } = lines[i];
      const host = lines[i].bite ? { name: lines[i].bite.name } : HOSTS[who] || HOSTS.rex;
      const clips = buffers[i].filter(Boolean);
      if (!clips.length) continue; // not recorded
      this.duck(who === 'ad' ? AD_DUCK : DUCK, 0.4);
      this.emit({ type: 'say', who: host.name, text });
      for (const buf of clips) {
        await this.play(buf, host.phone ? this.phone : this.voice, lines[i].bite && lines[i].bite.bleeps);
        if (this.stopped || id !== this.talkId) return;
      }
      await new Promise((r) => setTimeout(r, 220));
      if (this.stopped || id !== this.talkId) return;
    }
    this.duck(1, 1.2);
    this.emit({ type: 'quiet' });
    if (this.player) this.player.hold = false; // the song may go on to its vocals (band.js)
  }

  // Plays a clip; resolves when it ends. bleeps: [start, end] spans (seconds into it) muted under a bleep tone.
  play(buf, dest, bleeps = null) {
    return new Promise((resolve) => {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const t = this.ctx.currentTime + 0.02;
      if (bleeps) {
        const g = this.ctx.createGain();
        src.connect(g);
        g.connect(dest);
        for (const [a, b] of bleeps) {
          g.gain.setValueAtTime(0, t + a);
          g.gain.setValueAtTime(1, t + b);
          const tone = this.ctx.createOscillator();
          tone.frequency.value = 1000;
          const tg = this.ctx.createGain();
          tg.gain.value = 0.18;
          tone.connect(tg);
          tg.connect(dest);
          tone.start(t + a);
          tone.stop(t + b);
        }
      } else src.connect(dest);
      src.onended = () => { if (this.source === src) this.source = null; resolve(); };
      this.source = src;
      src.start(t);
    });
  }

  duck(level, secs) {
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(level, t, secs / 3);
  }
}
