---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript through the transcripts row of the jstack skill's `references/harness.md`. In Claude Code, the active transcript is the newest `*.jsonl` under `~/.claude/projects/<slug>/` whose content mentions the current task. In opencode, use the `message` and `part` tables in `~/.local/share/opencode/opencode.db`, filtered by the project directory. Do not search other workspaces.

```bash
ls -t ~/.claude/projects/<slug>/*.jsonl 2>/dev/null | head -10
```

For an opencode session, query the SQLite transcript records instead of looking for JSONL files.

For each Claude Code candidate, check whether its content mentions the current task. Take the newest matching path. If no transcript resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

Spawn three general workers in parallel. Each needs access to tools for context lookups referenced in the transcript and must not write files. Use the role lines below. Spawn per the jstack skill's `references/harness.md` (Dispatch).

Each reviewer and the synthesizer uses the listed role line from the jstack skill's `references/models.md`.

| Lens | Role line | Prompt template |
|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path, database records, or digest where marked. Reviewers return findings in their response.

### 3. Synthesize

Spawn one general worker with the `reflect judgment, divergent, synthesizer` role line. The synthesizer may need tools to verify citations and must not write files. Spawn per the jstack skill's `references/harness.md` (Dispatch). Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): follow the Authoring a skill playbook in `skills/jstack/playbooks/authoring-a-skill.md`.
- `tune description: <skill path>` (the skill exists but did not trigger when it should have): follow the Authoring a skill playbook.
- `new skill: <kebab-name>`: follow the Authoring a skill playbook. Do not invent the shape ad hoc.

When scanning for skills, search `.claude/skills/`, `~/.claude/skills/`, and `~/.config/opencode/skills/`.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
