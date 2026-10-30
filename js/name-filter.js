// Player names, kept civil: a slur or a swear word in a name (your own, another player's in a group, one on Numen
// Logs) is not refused with an error but swapped for its most politely correct stand-in, so "NiggerShit" plays as
// "Human Feces". Spellings with numbers or symbols for letters (sh1t, $hit), stretched letters (fuuuck) and dots or
// spaces between them (f.u.c.k) are caught too; ordinary words that only contain one (grape, spicy, raccoon,
// Scunthorpe, peacock) are left alone.

// [the words, their stand-in]. A word's endings (-er, -ing, -ed, -s...) go with it.
const WORDS = [
  [['nigger', 'nigga', 'niggah', 'nigguh', 'niggaz', 'nigg', 'nigr', 'jigaboo', 'porchmonkey', 'coon'], 'Human'],
  [['chink', 'gook', 'zipperhead'], 'Valued Neighbour'],
  [['spic', 'spick', 'wetback', 'beaner'], 'Esteemed Neighbour'],
  [['kike', 'heeb'], 'Cherished Neighbour'],
  [['raghead', 'towelhead', 'sandnigger'], 'Hat Enthusiast'],
  [['paki'], 'Pen Pal'],
  [['faggot', 'fagot', 'fag'], 'Fabulous Fellow'],
  [['tranny'], 'Person'],
  [['dyke'], 'Dam Engineer'],
  [['retard', 'spaz'], 'Differently Clever'],
  [['hitler'], 'Failed Painter'],
  [['nazi', 'heil', 'kkk'], 'Knitting Club'],
  [['rapist', 'rape'], 'Consent Advocate'],
  [['pedophile', 'paedophile', 'pedo', 'paedo'], 'Background Check'],
  [['motherfucker', 'motherfuck'], 'Mother Admirer'],
  [['fuck', 'fck', 'fuk', 'phuck'], 'Fiddle'],
  [['shit', 'sht'], 'Feces'],
  [['cunt'], 'Lady Garden'],
  [['vagina'], 'Lady Garden'],
  [['penis', 'dick', 'cock'], 'Gentleman Sausage'],
  [['pussy'], 'Kitty'],
  [['bitch'], 'Female Dog'],
  [['whore', 'slut', 'hoe'], 'Social Butterfly'],
  [['asshole', 'arsehole'], 'Rear Admiral'],
  [['twat', 'wanker', 'wank'], 'Twit'],
  [['piss'], 'Lemonade'],
];

// Ordinary words with one of them inside.
const ALLOWED = ['grape', 'drape', 'scrape', 'therapist', 'therapeutic', 'rapeseed', 'spicy', 'spice', 'despicable', 'auspicious',
  'conspicuous', 'perspicacious', 'raccoon', 'cocoon', 'tycoon', 'scunthorpe', 'snigger', 'niggard', 'peacock', 'cockatoo',
  'cockatiel', 'hancock', 'cockpit', 'cockroach', 'cocktail', 'shuttlecock', 'woodcock', 'gamecock', 'cockney', 'dickens',
  'dickinson', 'benedick', 'torpedo', 'pedometer', 'pakistan', 'fagin', 'vandyke', 'retardant', 'shoe', 'hoeing', 'phoenix',
  'heilong', 'nazir', 'mississippi', 'shitake', 'shiitake', 'kakkk', 'coonhound', 'kikeriki', 'spick and span', 'spickandspan'];

// Numbers and symbols for letters, one for one (so a match's place is the same in the name).
const LEET = { 0: 'o', 1: 'i', '!': 'i', '|': 'i', 3: 'e', 4: 'a', '@': 'a', 5: 's', $: 's', 7: 't', 8: 'b', 9: 'g', 6: 'g', '+': 't' };
const normal = (s) => [...s.toLowerCase()].map((c) => LEET[c] || c).join('');

// A word as a pattern: each letter one or more times, anything not a letter allowed between them. Its endings go
// with it (ENDINGS, from where it stops), as long as they do not run into the next bad word ("NiggerShit").
const pattern = (w) => [...w].map((c) => `${c}+`).join('[^a-z]*');
const ENDINGS = /(?:[^a-z]*(?:ers|er|ings|ing|ed|ies|ie|es|as|az|ah|uh|s|z|y))?/y;
const RULES = WORDS.flatMap(([words, instead]) => words.map((w) => ({ w, instead })))
  .sort((a, b) => b.w.length - a.w.length)
  .map(({ w, instead }) => ({ re: new RegExp(pattern(w), 'g'), instead }));

// The name with every bad word swapped for its stand-in (words on either side spaced from it), at most `max` long.
export function cleanName(name, max = 24) {
  const raw = String(name ?? '');
  const low = normal(raw);
  // Where the allowed words are: no match may touch them.
  const safe = [];
  for (const w of ALLOWED) for (let i = low.indexOf(w); i >= 0; i = low.indexOf(w, i + 1)) safe.push([i, i + w.length]);
  const hits = [];
  for (const { re, instead } of RULES) {
    re.lastIndex = 0;
    for (let m = re.exec(low); m; m = re.exec(low)) {
      const a = m.index;
      const b = a + m[0].length;
      if (!m[0].length) { re.lastIndex++; continue; }
      if (safe.some(([x, y]) => a < y && b > x) || hits.some((h) => a < h.b && b > h.a)) continue;
      hits.push({ a, b, instead });
    }
  }
  if (!hits.length) return raw.slice(0, max);
  hits.sort((x, y) => x.a - y.a);
  hits.forEach((h, i) => {
    ENDINGS.lastIndex = h.b;
    const m = ENDINGS.exec(low);
    const end = h.b + (m ? m[0].length : 0);
    if (end <= (hits[i + 1] ? hits[i + 1].a : low.length)) h.b = end;
  });
  let out = '';
  let at = 0;
  for (const h of hits) {
    const before = raw.slice(at, h.a);
    out += before;
    if (/[A-Za-z0-9]$/.test(out)) out += ' ';
    out += h.instead;
    at = h.b;
    if (/^[A-Za-z0-9]/.test(raw.slice(at))) out += ' ';
  }
  out += raw.slice(at);
  out = out.replace(/\s+/g, ' ').trim();
  // Too long: whole words, as many as fit.
  if (out.length > max) out = out.slice(0, max + 1).replace(/\s+\S*$/, '') || out.slice(0, max);
  return out || 'Polite Adventurer';
}
