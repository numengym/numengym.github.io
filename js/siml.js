// SIML, wowsims Forever's text format for a sim setup (sim/siml/SPEC.md in github.com/wowsims/forever), for the
// rotation: reads the rotation sections of a .siml or .apl.siml file into the APL JSON the rotation helper runs
// (js/apl.js, a wowsims export's player.rotation), and prints such an APL as SIML.
//
// wowsims reads and writes SIML in Go (sim/siml); this is a browser port of the parts a rotation needs:
//   - statements and layout (§3), the rotation sections apl:, prepull:, priority: and group "Name": (§6), var and
//     def lines, when blocks, /// notes and # hidden rows (§6.9, §6.10, §10);
//   - every action and value kind of proto/apl.proto, written from its field list as §8 derives the forms: the short
//     forms (cast, wait, group, sequence, operators...), accessors (target.aura(x).is_active), unit prefixes, bare
//     words and generic calls (kind(positional, field=value));
//   - names (§7) through the name table js/data/siml-names.js, loaded with import() the first time SIML is used.
// The setup sections of a full .siml (gear, buffs, ...) are skipped; `use` (composition) is not supported.
// Printing follows the canonical form (§12): each row and var line is read back, and one that does not read back
// is written as raw JSON.

const WIDTH = 100;
const CLASSES = ['druid', 'hunter', 'mage', 'paladin', 'priest', 'rogue', 'shaman', 'warlock', 'warrior'];
// The fields of Player's spec oneof (§8.4).
const SPECS = ['balance_druid', 'feral_bear_druid', 'feral_cat_druid', 'restoration_druid', 'hunter', 'mage', 'holy_paladin',
  'protection_paladin', 'retribution_paladin', 'dps_priest', 'healer_priest', 'rogue', 'elemental_shaman',
  'enhancement_shaman', 'restoration_shaman', 'warlock', 'dps_warrior', 'protection_warrior'];

// forms.json: the reserved words (§4 note 6) other than the heads and unit words.
const KEYWORDS = new Set(['siml', 'spec', 'talents', 'use', 'var', 'with', 'if', 'on', 'until', 'recast', 'recheck', 'for',
  'and', 'or', 'not', 'true', 'false', 'none', 'other', 'cast', 'channel', 'wait', 'move', 'group', 'sequence', 'schedule',
  'item', 'when', 'def']);
// Words that end an expression or start an action, and so never read as a name or value (§4 note 8).
const STOP = new Set(['if', 'on', 'until', 'recast', 'recheck', 'for', 'with', 'and', 'or', 'not', 'cast', 'channel', 'wait',
  'move', 'group', 'when']);
const CALL_WORDS = new Set(['and', 'or', 'not']);
const NOT_NAMES = new Set([...STOP, 'true', 'false', 'none']);
const TOP_WORDS = new Set(['siml', 'spec', 'talents', 'use', 'var', 'def']);
const HEADS = { aura: 'id', dot: 'id', spell: 'id', boss_spell: 'id', sequence: 's' };
const UNIT_WORDS = {
  self: { type: 'Self' }, target: { type: 'CurrentTarget' }, previous_target: { type: 'PreviousTarget' },
  next_target: { type: 'NextTarget' }, all_targets: { type: 'AllTargets' }, all_players: { type: 'AllPlayers' },
  unknown_unit: {},
};
const UNIT_INDEXED = { target: 'Target', player: 'Player', pet: 'Pet' };
const SETUP_SECTIONS = new Set(['settings', 'gear', 'item_swap', 'consumables', 'buffs', 'party_buffs', 'raid_buffs', 'debuffs',
  'encounter', 'sim']);
const CMP_OPS = { '==': 'OpEq', '!=': 'OpNe', '<': 'OpLt', '<=': 'OpLe', '>': 'OpGt', '>=': 'OpGe' };
const MATH_OPS = { '+': 'OpAdd', '-': 'OpSub', '*': 'OpMul', '/': 'OpDiv' };
const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const CMP_TEXT = invert(CMP_OPS);
const MATH_TEXT = invert(MATH_OPS);

// Precedence, loosest first (§6.5).
const P_TOP = 0, P_OR = 1, P_AND = 2, P_NOT = 3, P_CMP = 4, P_ADD = 5, P_MUL = 6, P_OPERAND = 7;
const LOGIC_PREC = { and: P_AND, or: P_OR };
const MATH_PREC = { OpAdd: P_ADD, OpSub: P_ADD, OpMul: P_MUL, OpDiv: P_MUL };

// ---- The schema: proto/apl.proto and the enums it reads ------------------------------------------------------

// Enums by their short type name (§8.2 needs it): values in order, numbered from 0 unless =N says otherwise.
const ENUM_TEXT = {
  Type: 'TypeUnknown TypeAuto TypeSimple TypeAPL',
  ComparisonOperator: 'OpUnknown OpEq OpNe OpLt OpLe OpGt OpGe',
  MathOperator: 'OpUnknown OpAdd OpSub OpMul OpDiv',
  ExecutePhaseThreshold: 'Unknown E20 E35=3',
  APLValueAutoAttackType: 'UnknownAuto AnyAuto MeleeAuto MainHandAuto OffHandAuto RangedAuto WandAuto',
  SwingType: 'Unknown MainHand=3 OffHand Ranged Wand',
  SwapSet: 'Unknown Main Swap1',
  Strategy: 'Caster Cat Hybrid',
  MobType: 'MobTypeUnknown MobTypeBeast MobTypeDemon MobTypeDragonkin MobTypeElemental MobTypeGiant MobTypeHumanoid ' +
    'MobTypeMechanical MobTypeUndead',
  AreaType: 'AreaTypeUnknown AreaTypeForestGrassland AreaTypeMountainous AreaTypeSnowy AreaTypeDesert AreaTypeSwamp ' +
    'AreaTypeWasteland AreaTypeHaunted AreaTypeCavernous AreaTypeVolcanic AreaTypeStrongholdsCities',
  TotemType: 'TypeUnknownTotem Earth Air Fire Water',
  CurseOptions: 'Elements Recklessness=3 NoCurse Weakness',
  Summon: 'NoSummon Imp Voidwalker Succubus Felhunter',
  OtherAction: 'OtherActionNone OtherActionWait OtherActionManaRegen OtherActionAttack OtherActionShoot ' +
    'OtherActionEnergyRegen OtherActionFocusRegen OtherActionPet OtherActionRefund OtherActionDamageTaken ' +
    'OtherActionManaGain OtherActionRageGain OtherActionHealingModel OtherActionMove=20 OtherActionPrepull ' +
    'OtherActionEncounterStart OtherActionItemSwap OtherActionResourcePotion OtherActionDefensivePotion ' +
    'OtherActionOffensivePotion',
  UnitType: 'Unknown Player Target Pet Self CurrentTarget AllPlayers AllTargets PreviousTarget NextTarget',
  Stat: 'StatStrength StatAgility StatStamina StatIntellect StatHealingPower StatSpellDamage StatArcaneDamage ' +
    'StatFireDamage StatFrostDamage StatHolyDamage StatNatureDamage StatShadowDamage StatSpellPiercing StatSpirit ' +
    'StatAttackPower StatRangedAttackPower StatFeralAttackPower StatHitRating StatCritRating StatHasteRating ' +
    'StatArmorPenetration StatExpertiseRating StatDefenseRating StatBlockRating StatBlockValue StatDodgeRating ' +
    'StatParryRating StatArmor StatBonusArmor StatHealth StatMana StatMP5 StatArcaneResistance StatFireResistance ' +
    'StatFrostResistance StatNatureResistance StatShadowResistance StatPhysicalDamage StatArmorNoMods',
};

// Fields in declaration order, `name:type`. Types: v APLValue, a APLAction, id ActionID, u UnitReference, b bool,
// i int32, d double, s string, st a stat (an int32 named by Stat), an enum by its name above, @Message, and [] for a
// repeated field.
const ACTION_TEXT = {
  cast_spell: 'spell_id:id target:u',
  cast_friendly_spell: 'spell_id:id target:u',
  channel_spell: 'spell_id:id target:u interrupt_if:v allow_recast:b',
  multidot: 'spell_id:id max_dots:i max_overlap:v',
  strict_multidot: 'spell_id:id max_dots:i max_overlap:v',
  multishield: 'spell_id:id max_shields:i max_overlap:v',
  cast_all_stat_buff_cooldowns: 'stat_type1:st stat_type2:st stat_type3:st',
  autocast_other_cooldowns: '',
  wait: 'duration:v',
  wait_until: 'condition:v',
  schedule: 'schedule:s inner_action:a',
  sequence: 'name:s actions:a[]',
  reset_sequence: 'sequence_name:s',
  strict_sequence: 'actions:a[]',
  change_target: 'new_target:u',
  activate_aura: 'aura_id:id',
  activate_aura_with_stacks: 'aura_id:id num_stacks:i',
  activate_all_stat_buff_proc_auras: 'swap_set:SwapSet stat_type1:st stat_type2:st stat_type3:st',
  cancel_aura: 'aura_id:id',
  trigger_icd: 'aura_id:id',
  item_swap: 'swap_set:SwapSet',
  move: 'range_from_target:v recheck_while_moving:b',
  move_duration: 'duration:v',
  pet_attack: '',
  start_attack: '',
  guardian_hotw_dps_rotation: 'strategy:Strategy',
  cast_warlock_assigned_curse: 'target:u',
  custom_rotation: '',
  group_reference: 'group_name:s variables:@APLValueVariable[]',
};

const STATS3 = 'stat_type1:st stat_type2:st stat_type3:st';
const PROCS = `${STATS3} min_icd_seconds:d`;
const VALUE_TEXT = {
  const: 'val:s', and: 'vals:v[]', or: 'vals:v[]', not: 'val:v',
  cmp: 'op:ComparisonOperator lhs:v rhs:v', math: 'op:MathOperator lhs:v rhs:v', max: 'vals:v[]', min: 'vals:v[]',
  current_time: '', current_time_percent: '', remaining_time: '', remaining_time_percent: '',
  is_execute_phase: 'threshold:ExecutePhaseThreshold', number_targets: '', encounter_in_area: 'area_type:AreaType',
  boss_spell_time_to_ready: 'target_unit:u spell_id:id', boss_spell_is_casting: 'target_unit:u spell_id:id',
  boss_current_target: 'target_unit:u', target_is_mob_type: 'target_unit:u mob_type:MobType',
  current_health: 'source_unit:u', current_health_percent: 'source_unit:u', current_mana: 'source_unit:u',
  current_mana_percent: 'source_unit:u', current_rage: '', current_energy: '', current_combo_points: '',
  current_generic_resource: '', current_mana_regen: '', max_health: '', max_mana: '', max_combo_points: '',
  max_energy: '', max_rage: '', time_to_next_energy_tick: '', energy_time_to_target: 'target_energy:v',
  unit_is_moving: 'source_unit:u', unit_distance: 'source_unit:u', unit_movement_speed: 'source_unit:u',
  gcd_is_ready: '', gcd_time_to_ready: '',
  auto_swing_time: 'auto_type:SwingType', auto_time_to_next: 'auto_type:APLValueAutoAttackType',
  auto_time_since_last: 'auto_type:APLValueAutoAttackType',
  spell_is_known: 'spell_id:id', spell_can_cast: 'spell_id:id', spell_in_range: 'spell_id:id', spell_is_ready: 'spell_id:id',
  spell_time_to_ready: 'spell_id:id', spell_cast_time: 'spell_id:id', spell_travel_time: 'spell_id:id',
  spell_cpm: 'spell_id:id', spell_is_casting: 'spell_id:id', spell_is_channeling: 'spell_id:id',
  spell_channeled_ticks: 'spell_id:id', spell_current_cost: 'spell_id:id', spell_num_charges: 'spell_id:id',
  spell_time_to_charge: 'spell_id:id', spell_gcd_hasted_duration: 'spell_id:id', spell_full_cooldown: 'spell_id:id',
  spell_in_flight: 'spell_id:id', spell_expected_dpet: 'spell_id:id target_unit:u', spell_is_hit_capped: 'spell_id:id',
  spell_is_expertise_capped: 'spell_id:id',
  talent_is_known: 'talent_id:id', talent_rank: 'talent_id:id',
  aura_is_known: 'source_unit:u aura_id:id',
  aura_is_active: 'source_unit:u aura_id:id include_reaction_time:b',
  aura_is_inactive: 'source_unit:u aura_id:id include_reaction_time:b',
  aura_remaining_time: 'source_unit:u aura_id:id',
  aura_num_stacks: 'source_unit:u aura_id:id include_reaction_time:b',
  aura_internal_cooldown: 'source_unit:u aura_id:id',
  aura_icd_is_ready: 'source_unit:u aura_id:id include_reaction_time:b',
  aura_should_refresh: 'source_unit:u aura_id:id max_overlap:v',
  aura_duration: 'source_unit:u aura_id:id',
  all_item_stat_procs_active: PROCS, any_item_stat_procs_active: PROCS, any_item_stat_procs_available: PROCS,
  item_procs_min_remaining_time: PROCS, item_procs_max_remaining_icd: PROCS, num_equipped_stat_proc_items: PROCS,
  num_stat_buff_cooldowns: STATS3, any_stat_buff_cooldowns_active: STATS3, any_stat_buff_cooldowns_min_duration: STATS3,
  dot_is_active: 'target_unit:u spell_id:id', dot_is_active_on_all_targets: 'spell_id:id',
  dot_remaining_time: 'target_unit:u spell_id:id', dot_lowest_remaining_time: 'spell_id:id',
  dot_tick_frequency: 'target_unit:u spell_id:id', dot_time_to_next_tick: 'target_unit:u spell_id:id',
  dot_base_duration: 'spell_id:id', dot_percent_increase: 'spell_id:id target_unit:u use_base_value:b',
  dot_tick_rate_percent_increase: 'spell_id:id target_unit:u use_base_value:b',
  sequence_is_complete: 'sequence_name:s', sequence_is_ready: 'sequence_name:s', sequence_time_to_ready: 'sequence_name:s',
  channel_clip_delay: '', input_delay: '', front_of_target: '',
  totem_remaining_time: 'totem_type:TotemType include_reaction_time:b',
  warlock_assigned_curse_is_active: 'target_unit:u', warlock_is_assigned_curse: 'curse_type:CurseOptions',
  warlock_active_pet: 'summon:Summon', warlock_bane_is_active_on_all_targets: '',
  warlock_assigned_curse_is_active_on_all_targets: '', protection_paladin_damage_taken_last_global: '',
  druid_bleed_is_active: 'target_unit:u', druid_excess_energy: '',
  variable_ref: 'name:s', variable_placeholder: 'name:s', action_group_used: 'name:s',
  active_item_swap_set: 'swap_set:SwapSet',
  multiple_cd_usages: 'base_spell_id:id target_spell_id:id offset:v align_cd_end:b',
  selected_potion: 'potion_id:id slot:OtherAction', selected_conjured: 'conjured_id:id',
};

const MESSAGE_TEXT = {
  APLRotation: 'type:Type prepull_actions:@APLPrepullAction[] priority_list:@APLListItem[] groups:@APLGroup[] ' +
    'value_variables:@APLValueVariable[]',
  APLPrepullAction: 'action:a do_at_value:v hide:b',
  APLListItem: 'hide:b notes:s action:a',
  APLGroup: 'name:s actions:@APLListItem[] variables:@APLValueVariable[]',
  APLValueVariable: 'name:s value:v',
  ActionID: 'spell_id:i item_id:i other_id:OtherAction tag:i rank:i',
  UnitReference: 'type:UnitType index:i owner:u',
};

const camel = (s) => s.replace(/_([a-z0-9])/g, (m, c) => c.toUpperCase());

// A CamelCase proto name in snake case (§8.2): FasterAttackII is faster_attack_ii.
function snake(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const up = c >= 'A' && c <= 'Z';
    if (up && i > 0) {
      const prev = s[i - 1];
      const next = s[i + 1] || '';
      if (/[a-z0-9]/.test(prev) || (/[A-Z]/.test(prev) && /[a-z]/.test(next))) out += '_';
    }
    out += c.toLowerCase();
  }
  return out;
}

// The identifier a name folds to (§7.6): Hunter's Mark is hunters_mark.
export function identifier(s) {
  let out = '';
  let sep = false;
  for (const ch of String(s)) {
    if (/[a-z0-9]/.test(ch)) { /* kept */ } else if (/[A-Z]/.test(ch)) { /* lowercased below */ } else if (ch === "'" || ch === '\u2019') continue;
    else { sep = true; continue; }
    if (sep && out) out += '_';
    sep = false;
    out += ch.toLowerCase();
  }
  return out;
}

const ENUMS = {};
for (const [type, text] of Object.entries(ENUM_TEXT)) {
  const values = [];
  let n = 0;
  for (const part of text.split(/\s+/)) {
    const [name, num] = part.split('=');
    if (num !== undefined) n = Number(num);
    values.push({ name, num: n++ });
  }
  // Short names (§8.2): strip the type's name, snake case, and the full name where that collides or is a keyword.
  const cand = values.map(({ name }) => snake(name.startsWith(type) && name.length > type.length ? name.slice(type.length).replace(/^_+/, '') : name));
  values.forEach((v, i) => {
    let s = cand[i];
    if (!s || /^\d/.test(s) || KEYWORDS.has(s) || cand.some((c, j) => j !== i && c === s)) {
      s = snake(v.name);
      if (KEYWORDS.has(s)) s = `${snake(type)}_${s}`;
    }
    v.short = s;
  });
  ENUMS[type] = {
    values,
    byName: new Map(values.map((v) => [v.name, v])),
    byShort: new Map(values.map((v) => [v.short, v])),
    byNum: new Map(values.map((v) => [v.num, v])),
  };
}

function fieldsOf(text) {
  return text.split(/\s+/).filter(Boolean).map((part) => {
    const [name, t] = part.split(':');
    const list = t.endsWith('[]');
    const type = list ? t.slice(0, -2) : t;
    return { name, json: camel(name), type, list };
  });
}

// A kind's form (§8.3): its accessor, unit field, list field (plain arguments) and positional field.
function kindsOf(table, value) {
  const out = {};
  for (const [name, text] of Object.entries(table)) {
    const fields = fieldsOf(text);
    const k = { name, json: camel(name), fields, byName: new Map(fields.map((f) => [f.name, f])), value };
    k.unit = fields.find((f) => f.type === 'u' && !f.list) || null;
    if (fields.length === 1 && fields[0].list) k.list = fields[0];
    else k.positional = fields.find((f) => f.list || ['id', 'st', 's', 'v', 'a'].includes(f.type) || ENUMS[f.type]) || null;
    if (value) {
      const head = Object.keys(HEADS).filter((h) => name.startsWith(`${h}_`)).sort((a, b) => b.length - a.length)[0];
      if (head) {
        const subjects = fields.filter((f) => f.type === HEADS[head] && !f.list);
        const units = fields.filter((f) => f.type === 'u');
        if (subjects.length === 1 && units.length <= 1) k.accessor = { head, prop: name.slice(head.length + 1), subject: subjects[0], unit: units[0] || null };
      }
      if (fields.length === 1 && fields[0].type === 'u') k.unitPrefix = true;
    }
    out[name] = k;
  }
  return out;
}

const ACTIONS = kindsOf(ACTION_TEXT, false);
const VALUES = kindsOf(VALUE_TEXT, true);
const ACTION_BY_JSON = new Map(Object.values(ACTIONS).map((k) => [k.json, k]));
const VALUE_BY_JSON = new Map(Object.values(VALUES).map((k) => [k.json, k]));
const MESSAGES = Object.fromEntries(Object.entries(MESSAGE_TEXT).map(([n, t]) => [n, fieldsOf(t)]));

// ---- The name table ---------------------------------------------------------------------------------------------

let namesPromise = null;
function loadNames() {
  if (!namesPromise) namesPromise = import('./data/siml-names.js').then((m) => buildNames(m.default || m.SIML_NAMES));
  return namesPromise;
}

function buildNames(raw) {
  const parseSpace = (text) => {
    const byName = new Map();
    const byId = new Map();
    for (const e of String(text || '').split(/\s+/)) {
      if (!e) continue;
      const [name, id, tag, rank] = e.split(':');
      const ref = { spellId: Number(id) };
      if (Number(tag)) ref.tag = Number(tag);
      if (Number(rank)) ref.rank = Number(rank);
      byName.set(name, ref);
      byId.set(`${ref.spellId}:${ref.tag || 0}`, name);
    }
    return { byName, byId };
  };
  const scope = (o) => Object.fromEntries(Object.entries(o || {}).map(([ns, text]) => [ns, parseSpace(text)]));
  const items = { byName: new Map(), byId: new Map() };
  for (const e of String(raw.items || '').split(/\s+/)) {
    if (!e) continue;
    const [name, id] = e.split(':');
    items.byName.set(name, Number(id));
    if (!items.byId.has(Number(id))) items.byId.set(Number(id), name);
  }
  const classes = Object.fromEntries(Object.entries(raw.classes || {}).map(([c, o]) => [c, scope(o)]));
  const common = scope(raw.common);
  const shared = scope(raw.shared);
  // A spell-like name means the class's entry, else the shared one; with no class, only the shared (§7.1).
  const scopes = (cls) => (cls && classes[cls] ? [classes[cls], common, shared] : [shared]);
  return {
    spell(cls, ns, name) {
      for (const s of scopes(cls)) { const r = s[ns] && s[ns].byName.get(name); if (r) return r; }
      return null;
    },
    nameOf(cls, ns, spellId, tag) {
      const key = `${spellId}:${tag || 0}`;
      for (const s of scopes(cls)) { const n = s[ns] && s[ns].byId.get(key); if (n) return n; }
      return null;
    },
    item: (name) => items.byName.get(name),
    itemName: (id) => items.byId.get(id) || null,
  };
}

// ---- Lexer (§2) --------------------------------------------------------------------------------------------------

const UNITS = ['ns', 'us', '\u00b5s', 'ms', 's', 'm', 'h'];
const isIdentChar = (c) => c !== undefined && /[A-Za-z0-9_]/.test(c);
const isDigit = (c) => c !== undefined && c >= '0' && c <= '9';
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function digitsEnd(s, p) { while (isDigit(s[p])) p++; return p; }
function suffixEnd(s, p) {
  const ends = (e) => !isIdentChar(s[e]);
  if (s[p] === '%' && ends(p + 1)) return [p + 1, true];
  for (let end = p; ;) {
    const unit = UNITS.find((u) => s.startsWith(u, end));
    if (!unit) break;
    end += unit.length;
    if (ends(end)) return [end, true];
    let next = digitsEnd(s, end);
    if (next === end) break;
    if (s[next] === '.' && isDigit(s[next + 1])) next = digitsEnd(s, next + 1);
    end = next;
  }
  return [p, ends(p)];
}
// Where the literal at p ends: a number, then %, a unit or a compound duration such as 1m30s.
function literalEnd(s, p) {
  const whole = digitsEnd(s, p);
  if (whole === p) return [0, false];
  if (s[whole] === '.' && isDigit(s[whole + 1])) {
    const r = suffixEnd(s, digitsEnd(s, whole + 1));
    if (r[1]) return r;
  }
  return suffixEnd(s, whole);
}
function isLiteral(text) {
  const s = String(text).replace(/^-/, '');
  const [end, ok] = literalEnd(s, 0);
  return ok && end === s.length;
}

class SimlError extends Error {}
const fail = (line, col, message) => { throw new SimlError(`${line}:${col} ${message}`); };

function lex(src, warn) {
  src = src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const tokens = [];
  const notes = new Map(); // line -> note text
  const used = new Set(); // lines with a token, comment or note
  let line = 1;
  let lineStart = 0;
  let i = 0;
  const col = (p) => p - lineStart + 1;
  const push = (k, start, end, extra) => {
    const t = { k, text: src.slice(start, end), start, end, line, col: col(start), endLine: line, ...extra };
    tokens.push(t);
    used.add(line);
    return t;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; lineStart = ++i; continue; }
    if (c === ' ' || c === '\t' || c === '\v' || c === '\f') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') {
      let end = src.indexOf('\n', i);
      if (end < 0) end = src.length;
      used.add(line);
      if (src[i + 2] === '/') {
        if (src.slice(lineStart, i).trim()) warn(line, col(i), 'a /// note goes on a line of its own, above its row');
        else notes.set(line, { text: src.slice(i + 3, end).replace(/^ /, '').replace(/[ \t]+$/, ''), col: col(i) });
      }
      i = end;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let end = i + 1;
      while (isIdentChar(src[end])) end++;
      push('ident', i, end);
      i = end;
      continue;
    }
    if (isDigit(c)) {
      const [end, ok] = literalEnd(src, i);
      if (!ok || src[end] === '.') {
        let bad = i + 1;
        while (isIdentChar(src[bad]) || src[bad] === '.' || src[bad] === '\u00b5') bad++;
        fail(line, col(i), `'${src.slice(i, bad)}' is no number: a number may end in one of % ns us \u00b5s ms s m h, or be a duration such as 1m30s`);
      }
      push('num', i, end);
      i = end;
      continue;
    }
    if (c === '"') {
      let end = i + 1;
      while (end < src.length && src[end] !== '"' && src[end] !== '\n') end += src[end] === '\\' ? 2 : 1;
      if (src[end] !== '"') fail(line, col(i), 'this string is never closed on its line');
      let value;
      try { value = JSON.parse(src.slice(i, end + 1)); } catch { fail(line, col(i), 'a string takes the escapes of JSON only'); }
      push('str', i, end + 1, { value });
      i = end + 1;
      continue;
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1);
      if (end < 0) fail(line, col(i), 'this raw JSON is never closed with a backtick');
      let value;
      try { value = JSON.parse(src.slice(i + 1, end)); } catch (e) { fail(line, col(i), `bad raw JSON: ${e.message}`); }
      const t = push('raw', i, end + 1, { value });
      for (let p = i; p < end; p++) if (src[p] === '\n') { line++; lineStart = p + 1; used.add(line); }
      t.endLine = line;
      i = end + 1;
      continue;
    }
    if (c === '$' || c === '%') {
      const k = c === '$' ? 'var' : 'ph';
      if (src[i + 1] === '{') {
        let name = '';
        let p = i + 2;
        for (; p < src.length && src[p] !== '}' && src[p] !== '\n'; p++) {
          if (src[p] === '\\') {
            const e = src[p + 1];
            if (e === '}' || e === '\\') name += e;
            else if (e === 'n') name += '\n';
            else fail(line, col(p), `a name in ${c}{...} escapes only \\}, \\\\ and \\n`);
            p++;
          } else name += src[p];
        }
        if (src[p] !== '}') fail(line, col(i), `expected a name after ${c}: write ${c}name or ${c}{Name}`);
        push(k, i, p + 1, { value: name, braced: true });
        i = p + 1;
        continue;
      }
      if (/[A-Za-z_]/.test(src[i + 1] || '')) {
        let end = i + 2;
        while (isIdentChar(src[end])) end++;
        push(k, i, end, { value: src.slice(i + 1, end) });
        i = end;
        continue;
      }
      fail(line, col(i), `expected a name after ${c}: write ${c}name or ${c}{Name}`);
    }
    const two = src.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(two)) { push('punct', i, i + 2); i += 2; continue; }
    if (two === '&&' || two === '||' || c === '&' || c === '|') fail(line, col(i), `write ${c === '&' ? 'and' : 'or'} instead of ${c === two[1] ? two : c}`);
    if (c === '!') fail(line, col(i), 'write not instead of !');
    if ('<>+-*/()[],=.:#'.includes(c)) { push('punct', i, i + 1); i++; continue; }
    fail(line, col(i), `unexpected character '${c}'`);
  }
  return { tokens, notes, used, lines: line };
}

// ---- Statements (§3.1) ---------------------------------------------------------------------------------------------

const isP = (t, text) => t && t.k === 'punct' && t.text === text;
const isW = (t, text) => t && t.k === 'ident' && t.text === text;

// `name:` or `group "Name":` on the statement's first line.
function headerShape(tokens, i) {
  const a = tokens[i];
  if (!a || a.k !== 'ident') return false;
  const colon = (k) => isP(tokens[k], ':') && tokens[k].line === a.line;
  if (colon(i + 1)) return true;
  return a.text === 'group' && tokens[i + 1] && tokens[i + 1].k === 'str' && colon(i + 2);
}

function whenShape(tokens, i) {
  if (isP(tokens[i], '#')) i++;
  return isW(tokens[i], 'when') && !isP(tokens[i + 1], '=');
}

// The tokens of each statement: one continues while a bracket is open and, unless it is a header, onto a later line
// indented deeper than its first, with no blank line between, that does not start with a header. A when line ends at
// the first : that ends one of its lines.
function statementsOf(tokens, used) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const indent = tokens[i].col;
    const header = headerShape(tokens, i);
    const when = whenShape(tokens, i);
    let open = 0;
    let j = i;
    for (; ; j++) {
      const t = tokens[j];
      if (isP(t, '(') || isP(t, '[')) open++;
      else if ((isP(t, ')') || isP(t, ']')) && open > 0) open--;
      if (j + 1 >= tokens.length) break;
      const next = tokens[j + 1];
      if (next.line === t.endLine || open > 0) continue;
      if (when && isP(t, ':')) break;
      let gap = false;
      for (let l = t.endLine + 1; l < next.line && !gap; l++) gap = !used.has(l);
      if (gap || header || next.col <= indent || headerShape(tokens, j + 1)) break;
    }
    out.push(tokens.slice(i, j + 1));
    i = j + 1;
  }
  return out;
}

// ---- Parser: a statement's tokens into its syntax tree (§4) ------------------------------------------------------

class Parser {
  constructor(toks) { this.toks = toks; this.i = 0; }
  peek(k = 0) { return this.toks[this.i + k]; }
  atEnd() { return this.i >= this.toks.length; }
  isP(text, k = 0) { return isP(this.peek(k), text); }
  isW(text, k = 0) { return isW(this.peek(k), text); }
  take() { return this.toks[this.i++]; }
  acceptP(text) { if (this.isP(text)) { this.i++; return true; } return false; }
  acceptW(text) { if (this.isW(text)) { this.i++; return true; } return false; }
  expectP(text) { if (!this.acceptP(text)) this.fail(`expected '${text}'`); }
  fail(message) {
    const t = this.peek();
    if (t) fail(t.line, t.col, message);
    const last = this.toks[this.toks.length - 1];
    fail(last.endLine, last.col + last.text.length, message);
  }
  end(message) { if (!this.atEnd()) this.fail(message); }

  // expr = conj { or conj }; conj = neg { and neg }: one `and` or `or` of all its operands.
  expr() { return this.logic('or', () => this.logic('and', () => this.neg())); }
  logic(op, next) {
    const at = this.peek();
    const first = next();
    if (!this.isW(op) || this.callAhead()) return first;
    const items = [first];
    while (this.isW(op) && !this.callAhead()) { this.take(); items.push(next()); }
    return { t: op, items, at };
  }
  // `and(`, `or(` and `not(` with no space before the ( are calls.
  callAhead() { const a = this.peek(); const b = this.peek(1); return isP(b, '(') && b.start === a.end; }
  neg() {
    if (this.isW('not') && !this.callAhead()) {
      const at = this.take();
      return { t: 'not', val: this.neg(), at };
    }
    return this.cmp();
  }
  cmp() {
    const lhs = this.sum();
    const t = this.peek();
    if (t && t.k === 'punct' && CMP_OPS[t.text]) {
      this.take();
      const rhs = this.sum();
      const u = this.peek();
      if (u && u.k === 'punct' && CMP_OPS[u.text]) this.fail('comparisons do not chain: write a < b and b < c');
      return { t: 'cmp', op: CMP_OPS[t.text], lhs, rhs, at: t };
    }
    return lhs;
  }
  sum() {
    let lhs = this.prod();
    while (this.isP('+') || this.isP('-')) { const t = this.take(); lhs = { t: 'math', op: MATH_OPS[t.text], lhs, rhs: this.prod(), at: t }; }
    return lhs;
  }
  prod() {
    let lhs = this.unary();
    while (this.isP('*') || this.isP('/')) { const t = this.take(); lhs = { t: 'math', op: MATH_OPS[t.text], lhs, rhs: this.unary(), at: t }; }
    return lhs;
  }
  unary() {
    if (this.isP('-') && this.peek(1) && this.peek(1).k === 'num') {
      const at = this.take();
      return { t: 'lit', text: `-${this.take().text}`, at };
    }
    return this.operand();
  }
  operand() {
    const t = this.peek();
    if (!t) this.fail('expected a value');
    switch (t.k) {
      case 'num': this.take(); return { t: 'lit', text: t.text, at: t };
      case 'str': this.take(); return { t: 'str', value: t.value, at: t };
      case 'raw': this.take(); return { t: 'raw', json: t.value, at: t };
      case 'var': this.take(); return { t: 'var', name: t.value, braced: !!t.braced, at: t };
      case 'ph': this.take(); return { t: 'ph', name: t.value, at: t };
      case 'punct':
        if (t.text === '(') {
          this.take();
          const inner = this.expr();
          this.expectP(')');
          return { t: 'paren', inner, at: t };
        }
        return this.fail('expected a value');
      default: return this.named();
    }
  }
  named() {
    const t = this.peek();
    if (STOP.has(t.text) && !(CALL_WORDS.has(t.text) && this.callAhead())) this.fail(`expected a value, not '${t.text}'`);
    this.take();
    if (this.isP('.') && this.peek(1) && this.peek(1).k === 'ident') {
      this.take();
      const n2 = this.take();
      if (HEADS[n2.text] && this.isP('(')) return this.accessor(n2, t.text, t);
      return { t: 'dot', prefix: t.text, name: n2.text, at: t, nameAt: n2 };
    }
    if (this.isP('(')) {
      if (HEADS[t.text]) {
        const save = this.i;
        this.args();
        const isAccessor = this.isP('.') && this.peek(1) && this.peek(1).k === 'ident';
        this.i = save;
        if (isAccessor) return this.accessor(t, null, t);
      }
      return { t: 'call', name: t.text, args: this.args(), at: t };
    }
    return { t: 'word', name: t.text, at: t };
  }
  // [prefix.]head(subject).prop[(field=value, ...)]
  accessor(head, prefix, at) {
    const subj = this.args();
    if (subj.length !== 1 || subj[0].name) fail(head.line, head.col, `${head.text}(...) takes its subject alone; write the other fields on the property`);
    this.expectP('.');
    const prop = this.take();
    if (!prop || prop.k !== 'ident') this.fail('expected a property after the dot');
    const args = this.isP('(') ? this.args() : [];
    return { t: 'acc', prefix, head: head.text, subject: subj[0].term, prop: prop.text, args, at };
  }
  args() {
    this.expectP('(');
    const out = [];
    if (!this.isP(')')) {
      for (;;) {
        out.push(this.arg());
        if (!this.acceptP(',')) break;
      }
    }
    this.expectP(')');
    return out;
  }
  arg() {
    const t = this.peek();
    if (t && t.k === 'ident' && this.isP('=', 1)) {
      this.take();
      this.take();
      return { name: t.text, term: this.term(), at: t };
    }
    return { term: this.term(), at: t };
  }
  // A term: an action, a value, a name or unit (typed by its field), or a list.
  term() {
    const t = this.peek();
    if (isP(t, '[')) {
      this.take();
      const items = [];
      if (!this.isP(']')) for (;;) { items.push(this.term()); if (!this.acceptP(',')) break; }
      this.expectP(']');
      return { t: 'list', items, at: t };
    }
    if (this.actionStart()) return this.action();
    const e = this.expr();
    if (this.acceptW('if')) return { t: 'action', step: this.stepOf(e), cond: this.expr(), at: t };
    return e;
  }
  actionStart() {
    const t = this.peek();
    if (!t || t.k !== 'ident') return false;
    if (['cast', 'channel', 'wait', 'move', 'group'].includes(t.text)) return true;
    return (t.text === 'schedule' || t.text === 'sequence') && this.peek(1) && this.peek(1).k === 'str';
  }
  stepOf(e) {
    if (e.t === 'word' && e.name === 'none') return { s: 'none', at: e.at };
    if (e.t === 'word' || e.t === 'call') return { s: 'call', node: e, at: e.at };
    if (e.t === 'raw') return { s: 'raw', json: e.json, at: e.at };
    return fail(e.at.line, e.at.col, 'expected an action before if');
  }
  action() {
    const at = this.peek();
    const step = this.step();
    const cond = this.acceptW('if') ? this.expr() : null;
    return { t: 'action', step, cond, at };
  }
  step() {
    const t = this.peek();
    if (!t) this.fail('expected an action');
    if (t.k === 'raw') { this.take(); return { s: 'raw', json: t.value, at: t }; }
    if (t.k !== 'ident') this.fail('expected an action');
    switch (t.text) {
      case 'none': this.take(); return { s: 'none', at: t };
      case 'cast': case 'channel': {
        this.take();
        const step = { s: t.text, ref: this.ref(), at: t };
        if (this.acceptW('on')) step.on = this.unit();
        if (t.text === 'channel') {
          if (this.acceptW('until')) step.until = this.expr();
          if (this.acceptW('recast')) step.recast = true;
        }
        return step;
      }
      case 'wait':
        this.take();
        if (this.acceptW('until')) return { s: 'waitUntil', expr: this.expr(), at: t };
        return { s: 'wait', expr: this.expr(), at: t };
      case 'move': {
        this.take();
        if (this.acceptW('for')) return { s: 'moveFor', expr: this.expr(), at: t };
        const expr = this.expr();
        return { s: 'move', expr, recheck: this.acceptW('recheck'), at: t };
      }
      case 'group': {
        this.take();
        const name = this.take();
        if (!name || name.k !== 'str') fail(t.line, t.col, 'expected the group\'s name in quotes after group');
        const binds = [];
        if (this.acceptW('with')) {
          for (;;) {
            const ph = this.take();
            if (!ph || ph.k !== 'ph') fail(t.line, t.col, 'expected %placeholder = value after with');
            this.expectP('=');
            binds.push({ name: ph.value, value: this.expr(), at: ph });
            if (this.isP(',') && this.peek(1) && this.peek(1).k === 'ph' && this.isP('=', 2)) this.take();
            else break;
          }
        }
        return { s: 'group', name: name.value, binds, at: t };
      }
      default:
        if (t.text === 'schedule' && this.peek(1) && this.peek(1).k === 'str') {
          this.take();
          const sched = this.take().value;
          return { s: 'schedule', schedule: sched, step: this.step(), at: t };
        }
        if (t.text === 'sequence' && this.peek(1) && this.peek(1).k === 'str') {
          this.take();
          const name = this.take().value;
          this.expectP('[');
          const actions = [];
          if (!this.isP(']')) for (;;) { actions.push(this.action()); if (!this.acceptP(',')) break; }
          this.expectP(']');
          return { s: 'sequence', name, actions, at: t };
        }
        if (STOP.has(t.text)) this.fail(`expected an action, not '${t.text}'`);
        this.take();
        if (this.isP('(')) return { s: 'call', node: { t: 'call', name: t.text, args: this.args(), at: t }, at: t };
        return { s: 'call', node: { t: 'word', name: t.text, at: t }, at: t };
    }
  }
  // A spell, aura or item: a name, item.<name>, other.<short>, none or raw JSON (§7.2).
  ref() {
    const t = this.peek();
    if (!t) this.fail('expected a name');
    if (t.k === 'raw') { this.take(); return { t: 'raw', json: t.value, at: t }; }
    if (t.k === 'var') { this.take(); return { t: 'var', name: t.value, braced: !!t.braced, at: t }; }
    if (t.k !== 'ident' || STOP.has(t.text)) this.fail('expected a name');
    this.take();
    if ((t.text === 'item' || t.text === 'other') && this.isP('.')) {
      this.take();
      const n2 = this.take();
      if (!n2 || n2.k !== 'ident') fail(t.line, t.col, `expected a name after ${t.text}.`);
      return { t: 'dot', prefix: t.text, name: n2.text, at: t, nameAt: n2 };
    }
    return { t: 'word', name: t.text, at: t };
  }
  unit() {
    const t = this.peek();
    if (t && t.k === 'raw') { this.take(); return { t: 'raw', json: t.value, at: t }; }
    if (!t || t.k !== 'ident' || STOP.has(t.text)) this.fail('expected a unit such as self or target');
    this.take();
    return { t: 'word', name: t.text, at: t };
  }
  // A row: [#] [time] step [if expr]. A raw token alone is the whole row's JSON.
  row(prepull, hasNotes, warn) {
    const at = this.peek();
    const hide = this.acceptP('#');
    if (!hide && !hasNotes && this.toks.length === 1 && at.k === 'raw') return { raw: at.value, at };
    let doAt = null;
    if (prepull) {
      if (this.actionStart()) this.fail('a prepull row starts with its time, such as -1s cast x');
      doAt = this.unary();
      if (this.atEnd() || this.isW('if')) fail(at.line, at.col, 'a prepull row starts with its time, such as -1s cast x');
    } else {
      const t = this.peek();
      if (t && (['num', 'str', 'var', 'ph'].includes(t.k) || isP(t, '-') || isP(t, '(') || isW(t, 'true') || isW(t, 'false'))) {
        warn(t.line, t.col, 'only a prepull row has a time; it is not read');
        this.unary();
      }
    }
    const action = this.action();
    if (!this.atEnd()) this.fail(`expected if or the end of the row, not '${this.peek().text}'`);
    return { hide, doAt, action, at };
  }
}

// ---- Typing: syntax trees into the APL JSON (§6, §8) ------------------------------------------------------------

const firstUnitNs = (unit) => {
  const type = unit && unit.type;
  if (!type || ['Self', 'Player', 'AllPlayers', 'Unknown'].includes(type)) return 'aura';
  return type === 'Pet' ? 'pet_aura' : 'target_aura';
};
// The namespace an ActionID field reads (§7.2).
function nsOf(kind, field, unit) {
  if (field.name === 'aura_id') return firstUnitNs(unit);
  if (kind.name.startsWith('boss_spell_')) return 'target_spell';
  return 'spell';
}
const NS_THING = { spell: 'a spell', aura: 'an aura', target_aura: 'an aura on a target', target_spell: 'a boss spell', pet_aura: 'a pet aura' };

const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

// Whether $x reads as name among the declared variables (§7.5): the exact name, else the one that folds to x.
function resolveVariable(x, declared) {
  if (declared.includes(x)) return { found: true, name: x };
  const folded = declared.filter((d) => identifier(d) === x);
  if (folded.length === 1) return { found: true, name: folded[0] };
  return { found: false, ambiguous: folded.length > 1, candidates: folded };
}

class Typer {
  constructor(names, cls, declared, defs, warn) {
    this.names = names;
    this.cls = cls;
    this.declared = declared;
    this.defs = defs;
    this.warn = warn;
    this.expanding = [];
  }
  w(node, message) { const at = (node && node.at) || {}; this.warn(at.line || 0, at.col || 0, message); }

  value(n) {
    switch (n.t) {
      case 'lit': return { const: { val: n.text } };
      case 'str': return { const: { val: n.value } };
      case 'raw': return clone(n.json);
      case 'var': return { variableRef: { name: this.variable(n) } };
      case 'ph': return { variablePlaceholder: { name: n.name } };
      case 'paren': return this.value(n.inner);
      case 'and': case 'or': return { [n.t]: { vals: n.items.map((x) => this.value(x)) } };
      case 'not': return { not: { val: this.value(n.val) } };
      case 'cmp': return { cmp: { op: n.op, lhs: this.value(n.lhs), rhs: this.value(n.rhs) } };
      case 'math': return { math: { op: n.op, lhs: this.value(n.lhs), rhs: this.value(n.rhs) } };
      case 'word': {
        if (n.name === 'true' || n.name === 'false') return { const: { val: n.name } };
        if (n.name === 'none') return {};
        const def = this.defs.get(n.name);
        if (def) return this.viaDef(def, [], n, (x) => this.value(x), {});
        const k = VALUES[n.name];
        if (k) return { [k.json]: {} };
        this.w(n, this.unknownWord(n.name, 'value'));
        return {};
      }
      case 'call': {
        const def = this.defs.get(n.name);
        if (def) return this.viaDef(def, n.args, n, (x) => this.value(x), {});
        const k = VALUES[n.name];
        if (!k) { this.w(n, `no value kind is named ${n.name}`); return {}; }
        return this.kind(k, n.args, null, null, n);
      }
      case 'dot': {
        const k = VALUES[n.name];
        if (!k || !k.unit) { this.w(n, `${n.prefix}.${n.name} is no value: a unit goes before a kind of one unit field, such as self.current_health`); return {}; }
        return this.kind(k, [], { t: 'word', name: n.prefix, at: n.at }, null, n);
      }
      case 'acc': {
        const k = VALUES[`${n.head}_${n.prop}`];
        if (!k || !k.accessor) { this.w(n, `${n.head}(...) has no property ${n.prop}`); return {}; }
        return this.kind(k, n.args, n.prefix ? { t: 'word', name: n.prefix, at: n.at } : null, n.subject, n);
      }
      case 'action': this.w(n, 'expected a value, not an action'); return {};
      case 'list': this.w(n, 'expected a value, not a list'); return {};
      default: this.w(n, 'expected a value'); return {};
    }
  }

  unknownWord(name, what) {
    for (const ns of ['spell', 'aura', 'target_aura']) {
      if (this.names.spell(this.cls, ns, name)) return `${name} is ${NS_THING[ns]}; a ${what} goes here (write e.g. spell(${name}).is_ready)`;
    }
    return `no ${what} is named ${name}`;
  }

  variable(n) {
    if (n.braced) return n.name;
    const r = resolveVariable(n.name, this.declared);
    if (r.found) return r.name;
    if (r.ambiguous) { this.w(n, `$${n.name} could be any of ${r.candidates.map((c) => `\${${c}}`).join(', ')}`); return r.candidates[0]; }
    this.w(n, `no variable is named $${n.name}`);
    return n.name;
  }

  // A def call: the def's value with each parameter replaced by its argument (§6.10).
  viaDef(def, args, at, type, fallback) {
    if (args.length !== def.params.length) {
      this.w(at, `${def.name} takes ${def.params.length} argument${def.params.length === 1 ? '' : 's'}`);
      return fallback;
    }
    if (args.some((a) => a.name)) { this.w(at, `${def.name} takes its arguments by position`); return fallback; }
    if (this.expanding.includes(def.name)) { this.w(at, `${def.name} refers to itself`); return fallback; }
    const map = new Map(def.params.map((p, i) => [p, args[i].term]));
    const body = { t: 'paren', inner: substitute(def.body, map), at: at.at };
    this.expanding.push(def.name);
    try { return type(body); } finally { this.expanding.pop(); }
  }

  // A kind from its arguments (§8.3), an accessor's subject and unit prefix included.
  kind(k, args, unitNode, subject, at) {
    const set = new Map();
    const put = (f, node) => {
      if (set.has(f)) this.w(node, `${f.name} is written twice`);
      set.set(f, node);
    };
    if (unitNode) put(k.unit, unitNode);
    if (subject) put(k.accessor.subject, subject);
    for (const a of args) {
      if (a.name) {
        const f = k.byName.get(a.name);
        if (!f) { this.w(a, `${k.name} has no field ${a.name}`); continue; }
        put(f, a.term);
        continue;
      }
      const bool = a.term.t === 'word' && k.byName.get(a.term.name);
      if (bool && bool.type === 'b') { put(bool, { t: 'word', name: 'true', at: a.term.at }); continue; }
      if (k.list) {
        if (!set.has(k.list)) set.set(k.list, { t: 'list', items: [], at: a.at });
        set.get(k.list).items.push(a.term);
        continue;
      }
      if (!k.positional || set.has(k.positional)) { this.w(a, `${k.name} takes no ${k.positional ? 'second ' : ''}unnamed argument`); continue; }
      put(k.positional, a.term);
    }
    const unit = k.unit && set.has(k.unit) ? this.unit(set.get(k.unit)) : null;
    const body = {};
    for (const f of k.fields) {
      if (!set.has(f)) continue;
      const v = f === k.unit ? unit : this.field(k, f, set.get(f), unit);
      if (!isDefault(v, f)) body[f.json] = v;
    }
    return { [k.json]: body };
  }

  field(k, f, n, unit) {
    if (f.list) {
      const items = n.t === 'list' ? n.items : [n];
      return items.map((x) => this.single(k, f, x, unit));
    }
    return this.single(k, f, n, unit);
  }

  single(k, f, n, unit) {
    while (n.t === 'paren' && ['id', 'u', 'b', 'i', 'd', 's', 'st'].includes(f.type)) n = n.inner;
    switch (f.type) {
      case 'v': return this.value(n);
      case 'a': return this.actionTerm(n);
      case 'id': return this.ref(n, nsOf(k, f, unit));
      case 'u': return this.unit(n);
      case 'b':
        if (n.t === 'word' && (n.name === 'true' || n.name === 'false')) return n.name === 'true';
        this.w(n, `${f.name} takes true or false`);
        return false;
      case 'i': case 'd':
        if (n.t === 'lit' && /^-?\d+(\.\d+)?$/.test(n.text)) return Number(n.text);
        this.w(n, `${f.name} takes a number`);
        return 0;
      case 's':
        if (n.t === 'str') return n.value;
        this.w(n, `${f.name} takes a string in quotes`);
        return '';
      case 'st': {
        if (n.t === 'lit' && /^-?\d+$/.test(n.text)) return Number(n.text);
        const e = n.t === 'word' && (ENUMS.Stat.byShort.get(n.name) || ENUMS.Stat.byName.get(n.name));
        if (e) return e.num;
        this.w(n, `${f.name} takes a stat such as attack_power`);
        return 0;
      }
      default: {
        if (ENUMS[f.type]) {
          const en = ENUMS[f.type];
          const e = n.t === 'word' && (en.byShort.get(n.name) || en.byName.get(n.name));
          if (e) return e.name;
          if (n.t === 'lit' && /^\d+$/.test(n.text)) { const x = en.byNum.get(Number(n.text)); return x ? x.name : Number(n.text); }
          this.w(n, `${f.name} takes one of ${en.values.map((v) => v.short).join(', ')}`);
          return en.values[0].name;
        }
        if (n.t === 'raw') return clone(n.json);
        this.w(n, `${f.name} is written as raw JSON`);
        return {};
      }
    }
  }

  // An ActionID (§7.2, §7.3).
  ref(n, ns) {
    while (n.t === 'paren') n = n.inner;
    if (n.t === 'raw') return clone(n.json);
    if (n.t === 'var') { this.w(n, `a variable cannot pick a spell; write its name, or a def for it`); return {}; }
    if (n.t === 'dot' && n.prefix === 'item') {
      const id = this.names.item(n.name);
      if (id) return { itemId: id };
      this.w(n.nameAt || n, `no item is named ${n.name} (the name table holds the items a rotation uses)`);
      return {};
    }
    if (n.t === 'dot' && n.prefix === 'other') {
      const e = ENUMS.OtherAction.byShort.get(n.name) || ENUMS.OtherAction.byName.get(n.name);
      if (e) return { otherId: e.name };
      this.w(n.nameAt || n, `no other action is named ${n.name}`);
      return {};
    }
    if (n.t !== 'word') { this.w(n, 'expected a name'); return {}; }
    if (n.name === 'none') return {};
    const def = this.defs.get(n.name);
    if (def) {
      if (def.params.length) { this.w(n, `${def.name} takes arguments, so it stands for no name`); return {}; }
      return this.viaDef(def, [], n, (x) => this.ref(x, ns), {});
    }
    const r = this.names.spell(this.cls, ns, n.name);
    if (r) return { ...r };
    let message = `no ${NS_THING[ns].replace(/^an? /, '')} is named ${n.name}`;
    const other = ['spell', 'aura', 'target_aura', 'target_spell', 'pet_aura'].find((x) => x !== ns && this.names.spell(this.cls, x, n.name));
    if (other) message = `${n.name} is ${NS_THING[other]}; this position takes ${NS_THING[ns]}`;
    else if (this.names.item(n.name)) message = `${n.name} is an item; write item.${n.name}`;
    else if (!this.cls) message += '; with no spec, a file reads only the spells and auras every class shares';
    // Keep the id a name with an id suffix carries (seal_of_righteousness_20293).
    const m = /_(\d+)$/.exec(n.name);
    if (m) { this.w(n, `${message}; read as spell id ${m[1]}`); return { spellId: Number(m[1]) }; }
    this.w(n, message);
    return {};
  }

  unit(n) {
    while (n.t === 'paren') n = n.inner;
    if (n.t === 'raw') return clone(n.json);
    if (n.t !== 'word') { this.w(n, 'expected a unit such as self or target'); return {}; }
    if (n.name === 'none') return {};
    if (UNIT_WORDS[n.name]) return { ...UNIT_WORDS[n.name] };
    const m = /^(target|player|pet)([1-9]\d*)$/.exec(n.name);
    if (m && Number(m[2]) <= 2147483648) {
      const u = { type: UNIT_INDEXED[m[1]] };
      if (Number(m[2]) > 1) u.index = Number(m[2]) - 1;
      if (m[1] === 'pet') u.owner = { type: 'Self' };
      return u;
    }
    this.w(n, `no unit is named ${n.name}`);
    return {};
  }

  // A term in an action's place: an action, or a call, word or raw JSON as its step.
  actionTerm(n) {
    while (n.t === 'paren') n = n.inner;
    if (n.t === 'action') return this.action(n);
    if (['word', 'call', 'raw'].includes(n.t)) return this.step(new Parser([]).stepOf(n));
    this.w(n, 'expected an action');
    return {};
  }

  action(n) {
    const out = {};
    if (n.cond) out.condition = this.value(n.cond);
    return Object.assign(out, this.step(n.step));
  }

  step(s) {
    switch (s.s) {
      case 'none': return {};
      case 'raw': return clone(s.json);
      case 'cast': case 'channel': {
        const body = { spellId: this.ref(s.ref, 'spell') };
        if (s.on) body.target = this.unit(s.on);
        if (s.until) body.interruptIf = this.value(s.until);
        if (s.recast) body.allowRecast = true;
        return { [s.s === 'cast' ? 'castSpell' : 'channelSpell']: body };
      }
      case 'wait': return { wait: { duration: this.value(s.expr) } };
      case 'waitUntil': return { waitUntil: { condition: this.value(s.expr) } };
      case 'move': return { move: s.recheck ? { rangeFromTarget: this.value(s.expr), recheckWhileMoving: true } : { rangeFromTarget: this.value(s.expr) } };
      case 'moveFor': return { moveDuration: { duration: this.value(s.expr) } };
      case 'group': {
        const body = {};
        if (s.name) body.groupName = s.name;
        if (s.binds.length) body.variables = s.binds.map((b) => ({ name: b.name, value: this.value(b.value) }));
        return { groupReference: body };
      }
      case 'schedule': {
        const body = {};
        if (s.schedule) body.schedule = s.schedule;
        body.innerAction = this.step(s.step);
        return { schedule: body };
      }
      case 'sequence': {
        const body = {};
        if (s.name) body.name = s.name;
        if (s.actions.length) body.actions = s.actions.map((a) => this.action(a));
        return { sequence: body };
      }
      case 'call': {
        const n = s.node;
        const k = ACTIONS[n.name];
        if (!k) {
          this.w(n, this.defs.has(n.name) ? `${n.name} is a def, which goes where a value goes` : `no action is named ${n.name}`);
          return {};
        }
        return this.kind(k, n.t === 'call' ? n.args : [], null, null, n);
      }
      default: return {};
    }
  }
}

function isDefault(v, f) {
  if (v === undefined || v === null) return true;
  if (f.list) return !v.length;
  if (f.type === 'b') return v === false;
  if (['i', 'd', 'st'].includes(f.type)) return v === 0;
  if (f.type === 's') return v === '';
  if (ENUMS[f.type]) return v === ENUMS[f.type].values.find((x) => x.num === 0)?.name;
  return false;
}

// A def's value with its parameters replaced by the arguments, each kept one node.
function substitute(node, map) {
  if (Array.isArray(node)) return node.map((x) => substitute(x, map));
  if (!node || typeof node !== 'object') return node;
  if (node.t === 'raw') return node;
  if (node.t === 'word' && map.has(node.name)) return { t: 'paren', inner: map.get(node.name), at: node.at };
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = k === 'at' || k === 'nameAt' || k === 'json' ? v : substitute(v, map);
  if ((node.t === 'dot' || node.t === 'acc') && node.prefix && map.has(node.prefix)) {
    let arg = map.get(node.prefix);
    while (arg.t === 'paren') arg = arg.inner;
    if (arg.t === 'word') out.prefix = arg.name;
  }
  return out;
}

// ---- Reading a file ----------------------------------------------------------------------------------------------

const classOfSpec = (spec) => {
  if (!spec) return null;
  const last = spec.split('_').pop();
  return CLASSES.includes(last) ? last : null;
};

function readText(text, names, opts = {}) {
  const warnings = [];
  const warn = (line, col, message) => warnings.push(`${line}:${col} ${message}`);
  const { tokens, notes, used } = lex(String(text), warn);
  const stmts = statementsOf(tokens, used);
  const usedNotes = new Set();

  let spec = opts.spec || null;
  let type = null;
  let section = { kind: 'top' };
  let sawVersion = !!opts.fragment;
  const vars = []; // { name, value (node), at }
  const defs = new Map();
  const groups = [];
  const groupByName = new Map();
  const rows = { prepull: [], priority: [] };
  let blocks = []; // open when blocks: { indent, cond, hide }
  const skipped = new Set();

  const notesAbove = (line) => {
    const out = [];
    for (let l = line - 1; notes.has(l); l--) { out.unshift(notes.get(l).text); usedNotes.add(l); }
    return out;
  };

  const closeBlocks = (keep) => {
    for (const b of blocks) if (!keep(b) && !b.rows) warn(b.at.line, b.at.col, 'this when block holds no row');
    blocks = blocks.filter(keep);
  };

  for (const toks of stmts) {
    const p = new Parser(toks);
    const first = toks[0];
    if (headerShape(toks, 0)) {
      if (first.col !== 1) fail(first.line, first.col, 'a header starts at column 1');
      closeBlocks(() => false);
      if (first.text === 'group' && toks[1].k === 'str') {
        const name = toks[1].value;
        let g = groupByName.get(name);
        if (g) warn(first.line, first.col, `group "${name}" is written twice`);
        else { g = { name, actions: [], variables: [] }; groupByName.set(name, g); groups.push(g); }
        section = { kind: 'group', group: g };
        p.i = 3;
      } else {
        const name = first.text;
        if (['apl', 'prepull', 'priority'].includes(name)) section = { kind: name };
        else {
          if (['simple', 'cooldowns'].includes(name)) warn(first.line, first.col, `only the APL rotation is read; ${name}: is skipped`);
          else if (!SETUP_SECTIONS.has(name)) warn(first.line, first.col, `no section is named ${name}; it is skipped`);
          section = { kind: 'skip' };
          skipped.add(name);
        }
        p.i = 2;
      }
      if (p.atEnd() || section.kind === 'skip') continue;
      // A body line on the header's line.
      readLine(new Parser(toks.slice(p.i)), toks[p.i], []);
      continue;
    }
    if (section.kind === 'skip') continue;
    readLine(p, first, notesAbove(first.line));
  }

  function readLine(p, first, rowNotes) {
    // The when blocks this statement ends: those at its indent or deeper.
    closeBlocks((b) => b.indent < first.col);
    const word = first.k === 'ident' ? first.text : null;
    const entry = isP(p.peek(1), '=');
    if (word && TOP_WORDS.has(word) && !entry) {
      if (rowNotes.length) warn(first.line, first.col, 'a /// note goes above a row');
      p.take();
      if (word === 'var') return readVar(p, first);
      if (word === 'def') return readDef(p, first);
      if (section.kind !== 'top') warn(first.line, first.col, `${word} goes before the first header`);
      if (word === 'siml') {
        const v = p.take();
        if (!v || v.k !== 'num' || !/^\d+$/.test(v.text)) fail(first.line, first.col, 'expected siml 1');
        if (v.text !== '1') fail(v.line, v.col, `SIML ${v.text} is not supported; this reads siml 1`);
        sawVersion = true;
      } else if (word === 'spec') {
        const s = p.take();
        if (!s || s.k !== 'ident') fail(first.line, first.col, 'expected spec <name>, such as spec retribution_paladin');
        if (!SPECS.includes(s.text)) warn(s.line, s.col, `no spec is named ${s.text}`);
        spec = s.text;
      } else if (word === 'use') warn(first.line, first.col, 'use (composition) is not supported; the line is skipped');
      return null;
    }
    if (!sawVersion) { warn(first.line, first.col, 'a SIML file starts with siml 1'); sawVersion = true; }
    if (section.kind === 'top' || section.kind === 'apl') {
      if (isW(first, 'type') && !entry) {
        const t = p.take() && p.take();
        const e = t && t.k === 'ident' && (ENUMS.Type.byShort.get(t.text) || ENUMS.Type.byName.get(t.text));
        if (!e) fail(first.line, first.col, 'expected type apl, simple, auto or unknown');
        type = e.name;
        return null;
      }
      if (section.kind === 'top' && !opts.fragment) fail(first.line, first.col, 'a row goes under prepull:, priority: or a group "Name": header');
      warn(first.line, first.col, 'apl: holds var, def and type lines; this line is skipped');
      return null;
    }
    if (whenShape(p.toks, 0)) {
      if (rowNotes.length) warn(first.line, first.col, 'a /// note goes above a row, not a when line');
      if (section.kind === 'prepull') fail(first.line, first.col, 'a when block goes under priority: or a group');
      const hide = p.acceptP('#');
      p.take();
      const cond = p.expr();
      p.expectP(':');
      p.end('a when line ends with :');
      const block = { indent: first.col, cond, hide, rows: 0, at: first };
      blocks.push(block);
      return null;
    }
    const prepull = section.kind === 'prepull';
    if (prepull && rowNotes.length) warn(first.line, first.col, 'a prepull row takes no /// note');
    const r = p.row(prepull, rowNotes.length > 0, warn);
    for (const b of blocks) b.rows++;
    const row = { ...r, notes: prepull ? [] : rowNotes, blocks: [...blocks] };
    if (prepull) rows.prepull.push(row);
    else if (section.kind === 'priority') rows.priority.push(row);
    else section.group.actions.push(row);
    return null;
  }

  function readVar(p, first) {
    const v = p.take();
    if (!v || v.k !== 'var') fail(first.line, first.col, 'expected var $name = value');
    let value = null;
    if (p.acceptP('=')) value = p.expr();
    p.end('expected the end of the var line');
    const decl = { name: v.value, value, at: v };
    if (section.kind === 'group') {
      if (blocks.length) warn(first.line, first.col, 'a var line goes outside when blocks');
      section.group.variables.push(decl);
    } else if (section.kind === 'top' || section.kind === 'apl') {
      if (vars.some((x) => x.name === decl.name)) warn(v.line, v.col, `the variable ${decl.name} is declared twice`);
      vars.push(decl);
    } else warn(first.line, first.col, 'a var line goes at the top, under apl: or in a group');
    return null;
  }

  function readDef(p, first) {
    const n = p.take();
    if (!n || n.k !== 'ident') fail(first.line, first.col, 'expected def name(...) = value');
    const params = [];
    if (p.acceptP('(')) {
      if (!p.isP(')')) for (;;) { const x = p.take(); if (!x || x.k !== 'ident') p.fail('expected a parameter name'); params.push(x.text); if (!p.acceptP(',')) break; }
      p.expectP(')');
    }
    p.expectP('=');
    const body = p.expr();
    p.end('expected the end of the def line');
    if (VALUES[n.text] || ACTIONS[n.text] || KEYWORDS.has(n.text) || HEADS[n.text] || UNIT_WORDS[n.text]) {
      warn(n.line, n.col, `def ${n.text} would shadow a kind or keyword; it is not read`);
    } else if (defs.has(n.text)) warn(n.line, n.col, `def ${n.text} is written twice`);
    else defs.set(n.text, { name: n.text, params, body, at: n });
    return null;
  }

  closeBlocks(() => false);
  for (const [line, note] of notes) if (!usedNotes.has(line)) warn(line, note.col, 'a /// note goes directly above a priority or group row');

  // Typing reads every variable the file declares, wherever the line is.
  const declared = opts.declared || vars.map((v) => v.name);
  const typer = new Typer(names, classOfSpec(spec), declared, defs, warn);
  // A when block's conditions are joined to each row's own: the conjuncts of each, in one and (§6.9).
  const conj = (n) => (n && n.t === 'and' ? n.items : n ? [n] : []);
  const item = (r) => {
    if (r.raw) return clone(r.raw);
    const conds = [...r.blocks.flatMap((b) => conj(b.cond)), ...conj(r.action.cond)];
    const node = { ...r.action, cond: conds.length > 1 ? { t: 'and', items: conds, at: r.at } : conds[0] || null };
    const out = {};
    if (r.hide || r.blocks.some((b) => b.hide)) out.hide = true;
    if (r.notes && r.notes.length) out.notes = r.notes.join('\n');
    out.action = typer.action(node);
    return out;
  };
  const variable = (v) => (v.value ? { name: v.name, value: typer.value(v.value) } : { name: v.name });
  const rotation = { type: type || 'TypeAPL' };
  rotation.prepullActions = rows.prepull.map((r) => {
    if (r.raw) return clone(r.raw);
    const out = item({ ...r, blocks: [], notes: [] });
    return Object.assign({ action: out.action, doAtValue: typer.value(r.doAt) }, out.hide ? { hide: true } : {});
  });
  rotation.priorityList = rows.priority.map(item);
  if (groups.length) {
    rotation.groups = groups.map((g) => {
      const out = { name: g.name };
      if (g.actions.length) out.actions = g.actions.map(item);
      if (g.variables.length) out.variables = g.variables.map(variable);
      return out;
    });
  }
  if (vars.length) rotation.valueVariables = vars.map(variable);
  return { rotation, spec, warnings };
}

// Reads an SIML rotation (an .apl.siml, or a full .siml whose rotation sections are taken) into the wowsims APL
// JSON: { rotation, spec, warnings }. A syntax error throws an Error "line:col message"; a name that means nothing
// is a warning, and what can be read is kept.
export async function simlToRotation(text) {
  const names = await loadNames();
  try {
    return readText(text, names);
  } catch (e) {
    if (e instanceof SimlError) throw new Error(e.message);
    throw e;
  }
}

// ---- Normalising JSON (protojson's defaults, the schema's key order) --------------------------------------------

function cleanMessage(obj, fields) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const f of fields) {
    if (!(f.json in obj)) continue;
    const v = cleanField(obj[f.json], f);
    if (v !== undefined) out[f.json] = v;
  }
  return out;
}
function cleanField(v, f) {
  if (v === null || v === undefined) return undefined;
  if (f.list) return Array.isArray(v) && v.length ? v.map((x) => cleanOne(x, f.type)) : undefined;
  const c = cleanOne(v, f.type);
  return isDefault(c, f) ? undefined : c;
}
function cleanOne(v, type) {
  switch (type) {
    case 'v': return cleanValue(v);
    case 'a': return cleanAction(v);
    case 'id': return cleanMessage(v, MESSAGES.ActionID);
    case 'u': return cleanMessage(v, MESSAGES.UnitReference);
    case 'b': return !!v;
    case 'i': case 'd': case 'st': return Number(v) || 0;
    case 's': return String(v);
    default: {
      if (ENUMS[type]) {
        const e = typeof v === 'number' ? ENUMS[type].byNum.get(v) : ENUMS[type].byName.get(v);
        return e ? e.name : v;
      }
      if (type.startsWith('@')) return cleanMessage(v, MESSAGES[type.slice(1)]);
      return v;
    }
  }
}
// An APLValue: its one kind, by the schema; a kind the schema does not know is kept as it is.
function cleanValue(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const keys = Object.keys(v).filter((k) => k !== 'uuid');
  if (keys.length !== 1) return keys.length ? Object.fromEntries(keys.map((k) => [k, v[k]])) : {};
  const k = VALUE_BY_JSON.get(keys[0]);
  return k ? { [k.json]: cleanMessage(v[k.json], k.fields) } : { [keys[0]]: v[keys[0]] };
}
function cleanAction(a) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return a;
  const out = {};
  if (a.condition) out.condition = cleanValue(a.condition);
  for (const key of Object.keys(a)) {
    if (key === 'condition') continue;
    const k = ACTION_BY_JSON.get(key);
    out[key] = k ? cleanMessage(a[key], k.fields) : a[key];
  }
  return out;
}

// What a read-back check compares: sorted keys, ranks left out, since a name reads back with its entry's rank (§7.3).
function compared(x) {
  if (Array.isArray(x)) return `[${x.map(compared).join(',')}]`;
  if (!x || typeof x !== 'object') return JSON.stringify(x);
  const isId = 'spellId' in x || 'itemId' in x || 'otherId' in x;
  const keys = Object.keys(x).filter((k) => !(isId && k === 'rank')).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${compared(x[k])}`).join(',')}}`;
}

// ---- Printing (§12) ----------------------------------------------------------------------------------------------

const rawText = (x) => `\`${JSON.stringify(x === undefined ? null : x).replace(/`/g, '\\u0060')}\``;
const braced = (sigil, name) => `${sigil}{${name.replace(/\\/g, '\\\\').replace(/\}/g, '\\}').replace(/\n/g, '\\n')}}`;
const placeholderText = (name) => (IDENT.test(name) ? `%${name}` : braced('%', name));
const wrap = (t, needed) => (needed ? `(${t})` : t);
const only = (body, ...keys) => Object.keys(body).every((k) => keys.includes(camel(k)) || keys.includes(k));
const has = (body, key) => body[key] !== undefined;
const UNPRINTABLE_NOTE = /[\x00-\x09\x0b-\x1f\x7f]| (\n|$)/;

class Printer {
  constructor(names, cls, declared) {
    this.names = names;
    this.cls = cls;
    this.declared = declared;
  }

  value(v, prec) {
    if (v === null || v === undefined || typeof v !== 'object' || Array.isArray(v)) return rawText(v ?? null);
    const keys = Object.keys(v);
    if (!keys.length) return 'none';
    const k = keys.length === 1 && VALUE_BY_JSON.get(keys[0]);
    if (!k) return rawText(v);
    const body = v[keys[0]] || {};
    return this.shortValue(k, body, prec) ?? this.call(k, body, false) ?? rawText(v);
  }

  shortValue(k, body, prec) {
    switch (k.name) {
      case 'const': {
        if (!only(body, 'val')) return null;
        const val = body.val ?? '';
        return isLiteral(val) || val === 'true' || val === 'false' ? val : JSON.stringify(val);
      }
      case 'variable_ref': return only(body, 'name') ? this.variableRef(body.name ?? '') : null;
      case 'variable_placeholder': return only(body, 'name') ? placeholderText(body.name ?? '') : null;
      case 'and': case 'or': {
        const ops = this.operands(k.name, body);
        return ops ? wrap(ops.join(` ${k.name} `), prec > LOGIC_PREC[k.name]) : null;
      }
      case 'not':
        if (!has(body, 'val') || !only(body, 'val')) return null;
        return wrap(`not ${this.value(body.val, P_NOT)}`, prec > P_NOT);
      case 'cmp': case 'math': {
        const text = k.name === 'cmp' ? CMP_TEXT[body.op] : MATH_TEXT[body.op];
        if (!text || !has(body, 'lhs') || !has(body, 'rhs') || !only(body, 'op', 'lhs', 'rhs')) return null;
        const [at, left, right] = k.name === 'cmp' ? [P_CMP, P_ADD, P_ADD] : [MATH_PREC[body.op], MATH_PREC[body.op], MATH_PREC[body.op] + 1];
        return wrap(`${this.value(body.lhs, left)} ${text} ${this.value(body.rhs, right)}`, prec > at);
      }
      default:
        if (k.accessor) return this.accessor(k, body);
        if (k.unitPrefix && has(body, k.unit.json) && only(body, k.unit.json)) {
          const w = this.unitWord(body[k.unit.json]);
          if (w) return `${w}.${k.name}`;
        }
        return null;
    }
  }

  // The operands of an and or or that holds two or more.
  operands(op, body) {
    const vals = body.vals;
    if (!only(body, 'vals') || !Array.isArray(vals) || vals.length < 2) return null;
    return vals.map((x) => this.value(x, LOGIC_PREC[op] + 1));
  }

  variableRef(name) {
    const reads = (w) => {
      const r = resolveVariable(w, this.declared);
      return r.found ? r.name === name : !r.ambiguous && w === name;
    };
    if (IDENT.test(name) && reads(name)) return `$${name}`;
    const folded = identifier(name);
    if (IDENT.test(folded) && reads(folded)) return `$${folded}`;
    return braced('$', name);
  }

  // [u.]head(subject).prop[(f=v, ...)], when the subject is set and the unit, if set, is a unit word.
  accessor(k, body) {
    const { head, prop, subject, unit } = k.accessor;
    if (!has(body, subject.json)) return null;
    let prefix = '';
    const unitValue = unit ? body[unit.json] : undefined;
    if (unitValue !== undefined) {
      const w = this.unitWord(unitValue);
      if (!w) return null;
      prefix = `${w}.`;
    }
    const args = k.fields.filter((f) => f !== subject && f !== unit && has(body, f.json))
      .map((f) => `${f.name}=${this.field(k, f, body[f.json], unitValue)}`);
    const out = `${prefix}${head}(${this.single(k, subject, body[subject.json], unitValue)}).${prop}`;
    return args.length ? `${out}(${args.join(', ')})` : out;
  }

  // A kind as a call: bare when no field is set, else the positional value or the list's items unnamed and every
  // other field named (§8.3); null when no call can write its name.
  call(k, body, action) {
    const bare = !NOT_NAMES.has(k.name) && !(action && (k.name === 'wait' || k.name === 'move'));
    if (!bare && !CALL_WORDS.has(k.name)) return null;
    if (Object.keys(body).some((key) => !k.fields.some((f) => f.json === key))) return null;
    const set = k.fields.filter((f) => has(body, f.json));
    if (!set.length) return bare ? k.name : `${k.name}()`;
    const unit = k.unit ? body[k.unit.json] : undefined;
    const bools = new Set(k.fields.filter((f) => f.type === 'b').map((f) => f.name));
    const args = [];
    if (k.list && has(body, k.list.json)) for (const x of body[k.list.json]) args.push(this.single(k, k.list, x, unit));
    if (k.positional && has(body, k.positional.json)) {
      const t = this.field(k, k.positional, body[k.positional.json], unit);
      args.push(bools.has(t) ? `${k.positional.name}=${t}` : t);
    }
    for (const f of set) if (f !== k.list && f !== k.positional) args.push(`${f.name}=${this.field(k, f, body[f.json], unit)}`);
    return `${k.name}(${args.join(', ')})`;
  }

  field(k, f, v, unit) {
    if (!f.list) return this.single(k, f, v, unit);
    return Array.isArray(v) ? `[${v.map((x) => this.single(k, f, x, unit)).join(', ')}]` : rawText(v);
  }

  single(k, f, v, unit) {
    switch (f.type) {
      case 'v': return this.value(v, P_TOP);
      case 'a': return this.inlineAction(v);
      case 'id': return this.ref(v, nsOf(k, f, unit));
      case 'u': return this.unitText(v);
      case 'b': return String(!!v);
      case 'i': case 'd': return typeof v === 'number' && Number.isFinite(v) ? String(v) : rawText(v);
      case 's': return JSON.stringify(String(v));
      case 'st': {
        const e = ENUMS.Stat.byNum.get(v);
        return e ? e.short : String(v);
      }
      default: {
        if (ENUMS[f.type]) {
          const e = typeof v === 'number' ? ENUMS[f.type].byNum.get(v) : ENUMS[f.type].byName.get(v);
          if (e) return e.short;
        }
        return rawText(v);
      }
    }
  }

  // An ActionID: the name of its spell id and tag, item.<name>, other.<short>, none, or raw JSON (§7.4).
  ref(v, ns) {
    if (!v || typeof v !== 'object') return rawText(v);
    const keys = Object.keys(v);
    if (!keys.length) return 'none';
    if (keys.length === 1 && keys[0] === 'otherId') {
      const e = ENUMS.OtherAction.byName.get(v.otherId) || ENUMS.OtherAction.byNum.get(v.otherId);
      if (e) return `other.${e.short}`;
    } else if (has(v, 'spellId') && only(v, 'spellId', 'tag', 'rank')) {
      const name = this.names.nameOf(this.cls, ns, v.spellId, v.tag);
      if (name) return name;
    } else if (keys.length === 1 && keys[0] === 'itemId') {
      const name = this.names.itemName(v.itemId);
      if (name) return `item.${name}`;
    }
    return rawText(v);
  }

  unitText(v) {
    if (!v || !Object.keys(v).length) return 'none';
    return this.unitWord(v) || rawText(v);
  }

  // The unit word that reads back as v (§6.6).
  unitWord(v) {
    if (!v || typeof v !== 'object' || !Object.keys(v).length) return null;
    const want = compared(v);
    for (const [w, u] of Object.entries(UNIT_WORDS)) if (Object.keys(u).length && compared(u) === want) return w;
    for (const [prefix, type] of Object.entries(UNIT_INDEXED)) {
      if (v.type !== type || !(v.index === undefined || v.index >= 0)) continue;
      const u = { type };
      if (v.index) u.index = v.index;
      if (prefix === 'pet') u.owner = { type: 'Self' };
      if (compared(u) === want) return `${prefix}${(v.index || 0) + 1}`;
    }
    return null;
  }

  // An action's step without its condition; null when only raw JSON writes it.
  step(a) {
    const keys = Object.keys(a).filter((k) => k !== 'condition');
    if (!keys.length) return 'none';
    const k = keys.length === 1 && ACTION_BY_JSON.get(keys[0]);
    if (!k) return null;
    const body = a[keys[0]] || {};
    return this.shortAction(k, body) ?? this.call(k, body, true);
  }

  shortAction(k, body) {
    switch (k.name) {
      case 'cast_spell': case 'channel_spell': {
        const fields = k.name === 'cast_spell' ? ['spellId', 'target'] : ['spellId', 'target', 'interruptIf', 'allowRecast'];
        if (!has(body, 'spellId') || !only(body, ...fields)) return null;
        let out = `${k.name === 'cast_spell' ? 'cast' : 'channel'} ${this.ref(body.spellId, 'spell')}`;
        if (has(body, 'target')) out += ` on ${this.unitText(body.target)}`;
        if (has(body, 'interruptIf')) out += ` until ${this.value(body.interruptIf, P_TOP)}`;
        if (body.allowRecast) out += ' recast';
        return out;
      }
      case 'wait': case 'wait_until': case 'move': case 'move_duration': {
        const [keyword, field] = { wait: ['wait', 'duration'], wait_until: ['wait until', 'condition'], move: ['move', 'rangeFromTarget'], move_duration: ['move for', 'duration'] }[k.name];
        if (!has(body, field) || !only(body, field, 'recheckWhileMoving')) return null;
        return `${keyword} ${this.value(body[field], P_TOP)}${body.recheckWhileMoving ? ' recheck' : ''}`;
      }
      case 'group_reference': {
        if (!only(body, 'groupName', 'variables')) return null;
        const binds = [];
        for (const x of body.variables || []) {
          if (!x || !only(x, 'name', 'value') || !has(x, 'value')) return null;
          binds.push(`${placeholderText(x.name ?? '')} = ${this.value(x.value, P_TOP)}`);
        }
        const out = `group ${JSON.stringify(body.groupName ?? '')}`;
        return binds.length ? `${out} with ${binds.join(', ')}` : out;
      }
      case 'schedule': {
        if (!has(body, 'innerAction') || !only(body, 'schedule', 'innerAction') || has(body.innerAction, 'condition')) return null;
        const step = this.step(body.innerAction) ?? rawText(body.innerAction);
        return `schedule ${JSON.stringify(body.schedule ?? '')} ${step}`;
      }
      case 'sequence':
        if (!only(body, 'name', 'actions')) return null;
        return `sequence ${JSON.stringify(body.name ?? '')} [${(body.actions || []).map((x) => this.inlineAction(x)).join(', ')}]`;
      default: return null;
    }
  }

  inlineAction(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return rawText(a);
    const { condition, ...rest } = a;
    const step = this.step(a) ?? rawText(rest);
    return condition ? `${step} if ${this.value(condition, P_TOP)}` : step;
  }

  // `if c`, and each further operand of a top-level and or or as a part of its own.
  conditionParts(c) {
    const keys = Object.keys(c || {});
    const op = keys.length === 1 && (keys[0] === 'and' || keys[0] === 'or') ? keys[0] : null;
    const ops = op && this.operands(op, c[op] || {});
    if (!ops) return [`if ${this.value(c, P_TOP)}`];
    return ops.map((t, i) => `${i ? `${op} ` : 'if '}${t}`);
  }

  // A row: { parts, notes }, or null when only raw JSON writes it.
  row(item, prepull) {
    if (!item || typeof item !== 'object') return null;
    const allowed = prepull ? ['action', 'doAtValue', 'hide'] : ['hide', 'notes', 'action'];
    if (!only(item, ...allowed) || !has(item, 'action') || (prepull && !has(item, 'doAtValue'))) return null;
    if (has(item, 'notes') && UNPRINTABLE_NOTE.test(item.notes)) return null;
    const action = item.action || {};
    let step = this.step(action);
    if (step === null && !item.hide && !prepull && !action.condition && !has(item, 'notes')) return null;
    let head = item.hide ? '# ' : '';
    if (prepull) head += `${this.value(item.doAtValue, P_OPERAND)} `;
    if (step === null) { const { condition, ...rest } = action; step = rawText(rest); }
    const parts = [head + step];
    if (action.condition) parts.push(...this.conditionParts(action.condition));
    return { parts, notes: has(item, 'notes') ? String(item.notes).split('\n') : [] };
  }

  variable(v) {
    const name = String((v && v.name) ?? '');
    const declared = IDENT.test(name) ? `var $${name}` : `var ${braced('$', name)}`;
    if (!v || !has(v, 'value')) return { parts: [declared] };
    const parts = [`${declared} =`];
    const keys = Object.keys(v.value || {});
    const op = keys.length === 1 && (keys[0] === 'and' || keys[0] === 'or') ? keys[0] : null;
    const ops = op && this.operands(op, v.value[op] || {});
    if (ops) ops.forEach((t, i) => parts.push(i ? `${op} ${t}` : t));
    else parts.push(this.value(v.value, P_TOP));
    return { parts };
  }
}

// A statement's lines: its parts joined by spaces, or, past the width, the first part with each other on a
// continuation line (§12.3); its notes as /// lines above.
function statementLines(indent, { parts, notes = [] }) {
  const pad = ' '.repeat(indent);
  let body = [pad + parts.join(' ')];
  if (body[0].length > WIDTH && parts.length > 1) body = [pad + parts[0], ...parts.slice(1).map((p) => ' '.repeat(indent + 4) + p)];
  return [...notes.map((n) => (n === '' ? `${pad}///` : `${pad}/// ${n}`)), ...body];
}

// Prints a wowsims APL (the rotation object, or an export holding one) as SIML text in the canonical form: siml 1,
// spec <spec> when given (its class decides the names), the var lines, then prepull:, priority: and the groups.
export async function rotationToSiml(rotation, { spec } = {}) {
  const names = await loadNames();
  let rot = rotation || {};
  if (!rot.priorityList && !rot.prepullActions) rot = rot.rotation || (rot.player && rot.player.rotation) || rot;
  rot = cleanMessage(rot, MESSAGES.APLRotation);
  const cls = classOfSpec(spec);
  const declared = (rot.valueVariables || []).map((v) => v.name);
  const p = new Printer(names, cls, declared);
  const opts = { spec, fragment: true, declared };
  const reads = (text) => readText(text, names, opts);

  // Each statement is read back, and one that does not read as what it was printed from is written as raw JSON.
  const checkedRow = (item, prepull) => {
    const printed = p.row(item, prepull);
    const raw = { parts: [rawText(item)] };
    if (!printed) return raw;
    try {
      const text = `${prepull ? 'prepull' : 'priority'}:\n${statementLines(2, { parts: printed.parts }).join('\n')}\n`;
      const back = reads(text).rotation[prepull ? 'prepullActions' : 'priorityList'];
      const want = { ...item };
      delete want.notes;
      if (back.length === 1 && compared(back[0]) === compared(want)) return printed;
    } catch { /* falls back to raw JSON */ }
    return raw;
  };
  const checkedVar = (v) => {
    const printed = p.variable(v);
    try {
      const back = reads(`${statementLines(0, printed).join('\n')}\n`).rotation.valueVariables || [];
      if (back.length === 1 && compared(back[0]) === compared(v)) return printed;
    } catch { /* falls back to raw JSON */ }
    const name = String(v.name ?? '');
    return { parts: [`${IDENT.test(name) ? `var $${name}` : `var ${braced('$', name)}`} =`, rawText(v.value)] };
  };

  const out = ['siml 1'];
  if (spec) out.push(`spec ${spec}`);
  const apl = [];
  // The game's APLs leave the type out; they are APL rotations all the same, so only another type is written.
  if (rot.type && rot.type !== 'TypeAPL') apl.push(`type ${ENUMS.Type.byName.get(rot.type)?.short || 'unknown'}`);
  for (const v of rot.valueVariables || []) apl.push(...statementLines(0, checkedVar(v)));
  if (apl.length) out.push('', ...apl);
  if ((rot.prepullActions || []).length) {
    out.push('', 'prepull:');
    for (const r of rot.prepullActions) out.push(...statementLines(2, checkedRow(r, true)));
  }
  if ((rot.priorityList || []).length) {
    out.push('', 'priority:');
    for (const r of rot.priorityList) out.push(...statementLines(2, checkedRow(r, false)));
  }
  for (const g of rot.groups || []) {
    out.push('', `group ${JSON.stringify(String(g.name ?? ''))}:`);
    for (const v of g.variables || []) out.push(...statementLines(2, checkedVar(v)));
    for (const r of g.actions || []) out.push(...statementLines(2, checkedRow(r, false)));
  }
  return `${out.join('\n')}\n`;
}
