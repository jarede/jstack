---------------------------- MODULE OrchStoreLock ----------------------------
\* The orch store lock, as store.ts writes it.
\*
\* acquireLock (store.ts:385-445) creates <store>/.orch.lock with open(path, "wx"),
\* writes the holder's pid into that handle, and closes it. On EEXIST it reads the
\* pid and, if holderIsDead (store.ts:372-383) says the pid belongs to a process that
\* no longer exists, calls takeOver (store.ts:397-409): unlink, then create again.
\* Release (store.ts:434-444) reads the file and unlinks it only when the content is
\* its own pid.
\*
\* Each awaited filesystem call is one step. A pid is modelled as the process that
\* wrote it: the code writes `String(process.pid)`, and holderIsDead accepts only the
\* canonical decimal form (store.ts:374), so a file's content identifies at most one
\* process. No pid reuse.
EXTENDS Naturals, FiniteSets, TLC

CONSTANTS
  Procs,  \* the orch processes, e.g. {p1, p2, p3}
  Crash   \* TRUE: any live process may die at any step

\* The lock file's content: empty, or the pid of a process.
Body == {""} \cup Procs

VARIABLES
  pc,          \* where each process sits in acquireLock (store.ts:385)
  lock,        \* the file at <store>/.orch.lock: its link, inode, and content
  nextInode,   \* hands out inodes, never reused
  hInode,      \* the inode of the open handle that create() holds (store.ts:392)
  holder,      \* the pid a process read after EEXIST (store.ts:419)
  releaseSeen  \* the pid a process read on release (store.ts:436)

vars == <<pc, lock, nextInode, hInode, holder, releaseSeen>>

Init ==
  /\ pc = [p \in Procs |-> "start"]
  /\ lock = [present |-> FALSE, inode |-> 0, body |-> ""]
  /\ nextInode = 1
  /\ hInode = [p \in Procs |-> 0]
  /\ holder = [p \in Procs |-> "unknown"]
  /\ releaseSeen = [p \in Procs |-> "absent"]

\* ---------------------------------------------------------------------------
\* acquireLock: create() -- store.ts:391-395
\* ---------------------------------------------------------------------------

\* open(path, "wx") (store.ts:392). EEXIST when the path names any file; otherwise
\* the file appears with an empty body and the writable handle hInode[p].
CreateOpen(p) ==
  /\ pc[p] = "start"
  /\ \/ /\ lock.present                     \* store.ts:392, EEXIST -> the catch at store.ts:413
        /\ pc' = [pc EXCEPT ![p] = "readPending"]
        /\ UNCHANGED <<lock, nextInode, hInode>>
     \/ /\ ~lock.present                    \* store.ts:392, the file did not exist
        /\ nextInode' = nextInode + 1
        /\ lock' = [present |-> TRUE, inode |-> nextInode, body |-> ""]
        /\ hInode' = [hInode EXCEPT ![p] = nextInode]
        /\ pc' = [pc EXCEPT ![p] = "opened"]
  /\ UNCHANGED <<holder, releaseSeen>>

\* handle.writeFile(`${pid}\n`) (store.ts:393). The handle writes into the inode it
\* opened, even after that file was unlinked or the path was given another file.
CreateWrite(p) ==
  /\ pc[p] = "opened"
  /\ IF lock.present /\ lock.inode = hInode[p]
       THEN lock' = [lock EXCEPT !.body = p]
       ELSE UNCHANGED lock
  /\ pc' = [pc EXCEPT ![p] = "written"]
  /\ UNCHANGED <<nextInode, hInode, holder, releaseSeen>>

\* handle.close() (store.ts:394)
CreateClose(p) ==
  /\ pc[p] = "written"
  /\ pc' = [pc EXCEPT ![p] = "holding"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, releaseSeen>>

\* ---------------------------------------------------------------------------
\* acquireLock: the EEXIST path -- store.ts:417-431
\* ---------------------------------------------------------------------------

\* readFile(path).trim() || "unknown" (store.ts:419). A missing file or a read
\* error gives "unknown" (store.ts:418-422), and so does an empty file.
ReadHolder(p) ==
  /\ pc[p] = "readPending"
  /\ holder' = [holder EXCEPT
       ![p] = IF lock.present /\ lock.body # "" THEN lock.body ELSE "unknown"]
  /\ pc' = [pc EXCEPT ![p] = "holderRead"]
  /\ UNCHANGED <<lock, nextInode, hInode, releaseSeen>>

\* holderIsDead(holder) (store.ts:423) -- store.ts:372-383. TRUE only for the pid of
\* a process that has crashed; "unknown" is never dead.
IsDead(h) == h \in Procs /\ pc[h] = "crashed"

HolderIsDead(p) ==
  /\ pc[p] = "holderRead"
  /\ IsDead(holder[p])
  /\ pc' = [pc EXCEPT ![p] = "takeOver"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, releaseSeen>>

\* The holder is not dead: throw "store lock held by pid <holder>" (store.ts:430).
LockHeld(p) ==
  /\ pc[p] = "holderRead"
  /\ ~IsDead(holder[p])
  /\ pc' = [pc EXCEPT ![p] = "failed"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, releaseSeen>>

\* ---------------------------------------------------------------------------
\* acquireLock: takeOver() -- store.ts:397-409
\* ---------------------------------------------------------------------------

\* unlink(path) (store.ts:398). ENOENT makes the process fail (store.ts:398).
TakeOverUnlink(p) ==
  /\ pc[p] = "takeOver"
  /\ \/ /\ lock.present
        /\ lock' = [present |-> FALSE, inode |-> 0, body |-> ""]
        /\ pc' = [pc EXCEPT ![p] = "takeOverCreate"]
     \/ /\ ~lock.present
        /\ pc' = [pc EXCEPT ![p] = "failed"]
        /\ UNCHANGED lock
  /\ UNCHANGED <<nextInode, hInode, holder, releaseSeen>>

\* create() again (store.ts:400). EEXIST throws "store lock held" (store.ts:402-406),
\* which ends the process; otherwise open(path, "wx") (store.ts:392) creates the file.
TakeOverCreate(p) ==
  /\ pc[p] = "takeOverCreate"
  /\ \/ /\ ~lock.present
        /\ nextInode' = nextInode + 1
        /\ lock' = [present |-> TRUE, inode |-> nextInode, body |-> ""]
        /\ hInode' = [hInode EXCEPT ![p] = nextInode]
        /\ pc' = [pc EXCEPT ![p] = "opened"]
     \/ /\ lock.present
        /\ pc' = [pc EXCEPT ![p] = "failed"]
        /\ UNCHANGED <<lock, nextInode, hInode>>
  /\ UNCHANGED <<holder, releaseSeen>>

\* ---------------------------------------------------------------------------
\* release() -- store.ts:434-444
\* ---------------------------------------------------------------------------

\* readFile(path).trim() (store.ts:436)
ReleaseRead(p) ==
  /\ pc[p] = "holding"
  /\ releaseSeen' = [releaseSeen EXCEPT
       ![p] = IF lock.present THEN lock.body ELSE "absent"]
  /\ pc' = [pc EXCEPT ![p] = "releaseRead"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder>>

\* Unlink only when the pid read above is its own (store.ts:436-438). The unlink
\* removes whatever file the path names now, which need not be the one it read.
ReleaseUnlink(p) ==
  /\ pc[p] = "releaseRead"
  /\ IF releaseSeen[p] \in Procs /\ releaseSeen[p] = p /\ lock.present
       THEN lock' = [present |-> FALSE, inode |-> 0, body |-> ""]
       ELSE UNCHANGED lock
  /\ pc' = [pc EXCEPT ![p] = "done"]
  /\ UNCHANGED <<nextInode, hInode, holder, releaseSeen>>

\* ---------------------------------------------------------------------------
\* A process dies at a step boundary. Its pid stays in any lock file it wrote, so
\* holderIsDead is TRUE for it from then on.
\* ---------------------------------------------------------------------------
CrashAt(p) ==
  /\ Crash
  /\ pc[p] \in {"start", "opened", "written", "readPending", "holderRead",
                "takeOver", "takeOverCreate", "holding", "releaseRead"}
  /\ pc' = [pc EXCEPT ![p] = "crashed"]
  /\ UNCHANGED <<lock, nextInode, hInode, holder, releaseSeen>>

Next ==
  \/ \E p \in Procs : CreateOpen(p)
  \/ \E p \in Procs : CreateWrite(p)
  \/ \E p \in Procs : CreateClose(p)
  \/ \E p \in Procs : ReadHolder(p)
  \/ \E p \in Procs : HolderIsDead(p)
  \/ \E p \in Procs : LockHeld(p)
  \/ \E p \in Procs : TakeOverUnlink(p)
  \/ \E p \in Procs : TakeOverCreate(p)
  \/ \E p \in Procs : ReleaseRead(p)
  \/ \E p \in Procs : ReleaseUnlink(p)
  \/ \E p \in Procs : CrashAt(p)

Spec == Init /\ [][Next]_vars

\* At most one orch process believes it holds the store lock at any moment.
\* When two believe it, `inbox drain` (store.ts:1298-1315) renames the inbox away and
\* deletes it while the second holder's `inbox push` (store.ts:1274-1297) writes a
\* pointer into it, so the coordinator never learns that a unit finished.
Mutex == Cardinality({p \in Procs : pc[p] = "holding"}) <= 1

TypeOK ==
  /\ pc \in [Procs -> {"start", "opened", "written", "readPending", "holderRead",
                       "takeOver", "takeOverCreate", "holding", "releaseRead",
                       "done", "failed", "crashed"}]
  /\ lock \in [present : BOOLEAN, inode : Nat, body : Body]
  /\ nextInode \in Nat
  /\ hInode \in [Procs -> Nat]
  /\ holder \in [Procs -> Procs \cup {"unknown"}]
  /\ releaseSeen \in [Procs -> Procs \cup {"unknown", "absent", ""}]

================================================================================
