#!/usr/bin/env bash
#
# audit.sh <slug> <repo> — the convergence verdict.
#
# Ticked boxes are the loop's CLAIM. A green gate proves the code compiles and
# its tests pass. Neither proves the code does what the spec asked: a loop can
# satisfy every gate while building something adjacent to the request.
#
# So each acceptance criterion is judged in a FRESH context that did not do the
# work — self-grading is worthless — and asked two independent questions:
#   1. does the diff actually satisfy this criterion?
#   2. would we find out if it stopped being true?

set -uo pipefail

SLUG="${1:-}"
REPO="${2:-}"
[ -n "$SLUG" ] && [ -n "$REPO" ] || { echo "usage: audit.sh <slug> <repo>" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREE_ROOT="$ROOT/.worktrees/$SLUG"
WT="$WORKTREE_ROOT/nicoflow-$REPO"
SPEC="$ROOT/nicoflow-shared/specs/$SLUG/spec.md"

[ -d "$WT" ] || { echo "no worktree at $WT" >&2; exit 1; }
[ -f "$SPEC" ] || { echo "no spec at $SPEC" >&2; exit 1; }

cd "$WT" || exit 1

BASE=staging
[ "$REPO" = "shared" ] && BASE=main

mapfile -t ACS < <(awk '/^## Acceptance Criteria/{f=1;next} /^## /{f=0} f && /^- \[/' "$SPEC")
[ "${#ACS[@]}" -gt 0 ] || { echo "no acceptance criteria found in spec" >&2; exit 1; }

echo "audit: $SLUG / $REPO   ${#ACS[@]} criteria"
echo

DIFF=$(git diff "origin/$BASE...HEAD" --stat)
FAILED=0

for ac in "${ACS[@]}"; do
  label=$(echo "$ac" | grep -oE 'AC[0-9]+' | head -1)
  label=${label:-AC?}

  echo "--- $label ---"

  verdict=$(claude -p --dangerously-skip-permissions "You are auditing whether an implementation satisfies ONE acceptance criterion.
You did not write this code. Do not assume it works. Read the actual files.

Criterion:
$ac

Changed files on this branch:
$DIFF

Answer in exactly this format, nothing else:
VERDICT: SATISFIED | PARTIAL | MISSING
WHY: <one sentence, citing a file:line you actually read>
TEST: YES <path> | NO
TESTWHY: <one sentence — if YES, name the test that would fail if this broke; a test that cannot fail does not count>" 2>&1 | tail -8)

  echo "$verdict"
  echo

  echo "$verdict" | grep -qE '^VERDICT: SATISFIED' || FAILED=$((FAILED + 1))
  echo "$verdict" | grep -qE '^TEST: YES' || {
    echo "    ^ no regression test — this criterion is unprotected"
    FAILED=$((FAILED + 1))
  }
done

echo "=============================================="
if [ "$FAILED" -eq 0 ]; then
  echo " AUDIT PASSED — ${#ACS[@]} criteria satisfied and protected"
  exit 0
fi
echo " AUDIT FAILED — $FAILED problem(s)"
echo " Append the gaps to tasks.md under ## Discovered and resume the loop."
exit 1
