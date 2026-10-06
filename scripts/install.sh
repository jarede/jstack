#!/usr/bin/env bash
# Link jstack into Claude Code and opencode.
#
#   skills/<id>/            -> ~/.claude/skills/<id>          (opencode reads this folder too)
#   agents/claude/<a>.md    -> ~/.claude/agents/<a>.md
#   agents/opencode/<a>.md  -> ~/.config/opencode/agents/<a>.md
#   build/commands/<id>.md  -> ~/.config/opencode/commands/<id>.md  (generated: /<id> in opencode)
#
# Idempotent. Every link that points into this repository is ours: stale ones are removed,
# current ones are left alone. A real file or folder in the way is moved to
# ~/.jstack-backup/<timestamp>/, never deleted.
#
# Usage: scripts/install.sh [--dry-run | --uninstall]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
CLAUDE_SKILLS="$HOME/.claude/skills"
CLAUDE_AGENTS="$HOME/.claude/agents"
OPENCODE_AGENTS="$HOME/.config/opencode/agents"
OPENCODE_COMMANDS="$HOME/.config/opencode/commands"
OPENCODE_SKILLS="$HOME/.config/opencode/skills"
BACKUP="$HOME/.jstack-backup/$(date +%Y%m%d-%H%M%S)"

MODE=install
case "${1:-}" in
  --dry-run) MODE=dry ;;
  --uninstall) MODE=uninstall ;;
  "") ;;
  *) echo "usage: $0 [--dry-run | --uninstall]" >&2; exit 2 ;;
esac

run() { if [ "$MODE" = dry ]; then echo "  (dry-run) $*"; else "$@"; fi; }

ours() { [ -L "$1" ] && case "$(readlink "$1")" in "$ROOT"/*) return 0 ;; esac; return 1; }

# Remove our links in a folder whose target is gone or is not in the wanted set.
prune() {
  local dir="$1"; shift
  [ -d "$dir" ] || return 0
  local entry target keep
  for entry in "$dir"/* "$dir"/.[!.]*; do
    ours "$entry" || continue
    target="$(readlink "$entry")"
    keep=0
    if [ "$MODE" != uninstall ] && [ -e "$target" ]; then
      for wanted in "$@"; do [ "$wanted" = "$target" ] && keep=1; done
    fi
    if [ "$keep" = 0 ]; then
      echo "rm    $entry"
      run rm "$entry"
    fi
  done
}

link() {
  local src="$1" dest="$2"
  run mkdir -p "$(dirname "$dest")"
  if ours "$dest" && [ "$(readlink "$dest")" = "$src" ]; then
    echo "ok    $dest"
    return
  fi
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    echo "bkp   $dest -> $BACKUP/"
    run mkdir -p "$BACKUP"
    run mv "$dest" "$BACKUP/"
  fi
  echo "link  $dest"
  run ln -s "$src" "$dest"
}

frontmatter() { awk -v key="$2" 'NR==1 && $0!="---"{exit} NR>1 && $0=="---"{exit} NR>1 && index($0, key": ")==1 {sub(key": ", ""); print; exit}' "$1"; }

skills=() claude_agents=() opencode_agents=() commands=()
for d in "$ROOT"/skills/*/; do skills+=("${d%/}"); done
for f in "$ROOT"/agents/claude/*.md; do claude_agents+=("$f"); done
for f in "$ROOT"/agents/opencode/*.md; do opencode_agents+=("$f"); done

# opencode has no slash command for a skill, so each user-facing skill gets a thin command.
# Principles are routed through /jstack, never typed.
if [ "$MODE" != uninstall ]; then
  run mkdir -p "$ROOT/build/commands"
  for d in "${skills[@]}"; do
    id="$(basename "$d")"
    case "$id" in principle-*) continue ;; esac
    desc="$(frontmatter "$d/SKILL.md" description | cut -c1-200 | sed 's/"/\\"/g')"
    cmd="$ROOT/build/commands/$id.md"
    commands+=("$cmd")
    [ "$MODE" = dry ] && continue
    cat > "$cmd" <<EOF
---
description: "$desc"
---
Load the \`$id\` skill with the skill tool (id \`$id\`) and follow it for the request below. If the tool refuses, read \`~/.claude/skills/$id/SKILL.md\` and follow it. Paths inside the skill are relative to that folder.

Request: \$ARGUMENTS
EOF
  done
fi

prune "$CLAUDE_SKILLS" "${skills[@]}"
prune "$OPENCODE_SKILLS"
prune "$CLAUDE_AGENTS" "${claude_agents[@]}"
prune "$OPENCODE_AGENTS" "${opencode_agents[@]}"
prune "$OPENCODE_COMMANDS" "${commands[@]+"${commands[@]}"}"

if [ "$MODE" = uninstall ]; then
  run rm -rf "$ROOT/build"
  exit 0
fi

for d in "${skills[@]}"; do link "$d" "$CLAUDE_SKILLS/$(basename "$d")"; done
for f in "${claude_agents[@]}"; do link "$f" "$CLAUDE_AGENTS/$(basename "$f")"; done
for f in "${opencode_agents[@]}"; do link "$f" "$OPENCODE_AGENTS/$(basename "$f")"; done
for f in "${commands[@]}"; do link "$f" "$OPENCODE_COMMANDS/$(basename "$f")"; done

echo "Done. Start a new Claude Code or opencode session to load the changes."
