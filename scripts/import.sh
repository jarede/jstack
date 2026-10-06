#!/usr/bin/env bash
# Bring a skill that was created directly in ~/.claude/skills or ~/.config/opencode/skills
# under jstack: copy it into skills/, add it to skills.txt, then install (which backs up the
# original folder and replaces it with a link).
# Usage: scripts/import.sh <skill> <claude|opencode>
set -euo pipefail
. "$(dirname "$0")/lib.sh"

skill="${1:?uso: scripts/import.sh <skill> <claude|opencode>}"
target="${2:?uso: scripts/import.sh <skill> <claude|opencode>}"
src="$(target_dir "$target")/$skill"

[ -f "$src/SKILL.md" ] || { echo "nao encontrei $src/SKILL.md" >&2; exit 1; }
is_our_link "$src" && { echo "$skill ja e gerenciada pelo jstack" >&2; exit 1; }
[ -e "$JSTACK_ROOT/skills/$skill" ] && { echo "skills/$skill ja existe no repositorio" >&2; exit 1; }

cp -R "$src" "$JSTACK_ROOT/skills/$skill"
find "$JSTACK_ROOT/skills/$skill" \( -name .DS_Store -o -name __pycache__ \) -prune -exec rm -rf {} +
printf '%-44s %s\n' "$skill" "$target" >> "$MANIFEST"
echo "copiada para skills/$skill e adicionada ao skills.txt"

"$JSTACK_ROOT/scripts/install.sh"
echo
echo "Proximo passo: just check && git add -A && git commit -m \"add $skill\""
