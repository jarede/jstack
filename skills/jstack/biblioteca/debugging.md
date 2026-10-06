# Debugging

**Find the root cause before proposing any fix. A fix for a symptom is a failure.**

Adapted from superpowers `systematic-debugging` (Jesse Vincent, MIT) and pstack
`principle-fix-root-causes`, `principle-attack-the-premise` (Lauren Tan, MIT).

## Reproduce first

1. Read the error, the stack trace and the logs completely. Line numbers, codes and the first
   error matter more than the last one.
2. Reproduce the symptom yourself, on the real system or the closest you can reach (the same data,
   the same command, the same store). Write down the exact steps and what you observed.
3. **No reproduction → INCONCLUSIVO.** Report what you tried and what you would need (data,
   access, a date, an example), and stop. Do not fix a bug you have not seen.

For a read-only investigation, the deliverable ends here plus the root-cause section below: facts
and hypotheses, clearly separated.

## Root cause

- **What changed?** `git log --since`, `git log -S '<texto>'`, deploys, config, data loads.
- **Where does the bad value come from?** Trace it backwards from the symptom, call by call, to the
  first place it is wrong. In a multi-component path (job → procedure → table → API), log what
  enters and leaves each boundary once, and find the boundary where it breaks.
- **What works?** Find a similar case that works and list every difference.
- **One hypothesis at a time.** Write it ("X is the cause because Y"), make the smallest change or
  query that would prove it wrong, run it. Confirmed → continue; refuted → new hypothesis. Never
  change several things at once.
- **Say "I don't know yet"** rather than presenting a guess as a cause. Label every unproven
  statement as a hypothesis.

## After three failed fixes

If three fixes have failed, or each fix uncovers a new problem somewhere else, stop fixing:

1. Write down the premise all the fixes shared ("the price comes from table A", "the job runs once
   a day").
2. Check the premise against the system, not against the code you are reading.
3. Question the design itself before trying a fourth fix, and bring the finding to the user. It is
   a discussion, not another attempt.

## Fix at the cause

- Fix where the wrong value is created, not where it is noticed.
- **A guard that silences is not a fix**: `try/except: pass`, `if x is None: return`, `NVL` on the
  symptom, a retry around a broken contract. Each hides the case that should have failed.
- No "belt and suspenders": an extra defensive check alongside the fix is a hypothesis you did not
  test, and it makes the next bug harder to see.
- Prove the fix: the reproduction from the first step, before and after, on the same input. Add a
  regression test when the test path is cheap (`testes.md`).

## Red flags

Stop and go back to "Reproduce first" when you catch yourself thinking:

- "quick fix now, investigate later"
- "let me just try changing X"
- "it is probably X" without having run anything
- "one more attempt" after two have failed
- listing fixes before tracing the data
