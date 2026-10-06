# Source playbooks

Adapted from pstack why source playbooks (Lauren Tan, MIT).

One investigator per category. Each reads one playbook below. Playbooks are worked examples. Bend them to the tool at hand.

| Category | Playbook | Tool it documents |
|---|---|---|
| Source control history | [codigo.md](sources/codigo.md) | git, `gh` or `glab` |
| Issue tracker | [desk.md](sources/desk.md) | Desk MCP, `gh` or `glab` issues |
| Database | [oracle.md](sources/oracle.md) | Oracle dictionary, `SELECT` only |
| Documents | [docs.md](sources/docs.md) | repo files |

Cross-cutting note: when the target looks defensive (guard clauses, retry loops, timeouts, rate caps, feature flags), hunt for incident history inside each source. In Desk, search tickets for the error text. In docs, search postmortem notes and decision logs. In git, watch for subjects like `fix`, `revert`, `re-apply`, `guard`. A ticket plus a doc plus a commit that all name the same fault is strong proof.
