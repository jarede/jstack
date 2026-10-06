# Mechanics: environment, dispatch and waiting

Reference for the reviewer's brief and for your own setup. The skill body covers the roles and the
contracts; this file covers the commands.

**REQUIRED BACKGROUND:** orchestrating-herdr-agents, for pane layout and the failure modes of
waiting on an agent. In the Claude desktop app, skip to **Claude Desktop App** below.

## Prepare the Environment First

Do this before dispatching anything, or the first agent fails in a way that looks like a model
problem and is not:

```bash
cat > opencode.json <<'EOF'
{"$schema":"https://opencode.ai/config.json",
 "mcp":{"<each global MCP server>":{"enabled":false}}}
EOF
printf 'opencode.json\n.agentes/\n' >> .git/info/exclude
mkdir -p .agentes
```

**Disabling the global MCP servers is not optional.** Some MCP tool names exceed the API's 64-char
limit, and the provider then rejects *every* request with `name must be at most 64 characters`.
Never fix this by editing the user's global opencode config. List the servers with
`python3 -c "import json;print(list(json.load(open('$HOME/.config/opencode/opencode.json'))['mcp']))"`.

Also: confirm the suite is green *before* any agent runs. Without that baseline you cannot tell a
delegated break from a pre-existing one.


## Claude Desktop App: Tabs Instead of herdr

`echo $CLAUDE_CODE_ENTRYPOINT` prints `claude-desktop` → this section replaces **Fan Out Into
Panes** below. Do not call `herdr` at all: `herdr pane current` still answers from the desktop app
and returns a pane of some *other* session of the user, so a reviewer that splits it opens
agents inside unrelated work.

Only you (the engineer) have the Terminal-panel tools; the reviewer is an `opencode2` process and
cannot open tabs. So:

1. **You launch the reviewer in its own tab** with `mcp__terminal__run_in_terminal`
   (`title="revisor"`, `cwd=<project>`). One line, printable ASCII, fish syntax — accents are
   refused before anything runs, so write `instrucoes`:
   `opencode2 run --auto -m <reviewer-model> "Leia e siga integralmente as instrucoes em <abs>/.agentes/revisor.md"`
2. **The reviewer's brief tells it to dispatch implementers as background processes, one log each**
   — give it the line verbatim, in place of the herdr commands:
   ```bash
   opencode2 run --auto -m <model> "Leia e siga integralmente as instrucoes em <abs>/.agentes/tarefa-NN.md" > <abs>/.agentes/log-NN.txt 2>&1 &
   ```
   plus the same blocking loop and termination condition as in the herdr flow.
3. **You open one watch tab per implementer** so the human sees each task:
   `run_in_terminal title="tarefa-NN"` with `tail -F <abs>/.agentes/log-NN.txt`. `-F` waits for a
   log that does not exist yet, so you can open them right after launching the reviewer.
4. **You wait with the Bash tool**, `run_in_background: true`:
   `sh -c 'fim=$(( $(date +%s) + <horas>*3600 )); until [ -f <abs>/.agentes/RELATORIO-FINAL.md ] || [ $(date +%s) -gt $fim ]; do sleep 30; done'` — then end the turn
   and let the notification wake you. Never poll `read_terminal` on a timer.
5. **Liveness** is unchanged (`ps aux | grep '[o]pencode.*run'`); `read_terminal` on the
   reviewer tab shows whether it is back at a fish prompt, i.e. exited early.
6. **After the final review, close every tab you opened**: `stop_terminal_tab {tab_id, close: true}`.

No pane limits apply: tabs are full width.

## Fan Out Into Panes of the Current herdr Session (not in the desktop app)

The reviewer dispatches **several implementers at once** when tasks are independent — and puts each
one in its own pane of the session the human is already watching, so the work is visible as it
happens rather than reconstructed from a report afterwards.

**The reviewer runs in its own pane and opens the implementers' panes itself.** You start it; it
does the fan-out. This only happens if **its brief hands it the herdr commands** — a reviewer told
only to "dispatch agents" defaults to synchronous `opencode2 run` subprocesses nested in its own
pane, which works but shows the human a single scrolling pane instead of one per task. If the
human asked to follow along, that default silently defeats the request.

```bash
herdr pane current                                   # tab_id and workspace to build in
herdr pane split <pane> --direction right --ratio 0.5 --cwd "$PWD" --no-focus
herdr pane run <new-pane> "opencode2 run --auto -m <model> \
  \"Leia e siga integralmente as instrucoes em <caminho absoluto>/.agentes/tarefa-NN.md\""
```

**Layout limits are hard:** at most 4 panes per tab, never narrower than ~80 columns — an agent TUI
in a too-narrow pane crashes *after* reporting ready. Beyond four, open another tab and spread
evenly (5 agents is 3 + 2, not 4 + 1). `herdr tab create` does not print its pane; find it with
`herdr pane list` matching on `tab_id`.

**Independence is about files, not about the plan's wording.** Two tasks that both edit
`models.py` are not independent, whatever the plan says they are. Either serialise them or give
each a git worktree. When in doubt, serialise: a merge conflict between agents costs more than the
wall-clock you saved.

**Wait on the report file, not on the agent.** `herdr agent wait` and `agent prompt --wait` do not
work with `opencode2` (it is one-shot, with no state-reporting plugin), and
`pane wait-output --regex '❯\s*$'` matches the prompt that was already on screen and returns
instantly. Poll for the file the brief demanded, ~20s apart, in a backgrounded command. Falling
back to `herdr pane read <pane>` tells you what went wrong when a report never appears.

**Put the loop in the reviewer's brief verbatim.** Because no wait command works here, a reviewer
told only to "wait for the implementers" has nothing to run — it dispatches, finds nothing left to
do, and exits while the implementers commit unreviewed. Hand it the loop and the condition that
ends its run:

```bash
fim=$(( $(date +%s) + 45*60 ))
until [ -f <abs>/.agentes/relatorio-02.md ] || [ "$(date +%s)" -gt "$fim" ]; do sleep 20; done
```

**Retry by failure mode**, not blindly: ran out of context → re-dispatch with a smaller scope;
tool/provider error → same brief on a different model; BLOQUEADO with a real reason → back to the
engineer. Two retries on one task, then escalate it to the engineer and record why.

**Check the reviewer is alive before trusting progress.** One process per live agent:

```bash
ps aux | grep '[o]pencode.*run'   # reviewer's model missing => it exited early
```

A reviewer pane back at a shell prompt while implementer panes still scroll means the same thing.
Relaunch with a verification-phase brief (see SKILL.md); do not absorb the review yourself.

**REQUIRED BACKGROUND:** orchestrating-herdr-agents, for pane mechanics and the failure modes of
waiting.

