---
name: jstack-help
description: Guides users through jstack setup, /jstack, and picking a skill or playbook. Type /jstack-help with a question.
disable-model-invocation: true
---

# jstack help

Answer the user's question about jstack, hand them a prompt they can send, and link the file the answer came from. For a help question, do not start the work. The user asked how, and a jstack run spends real tokens, so let them send the prompt.

A message that asks for work, such as "use jstack to fix this bug", is not a help question. Read [`jstack`](../jstack/SKILL.md) and do the work under it.

This file maps questions to the skills and guide pages that hold the answers. Those files own the details. Read the file you route to before you quote it, and trust it when it disagrees with this map. The links here point into the installed skills, which the user may not be able to open, so give the user the file's public copy. Use `https://github.com/jarede/jstack/blob/main/` followed by its path.

## Find out what they need

Infer the need from the message and the conversation. A named situation, such as "which skill reviews an MR?", goes straight to its section. If the need is still unclear, ask one multiple-choice question with these options, then answer only the section they pick:

- Get set up
- Start a task with `/jstack`
- Pick a skill for a situation
- Fix a run that went wrong
- Make jstack my own

Check the state that changes the answer, and mention it only when it does:

- No `~/.config/jstack/models.conf` means `/setup-jstack` has not run for this user, so every role uses its default model.
- No `verify-*` skill or other app harness in the project means agents have no scripted way to drive the app. Mention `/create-verification-skill` when the question is about proving a change works.

When `models.conf` is missing and it matters, ask whether the user wants to pick a model for each role now. It matters when the user is new, the question is about setup or cost, or the answer depends on which models run. Ask at most once per chat. If the need is also unclear, ask both questions together. Offer two choices:

- Now: give them `/setup-jstack` to type, and answer their question too.
- Later: answer their question, and add one line saying every role keeps its default model until they run `/setup-jstack`.

## Get set up

1. Clone or open the jstack repository.
2. Run `scripts/install.sh` from the repository root. It links skills into `~/.claude/skills`. opencode reads the same folder. The installer also generates an opencode slash command for each user-facing skill.
3. Run [`/setup-jstack`](../setup-jstack/SKILL.md). It detects available models, asks which models to use for each role, and writes `~/.config/jstack/models.conf`.
4. Start each task with `/jstack`, a goal, and a check that can pass or fail.

Claude Code is the primary harness. You can use its desktop app or CLI. opencode differences matter only for tool dispatch and generated slash commands. There is no custom mode. Type `/jstack` at the start of each task.

Installing changes nothing until the user invokes a skill. The [README](../../README.md) and [guide page 1](../../docs/guide/01-setup.md) have the details. Offer to word their first prompt with them, per [`references/prompting.md`](references/prompting.md).

If cost is the worry, say where the tokens go and how to spend fewer. jstack spends extra tokens on subagents and review panels. Rerun `/setup-jstack` and choose cheaper models or shorter panel lists. A role set to `inherit` runs on the parent chat's model, which saves tokens when the chat runs on a cheaper model. A shorter panel list runs fewer subagents, one for each entry. Save `/jstack` for work that needs rigor.

## Start a task with `/jstack`

`/jstack` matches the task to a playbook, copies the playbook's steps into the todo list, and runs other skills as the steps need them. A skipped step stays in the list as `skip: <reason>`. A good prompt states the goal and how to tell it is done. It does not list skills, because a hand-written sequence can drop or reorder steps the playbook would keep. Read [`references/prompting.md`](references/prompting.md) before you help word one. [Guide page 2](../../docs/guide/02-jstack.md) has examples.

There is no persistent custom mode. Type `/jstack` at the start of each task. In opencode, the installer generates `/jstack` as a slash command. In Claude Code, invoke the linked skill by its slash command.

In a mid-task chat, "new task" makes jstack match a fresh playbook. `/jstack` already uses `jstack-agent` for the subagents its playbook steps spawn. To get the same style from a subagent of your own, spawn it as `jstack-agent`.

## Pick a skill

The default answer is `/jstack`, which runs most other skills when its steps need them. Name a skill directly when the user wants more or less than the playbook gives. Read the skill before you recommend it, and give one example prompt.

| The user wants to | Skill |
|---|---|
| Do any non-trivial task with rigor | [`/jstack`](../jstack/SKILL.md) |
| Know how code works now, or where new code should live | [`/how`](../how/SKILL.md) |
| Know why code is shaped this way, or where a number came from | [`/why`](../why/SKILL.md) |
| Understand a change or subsystem, explained plainly | [`/teach`](../teach/SKILL.md) |
| Catch up on their own recent work on a topic | [`/recall`](../recall/SKILL.md) |
| Find what a small diff could break outside itself | [`/blast-radius`](../blast-radius/SKILL.md) |
| Settle types and module shape before code that crosses a function boundary | [`/architect`](../architect/SKILL.md) |
| Get several attempts at one brief, merged into the best one | [`/arena`](../arena/SKILL.md) |
| Run parallel checks over slices, or race workers | [`/swarm`](../swarm/SKILL.md) |
| Have different models review a diff and try to break it | [`/interrogate`](../interrogate/SKILL.md) |
| Fix a bug test-first when a cheap local test exists | [`/tdd`](../tdd/SKILL.md) |
| Apply TypeScript rules to `.ts` or `.tsx` work | [`/typescript-best-practices`](../typescript-best-practices/SKILL.md) |
| Strip comments before review, using a reviewer that did not write them | [`/no-comments`](../no-comments/SKILL.md) |
| Clean AI tells out of prose | [`/unslop`](../unslop/SKILL.md) |
| Write docs, an RFC, a README, an MR description, or a commit message to a standard | [`/technical-writing`](../technical-writing/SKILL.md) |
| Hear the last reply again in plain words | [`/bro`](../bro/SKILL.md) |
| Give agents a scripted way to drive the app and prove behavior | [`/create-verification-skill`](../create-verification-skill/SKILL.md) |
| Bring a verification skill and its feature map back in line with the app | [`/maintain-verification-skill`](../maintain-verification-skill/SKILL.md) |
| Vet a performance number before reporting or acting on it | [`/benchmark-checklist`](../benchmark-checklist/SKILL.md) |
| Run a large or cross-cutting change, or one to review after stepping away | [`/figure-it-out`](../figure-it-out/SKILL.md) |
| Keep a decision log during a run, and review it afterward | [`/show-me-your-work`](../show-me-your-work/SKILL.md) |
| Pick a model for each role | [`/setup-jstack`](../setup-jstack/SKILL.md) |
| Turn their own working habits into a personal skill | [`/automate-me`](../automate-me/SKILL.md) |
| Turn what a finished task taught into skill edits | [`/reflect`](../reflect/SKILL.md) |
| Stop agents from repeating the same mistakes in this repo | [`/correct`](../correct/SKILL.md) |
| Find their way around jstack | `/jstack-help` |

If a skill directory next to this one is missing from the table, read its frontmatter and route by its description. The `principle-*` directories are covered under principles below.

Close calls:

- `/how` explains what the code does. `/why` explains the reasons. `/teach` runs one or both and explains the result plainly.
- `/arena` gives every worker the same brief and merges the best parts. `/swarm` splits work into slices or a race and returns one report.
- `/architect` implements right after it settles the design. Add "with checkpoint" to review the design before it writes code.
- `/interrogate` reviews the diff. `/blast-radius` looks for breakage outside the diff and proves the one fact that makes the change safe.
- `/recall` rebuilds context across recent chats. Resuming one specific chat or branch is the Session pickup playbook.
- `/figure-it-out` designs one rigorous run. The Orchestrate playbook runs a program that spans days and many MRs. The Autonomous run playbook drives one task to a finish condition.

Not in jstack:

- External code-cleanup and UI-control commands are not part of jstack.
- `/loop` is a Claude Code built-in, not a jstack skill.
- jstack has no `/orchestrate` skill. Orchestrate is a `/jstack` playbook. If the slash menu shows `/orchestrate`, another tool provides it.

## Playbooks and principles

Playbooks are step lists inside `/jstack`, not skills, so they have no slash command. Inside `/jstack`, describing the task picks one, and these phrases name one directly:

- "babysit this MR" or "check on MR 123" runs Babysit. It drives the MR to merge-ready and stops there. It does not merge unless the user asks to merge, land, or ship.
- "land the stack" runs Shipping.
- "take over this branch" runs Session pickup.
- "pause safely" runs Pause safely.
- "full autopilot on this queue" runs Autopilot-full. "stack them, do not ship" runs Autopilot-stack.
- "run the eval playbook" runs Eval.

The Playbooks section of [`jstack`](../jstack/SKILL.md) lists every playbook and when it applies. [Guide page 6](../../docs/guide/06-verify-and-ship.md) covers opening, babysitting, and landing an MR.

jstack has no planning skill. Claude Code Plan Mode works alongside it. opencode has a plan agent. For work that spans phases or stacked MRs, asking `/jstack` for a plan runs the [Multi-phase plan playbook](../jstack/playbooks/multi-phase-plan.md), which writes the plan and does not implement it. For a design question, the Prototype playbook or `/architect` settles it in code first.

Principles are one-rule skills that `/jstack` reads and cites in its replies. The user rarely invokes one. They steer with the names instead, as in "apply prove it works. show me the real output." Typing `/principle-<name>` still loads one on demand. [Guide page 8](../../docs/guide/08-principles.md) lists them.

## Fix a run that went wrong

| Symptom | Fix |
|---|---|
| The next task did not use jstack | Type `/jstack` at the start of that task. There is no persistent custom mode. |
| A question got treated as the next step of the last task | Say "new task", or say the turn does not need jstack. |
| A new model choice had no effect | The settings apply to the next skill run. Start a new task with `/jstack`. |
| Runs cost more than expected | See the cost paragraph under Get set up. |
| A skill did not load | Run `scripts/install.sh` again from the repository root. Then start a new Claude Code or opencode session. |
| Parallel agents overwrote each other | Give each agent its own worktree. |
| An overnight run moved but finished nothing | An overnight loop needs a check that can pass or fail, not a duration. See [guide page 7](../../docs/guide/07-overnight.md). |
| The reply claims success from a green build | Ask for the real command, flow, stored value, or profile. That is the prove-it-works principle. |

For a run that drifts, [`references/prompting.md`](references/prompting.md) has one-line steers. [Guide page 10](../../docs/guide/10-recipes-and-pitfalls.md) has more pitfalls and the recipes worth copying.

## Make jstack my own

- [`/automate-me`](../automate-me/SKILL.md) drafts a personal skill from the user's own history, to use alongside `/jstack`.
- [`/reflect`](../reflect/SKILL.md) turns lessons from a session into skill edits the user approves.
- `/jstack write a skill for <workflow>` runs the authoring playbook. The Eval playbook tests a skill change blind.
- Fix a misbehaving skill in its own MR, not inside feature work where it went wrong.

[Guide page 9](../../docs/guide/09-make-it-yours.md) covers each of these.

## Reply

Lead with the answer. Give at most one example prompt in a code block, adapted from [`references/recipes.md`](references/recipes.md) when one fits, then link the source file. Keep it short unless the user asked for the whole map.
