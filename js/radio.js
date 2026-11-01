// Radio Numen 104.2, the third music style (Settings → Sound): the dummies' EDM tracks (edm.js, edm-modern.js) as a radio
// station in the manner of the Grand Theft Auto stations. A song plays a round; then the next one starts and the hosts
// talk over its intro, the music ducked under them: the last song's outro, then banter, a station ID, the news, a caller
// or the listener's own fight roasted, every third break an ad break, and the next song's intro (js/data/radio.js). The
// voices are the browser's (Web Speech); without them the station just plays the music. It plays on through every
// encounter, as a radio does. onRadio({ type: 'song', track } | { type: 'say', who, text } | { type: 'quiet' } | null),
// set on the Sound, shows it on screen (main.js).
import { EdmPlayer, edmFor } from './edm.js';
import { MODERN_TRACKS, ModernEdmPlayer } from './edm-modern.js';
import { ADS, AD_BREAK_IN, AD_BREAK_OUT, BANTER, CALLERS, HOSTS, INTROS, NEWS, OUTROS, ROASTS, STATION_IDS, WELCOME } from './data/radio.js';

const CLASSIC = { name: 'Training Floor', style: 'Classic house' };
const DUCK = 0.3; // the music under the hosts
const AD_DUCK = 0.12; // and under an ad

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class RadioNumen {
  // sound: the Sound (audio.js): its context, music bus, noise and settings; context(): the listener ({ name, spec, cls,
  // race, dps, parse }) for the roasts.
  constructor(sound) {
    this.sound = sound;
    this.ctx = sound.ctx;
    this.bus = this.ctx.createGain();
    this.bus.connect(sound.musicBus);
    this.player = null;
    this.trackKey = null;
    this.track = null;
    this.songs = 0;
    this.stopped = false;
    this.talking = false;
  }

  start() { this.nextSong(); }

  stop(secs = 1.5) {
    this.stopped = true;
    if (this.talking && window.speechSynthesis) window.speechSynthesis.cancel();
    if (this.player) this.player.stop(secs);
    const t = this.ctx.currentTime;
    setTimeout(() => this.bus.disconnect(), secs * 1000 + 300);
    this.bus.gain.setTargetAtTime(0.0001, t, secs / 4);
    this.emit(null);
  }

  emit(ev) { if (this.sound.onRadio) this.sound.onRadio(ev); }

  // The next song, never the last one again, with the hosts over its intro.
  nextSong() {
    if (this.stopped) return;
    const keys = ['classic', ...Object.keys(MODERN_TRACKS)].filter((k) => k !== this.trackKey);
    const key = pick(keys);
    const prev = this.track;
    const track = key === 'classic' ? { ...edmFor(null), ...CLASSIC } : MODERN_TRACKS[key];
    this.trackKey = key;
    this.track = track;
    const player = key === 'classic' ? new EdmPlayer(this.ctx, this.bus, this.sound.noise, edmFor(null))
      : new ModernEdmPlayer(this.ctx, this.bus, this.sound.noise, track);
    player.onRound = () => {
      if (this.player !== player) return;
      player.stop(3);
      this.nextSong();
    };
    this.player = player;
    player.start();
    this.emit({ type: 'song', track });
    const segment = this.segment(prev, track);
    this.songs++;
    setTimeout(() => this.say(segment), 1800);
  }

  // What the hosts say before a song: the welcome first; then an outro, a filler, the intro. Every third break is an
  // ad break.
  segment(prev, next) {
    const v = { track: next.name, style: next.style, prev: prev && prev.name, prevStyle: prev && prev.style, ...this.listener() };
    const parts = [];
    if (!this.songs) parts.push(pick(WELCOME));
    else {
      if (prev && Math.random() < 0.65) parts.push(pick(OUTROS));
      if (this.songs % 3 === 0) {
        parts.push(pick(AD_BREAK_IN), ...this.ads(), pick(AD_BREAK_OUT));
      } else {
        const fillers = [STATION_IDS, BANTER, BANTER, NEWS, CALLERS];
        if (v.dps) fillers.push(ROASTS, ROASTS);
        parts.push(pick(pick(fillers)));
      }
      parts.push(pick(INTROS));
    }
    // A part needing a value the listener lacks drops out whole (no half a joke).
    return parts.map((part) => part.map(([who, line]) => ({ who, text: fill(line, v) })))
      .filter((part) => part.every((l) => l.text)).flat();
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

  // The hosts speak, one line after another, the music ducked under them; then it comes back up.
  say(lines) {
    const synth = window.speechSynthesis;
    if (this.stopped || !lines.length || !synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    const voices = this.voices();
    // A new break cuts the one still talking (a song cut short).
    const id = (this.talkId = (this.talkId || 0) + 1);
    if (this.talking) synth.cancel();
    this.talking = true;
    let i = 0;
    const done = () => {
      if (id !== this.talkId) return;
      this.talking = false;
      if (this.stopped) return;
      this.duck(1, 1.2);
      this.emit({ type: 'quiet' });
    };
    const next = () => {
      if (this.stopped || id !== this.talkId) return;
      if (i >= lines.length) { done(); return; }
      const { who, text } = lines[i++];
      const host = HOSTS[who] || HOSTS.rex;
      const u = new SpeechSynthesisUtterance(text);
      if (voices[who]) u.voice = voices[who];
      u.pitch = host.pitch;
      u.rate = host.rate;
      u.volume = this.volume();
      this.duck(who === 'ad' ? AD_DUCK : DUCK, 0.4);
      this.emit({ type: 'say', who: host.name, text });
      u.onend = () => setTimeout(next, 180);
      u.onerror = () => done(); // cancelled (a raid callout took the voice, or the station stopped)
      synth.speak(u);
    };
    next();
  }

  duck(level, secs) {
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(level, t, secs / 3);
  }

  // As loud as the music around it, a little over so the words come through.
  volume() {
    const s = this.sound.s;
    if (s.muted || !s.music) return 0;
    return Math.max(0, Math.min(1, (s.volume ?? 0.7) * Math.min(1, (s.musicVolume ?? 0.35) * 2.6)));
  }

  // A voice for each host: English voices, a different one each where there are enough, the hosts' own picks first.
  voices() {
    const all = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    const out = {};
    const used = new Set();
    for (const [who, host] of Object.entries(HOSTS)) {
      const fresh = all.filter((v) => !used.has(v.name));
      const pool = fresh.length ? fresh : all;
      const v = pool.find((x) => host.prefer.some((re) => re.test(x.name))) || pool[0];
      if (v) { out[who] = v; used.add(v.name); }
    }
    return out;
  }
}

// A line with the listener's values in; null when it needs one they lack (no fight yet: no roast).
function fill(line, v) {
  let missing = false;
  const text = line.replace(/\{(\w+)\}/g, (_, k) => {
    if (v[k] == null || v[k] === '') { missing = true; return ''; }
    return String(v[k]);
  });
  return missing ? null : text;
}
