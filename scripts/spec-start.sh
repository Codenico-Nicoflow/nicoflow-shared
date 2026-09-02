#!/usr/bin/env bash
#
# spec-start <slug> — prepare a feature for the loop.
#
# Runs IN the repos, not in worktrees. Worktrees hid the work: a spec you cannot
# see is a spec you cannot review, and the review step is the only human gate in
# an otherwise autonomous system. The cost is that a repo is busy while its loop
# runs — that is the trade, and it is deliberate.
#
# Correct order, enforced below:
#   1. write spec + tasks
#   2. MERGE them to staging (main for shared)   <- so they are visible
#   3. review them in a normal checkout
#   4. spec-start  (this script)
#   5. run-loop

set -euo pipefail

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "usage: spec-start <slug>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SHARED="$ROOT/nicoflow-shared"
SPEC_DIR="$SHARED/specs/$SLUG"
SPEC="$SPEC_DIR/spec.md"

die() { echo "spec-start: $1" >&2; exit 1; }

[ -f "$SPEC" ] || die "no spec at specs/$SLUG/spec.md"

# ---------------------------------------------------------------- readiness
# An unanswered product question is the one thing a loop cannot recover from: it
# will guess, and the guess will pass every gate.
OPEN_QUESTIONS=$(
  awk '/^## Open Questions/{f=1;next} /^## /{f=0} f' "$SPEC" \
    | grep -vE '^[[:space:]]*$' \
    | grep -viE '^[[:space:]]*[_*(]*[[:space:]]*(none|n/?a|nothing|resolved)[[:space:]]*[)_*]*[[:space:]]*$' \
    || true
)
if [ -n "$OPEN_QUESTIONS" ]; then
  echo "spec-start: spec has unresolved Open Questions — finish the grill first" >&2
  echo "$OPEN_QUESTIONS" | sed 's/^/  /' >&2
  exit 1
fi

grep -q '^## Acceptance Criteria' "$SPEC" || die "spec has no Acceptance Criteria section"

if awk '/^## Acceptance Criteria/{f=1;next} /^## /{f=0} f' "$SPEC" | grep -q 'TODO'; then
  die "acceptance criteria still contain TODO — those must be human-written"
fi

CONSUMERS=$(awk -F'[][]' '/^consumers:/{print $2}' "$SPEC" | tr -d ' ' | tr ',' ' ')
[ -n "$CONSUMERS" ] || die "spec frontmatter has no consumers: [...]"

base_for() { [ "$1" = "shared" ] && echo main || echo staging; }

# ------------------------------------------------- spec must already be merged
# The feature branch is cut from the base branch, so anything not on the base is
# not in the branch. Copying files in afterwards creates a second copy that only
# the loop can see — two sources of truth for the same file, which is the exact
# problem this harness exists to remove.
MISSING=""
for name in $CONSUMERS; do
  repo="$ROOT/nicoflow-$name"
  [ -d "$repo/.git" ] || die "no repo at $repo"
  base=$(base_for "$name")
  git -C "$repo" fetch origin "$base" --quiet 2>/dev/null || true
  git -C "$repo" cat-file -e "origin/$base:specs/$SLUG/tasks.md" 2>/dev/null \
    || MISSING="$MISSING\n  nicoflow-$name: specs/$SLUG/tasks.md not on origin/$base"
done

if [ -n "$MISSING" ]; then
  echo "spec-start: the spec is not on the base branch yet" >&2
  printf "%b\n" "$MISSING" >&2
  echo >&2
  echo "  Merge the spec and task list first (staging, or main for shared)." >&2
  echo "  The feature branch is cut from there, and that is where you read the" >&2
  echo "  plan before anything runs." >&2
  exit 1
fi

# ------------------------------------------------- repos must be clean
# The loop commits with `git add -A`, so anything uncommitted here would be
# swept into its commits.
DIRTY=""
for name in $CONSUMERS; do
  repo="$ROOT/nicoflow-$name"
  [ -z "$(git -C "$repo" status --porcelain)" ] \
    || DIRTY="$DIRTY\n  nicoflow-$name has uncommitted changes"
done

if [ -n "$DIRTY" ]; then
  echo "spec-start: commit or stash your work first — the loop commits with 'git add -A'" >&2
  printf "%b\n" "$DIRTY" >&2
  exit 1
fi

echo "spec-start: $SLUG"
echo "  consumers: $CONSUMERS"
echo

for name in $CONSUMERS; do
  repo="$ROOT/nicoflow-$name"
  base=$(base_for "$name")
  branch="feature/$SLUG"

  if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
    echo "  [$name] checkout existing $branch"
    git -C "$repo" checkout "$branch" --quiet
  else
    echo "  [$name] branch $branch from origin/$base"
    git -C "$repo" checkout -b "$branch" "origin/$base" --quiet
  fi
done

# ---------------------------------------------------------------- linking
# The inner loop must see local @nicoflow/shared edits immediately; publishing
# per iteration would cost minutes and spray versions. The exit gate re-checks
# against the published package, which is what catches a broken export map.
if echo "$CONSUMERS" | grep -qw shared; then
  echo
  echo "  [shared] build"
  (cd "$SHARED" && pnpm install --silent && pnpm build >/dev/null)

  for name in $CONSUMERS; do
    case "$name" in frontend|mobile) ;; *) continue ;; esac
    echo "  [$name] link -> nicoflow-shared"
    (cd "$ROOT/nicoflow-$name" && pnpm link "$SHARED" >/dev/null)
  done
fi

cat > "$ROOT/nicoflow-shared/.loop-env" <<EOF
# sourced by run-loop.sh
export NICOFLOW_LOOP_ACTIVE=1
export SLUG=$SLUG
export SPEC_DIR=$SPEC_DIR
export NICOFLOW_API_PATH=$ROOT/nicoflow-api
EOF

echo
echo "ready. every repo is on feature/$SLUG, and the spec and tasks are visible"
echo "in each repo at specs/$SLUG/."
echo
echo "  1. review specs/$SLUG/tasks.md and the acceptance criteria in spec.md"
echo "  2. ./scripts/run-loop.sh $SLUG <repo>"
