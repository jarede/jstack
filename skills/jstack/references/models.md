# Models per role

Each jstack role runs on a model the operator chose once with `/setup-jstack`. The choices live in `~/.config/jstack/models.conf`, outside this repository. **Never pick a model yourself.** The cost is the operator's. `harness.md` (Dispatch) says how to spawn each kind of value.

## The file

```
# jstack models. One line per role. Delete a line to fall back to the default below.
# Values: claude:<opus|sonnet|haiku|fable>, opencode:<provider>/<model>[#variant], inherit.
# A list (comma-separated) spawns one agent per entry.
feature, refactoring: opencode:opencode-go/grok-4.7
bug-fix: opencode:opencode-go/grok-4.7
...
opencode fallback: opencode:opencode/ling-3.1-flash-free, opencode:opencode/mimo-v2.6-flash-free
```

## Roles and defaults

The defaults split work by model strength, as pstack does. Code delegates go to a fast code model through opencode. The hardest changes, prose, and judgment go to Claude Opus. Review panels pair the two families so a second opinion is a different model, not the same one twice.

| Role | Used by | Default |
|---|---|---|
| `feature, refactoring` | Feature and Refactoring code delegates | `opencode:opencode-go/grok-4.7` |
| `bug-fix` | Bug fix code delegates | `opencode:opencode-go/grok-4.7` |
| `perf-issue` | Perf issue code delegates | `opencode:opencode-go/grok-4.7` |
| `hillclimb` | Hillclimb code delegates | `opencode:opencode-go/grok-4.7` |
| `judgment and prose` | prose, review judgment, verdicts | `claude:opus` |
| `hardest tasks` | cross-cutting design, concurrency, subtle algorithms | `opencode:opencode-go/grok-4.7` |
| `how explorer` | **how** explorers | `opencode:opencode-go/grok-4.7` |
| `how explainer` | **how** explainer | `claude:opus` |
| `why investigators` | **why** source investigators | `opencode:opencode-go/grok-4.7` |
| `why synthesizer` | **why** synthesizer | `claude:opus` |
| `reflect tooling` | **reflect** tooling reviewer | `opencode:opencode-go/grok-4.7` |
| `reflect judgment, divergent, synthesizer` | **reflect** judgment, divergent, and synthesizer | `claude:opus` |
| `arena runners` | **arena** candidates (list) | `opencode:opencode-go/grok-4.7, opencode:opencode-go/deepseek-v4.1-flash` |
| `arena cross-judge pool` | **arena** judge, one picked from a family that differs from the parent's | `claude:opus, opencode:opencode-go/grok-4.7` |
| `swarm workers` | **swarm** workers | `opencode:opencode-go/grok-4.7` |
| `architect runners` | **architect** runners (list) | `claude:opus, opencode:opencode-go/grok-4.7` |
| `interrogate reviewers` | **interrogate** reviewers (list) | `claude:opus, opencode:opencode-go/grok-4.7` |

Code lines (`feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `hardest tasks`, `arena runners`, `swarm workers`) take only `opencode:` values. Claude is reserved for design, review, judgment, and prose. A `claude:` or `inherit` value on a code line is a configuration error: stop and ask the operator instead of dispatching it.

## Looking up a role

1. Read the line whose key equals the role name, followed by `:`. Trim spaces. A list means one agent per entry, and its length sets the fan-out.
2. No file, or no line for the role. Use the default above.
3. The operator named models for this run ("review with kimi and glm"). Those replace the whole role for this run only. Do not edit the file. A short name becomes a full id only when exactly one line of `opencode2 models` contains it. Otherwise ask.
4. Before the first `opencode:` dispatch in a session, confirm the id still exists with `opencode2 models | grep -x '<provider>/<model>'`, ignoring a `#variant` suffix. A missing id stops that role. Ask the operator once, covering every missing role, and suggest `/setup-jstack`. Never dispatch with only the valid part of a list unless the operator says so.

When a skill's text says "the `<role>` line", it means this lookup.

## Fallback when a model's limit runs out

The `opencode fallback` line is an ordered list of `opencode:` values, chosen in `/setup-jstack`. It is not a role. It is the only case where jstack runs a model the role line did not name, and the operator chose it in advance.

```
opencode fallback: opencode:opencode/ling-3.1-flash-free, opencode:opencode/mimo-v2.6-flash-free
```

It applies only when an `opencode:` dispatch fails because the model's limit ran out: a free tier expired, a quota or usage cap was hit, credits ran out, or a rate limit that does not clear on a single retry. `harness.md` (**Dispatch failures**) says how to recognize it. Any other failure keeps its own rule, and an auth or unknown-model error still stops the role.

1. Mark the failed model exhausted for the rest of the session. Do not try it again in this session, in any role.
2. Take the first entry of `opencode fallback` that is not exhausted, still prints in `opencode2 models`, and is not already running in the same panel (a panel keeps distinct models). Re-dispatch the same brief on it, keeping the same title and log paths with a `-fb<N>` suffix.
3. A fallback swap does not count toward the two retries in **Dispatch failures**. A fallback that fails for its own limit is marked exhausted and the next entry is tried.
4. No line, an empty line, or every entry exhausted: stop that role and ask the operator once, covering every exhausted model, and suggest `/setup-jstack`.
5. Say which model replaced which in the reply that reports the role's result, so the operator sees the swap.

Entries are `opencode:` values or `claude:<alias>`. A `claude:` entry on this line is the operator's explicit choice for the last-resort swap. It is the only place a Claude model can stand in for a code model. The code-line rule still holds for role lines: a `claude:` value on a code role line is a configuration error, and a Claude fallback never appears on a role line.
