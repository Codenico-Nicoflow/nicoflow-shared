#!/bin/bash
# Gate-cheat guard.
#
# A loop that cannot pass a gate will eventually try to change the gate.
# Deleting a failing test converts a red gate into a green lie, which collapses
# the entire verification story. Editing tests is legitimate; NET REDUCTION of
# test count is what we block (harness spec Q17, tier 3).

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0

case "$FILE" in
  *_test.go|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*/e2e/*|*/__tests__/*) ;;
  *) exit 0 ;;
esac

block() {
  echo "BLOCKED (harness guardrail, tier 3): $1" >&2
  echo "File: $FILE" >&2
  echo "Tests are the gate. If a test is genuinely obsolete, record it in blockers.md for a human." >&2
  exit 2
}

# grep -c exits 1 on zero matches, so `|| echo 0` would append a second line
# and corrupt the numeric comparison. Force a single clean integer instead.
pat_for() {
  case "$1" in
    *_test.go) echo '^func (Test|Benchmark|Fuzz)[A-Z]' ;;
    *)         echo '\b(it|test)(\.[a-z]+)?[[:space:]]*\(' ;;
  esac
}

# Count OCCURRENCES, not matching lines: minified or single-line test files put
# many cases on one line, and `grep -c` would score them all as 1.
count_in_file() {
  [ -f "$1" ] || { echo 0; return; }
  local n
  n=$(grep -oE "$(pat_for "$1")" "$1" 2>/dev/null | wc -l | tr -d ' ')
  echo "${n:-0}"
}

count_in_text() {
  local n
  n=$(printf '%s' "$1" | grep -oE "$2" 2>/dev/null | wc -l | tr -d ' ')
  echo "${n:-0}"
}

PAT=$(pat_for "$FILE")
BEFORE=$(count_in_file "$FILE")

case "$TOOL" in
  Write)
    # Full overwrite of an existing test file: compare incoming content.
    if [ "$BEFORE" -gt 0 ]; then
      CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
      AFTER=$(count_in_text "$CONTENT" "$PAT")
      [ "$AFTER" -lt "$BEFORE" ] && block "test count would drop $BEFORE -> $AFTER"
    fi
    ;;
  Edit)
    OLD=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
    NEW=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
    O=$(count_in_text "$OLD" "$PAT")
    N=$(count_in_text "$NEW" "$PAT")
    [ "$N" -lt "$O" ] && block "edit removes $((O - N)) test case(s)"
    # Skipping is deletion by another name.
    echo "$NEW" | grep -qE '\b(it|test|describe)\.skip\b|t\.Skip\(' \
      && ! echo "$OLD" | grep -qE '\b(it|test|describe)\.skip\b|t\.Skip\(' \
      && block "skipping a test is deletion by another name"
    ;;
esac

exit 0
