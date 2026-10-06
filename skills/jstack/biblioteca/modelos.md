# Models

Which model plays each role is decided once, by the user, with `/jstack-setup`, and stored in
`~/.config/jstack/modelos.conf`. **Never pick a model yourself**: the cost is the user's.

## The file

```
# jstack — modelo por papel. Gerado por /jstack-setup. Apague uma linha para voltar ao padrao.
# Variante opcional: provedor/modelo#variante (repassada ao opencode2 run -m).
orquestra revisor:        opencode-go/deepseek-v4.1-flash
orquestra implementador:  opencode/muse-spark-1.3-contributor-free
interrogar revisores:     opencode-go/deepseek-v4.1-flash, opencode-go/kimi-k3, opencode-go/glm-5.3
interrogar claude:        inherit
arena candidatos:         opencode-go/deepseek-v4.1-flash, opencode-go/kimi-k3
arena juiz:               opencode-go/grok-4.7
longa auditor:            opencode-go/gpt-6-luna
```

## Looking up a role

1. Read the line that starts with the role name followed by `:`.
2. The value is one model, or a list separated by `,`. Trim spaces. A list means one agent per
   entry.
3. `inherit` (only for `interrogar claude`) means the Claude subagent runs on the session's model.
4. If the user's request names a model for this run ("usa o kimi para revisar"), that wins for this
   run only. Do not edit the file.

## Before dispatching

Check each opencode id still exists, ignoring a `#variante` suffix:

```bash
opencode2 models | grep -qx 'opencode-go/kimi-k3' && echo ok || echo FALTA
```

## When the file or a role is missing or invalid

- No `modelos.conf`, no line for the role, or an id that `opencode2 models` no longer lists →
  **ask the user once** which model to use for this run, offering the ids from `opencode2 models`,
  and suggest running `/jstack-setup` to fix it for next time.
- Never substitute a similar model silently. A renamed id fails at dispatch with an error that
  looks like an authentication problem.
