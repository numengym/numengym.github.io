# Builds js/data/db.js from wowsims/forever as tools/build-db.ps1 does, for a machine without PowerShell: the same
# items, enchants, random suffixes, consumables and spells, written byte for byte as the PowerShell script writes them
# (its truthiness rules and .NET's round-trip number format).
# Usage: python3 tools/build-db.py <assets/database/db.json> <sim/core/spelldata/spells_auto_gen.go> [out]
# out defaults to js/data/db.js.
import json, re, sys
from collections import OrderedDict as OD
import os
db_json, spells_go = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'data', 'db.js')
db = json.load(open(db_json, encoding='utf8'), object_pairs_hook=OD)

def T(x):
    # PowerShell truthiness: an object (even empty) is true; an empty array, 0, '' and null are false.
    if x is None: return False
    if isinstance(x, dict): return True
    if isinstance(x, list): return len(x) > 1 or (len(x) == 1 and T(x[0]))
    return bool(x)

def sparse(arr):
    o = OD()
    if arr is None: return o
    for i, v in enumerate(arr):
        if v != 0: o[str(i)] = v
    return o

def map_stats(obj):
    o = OD()
    if obj:
        for k, v in obj.items(): o[k] = v
    return o

wanted = []  # insertion-ordered set
wanted_set = set()
def want(i):
    if i not in wanted_set: wanted_set.add(i); wanted.append(i)

def effect(e):
    o = OD(b=e.get('buffId'))
    want(int(e.get('buffId') or 0))
    if e.get('effectDurationMs'): o['d'] = e['effectDurationMs']
    so = e.get('scalingOptions')
    if T(so) and T(so.get('0')) and T(so['0'].get('stats')): o['s'] = map_stats(so['0']['stats'])
    if e.get('proc') is not None:
        p = OD(); pr = e['proc']
        if pr.get('ppm'): p['ppm'] = pr['ppm']
        if pr.get('procChance'): p['pc'] = pr['procChance']
        if pr.get('icdMs'): p['icd'] = pr['icdMs']
        o['proc'] = p
    if T(e.get('onUse')):
        u = OD(); ou = e['onUse']
        if (ou.get('cooldownMs') or 0) > 0: u['cd'] = ou['cooldownMs']
        if ou.get('categoryId'): u['cat'] = ou['categoryId']
        if (ou.get('categoryCooldownMs') or 0) > 0: u['ccd'] = ou['categoryCooldownMs']
        o['use'] = u
    if e.get('maxCumulativeStacks'): o['max'] = e['maxCumulativeStacks']
    return o

keep_low = {9449, 17721, 254013}
items = []
for it in db['items']:
    t = it.get('type') or 0
    if t < 1 or t > 14: continue
    so = (it.get('scalingOptions') or {}).get('0')
    if so is None or ((so.get('ilvl') or 0) < 40 and it['id'] not in keep_low): continue
    o = OD(id=it['id'], n=it.get('name'), ic=it.get('icon'), t=it.get('type'), q=it.get('quality'))
    if T(so.get('stats')): o['s'] = map_stats(so['stats'])
    if it.get('weaponType'): o['wt'] = it['weaponType']
    if it.get('handType'): o['ht'] = it['handType']
    if it.get('weaponSpeed'): o['sp'] = it['weaponSpeed']; o['mn'] = so.get('weaponDamageMin'); o['mx'] = so.get('weaponDamageMax')
    if so.get('randPropPoints'): o['rp'] = so['randPropPoints']
    if it.get('setName'): o['set'] = it['setName']
    if T(it.get('itemEffects')): o['fx'] = [effect(e) for e in it['itemEffects']]
    items.append(o)

enchants = []
for e in db['enchants']:
    o = OD(id=e.get('effectId'), n=e.get('name'), s=sparse(e.get('stats')))
    if e.get('weaponDamage'): o['wd'] = e['weaponDamage']
    if T(e.get('enchantEffects')): o['fx'] = [effect(x) for x in e['enchantEffects']]
    enchants.append(o)

suffixes = [OD(id=r.get('id'), n=r.get('name'), s=sparse(r.get('stats'))) for r in db['randomSuffixes']]

consumables = []
for c in db['consumables']:
    o = OD(id=c.get('id'), n=c.get('name'), ty=c.get('type'), s=sparse(c.get('stats')))
    te = c.get('temporaryEnchant')
    if T(te):
        if te.get('weaponDamage'): o['wd'] = te['weaponDamage']
        ts = sparse(te.get('stats'))
        if len(ts) > 0: o['s'] = ts
    if T(c.get('itemEffects')): o['fx'] = [effect(x) for x in c['itemEffects']]
    consumables.append(o)

lines = open(spells_go, encoding='utf8').read().split('\n')
lines = [l.rstrip('\r') for l in lines]
start = {}
for n, l in enumerate(lines):
    if l.startswith('\t{ID: '):
        m = re.match(r'^\t\{ID: (\d+),', l)
        if m: start[int(m.group(1))] = n

def num(s):
    v = float(s)
    return int(v) if v.is_integer() and 'e' not in s.lower() else v

def field(text, name):
    m = re.search(r'\b%s: (-?[\d.]+)' % name, text)
    return num(m.group(1)) if m else None

def parse_spell(i):
    n = start[i]; head = lines[n]
    s = OD(id=i)
    nm = re.search(r'Name: "([^"]*)"', head)
    if nm: s['n'] = nm.group(1)
    for a, b in [('School', 'sc'), ('DurationMs', 'd'), ('MaxStack', 'ms'), ('ProcChance', 'pc'), ('ICDMs', 'icd'), ('RPPM', 'ppm'), ('CooldownMs', 'cd')]:
        v = field(head, a)
        if v is not None: s[b] = v
    fx = []
    k = n + 1
    while k < len(lines) and not lines[k].startswith('\t{ID: '):
        l = lines[k]; k += 1
        t = re.search(r'Type: dbcenums\.(\w+)', l)
        if not t: continue
        e = OD(t=t.group(1))
        a = re.search(r'Aura: dbcenums\.(\w+)', l)
        if a: e['a'] = a.group(1)
        for x, y in [('BasePoints', 'bp'), ('Variance', 'v'), ('Misc', 'm'), ('TriggerID', 'tr'), ('PeriodMs', 'p'), ('ChainTargets', 'ct')]:
            v = field(l, x)
            if v is not None: e[y] = v
        if e.get('tr'): want(int(e['tr']))
        fx.append(e)
    s['fx'] = fx
    return s

spells = OD()
queue = list(wanted)
qi = 0
while qi < len(queue):
    i = queue[qi]; qi += 1
    if str(i) in spells or i not in start: continue
    spells[str(i)] = parse_spell(i)
    for w in list(wanted):
        if str(w) not in spells: queue.append(w)

outo = OD(items=items, enchants=enchants, suffixes=suffixes, consumables=consumables, spells=spells)
def fnum(v):
    # .NET Framework's round-trip format, as ConvertTo-Json writes a double: 15 digits when they round-trip, else 17.
    r = '%.15g' % v
    if float(r) != v: r = '%.17g' % v
    if 'e' in r:
        m, e = r.split('e'); r = m + 'E' + ('+' if int(e) >= 0 else '-') + ('%02d' % abs(int(e)))
    return r
def dump(x):
    if isinstance(x, dict): return '{' + ','.join(json.dumps(k, ensure_ascii=False) + ':' + dump(v) for k, v in x.items()) + '}'
    if isinstance(x, list): return '[' + ','.join(dump(v) for v in x) + ']'
    if isinstance(x, bool): return 'true' if x else 'false'
    if isinstance(x, float): return fnum(x)
    if x is None: return 'null'
    if isinstance(x, int): return str(x)
    return json.dumps(x, ensure_ascii=False)
js = dump(outo).replace("'", '\\u0027').replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
header = "// Generated by tools/build-db.ps1 from wowsims/forever (MIT, https://github.com/wowsims/forever). Do not edit.\n"
open(out, 'w', encoding='utf8', newline='').write(header + 'export const DB = ' + js + ';\n')
print(len(items), 'items', len(enchants), 'enchants', len(suffixes), 'suffixes', len(consumables), 'consumables', len(spells), 'spells')
