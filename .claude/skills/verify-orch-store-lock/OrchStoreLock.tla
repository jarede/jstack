---------------------------- MODULE OrchStoreLock ----------------------------
\* The orch store lock, as implemented in skills/jstack/scripts/orch/store.ts:
\* acquireLock (store.ts:387-515) and holderIsDead (store.ts:374-385).
\*
\* Each awaited filesystem call is one step. The comments carry the code line.
\*
\*   1. create() (store.ts:393-406) writes `${pid}\n` to a fresh temp file in the
\*      store directory (store.ts:394-401), then link(temp, path)
\*      (store.ts:402) (EEXIST when path exists, exactly like open "wx"), then
\*      unlink(temp) (store.ts:403-405). The lock file never exists without a
\*      pid in it.
\*   2. On EEXIST, one handle (store.ts:460) reads path's content (store.ts:463)
\*      and fstat of the same handle gives the inode (store.ts:464): the holder
\*      pid and the inode come from one file.
\*   3a. link(path, R) (store.ts:422), R = ".orch.lock.reap-<inode read at step
\*       2>". EEXIST means another process is reaping that inode: fail with
\*       "lock held" (store.ts:424-425) and leave that process's claim
\*       untouched. Under --force only, remove the claim and link once more
\*       (store.ts:424-428).
\*   3b. stat(R) must give the step-2 inode (store.ts:433) and R's content the
\*       step-2 pid (store.ts:434). If either differs, path named another file
\*       when we linked: unlink(R) (store.ts:447-449) and fail with "lock held"
\*       (store.ts:435-437).
\*   3c. unlink(path) (store.ts:438).
\*   3d. create() again (store.ts:439-446). EEXIST means someone created a fresh
\*       lock meanwhile: unlink(R) and fail with "lock held".
\*   3e. unlink(R) (store.ts:447-449).
\*   --force on a lock with no inode (an empty or unreadable lock) replaces it
\*   outright (store.ts:484-498); like --force elsewhere, the model leaves it out.
\*   4.  Release is unchanged (store.ts:504-514): read path, unlink it only when
\*       it holds our own pid.
\*
\* Temp files are not a variable: nothing in the protocol ever reads them, so a temp
\* a crash leaves behind changes no step. hInode[p] remembers the temp's inode, which
\* is the inode the lock gets at step 1 and at 3d.
\*
\* Inodes are never reused: nextInode only grows. The inode check in 3b catches a
\* late reaper; the content check in 3b is what covers inode reuse.
\*
\* A pid is modelled as the process that wrote it: the code writes
\* String(process.pid) and holderIsDead accepts only the canonical decimal form, so a
\* file's content identifies at most one process. No pid reuse.
\*
\* Known liveness cost, kept visible: a reaper that dies between 3a and 3e leaves R
\* behind. If it dies before 3c, the stale lock can never be reaped again without
\* --force, because every later 3a on that inode gets EEXIST.
EXTENDS Naturals, FiniteSets, TLC

CONSTANTS
  Procs,  \* the orch processes, e.g. {p1, p2, p3}
  Crash   \* TRUE: any live process may die at any step

\* The lock file's content: empty, or the pid of a process.
Body == {""} \cup Procs

\* A reap link: it is named reap-<name>, points at inode `inode`, and has content `body`.
ReapLink == [name : Nat, inode : Nat, body : Body]

VARIABLES
  pc,           \* where each process sits in acquireLock
  lock,         \* the file at <store>/.orch.lock: its link, inode, and content
  nextInode,    \* hands out inodes and temp names, never reused
  hInode,       \* the inode of p's temp file, written at step 1 and 3d
  holder,       \* the pid a process read at step 2
  holderInode,  \* the inode the same handle gave at step 2
  releaseSeen,  \* the pid a process read on release
  reap,         \* the reap links that exist
  statInode,    \* the inode a reaper read from R at 3b
  claimBody     \* the pid a reaper read from R at 3b

vars == <<pc, lock, nextInode, hInode, holder, holderInode, releaseSeen, reap,
          statInode, claimBody>>

Init ==
  /\ pc = [p \in Procs |-> "start"]
  /\ lock = [present |-> FALSE, inode |-> 0, body |-> ""]
  /\ nextInode = 1
  /\ hInode = [p \in Procs |-> 0]
  /\ holder = [p \in Procs |-> "unknown"]
  /\ holderInode = [p \in Procs |-> 0]
  /\ releaseSeen = [p \in Procs |-> "absent"]
  /\ reap = {}
  /\ statInode = [p \in Procs |-> 0]
  /\ claimBody = [p \in Procs |-> "unknown"]

UNCHANGED_ALL ==
  /\ UNCHANGED <<lock, nextInode, hInode, holder, holderInode, releaseSeen, reap,
                 statInode, claimBody>>

\* ---------------------------------------------------------------------------
\* create(): step 1, and again at step 3d
\* ---------------------------------------------------------------------------

\* Step 1. Write `${pid}\n` to a fresh temp file (store.ts:394-401). Its inode,
\* and so its name, is unique.
CreateTemp(p) ==
  /\ pc[p] \in {"start", "reapCreate"}
  /\ nextInode' = nextInode + 1
  /\ hInode' = [hInode EXCEPT ![p] = nextInode]
  /\ pc' = [pc EXCEPT ![p] = IF pc[p] = "start"
                                THEN "tempWritten" ELSE "reapTempWritten"]
  /\ UNCHANGED <<lock, holder, holderInode, releaseSeen, reap, statInode, claimBody>>

\* Step 1. link(temp, path) (store.ts:402). EEXIST when the path names any file,
\* exactly like open(path, "wx"); otherwise the lock appears with the pid the temp
\* already holds.
CreateLink(p) ==
  /\ pc[p] \in {"tempWritten", "reapTempWritten"}
  /\ \/ /\ ~lock.present
        /\ lock' = [present |-> TRUE, inode |-> hInode[p], body |-> p]
        /\ pc' = [pc EXCEPT ![p] = IF pc[p] = "tempWritten"
                                      THEN "linked" ELSE "reapLinked"]
     \/ /\ lock.present
        /\ pc' = [pc EXCEPT ![p] = IF pc[p] = "tempWritten"
                                      THEN "linkExisted" ELSE "reapLinkExisted"]
        /\ UNCHANGED lock
  /\ UNCHANGED <<nextInode, hInode, holder, holderInode, releaseSeen, reap,
                 statInode, claimBody>>

\* Step 1, and step 3d. unlink(temp) (store.ts:403-405).
CreateUnlinkTemp(p) ==
  /\ pc[p] \in {"linked", "linkExisted", "reapLinked", "reapLinkExisted"}
  /\ pc' = [pc EXCEPT ![p] =
       CASE pc[p] = "linked"          -> "holding"
         [] pc[p] = "linkExisted"     -> "readPending"
         [] pc[p] = "reapLinked"      -> "reapDone"
         [] pc[p] = "reapLinkExisted" -> "reapAbandon"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, holderInode, releaseSeen, reap,
                 statInode, claimBody>>

\* ---------------------------------------------------------------------------
\* The EEXIST path: step 2
\* ---------------------------------------------------------------------------

\* Step 2. One handle: readFile(path) gives the pid (store.ts:463), fstat of the
\* same handle gives the inode (store.ts:464). A missing file or an empty one
\* still gives "unknown".
ReadHolder(p) ==
  /\ pc[p] = "readPending"
  /\ holder' = [holder EXCEPT
       ![p] = IF lock.present /\ lock.body # "" THEN lock.body ELSE "unknown"]
  /\ holderInode' = [holderInode EXCEPT
       ![p] = IF lock.present THEN lock.inode ELSE 0]
  /\ pc' = [pc EXCEPT ![p] = "holderRead"]
  /\ UNCHANGED <<lock, nextInode, hInode, releaseSeen, reap, statInode, claimBody>>

\* holderIsDead(holder) (store.ts:374-385): TRUE only for the pid of a process
\* that has crashed; "unknown" is never dead.
IsDead(h) == h \in Procs /\ pc[h] = "crashed"

HolderIsDead(p) ==
  /\ pc[p] = "holderRead"
  /\ IsDead(holder[p])
  /\ pc' = [pc EXCEPT ![p] = "reapClaim"]
  /\ UNCHANGED_ALL

\* The holder is not dead: throw "store lock held by pid <holder>"
\* (store.ts:481-482).
LockHeld(p) ==
  /\ pc[p] = "holderRead"
  /\ ~IsDead(holder[p])
  /\ pc' = [pc EXCEPT ![p] = "failed"]
  /\ UNCHANGED_ALL

\* ---------------------------------------------------------------------------
\* Reaping a dead holder: steps 3a-3e
\* ---------------------------------------------------------------------------

\* Step 3a. link(path, R) (store.ts:422). The name carries the step-2 inode, so
\* two reapers of one inode collide on the same R. EEXIST: another process holds
\* the claim for that inode, so fail with "lock held" (store.ts:424-425) and
\* leave that claim untouched; only --force removes the claim and retries once
\* (store.ts:424-428), which this model leaves out. A missing path (the previous
\* reaper unlinked it and has not created yet) fails the link too; the code has
\* no case for it, so the process fails (store.ts:424-425).
ReapClaim(p) ==
  /\ pc[p] = "reapClaim"
  /\ \/ /\ \E r \in reap : r.name = holderInode[p]     \* EEXIST
        /\ pc' = [pc EXCEPT ![p] = "failed"]
        /\ UNCHANGED <<lock, reap>>
     \/ /\ ~(\E r \in reap : r.name = holderInode[p])
        /\ \/ /\ ~lock.present                          \* ENOENT
              /\ pc' = [pc EXCEPT ![p] = "failed"]
              /\ UNCHANGED <<lock, reap>>
           \/ /\ lock.present
              /\ reap' = reap \cup
                   {[name |-> holderInode[p], inode |-> lock.inode,
                     body |-> lock.body]}
              /\ pc' = [pc EXCEPT ![p] = "reapClaimed"]
              /\ UNCHANGED lock
  /\ UNCHANGED <<nextInode, hInode, holder, holderInode, releaseSeen, statInode,
                 claimBody>>

\* Step 3b. stat(R) (store.ts:433): the inode the link gave R.
ReapStat(p) ==
  /\ pc[p] = "reapClaimed"
  /\ \E r \in reap : /\ r.name = holderInode[p]
                     /\ statInode' = [statInode EXCEPT ![p] = r.inode]
  /\ pc' = [pc EXCEPT ![p] = "reapStatted"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, holderInode, releaseSeen, reap,
                 claimBody>>

\* Step 3b. readFile(R) (store.ts:434): the pid it holds.
ReapReadBody(p) ==
  /\ pc[p] = "reapStatted"
  /\ \E r \in reap : /\ r.name = holderInode[p]
                     /\ claimBody' = [claimBody EXCEPT ![p] = r.body]
  /\ pc' = [pc EXCEPT ![p] = "reapRead"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, holderInode, releaseSeen, reap,
                 statInode>>

\* Step 3b. Both checks together (store.ts:435-437): the inode catches a late
\* reaper, the pid guards against a reused inode.
ReapCheck(p) ==
  /\ pc[p] = "reapRead"
  /\ \/ /\ statInode[p] = holderInode[p]
        /\ claimBody[p] = holder[p]
        /\ pc' = [pc EXCEPT ![p] = "reapUnlinkReady"]
     \/ /\ ~(statInode[p] = holderInode[p] /\ claimBody[p] = holder[p])
        /\ pc' = [pc EXCEPT ![p] = "reapAbandon"]
  /\ UNCHANGED_ALL

\* Step 3c. unlink(path) (store.ts:438). Only the holder of R for this inode gets
\* here, and the dead holder cannot release, so path still names the stale inode.
\* The code does not check that again; a missing path fails the unlink (ENOENT).
ReapUnlink(p) ==
  /\ pc[p] = "reapUnlinkReady"
  /\ \/ /\ lock.present
        /\ lock' = [present |-> FALSE, inode |-> 0, body |-> ""]
        /\ pc' = [pc EXCEPT ![p] = "reapCreate"]
     \/ /\ ~lock.present
        /\ pc' = [pc EXCEPT ![p] = "reapAbandon"]
        /\ UNCHANGED lock
  /\ UNCHANGED <<nextInode, hInode, holder, holderInode, releaseSeen, reap,
                 statInode, claimBody>>

\* Step 3e, and unlink(R) on every way out at 3b and 3d (store.ts:447-449). On
\* reapDone the reaper now holds the lock; otherwise it gives up and fails with
\* "lock held".
ReapUnlinkClaim(p) ==
  /\ pc[p] \in {"reapDone", "reapAbandon"}
  /\ \E r \in reap : /\ r.name = holderInode[p]
                     /\ reap' = reap \ {r}
  /\ pc' = [pc EXCEPT ![p] = IF pc[p] = "reapDone" THEN "holding" ELSE "failed"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, holderInode, releaseSeen,
                 statInode, claimBody>>

\* ---------------------------------------------------------------------------
\* release(): unchanged
\* ---------------------------------------------------------------------------

\* readFile(path).trim() (store.ts:506)
ReleaseRead(p) ==
  /\ pc[p] = "holding"
  /\ releaseSeen' = [releaseSeen EXCEPT
       ![p] = IF lock.present THEN lock.body ELSE "absent"]
  /\ pc' = [pc EXCEPT ![p] = "releaseRead"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, holderInode, reap, statInode,
                 claimBody>>

\* Unlink only when the pid read above is its own (store.ts:507). The unlink
\* removes whatever file the path names now, which need not be the one it read.
ReleaseUnlink(p) ==
  /\ pc[p] = "releaseRead"
  /\ IF releaseSeen[p] \in Procs /\ releaseSeen[p] = p /\ lock.present
       THEN lock' = [present |-> FALSE, inode |-> 0, body |-> ""]
       ELSE UNCHANGED lock
  /\ pc' = [pc EXCEPT ![p] = "done"]
  /\ UNCHANGED <<nextInode, hInode, holder, holderInode, releaseSeen, reap,
                 statInode, claimBody>>

\* ---------------------------------------------------------------------------
\* A process dies at a step boundary. Its pid stays in any lock file it wrote, so
\* holderIsDead is TRUE for it from then on.
\* ---------------------------------------------------------------------------
CrashAt(p) ==
  /\ Crash
  /\ pc[p] \in {"start", "tempWritten", "linked", "linkExisted", "readPending",
                "holderRead", "reapClaim", "reapClaimed", "reapStatted", "reapRead",
                "reapUnlinkReady", "reapCreate", "reapTempWritten", "reapLinked",
                "reapLinkExisted", "reapDone", "reapAbandon", "holding",
                "releaseRead"}
  /\ pc' = [pc EXCEPT ![p] = "crashed"]
  /\ UNCHANGED_ALL

Next ==
  \/ \E p \in Procs : CreateTemp(p)
  \/ \E p \in Procs : CreateLink(p)
  \/ \E p \in Procs : CreateUnlinkTemp(p)
  \/ \E p \in Procs : ReadHolder(p)
  \/ \E p \in Procs : HolderIsDead(p)
  \/ \E p \in Procs : LockHeld(p)
  \/ \E p \in Procs : ReapClaim(p)
  \/ \E p \in Procs : ReapStat(p)
  \/ \E p \in Procs : ReapReadBody(p)
  \/ \E p \in Procs : ReapCheck(p)
  \/ \E p \in Procs : ReapUnlink(p)
  \/ \E p \in Procs : ReapUnlinkClaim(p)
  \/ \E p \in Procs : ReleaseRead(p)
  \/ \E p \in Procs : ReleaseUnlink(p)
  \/ \E p \in Procs : CrashAt(p)

Spec == Init /\ [][Next]_vars

\* At most one orch process believes it holds the store lock at any moment.
Mutex == Cardinality({p \in Procs : pc[p] = "holding"}) <= 1

\* The lock file never exists without a pid in it: create() links a temp that
\* already holds `${pid}\n` (store.ts:393-405).
NoEmptyLock == lock.present => lock.body \in Procs

\* Informational liveness probe, used only by its own config: no live process is
\* left looking at a crashed holder's lock after it gave up. Asserting this never
\* happens; TLC finds the trace. With this code the trace dies where a reaper dies
\* between 3a and 3c and leaves R behind.
NoStuckLock ==
  ~( /\ lock.present
     /\ IsDead(lock.body)
     /\ \E p \in Procs : pc[p] # "crashed"
     /\ \A p \in Procs : pc[p] \in {"failed", "crashed"} )

\* The same, narrowed to the state that --force alone cannot reap: R is left behind
\* for the stale inode.
NoStuckReap ==
  ~( /\ lock.present
     /\ IsDead(lock.body)
     /\ \E r \in reap : r.inode = lock.inode
     /\ \E p \in Procs : pc[p] # "crashed"
     /\ \A p \in Procs : pc[p] \in {"failed", "crashed"} )

TypeOK ==
  /\ pc \in [Procs -> {"start", "tempWritten", "linked", "linkExisted",
                       "readPending", "holderRead", "reapClaim", "reapClaimed",
                       "reapStatted", "reapRead", "reapUnlinkReady", "reapCreate",
                       "reapTempWritten", "reapLinked", "reapLinkExisted",
                       "reapDone", "reapAbandon", "holding", "releaseRead", "done",
                       "failed", "crashed"}]
  /\ lock \in [present : BOOLEAN, inode : Nat, body : Body]
  /\ nextInode \in Nat
  /\ hInode \in [Procs -> Nat]
  /\ holder \in [Procs -> Procs \cup {"unknown"}]
  /\ holderInode \in [Procs -> Nat]
  /\ releaseSeen \in [Procs -> Procs \cup {"unknown", "absent", ""}]
  /\ \A r \in reap : r.name \in Nat /\ r.inode \in Nat /\ r.body \in Body
  /\ statInode \in [Procs -> Nat]
  /\ claimBody \in [Procs -> Procs \cup {"unknown", ""}]

================================================================================
