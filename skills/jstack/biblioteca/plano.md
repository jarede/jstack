# Plan

For work that needs a written plan. Most work does not.

Adapted from superpowers `writing-plans`, `using-git-worktrees` (Jesse Vincent, MIT) and pstack
`sequence-verifiable-units`, `feature` playbook (Lauren Tan, MIT).

## When to write a plan

1. Write a plan only when the work spans phases or several PRs, when it runs under orquestra or
   longa (both need a written plan), or when the user asks.
2. One or two files with an obvious approach: no plan. Say so and proceed.
3. The best spec is code. Settle open questions with a prototype per `../playbooks/prototipo.md`
   before writing the plan.
4. Save the plan to `docs/planos/AAAA-MM-DD-<tema>.md` and commit. Write it for an implementer
   who is skilled but knows nothing about this codebase: everything they need is in the plan.

## Throughput checkpoint

This checkpoint applies to feature work and to any task that fans out to more than one worker, plan or no plan. Write it as four
todo items. Answer each one, or mark it `n/a: <motivo>`:

1. Blocking first steps (what must exist before anything can run in parallel).
2. Independent workstreams (disjoint files, services or layers run in parallel; shared writes
   serialize).
3. Shared mutable state (the same file, table, branch or key written by two tasks).
4. Smallest safe decomposition (if one worker is best, say why).

**Independence is about files, not about how the plan words the tasks.** Two tasks that edit
the same module are not independent. When in doubt, serialise.

## Before tasks

1. **File map** — every file created or modified, with its one responsibility. Files that change
   together live together.
2. Header: goal (one sentence), architecture (2–3 sentences), stack, path to the spec, and
   **global constraints** copied verbatim from the spec.

## Tasks

- A task is the smallest unit with its own check that a reviewer could reject on its own.
- Steps of 2–5 minutes, one action each: write the check, run it and see it fail, implement, run it
  and see it pass, commit.
- Every step names exact paths, shows the code or the exact content, and every command has an
  `Expected:` line.
- Each task lists **Interfaces**: what it consumes from earlier tasks and what it produces (exact
  names and types), so an implementer reading only their task stays consistent.
- No placeholders. Forbidden: "TBD", "TODO", "implement later", "add error handling", "write tests
  for the above" without the test, "similar to task N" without repeating the content, references to
  names no task defines.

## Review focus

List the 3–5 inputs or failure modes the spec implies but no test covers, most likely first, each
with the behaviour a reasonable user expects. Then add the test for each one to the task that owns
the code. An empty list means you looked and found none.

## Workspace

1. Work on a work branch or worktree you create yourself. Never commit on `main` or another
   shared branch. Creating the branch or worktree needs no consent.
2. Use a git worktree when agents work in parallel, when the run is long, or when the work is risky:

```bash
git worktree add -b <branch> ../<repo>-<tema> <base>
```

3. Before the first task, run the project's checks in the worktree and confirm they are green, so a
   failure you see later is yours. Copy or link what git does not carry: `opencode.json`, `.venv`,
   `.env`, local config.

## Self-review

Before handing off, check the plan against the spec: every requirement has a task, names and
signatures match across tasks, no placeholder survived, the review focus has tests. Fix inline.

## Hand-off

1. Pick the execution mode yourself, with the reason from the plan (how coupled the tasks are, how
   many, what a mistake costs):

| Mode | When |
|---|---|
| **inline** | You implement each task in this session, then one fresh review of the whole branch |
| **orquestra** | Many tasks for reviewers and implementers (skill `orquestra`), models from `modelos.md` |
| **arena** | One task whose shape is open (skill `arena`) |

2. State the pick and the reason in the reply, then start.
3. The user can redirect.
