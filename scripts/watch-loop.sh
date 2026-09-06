#!/usr/bin/env bash
#
# watch-loop.sh [slug] — what has the loop actually done?
#
# Run in a second terminal while run-loop works. The streamed output shows the
# model reasoning; this shows what landed on disk, which is the part that counts.
#
#   ./scripts/watch-loop.sh                    one snapshot
#   watch -n5 ./scripts/watch-loop.sh          refresh every 5s

SLUG="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -z "$SLUG" ]; then
  ENV_FILE="$ROOT/nicoflow-shared/.loop-env"
  [ -f "$ENV_FILE" ] || { echo "no loop prepared — run spec-start first"; exit 0; }
  # shellcheck disable=SC1090
  SLUG=$(grep '^export SLUG=' "$ENV_FILE" | cut -d= -f2)
fi

echo "════════════════════════════════════════════════════"
echo " $SLUG"
echo "════════════════════════════════════════════════════"

for repo in api shared frontend mobile; do
  dir="$ROOT/nicoflow-$repo"
  tasks="$dir/specs/$SLUG/tasks.md"
  [ -f "$tasks" ] || continue

  total=$(grep -cE '^- \[' "$tasks" 2>/dev/null | head -1)
  done_n=$(grep -cE '^- \[x\]' "$tasks" 2>/dev/null | head -1)
  branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)

  echo
  echo "── $repo  [$branch]  ${done_n:-0}/${total:-0}"

  next=$(grep -m1 '^- \[ \]' "$tasks" 2>/dev/null | sed 's/\[verify:.*//;s/\[files:[^]]*\]//;s/^- \[ \] //' | cut -c1-64)
  [ -n "$next" ] && echo "   next: $next"

  blockers="$dir/specs/$SLUG/blockers.md"
  if [ -s "$blockers" ]; then
    echo "   ⚠ BLOCKED:"
    head -5 "$blockers" | sed 's/^/     /'
  fi

  base=staging
  [ "$repo" = shared ] && base=main
  n=$(git -C "$dir" log --oneline "origin/$base..HEAD" 2>/dev/null | wc -l | tr -d ' ')
  if [ "${n:-0}" -gt 0 ]; then
    echo "   commits ($n):"
    git -C "$dir" log --oneline "origin/$base..HEAD" 2>/dev/null | head -4 | sed 's/^/     /'
  fi

  prog="$dir/specs/$SLUG/progress.md"
  if [ -s "$prog" ]; then
    echo "   last:"
    head -4 "$prog" | sed 's/^/     /'
  fi
done
