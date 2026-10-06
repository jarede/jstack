#!/usr/bin/env bash
# Install/uninstall against a temporary HOME. Exits non-zero on the first failed assertion.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
export HOME="$(mktemp -d)"
C="$HOME/.claude/skills"; K="$HOME/.config/opencode/commands"
fail() { echo "FAIL: $*"; exit 1; }

# A real folder and a stale link with an old (renamed) name must be handled.
mkdir -p "$C" "$K"
first_old="$(sed -e 's/#.*//' -e '/^[[:space:]]*$/d' "$REPO/renomeadas.txt" | awk 'NR==1{print $1}')"
if [ -n "$first_old" ]; then
  ln -s "$REPO/skills/$first_old" "$C/$first_old"      # dangling link into the repo
fi
mkdir -p "$C/orquestra"; echo x > "$C/orquestra/SKILL.md"  # real folder in the way

bash "$REPO/scripts/install.sh" >/dev/null
bash "$REPO/scripts/install.sh" >/dev/null                 # idempotent

[ -L "$C/orquestra" ] || fail "orquestra should be a link"
ls "$HOME"/.jstack-backup/*/claude/orquestra/SKILL.md >/dev/null 2>&1 || fail "real folder not backed up"
if [ -n "$first_old" ] && { [ -e "$C/$first_old" ] || [ -L "$C/$first_old" ]; }; then
  fail "old link $first_old not removed"
fi
for f in "$REPO"/commands/opencode/*.md; do
  [ -e "$f" ] || continue
  [ -L "$K/$(basename "$f")" ] || fail "command $(basename "$f") not linked"
done

bash "$REPO/scripts/uninstall.sh" >/dev/null
[ ! -L "$C/orquestra" ] || fail "uninstall left orquestra"
echo "test_install: ok"
