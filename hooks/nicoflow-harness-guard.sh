#!/bin/bash
# Nicoflow harness guardrails.
#
# Under headless Ralph loops (`claude -p --dangerously-skip-permissions`) the
# permission system is off, so this hook is the ONLY thing standing between the
# loop and an irreversible mistake. Tiers per harness spec Q17.
#
# Contract: JSON on stdin, exit 2 + stderr to block, exit 0 to allow.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$COMMAND" ] && exit 0

block() {
  echo "BLOCKED (harness guardrail, tier $1): $2" >&2
  echo "Command: $COMMAND" >&2
  exit 2
}

# Strip quoted strings so an echo/commit-message mentioning a pattern doesn't
# trip the guard. We only want to match real command invocations.
SCAN=$(echo "$COMMAND" | sed "s/'[^']*'//g; s/\"[^\"]*\"//g")

# ---------------------------------------------------------------- tier 1
# Destructive and irreversible. Never allowed, no exceptions.
declare -a T1=(
  'git[[:space:]]+push[[:space:]]+.*--force'
  'git[[:space:]]+push[[:space:]]+.*-f([[:space:]]|$)'
  'git[[:space:]]+reset[[:space:]]+--hard'
  'git[[:space:]]+clean[[:space:]]+-[a-z]*f'
  'git[[:space:]]+branch[[:space:]]+-D'
  'git[[:space:]]+rebase'
  'git[[:space:]]+checkout[[:space:]]+\.'
  'git[[:space:]]+restore[[:space:]]+\.'
  'git[[:space:]]+filter-branch'
  'git[[:space:]]+reflog[[:space:]]+delete'
  'rm[[:space:]]+-[a-z]*r[a-z]*f'
)
for p in "${T1[@]}"; do
  echo "$SCAN" | grep -qE "$p" && block 1 "destructive/irreversible operation"
done

# ---------------------------------------------------------------- tier 2
# Wrong-place writes. Commit/push must happen on a feature branch.
if echo "$SCAN" | grep -qE 'git[[:space:]]+(commit|push)'; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  case "$BRANCH" in
    main|master|staging)
      block 2 "cannot commit/push on protected branch '$BRANCH'. Branch first." ;;
  esac
fi

# Explicit push to a protected branch, regardless of current HEAD.
echo "$SCAN" | grep -qE 'git[[:space:]]+push[[:space:]]+[^[:space:]]+[[:space:]]+(main|master|staging)([[:space:]]|$)' \
  && block 2 "explicit push to a protected branch"

# Mid-loop branch switching invalidates the loop's working assumptions.
echo "$SCAN" | grep -qE 'git[[:space:]]+(checkout|switch)[[:space:]]+(-[bB][[:space:]]+)?[a-zA-Z]' \
  && [ -n "$NICOFLOW_LOOP_ACTIVE" ] \
  && block 2 "branch switching is not allowed inside a loop iteration"

# ---------------------------------------------------------------- tier 3
# Loop discipline. Publishing belongs to the exit gate, never the inner loop.
if [ -n "$NICOFLOW_LOOP_ACTIVE" ]; then
  echo "$SCAN" | grep -qE '(pnpm|npm|npx|yarn)[[:space:]]+.*changeset' \
    && block 3 "changeset belongs to the exit gate, not the inner loop"
  echo "$SCAN" | grep -qE '(pnpm|npm|yarn)[[:space:]]+publish' \
    && block 3 "publish belongs to the exit gate, not the inner loop"
fi

# ---------------------------------------------------------------- tier 4
# Outward-facing. A headless loop must never open PRs or deploy.
declare -a T4=(
  'gh[[:space:]]+pr[[:space:]]+(create|merge|close|ready)'
  'gh[[:space:]]+release[[:space:]]+create'
  'vercel[[:space:]]+(deploy|--prod)'
  'render[[:space:]]+deploy'
  'eas[[:space:]]+(build|submit)'
)
for p in "${T4[@]}"; do
  echo "$SCAN" | grep -qE "$p" && block 4 "outward-facing action requires a human"
done

exit 0
