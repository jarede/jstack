#!/usr/bin/env bash
# Remove every link that points into this repository from the Claude Code and opencode folders.
# Only symlinks to jstack are touched; real folders are never removed.
# Usage: scripts/uninstall.sh [--dry-run]
set -euo pipefail
. "$(dirname "$0")/lib.sh"

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

for dir in "$CLAUDE_DIR" "$OPENCODE_DIR" "$OPENCODE_COMMANDS_DIR"; do
  [ -d "$dir" ] || continue
  for entry in "$dir"/*; do
    if is_our_link "$entry"; then
      echo "rm    $entry"
      [ $DRY = 1 ] || rm "$entry"
    fi
  done
done
