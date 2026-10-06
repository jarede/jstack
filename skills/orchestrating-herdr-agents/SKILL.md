---
name: orchestrating-herdr-agents
description: Use when delegating a task to a CLI coding agent (opencode, codex, claude, gemini...) in a herdr terminal workspace, or from the Claude desktop app where there is no herdr - covers how to lay out panes and tabs for several agents and how to wait for them without blocking. Especially when waiting misbehaves (herdr agent wait hangs forever, returns instantly, or agent_status stays "working" long after the agent finished) or an agent dies right after starting.
---

# Orchestrating herdr Agents

## Overview

`herdr` delegates work to a second agent in its own pane: **lay out → start → prompt+wait → close**.

That flow assumes an agent herdr can track. Some CLIs — `opencode2` above all — cannot be started by `herdr agent start` at all; for those, skip to **One-Shot CLI Agents** below.

Most of that is discoverable from `herdr <cmd> --help`. This skill covers the part that is not: how herdr knows the delegated agent finished, and the ways that detection silently lies to you.

## First: Are You Inside herdr At All?

```bash
echo "$CLAUDE_CODE_ENTRYPOINT"
```

**`claude-desktop` means you are in the Claude desktop app: do not use herdr.** Go to
**Claude Desktop App** below. Of the other sections, only the `opencode.json` / global-MCP step in
**One-Shot CLI Agents** and **Completion Is Not Correctness** still apply.

Do not test with `herdr pane current`. When a herdr server is running anywhere on the machine it
answers from outside herdr too, returning the *focused pane of some other session of the user*
(another project, another worktree). Splitting or running into that pane drops agents into work
the user is doing elsewhere.

## Claude Desktop App (No herdr)

The desktop app's **Terminal panel** replaces herdr panes: each `mcp__terminal__run_in_terminal`
call opens one visible tab the user can watch, type into and Ctrl-C. Flow:
**brief file → one tab per agent → background wait on the report file → harvest → close tabs.**

```text
run_in_terminal  title="worker"  cwd=<project>
  command: opencode2 run --auto -m <provider/model> "Leia e siga integralmente as instrucoes em <abs>/.agentes/tarefa-01.md"
```

- **The command line is one line of printable ASCII, typed into the user's fish shell.** Accented
  text is refused before anything runs: write `instrucoes`, not `instruções`. Chain with `; and`,
  not bash's `&&`. Anything longer goes in a script file you run.
- **Delegate by file and require a report file**, exactly as in **One-Shot CLI Agents** below —
  the report file is still the completion signal.
- **Wait with the Bash tool, not in the terminal tab:** `run_in_background: true` with
  `sh -c 'fim=$(( $(date +%s) + 45*60 )); until [ -f <abs>/.agentes/relatorio-01.md ] || [ $(date +%s) -gt $fim ]; do sleep 20; done'`, then end your turn;
  the notification wakes you. Several agents: one loop over all report files. Do not poll
  `read_terminal` on a timer.
- **Diagnose with `read_terminal {tab_id}`** when a report never appears; liveness is
  `ps aux | grep '[o]pencode.*run'`.
- **Close what you opened** after harvesting: `stop_terminal_tab {tab_id, close: true}`.
- **No layout limits apply** — tabs are full width; the ≤ 4 panes / ≥ 80 columns rule is herdr's.
- **An agent you launch cannot open tabs** — only you have the terminal tools. A sub-agent that
  must fan out (e.g. a reviewer dispatching implementers) starts them as background processes
  with one log each — `opencode2 run ... > <abs>/.agentes/log-NN.txt 2>&1 &` — and **you** open a
  `tail -F <abs>/.agentes/log-NN.txt` tab per log so the user can follow along.

The `opencode.json` / disabled-global-MCPs requirement in **One-Shot CLI Agents** still applies.

## One-Shot CLI Agents (`opencode2`) — No Agent Tracking

`herdr agent start --kind opencode` launches the binary named `opencode`, which is
OpenCode **1.x** with a full-screen TUI. `opencode2` (the "OpenCode 2.0 preview") is a
**different binary with a different CLI**: it has no TUI session to attach to and takes the
whole task as one shot. `herdr agent start` cannot drive it, and PATH-shimming `opencode` to
point at `opencode2` does not help — the state-reporting plugin never loads.

Drive it as a plain command in a pane instead:

```bash
herdr pane run <pane> "opencode2 run --auto -m <provider/model> \"<message>\""
```

`herdr pane run` sends the text plus Enter in one call. There is no `agent_status`, no
`agent read`, and no `agent prompt --wait` — everything in the sections below about waits
and status simply does not apply. What replaces them:

- **Delegate by file, not by argument.** Write the full task to a `.md` file and make the
  message a one-liner: *"Leia e siga integralmente as instrucoes em `<caminho absoluto>` e
  execute-as até o fim, incluindo escrever o relatório final no arquivo especificado ali."*
  A multi-KB prompt pasted into a pane is where quoting breaks.
- **Require a report file.** The prompt must name an absolute path for the agent's final
  report. That file is both the result you harvest and your completion signal.
- **Wait on the artifact.** `herdr pane wait-output --regex '❯\s*$'` matches the shell prompt,
  but the snapshot it searches *already contains* the prompt from before the command, so it
  can return instantly. Prefer polling for the report file to exist (~20s interval, in a
  backgrounded command); fall back to `pane read` when you need to see what went wrong.
- **Disable the user's global MCPs.** Write an `opencode.json` in the working directory with
  each global MCP server set to `"enabled": false`, and add it to `.git/info/exclude` (not
  the repo's `.gitignore`). Without this the provider rejects every request with
  `name must be at most 64 characters` — some MCP tool names exceed the API's limit. Never
  edit the user's global opencode config to fix this.

Everything about pane layout (≤ 4 per tab, ≥ 80 columns) and "Completion Is Not Correctness"
still applies. Free models are scribes: hand them the final code literally and verify yourself.

## Before You Delegate: Check the Integration

```bash
herdr integration status
```

Every agent kind reports its state to herdr through a small plugin/hook. The line for your kind must read `current`:

```
opencode: current (v9)       ← good
opencode: outdated (v7 < v9) ← state reporting is broken
```

**A stale plugin is the single most likely cause of a hanging wait.** herdr keeps reporting `agent_status: "working"` forever, and every wait blocks until its timeout. Fix it before delegating:

```bash
herdr integration install opencode
```

The plugin is loaded at agent startup, so install it **before** `agent start` — refreshing it under a running agent does nothing for that agent.

## The Flow

```bash
herdr pane current                    # -> pane_id, tab_id, workspace_id
herdr pane split w16:p1 --direction right --ratio 0.5 --cwd "$PWD" --no-focus
herdr agent start worker --kind opencode --pane w16:p3 --timeout 120000 -- -m provider/model
# the wait goes in the BACKGROUND — see "Waiting Correctly"
herdr agent prompt worker '<task>' --wait --until idle --until done --until blocked --timeout 3600000
herdr agent read worker               # collect the result BEFORE closing
herdr pane close w16:p3
```

Agent flags go after `--`; everything before it is herdr's — and they must be the last thing on the line. Pipe the output of `agent start` into anything and a trailing `-- -m model` lands in the pipe's command instead, so the agent silently starts on its default model.

The pane must sit at an interactive shell prompt when `agent start` runs, so always lay out the panes first. `agent start` blocks until `interactive_ready: true`, so the next `prompt` is safe.

## Laying Out the Panes

**At most 4 panes per tab, and never a pane narrower than ~80 columns.** Agent TUIs are full-screen apps: an opencode pane squeezed to a third of a split does not degrade, it crashes (`oh no: Bun has crashed`, `SIGTRAP`), and it crashes *after* `agent start` reported `interactive_ready: true`, so the failure only shows up as `agent target <name> not found` when you prompt.

Split geometry per tab:

| Agents in the tab | Layout |
|---|---|
| 1 | the tab's own pane |
| 2 | one split — side by side |
| 3 | one row of three, or a split plus one |
| 4 | 2 × 2: split right, then split each half down |

Beyond 4, open another tab and spread them evenly — 5 agents is 3 + 2, not 4 + 1:

```bash
herdr tab create --workspace w1E --cwd "$PWD" --label ag-a   # one tab per group
herdr pane list                       # -> the new tab's pane_id (tab create does not print it)
```

`herdr tab create` returns the tab, not its pane, and `herdr tab list` does not carry pane ids either: map tab → pane with `herdr pane list` and match on `tab_id`.

For a 2 × 2 tab, split from the pane you want to halve, not always from the first one:

```bash
herdr pane split w1E:p5M --direction right --ratio 0.5 --cwd "$PWD" --no-focus   # -> p5N
herdr pane split w1E:p5M --direction down  --ratio 0.5 --cwd "$PWD" --no-focus   # -> p5P
herdr pane split w1E:p5N --direction down  --ratio 0.5 --cwd "$PWD" --no-focus   # -> p5Q
```

A tab is also the cheap fix when an agent dies on startup: `herdr tab close` the whole group and rebuild it, rather than nursing individual panes.

## Waiting Correctly

**Use `agent prompt --wait`. Do not use bare `agent wait` as your primary signal.**

`herdr agent wait` matches a *state*, not a *turn*. Run it against an agent that is currently idle and it matches the idle it is already in and returns instantly — a green result that proves nothing. `agent prompt --wait` first requires an observed state change within 5s of submission, so it only settles on a real turn boundary.

**Wait on `idle`, `done` and `blocked` — never on one terminal state alone.** A finished opencode agent reports **either** `idle` **or** `done`, and which one you get is not predictable: in a single session, one pair of agents settled on `idle` and the next pair on `done`. So `--until idle` can miss a real completion, and `--until done` can too. Name every terminal state you accept, and include `blocked` or a permission prompt inside the delegated agent will stall you until timeout.

The same applies to any completion check you write yourself: **treat `idle` and `done` as equally terminal.** A poll that matches only `idle` runs to its own cap while the agent has been finished for half an hour.

Bare `agent wait` is still right for re-attaching to a turn already in flight — verify `agent_status` is `working` first.

**Run the wait in the background and let the notification wake you.** A wait is a blocking call with a timeout measured in tens of minutes; held in the foreground it burns your turn on an agent that may already be done, and a foreground timeout tells you nothing about the agent. Background it, and the harness re-invokes you the moment it exits:

```bash
# run_in_background: true
herdr agent prompt worker '<task>' --wait --until idle --until done --until blocked --timeout 1800000
```

Then stop and hand the turn back. Do not poll `agent get` on a timer, do not sit in `sleep` loops, and do not re-run the wait in the foreground "just to check" — the completion notification is the signal. Waiting on several agents at once: launch all the prompts inside one backgrounded command (`... & ... & wait`) so a single notification covers the whole fan-out.

Two traps in that one-liner: the shell running it may not be your login shell, so write POSIX `for ...; do ...; done` rather than fish's `for ... end`; and a parse error kills the loop *before* any prompt is submitted, which looks exactly like agents that finished instantly with no work done. Check `git status` before believing an empty result.

## Reading the Symptoms

| Symptom | Cause | Fix |
|---|---|---|
| Wait blocks until timeout; status stuck `working` | Stale/missing integration plugin | `herdr integration install <kind>`, restart the agent |
| Wait never returns, but `agent list` shows `idle` or `done` and the work is done | Unknown — the wait can miss a real turn boundary even with a `current` plugin | Stop trusting the wait: harvest with `agent read`, then close the panes |
| Your own poll never fires though `agent list` says the agent finished | The poll matches only `idle`; this agent settled on `done` | Accept `idle` **and** `done` as terminal |
| Wait returns instantly, agent clearly still busy | Bare `agent wait` matched the current state | Use `agent prompt --wait` |
| Wait never fires though the agent finished | Only one terminal state was named | Pass `--until idle --until done --until blocked` |
| `agent target <name> not found` right after a clean start | The TUI crashed in a too-narrow pane | Rebuild the layout: ≤ 4 panes per tab, ≥ 80 columns each |
| Agent runs on the wrong model | `-- -m model` was swallowed by a pipe after `agent start` | Keep `--` args last; check `"argv"` in the start result |
| `screen_detection_skipped: true` in `agent get` | **Normal.** The plugin reports state directly, so herdr skips scraping | Nothing — this is the healthy path, not a fault |

The `screen_detection_skipped` entry is the trap: it looks like the fault and is not. Chase the plugin version, not the scraper. Its only diagnostic value is explaining why a stale plugin fails *silently* — with scraping off, herdr has no independent view of the pane to contradict a frozen status.

## `agent list` Is the Ground Truth, Not the Wait

A wait that has not returned is not evidence the agent is busy. **`herdr agent list` is the only reliable completion signal** — an `agent_status` of `idle` or `done` means the turn ended, whatever the wait is doing. Check it whenever you suspect an agent is done, and especially when a user tells you it is.

The wait can hang past a genuine turn boundary with the integration reporting `current` and the delegated agent sitting at `idle` — observed with two opencode agents prompted concurrently from one backgrounded script, both of which completed their work correctly. Neither wait ever returned; both exited only when the panes closed, with `{"error":{"code":"agent_not_running"}}`. The plugin was `current (v9)` and neither TUI had crashed, so **neither the stale-plugin row nor the narrow-pane row above explains this** — do not let them anchor your diagnosis. The cause is not established; candidates are the concurrent submissions racing the wait's 5s state-change window and the multi-KB prompt text taking too long to paste.

Practical consequence: a `--wait` that never fires means you get **no completion notification at all**. Budget for that — a delegated fan-out may need you to check `agent list` yourself rather than waiting to be woken.

## Recovering From a Hung Wait

The agent has usually already finished. Do not restart or close anything until you have the output.

1. Kill the wait (`Ctrl-C`, or stop the background task) — it is client-side and killing it does not touch the delegated agent.
2. `herdr agent read <name>` — **harvest the result first.** A restart or pane close loses it. Closing the pane also makes the pending wait exit with `agent_not_running`, which is a client-side artifact of your own cleanup and says nothing about the agent.
3. `herdr integration status` — check for a stale line. If it reads `current`, stop here: the plugin is not the fault, and reinstalling or restarting only destroys context you have already harvested.
4. Only if it is stale: `herdr integration install <kind>`, then restart the agent so it loads the new plugin.
5. Re-delegate with `agent prompt --wait --until idle --until done --until blocked`.

If the integration genuinely cannot be fixed, poll `herdr pane read <pane>` on a ~30s timer: agent TUIs show an interrupt hint (opencode: `esc interrupt`) while busy and drop it when idle. Treat this as a workaround, not the design, and never poll every few seconds.

## Completion Is Not Correctness

A settled wait means the turn ended, nothing more. Read the artifacts the agent produced and verify them yourself; delegated agents report success confidently and inaccurately. When a delegated fix has already failed once, put the verification command *in the prompt* and require its raw output pasted back, rather than accepting a self-assessment.
