# Finishing

**Every playbook ends by delivering a reviewable branch. Merging into a shared branch pauses for
the user (`autonomia.md`, Always pause).**

Adapted from superpowers `finishing-a-development-branch` (Jesse Vincent, MIT) and pstack
`opening-a-pr` (Lauren Tan, MIT).

## Verify

Run the project's full checks (tests, lint, the task's check scripts) and paste the result. Red
means it is not finished: fix or report. Do not offer options on a red branch.

## Commits

1. Rebase only commits that were never pushed into small ordered commits. Once a commit is pushed, add new commits instead of rewriting it: a force-push is an Always pause item.
2. Titles use Conventional Commits `type(scope): assunto`. Imperative subject, no final period.

| Type | Use for |
|---|---|
| feat | A new behaviour |
| fix | A bug fix |
| docs | Docs only |
| refactor | A change that keeps behaviour |
| test | Tests only |
| chore | Tooling, config, chores |
| perf | A measured speed-up |

## Deliver

1. Default, no question: push the work branch. Push and open a ready PR or MR with `gh` or
   `glab`, whichever the remote uses; never a draft. Post the URL.
2. No remote: keep the branch and say so.
3. Opening a PR does not start babysitting. Keep building or stop; return only when the user asks.

## Only on request

Merge, landing, or discarding happen only when the user asks. Discarding needs an explicit
confirmation typed by the user; it cannot be undone.

## PR body

Write it as a briefing for a reviewer who did not watch the work. Under a minute to read. No
SHAs, no file-by-file lists. Use these sections, in order; drop one when it has nothing to say:

- `## Por quê` — the problem or the request, with the ticket or issue reference.
- `## O que mudou` — two or three lines on what changed.
- `## Escopo` — what it covers and what it leaves out.
- `## Trade-offs` — only rejected alternatives a reviewer would ask about.
- `## Raio de impacto` — who or what it touches, and why that is safe or risky.
- `## Verificação` — 1 to 3 bullets, each a real command and its result; perf as one number
  `antes → depois`.

## Clean up

1. Close tabs, panes and scratch files you opened.
2. Remove a worktree only after its branch is pushed.
3. Keep `.agentes/` reports.
