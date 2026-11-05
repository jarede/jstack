# Orca orchestration

Read this before a program runs workers under Orca. It is the one place jstack calls `orca orchestration`. Every other file links here, so a change in Orca's CLI is fixed in this file alone.

Use it only when **Which terminal host launched me?** in `harness.md` says Orca. In any other host, the Orchestrate playbook keeps its `orch` path. One-off delegates outside a program keep `dispatch-orca` from **Dispatch** in `harness.md`.

Orca keeps the program's state: the Run, its tasks and their dependencies, each worker's liveness, the mail between agents, and the decision gates. The coordinator holds no queue of its own and runs no polling loop. Orca wakes the coordinator's chat with a message such as `You have 2 orchestration messages. Run ...`.

Orca's own guide is `orca skills get orchestration`, with references under `--reference references/<file>.md`. Read it once per program. Where it and this file differ, Orca's guide is newer and wins. Fix this file in its own commit.

## Start a program

1. Create the Run. `orca orchestration run-create --objective "<the goal, in one sentence>" --json` returns the `runId`.
2. Write `.jstack/orchestrate/<slug>/orca.json` with `{"runId": "<runId>", "coordinator": "<ORCA_TERMINAL_HANDLE>"}`. A plugin or a restarted coordinator reads the Run from it. Reads such as `task-list`, `gate-list`, `run-show`, and `inbox` need only `--run`. Writes such as `task-create`, `worker-start`, and `run-use` need a sender, so a process outside an Orca terminal passes `--from <handle>`. `check` takes `--terminal <handle>` instead. The optional `"repo": "<absolute repo path>"` and `"frontierMr": <iid>` fields, the lowest unmerged MR rewritten by the coordinator after each merge, let the jstack-orchestrate Orca plugin show the program's frontier pipeline.
3. Create each unit as a task. Write its kickoff to `.jstack/orchestrate/<slug>/<unit>.md` and pass it with `--spec-file`, so quotes need no escaping:

   ```sh
   orca orchestration task-create --run <runId> --task-title "<unit>" --spec-file <kickoff.md> [--deps '["<task id>"]'] --json
   ```

   A task with an unfinished dependency is `pending`, and Orca refuses to start it with `task_not_startable` and its `unmetDependencies`. Start what `orca orchestration task-list --run <runId> --ready --brief` lists, after you check in `task-list` that each of its dependencies is `completed`. Orca can mark a task `ready` with a dependency still open, as **Decision gates** explains.

## Start a worker on a role's model

Start each ready task with `orca orchestration worker-start --run <runId> --task <task id> <launch flags> --json`. The worker runs in your worktree unless you pass `--worktree`. Read the launch flags from the role's line in `models.md`:

| `models.conf` value | Launch flags |
|---|---|
| `opencode:<provider>/<model>` | `--agent opencode --model <provider>/<model>` |
| `claude:<alias>` | `--agent claude --model <alias>` |
| `inherit` | the agent you run in, `--agent claude` in Claude Code or `--agent opencode` in opencode, with no `--model` |

Use `--agent opencode`, not `opencode2`. Orca refuses `--model` for `opencode2` with `does not support launch-time model selection`. Sessions from `--agent opencode` still show in opencode desktop. Workers that write the same files at once need separate worktrees. Orca refuses `--model` for an `opencode` worker in a worktree it creates at launch (`--worktree new-child` answers `capability_unsupported`), and asks for an existing worktree. Create it first with `orca worktree create --name <unit> --setup skip --json`, then pass `--worktree name:<unit>`. A `claude` worker can take `--worktree new-child --name <unit>` directly.

The receipt's `dispatchId` names this attempt. Record it in the unit's row of `notes.md`. Then end your turn. Orca wakes you when a worker reports or asks.

## When Orca wakes you

Run the `check` command the wake names. Handle the whole batch before the next `check`.

- **`worker_done`** settles its task with an `outcome` of `succeeded` or `failed`. It lists `filesModified` only when the worker passed them, so read the branch or the diff for what changed. Check the evidence the kickoff named before you accept a success. A worker's summary is not evidence.
- **`question`.** Answer with `orca orchestration reply --id <message id> --body "<answer>"` when the answer follows from the program's standing orders. Otherwise it is a gate. Ask the operator first.
- **`escalation`** with a `stopReason` means the worker stopped without `worker_done`, and its task stays `dispatched`. Steer it with `orca orchestration send --to dispatch:<dispatchId> --subject "<topic>" --body "<message>"`, or stop it with `worker-stop` before you retry it, because Orca refuses `--retry-of` on a `dispatched` task.

Then start every task `task-list --ready` shows, and end your turn again.

Never run `check` from a script or a loop. It takes the coordinator's mail, so Orca has nothing to wake you with. Never type into a worker's terminal. Use `send`.

## Decision gates

A gate blocks a task until the operator decides. Create it before you ask:

```sh
orca orchestration gate-create --task <task id> --question "<the call, in the operator's language>" --options '["<option>", "<option>"]' --json
```

Orca refuses to start a gated task with `task_not_startable` and a `status` of `blocked`. A stopped task is `blocked` too, so read `gate-list` before you call a refusal a gate. Gate a task only once it is `ready`. When a gate on a `pending` task resolves, Orca marks the task `ready` and drops its unmet dependencies, and `--ready` then lists a task whose parent never finished. Orca's window shows no gate, so name every open gate, its question, and its options in each report to the operator until the jstack plugin shows them. Resolve it with the operator's answer, in their words:

```sh
orca orchestration gate-resolve --id <gate id> --resolution "<answer>" --json
```

`orca orchestration gate-list --run <runId> --status pending --json` lists what still waits.

## Liveness and recovery

- `orca orchestration worker-list --run <runId> --json` gives each worker's `state`, `liveness`, and `next`. Follow `next` when it is there.
- `worker-show --dispatch <dispatchId>` and `worker-read --dispatch <dispatchId>` inspect one attempt. Read output with these, never with `orca terminal` verbs, because not every worker has a terminal.
- Retry a failed or stopped attempt on the same task, with its placement repeated, because a retry inherits none:

  ```sh
  orca orchestration worker-start --run <runId> --task <task id> --retry-of <dispatchId> --worktree current <launch flags> --json
  ```

  A retry reruns the task's own kickoff. `--retry-of` refuses `--spec`, so a retry can't shrink the scope. After three failed starts in one `--retry-of` chain, Orca fails the task. Report it and stop retrying it.
- Replace a unit when the playbook says to retry on a smaller scope or to drop it and replan. Create a new task with the new kickoff, and leave the old one `failed`. Orca has no way to point a dependent task at the replacement, because `task-update` takes no `--deps`. Recreate each dependent task with `--deps` on the replacement, or, once the replacement is `completed`, move the old dependent with `orca orchestration task-update --id <task id> --status ready --run <runId> --json`. Record the replacement in `notes.md`.
- Silence, a timeout, or `unverifiable` liveness proves nothing. Stop a worker with `worker-stop --dispatch <dispatchId>` only on the operator's cancellation or a stalled worker the playbook says to replace, and claim it stopped only on a confirmed result. Read `orca skills get orchestration --reference references/recovery-and-cleanup.md` before `worker-abandon`, `worker-release`, or `reset`. `reset` deletes the program's coordination state, so it needs the operator.
- Finished workers release their terminals on their own. A worker started in a new worktree stays open. Release it with `worker-release --dispatch <dispatchId>` once nobody needs its chat.

## After a coordinator restart

Read `.jstack/orchestrate/<slug>/orca.json`, then take the Run back with `orca orchestration run-use --id <runId> --json`. Read `orca orchestration inbox --terminal run:<runId> --limit 50` for mail that a `check` already handled, then `task-list` and `worker-list`, and continue. Write the new `ORCA_TERMINAL_HANDLE` to `orca.json`.
