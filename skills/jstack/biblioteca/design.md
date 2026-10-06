# Design

**Goal: the right shape named before logic is written; the user corrects course after seeing it.**

Adapted from superpowers `brainstorming` (Jesse Vincent, MIT) and pstack `architect`,
`design-red-flags`, `prototype` (Lauren Tan, MIT).

## Size

Classify before the first question, and say the classification out loud so the user can redirect:

- **spike** — a feasibility question ("dá pra…", "is it possible…") or a read-only investigation
  ("por que…"). Output is an answer, not code you keep. State the question and the cheapest probe
  in 2–3 sentences, then find out and report. No nod needed.
- **delimitado** — a small, contained unit of work: a change to a flow that already exists in this
  repo (a flag, a field, a one-file fix), or one function, query or view to port. Name the data
  shape and the files, write the short design in the reply, then build. No spec file.
- **arquitetural** — a new project or subsystem, a change to how components fit, or an interface
  others depend on. Full path: the Architect sketch below, then build or plan per `plano.md`
  (When to write a plan).

When in doubt, take the heavier one. The size is provisional until you have read what the work
touches (the source to port, the code around the bug); fix it then. After work starts, size only
goes up: if hidden complexity appears, stop, say so, and move to the heavier path.

## Understand

1. Read the repo first: files, docs, recent commits, the project's AGENTS.md or CLAUDE.md.
2. For what to settle yourself and what to ask, follow `autonomia.md` (Before you ask).
3. Write back the understanding: what the user said, separated from your assumptions. State it so
   the user can correct it.

If the request is really several independent systems, say so and design the first one only.

## Options

1. List 2–3 approaches with trade-offs, recommendation first with its reason. Remove every
   feature the goal does not need (YAGNI). Prefer the approach a future maintainer can extend
   without breaking invariants.
2. Choose the recommendation and proceed with it.
3. Show the alternatives in the reply as a table:

| Approach | Cost | Risk | Verdict |
|---|---|---|---|
| Recommended shape | Small, touches one module | Low | Proceed |
| Alternative shape | Larger, touches two modules | Medium | Rejected, reason in one line |

## Architect sketch

1. Name the data shape first and its organizing structure: a state machine over scattered
   booleans, a table over branching, a typed model over repeated shape assumptions.
2. Write the caller's usage first, before types.
3. Then write types and signatures.
4. Then write the module layout: files, owners, boundaries.
5. When the change crosses a function boundary and more than one shape is plausible, run 2–3
   sketches in parallel fresh subagents (Claude Code `Agent` tool or opencode `subagent` tool,
   models from `modelos.md`) and pick one, with reasons stated in the reply.
6. Stay in the loop while implementation fills the sketch in: a deviation is signal, not friction.
   When the same shape of workaround repeats, re-sketch instead of bolting fixes on.

When observation settles the fork faster than argument, follow `../playbooks/prototipo.md`.

## Present

1. Show the named shape, the alternatives table, the files touched, and the verification. Then
   keep building; the work continues in the same session.
2. Write the spec to `docs/specs/AAAA-MM-DD-<tema>.md` only when the work goes to orquestra or
   longa, or when the user asks. No spec file otherwise.

## Design red flags

Screen the chosen shape before writing it down:

- **Shallow module** — callers must coordinate several calls to do one thing.
- **Leaked decision** — the same internal detail (format, policy, schema) appears in several modules.
- **Split ownership** — more than one place writes the same state.
- **Two ways to do one task** — the next contributor copies whichever they find first.
- **Hand-synced lists** — adding an item means editing several lists; derive them from one.
- **Importable internals** — anything reachable will be used; make internals unreachable.
- **Pass-through layer** — a method that only forwards its arguments.

Design for the next contributor, often a cheap model: it copies the nearest example and takes the
shortest path that works. Make the right path the shortest one.

## Never

- Write logic before naming the data shape.
- Run an adversarial or multi-model review of a plan that has no code behind it: reviewers invent
  risks that never happen. Prototype instead, then review the code.
