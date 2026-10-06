# Harness

jstack runs in Claude Code and in opencode v2. Skills name an action ("spawn a subagent", "ask the operator", "wake on an event"). This file maps each action to the tool that performs it in each harness. When a skill and this file disagree on a tool name, this file wins.

## Which harness am I in?

- An `Agent` tool and `AskUserQuestion` are available, or `$CLAUDE_CODE_ENTRYPOINT` is set. You are in **Claude Code**. `claude-desktop` means the desktop app, which adds a built-in browser pane and Terminal-panel tabs.
- A `subagent` tool and a `question` tool are available. You are in **opencode**.

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
  opencode2 run --auto -m <provider>/<model> --title "jstack <role>" \
    "Read and follow the brief in <abs-path>/.jstack/runs/<name>.brief.md. Write your final report to <abs-path>/.jstack/runs/<name>.report.md." \
    > .jstack/runs/<name>.log 2>&1
  ```

  Write the brief to the file first. It carries everything an `Agent` prompt would carry: the task, file pointers, the output contract, and whether the agent may edit files. Run the command with `run_in_background: true` (Claude Code) or `background: true` (opencode). Read the report when the notification arrives. A missing report means the run failed, so read the log tail before retrying. For a read-only role, say "do not edit files" in the brief. `opencode2 run` has no read-only switch.

- **`inherit`**. Spawn on the parent's model. In Claude Code, omit `model`. In opencode, use the `general` or `explore` agent.

A panel role (a list) spawns one agent per entry, all in one message. Mixed lists are normal: `claude:opus, opencode:opencode-go/grok-4.7` spawns one `Agent` call and one background `opencode2 run`. Launch them together and wait for all.

`opencode2 run` agents cannot spawn further jstack subagents through `Agent`. A brief for an opencode-run agent never asks it to fan out. Fan out from the parent instead.

### Dispatch failures

- `name must be at most 64 characters`, or every request rejected. A globally enabled MCP server exposes a tool name that is too long for the provider. Write a project `opencode.json` that disables the global MCP servers for the run (`{"mcp":{"<server>":{"enabled":false}}}`), add it to `.git/info/exclude`, and retry. Never edit the operator's global opencode config.
- An auth-looking error right after a model id. The id was renamed or removed. Check it with `opencode2 models | grep -x '<provider>/<model>'` and ask the operator to rerun `/setup-jstack`. Never substitute a similar model silently.
- Out of context, or a tool error. Re-dispatch with a smaller scope or the same brief on a different model in the same role. Two retries per task, then escalate.

## Waiting

Never sleep in the foreground and never poll a terminal on a timer. In Claude Code, a background `Bash` or `Agent` notifies you on exit, and `/loop` in dynamic mode handles external state the harness cannot see (a pipeline, a deploy) with a delay matched to how fast that state changes. In opencode, a `background: true` shell command notifies the session on exit. For an external state, run a bounded wait loop in the background:

```bash
deadline=$(( $(date +%s) + 45*60 ))
until <condition> || [ "$(date +%s)" -gt "$deadline" ]; do sleep 30; done
```
