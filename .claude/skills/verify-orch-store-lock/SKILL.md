---
name: verify-orch-store-lock
description: "Model-check the orch store lock (.orch.lock) with TLA+: at most one orch process may believe it holds the lock, and the lock file is never empty. Use before and after any change to acquireLock, holderIsDead, the lock's reap claim or release, or openStore's ensureLock and beginWrite in skills/jstack/scripts/orch/store.ts, and when inbox push or drain loses pointers."
---

# Verify the orch store lock

The `orch` CLI lets one process write the store at a time through `<store>/.orch.lock`, which holds the writer's pid. This skill checks two promises of that lock against every interleaving of three processes, any of which may die at any step:

- **`Mutex`.** At most one orch process believes it holds the store lock at any moment.
- **`NoEmptyLock`.** When the lock file exists, it holds a pid.

Why `Mutex` matters: `inbox drain` reads the pointers, then renames the inbox away and deletes it. If a second "holder" runs `inbox push` in between, its pointer lands in the deleted folder, and the coordinator never learns that a unit finished. Why `NoEmptyLock` matters: an empty lock reads as holder `unknown`, which is never dead, so nobody can take it over without `--force`.

## Run it

```sh
sh .claude/skills/verify-orch-store-lock/check.sh
```

It prints one line per config and exits 0 when both promises hold in both, 1 when either breaks (with TLC's trace), and 2 when TLC or Java is missing or TLC fails for another reason. A missing tool prints the one `mise install` command that installs TLC 1.7.4 and Java at pinned versions. `TLA2TOOLS` and `JAVA` override the lookup.

- `NoCrash.cfg`: three processes, none dies.
- `OrchStoreLock.cfg`: three processes, any may die at any step.

Expected today: `NoCrash: Mutex holds, NoEmptyLock holds` and `OrchStoreLock: Mutex holds, NoEmptyLock holds`.

## How the lock works, and why each step is there

1. **Create with the pid already inside.** Write the pid to a temp file, then `link` it to `.orch.lock`. `link` fails with EEXIST like `open "wx"`, and the lock never exists empty.
2. **Read holder and identity from one file.** On EEXIST, one handle reads the pid and `fstat`s the inode.
3. **Reap a dead holder's lock through an exclusive claim.** `link(.orch.lock, .orch.lock.reap-<inode>)` succeeds for one process per inode. That process checks that the claim has the inode and the pid it read, then unlinks the stale lock, creates its own, and removes the claim. A process that cannot claim fails with "lock held" and leaves the other's claim alone. Without the claim, two processes that read the same dead pid both take over, and the second deletes the first one's live lock. The pid check covers inode reuse, and the inode check covers pid reuse.
4. **Release** unlinks the lock only if it still holds this process's pid.

`--force` reaps a live holder's lock the same way, removing a leftover claim once first, and replaces an empty or unreadable lock outright. The model leaves `--force` out.

## History

Before `23e7313`, the takeover was `unlink` then `open "wx"` with no claim, and creation wrote the pid after opening the file. TLC broke `Mutex` in 18 steps and `NoEmptyLock` in 2. On 2026-10-26, a stress run of 1000 rounds with a stale lock, eight concurrent `inbox push`, and one `inbox drain` lost 13 pointers whose push had exited 0, and 198 rounds had two or more completed takeovers. After the fix, the same run lost 0 pointers with 0 double takeovers. The bun test "keeps one holder through a stale-lock stampede with no lost pointers" guards this in CI.

## Read every result with /statechart

Read each TLC result with the `/statechart` skill. It tells each broken rule as its shortest path in plain words, draws the chart of the lock's states, and, given a model of a proposed change as `--fixed`, says which bugs the change removes or adds. Label states and steps in Portuguese for this repo's reader, such as "Ninguém com a trava", "p1 com a trava", "p2 reserva a remoção da trava do morto". Work on a copy of the model outside the repo.

## What it covers

The coverage record. Each item maps to one or more actions in `OrchStoreLock.tla`, whose comments carry the exact lines:

- `skills/jstack/scripts/orch/store.ts`: `acquireLock` (`create`, the EEXIST read, `reap`, the release it returns) and `holderIsDead`.
- The state they guard: `<store>/.orch.lock` (inode and content) and the claim files `.orch.lock.reap-<inode>`.
- Argued in prose, not modeled: the harm through `inbox.push` and `inbox.drain`, and `openStore`'s `ensureLock` and `beginWrite`, which call `acquireLock` once per process.

**Sync commit: `23e7313`.** Move it forward only after you confirm the model still describes the code at the new commit.

Bounds and assumptions: three processes, one store, inodes and pids never reused (the 3b checks are what cover reuse in the code), and crashes only between awaited calls. Left out: `--force`, I/O errors other than EEXIST and ENOENT, filesystem reordering, and leftover temp files, which nothing reads.

Known liveness cost: a reaper that dies after claiming and before unlinking the stale lock leaves `.orch.lock.reap-<inode>` behind. Then nobody can reap that lock without `--force`. TLC reaches this state, and `Mutex` still holds there. It needs a crash inside a window of a few syscalls.

## When you change covered code

1. Run `check.sh` before your change and keep the output.
2. Carry your change into the model. The model never reads `store.ts`, so a change the model does not mirror proves nothing. Keep each awaited filesystem call one action, and keep the `\* store.ts:<line>` comments true. Also read your code for paths the model treats as impossible. For example, a `finally` that removes a claim this process never got is a code bug the model cannot see.
3. Run `check.sh` again and compare.
   - A new violation: replay each trace step against the code. If a step cannot happen in the code, the model is wrong, so fix the model and say what was wrong. If every step can happen, the change introduced a bug.
   - Still passing: confirm that the check can still fail. In a scratch copy of the model, skip the claim (step 3a goes straight to the unlink). `OrchStoreLock.cfg` must then break `Mutex`. Dropping only the inode check does not break it in this model, because the pid check covers the same late reaper when nothing is reused. Drop the break afterwards.
4. Never weaken an invariant, shrink the bounds, or turn off crashes to get a pass. If the promise changed on purpose, change the rule, and cite the evidence.
5. Update the coverage record and the sync commit.

The model, configs, and script are code. Under jstack, an `opencode:` delegate edits them per the jstack skill's **Implementation never runs on Claude**. You write the brief, review the result, and write this file.

For drift that built up across commits that skipped this skill, use `/maintain-formal-verification-skill`.
