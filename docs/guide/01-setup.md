# Set up jstack

In this page you install jstack, choose its models, and run your first task. You can use Claude Code's desktop app or CLI.

## Install jstack

From the jstack repository root, run:

```sh
./scripts/install.sh
```

The installer links skills into `~/.claude/skills`. opencode reads the same folder. It also generates an opencode slash command for each user-facing skill.

## Pick your models

Run:

```text
/setup-jstack
```

[`/setup-jstack`](../../skills/setup-jstack/SKILL.md) detects available models and asks which model to use for each role. It writes `~/.config/jstack/models.conf`, which the jstack skill reads.

The file stores one model choice per role. Read the jstack skill's [`references/models.md`](../../skills/jstack/references/models.md) for role defaults and value formats.

You only need to change the roles you want. A role with no line in the file uses its default. Delete a role's line to restore its default. A panel role accepts a list, with one subagent for each entry.

Set a role to `inherit` to run it on the parent chat's model. It is not a model name.

## Accept the verification offer, or don't

At the end of setup, `/setup-jstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.claude/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It tests the skill once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to jstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

After setup, start a new task with `/jstack`. Type `/jstack` at the start of every task. There is no persistent custom mode.

## Keep the cost in check

jstack spends extra tokens on subagents and review panels. To spend fewer:

- Rerun `/setup-jstack` and pick cheaper models for roles that do not need the strongest model.
- Set a role to `inherit` so it runs on the chat's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `/jstack` for work that needs rigor. A small, obvious edit does not.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/jstack add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps, the Feature playbook for this prompt. If `/jstack` skips a step, it stays in the list with `skip: <reason>`.

You can type normal follow-ups after the task starts. Start each new task with `/jstack`. In opencode, the installer generates `/jstack` as a slash command.

Next: [Route work through `/jstack`](./02-jstack.md).
