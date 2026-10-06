# Playbook: bug

Adapted from pstack bug-fix (Lauren Tan, MIT).

Use for: something behaves wrongly (wrong value, error, hang, regression). A regression is a bug,
not a bug-or-feature question. Slowness with correct output goes to `perf.md`. Read-only questions
go to [investigacao](investigacao.md).

## Steps

1. Reproduce it yourself on the real surface, or the closest you can reach. Synthesize the trigger
   or instrument until it fires. Ask the user only with a specific reason, after driving it as far
   as it goes. A reproduction that would write to a production or shared database is an Always pause
   item — `../biblioteca/autonomia.md`. No reproduction → INCONCLUSIVO: report what was tried, stop.
2. Binary-search the cause. List candidate hypotheses, seeded by skill `como-funciona` —
   `../../como-funciona/SKILL.md` — and, for regressions, skill `por-que` (on demand: read
   `../../por-que/SKILL.md`). Rule them out with runtime evidence — `../biblioteca/debugging.md`.
3. Fix at the cause. Architect sketch when the fix crosses a function boundary —
   `../biblioteca/design.md`. A belt-and-suspenders change does not ship. Revert what refuted
   hypotheses motivated.
4. Verify on the same surface — `../biblioteca/verificacao.md`. The original reproduction now passes.
5. Commits: the failing reproduction or test lands before the fix — `../biblioteca/testes.md`.
6. Finish — `../biblioteca/finalizacao.md`.

## Done means

- The reproduction from step 1, re-run, no longer shows the symptom (output shown).
- The cause is stated as a fact with evidence, not as a hypothesis.
- Project checks green in this message; a verdict is given.

## Pause only for

- [Always pause](../biblioteca/autonomia.md) items. They park; work continues around them.
- The root cause is a product decision, not a defect: present it with a recommendation and keep the
  reproduction. Default is to keep the reproduction and wait on that call only.
