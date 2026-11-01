// A spec's tutorial (js/data/tutorials): its steps one at a time on a card, over the game darkened and blurred, with
// the action bar buttons a step is about cut out of the shade and ringed. Next / Back (or → ←, Enter), Skip (Esc).
// Keys go to the tutorial while it is open, not the game.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PAD = 5; // the cut-out's margin around a button

// title: the spec ("Fury Warrior"); steps: [{ title, text, abilities? }]; color: the class colour;
// onClose(finished): skipped (false) or played to the end (true).
export function runTutorial({ title, steps, color = '#e6c27a', onClose = () => {} }) {
  const root = document.createElement('div');
  root.className = 'tut';
  root.style.setProperty('--c', color);
  root.innerHTML = `<div class="tut-shade"></div><div class="tut-rings"></div>
    <section class="tut-card" role="dialog" aria-modal="true" aria-labelledby="tut-title">
      <header><span class="tut-spec">${esc(title)}</span><span class="tut-count"></span></header>
      <h2 id="tut-title"></h2><p class="tut-text"></p>
      <div class="tut-dots"></div>
      <footer><button type="button" class="ghost" data-skip>Skip tutorial</button><span></span>
        <button type="button" class="ghost" data-back>Back</button><button type="button" class="primary" data-next>Next</button></footer>
    </section>`;
  document.body.appendChild(root);
  const shade = root.querySelector('.tut-shade');
  const rings = root.querySelector('.tut-rings');
  const card = root.querySelector('.tut-card');
  let at = 0;
  let raf = 0;

  // The buttons of a step that are on screen (an ability you moved off your bars has none).
  const targets = () => (steps[at].abilities || []).flatMap((id) => [...document.querySelectorAll(`.ab[data-id="${CSS.escape(id)}"]`)])
    .filter((el) => el.offsetParent && !root.contains(el));

  // The shade with a hole per button, the rings on them, the card above them (or in the middle without any).
  const layout = () => {
    const w = innerWidth;
    const h = innerHeight;
    const rects = targets().map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.left - PAD, y: r.top - PAD, w: r.width + 2 * PAD, h: r.height + 2 * PAD }));
    const holes = rects.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`).join('');
    shade.style.clipPath = holes ? `path(evenodd, "M0 0H${w}V${h}H0Z${holes}")` : '';
    rings.innerHTML = rects.map((r) => `<i style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></i>`).join('');
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    if (rects.length) {
      const top = Math.min(...rects.map((r) => r.y));
      const mid = (Math.min(...rects.map((r) => r.x)) + Math.max(...rects.map((r) => r.x + r.w))) / 2;
      card.style.left = `${Math.max(12, Math.min(w - cw - 12, mid - cw / 2))}px`;
      card.style.top = `${Math.max(12, top - ch - 22)}px`;
    } else {
      card.style.left = `${(w - cw) / 2}px`;
      card.style.top = `${Math.max(12, (h - ch) / 2 - 40)}px`;
    }
  };
  // Followed every frame: the bars redraw (a cooldown, a stance) and the window resizes.
  const follow = () => { layout(); raf = requestAnimationFrame(follow); };

  const show = () => {
    const step = steps[at];
    root.querySelector('#tut-title').textContent = step.title;
    root.querySelector('.tut-text').innerHTML = step.text; // our own text, with <b> marks
    root.querySelector('.tut-count').textContent = `${at + 1} / ${steps.length}`;
    root.querySelector('.tut-dots').innerHTML = steps.map((_, i) => `<i class="${i === at ? 'on' : i < at ? 'done' : ''}"></i>`).join('');
    root.querySelector('[data-back]').disabled = at === 0;
    root.querySelector('[data-next]').textContent = at === steps.length - 1 ? 'Let\'s go' : 'Next';
    layout();
  };

  const close = (finished) => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    root.remove();
    onClose(finished);
  };
  const go = (d) => {
    if (at + d >= steps.length) return close(true);
    at = Math.max(0, at + d);
    show();
  };
  const onKey = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };
  window.addEventListener('keydown', onKey, true);
  root.querySelector('[data-next]').addEventListener('click', () => go(1));
  root.querySelector('[data-back]').addEventListener('click', () => go(-1));
  root.querySelector('[data-skip]').addEventListener('click', () => close(false));
  show();
  follow();
  root.querySelector('[data-next]').focus();
}
