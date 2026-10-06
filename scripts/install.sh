#!/usr/bin/env bash
# Link every skill in skills.txt into the folder of its target (Claude Code or opencode).
#
# - Idempotent: a link that already points here is left alone.
# - A real folder with the same name is moved to ~/.jstack-backup/<timestamp>/ first, never deleted.
# - A link that moved to the other target (claude <-> opencode) is removed from the old one.
# Usage: scripts/install.sh [--dry-run]
set -euo pipefail
. "$(dirname "$0")/lib.sh"

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
run() { if [ $DRY = 1 ]; then echo "  (dry-run) $*"; else "$@"; fi; }

STAMP="$(date +%Y%m%d-%H%M%S)"
status=0

# Remove links of ours that still use a skill's old name.
while read -r old new; do
  for dir in "$CLAUDE_DIR" "$OPENCODE_DIR"; do
    if is_our_link "$dir/$old"; then
      echo "rm    $old (renomeada para $new)"
      run rm "$dir/$old"
    elif [ -e "$dir/$old" ] || [ -L "$dir/$old" ]; then
      backup="$BACKUP_ROOT/$STAMP/renomeadas"
      echo "bkp   $old (renomeada para $new) -> $backup/"
      run mkdir -p "$backup"
      run mv "$dir/$old" "$backup/"
    fi
  done
done < <(renamed_entries)

while read -r skill target; do
  src="$JSTACK_ROOT/skills/$skill"
  if [ ! -f "$src/SKILL.md" ]; then
    echo "ERRO  $skill: skills/$skill/SKILL.md nao existe" >&2
    status=1
    continue
  fi
  dir="$(target_dir "$target")" || { status=1; continue; }
  dest="$dir/$skill"
  run mkdir -p "$dir"

  # Remove a stale link of ours from the other target.
  for other in claude opencode; do
    [ "$other" = "$target" ] && continue
    old="$(target_dir "$other")/$skill"
    if is_our_link "$old"; then
      echo "move  $skill: removendo link antigo em $old"
      run rm "$old"
    fi
  done

  if is_our_link "$dest" && [ "$(readlink "$dest")" = "$src" ]; then
    echo "ok    $skill -> $target"
    continue
  fi
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    backup="$BACKUP_ROOT/$STAMP/$target"
    echo "bkp   $skill: $dest -> $backup/"
    run mkdir -p "$backup"
    run mv "$dest" "$backup/"
  fi
  echo "link  $skill -> $dest"
  run ln -s "$src" "$dest"
done < <(manifest_entries)

# opencode commands (commands/opencode/*.md), same backup rule as skills.
if [ -d "$JSTACK_ROOT/commands/opencode" ]; then
  run mkdir -p "$OPENCODE_COMMANDS_DIR"
  for src in "$JSTACK_ROOT"/commands/opencode/*.md; do
    [ -e "$src" ] || continue
    dest="$OPENCODE_COMMANDS_DIR/$(basename "$src")"
    if is_our_link "$dest" && [ "$(readlink "$dest")" = "$src" ]; then
      echo "ok    comando $(basename "$src")"
      continue
    fi
    if [ -e "$dest" ] || [ -L "$dest" ]; then
      backup="$BACKUP_ROOT/$STAMP/commands"
      echo "bkp   comando $(basename "$src") -> $backup/"
      run mkdir -p "$backup"
      run mv "$dest" "$backup/"
    fi
    echo "link  comando $(basename "$src") -> $dest"
    run ln -s "$src" "$dest"
  done
fi

exit $status
