# Shared helpers for the jstack scripts. Sourced, not executed. bash 3.2 compatible (macOS).

JSTACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$JSTACK_ROOT/skills.txt"
CLAUDE_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
OPENCODE_DIR="${OPENCODE_SKILLS_DIR:-$HOME/.config/opencode/skills}"
BACKUP_ROOT="${JSTACK_BACKUP_DIR:-$HOME/.jstack-backup}"

# Prints "<skill> <target>" for each manifest line, without comments or blank lines.
manifest_entries() {
  sed -e 's/#.*//' -e '/^[[:space:]]*$/d' "$MANIFEST" | awk '{print $1, $2}'
}

target_dir() {
  case "$1" in
    claude) echo "$CLAUDE_DIR" ;;
    opencode) echo "$OPENCODE_DIR" ;;
    *) echo "alvo desconhecido: $1" >&2; return 1 ;;
  esac
}

# True when $1 is a symlink that points inside this repository.
is_our_link() {
  [ -L "$1" ] || return 1
  case "$(readlink "$1")" in
    "$JSTACK_ROOT"/*) return 0 ;;
    *) return 1 ;;
  esac
}
