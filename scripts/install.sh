#!/usr/bin/env bash
# Link jstack into one agent: Claude Code or opencode.
#
#   scripts/install.sh claude [--dry-run | --uninstall]
#     skills/<id>/            -> ~/.claude/skills/<id>
#     agents/claude/<a>.md    -> ~/.claude/agents/<a>.md
#
#   scripts/install.sh opencode [--dry-run | --uninstall]
#     skills/<id>/            -> ~/.config/opencode/skills/<id>
#     agents/opencode/<a>.md  -> ~/.config/opencode/agents/<a>.md
#     build/commands/<id>.md  -> ~/.config/opencode/commands/<id>.md  (generated: /<id>)
#
# Idempotent. Every link that points into this repository is ours: stale ones are removed,
# current ones are left alone. A real file or folder in the way is moved to
# ~/.jstack-backup/<timestamp>/, never deleted. The other agent's links are untouched.
#
# Usage: scripts/install.sh <claude|opencode> [--dry-run | --uninstall]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
CLAUDE_SKILLS="$HOME/.claude/skills"
CLAUDE_AGENTS="$HOME/.claude/agents"
OPENCODE_SKILLS="$HOME/.config/opencode/skills"
OPENCODE_AGENTS="$HOME/.config/opencode/agents"
OPENCODE_COMMANDS="$HOME/.config/opencode/commands"
BACKUP="$HOME/.jstack-backup/$(date +%Y%m%d-%H%M%S)"

usage() {
  echo "usage: $0 <claude|opencode> [--dry-run | --uninstall]" >&2
  exit 2
}

AGENT="${1:-}"
[ -n "$AGENT" ] || usage
shift

case "$AGENT" in
  claude) ;;
  opencode) ;;
  *) usage ;;
esac

MODE=install
case "${1:-}" in
  --dry-run) MODE=dry ;;
  --uninstall) MODE=uninstall ;;
  "") ;;
  *) usage ;;
esac
[ "$#" -le 1 ] || usage

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

case "$AGENT" in
  claude)
    SKILLS_DIR="$CLAUDE_SKILLS"
    AGENTS_DIR="$CLAUDE_AGENTS"
    AGENTS_SRC="$ROOT/agents/claude"
    ;;
  opencode)
    SKILLS_DIR="$OPENCODE_SKILLS"
    AGENTS_DIR="$OPENCODE_AGENTS"
    AGENTS_SRC="$ROOT/agents/opencode"
    ;;
esac

skills=() agents=() commands=()
for d in "$ROOT"/skills/*/; do skills+=("${d%/}"); done
for f in "$AGENTS_SRC"/*.md; do agents+=("$f"); done

# opencode has no slash command for a skill, so each user-facing skill gets a thin command.
# Principles are routed through /jstack, never typed.
if [ "$AGENT" = opencode ] && [ "$MODE" != uninstall ]; then
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
Load the \`$id\` skill with the skill tool (id \`$id\`) and follow it for the request below. If the tool refuses, read \`~/.config/opencode/skills/$id/SKILL.md\` and follow it. Paths inside the skill are relative to that folder.

Request: \$ARGUMENTS
EOF
  done
fi

prune "$SKILLS_DIR" "${skills[@]}"
prune "$AGENTS_DIR" "${agents[@]}"
if [ "$AGENT" = opencode ]; then
  prune "$OPENCODE_COMMANDS" "${commands[@]+"${commands[@]}"}"
fi

if [ "$MODE" = uninstall ]; then
  [ "$AGENT" = opencode ] && run rm -rf "$ROOT/build"
  exit 0
fi

for d in "${skills[@]}"; do link "$d" "$SKILLS_DIR/$(basename "$d")"; done
for f in "${agents[@]}"; do link "$f" "$AGENTS_DIR/$(basename "$f")"; done
if [ "$AGENT" = opencode ]; then
  for f in "${commands[@]}"; do link "$f" "$OPENCODE_COMMANDS/$(basename "$f")"; done
fi

echo "Done. Start a new $([ "$AGENT" = claude ] && echo 'Claude Code' || echo 'opencode') session to load the changes."
