# Radio Numen's voices (js/radio.js): every line the hosts can say, recorded with OpenAI text to speech (-Model: tts-1-hd by
# default; gpt-4o-mini-tts takes each host's acting direction, but new accounts may only call it 50 times a day) into
# assets/radio/<clip>.mp3. The clip list comes from tools/radio-clips.html, read through headless Chrome from the dev server
# (serve.ps1 on port 8090). Clips already there are skipped, so after a change to the jokes (js/data/radio.js) only the new
# lines are recorded; -Prune removes clips no line uses any more.
# The OpenAI API key is read from a file outside the repo (default: ~/.numen-tts-key) and never printed.
#   powershell -File tools/radio-voices.ps1 [-Model tts-1-hd|gpt-4o-mini-tts] [-KeyFile path] [-Prune] [-Limit n]
param(
  [string]$Model = 'tts-1-hd',
  [string]$KeyFile = "$env:USERPROFILE\.numen-tts-key",
  [string]$Match = '',    # record only the clips whose file name matches (e.g. '^rap-')
  [string]$Exclude = '',  # and none whose file name matches
  [switch]$WaitOnLimit,   # on a daily request limit, wait for the next request rather than stop
  [string]$Server = 'http://localhost:8090',
  [switch]$Prune,
  [int]$Limit = 0
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'assets\radio'
New-Item -ItemType Directory -Force $outDir | Out-Null

# The clip list.
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Needs Chrome or Edge to read tools/radio-clips.html.' }
# Chrome's log lines on stderr are not errors; its own throwaway profile, never yours.
$ErrorActionPreference = 'Continue'
$dom = & $chrome --headless=new --disable-gpu --no-first-run --user-data-dir="$env:TEMP\numen-radio-chrome" --virtual-time-budget=5000 `
  --dump-dom "$Server/tools/radio-clips.html" 2>$null | Out-String
$ErrorActionPreference = 'Stop'
if ($dom -notmatch '(?s)<pre id="clips">(.*?)</pre>' -or -not $Matches[1].Trim()) { throw "No clip list from $Server/tools/radio-clips.html (is the dev server running?)." }
$json = [System.Net.WebUtility]::HtmlDecode($Matches[1])
$list = $json | ConvertFrom-Json
Write-Host "$($list.clips.Count) clips in the list."

if ($Prune) {
  $keep = @{}
  foreach ($c in $list.clips) { $keep[$c[0]] = $true }
  Get-ChildItem $outDir -Filter *.mp3 | Where-Object { -not $keep[$_.Name] } | ForEach-Object { Remove-Item $_.FullName; Write-Host "removed $($_.Name)" }
}

$todo = @($list.clips | Where-Object { -not (Test-Path (Join-Path $outDir $_[0])) -and (-not $Match -or $_[0] -match $Match) -and (-not $Exclude -or $_[0] -notmatch $Exclude) })
if ($Limit -gt 0) { $todo = @($todo | Select-Object -First $Limit) }
Write-Host "$($todo.Count) to record."
if (-not $todo.Count) { return }

if (-not (Test-Path $KeyFile)) { throw "No API key file at $KeyFile." }
$key = (Get-Content -Raw $KeyFile).Trim()
$headers = @{ Authorization = "Bearer $key" }
$done = 0
$failed = 0
foreach ($c in $todo) {
  $file, $who, $text = $c[0], $c[1], $c[2]
  $host_ = $list.hosts.$who
  $instructions = if ($c.Count -gt 3) { "$($host_.instructions) $($list.numberNote)" } else { $host_.instructions }
  $req = @{ model = $Model; voice = $host_.voice; input = $text; speed = [double]$host_.speed; response_format = 'mp3' }
  if ($Model -like 'gpt-*') { $req.instructions = $instructions }
  $body = $req | ConvertTo-Json -Compress
  $out = Join-Path $outDir $file
  for ($try = 1; $try -le 3; $try++) {
    try {
      Invoke-RestMethod -Uri 'https://api.openai.com/v1/audio/speech' -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -OutFile "$out.part" | Out-Null
      Move-Item -Force "$out.part" $out
      $done++
      break
    } catch {
      Remove-Item -ErrorAction SilentlyContinue "$out.part"
      $status = $_.Exception.Response.StatusCode.value__
      $detail = "$($_.ErrorDetails.Message)"
      if ($status -eq 401) { throw 'The API key was refused (401).' }
      if ($detail -match 'insufficient_quota') { throw "No API credits left: add some at https://platform.openai.com/settings/organization/billing ($done recorded so far; run again to go on)." }
      # A daily request limit (a new account's on gpt-4o-mini-tts): wait as long as it says, then go on.
      if ($WaitOnLimit -and $detail -match 'requests per day' -and $detail -match 'try again in (?:(\d+)m)?([\d.]+)s') {
        $wait = [int]$Matches[1] * 60 + [double]$Matches[2] + 5
        Write-Host "daily limit: waiting $([int]$wait) s"
        Start-Sleep -Seconds $wait
        $try--
        continue
      }
      if ($try -eq 3) { Write-Warning "failed: $file ($status) $detail"; $failed++ } else { Start-Sleep -Seconds (5 * $try) }
    }
  }
  if (($done + $failed) % 20 -eq 0) { Write-Host "$($done + $failed) / $($todo.Count)" }
}
Write-Host "Recorded $done clips into assets/radio$(if ($failed) { "; $failed failed (run again to retry them)" })."
