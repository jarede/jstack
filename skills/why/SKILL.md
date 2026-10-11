---
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers available tools and queries each evidence category (source control and MRs, issue tracker, long-form docs, real-time chat, observability and error tracking, database) in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
disable-model-invocation: true
---

# Why

Investigate the motivation and intent behind code. The companion `how` skill answers what the code does and how it works. `why` answers what forces led to its shape.

Each spawn below names a role line from the jstack skill's `references/models.md`. Use the configured value, or its listed default. Spawn per the jstack skill's `references/harness.md` (Dispatch).

Never spawn in read-only mode. Read-only mode strips MCP access, which disables the MCP-backed investigators and the synthesizer's citation spot-checks. No spawn writes files.

## Operating Posture

Operate as a **careful, cautious, and precise investigator**. Be honest about what you know vs what you're inferring. Read `references/epistemics.md` for the full confidence framework and phrasing guide. The synthesizer must follow it.

## Step 1. Understand the Target and the Question

The **target** is usually a chunk of code, a pattern, a feature, or a named design decision. The **question** is usually a design rationale, a tradeoff, a motivating edge case, an external constraint, dead code, or a broad history sweep.

If the target is vague ("why do we do it this way?" with no clear referent), make your best guess from conversation context (open files, recent edits, active editor location, what was just discussed). State your interpretation briefly so the user can redirect if you're off, then proceed.

## Step 2. Establish the Code Anchor

Before spawning investigators, build the seed context inline: file paths and line ranges, key symbols (functions, classes, constants), the last few commits touching the target, MR iids from merge commits (the subject-line pattern, `!1234`), and any linked issue IDs. Run `git blame -L <start>,<end> <file>` for last-touch commits, `git log --follow -p -- <file>` for full history with patches through renames, `git log --oneline -20 -- <file>` for recent commits with MR iids visible, and `git log -1 --format=%B <commit>` to extract MR iids. Then pull the MR context for any substantive commit: `glab mr view <iid> --output json` and `glab mr view <iid> --comments`. This anchor goes to every investigator and to the synthesizer.

## Step 3. Spawn Parallel Investigators

**Default to the full parallel investigation.** The goal is a complete coverage map, not a minimal one. Document the null, don't skip the search.

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

Spawn one investigator per available evidence category, all in a single message so they run concurrently, each owning exactly one category. Don't ask one agent to cover multiple categories. Spawn each as a general worker. Report every unavailable category as skipped. `model`: the `why investigators` line.

Each investigator's prompt is `references/investigator-prompt.md` filled in, plus:
- the category playbook `references/sources/<source>.md` for the selected tool, adapted from the examples in `references/source-playbook.md`
- `references/sources/incident-postmortem.md` **if the target code looks defensive** (null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, OOM handlers)
- the code anchor and the user's original question

### Investigator roster, one per available evidence category

Each category below is uniquely positioned to surface one shape of "why", shown after "Best at". Use it to know what to expect back, to name a gap when a category returns empty, and, only in the rare provably-irrelevant case, to justify a skip.

1. **Source control and MRs** (git history, `glab` for MRs, code comments, tests). Always spawn, the only guaranteed source. Best at *implementation-time rationale captured during review*.
2. **Issue tracker** (GitLab issues through `glab`, or the available issue tool). Best at *the product or business forcing function*. Strongest when the why is external to engineering.
3. **Long-form docs** (repository docs and READMEs, plus the wiki or docs site when the environment names one). Best at *long-form design rationale*, written out before it becomes code.
4. **Real-time chat** (the chat tool the environment names). Best at *real-time deliberation that never reached a doc*. Especially important when the source control, ticket, and doc paper trail is thin.
5. **Observability and error tracking** (the observability or error tracking tool the environment names). Best at *infrastructure/runtime reality and the specific errors that motivated the code*. Strongest for timeouts, retries, rate limits, and other defenses.
6. **Database** (the database tool the environment names, when relevant). Best at *stored data and query constraints that shaped the code*.

### When to skip an investigator

Only with an **explicit, written justification** that goes in the final Sources Consulted. Two valid reasons:

- **No tool is available for that category** in this environment. Flag it as a gap, not a choice: "Real-time chat skipped. No matching tool is available, so the conversational record was not searchable."
- **The source is provably irrelevant**, not just "probably irrelevant." A high bar: "Observability and error tracking skipped. Target is a build-time script with no runtime code path."

If your scope assessment suggests a single-commit trivial target where the MR description already contains the complete answer, you may answer inline **only after** confirming all available category searches would be redundant. Say so explicitly. This should be rare.

## Step 4. Synthesize

Spawn one synthesizer as a general worker. `model`: the `why synthesizer` line. It gets:
1. The investigator findings, including any null results and any categories skipped with justification
2. The code anchor
3. The user's original question
4. The epistemics framework from `references/epistemics.md`
5. The synthesizer prompt template from `references/synthesizer-prompt.md`

## Step 5. Present

Present the synthesizer's output to the user. You may lightly edit for clarity or add context from the conversation, but **do not rewrite the confidence language**.

## Output Format

The structure is the one in `references/synthesizer-prompt.md`: The Question, The Code in Question, What We Found, What We Can Reasonably Infer, Competing Hypotheses, What We Don't Know, Sources Consulted, Confidence Summary. Adapt as needed, but keep the confidence separation intact, and keep Sources Consulted as one line per investigator, including the ones that returned nothing or were skipped, with the reason.

After Sources Consulted, if the user's `why` question is a precursor to changing this code, convert the lineage findings into a Preserve / Change / Avoid / Risk constraint set for planning the change.

## Common Failure Modes to Avoid

- **Recency bias**. Assuming the most recent commit is authoritative. The current shape is often the accretion of many earlier decisions. Trace back.

## Reference Files

- `references/epistemics.md`. Confidence tiers and phrasing guide. The synthesizer must follow it.
- `references/investigator-prompt.md`. Base prompt template for investigator workers.
- `references/source-playbook.md`. Maps available evidence categories to their guidance and the environment table.
- `references/sources/code-archaeology.md` and `incident-postmortem.md`. Keep source-specific steps aligned with the evidence table in the jstack skill's `references/environment.md`.
- `references/synthesizer-prompt.md`. Prompt template for the synthesizer, including the output format.
