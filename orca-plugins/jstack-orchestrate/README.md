# jstack orchestrate (Orca plugin)

A `trusted-worker` plugin for Orca that watches the jstack Orchestrate programs under one or more
repos. Every interval (30 seconds by default) it reads `.jstack/orchestrate/*/orca.json`, asks Orca
for each program's pending gates and tasks, and reads the frontier MR's head pipeline with `glab`.

- Status bar: `jstack: 1 gate · !12 ✓`, `warning` while a gate waits, `danger` when a frontier
  pipeline failed. With no programs: `jstack: idle`.
- Notifications: once when a program's pending gates go from 0 to more than 0, and once when a
  frontier pipeline turns `failed`. The first sample after activation never notifies.
- Panel: each program's objective, pending gates with options, tasks with status, and the frontier
  MR with its pipeline.

## Settings

Settings → Plugins → jstack orchestrate:

| Setting | Meaning |
|---|---|
| `repoPaths` | Absolute repo paths, one per line. |
| `orcaPath`, `glabPath` | Leave empty to resolve from a login shell (`command -v`), falling back to `/usr/local/bin/orca` and `/opt/homebrew/bin/glab`. |
| `intervalSeconds` | Poll interval, default 30, minimum 5. |

The plugin needs `notifications:show` and `settings:own`, plus the `trusted-worker` profile. Only
`orca orchestration gate-list`, `task-list`, `run-list` and `glab mr view` are run.

## Development

```sh
just orca-plugin                          # orca plugin dev load orca-plugins/jstack-orchestrate --json
orca plugin validate orca-plugins/jstack-orchestrate
orca plugin check orca-plugins/jstack-orchestrate
orca plugin test orca-plugins/jstack-orchestrate
```

`dev load` prints Orca's approval prompt and exits 3. Approve it in Orca's Settings → Plugins, or
re-run with the fingerprint Orca printed.

## Contract

`orca.json` must hold `{"runId": "...", "coordinator": "<terminal handle>"}`. Two optional fields
extend it: `"repo"` (absolute repo path, used as `glab`'s cwd) and `"frontierMr"` (the iid of the
lowest unmerged MR, rewritten by the coordinator after each merge). A file that is missing a
`runId` or `coordinator`, or is not JSON, is logged and skipped.
