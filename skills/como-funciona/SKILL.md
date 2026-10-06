---
name: como-funciona
description: Use when the user asks how something works ("como funciona X", "how does X work", "me explica o fluxo de Y"), wants a walkthrough of a subsystem, job, procedure or module before changing it, or asks where something should live or which layer owns it. For why something was built a certain way, use por-que.
---

# Como funciona
Adapted from pstack how (Lauren Tan, MIT).

Answer "how does X work?" with facts read from the code. Write for a senior engineer joining the area. Give a working mental model, not annotated source.

## Steps

1. Scope the question. State your reading when the scope is vague. The user redirects when needed.
2. Judge complexity. Simple is one module, one small tool, or one narrow question. Complex is many files, many services, or a full overview. When in doubt, take the simple path.
3. Simple path: dispatch one explainer that explores and explains in a single pass. Build its prompt from [explainer prompt](references/explainer-prompt.md) with no explorer findings. Skip to step 6.
4. Complex path: split the question into 2 to 4 angles. Dispatch one explorer per angle, all at once. Build each prompt from [explorer prompt](references/explorer-prompt.md).
5. Complex path: after all explorers return, dispatch one explainer. Build its prompt from [explainer prompt](references/explainer-prompt.md) with all findings filled in.
6. Present the result. Light edits for clarity are fine. Do not rewrite it.

## Subagents

| Harness | Tool | Form | Model |
|---|---|---|---|
| Claude Code | `Agent` | Type Explore, read-only | Session model |
| opencode | `subagent` | Read-only run | Session model |

No role exists for this skill in `modelos.conf`. Never pick a model. Explorers stay read-only: they read code and run SELECT queries only.

## Output

Write the answer in the user's language. Use these sections, and drop any that adds nothing:

| Section | Content |
|---|---|
| Overview | What the thing is, what it does, why it exists. |
| Key Concepts | Types, services, and terms the reader needs. Short definitions. |
| How It Works | The flow, step by step. Trigger, stages, data, decisions. |
| Where Things Live | Files and dirs the reader needs to start work. |
| Gotchas | Surprises, pitfalls, history that still bites. |

Every claim carries its proof in the same line: `file:line` or the query used. For "why" questions about reasons, history, or past decisions, use [por-que](../por-que/SKILL.md) instead.

## Oracle dictionary

When a database tool exists, explorers may read the Oracle dictionary with SELECT only:

| View | Use |
|---|---|
| `ALL_SOURCE` | Read stored code text. |
| `ALL_DEPENDENCIES` | Map what depends on what. |
| `ALL_TAB_COLUMNS` | List table columns. |

Never write. Never run INSERT, UPDATE, DELETE, MERGE, or DDL.
