# Widget cache plan

This program adds a bounded widget cache for the dashboard team. It enforces one rule, no unbounded growth. MRs 41 and 42 land in order.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/jstack/playbooks/autopilot-stack.md`. The operator merges MR 41 and MR 42.

Tests alone are not sufficient verification. An MR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] Read these from trunk at program start. Re-read them at every tick.
  - [ ] `git show origin/main:skills/jstack/playbooks/autopilot-stack.md`
  - [ ] Read the **swarm** skill.
  - [ ] Read the project's matching `verify-*` skill, or confirm that the Playwright MCP is enabled.
  - [ ] `git show origin/main:skills/jstack/playbooks/opening-a-mr.md`
- [ ] On the operator's go, arm the audit tick as `/loop 1h` with the tick prompt below. Never leave the cadence to memory.
- [ ] Post a short status message to the operator on a tracked change.

### Spawn owners

- [ ] Spawn one owner per MR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] MR 41 is independent and first. Branches from `main`.
  - [ ] MR 42 after MR 41.
- [ ] Hold the file boundaries. MR 41 touches only `src/cache/**`.
- [ ] Hold the review gate. MR 42 changes an interaction. It waits for the operator's review in chat with screenshots and a video before merge.

### MR mechanics, for every MR

- [ ] Resolve the forge from `git remote get-url origin`. Use `glab` as described in `skills/jstack/references/environment.md`.
- [ ] Open the MR ready, never draft, per **Opening an MR**.
- [ ] Run the repo's lint and typecheck once before the MR-facing push. Push with hooks on.
- [ ] Run the code cleanup pass from `skills/jstack/references/harness.md` before each commit and `/no-comments` before review.
- [ ] Triage every automated reviewer comment per `../references/review-bot-triage.md`.
- [ ] Rebase onto current trunk before the code-ready report and babysit.

### Verdict and merge, for every MR

- [ ] At the code-ready head SHA, run the **swarm** skill. One gates lane. The ten live lanes. The perf lane. Two audit lanes.
- [ ] Clean only when every lane is `PASS`.
- [ ] The owner squash-merges its own MR.

### Boot recipe, for every live lane

Each live lane runs in its own worktree-isolated subagent at the MR head.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] Start the backend and the surface. Wait for ready.
- [ ] Save every screenshot to `<scratch-dir>/swarm-<mr-iid>/worker-<n>/<slug>.png`.

## Add the bounded cache (MR 41)

**Depends on.** None.

**Files.**

- [ ] Edit `src/cache/store.js`.

**Build.**

- [ ] Add the `BoundedCache` symbol in `src/cache/store.js`.

**You see.**

- [ ] The cache evicts the oldest entry, with the log line `evicted key`.

**Verify, unit.** Tests alone are not sufficient verification. An MR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/cache/store.test.js` gains the eviction case. Run `bun test store`.

**Verify, live.** Tests alone are not sufficient verification. An MR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `swarm workers` at the MR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the load scenario at trunk and head. If trunk lacks the feature, record that and gate the end state. Save `lane-1.png`. Pass when the dashboard renders.
- [ ] Lane 2. Fill the cache. Save `lane-2.png`. Pass when the size holds.
- [ ] Lane 3. Evict one. Save `lane-3.png`. Pass when the oldest goes.
- [ ] Lane 4. Reload. Save `lane-4.png`. Pass when data returns.
- [ ] Lane 5. Concurrency. Save `lane-5.png`. Pass when no race shows.
- [ ] Lane 6. Empty key. Save `lane-6.png`. Pass when it rejects.
- [ ] Lane 7. Large value. Save `lane-7.png`. Pass when it stores.
- [ ] Lane 8. TTL expiry. Save `lane-8.png`. Pass when it expires.
- [ ] Lane 9. Restart. Save `lane-9.png`. Pass when it recovers.
- [ ] Lane 10. Metrics. Save `lane-10.png`. Pass when counts match.

**Verify, perf.** Tests alone are not sufficient verification. An MR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Cache lookup latency at trunk and head.
- [ ] Probe. Run the load script at trunk and head, interleaved.
- [ ] Baseline. Record the trunk latency first.
- [ ] Rule. Head against trunk, fail above 5 ms.

**Review gate.** None. MR 41 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Automated reviewer triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The owner squash-merges its own MR.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

No prototypes ran for this program.

## Appendix B. Alternatives rejected

An LRU library lost to a small bounded map.

## Appendix C. Risks

Trunk lacks the cache, watched by MR 41.

## Appendix D. Links and reading list

Read the caching guide before editing.
