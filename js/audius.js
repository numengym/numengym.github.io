// Real music for the Audius station of Radio Numen (radio.js): this week's charts of a few genres from the Audius API,
// which needs no login or key (https://docs.audius.org). A track streams as an MP3 through the Web Audio graph, so it
// fades and ducks under the hosts as the station's own songs do. Nothing is stored, as its API terms ask.
// Only tracks under the Audius Open Music License play (https://audius.org/open-music-license.pdf): that is a track with
// no licence of its own; it asks for credit, a link and a notice of the licence, which the speaker menu shows (main.js).
const API = 'https://api.audius.co/v1';
const APP = 'NumenGym';
const GENRES = ['Electronic', 'House', 'Dubstep', 'Hip-Hop/Rap', 'Rock', 'Metal'];
const PER_GENRE = 30;
const MIN_SECS = 60;  // not a sketch
const MAX_SECS = 480; // nor an hour-long mix
const LEVEL = 0.4;    // mastered tracks are louder than the songs the station synthesises
const START_TIMEOUT = 15000; // a stream that has not started by now is skipped

const playable = (t) => t.is_streamable && t.access && t.access.stream && !t.is_stream_gated && !t.is_unlisted
  && !t.license && !t.cover_original_song_title && !(t.allowed_api_keys && t.allowed_api_keys.length)
  && t.duration >= MIN_SECS && t.duration <= MAX_SECS;

// The tracks to play, each once: { id, name, artist, style (as the caption shows it), url, link, audius: true }. Empty
// when no chart can be had.
export async function audiusTracks() {
  const charts = await Promise.allSettled(GENRES.map((genre) => fetch(`${API}/tracks/trending?limit=${PER_GENRE}&time=week&app_name=${APP}&genre=${encodeURIComponent(genre)}`)
    .then((r) => (r.ok ? r.json() : { data: [] }))));
  const tracks = new Map();
  for (const chart of charts) {
    for (const t of (chart.status === 'fulfilled' && chart.value.data) || []) {
      if (!playable(t)) continue;
      const artist = (t.user && t.user.name) || 'Unknown artist';
      tracks.set(t.id, {
        id: t.id, name: t.title, artist, style: `${artist}, on Audius`, audius: true,
        url: `${API}/tracks/${t.id}/stream?app_name=${APP}`, link: `https://audius.co${t.permalink}`,
      });
    }
  }
  return [...tracks.values()];
}

// One track, played like the station's own songs: onRound when it ends, and onFail when it cannot be played.
export class AudiusPlayer {
  constructor(ctx, dest, track) {
    this.ctx = ctx;
    this.gain = ctx.createGain();
    this.gain.connect(dest);
    this.el = new Audio();
    this.el.crossOrigin = 'anonymous'; // or the Web Audio graph hears silence
    this.el.src = track.url;
    ctx.createMediaElementSource(this.el).connect(this.gain);
    this.stopped = false;
    this.onRound = null;
    this.onFail = null;
  }

  fail() { if (!this.stopped && this.onFail) this.onFail(); }

  start() {
    const t = this.ctx.currentTime;
    this.gain.gain.setValueAtTime(0.0001, t);
    this.gain.gain.setTargetAtTime(LEVEL, t, 0.4);
    this.el.addEventListener('ended', () => { if (!this.stopped && this.onRound) this.onRound(); });
    this.el.addEventListener('error', () => this.fail());
    this.startTimer = setTimeout(() => { if (!this.el.currentTime) this.fail(); }, START_TIMEOUT);
    this.el.play().catch(() => this.fail());
  }

  stop(secs = 1.5) {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.startTimer);
    this.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, secs / 4);
    setTimeout(() => {
      this.el.pause();
      this.el.removeAttribute('src');
      this.el.load();
      this.gain.disconnect();
    }, secs * 1000 + 100);
  }
}
