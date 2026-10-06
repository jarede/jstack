# Playbook: retomar

Adapted from pstack session-pickup, pause-safely (Lauren Tan, MIT).

Use for: "retoma", "continua de onde parou", taking over another agent's work.

## Steps

1. Find the trail, in this order: `git worktree list` (the trail may sit in another worktree; read its `.agentes/`), `.agentes/RETOMAR.md`, `.agentes/decisoes.tsv`, `.agentes/RELATORIO-FINAL.md`, `.agentes/jstack-<tema>.md`, `.agentes/contrato.md`, plan files in `docs/planos/`, the branch (`git log <base>..HEAD`, `git diff <base>`, `git status`), then the previous session transcript of this same project only. `<base>` is the branch the work started from: `git merge-base HEAD main` or the base named in `RETOMAR.md`.
2. For the transcript, use Claude Code `~/.claude/projects/<cwd with / and . replaced by ->/*.jsonl`, newest first, or the opencode session of this directory. Never read transcripts of other projects.
3. Rebuild the operational state: branch, worktree, what landed, open tasks, decisions. The trail is authoritative. Do not re-derive it.
4. Do not redo the design. Do not wait for approval. Proceed from the trail.
5. Compare done vs pending. Name the resume point in one sentence.
6. Recreate the task list from the original playbook steps. Mark done steps with their evidence. Continue under that playbook.
7. Verify inherited claims on the real artifact — `../biblioteca/verificacao.md`. A prior "passing" report is not proof. Re-run the proving command yourself.

## Done means

- The reply says where the previous agent stopped.
- The reply says what was inherited vs what was redone.
- The reply names the resume point and the playbook that now owns the work.
- No completed step was re-run without a reason stated.

## Pause only for

- The Always pause items in `../biblioteca/autonomia.md`.
- A production write needed only to re-check inherited state: park it and continue the rest.
