# Reviewing a delegated delivery

Used by the reviewer on every task, and by the engineer on the final pass. The rule this file
exists to serve: **a report is a claim, not evidence.**

**General rules — the gate, the evidence ladder, checks that lie, golden outputs and the four
verdicts — are in [../jstack/biblioteca/verificacao.md](../jstack/biblioteca/verificacao.md). Read
it first.** This file adds only what is specific to work done by another agent.

## Reviewing: Completion Is Not Correctness

The reviewer verifies with its own hands before accepting anything:

```bash
just check && just test          # or the repo's equivalent
git show --stat HEAD
bash .agentes/check-NN.sh        # the parity/check script the engineer wrote, if the task has one
```

Then applies every row of "Checks that lie" in verificacao.md, and reads the code for the signals
a delegated report never volunteers:

| Signal | How to catch it | Why it matters |
|---|---|---|
| Rewrote what should have been copied | `diff` the ported function against the source | Reinvented business logic passes tests and fails in production |
| Invented an API workaround | New SQL/helper that duplicates something the framework already exposes | One agent wrote `select max(id)` instead of using `var()` for `RETURNING INTO` — under concurrent load that returns someone else's row |
| Guard the source does not have | New `try/except`, `if x is None: return`, `NVL`/`COALESCE`, default value, retry | In a port this is a behaviour change that silences the case the source would have raised |
| Wrong case on dictionary keys | `grep -nE '\["[A-Z_]{2,}"\]\|\.get\("[A-Z_]{2,}"'` | Returns `None` silently — no error, wrong data |
| The check script changed | `git diff <base> -- .agentes/check-* .agentes/golden-*` must be empty | An implementer that edits the contract can make anything pass |
| Kept a snippet it knew was wrong | The report says "I noticed X but followed the plan" | Diagnosing and not fixing is still shipping the bug |

## Verdicts for delegated work

Use the four verdicts from verificacao.md. For delegated work they mean:

- **VERIFICADO** — the task's safety fact (from its brief) was proven at rung 4 or 5, and no row
  above or in "Checks that lie" applies.
- **DEVOLVIDO** — send it back to **the same** implementer with a correction brief
  (`.agentes/correcao-NN-<k>.md`) that consolidates the original brief, every later directive, the
  prior report and the defect, with why it is a defect. After two failures on the same defect, stop
  sending it back: record it in `decisoes.tsv` as DEVOLVIDO x2 and leave it to the engineer, who
  decides whether to fix it or re-plan. The reviewer never implements.
- **INCONCLUSIVO** — goes to the engineer with what was tried.
- **BLOQUEADO** — reported by the implementer; goes to the engineer with its reason.

Record one `.agentes/revisao-NN.md` per task, headed with the verdict and the **commit SHA it
reviewed**. A new commit on that task voids the verdict: review again. A task is closed only when
it is VERIFICADO, or escalated (DEVOLVIDO x2, INCONCLUSIVO, BLOQUEADO). Tasks that do not depend
on it keep running meanwhile.
