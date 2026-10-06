---
name: por-que
description: Use when the user invokes /por-que (or @por-que) to find out why code, a procedure, a table or a decision is the way it is - design rationale, who decided and when, the regression that introduced a behaviour, or the history behind a threshold or workaround.
disable-model-invocation: true
---

# Por que

Adapted from pstack why (Lauren Tan, MIT).

Finds why code, a procedure, a table, or a decision is the way it is. Rationale, trade-offs, who decided, when, which regression, why this value.

Companion to como-funciona. That skill tells what code does. This skill tells what forces shaped it.

This skill is on-demand. The caller reads this SKILL.md and follows it. Example caller: [`investigacao`](../jstack/playbooks/investigacao.md).

## Operating posture

1. Act as a careful investigator. Report what the record shows.
2. Separate facts from inferences. Every claim carries one label: `medido`, `inferido`, `palpite`.
3. Read [epistemics.md](references/epistemics.md) before you synthesize. Follow its wording rules.

## Steps

### 1. Understand the target and the question

1. Name the target: file, procedure, table, screen, threshold, workaround, or decision.
2. Name the question: rationale, trade-off, author, date, regression, or value origin.
3. Vague target: guess from context. State the guess in one line. Proceed.

### 2. Anchor in code

1. Record file paths, line ranges, key symbols.
2. Run `git blame` on the target lines.
3. Run `git log --follow -p` on the file.
4. Run `git log -S` for exact strings from the target.
5. Take PR or MR numbers from merge commits.
6. Pull bodies and review threads with `gh` or `glab`.
7. Pass paths, symbols, commits, numbers to the investigators.

### 3. Discover tools, then spawn investigators in parallel

1. List which tools exist in this run.
2. Map them to evidence categories:

| Category | Playbook | Needs |
|---|---|---|
| Source control | [codigo.md](references/sources/codigo.md) | git, `gh` or `glab` |
| Issue tracker | [desk.md](references/sources/desk.md) | Desk MCP, or `gh` / `glab` issues |
| Database | [oracle.md](references/sources/oracle.md) | Oracle dictionary access |
| Documents | [docs.md](references/sources/docs.md) | repo files |

3. Skip a category with no tool. Say so. Keep the reason for Sources Consulted.
4. Launch one fresh subagent per live category in one batch. Claude Code `Agent`, opencode `subagent`. All run on the session model.
5. Give each: [investigator-prompt.md](references/investigator-prompt.md), its playbook from [source-playbook.md](references/source-playbook.md), the anchor, the question.
6. One investigator owns one category. No investigator covers two.

### 4. Synthesize

1. Launch one fresh synthesizer subagent on the session model.
2. Give it all findings (with gaps), the anchor, the question, [epistemics.md](references/epistemics.md), [synthesizer-prompt.md](references/synthesizer-prompt.md).
3. It spot-checks citations. It keeps contradictions visible.

### 5. Present

1. Show the synthesizer output. Light edits only.
2. Keep the confidence words unchanged.
3. When a change follows the question, add Preserve / Change / Avoid / Risk constraints.

## Output format

Sections: The Question, The Code in Question, What We Found, What We Can Reasonably Infer, Competing Hypotheses, What We Don't Know, Sources Consulted, Confidence Summary. Full shape: [synthesizer-prompt.md](references/synthesizer-prompt.md). Sources Consulted lists one line per investigator, with empty and skipped ones and the reason.

## Desk rules

1. Desk access is read-only. Never write in a ticket.
2. Cite ticket numbers only. No personal data.
3. Details: [desk.md](references/sources/desk.md) and [`triaging-desk-tickets`](../triaging-desk-tickets/SKILL.md).

## Failure modes

| Mode | Fix |
|---|---|
| Recency bias: newest commit looks decisive | Trace back. Shape accrues over many commits. |
| Code cited as its own motive | Motive comes from commits, PRs, tickets, docs. |
| Confirming the user guess | Treat the guess as one hypothesis. Test it. |
