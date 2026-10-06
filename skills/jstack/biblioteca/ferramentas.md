# Tools across harnesses

Adapted from pstack poteto-mode (Lauren Tan, MIT).

jstack runs in Claude Code and in opencode (v2). The process is the same; the tool that does each
action differs. Use this table whenever a step says "ask", "track", "delegate" or "run another
model".

## Which harness am I in?

- `$CLAUDE_CODE_ENTRYPOINT` is set → **Claude Code**. `claude-desktop` means the desktop app: no
  herdr; visible agents run in Terminal-panel tabs (see skill `orchestrating-herdr-agents`).
- Otherwise, if you have the `question` and `subagent` tools → **opencode**.

## Equivalents

| Action | Claude Code | opencode v2 |
|---|---|---|
| Ask the user | `AskUserQuestion` (2–4 options, recommended first); if it is not available, lettered options in text; state the default you proceed on and keep working on what the question does not block | `question` tool; without it, write the question with lettered options; state the default you proceed on and keep working on what the question does not block |
| Track the steps | the task / todo tool | no todo tool: write the checklist to `.agentes/jstack-<tema>.md` and update it as steps finish |
| Delegate to a fresh agent | `Agent` tool (subagent) | `subagent` tool |
| Run a non-Claude model | `opencode2 run --auto -m <model> "..."` (skill `orquestra`, `orchestrating-herdr-agents`) | same command from `shell`, or `subagent` with a configured agent |
| Run commands | `Bash` | `shell` |
| Read / edit files | `Read`, `Edit`, `Write` | `read`, `edit`, `write`, `patch` |
| Load an on-demand skill | the user types `/jstack`, `/jstack-setup`, `/por-que`, `/corrigir`, `/refletir` | the user types `/jstack`, `/jstack-setup`, `/por-que`, `/corrigir`, `/refletir` (commands) or `@jstack`; the model cannot load these with `skill` — read the file instead |
| Wait in the background or keep going | `run_in_background` or `/loop` | a background shell command writing to a file |
| Read a previous session | `~/.claude/projects/<cwd with / and . replaced by ->/*.jsonl`, newest first | this directory's session in `~/.local/share/opencode/opencode.db` |

## Rules that hold in both

- Ask only as `autonomia.md` (Before you ask) allows. A question states the default you take
  meanwhile. Keep doing the work the question does not block.
- Long-running waits run in the background (Claude Code: `run_in_background`; opencode: a
  background shell command writing to a file) and are bounded by a deadline.
- Paths in jstack files are relative to the file that contains them. From an installed copy,
  `~/.claude/skills/jstack/` is the base for `playbooks/` and `biblioteca/`.
