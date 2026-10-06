---
name: arena
description: Use when the user says "arena", asks for several competing attempts at the same task, or when one attempt at a non-trivial piece of code or design would lock in the wrong shape - e.g. a task whose structure is open, where a cheap opencode2 implementer has failed or diverged, or where two approaches look equally plausible.
---

# Arena

## Overview

N cheap opencode2 implementers attempt **the same task** in isolated git worktrees. You read every
candidate end to end, pick one as the base, and graft the best one or two ideas from the others
into it by hand. A cross-judge from another model family scores them independently so your pick
is checked.

Use it for tasks whose *shape* is open. A mechanical task with a known answer gets one implementer
(orquestra), not an arena.

Adapted from `arena` in pstack by Lauren Tan (MIT).

## Phase A — Frame

1. **The task** — one brief, `.agentes/arena/<slug>/tarefa.md`, using the brief contract from
   orquestra: the brief is the contract. Each candidate gets a
   thin wrapper `tarefa-<n>.md`: "you are candidate n, your worktree is <path>, write your report
   to <abs>/.agentes/arena/<slug>/relatorio-<n>.md, then follow tarefa.md". Record the base commit:
   `git rev-parse HEAD > .agentes/arena/<slug>/base-sha`.
2. **The rubric** — 3–6 concrete, gradeable criteria for *this* task (e.g. "output identical to
   golden file", "no new query against the source table", "one public function"). Write it to
   `$TMPDIR/arena-<slug>/rubrica.md`, **outside the repo** — candidates run with `--auto` and can
   read anything under `.agentes/`. Candidates never see the rubric; only the judge does.
3. **The models** — run `opencode2 models` and ask the user, in one question, for N (2–3), the
   runner models and the judge model (a family none of the runners use). Different models for
   design-sensitive work; the same model N times when the work is generation-bound.
4. **Isolation** — one worktree per candidate, never two candidates in one tree:
   ```bash
   git worktree add -b arena/<slug>-1 ../<repo>-arena-<slug>-1 HEAD
   cp opencode.json ../<repo>-arena-<slug>-1/      # excluded from git, so a new worktree lacks it
   ```
   Without the copied `opencode.json` every request fails with `name must be at most 64 characters`.
   Untracked things the tests need (`.venv`, `.env`, local config) are not in a new worktree either:
   symlink them in, and run the test suite once in each worktree before launching.
   `.agentes/` stays in the main tree: briefs and reports use absolute paths.

## Phase B — Fan out

Launch all N at once, one per worktree (cwd = the worktree), using
**REQUIRED SUB-SKILL:** orchestrating-herdr-agents (herdr pane, desktop Terminal tab, or
background process with a log). Each candidate commits in its own worktree and writes
`.agentes/arena/<slug>/relatorio-<n>.md`, which must include a **rationale: the alternatives it
considered and what it rejected**. Tell candidates: *"Do not hedge against other possible
solutions — commit to the one you think is best."*

Wait on the report files with a bounded background loop. A candidate missing at the deadline is
dropped; continue with N-1 and record it.

## Phase C — Cross-judge

After **all** candidates finish (never while they are still writing), launch the opencode2 judge
the user chose. It reads the rubric and each candidate by worktree path
(`git -C <wt> diff $(cat <abs>/.agentes/arena/<slug>/base-sha)..HEAD`), scores every criterion per
candidate, recommends a base, and writes `.agentes/arena/<slug>/juiz.md`. It writes nothing else.

## Phase D — Pick the base

While the judge runs, read every candidate end to end yourself and score each rubric criterion —
criterion by criterion, not by overall feel. Then compare with the judge:

- Same base → confirmed.
- Different base → one of you is biased or the rubric is ambiguous. Reread both rationales before
  deciding.
- Tie → the one a future maintainer can extend without breaking invariants; the smaller API.

## Phase E — Graft

Walk each losing candidate once more for what is worth taking — usually one or two things, not
most of it. Bring the base onto the working branch (`git cherry-pick <base-sha>..arena/<slug>-<n>`
on the feature branch), then fold each graft in **by hand** so the result stays coherent under one
mental model; never paste mechanically. Grafting is design judgement, so the engineer does it —
the one place in these skills where you write the code yourself.

- All candidates converged on the same shape → strong signal; ship the consensus, no graft.
- Candidates diverged wildly → the brief was under-specified. **Reframe and re-run; do not average
  the divergence.**

## Phase F — Verify and clean up

Verify the synthesized result like any delivery (orquestra,
reviewing.md). A problem the arena did not catch means either the frame was wrong (re-run) or a
candidate caught it and you missed the graft (back to E).

Write `.agentes/arena/<slug>/sintese.md`: base and why, the judge's verdict, each graft with its
source candidate, what was rejected and why, dropouts, verification result.

Then `git worktree remove ../<repo>-arena-<slug>-<n>` for every candidate. Delete the
`arena/<slug>-*` branches only with the user's OK — they are the only copy of the losing
attempts.
