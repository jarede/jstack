# Playbook: bug

Use for: something behaves wrongly (wrong value, error, hang, regression), or a read-only
investigation ("por que…", "investiga…"). Size: an investigation is a **spike** and ends at step 3;
**delimitado** runs every step without a plan file; **arquitetural** (the fix restructures something)
adds the design approval in step 4.

## Steps

1. Reproduce the symptom on the real system or the closest you can reach, with the exact steps and
   what you observed — `../biblioteca/debugging.md` (Reproduce first). No reproduction →
   **INCONCLUSIVO**: report what was tried and what is needed, and stop.
2. Find the root cause: what changed, trace the bad value back to where it is created, one
   hypothesis at a time — `../biblioteca/debugging.md`. Three failed fixes → question the premise.
3. If the request is an investigation only: report facts and hypotheses separately, with evidence
   pointers (file:line, commit, query and its result), and stop here.
4. Arquitetural: get the fix's design approved first — `../biblioteca/design.md`. Fix at the cause,
   never with a guard that silences. Add a regression test when the test path is
   cheap and local — `../biblioteca/testes.md`; otherwise keep the reproduction before/after as the
   evidence (`pulado: <motivo>` for the test).
5. Verify — `../biblioteca/verificacao.md`: the original reproduction now passes, the project's
   checks are green, outputs shown.
6. Finish — `../biblioteca/finalizacao.md`.

## Done means

- The reproduction from step 1, re-run, no longer shows the symptom (output shown).
- The cause is stated as a fact with evidence, not as a hypothesis.
- Project checks green in this message; a verdict is given.

## Stop and ask when

- The symptom cannot be reproduced with the access you have.
- The fix needs production data access, a deploy or a change in another team's system.
- The root cause is a design decision, not a defect.
