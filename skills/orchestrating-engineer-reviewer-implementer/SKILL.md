---
name: orchestrating-engineer-reviewer-implementer
description: Use when an implementation plan already exists and the work will be executed by CLI coding agents (opencode2, codex, claude, gemini) instead of by you directly - especially when the plan has many tasks, when you are choosing which model does what, or when a delegated agent reports success and you have to decide whether to believe it.
---

# Orchestrating Engineer, Reviewer and Implementer

## Overview

Three roles, not two. The tier that people skip — the **reviewer** — is the one that pays for itself: in the session this skill came from, a mid-tier reviewer agent caught seven defects in the plan the engineer had written, before any of them reached the final review.

**The engineer who reviews every task personally becomes the bottleneck, and reviews worse because they are also the author.**

| Role | Owns | Never does |
|---|---|---|
| **Engineer** (you) | Spec, plan, model choice, environment prep, final review, and any fix that needs domain judgement | Implement the tasks |
| **Reviewer** (mid-tier agent) | Writes each task's brief, dispatches implementers, **waits for every delivery**, verifies them first-hand, sends work back, records what it found | Implement; change the plan to make a task close; **exit at dispatch** |
| **Implementer** (cheap agent, one per task) | Executes exactly one task and reports with literal command output | Decide scope; skip verification |

Prerequisite: a written plan with numbered, independently verifiable tasks. Get one from
superpowers:brainstorming and superpowers:writing-plans first.

## When to Use

- A plan with more than ~4 tasks and CLI agents available
- Porting or migrating code, where fidelity to a source matters more than invention
- Any time you catch yourself about to implement a 15-task plan by hand

**Not for:** a single task, exploratory work with no plan yet, or anything where you cannot state a
pass/fail verification command.

## Cheap Models Implement Fine — Under Two Conditions

The instinct to reserve implementation for an expensive model is wrong, and expensive. A free
model completed eighteen consecutive tasks correctly when — and only when — both held:

1. **The brief named the specific traps of that task**, not general advice.
2. **A reviewer checked the delivery** rather than trusting the report.

Raise the implementer tier when a task stops being mechanical (design decisions, ambiguous
requirements). Raise the reviewer tier when tasks are tightly interdependent. Which model fills
each tier is the user's call — see the next section.

## Ask Which Models Before Dispatching Anything

The defaults below are a starting point, not a decision you get to make silently. Cost, quota and
which models the account can even reach are the user's business, and a run of fifteen tasks on the
wrong tier is expensive in both directions — wasted money, or wasted hours re-reviewing sloppy
work.

**List what is actually available, then ask, then dispatch:**

```bash
opencode2 models            # the real roster for this account, not what you remember
```

Ask for both tiers in one question, offering the enumerated ids as options and saying what each
choice costs in practice — "this tier caught seven plan defects last run", "this one is free and
works when the brief is specific". Give your recommendation as the first option, and let the user
override either tier independently.

**Skip the question only when the user already named the models** ("use deepseek to review and
muse-spark to implement"). Then confirm those ids appear in `opencode2 models` — a model id that
has been renamed fails at dispatch with an error that looks like an auth problem.

**Ask again, mid-run, when a tier is visibly wrong:** an implementer that failed the same task
twice, or a reviewer accepting work you later find broken. Report what happened and propose the
raise; do not silently upgrade, because the cost is the user's.

Exercised defaults, for the recommendation: reviewer `opencode-go/deepseek-v4.1-flash`,
implementer `opencode/muse-spark-1.3-contributor-free`.

## Prepare the Environment, Then Dispatch

Before any agent runs: disable the global MCP servers in a local `opencode.json` (without this the
provider rejects every request with `name must be at most 64 characters`), and confirm the suite is
green so you can tell a delegated break from a pre-existing one.

The reviewer dispatches **several implementers at once** when tasks are independent, each in its own
pane of the session the human is already watching. **Independence is about files, not about the
plan's wording** — two tasks editing the same module are not independent, whatever the plan calls
them. When in doubt, serialise.

Commands, pane limits, and how to wait for an agent that has no working `wait`: **read
[mechanics.md](mechanics.md) before dispatching.** If `echo $CLAUDE_CODE_ENTRYPOINT` prints
`claude-desktop`, there is no herdr: "pane" means a Terminal-panel tab, and mechanics.md's
**Claude Desktop App** section replaces its herdr section.

## The Reviewer's Run Ends at the Final Report, Not at Dispatch

**A CLI agent is one-shot: it stops when it runs out of things to do.** Dispatching is a burst of
activity that looks exactly like finishing, so a reviewer told to "dispatch and then review" reads
its last `herdr pane run` as the end of the job and exits — leaving the implementers to commit
unreviewed. This is the most expensive failure in the whole pattern, because nothing announces it:
the panes fill, the commits land, and the review that was supposed to catch the defects never runs.

**The brief must give the reviewer a termination condition, not a task list.** State it as the one
thing that ends the run:

> You end your run only when `.agentes/RELATORIO-FINAL.md` exists and every task in it is
> VERIFICADO, or recorded as DEVOLVIDO twice, INCONCLUSIVO or BLOQUEADO with the reason.
> Dispatching is not finishing. If you are waiting on an implementer, block on its report file —
> do not exit and do not "check back later".

Give it the blocking loop literally, in the brief, next to that sentence — a reviewer that has no
working wait command and no loop to copy will improvise one that returns instantly:

```bash
fim=$(( $(date +%s) + 45*60 ))   # the task's TIMEBOX plus a margin
until [ -f <abs>/.agentes/relatorio-02.md ] || [ "$(date +%s)" -gt "$fim" ]; do sleep 20; done
```

If the deadline passes with no report, the implementer is stuck: progress counts only as side
effects (a commit, a report), never as a process that is still running. Read its log, record the
task BLOQUEADO (timeout) in `decisoes.tsv`, kill the process, and move on.

**Verify the reviewer is still alive** rather than assuming. `ps aux | grep '[o]pencode.*run'`
lists one process per live agent: if the reviewer's model is missing from that list while
implementer processes are still there, it exited early and nothing is being reviewed. A reviewer
pane sitting at a shell prompt while work continues elsewhere means the same thing.

When it happens, do not take over the review yourself — relaunch a reviewer with a
**verification-phase brief**: what was already dispatched, which commits landed unreviewed, the
commit to diff against, and the same termination condition. The work to be reviewed is all still
there.

## The Brief Contract

Briefs go in a file (`.agentes/tarefa-NN.md`); the dispatch message is one line pointing at it.
Multi-KB prompts pasted into a pane are where quoting breaks.

Every brief has these parts. **A brief missing one is not dispatched** — the reviewer fills it or
asks the engineer:

1. **What already exists** — so the agent does not rebuild it.
2. **What to read** — the plan section, plus the specific existing files whose real signatures it
   must check rather than assume.
3. **"Execute only Task N"**, including the commit that task calls for.
4. **The safety fact** — the one sentence the task is correct because of, e.g. *"same rows, same
   order, same NULL/'' handling as the Oracle procedure"*. The reviewer must prove it by running
   code (reviewing.md, Evidence Ladder).
5. **The traps of this task specifically.** This is where a brief earns its keep — reread the
   previous reports for what already went wrong. Include where grep stops: column-name case,
   DATE vs TIMESTAMP, Oracle `''` = NULL, other programs reading the same table. Generic advice
   here is wasted space.
6. **The verification commands**, with "keep the literal output". For a port, the engineer
   captures **golden outputs from the source before dispatch** (`.agentes/golden-NN.*`) and writes
   `.agentes/check-NN.sh`, so the check reads "old value vs new value".
7. **FORBIDDEN** — at minimum: *"do not edit `.agentes/check-*` or `.agentes/golden-*`"*, plus the
   task's own (no new dependencies, no schema change, …).
8. **TIMEBOX and escape hatch** — *"if you are not done in <N> minutes, or are truly stuck, stop,
   write the report with status BLOQUEADO and why, and exit."* A stuck cheap model otherwise
   spends hours reinterpreting the goal.
9. **The report format**, including the probing questions below and a status of
   `CONCLUIDO | BLOQUEADO`.

**Standing orders** — rules that apply to every task (repo conventions, things the user said
mid-run) — live in one numbered file, `.agentes/ordens.md`, and every brief says "read and obey
`.agentes/ordens.md`". Directives given once in conversation decay across briefs.

**Write briefs in plain constructions** — cheap models misread clever English or Portuguese. Keep
"only" and "not" next to the word they modify, repeat the noun instead of "it", use one name per
thing.

### The probing questions

A report that only says "done, tests pass" cannot be reviewed. Require the questions whose honest
answer exposes bad work — pick the ones that fit the task:

- *Which queries did not come out identical to the source?*
- *What new SQL/API/config did you write that did not exist before, and why?*
- *Which dictionary keys did you convert, and where?*
- *Which tests from the source did not come across, and why?*
- *What did you do differently from the plan, and why?*
- *What data did you use to conclude it works — which rows, which inputs?*
- *Which `try/except`, defaults or NULL handling did you add that the source does not have?*

These work because they are answerable only by having actually done the comparison. An agent that
skipped it either says so or invents something you can check in one command.

## Reviewing: Completion Is Not Correctness

The reviewer verifies with its own hands before accepting anything — running the checks itself, then
reading the code for the defects a report never volunteers (rewritten instead of copied, invented
API workaround, a test that would pass with a wrong but plausible result, a guard the source does not
have, wrong-case dictionary keys, a check that ran over nothing, a snippet the agent knew was wrong
and kept). Each task ends VERIFICADO, DEVOLVIDO or INCONCLUSIVO, tied to the commit SHA reviewed.

**Read [reviewing.md](reviewing.md) before accepting a delivery.** Send work back to the same
implementer with a correction brief naming the defect. After two failures on the same defect the
reviewer escalates to the engineer (DEVOLVIDO x2) — it never implements.

## Pilot, Then Fan Out

Run **one task end to end** — dispatch, report, review — before dispatching the rest. The pilot
exists to falsify the brief template; fixing it once is cheaper than fixing it in fifteen briefs.
While later waves run, read one brief per wave yourself: brief quality decays late in a run.

## Decision Log and Recurring Traps

The reviewer appends one row per decision to `.agentes/decisoes.tsv`:
`hora	tarefa	decisao	motivo	evidencia	resultado` — evidence is a pointer (file, SHA, log line),
never prose. Plan deviations, returned tasks and BLOQUEADO reports all land there, so the final
review starts with `column -ts$'\t' .agentes/decisoes.tsv` instead of reading every report.

**A trap that appears in a second brief becomes a check, not more text.** Write it as a script in
`.agentes/check-*` (or a lint in the repo), and prove it fails on the past commit that had the
mistake before trusting it. Text in briefs is the weakest way to stop a repeated error.

## The Plan Is Not Ground Truth

The plan was written before anyone touched the code, so parts of it are wrong. Assume this.

**When the plan and reality disagree, implement what is correct and record the deviation — never
edit the plan to make a task close.** The engineer who wrote it reviews those deviations, and that
list is one of the most valuable things the run produces. In the originating session it surfaced a
route that would raise `ValueError` in production, a CSV passed where a list was expected, and a
test file that would have reported false positives forever.

Three things go back to the engineer rather than being solved in the run:

- **Inherited bugs** that need domain knowledge to fix (record them; do not guess)
- **Plan-versus-reality divergences** (implement correctly, report)
- **Findings that should become documentation** rather than code changes

## Red Flags

- Picking the models yourself instead of asking — the cost is the user's, not yours
- Accepting "tests pass" without running them yourself — **the report is a claim, not evidence**
- Reviewing every task personally because "it's faster" — you are the bottleneck and the author
- Dispatching without a brief file, with the task text inline in the shell command
- Writing the same generic brief for every task
- Parallelising tasks that touch the same file because the plan called them independent
- Editing the plan so a task can close
- Believing a wait that never returned means the agent is still working — check `herdr pane read` (desktop: `read_terminal`)
- Calling `herdr` from the Claude desktop app — it answers, but with a pane of another session
- A reviewer brief that lists duties but names no condition that ends the run — it will exit at dispatch
- Taking the reviewer's silence for progress — `ps aux | grep '[o]pencode.*run'` says whether it is alive

## Common Mistakes

**Letting the reviewer stop at dispatch.** It looks like a finished run and is not: the
implementers commit unreviewed and the tier you paid for produced nothing. Give the brief a
termination condition and check the process list.

**Skipping the reviewer to "save a tier".** The engineer then reviews their own plan's output, which
is exactly the review least likely to find the plan's own errors.

**Briefs that repeat the plan.** The brief's job is the *delta*: what exists now, what went wrong
last time, what this task specifically gets wrong.

**Treating the final review as a formality.** Do it on the code, not on the reports. For a large
or risky run, put the whole branch through interrogating-with-opencode first: reviewers from other
model families catch what the reviewer tier and you share as blind spots. In the session
this skill came from, the final review still found a screen that opened empty for every user — past
a reviewer that had done its job well.
