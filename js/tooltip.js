// One WoW-style tooltip for the whole page. An element opts in with data-tt="kind:arg"; the builder for that
// kind returns the tooltip's HTML (or nothing). The tooltip follows the mouse and is rebuilt while it shows,
// so cooldowns and time left stay current. Elements can be re-rendered freely: nothing is bound to them.
let tip = null;
let current = null; // { el, kind, arg }
let builders = {};
let lastMouse = { x: 0, y: 0 };

function render() {
  if (!current) return;
  if (!current.el.isConnected) { hide(); return; }
  const html = builders[current.kind] ? builders[current.kind](current.arg, current.el) : '';
  if (!html) { tip.classList.add('hidden'); return; }
  if (tip.innerHTML !== html) tip.innerHTML = html;
  tip.classList.remove('hidden');
  place();
}

// Below-right of the pointer, flipped to stay inside the window.
function place() {
  const pad = 14;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let x = lastMouse.x + pad;
  let y = lastMouse.y + pad;
  if (x + w > window.innerWidth - 4) x = lastMouse.x - w - pad;
  if (y + h > window.innerHeight - 4) y = lastMouse.y - h - pad;
  tip.style.left = `${Math.max(4, x)}px`;
  tip.style.top = `${Math.max(4, y)}px`;
}

function hide() {
  current = null;
  if (tip) tip.classList.add('hidden');
}

export function initTooltips(kinds) {
  builders = kinds;
  tip = document.createElement('div');
  tip.className = 'tooltip hidden';
  document.body.appendChild(tip);
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('[data-tt]');
    if (!el) { hide(); return; }
    const [kind, ...rest] = el.dataset.tt.split(':');
    current = { el, kind, arg: rest.join(':') };
    render();
  });
  document.addEventListener('mousemove', (e) => {
    lastMouse = { x: e.clientX, y: e.clientY };
    if (current && !tip.classList.contains('hidden')) place();
  });
  document.addEventListener('mousedown', () => { if (current) setTimeout(render, 0); });
  window.addEventListener('blur', hide);
  setInterval(render, 200);
}

// Small helpers for building tooltip HTML.
export const ttEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function ttRows(rows) {
  return rows.filter(Boolean).map((r) => (Array.isArray(r)
    ? `<div class="tt-row"><span>${r[0] || ''}</span><span>${r[1] || ''}</span></div>`
    : `<div class="tt-line">${r}</div>`)).join('');
}
