---
name: verify-orch-store-lock
description: "Model-check the orch store lock (.orch.lock) with TLA+: at most one orch process may believe it holds the lock. Use before and after any change to acquireLock, holderIsDead, the lock's release, or openStore's ensureLock and beginWrite in skills/jstack/scripts/orch/store.ts, and when inbox push or drain loses pointers."
---

# Verify the orch store lock

The `orch` CLI lets one process write the store at a time through `<store>/.orch.lock`, which holds the writer's pid. This skill checks one promise of that lock against every interleaving of three processes:

**At most one orch process believes it holds the store lock at any moment.**

Why it matters: `inbox drain` reads the pointers, then renames the inbox away and deletes it. If a second "holder" runs `inbox push` in between, its pointer lands in the deleted folder, and the coordinator never learns that a unit finished.

## Run it

```sh
sh .claude/skills/verify-orch-store-lock/check.sh
```

It prints one line per config and exits 0 when both hold, 1 when either breaks the rule (with TLC's trace), and 2 when TLC or Java is missing or TLC fails for another reason. A missing tool prints the one `mise install` command that installs TLC 1.7.4 and Java at pinned versions. `TLA2TOOLS` and `JAVA` override the lookup.

- `NoCrash.cfg`: three processes, none dies. The rule holds.
- `OrchStoreLock.cfg`: three processes, any may die at any step.

## Known finding (open)

At the sync commit below, `OrchStoreLock.cfg` breaks the rule, so `check.sh` exits 1. This is a bug in the code, not in the model. Until it is fixed, the expected output is `NoCrash: Mutex holds` and `OrchStoreLock: Mutex VIOLATED`. Any other result is a change you must explain.

The bug: when the lock holds the pid of a dead process, two processes can both read that pid and both take over. The first unlinks the stale lock and creates its own. The second then unlinks the first one's live lock, because `takeOver` (store.ts:397-409) unlinks without checking whose lock it removes, and creates its own. Both now hold the lock.

The model's trace, in the code's words:
1. p1 creates the lock and writes its pid, then dies.
2. p2 and p3 both hit EEXIST, read p1's pid, and see that p1 is dead (store.ts:419, 423).
3. p2 unlinks the lock and creates its own (store.ts:398, 400). p2 holds the lock.
4. p3, which decided at step 2 and never reads again, unlinks p2's lock and creates its own. p3 holds it too.

The same bug reproduced against the real code on 2026-10-26: a stress run of 1000 rounds, each with a stale lock, eight concurrent `inbox push` and one `inbox drain`, lost 13 pointers whose push had exited 0, in 11 rounds. In 198 rounds, two or more processes finished the takeover path.

## Read every result with /statechart

Read each TLC result with the `/statechart` skill. It tells each broken rule as its shortest path in plain words, draws the chart of the lock's states, and, given a model of a proposed fix as `--fixed`, says which bugs the fix removes. Label states and steps in Portuguese for this repo's reader, such as "Ninguém com a trava", "p1 com a trava", "p2 apaga a trava". Work on a copy of the model outside the repo.

## What it covers

The coverage record. Each item maps to one or more actions in `OrchStoreLock.tla`, whose comments carry the exact lines:

- `skills/jstack/scripts/orch/store.ts`: `acquireLock` (create, the EEXIST read, `holderIsDead`, `takeOver`, and the returned release), `holderIsDead`.
- The state they guard: the file `<store>/.orch.lock`, its inode, and its content.
- Argued in prose, not modeled: the harm through `inbox.push` and `inbox.drain`, and `openStore`'s `ensureLock` and `beginWrite`, which call `acquireLock` once per process.

**Sync commit: `b38d2e9`.** The covered code last changed in `6006d5e`. Move the sync commit forward only after you confirm the model still describes the code at the new commit.

Bounds and assumptions: three processes, one store, inodes never reused, no pid reuse, and crashes only between awaited calls. Left out: `--force` (store.ts:426-428), I/O errors other than EEXIST and ENOENT, filesystem reordering, and liveness. For example, a holder that dies between `open` and `writeFile` leaves an empty lock that nobody can take over without `--force`. The model allows this, but the rule does not check it.

## When you change covered code

1. Run `check.sh` before your change and keep the output.
2. Carry your change into the model. The model never reads `store.ts`, so a change the model does not mirror proves nothing. Each awaited filesystem call is one action. Keep the `\* store.ts:<line>` comments true.
3. Run `check.sh` again and compare.
   - A new violation: replay each trace step against the code. If a step cannot happen in the code, the model is wrong, so fix the model and say what was wrong. If every step can happen, the change introduced a bug.
   - The known finding gone: confirm with a scratch break that the check can still fail. Change `open(path, "wx")` to `open(path, "w")` in the model's create step (`CreateOpen` and `TakeOverCreate` always succeed). `NoCrash.cfg` must then break the rule. Drop the break, update **Known finding** above, and keep the stress result as history.
4. Never weaken `Mutex`, shrink the bounds, or turn off `Crash` to get a pass. If the promise changed on purpose, change the rule, and cite the evidence.
5. Update the coverage record and the sync commit.

The model, configs, and script are code. Under jstack, an `opencode:` delegate edits them per the jstack skill's **Implementation never runs on Claude**. You write the brief, review the result, and write this file.

For drift that built up across commits that skipped this skill, use `/maintain-formal-verification-skill`.
