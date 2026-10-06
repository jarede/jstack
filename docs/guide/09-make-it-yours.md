# Make it yours

jstack is one person's style. The machinery underneath, playbooks, routing, model roles, works just as well wearing yours. This page covers making a personal skill, capturing lessons from a session, fixing the repo so agents stop repeating mistakes, authoring a focused skill, and testing a skill change before you trust it.

Start smaller than you think. You don't need many skills on day one, or even this whole plugin. Prompt plainly, watch where agents fail, and add a skill or a check when the same failure shows up twice.

## Make a personal skill with `/automate-me`

```text
/automate-me
```

You do not describe your style, because [`/automate-me`](../../skills/automate-me/SKILL.md) reads it out of your history. It mines your recent transcripts in the active workspace for repeated preferences in how you like replies, delegation, verification, code, prose, and process, then asks you which patterns are really you. It drafts a personal skill through the [Authoring or modifying a skill playbook](../../skills/jstack/playbooks/authoring-a-skill.md). It runs the draft through [`/unslop`](../../skills/unslop/SKILL.md) and opens an MR from a worktree so you review it like any other change.

Run it again whenever your habits drift:

```text
/automate-me update my personal skill with everything since its last edit
```

An update mines only the history since the skill last changed. It keeps rules you have not contradicted, revises the ones with new evidence, and adds sections only for new patterns.

## Capture a session's lessons with `/reflect`

Right after a task that taught you something, run:

```text
/reflect that took way too long. capture what we learned so the next run doesn't repeat it.
```

[`/reflect`](../../skills/reflect/SKILL.md) sends the transcript to three parallel reviewers, then a synthesizer sorts proposals into `Accepted`, `Rejected`, and `Backlog`. It waits for your approval before changing a skill. Approve a proposal only if it would change a future decision. One unusual session is an anecdote, not a rule.

## Fix the environment with `/correct`

When you correct agents for the same mistake again and again, the fix belongs in the repo, not in your next prompt. Rank the options by how well they prevent the mistake:

1. Make the mistake impossible with architecture or a better data structure.
2. Block it with types, or with a lint or CI check whose error names the fix.
3. Catch it with a test.
4. Write it down as a doc or agent rule. Nothing fails when an agent skips a rule, so this comes last.

Human review is not on the list. A reviewer who must catch the same mistake on every MR is the problem this fixes. [`/correct`](../../skills/correct/SKILL.md) does the work:

```text
/correct agents keep calling the database client directly instead of going through the repository layer
```

It reads recent commits, reverts, review comments, and comments that explain workarounds, then groups mistakes into classes. A class counts once it has happened twice. It fixes the most frequent classes one commit each, at the highest level that works, and proves each new check fails on a real past mistake. It also keeps a table in the agent instruction file that pairs each rule with what enforces it, so a rule that nothing enforces shows up as a repeat. The reply lists each class with its evidence, the level chosen, and why a higher level did not work.

Run it with no argument and it finds mistake classes from history on its own. `/reflect` and `/correct` split the work. `/reflect` improves skills from one session. `/correct` changes the repo so an observed mistake cannot return. Pair it with `/architect` when the fix adds a new boundary. [Run many projects in parallel](./07-overnight.md#run-many-projects-in-parallel) has a prompt that does both across a whole repo.

## Author a focused skill

When you already know the workflow you want to capture:

```text
/jstack write a skill for verifying database migrations in this repo
```

Writing a skill matches the [Authoring or modifying a skill playbook](../../skills/jstack/playbooks/authoring-a-skill.md). It validates the frontmatter and links, then ships the result through the Opening an MR playbook. Agent-facing prose has a higher bar than human prose, because an unhelpful sentence becomes an instruction a future agent follows. Let the playbook hold that bar rather than writing a `SKILL.md` freehand.

One special case has its own generator. A skill that must drive your app and prove behavior is a verification skill, so use [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md) and [`/maintain-verification-skill`](../../skills/maintain-verification-skill/SKILL.md) instead. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers both.

## Write docs to a standard with `/technical-writing`

Skills are not the only prose you ship. For docs, RFCs, readmes, MR descriptions, and commit messages:

```text
/technical-writing review the readme changes
```

[`/technical-writing`](../../skills/technical-writing/SKILL.md) applies a layered standard with one goal, prose a tired engineer understands on the first read. It picks the document mode first (tutorial, how-to, reference, or explanation), then works sentence by sentence. Who does what, one thought per sentence, nothing readable two ways. Use it to review what you or an agent just wrote, or name it up front when you ask for a doc.

## Test a skill change blind

A skill edit affects every future session, so test it like the experiment it is. The same goes for adopting someone else's skill. Check that it makes the agent better on your work before you keep it.

```text
/jstack run the eval playbook on this skill change. same task for both variants, candidates stay blind.
```

When a skill keeps missing and you know what it should do, change and test it in one task:

```text
/jstack update the review skill so it flags missing migrations, and eval the change.
```

Asking for the eval up front keeps the edit honest. A fix written from one bad session tends to overfit that session, and over many edits the skill drifts. The eval catches the drift before it ships.

The [Eval playbook](../../skills/jstack/playbooks/eval.md) is built around one failure mode, the observer effect. An agent that knows it is being evaluated behaves differently. Candidate agents get an organic-looking task in sanitized directories, without the words "eval" or "candidate" or knowledge of one another. One judge scores all outputs under neutral labels. Chain-following gets graded from which files each candidate read, not from what it claims.

Read every output yourself before accepting the verdict. If you disagree with the judge, suspect the rubric before you suspect your judgment.

**Pitfall:** do not edit a skill mid-task because it is misbehaving. Fix it in its own MR and keep the task moving. A skill edit tangled into feature work is invisible to review and impossible to evaluate.

Next: [Recipes and pitfalls](./10-recipes-and-pitfalls.md).
