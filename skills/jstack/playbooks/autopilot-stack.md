### Autopilot-stack

Run the Autopilot-full playbook, but do not merge.

1. **In place of step 5, stop at verified.** Stop when each MR is verified and green at its current head, then hand the MRs to the operator. After the handoff, nobody pushes without the operator's go. Every loop tick prompt names this file, so each tick sees the no-merge rule.
2. **Stack an MR only when it builds on another MR.** This is the one exception to step 3. Base the MR on the other MR's branch in place of trunk, per **Size and stacks** in `playbooks/opening-a-mr.md`. In place of step 2's rebase onto trunk, each MR rebases onto its parent MR's branch, and the stack root rebases onto trunk. A new head on the lower MR restacks the MRs above it, and an MR whose `git patch-id` the restack leaves unchanged keeps its verdict.

**Reply:** list each MR with its verdict, in place of what merged.
