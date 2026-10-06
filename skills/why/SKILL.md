---
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers available MCPs and queries each evidence category (source control, issue tracker, long-form docs, real-time chat, infrastructure observability, error tracking, product analytics warehouse) in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
disable-model-invocation: true
---

# Why

Investigate the motivation and intent behind code.

Companion to the `how` skill. `how` answers what the code does and how it works. `why` answers what forces led to its shape.

Each spawn below names a role line from the jstack skill's `references/models.md`. Use the configured value, or its listed default. Spawn per the jstack skill's `references/harness.md` (Dispatch).

## Operating Posture

Operate as a **careful, cautious, and precise investigator**. Be honest about what you know vs what you're inferring. Read `references/epistemics.md` for the full confidence framework and phrasing guide. The synthesizer must follow it.

## Step 1. Understand the Target and the Question

Parse what the user is asking. The **target** is usually a chunk of code, a pattern, a feature, or a named design decision. The **question** is usually a design rationale, a tradeoff, a motivating edge case, an external constraint, dead code, or a broad history sweep.

If the target is vague ("why do we do it this way?" with no clear referent), make your best guess from conversation context (open files, recent edits, active editor location, what was just discussed). State your interpretation briefly so the user can redirect if you're off, then proceed.

## Step 2. Establish the Code Anchor

Before spawning investigators, anchor the investigation in concrete code. You need:

- The relevant file path(s) and line range(s)
- The key symbols (function names, class names, constants)
- An initial commit list. The last few commits touching the target.
- MR iids from merge commit messages, when present

Build this inline.

```bash
# Blame target lines for last-touch commits
git blame -L <start>,<end> <file>

# Full file history, with patches, through renames
git log --follow -p -- <file>

# Last N commits touching the file, MR references visible
git log --oneline -20 -- <file>

# Inspect a commit message for an MR reference
git log -1 --format=%B <commit>
```

Pull MR context for any substantive commits:

```bash
glab mr view <iid> --output json
glab mr view <iid> --comments
```

Capture this as seed context (file paths, symbols, commits, MR iids, and linked issue IDs). Pass it to the investigators.

## Step 3. Spawn Parallel Investigators (default posture)

**Default to the full parallel investigation.**

### Discovery

Before spawning investigators, discover the available MCPs at run time. In Claude Code, inspect the session tool list for `mcp__<server>__*` tools. In opencode, run `opencode2 mcp list`.

Map available tools to the evidence categories in the jstack skill's `references/environment.md`:

1. Source control and MRs
2. Issue tracker
3. Long-form docs
4. Real-time chat
5. Observability and error tracking
6. Database

Use the environment table's tool and status for each category, then confirm MCP availability at run time. Source control is available through `git` and `glab`; use `gh` only for a `github.com` remote. For other categories, classify available MCP tools by server instructions, tool names, and resource descriptors. If a tool could fit more than one category, choose its primary evidence and record ambiguity. A category with no tool is a skipped source, reported as skipped.

Aim for a complete **coverage map**, not a minimal one. Document the null, don't skip the search.

Launch all investigators for available categories in one message so they run concurrently. Don't ask one agent to cover multiple evidence categories. Report every unavailable category as skipped.

Subagent config (each):
- Agent kind: general worker. Investigators need access to their assigned tools and must not write files.
- Role line: `why investigators`.
- Spawn per the jstack skill's `references/harness.md` (Dispatch).

Each investigator gets:
1. The base prompt from `references/investigator-prompt.md`
2. The matching category guidance from `references/source-playbook.md`; use `references/sources/code-archaeology.md` for source control
3. The cross-cutting `references/sources/incident-postmortem.md` **if the target code looks defensive** (null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, OOM handlers)
4. The code anchor from Step 2 (file paths, symbols, commit hashes, MR iids, issue IDs)
5. The user's original question

### Investigator roster. One per available evidence category

Spawn one investigator per available evidence category. Each investigator owns one category. Source control is always available; categories without a tool are skipped and reported.

Each entry names the category and the kind of "why" it uniquely surfaces. Use it to know what to expect back, how to name a gap when a category returns empty, and (only in the rare provably-irrelevant case) to justify a skip.

1. **Source control and MRs investigator**. Git history, `glab` for MRs, issues, and pipelines, code comments, and tests. Always spawn. Best at surfacing *implementation-time rationale captured during review*.

2. **Issue tracker investigator**. Use the tool named in the environment table when available. Best at surfacing *the product or business forcing function*. Strongest when the why is external to engineering.

3. **Long-form docs investigator**. Search repository docs, READMEs, and the named wiki or docs site when available. Best at surfacing *long-form design rationale* written before code.

4. **Real-time chat investigator**. Use an available tool for the team's chat. Best at surfacing *real-time deliberation that never reached a doc*. Especially important when the source control, ticket, and doc paper trail is thin.

5. **Observability and error tracking investigator**. Use available tools in this evidence category. Best at surfacing *infrastructure/runtime reality and specific errors that motivated the code*. Strongest for timeouts, retries, rate limits, and other defenses.

6. **Database investigator**. Use an available database MCP when relevant. Best at surfacing *stored data and query constraints that shaped the code*.

### When to skip an investigator

Only skip with an **explicit, written justification** that goes in the final "Sources Consulted" section. Two valid reasons:

- **No tool is available for that category** in this environment. Flag this as a gap, not a choice. Example: "Real-time chat skipped. No matching tool is available, so the conversational record was not searchable."
- **The source is provably irrelevant**, not just "probably irrelevant." A high bar. Example: "Observability and error tracking skipped. Target is a build-time script with no runtime code path."

If your scope assessment suggests a single-commit trivial target where the MR description already contains the complete answer, you may answer inline **only after** confirming all available category searches would be redundant. Say so explicitly. This should be rare.

## Step 4. Synthesize

Spawn one synthesizer subagent:

- Agent kind: general worker. The synthesizer may need access to cited tools for spot-checks, and must not write files.
- Role line: `why synthesizer`.
- Spawn per the jstack skill's `references/harness.md` (Dispatch).

The synthesizer gets:
1. The investigator findings, including any null results and any categories skipped with justification
2. The code anchor from Step 2 (file paths, symbols, commit hashes, MR iids, issue IDs)
3. The user's original question
4. The epistemics framework from `references/epistemics.md`
5. The synthesizer prompt template from `references/synthesizer-prompt.md`

## Step 5. Present

Take the synthesizer's output and present it to the user. You may lightly edit for clarity or add context from the conversation, but **do not rewrite the confidence language**.

## Output Format

The output structure is the one in `references/synthesizer-prompt.md`: The Question, The Code in Question, What We Found, What We Can Reasonably Infer, Competing Hypotheses, What We Don't Know, Sources Consulted, Confidence Summary. Adapt as needed, but keep the confidence separation intact, and keep Sources Consulted as one line per investigator, including the ones that returned nothing or were skipped, with the reason.

After the Sources Consulted block, if the user's `why` question is a precursor to actually changing this code, convert the lineage findings into a Preserve / Change / Avoid / Risk constraint set suitable for planning the change.

## Common Failure Modes to Avoid

- **Recency bias**. Assuming the most recent commit is authoritative. The current shape is often the accretion of many earlier decisions. Trace back.

## Reference Files

- `references/epistemics.md`. Confidence tiers and phrasing guide. The synthesizer must follow it.
- `references/investigator-prompt.md`. Base prompt template for investigator workers.
- `references/source-playbook.md`. Maps available evidence categories to their guidance and the environment table.
- `references/sources/code-archaeology.md` and `incident-postmortem.md`. Keep source-specific steps aligned with the evidence table in the jstack skill's `references/environment.md`. Give an investigator only the available, matching source guidance.
- `references/synthesizer-prompt.md`. Prompt template for the synthesizer subagent, including the output format.
