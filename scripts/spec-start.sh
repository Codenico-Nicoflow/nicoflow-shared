#!/usr/bin/env bash
#
# spec-start <slug> — prepare a feature for the loop.
#
# Reads consumers: from the spec's frontmatter, then for each one creates a git
# worktree, branches it, installs, and links @nicoflow/shared so the inner loop
# sees local changes without a publish round-trip.
#
# Worktrees live OUTSIDE the repos they branch from. A worktree nested inside a
# JS repo carries its own node_modules, including a second copy of React; the
# test runner resolves both and every hook returns null. That cost us 91 phantom
# failures in nicoflow-mobile before it was diagnosed.

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
WORKTREE_ROOT="$ROOT/.worktrees/$SLUG"

die() { echo "spec-start: $1" >&2; exit 1; }

[ -f "$SPEC" ] || die "no spec at specs/$SLUG/spec.md"

# ---------------------------------------------------------------- readiness
# An unanswered product question is the one thing a loop cannot recover from:
# it will guess, and the guess will pass every gate.
if awk '/^## Open Questions/{f=1;next} /^## /{f=0} f' "$SPEC" | grep -qE '[^[:space:]_]'; then
  die "spec has unresolved Open Questions — finish the grill first"
fi

if ! grep -q '^## Acceptance Criteria' "$SPEC"; then
  die "spec has no Acceptance Criteria section"
fi

if grep -qE '^## Acceptance Criteria' -A20 "$SPEC" | grep -q 'TODO'; then
  die "acceptance criteria still contain TODO — those must be human-written"
fi

# ---------------------------------------------------------------- consumers
CONSUMERS=$(awk -F'[][]' '/^consumers:/{print $2}' "$SPEC" | tr -d ' ' | tr ',' ' ')
[ -n "$CONSUMERS" ] || die "spec frontmatter has no consumers: [...]"

echo "spec-start: $SLUG"
echo "  consumers: $CONSUMERS"
echo "  worktrees: $WORKTREE_ROOT"
echo

mkdir -p "$WORKTREE_ROOT"

for name in $CONSUMERS; do
  repo="$ROOT/nicoflow-$name"
  [ -d "$repo/.git" ] || die "no repo at $repo"

  wt="$WORKTREE_ROOT/nicoflow-$name"
  branch="feature/$SLUG"

  if [ -d "$wt" ]; then
    echo "  [$name] worktree exists, skipping"
    continue
  fi

  # nicoflow-shared branches from main; the others from staging.
  base=staging
  [ "$name" = "shared" ] && base=main

  echo "  [$name] worktree from origin/$base"
  git -C "$repo" fetch origin "$base" --quiet

  if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$repo" worktree add "$wt" "$branch" --quiet
  else
    git -C "$repo" worktree add -b "$branch" "$wt" "origin/$base" --quiet
  fi
done

# ---------------------------------------------------------------- linking
# The inner loop must see local @nicoflow/shared edits immediately; publishing
# per iteration would cost minutes and spray versions. The exit gate re-checks
# against the published package, which is what catches a broken export map.
API_WT="$WORKTREE_ROOT/nicoflow-api"
SHARED_WT="$WORKTREE_ROOT/nicoflow-shared"

if [ -d "$SHARED_WT" ]; then
  echo
  echo "  [shared] install + build"
  (cd "$SHARED_WT" && pnpm install --silent && pnpm build >/dev/null)
fi

for name in $CONSUMERS; do
  case "$name" in
    frontend|mobile) ;;
    *) continue ;;
  esac

  wt="$WORKTREE_ROOT/nicoflow-$name"
  echo "  [$name] install"
  (cd "$wt" && pnpm install --silent)

  if [ -d "$SHARED_WT" ]; then
    echo "  [$name] link -> $SHARED_WT"
    # pnpm link writes to node_modules only; package.json is untouched, so the
    # link can never be committed by accident.
    (cd "$wt" && pnpm link "$SHARED_WT" >/dev/null)
  fi
done

# ---------------------------------------------------------------- env
# Codegen reads the API's swagger.json. When the api is in scope its worktree is
# the right source; when it is not, the contract is whatever the main checkout
# currently holds.
if [ -d "$API_WT" ]; then
  API_FOR_CODEGEN="$API_WT"
else
  API_FOR_CODEGEN="$ROOT/nicoflow-api"
fi

ENV_FILE="$WORKTREE_ROOT/.env"
cat > "$ENV_FILE" <<EOF
# sourced by run-loop.sh
export NICOFLOW_LOOP_ACTIVE=1
export SLUG=$SLUG
export SPEC_DIR=$SPEC_DIR
export NICOFLOW_API_PATH=$API_FOR_CODEGEN
export WORKTREE_ROOT=$WORKTREE_ROOT
EOF

# ---------------------------------------------------------------- task files
for name in $CONSUMERS; do
  wt="$WORKTREE_ROOT/nicoflow-$name"
  mkdir -p "$wt/specs/$SLUG"
  for f in tasks progress blockers; do
    [ -f "$wt/specs/$SLUG/$f.md" ] || : > "$wt/specs/$SLUG/$f.md"
  done
done

echo
echo "ready. next:"
echo "  1. write specs/$SLUG/tasks.md in each consumer (planner pass)"
echo "  2. review them — this is the last human gate before autonomy"
echo "  3. ./scripts/run-loop.sh $SLUG <repo>"
