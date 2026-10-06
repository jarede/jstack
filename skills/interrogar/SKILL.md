---
name: interrogar
description: Use when the user asks to "interrogate", stress-test, tear apart, or get an adversarial / multi-model / second-opinion review of a diff, branch or set of files - especially before a final review or merge of work delegated to opencode2 agents, or when a single reviewer's verdict is not enough.
---

# Interrogar

## Overview

Several reviewers from **different model families** review the same change with the **same
prompt**; you (Claude) are the lead who filters their findings into a verdict. The adversarial
signal comes from model diversity, not from assigned personas — so every reviewer gets the
identical brief.

Claude Code subagents can only run Claude models, so diversity comes from `opencode2`: 2–3
opencode2 reviewers on different providers plus one Claude subagent. **The deliverable is a
verdict. Do not apply any change** unless the user asks after reading it.

Adapted from `interrogate` in pstack by Lauren Tan (MIT).

## When Not to Use

- No code yet — reviewing an abstract plan makes reviewers invent risks that never happen. Review
  the plan by building a prototype first.
- A one-line change: `/code-review` is enough.

## Steps

**1. Scope.** `mkdir -p .agentes/interrogate` (and make sure `.agentes/` is in
`.git/info/exclude`). Review whatever the user pointed at; otherwise the branch against its base —
`git symbolic-ref --short refs/remotes/origin/HEAD` gives the default branch; ask if the branch
was cut from something else. Uncommitted changes count too:
`git diff <base>...HEAD > .agentes/interrogate/diff.patch; git diff HEAD >> .agentes/interrogate/diff.patch`.
Record the files touched, and `git status --porcelain > .agentes/interrogate/status-before.txt`.

**2. Intent.** One paragraph: what the change is meant to do, from the user's words, commit
messages, PR description and the code. Unsure → ask the user before spawning anything. If the
intent is a **faithful port**, say so explicitly — it changes what counts as a finding — and put
the source in `.agentes/interrogate/fonte/` (e.g. the procedure text via the SQLcl MCP). The
opencode2 reviewers run with MCPs disabled and cannot reach the database themselves.

**3. Models.** Read the roles **`interrogar revisores`** (a list, one opencode2 reviewer per
entry) and **`interrogar claude`** (the Claude subagent's model; `inherit` = the session's model)
as described in [../jstack/biblioteca/modelos.md](../jstack/biblioteca/modelos.md). Confirm each
id is still in `opencode2 models`. Models the user names in the request win for this run; a missing
file, role or id → ask once with the listed ids and suggest `/jstack-setup`. Never pick a model
yourself. Ask whether the user wants to watch. The Claude reviewer is always added, so
**N = opencode2 reviewers + 1**.

**4. Brief.** Build `.agentes/interrogate/brief.md` from
[references/reviewer-prompt.md](references/reviewer-prompt.md), pasting in the intent, the path to
`diff.patch`, and the full text of [references/rubric.md](references/rubric.md). Each reviewer
writes **only** its own file `.agentes/interrogate/review-<label>.md`; the brief forbids every
other write.

**5. Launch, all at once.**
- opencode2 reviewers: prepare `opencode.json` with global MCPs disabled (commands in
  orquestra/mechanics.md, "Prepare the Environment"), then one
  per model:
  `opencode2 run --auto -m <model> "Leia e siga integralmente as instrucoes em <abs>/.agentes/interrogate/brief.md. Seu rotulo e <label>."`
  User wants to watch → one pane (herdr) or Terminal tab (desktop) each, per
  **REQUIRED SUB-SKILL:** orchestrating-herdr-agents. Otherwise background processes with a log each.
- Claude reviewer: Agent tool, `subagent_type: general-purpose`, `run_in_background: true`,
  `model` from the `interrogar claude` role (omit it for `inherit`),
  prompt = "Read and follow <abs>/.agentes/interrogate/brief.md. Your label is claude." It writes
  its own `review-claude.md`, like the others.

**6. Wait** on the files, bounded, in a background Bash call, then end the turn:
`sh -c 'fim=$(( $(date +%s) + 30*60 )); until [ $(grep -l "^FIM$" <abs>/.agentes/interrogate/review-*.md 2>/dev/null | wc -l) -ge <N> ] || [ $(date +%s) -gt $fim ]; do sleep 20; done'`
— each review ends with a line `FIM`, so a half-written file does not count.
A reviewer missing at the deadline is dropped and named in the verdict — continue with N-1.

**7. Check nothing was written.** `git status --porcelain` must match `status-before.txt` apart
from `.agentes/`. A reviewer that edited code is reported, and its edits are reverted only with the
user's OK.

**8. Synthesize and judge.** Read every review in full, then apply
[references/lead-judgment.md](references/lead-judgment.md): merge duplicates (noting which models
raised each), weight consensus, trace each "could be None" to a real call site, and sort every
finding into **Act on / Consider / Noted / Dismissed**. Output the verdict in the format given
there, in the user's language.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Giving each model a persona ("you are the security reviewer") | Same prompt for all; diversity is the model |
| Aggregating instead of judging | You have context they lack — dismiss "I'd do it differently" and hypotheticals, with a reason |
| Hiding dismissed findings | List them; it is how the user can overrule you |
| More than 5 items in Act on | You are not filtering hard enough |
| Auto-applying fixes | Verdict only; the user decides |
| Waiting forever on one slow model | Bounded wait; drop and name it |
