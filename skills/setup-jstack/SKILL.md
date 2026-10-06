---
name: setup-jstack
description: Configure which model jstack uses per role. Detects the Claude aliases and opencode models available and writes ~/.config/jstack/models.conf, which overrides the skill defaults. Use for /setup-jstack, "configure jstack models", or changing jstack's model choices.
disable-model-invocation: true
---

# Setup jstack

Write `~/.config/jstack/models.conf`, the file that sets jstack's model per role. The roles, the value syntax, and the defaults live in the jstack skill's `references/models.md`. Read it first.

## Steps

### 1. Detect available models

- Claude aliases: `opus`, `sonnet`, `haiku`, and `fable` are valid in Claude Code. Write them as `claude:<alias>`.
- opencode models: run `opencode2 models`. Each line is a valid `opencode:<line>` value. A `#variant` suffix is passed through to `opencode2 run -m` unchanged, so only accept one the operator typed.
- `inherit` is always valid. It runs the role on the parent chat model.

If `opencode2` is missing, offer only `claude:` values and `inherit`, and say that the opencode defaults cannot run. Never write an `opencode:` id that `opencode2 models` did not print.

### 2. Load current state

If `~/.config/jstack/models.conf` exists, read it and treat its values as the current choices. Otherwise start from the defaults in `references/models.md`. A line whose role is not in that table is from a retired role. Drop it and list it in step 3.

### 3. Show the roles and confirm

Show every role with its current model, marking any value step 1 could not confirm as needing a choice. Ask once, with the question tool from the jstack skill's `references/harness.md`, whether to accept as-is or change specific roles. Offer the detected models plus `inherit`. For panel roles (`arena runners`, `architect runners`, `interrogate reviewers`) the value is a list, one subagent per entry, so the list length sets the fan-out. Recommend two model families in every panel, since a second opinion from the same model is not one. `arena cross-judge pool` is also a list, but arena picks one entry whose family differs from the parent's.

### 4. Validate

Every `opencode:` value must be a line of `opencode2 models`. Every `claude:` value must be one of the four aliases. If a choice fails, ask again for that role only.

### 5. Write the file

Overwrite the whole file so reruns stay idempotent. Shape:

```
# jstack models. Written by /setup-jstack. One line per role. Delete a line to fall back to the default.
# Values: claude:<opus|sonnet|haiku|fable>, opencode:<provider>/<model>[#variant], inherit.
# A list (comma-separated) spawns one agent per entry.
feature, refactoring: opencode:opencode-go/grok-4.7
bug-fix: opencode:opencode-go/grok-4.7
perf-issue: opencode:opencode-go/grok-4.7
hillclimb: opencode:opencode-go/grok-4.7
judgment and prose: claude:opus
hardest tasks: claude:opus
how explorer: opencode:opencode-go/grok-4.7
how explainer: claude:opus
why investigators: opencode:opencode-go/grok-4.7
why synthesizer: claude:opus
reflect tooling: opencode:opencode-go/grok-4.7
reflect judgment, divergent, synthesizer: claude:opus
arena runners: claude:opus, opencode:opencode-go/grok-4.7
arena cross-judge pool: claude:opus, opencode:opencode-go/grok-4.7
swarm workers: opencode:opencode-go/grok-4.7
architect runners: claude:opus, opencode:opencode-go/grok-4.7
interrogate reviewers: claude:opus, opencode:opencode-go/grok-4.7
```

### 6. Smoke-test one opencode model

Run one cheap dispatch per distinct `opencode:` model you wrote, in the background, per `references/harness.md` (Dispatch), with the brief "Reply with the single word ok." A failure here is cheaper than a failure mid-review. Report each model as working or failing, with the log tail for a failure.

### 7. Confirm

Tell the operator the file was written and that it applies from the next skill run. Rerunning this skill updates it.

### 8. Offer a verification skill (optional)

Check whether the current project has a way to drive the real app for proof (a `verify-*` skill under `.claude/skills/`, or an existing harness). If not, offer once to generate one with the **create-verification-skill** skill. On yes, read `~/.claude/skills/create-verification-skill/SKILL.md` and follow it. On no, move on without pushing.
