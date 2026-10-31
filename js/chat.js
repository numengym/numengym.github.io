// The chat box (bottom left), as in WoW: Enter opens it and sends, "/" opens it on a command, Escape closes it. A line
// goes to everyone in your group (group-play.js); alone, it shows only to you. Slash commands run here instead:
// /rl reloads, /kb binds keys by hovering your action bar buttons, /clear empties the box, /help lists them.
const MAX_LINES = 80;
const MAX_LENGTH = 200;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Chat {
  // el: the box (with .chat-log and .chat-input); send(text): to the group; commands: { name: { help, run(args) } };
  // aliases: { short: name }.
  constructor(el, { send, commands = {}, aliases = {} }) {
    this.el = el;
    this.log = el.querySelector('.chat-log');
    this.input = el.querySelector('.chat-input');
    this.send = send;
    this.commands = commands;
    this.aliases = aliases;
    this.history = [];
    this.at = 0;
    this.input.maxLength = MAX_LENGTH;
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.input.addEventListener('blur', () => { if (!this.input.value.trim()) this.close(); });
  }

  get isOpen() { return !this.input.classList.contains('hidden'); }

  open(prefill = '') {
    this.el.classList.add('open');
    this.input.classList.remove('hidden');
    this.input.value = prefill;
    this.input.focus();
    this.at = this.history.length;
  }

  close() {
    this.input.value = '';
    this.input.classList.add('hidden');
    this.el.classList.remove('open');
    this.input.blur();
  }

  // A line in the box: kind 'say' (a player's: who, colour) or 'system' (yellow, the game's own).
  line(text, { kind = 'system', who = null, color = null } = {}) {
    const row = document.createElement('div');
    row.className = `chat-line ${kind}`;
    row.innerHTML = who ? `<b style="${color ? `color:${esc(color)}` : ''}">[${esc(who)}]</b>: ${esc(text)}` : esc(text);
    this.log.appendChild(row);
    while (this.log.children.length > MAX_LINES) this.log.firstChild.remove();
    this.log.scrollTop = this.log.scrollHeight;
    // Lines fade out after a while, as in WoW, until the box is hovered or open.
    row.dataset.at = String(Date.now());
    setTimeout(() => row.classList.add('old'), 30000);
  }

  clear() { this.log.innerHTML = ''; }

  onKey(e) {
    e.stopPropagation(); // typing here presses no ability and moves no one
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.at = Math.max(0, Math.min(this.history.length, this.at + (e.key === 'ArrowUp' ? -1 : 1)));
      this.input.value = this.history[this.at] || '';
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const text = this.input.value.trim().slice(0, MAX_LENGTH);
    this.close();
    if (!text) return;
    this.history.push(text);
    if (this.history.length > 30) this.history.shift();
    if (text.startsWith('/')) this.command(text);
    else this.send(text);
  }

  command(text) {
    const [word, ...rest] = text.slice(1).split(/\s+/);
    const name = this.aliases[word.toLowerCase()] || word.toLowerCase();
    const cmd = this.commands[name];
    if (!cmd) { this.line(`Unknown command: /${word}. Type /help for the list.`); return; }
    cmd.run(rest.join(' '));
  }

  // The commands and what they do, one line each.
  help() {
    const shorts = (name) => Object.entries(this.aliases).filter(([, n]) => n === name).map(([a]) => `/${a}`);
    for (const [name, cmd] of Object.entries(this.commands)) this.line(`/${name}${shorts(name).length ? ` (${shorts(name).join(', ')})` : ''}: ${cmd.help}`);
  }
}
