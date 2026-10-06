# Plan

For **arquitetural** work, after the spec is approved. Save to `docs/planos/AAAA-MM-DD-<tema>.md`
and commit. A plan is written for an implementer who is skilled but knows nothing about this
codebase and has questionable taste: everything they need is in the plan.

Adapted from superpowers `writing-plans`, `using-git-worktrees` (Jesse Vincent, MIT) and pstack
`sequence-verifiable-units`, `feature` playbook (Lauren Tan, MIT).

## Before tasks

1. **File map** — every file created or modified, with its one responsibility. Files that change
   together live together.
2. **Throughput checkpoint** — four items, each answered (or `n/a: <motivo>`):
   - blocking first steps (what must exist before anything can run in parallel);
   - independent workstreams;
   - shared mutable state (the same file, table, branch or key written by two tasks);
   - smallest safe decomposition (if one worker is best, say why).

   **Independence is about files, not about how the plan words the tasks.** Two tasks that edit
   the same module are not independent. When in doubt, serialise.
3. Header: goal (one sentence), architecture (2–3 sentences), stack, path to the spec, and
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

Use a git worktree when agents work in parallel, when the run is long, or when the work is risky:

```bash
git worktree add -b <branch> ../<repo>-<tema> <base>
```

Before the first task, run the project's checks in the worktree and confirm they are green, so a
failure you see later is yours. Copy or link what git does not carry: `opencode.json`, `.venv`,
`.env`, local config. Never start on `main` without the user's consent.

## Self-review

Before handing off, check the plan against the spec: every requirement has a task, names and
signatures match across tasks, no placeholder survived, the review focus has tests. Fix inline.

## Hand-off

Link the plan and ask the user to review it and choose how to run it:

- **inline** — you implement each task in this session, then one fresh review of the whole branch;
- **orquestra** — opencode reviewer and implementers (skill `orquestra`), models from
  `modelos.md`;
- **arena** — for one task whose shape is open (skill `arena`).

Recommend one, with the reason taken from the plan (how coupled the tasks are, how many, what a
mistake would cost).
