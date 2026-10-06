# Reviewing a delegated delivery

Used by the reviewer on every task, and by the engineer on the final pass. The rule this file
exists to serve: **a report is a claim, not evidence.**

## Reviewing: Completion Is Not Correctness

The reviewer verifies with its own hands before accepting anything:

```bash
just check && just test          # or the repo's equivalent
git show --stat HEAD
bash .agentes/check-NN.sh        # the parity/check script the engineer wrote, if the task has one
```

Then reads the code for the signals that a report will never volunteer:

| Signal | How to catch it | Why it matters |
|---|---|---|
| Rewrote what should have been copied | `diff` the ported function against the source | Reinvented business logic passes tests and fails in production |
| Invented an API workaround | New SQL/helper that duplicates something the framework already exposes | One agent wrote `select max(id)` instead of using `var()` for `RETURNING INTO` — under concurrent load that returns someone else's row |
| Test cannot fail | Ask: would it still pass if the code under test returned a **wrong but plausible** value (wrong rows, wrong total, empty list)? Shapes that fail this: `assert result`, `assert result is not None`, `assert len(rows) > 0`, only `mock.assert_called_once()`, an expected value computed by calling the code under test | A test that cannot fail proves nothing — compare against a **literal** expected value |
| Guard the source does not have | New `try/except`, `if x is None: return`, `NVL`/`COALESCE`, default value, retry | In a port this is a behaviour change that silences the case the source would have raised |
| Wrong case on dictionary keys | `grep -nE '\["[A-Z_]{2,}"\]\|\.get\("[A-Z_]{2,}"'` | Returns `None` silently — no error, wrong data |
| It did not actually happen | Parity over 0 rows, a cursor never fetched, a transaction never committed, an exception caught and logged | A check that ran on nothing is green and meaningless |
| Not idempotent | Run the migration/ETL/script a **second** time; the end state must be identical | Reruns after a crash are normal; a second run that duplicates rows is a production incident |
| The check script changed | `git diff <base> -- .agentes/check-*` must be empty | An implementer that edits the contract can make anything pass |
| Kept a snippet it knew was wrong | The report says "I noticed X but followed the plan" | Diagnosing and not fixing is still shipping the bug |

**A check that passes too easily is suspect.** Before accepting it, ask what else it could be
measuring — the wrong database, a cached result, the old build, an empty table.

## Evidence Ladder

Every claim in a report sits on one rung. Name the rung in the review:

1. **Said** — "it works". Worthless on its own; reject.
2. **Cited** — points at a file:line.
3. **Walked** — traced the call path by reading.
4. **Ran** — executed real code and pasted the literal output.
5. **Reproduced** — showed the bug before and its absence after, on the same input.

Accept a task only on rung 4 or 5 for its safety fact (see SKILL.md, The Brief Contract).

## Verdict

Every task ends with exactly one of:

- **VERIFICADO** — the safety fact was proven at rung 4+ and the signals table is clean.
- **DEVOLVIDO** — a defect was found; it goes back to the same implementer (below).
- **INCONCLUSIVO** — the check could not be run or could not discriminate. **Inconclusive is not a
  pass**; it goes back to the engineer with what was tried. Do not hide a negative.

Send DEVOLVIDO work back to **the same** implementer with a correction brief
(`.agentes/correcao-NN-<k>.md`) that consolidates the original brief, every later directive, the
prior report and the defect, with why it is a defect.
After two failures on the same defect, stop sending it back: record it in `decisoes.tsv` as
DEVOLVIDO x2 and leave it to the engineer, who decides whether to fix it or re-plan. The reviewer
never implements.

Record one `.agentes/revisao-NN.md` per task, headed with the verdict and the **commit SHA it
reviewed**. A new commit on that task voids the verdict: review again. A task is closed only when
it is VERIFICADO, or escalated (DEVOLVIDO x2, INCONCLUSIVO, or the implementer reported
BLOQUEADO). Tasks that do not depend on it keep running meanwhile.
