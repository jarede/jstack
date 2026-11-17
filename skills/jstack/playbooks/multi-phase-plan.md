### Multi-phase or multi-MR plan

**You own the plan, not the code. The plan is a checklist an owner runs box by box and the operator audits from the evidence.** The plan is the deliverable. Do not implement.

1. When the change is one or two files with an obvious approach, skip the plan. Say so and stop.
2. Settle open questions by prototype before you write, per `playbooks/prototype.md`. Ask the operator only about a product or preference call that no run can settle.
3. Write the plan file under `.jstack/docs/` at the repository root unless the operator names a path. Open with what changes, the MR ids in landing order, and the dependency graph, which says which MRs are independent and branch from trunk, which wait for which, and the files each may touch. Then one section per MR. One MR is one change with its own evidence (the **sequence-verifiable-units** principle skill). Each section has checkboxes for what it depends on, the files it edits, the one change it builds, the result you see, and its verification.
4. Tests alone are not sufficient verification. An MR is verified only when its unit, live, and perf boxes are all checked. Each live box drives the real surface with a concrete scenario and a pass predicate. The perf box names the metric, the probe, the trunk baseline measured first, and the number that fails. An MR that changes an interaction waits for the operator's review before merge.
5. Hand back the plan path and stop. Execution starts on the operator's explicit go.

**Reply:** the plan path, the MR ids with their dependencies and the review-gated set, and what stays unproven.
