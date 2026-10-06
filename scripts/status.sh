#!/usr/bin/env bash
# Show, per skill, whether it is installed where the manifest says, and list skills in the
# Claude Code / opencode folders that jstack does not manage yet (candidates for `just import`).
set -euo pipefail
. "$(dirname "$0")/lib.sh"

echo "Gerenciadas (skills.txt):"
while read -r skill target; do
  dest="$(target_dir "$target")/$skill"
  if is_our_link "$dest" && [ "$(readlink "$dest")" = "$JSTACK_ROOT/skills/$skill" ]; then
    state="instalada"
  elif [ -e "$dest" ]; then
    state="CONFLITO: existe uma pasta real em $dest (rode just install)"
  else
    state="NAO instalada (rode just install)"
  fi
  printf "  %-46s %-9s %s\n" "$skill" "$target" "$state"
done < <(manifest_entries)

echo
echo "Fora do jstack (pastas reais, sem link):"
found=0
for pair in "claude:$CLAUDE_DIR" "opencode:$OPENCODE_DIR"; do
  target="${pair%%:*}"; dir="${pair#*:}"
  [ -d "$dir" ] || continue
  for entry in "$dir"/*; do
    [ -f "$entry/SKILL.md" ] || continue
    is_our_link "$entry" && continue
    [ -L "$entry" ] && continue
    printf "  %-46s %-9s just import %s %s\n" "$(basename "$entry")" "$target" "$(basename "$entry")" "$target"
    found=1
  done
done
[ $found = 1 ] || echo "  (nenhuma)"
