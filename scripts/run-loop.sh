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
ENV_FILE="$ROOT/nicoflow-shared/.loop-env"

[ -f "$ENV_FILE" ] || { echo "no env for '$SLUG' — run spec-start first" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

if [ "${SLUG:-}" != "$1" ]; then
  echo "the prepared feature is '${SLUG:-none}', not '$1' — run spec-start for '$1' first" >&2
  exit 1
fi
SLUG="$1"

# The loop runs in the repo itself. Worktrees isolated its writes but hid the
# work: the spec, the task list and every commit lived somewhere a normal
# checkout never showed, so the plan could not be reviewed before it ran.
WT="$ROOT/nicoflow-$REPO"
[ -d "$WT/.git" ] || { echo "no repo at $WT" >&2; exit 1; }

STATE="$WT/specs/$SLUG"
[ -d "$STATE" ] || { echo "no tasks for '$SLUG' in nicoflow-$REPO" >&2; exit 1; }

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

TOTAL=$(count_matches '^- \[' "$STATE/tasks.md")
DONE=$(count_matches '^- \[x\]' "$STATE/tasks.md")

echo "loop: $SLUG / $REPO   branch=$BRANCH   max=$MAX_ITER"
echo "tasks: $DONE/$TOTAL done"
if [ "$DONE" -gt 0 ]; then
  echo "resuming — every finished task is already committed, so an interrupted"
  echo "run costs nothing but the iteration it died in."
fi
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

  OUT=$(mktemp)
  # tee rather than redirect: an iteration can run for minutes, and watching it
  # in silence tells you nothing about whether it is working or stuck. The file
  # copy is still needed to classify the exit code afterwards.
  # PIPESTATUS[0] is claude's code — $? would be tee's.
  SLUG="$SLUG" SPEC_DIR="$SPEC_DIR" NICOFLOW_LOOP_ACTIVE=1 \
    claude -p --dangerously-skip-permissions \
      "$(cat "$PROMPT")

---
Repo: nicoflow-$REPO
SLUG=$SLUG
SPEC_DIR=$SPEC_DIR
Iteration $i of $MAX_ITER.
Do exactly one task." 2>&1 | tee "$OUT"
  rc=${PIPESTATUS[0]}

  # An exhausted account, a revoked key or a network outage is not a coding
  # failure, and retrying it 40 more times helps nobody. Stop on the first one
  # and say so plainly — the alternative is a terminal full of what looks like
  # the model failing when the account is simply out.
  if [ "$rc" -ne 0 ]; then
    if grep -qiE 'usage limit|rate limit|quota|insufficient credit|billing|401|403|authentication' "$OUT"; then
      echo
      echo "  claude exited $rc — looks like credit/auth, not a coding failure"
      rm -f "$OUT"
      finish "HALTED — API unavailable (credit, auth or network). Work so far is committed; rerun to resume." "$i" 5
    fi
    echo "  claude exited $rc (continuing — treated as a failed iteration)"
  fi
  rm -f "$OUT"

  after_tasks=$(open_tasks)
  after_sha=$(head_sha)

  # What actually changed, separate from what the model said about it. The
  # stream above is reasoning; this is the record.
  echo
  echo "  ── iteration $i result ──"
  echo "     tasks:  $before_tasks open -> $after_tasks open"
  if [ "$after_sha" != "$before_sha" ]; then
    echo "     commit: $(git log --oneline -1 | cut -c1-72)"
  else
    echo "     commit: none"
  fi
  if [ -s "$STATE/progress.md" ]; then
    echo "     learned: $(grep -m1 '^learned:' "$STATE/progress.md" | cut -c1-72)"
  fi
  echo

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
