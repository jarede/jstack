# Harness

jstack runs in Claude Code and in opencode v2. Skills name an action ("spawn a subagent", "ask the operator", "wake on an event"). This file maps each action to the tool that performs it in each harness. When a skill and this file disagree on a tool name, this file wins.

## Which harness am I in?

- An `Agent` tool and `AskUserQuestion` are available, or `$CLAUDE_CODE_ENTRYPOINT` is set. You are in **Claude Code**. `claude-desktop` means the desktop app, which adds a built-in browser pane and Terminal-panel tabs.
- A `subagent` tool and a `question` tool are available. You are in **opencode**.

## Which terminal host launched me?

The harness says which agent you are. The terminal host decides how an `opencode:` delegate is launched. Check it once, before the first dispatch, with `env | grep -E '^(ORCA_APP_VERSION|ORCA_TERMINAL_HANDLE|HERDR_PANE_ID|CLAUDE_CODE_ENTRYPOINT)='`, and take the first row that matches:

| Host | Marker | Delegate launch |
|---|---|---|
| **Orca** | `ORCA_APP_VERSION` and `ORCA_TERMINAL_HANDLE` are set | a split pane next to your own terminal (Dispatch, **Orca**) |
| **herdr** | `HERDR_PANE_ID` is set | a split pane next to your own pane (Dispatch, **herdr**) |
| **Claude desktop** | `CLAUDE_CODE_ENTRYPOINT=claude-desktop` and neither marker above | background shell with the watchdog (Dispatch) |
| plain terminal | none of the above | background shell with the watchdog (Dispatch) |

Orca and herdr win over Claude desktop because they wrap the agent's own terminal. Under Orca, a background `opencode2 run` or `opencode run` started from the agent's shell hung with an empty log five times in a row, and the same brief started in an Orca pane ran at once. Inside a host, never launch a delegate as a background shell child. The pane keeps the run visible to the operator next to the coordinator, in the same tab.

## Tool map

| Action | Claude Code | opencode |
|---|---|---|
| Ask the operator a structured question | `AskUserQuestion` (2 to 4 options, recommended first) | `question` |
| Track playbook steps | the todo tool (`TodoWrite` or `TaskCreate`) | `todowrite` |
| Spawn a subagent | `Agent` with `subagent_type`, `model`, `run_in_background`, and `isolation: "worktree"` when it needs its own checkout | `subagent` with an agent id. The model comes from the agent's config, so use **Dispatch** below to pick a model per call |
| Read-only explorer | `subagent_type: "Explore"` | agent `explore` |
| General worker | `subagent_type: "general-purpose"` | agent `general` |
| jstack worker (reads `jstack` first) | `subagent_type: "jstack-agent"` | agent `jstack-agent` |
| Comment reviewer | `subagent_type: "comment-sicko"` | agent `comment-sicko` |
| Run a specific model from any family | **Dispatch** below | **Dispatch** below |
| Load a routed skill | `Read ~/.claude/skills/<id>/SKILL.md`. The `Skill` tool refuses skills marked `disable-model-invocation`, and almost every jstack skill is | `skill` tool with the id, or read the same file |
| Wake on an event or keep looping | `/loop` in dynamic mode, a background `Bash` (the harness notifies you when it exits), or `Monitor` | `shell` with `background: true` (the session is notified when it exits) |
| Isolated checkout | `isolation: "worktree"` on `Agent`, or `git worktree add` | `git worktree add`, then run the agent with that directory as its working dir |
| Plan mode | `EnterPlanMode` | agent `plan` |
| Code cleanup pass before commit | `/simplify`, then the **unslop** and **no-comments** skills | the **unslop** and **no-comments** skills, then a laziness pass per **principle-laziness-protocol** |
| Drive a real UI | the project's `verify-*` skill first. Otherwise the built-in browser tools (`mcp__Claude_Browser__*`), the iOS simulator tool, or the `run` skill | the project's `verify-*` skill first. Otherwise the Playwright MCP when it is enabled |
| Your own transcripts | `~/.claude/projects/<slug>/<session-id>.jsonl`. `<slug>` is the absolute workspace path with every `/` and `.` replaced by `-` | the `message` and `part` tables of `~/.local/share/opencode/opencode.db` (`sqlite3`), filtered by the session's project directory |
| Project-local skills | `.claude/skills/<id>/SKILL.md` | `.claude/skills/` is read too, so write project skills there |
| Scratch state (briefs, reports, logs, trails) | `.jstack/` at the repository root | same |

Add `.jstack/` to `.git/info/exclude` before writing there, unless the task says the trail gets committed.

## Dispatch: run a role on its configured model

Every role has a model in `~/.config/jstack/models.conf` (see `models.md`). The value decides how you spawn:

- **`claude:<alias>`** (`opus`, `sonnet`, `haiku`, `fable`). In Claude Code, call `Agent` with `model: "<alias>"`. In opencode there is no Claude provider by default, so run the role as `inherit` and say so in the reply.
- **`opencode:<provider>/<model>[#variant]`**. In both harnesses, shell out to opencode in the background:

  ```bash
  mkdir -p .jstack/runs
  log=.jstack/runs/<name>.log
  opencode2 run --auto -m <provider>/<model> --title "jstack <role>" \
    "Read and follow the brief in <abs-path>/.jstack/runs/<name>.brief.md. Write your final report to <abs-path>/.jstack/runs/<name>.report.md." \
    > "$log" 2>&1 &
  pid=$! size=0 idle=0
  while kill -0 "$pid" 2>/dev/null; do
    sleep 30
    now=$(wc -c < "$log")
    if [ "$now" -eq "$size" ]; then idle=$((idle + 30)); else idle=0 size=$now; fi
    if { [ "$size" -eq 0 ] && [ "$idle" -ge 120 ]; } || [ "$idle" -ge 600 ]; then
      kill "$pid"; echo "STALLED: log idle for ${idle}s" >> "$log"; exit 124
    fi
  done
  wait "$pid"
  ```

  The loop is the stall watchdog. `opencode2 run` talks to a shared local opencode server and has no timeout of its own. When that server is unhealthy, the request never becomes a session and the client waits forever with an empty log. A run whose log is still empty after 2 minutes never started. A run whose log stops growing for 10 minutes is stuck. Both exit 124, so the background notification arrives instead of silence. Never dispatch without the watchdog.

  Write the brief to the file first. It carries everything an `Agent` prompt would carry: the task, file pointers, the output contract, and whether the agent may edit files. Run the command with `run_in_background: true` (Claude Code) or `background: true` (opencode). Read the report when the notification arrives. A missing report means the run failed, so read the log tail before retrying. For a read-only role, say "do not edit files" in the brief. `opencode2 run` has no read-only switch.

  Under a terminal host (see **Which terminal host launched me?**), launch the same command in a split pane of your own tab instead of the background shell. Use the `opencode` binary, not `opencode2`. The pane replaces the watchdog's job of making silence visible, so wait on the pane instead:

  - **Orca.** `orca terminal split --terminal "$ORCA_TERMINAL_HANDLE" --direction horizontal --command "opencode run --auto -m <provider>/<model> '<prompt>'" --json` opens the pane and returns its `handle`. Check that it started with `orca terminal read --terminal <handle> --json` (the first `> build · <model>` line appears within seconds). Wait with `orca terminal wait --terminal <handle> --for exit --timeout-ms 1800000 --json` as a background command. Read `wait.satisfied`, then the report.
  - **herdr.** `herdr pane split --pane "$HERDR_PANE_ID" --direction right --cwd <repo>` opens the pane. Take the new pane id from its output (or from `herdr pane list`), then `herdr pane run <pane-id> "opencode run --auto -m <provider>/<model> '<prompt>'" --no-focus`. Check the start with `herdr pane read <pane-id> --lines 20`. Wait with `herdr pane wait-output <pane-id> --regex '<the report path or the shell prompt>'` as a background command, then read the report.

  Close the pane once the run exits and you have read the report: `orca terminal close --terminal <handle> --json` (Orca) or `herdr pane close <pane-id>` (herdr). A finished run left open clutters the operator's tab.

  An empty pane after 2 minutes is the same stall the watchdog catches. Report it, and count it toward the two retries in **Dispatch failures**.

- **`inherit`**. Spawn on the parent's model. In Claude Code, omit `model`. In opencode, use the `general` or `explore` agent.

A panel role (a list) spawns one agent per entry, all in one message. Mixed lists are normal: `claude:opus, opencode:opencode-go/grok-4.7` spawns one `Agent` call and one background `opencode2 run`. Launch them together and wait for all.

`opencode2 run` agents cannot spawn further jstack subagents through `Agent`. A brief for an opencode-run agent never asks it to fan out. Fan out from the parent instead.

### Dispatch failures

- `name must be at most 64 characters`, or every request rejected. A globally enabled MCP server exposes a tool name that is too long for the provider. Write a project `opencode.json` that disables the global MCP servers for the run (`{"mcp":{"<server>":{"enabled":false}}}`), add it to `.git/info/exclude`, and retry. Never edit the operator's global opencode config.
- An auth-looking error right after a model id. The id was renamed or removed. Check it with `opencode2 models | grep -x '<provider>/<model>'` and ask the operator to rerun `/setup-jstack`. Never substitute a similar model silently.
- Exit 124 with `STALLED` at the log tail. The watchdog killed a run that never started or stopped moving. In `~/.local/share/opencode/log/opencode.log`, a healthy run shows server activity for its directory (git snapshots) within a second of its `cli starting` line. A stalled one shows nothing after it, often right after a server `InterruptError`. Re-dispatch the same brief once. It counts toward the two retries below.
- Out of context, or a tool error. Re-dispatch with a smaller scope or the same brief on a different model in the same role. Two retries per task, then escalate.

## Waiting

Never sleep in the foreground and never poll a terminal on a timer. In Claude Code, a background `Bash` or `Agent` notifies you on exit, and `/loop` in dynamic mode handles external state the harness cannot see (a pipeline, a deploy) with a delay matched to how fast that state changes. In opencode, a `background: true` shell command notifies the session on exit. For an external state, run a bounded wait loop in the background:

```bash
deadline=$(( $(date +%s) + 45*60 ))
until <condition> || [ "$(date +%s)" -gt "$deadline" ]; do sleep 30; done
```
