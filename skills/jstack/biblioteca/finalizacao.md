# Finishing

**Never merge, push, open a PR or delete a branch without the user choosing it.**

Adapted from superpowers `finishing-a-development-branch` (Jesse Vincent, MIT) and pstack
`opening-a-pr` (Lauren Tan, MIT).

## Verify

Run the project's full checks (tests, lint, the task's check scripts) and paste the result
(`verificacao.md`, the gate). Red → it is not finished; fix or report. Do not offer options on a
red branch.

## Options

Find the base branch (`git merge-base`, or the branch the work started from) and present exactly:

1. **Merge locally** into `<base>`.
2. **Push and open a PR / MR** (GitHub `gh`, GitLab `glab` — use what the repo uses).
3. **Keep the branch** as it is, for later.
4. **Discard** the work — only after the user types an explicit confirmation, because it cannot be
   undone.

Wait for the choice. Execute only that one.

## PR body

Write it as a briefing for someone who did not watch the work:

- **O que mudou** — in two or three lines.
- **Por quê** — the problem or the request, with the ticket or issue reference.
- **Como foi verificado** — the commands and their results, golden-output diffs, reproduction
  before/after.
- **Riscos** — what could break, and where to look first.
- **Desvios do plano** — what was done differently and why.

A verdict is tied to the commit it reviewed: if the branch moves after review, say so.

## Clean up

After the choice is done: remove the worktrees created for this work (`git worktree remove`),
close terminal tabs or panes you opened, and remove scratch files you created. Keep `.agentes/`
reports until the user no longer needs them. Never clean up before the choice.
