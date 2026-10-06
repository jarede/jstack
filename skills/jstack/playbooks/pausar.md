# Playbook: pausar

Adapted from pstack pause-safely (Lauren Tan, MIT).

Use for: "para agora", "vou desligar", context near its limit, or `longa.md` stopping. Use it alone or from `longa.md`.

## Steps

1. Stop at a safe boundary. Start nothing new. Stop the agents you launched for this task: kill their `opencode2 run` processes, close tabs or panes you opened.
2. Push nothing and open no PR only to pause. Exception: the branch was already published, then push the wip.
3. Write `.agentes/RETOMAR.md` with: intent, what you were doing, progress and what is verified, current state, next steps, key files, gotchas. Point to `decisoes.tsv` instead of copying it. `.agentes/` is not versioned; the file stays in this worktree. Name the worktree path in the commit body.
4. Commit everything as one `wip: <estado>` commit on the work branch. If the tree is broken, say so in the commit body. Never commit on `main`: create the work branch first. Do not commit secrets or stray files: list `git status --short` and add only the work files.
5. Reply with: where you stopped, what is on disk vs only in your head, the commit, and the first action on resume (`/jstack retoma`).

## Done means

- The `wip: <estado>` commit exists and the tree state is described.
- `.agentes/RETOMAR.md` has all fields from step 4.
- The reply says where you stopped and the first action on resume.

## Pause only for

- The Always pause items in `../biblioteca/autonomia.md`.
- A broken tree that blocks even the wip commit: describe it and commit anyway.
