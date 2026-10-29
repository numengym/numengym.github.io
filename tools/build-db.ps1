# Builds js/data/db.js from wowsims/forever:
#   assets/database/db.json                 items, enchants, random suffixes, consumables
#   sim/core/spelldata/spells_auto_gen.go   the spells that item procs, on-use items and consumables cast
# Usage: powershell -ExecutionPolicy Bypass -File tools/build-db.ps1 [-DbJson <db.json>] [-SpellsGo <spells_auto_gen.go>]
# Files not given are downloaded from GitHub into a temp folder.
param([string]$DbJson, [string]$SpellsGo)

$ErrorActionPreference = 'Stop'
$raw = 'https://raw.githubusercontent.com/wowsims/forever/master'
if (-not $DbJson) {
  $DbJson = Join-Path $env:TEMP 'wowsims-forever-db.json'
  Invoke-WebRequest "$raw/assets/database/db.json" -OutFile $DbJson -UseBasicParsing
}
if (-not $SpellsGo) {
  $SpellsGo = Join-Path $env:TEMP 'wowsims-forever-spells_auto_gen.go'
  Invoke-WebRequest "$raw/sim/core/spelldata/spells_auto_gen.go" -OutFile $SpellsGo -UseBasicParsing
}

$db = Get-Content $DbJson -Raw -Encoding UTF8 | ConvertFrom-Json

# Converts a dense stats array (index = wowsims Stat enum) into a sparse {index: value} map.
function Sparse($arr) {
  $o = [ordered]@{}
  if ($null -eq $arr) { return $o }
  for ($i = 0; $i -lt $arr.Count; $i++) { if ($arr[$i] -ne 0) { $o["$i"] = $arr[$i] } }
  return $o
}

function MapStats($obj) {
  $o = [ordered]@{}
  if ($obj) { $obj.PSObject.Properties | ForEach-Object { $o[$_.Name] = $_.Value } }
  return $o
}

$wantedSpells = New-Object 'System.Collections.Generic.HashSet[int]'

# Item / enchant / consumable effect: the buff spell, how it is triggered and any stats wowsims states.
function Effect($e) {
  $o = [ordered]@{ b = $e.buffId }
  [void]$wantedSpells.Add([int]$e.buffId)
  if ($e.effectDurationMs) { $o.d = $e.effectDurationMs }
  if ($e.scalingOptions -and $e.scalingOptions.'0'.stats) { $o.s = MapStats $e.scalingOptions.'0'.stats }
  if ($null -ne $e.proc) {
    $p = [ordered]@{}
    if ($e.proc.ppm) { $p.ppm = $e.proc.ppm }
    if ($e.proc.procChance) { $p.pc = $e.proc.procChance }
    if ($e.proc.icdMs) { $p.icd = $e.proc.icdMs }
    $o.proc = $p
  }
  if ($e.onUse) {
    $u = [ordered]@{}
    if ($e.onUse.cooldownMs -gt 0) { $u.cd = $e.onUse.cooldownMs }
    if ($e.onUse.categoryId) { $u.cat = $e.onUse.categoryId }
    if ($e.onUse.categoryCooldownMs -gt 0) { $u.ccd = $e.onUse.categoryCooldownMs }
    $o.use = $u
  }
  if ($e.maxCumulativeStacks) { $o.max = $e.maxCumulativeStacks }
  return $o
}

# Low-level items that endgame builds still use (Manual Crowd Pummeler: the Holy Shock paladin's weapon; the Elemental
# preset's gloves 17721; the Smite priest's Earthen Silk Slippers 254013).
$keepLowLevel = @(9449, 17721, 254013)

$items = foreach ($it in $db.items) {
  # Equippable slots only (1..14 = head..ranged); skip low-level items to keep the file small.
  if ($it.type -lt 1 -or $it.type -gt 14) { continue }
  $so = $it.scalingOptions.'0'
  if ($null -eq $so -or ($so.ilvl -lt 40 -and $keepLowLevel -notcontains $it.id)) { continue }
  $o = [ordered]@{ id = $it.id; n = $it.name; ic = $it.icon; t = $it.type; q = $it.quality }
  if ($so.stats) { $o.s = MapStats $so.stats }
  if ($it.weaponType) { $o.wt = $it.weaponType }
  if ($it.handType) { $o.ht = $it.handType }
  if ($it.weaponSpeed) { $o.sp = $it.weaponSpeed; $o.mn = $so.weaponDamageMin; $o.mx = $so.weaponDamageMax }
  if ($so.randPropPoints) { $o.rp = $so.randPropPoints }
  if ($it.setName) { $o.set = $it.setName }
  if ($it.itemEffects) { $o.fx = @($it.itemEffects | ForEach-Object { Effect $_ }) }
  $o
}

$enchants = foreach ($e in $db.enchants) {
  $o = [ordered]@{ id = $e.effectId; n = $e.name; s = (Sparse $e.stats) }
  if ($e.weaponDamage) { $o.wd = $e.weaponDamage }
  if ($e.enchantEffects) { $o.fx = @($e.enchantEffects | ForEach-Object { Effect $_ }) }
  $o
}

$suffixes = foreach ($r in $db.randomSuffixes) { [ordered]@{ id = $r.id; n = $r.name; s = (Sparse $r.stats) } }

$consumables = foreach ($c in $db.consumables) {
  $o = [ordered]@{ id = $c.id; n = $c.name; ty = $c.type; s = (Sparse $c.stats) }
  if ($c.temporaryEnchant) {
    if ($c.temporaryEnchant.weaponDamage) { $o.wd = $c.temporaryEnchant.weaponDamage }
    $ts = Sparse $c.temporaryEnchant.stats
    if ($ts.Count -gt 0) { $o.s = $ts }
  }
  if ($c.itemEffects) { $o.fx = @($c.itemEffects | ForEach-Object { Effect $_ }) }
  $o
}

# ---- spells ---------------------------------------------------------------------------------
# Index every spell block in the generated Go file, then pull the wanted spells and the spells they
# trigger.
$lines = [System.IO.File]::ReadAllLines($SpellsGo)
$startOf = @{}
for ($n = 0; $n -lt $lines.Length; $n++) {
  if ($lines[$n].StartsWith("`t{ID: ")) {
    $m = [regex]::Match($lines[$n], '^\t\{ID: (\d+),')
    if ($m.Success) { $startOf[[int]$m.Groups[1].Value] = $n }
  }
}

function Field($text, $name) {
  $m = [regex]::Match($text, "\b$name`: (-?[\d.]+)")
  if ($m.Success) { return [double]$m.Groups[1].Value }
  return $null
}

function ParseSpell([int]$id) {
  $n = $startOf[$id]
  $head = $lines[$n]
  $s = [ordered]@{ id = $id }
  $nm = [regex]::Match($head, 'Name: "([^"]*)"'); if ($nm.Success) { $s.n = $nm.Groups[1].Value }
  foreach ($pair in @(@('School', 'sc'), @('DurationMs', 'd'), @('MaxStack', 'ms'), @('ProcChance', 'pc'), @('ICDMs', 'icd'), @('RPPM', 'ppm'), @('CooldownMs', 'cd'))) {
    $v = Field $head $pair[0]; if ($null -ne $v) { $s[$pair[1]] = $v }
  }
  $fx = @()
  for ($k = $n + 1; $k -lt $lines.Length -and -not $lines[$k].StartsWith("`t{ID: "); $k++) {
    $l = $lines[$k]
    $t = [regex]::Match($l, 'Type: dbcenums\.(\w+)')
    if (-not $t.Success) { continue }
    $e = [ordered]@{ t = $t.Groups[1].Value }
    $a = [regex]::Match($l, 'Aura: dbcenums\.(\w+)'); if ($a.Success) { $e.a = $a.Groups[1].Value }
    foreach ($pair in @(@('BasePoints', 'bp'), @('Variance', 'v'), @('Misc', 'm'), @('TriggerID', 'tr'), @('PeriodMs', 'p'), @('ChainTargets', 'ct'))) {
      $v = Field $l $pair[0]; if ($null -ne $v) { $e[$pair[1]] = $v }
    }
    if ($e.tr) { [void]$wantedSpells.Add([int]$e.tr) }
    $fx += $e
  }
  $s.fx = $fx
  return $s
}

$spells = [ordered]@{}
$queue = New-Object System.Collections.Generic.Queue[int]
foreach ($id in $wantedSpells) { $queue.Enqueue($id) }
while ($queue.Count -gt 0) {
  $id = $queue.Dequeue()
  if ($spells.Contains("$id") -or -not $startOf.ContainsKey($id)) { continue }
  $before = $wantedSpells.Count
  $spells["$id"] = ParseSpell $id
  foreach ($w in @($wantedSpells)) { if (-not $spells.Contains("$w")) { $queue.Enqueue($w) } }
}

$out = [ordered]@{ items = @($items); enchants = @($enchants); suffixes = @($suffixes); consumables = @($consumables); spells = $spells }
$json = $out | ConvertTo-Json -Depth 8 -Compress
$header = "// Generated by tools/build-db.ps1 from wowsims/forever (MIT, https://github.com/wowsims/forever). Do not edit.`n"
$target = Join-Path $PSScriptRoot '..\js\data\db.js'
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
[System.IO.File]::WriteAllText($target, $header + "export const DB = " + $json + ";`n", (New-Object System.Text.UTF8Encoding $false))
"Wrote $target ($([math]::Round((Get-Item $target).Length / 1KB)) KB): $(@($items).Count) items, $(@($enchants).Count) enchants, $(@($suffixes).Count) suffixes, $(@($consumables).Count) consumables, $($spells.Count) spells"
