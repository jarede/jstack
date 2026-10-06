---
name: refletir
description: Use when the user invokes /refletir (or @refletir) after a session or long task to mine what was learned and turn each durable lesson into a concrete edit of an existing skill.
disable-model-invocation: true
---

# Refletir
Adapted from pstack reflect (Lauren Tan, MIT).

Mine the current session for durable learnings. Turn each one into a concrete edit of an existing skill.

## When to invoke

1. Invoke when the user says `/refletir` after a session or a long task.
2. Works without `/jstack`. Any session can be mined.
3. Skip trivial or off-topic sessions. One-offs are not learnings.

## 1. Locate the transcript

1. Find your own transcript first, before spawning reviewers.
2. Claude Code: look under `~/.claude/projects/<cwd with / and . replaced by ->/>`. Files are `<session-id>.jsonl`. Subagent transcripts sit under `<session-id>/subagents/`. Take the newest file whose first user message matches this conversation's opening request.
3. opencode: read this directory's session in `~/.local/share/opencode/opencode.db`.
4. Never read another project's folder.
5. No match: write a tight digest of the session and pass that instead.

## 2. Spawn three reviewers in parallel

1. Launch three fresh subagents in one step: Claude Code `Agent`, opencode `subagent`.
2. All three run on the session model. Give each its prompt file verbatim, with the transcript path or the digest filled in.

| Lens | Prompt |
|---|---|
| Judgment | [judgment-reviewer](references/judgment-reviewer.md) |
| Tooling | [tooling-reviewer](references/tooling-reviewer.md) |
| Divergent | [divergent-reviewer](references/divergent-reviewer.md) |

3. Reviewers read only. They return findings in their reply. They change no files.

## 3. Synthesize

1. Launch one fresh subagent on the session model with [synthesizer](references/synthesizer.md) verbatim.
2. Inline each reviewer's full output where marked.
3. It returns Accepted, Rejected, Backlog.

## 4. Structural check

1. Check each Accepted item. Anything a lint, a script, or a check enforces better moves to Backlog.
2. Point those items at skill [corrigir](../corrigir/SKILL.md) (`../corrigir/SKILL.md`).

## 5. Apply

1. Present Accepted, Rejected, Backlog to the user.
2. Then apply the Accepted edits without waiting. They are reversible commits on a work branch of the skills repo.
3. Find the repo: run `cd ~/.claude/skills/jstack && pwd -P`, then go two levels up. That checkout is installed live: never switch its branch. Create a worktree for the edits (`git worktree add -b chore/refletir-<tema> <repo>/.claude/worktrees/refletir-<tema>`) and work there.
4. Route each edit per `../jstack/biblioteca/skills.md`: a substantive edit or a new skill needs its RED and GREEN runs; a one-line fix does not.
5. Write Backlog items to `.agentes/refletir-backlog.md` of the skills repo.
6. Run `just check` and `just test` in that worktree; commit only with both green.
7. Finish per `../jstack/biblioteca/finalizacao.md`.

## 6. Summarize

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills: `<skill path>`. One line each (rare).
- Backlog: one line per item, with where it was filed.
- Dropped: one line per rejected finding, with the reason.
