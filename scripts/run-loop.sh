#!/usr/bin/env bash
#
# run-loop.sh <slug> <repo> [max-iterations]
#
# The Ralph loop. Each iteration is a NEW claude process, so context is fresh
# every time and disk is the only memory. The model is not asked whether it is
# done — the gate answers that, and this script answers when to stop trying.
#
# Four terminal states: CONVERGED, BLOCKED, STALLED, BUDGET.

set -uo pipefail

SLUG="${1:-}"
REPO="${2:-}"
MAX_ITER="${3:-50}"
STALL_LIMIT=3

[ -n "$SLUG" ] && [ -n "$REPO" ] || { echo "usage: run-loop.sh <slug> <repo> [max-iter]" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREE_ROOT="$ROOT/.worktrees/$SLUG"
ENV_FILE="$WORKTREE_ROOT/.env"

[ -f "$ENV_FILE" ] || { echo "no env for '$SLUG' — run spec-start first" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

WT="$WORKTREE_ROOT/nicoflow-$REPO"
[ -d "$WT" ] || { echo "no worktree at $WT" >&2; exit 1; }

STATE="$WT/specs/$SLUG"
PROMPT="$ROOT/nicoflow-shared/PROMPT.md"

cd "$WT" || exit 1

# Refuse to run anywhere a mistake would be expensive. The hooks enforce this
# too, but a loop that starts on the wrong branch has already wasted its budget.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
case "$BRANCH" in
  main|master|staging) echo "refusing to loop on protected branch '$BRANCH'" >&2; exit 1 ;;
esac

# grep -c exits 1 on zero matches, so `|| echo 0` would append a SECOND line and
# corrupt every numeric comparison downstream — the CONVERGED check silently
# never fires and the loop runs to its budget. Count lines instead.
count_matches() {
  local n
  n=$(grep -cE "$1" "$2" 2>/dev/null | head -1)
  echo "${n:-0}"
}

progress_count() { count_matches '^## ' "$STATE/progress.md"; }
open_tasks()     { count_matches '^- \[ \]' "$STATE/tasks.md"; }
head_sha()       { git rev-parse HEAD 2>/dev/null; }

finish() {
  echo
  echo "=============================================="
  echo " $1"
  echo " iterations: $2   tasks left: $(open_tasks)"
  echo "=============================================="
  exit "$3"
}

[ -f "$STATE/tasks.md" ] || { echo "no tasks.md — run the planner pass first" >&2; exit 1; }

echo "loop: $SLUG / $REPO   branch=$BRANCH   max=$MAX_ITER"
echo

stall=0
for i in $(seq 1 "$MAX_ITER"); do
  before_tasks=$(open_tasks)
  before_sha=$(head_sha)

  echo "--- iteration $i/$MAX_ITER (open tasks: $before_tasks) ---"

  if [ "$before_tasks" -eq 0 ]; then
    finish "CONVERGED — all tasks checked. Run the audit next." "$i" 0
  fi

  if [ -s "$STATE/blockers.md" ]; then
    finish "BLOCKED — see $STATE/blockers.md" "$i" 2
  fi

  SLUG="$SLUG" SPEC_DIR="$SPEC_DIR" NICOFLOW_LOOP_ACTIVE=1 \
    claude -p --dangerously-skip-permissions \
      "$(cat "$PROMPT")

---
Repo: nicoflow-$REPO
SLUG=$SLUG
SPEC_DIR=$SPEC_DIR
Iteration $i of $MAX_ITER.
Do exactly one task." 2>&1 | tail -20

  after_tasks=$(open_tasks)
  after_sha=$(head_sha)

  if [ -s "$STATE/blockers.md" ]; then
    finish "BLOCKED — see $STATE/blockers.md" "$i" 2
  fi

  # No box ticked and no commit means the iteration achieved nothing. One of
  # those is recoverable noise; three in a row is a loop spinning, and spinning
  # costs money without converging.
  if [ "$after_tasks" -eq "$before_tasks" ] && [ "$after_sha" = "$before_sha" ]; then
    stall=$((stall + 1))
    echo "    no progress ($stall/$STALL_LIMIT)"
    [ "$stall" -ge "$STALL_LIMIT" ] && finish "STALLED — $STALL_LIMIT iterations with no progress" "$i" 3
  else
    stall=0
  fi
done

finish "BUDGET — hit the $MAX_ITER iteration cap" "$MAX_ITER" 4
