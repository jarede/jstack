---
name: jstack-setup
description: Use when the user invokes /jstack-setup (or @jstack-setup) to choose or change which model plays each jstack role - orquestra reviewer and implementer, interrogar reviewers, arena candidates and judge, longa auditor.
disable-model-invocation: true
---

# jstack setup

Write `~/.config/jstack/modelos.conf`: which model plays each jstack role. The skills `orquestra`,
`interrogar`, `arena` and the playbook `longa` read it instead of asking every run. Re-running this
skill updates the file. The file stays outside the repository: it depends on the account and the
machine.

Adapted from pstack `setup-pstack` (Lauren Tan, MIT).

## Steps

### 1. Detect the available models

```bash
opencode2 models                      # one provider/model per line: the only valid opencode ids
```

Claude subagent options (role `interrogar claude` only): `opus`, `sonnet`, `haiku`, `inherit`
(`inherit` = the session's model). **Never write an id that was not detected.** If
`opencode2 models` fails, say so and stop.

### 2. Load the current state

If `~/.config/jstack/modelos.conf` exists, its values are the starting point; otherwise the
defaults below. A line whose role is not in the list below belongs to a retired role: drop it and
tell the user. A value whose id is no longer detected is marked **precisa escolher**.

### 3. Show and confirm

Show every role with its model in one table, marking **precisa escolher** where needed. Ask once:
accept as shown, or change specific roles. For a change, offer the detected ids as options (Claude
Code: `AskUserQuestion`; opencode: `question`, or lettered options and end the turn). List roles
(`interrogar revisores`, `arena candidatos`) are edited as a whole list; their length sets how many
agents run.

### 4. Validate

- Every opencode id (ignoring a `#variante` suffix) is in `opencode2 models`. If not, ask again.
- Panels should mix model families (`interrogar revisores`, `arena candidatos`), and `arena juiz`
  and `longa auditor` should be a family not used by the agents they judge. If not, **warn** and
  let the user keep the choice.

### 5. Write

Create `~/.config/jstack/` if needed and overwrite `modelos.conf` whole, in this format:

```
# jstack — modelo por papel. Gerado por /jstack-setup. Papel sem linha = perguntado na hora.
# Variante opcional: provedor/modelo#variante (repassada ao opencode2 run -m).
orquestra revisor:        opencode-go/deepseek-v4.1-flash
orquestra implementador:  opencode/muse-spark-1.3-contributor-free
interrogar revisores:     opencode-go/deepseek-v4.1-flash, opencode-go/kimi-k3, opencode-go/glm-5.3
interrogar claude:        inherit
arena candidatos:         opencode-go/deepseek-v4.1-flash, opencode-go/kimi-k3
arena juiz:               opencode-go/grok-4.7
longa auditor:            opencode-go/gpt-6-luna
```

These are the **defaults**: suggestions shown on the first run, never written without the user
confirming them in step 3.

### 6. Confirm

Show the path written and the final table. Say that it applies from the next jstack run, and that
running `/jstack-setup` again changes it.

## Roles

| Role | Used by | Value |
|---|---|---|
| `orquestra revisor` | skill `orquestra` | one opencode id |
| `orquestra implementador` | skill `orquestra` | one opencode id |
| `interrogar revisores` | skill `interrogar` | list of opencode ids |
| `interrogar claude` | skill `interrogar` | `opus`, `sonnet`, `haiku` or `inherit` |
| `arena candidatos` | skill `arena` | list of opencode ids |
| `arena juiz` | skill `arena` | one opencode id |
| `longa auditor` | playbook `longa` | one opencode id |
