# Design

**Goal: an understanding the user can recognise and correct, approved before any code.**

Adapted from superpowers `brainstorming` (Jesse Vincent, MIT) and pstack `architect`,
`design-red-flags`, `prototype` (Lauren Tan, MIT).

## Size

Classify before the first question, and say the classification out loud so the user can override:

- **spike** — a feasibility question ("dá pra…", "is it possible…"). Output is an answer, not code
  you keep. Say the question and the cheapest probe in 2–3 sentences, get a nod, find out, report.
- **delimitado** — a small change to a flow that already exists in this repo (a flag, a field, a
  one-file fix). Short design in chat, approval, then build. No spec file.
- **arquitetural** — a new project or subsystem, a change to how components fit, or an interface
  others depend on. Full path: questions, options, sectioned design, written spec, plan.

When in doubt, take the heavier one. Size only goes up mid-task: if hidden complexity appears,
stop, say so, and move to the heavier path.

## Understand

1. Read the repo first: files, docs, recent commits, the project's AGENTS.md or CLAUDE.md.
2. Anything you can find out by reading or running something is **not** a question for the user.
3. Ask what is left **one question per message**, multiple choice when possible. Purpose,
   constraints and what success looks like come before features.
4. Write back the understanding: what the user said, separated from your assumptions. Invite
   correction.

If the request is really several independent systems, say so and design the first one only.

## Options

Propose 2–3 approaches with their trade-offs, your recommendation first and why. Remove every
feature the goal does not need (YAGNI). Prefer the approach a future maintainer can extend without
breaking invariants.

## Prototype when observation settles it

When the question is "which works better" and watching it would answer faster than arguing, build
a throwaway: the smallest script, page or query that exercises the question, in a scratch folder.
Show the observed result, recommend, and say plainly that the prototype is thrown away. The real
build follows the normal path.

## Present and approve

- **delimitado:** a few sentences to a few short paragraphs — approach, files touched, how it will
  be verified. Then **stop and wait for a yes**. Presenting and starting in the same breath skips
  the gate.
- **arquitetural:** present the design in sections (architecture, components, data flow, errors,
  verification), each sized to its complexity, asking after each whether it is right. Then write
  the spec to `docs/specs/AAAA-MM-DD-<tema>.md`, commit it, and self-review it: placeholders,
  contradictions between sections, requirements readable two ways, scope too big for one plan.
  Fix inline. Ask the user to review the file; continue to `plano.md` only after they approve it.

An approval covers the stage that was shown. Approving an idea does not approve a spec that does
not exist yet.

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

- Write code, scaffold or install dependencies before the design for its size is approved.
- Run an adversarial or multi-model review of a plan that has no code behind it: reviewers invent
  risks that never happen. Prototype instead, then review the code.
- Turn one approval into permission for the next stage.
