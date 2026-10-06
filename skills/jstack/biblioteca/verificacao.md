# Verification

**No claim of done, fixed or passing without the command and its output in the same message.**

Adapted from superpowers `verification-before-completion` (Jesse Vincent, MIT) and pstack
`prove-it-works`, `explain-the-number`, `blast-radius` (Lauren Tan, MIT).

## The gate

Before saying anything is done, works, passes or is fixed, and before every commit, PR or hand-off:

1. **Identify** the command that proves the claim. Not a related command: the one whose output
   answers the question.
2. **Run** it now, in full. A previous run, a partial run or a run by someone else does not count.
3. **Read** the whole output and the exit code. Count failures; do not skim for "OK".
4. **State** the result with the evidence. If the output does not confirm the claim, state the
   actual status instead.

| Claim | Requires | Not enough |
|---|---|---|
| Tests pass | The test command, 0 failures, in this message | "should pass", an earlier run |
| Bug fixed | The original symptom, re-run, now absent | code changed |
| Regression test works | It failed without the fix and passes with it | it passes |
| Delegated task done | The diff and the check run by you | the agent's report |
| Requirements met | Each requirement checked against the result | tests pass |

## Evidence ladder

Every claim sits on one rung. Name the rung when you report.

1. **Said** — "it works". Worthless on its own.
2. **Cited** — points at a file and line.
3. **Walked** — the call path was traced by reading.
4. **Ran** — real code was executed and the literal output is shown.
5. **Reproduced** — the failure was shown before and its absence after, on the same input.

Accept a change only on rung 4 or 5 for the fact it is safe because of.

## Checks that lie

A check can be green and prove nothing. Before trusting one, ask:

| Trap | Ask | Typical case |
|---|---|---|
| The test cannot fail | Would it still pass if the code returned a wrong but plausible value? | `assert result`, `assert len(rows) > 0`, only `assert_called_once()`, expected value computed by the code under test |
| It ran over nothing | How many rows, files or calls did it actually touch? | parity over 0 rows, cursor never fetched, transaction never committed, exception caught and logged |
| Not idempotent | Is the end state identical after a second run? | migration or ETL duplicating rows on rerun |
| It passes too easily | What else could it be measuring? | wrong database, cached result, old build, empty table |
| A number without a limiter | Why is it not twice as good? What else could produce it? | a speed-up from skipped work or errors |

When a check fails, suspect the observation method before the system. When it passes too easily,
suspect it the same way.

## Golden outputs

For any change that must preserve behaviour (a port, a migration, a refactor):

1. Before changing anything, run the original and save its output to a file
   (`.agentes/golden-NN.*` or `tests/golden/`): the rows, the totals, the generated file.
2. Write the comparison as a script (`check-NN.sh`) that runs the new code on the same input and
   diffs against the golden file. A script can be re-run by a reviewer; an eyeball cannot.
3. Keep the script and the golden files out of the implementer's reach: whoever writes the code
   must not be able to edit the contract it is judged by. When you implement it yourself, commit
   the golden files and the script **in their own commit before any code**, and show
   `git diff <that commit> -- <golden> <check>` empty at the end.
4. Running the source may write data, send e-mails or files. **Ask before executing anything that
   writes**, and prefer a non-production copy or the output of a past run.
5. Where they live: `.agentes/` is local scratch (add it to `.git/info/exclude`); golden files that
   should stay as permanent regression tests go to the project's `tests/` and are committed.

## Verdict

Every task or claim ends with exactly one status:

- **VERIFICADO** — the safety fact was proven at rung 4 or 5, and no check above lies.
- **DEVOLVIDO** — a defect was found; it goes back to whoever made it, with the evidence.
- **INCONCLUSIVO** — the check could not run, or could not tell right from wrong. It is **not a
  pass**: report what was tried and stop. Do not hide a negative.
- **BLOQUEADO** — work could not continue (missing access, missing decision, timeout); say what
  is needed.

## Red flags

Stop and run the gate when you notice:

- "should work", "probably", "seems to", "looks right"
- satisfaction before evidence ("pronto!", "perfeito!")
- trusting a sub-agent's or implementer's report without the diff and your own run
- a check that touched fewer items than you expected, or exactly zero
- about to commit, push or hand off without having run the check in this message
