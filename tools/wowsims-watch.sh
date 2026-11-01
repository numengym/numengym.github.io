#!/usr/bin/env bash
# The wowsims watch, four times a day (.github/workflows/wowsims-watch.yml): what changed in wowsims/forever since SINCE (default:
# the last 7 hours) that the trainer may need to follow, as a Markdown report on stdout, sorted by kind:
#   Rotations: the APLs, builds and presets (ui/specs/*/*/apls, builds, presets.ts)
#   Talents:   the talent trees and the class protos (ui/sim/talents/trees, proto/<class>.proto)
#   Classes:   the class mechanics (sim/<class>/*.go, not the tests' .results)
#   Data:      game data and hotfixes (assets/database, sim/spelldata, "[DB]" commits)
# Merge commits are skipped (their changes come with the commits merged). Nothing found: no output.
# Needs gh (GH_TOKEN in a workflow). Run by hand: SINCE=2026-10-30T00:00:00Z tools/wowsims-watch.sh
set -euo pipefail

REPO=wowsims/forever
SINCE=${SINCE:-$(date -u -d '7 hours ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-7H +%Y-%m-%dT%H:%M:%SZ)}
CLASSES='warrior|rogue|mage|paladin|priest|shaman|warlock|hunter|druid'

declare -A SECTION
for k in Rotations Talents Classes Data; do SECTION[$k]=''; done

# One line per commit: sha, parent count, date, first line of the message.
commits=$(gh api --paginate "repos/$REPO/commits?since=$SINCE&per_page=100" \
  --jq '.[] | "\(.sha)\t\(.parents | length)\t\(.commit.author.date[:16])\t\(.commit.message | split("\n")[0])"')
[ -z "$commits" ] && exit 0

while IFS=$'\t' read -r sha parents date msg; do
  [ "$parents" -gt 1 ] && continue
  files=$(gh api "repos/$REPO/commits/$sha" --jq '.files[].filename')
  short=${sha:0:8}
  link="[\`$short\`](https://github.com/$REPO/commit/$sha)"
  for kind in Rotations Talents Classes Data; do
    case $kind in
      Rotations) hits=$(grep -E '^ui/specs/[^/]+/[^/]+/(apls/|builds/|presets\.ts$)' <<<"$files" || true) ;;
      Talents) hits=$(grep -E "^ui/sim/talents/trees/|^proto/($CLASSES)\.proto$" <<<"$files" || true) ;;
      Classes) hits=$(grep -E "^sim/($CLASSES)/.*\.go$" <<<"$files" | grep -v '_test\.go$' || true) ;;
      Data) hits=$(grep -E '^assets/database/|^sim/spelldata/' <<<"$files" || true)
            [ -z "$hits" ] && [[ $msg == \[DB\]* ]] && hits='(game data)' ;;
    esac
    [ -z "$hits" ] && continue
    n=$(wc -l <<<"$hits")
    shown=$(head -6 <<<"$hits" | sed 's/^/`/; s/$/`/' | paste -sd ',' - | sed 's/,/, /g')
    [ "$n" -gt 6 ] && shown="$shown and $((n - 6)) more"
    SECTION[$kind]+="- $link $date — ${msg//|/\\|}"$'\n'"  $shown"$'\n'
  done
done <<<"$commits"

body=''
for kind in Rotations Talents Classes Data; do
  [ -n "${SECTION[$kind]}" ] && body+="### $kind"$'\n\n'"${SECTION[$kind]}"$'\n'
done
[ -z "$body" ] && exit 0
printf 'wowsims/forever changes since %s that Numen Gym may need to follow.\n\n%s' "$SINCE" "$body"
printf '\nTo port them: ask Claude to "port the wowsims changes in this issue" (rotations: js/data/*-apl.js; talents: js/data/*-talent-tree.js; classes: js/classes/*; data: tools/build-db.ps1).\n'
