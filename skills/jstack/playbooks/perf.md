# perf

Adapted from pstack perf-issue, hillclimb (Lauren Tan, MIT).

Use for: a measured slowness or a regression in time or resources.

A regression ("it took 10 min, now it takes 40") is perf work, not a bug-or-feature debate:
record the baseline, set a target, and show the real plan.

## Steps

1. Build the measurement harness first: one script that runs the slow path on realistic data
   and prints the metric, the rows processed, and the errors. Record the baseline. Vet the
   harness with `../biblioteca/medicao.md`. Anything that writes to a production or shared
   database is an Always pause item.
2. Understand the path with the `como-funciona` skill (`../../como-funciona/SKILL.md`).
   For "it used to be fast", seed hypotheses with `git log` over the path and the `por-que`
   skill (`../../por-que/SKILL.md`, on demand: read the SKILL.md first).
3. Try the performance mantras in order, cheapest first. Stop at the first that meets the target:
   1. Don't do it. Drop work whose result nothing uses.
   2. Do it, but don't do it again. Keep the result and reuse it.
   3. Do it less. Fewer times, in bigger batches.
   4. Do it later. Off the hot path.
   5. Do it when they're not looking. When nobody waits.
   6. Do it concurrently. Across workers.
   7. Do it cheaper. Less work per item.
4. One change, one measurement, keep or revert. Log one row per attempt in
   `.agentes/medicoes.tsv` (`hora	hipotese	mudanca	antes	depois	delta	testes	veredito`).
   Never stack untested changes. Keep the correctness gates green (tests, golden outputs).
   Decisions that are not attempts (target chosen, harness frozen) go to `.agentes/decisoes.tsv` in the format of [longa](longa.md).
5. A plateau is not a stop: change mantra category before concluding. For a long target-driven
   loop, wrap this playbook in [longa](longa.md).
6. Finish with `../biblioteca/finalizacao.md`, citing the number.

## Done means

- Baseline and final numbers from the same harness, plus the delta.
- The artifact path: `.agentes/medicoes.tsv` with the runs.
- Correctness checks green.
- No stacked untested changes: each kept change has its own row and measurement.

## Pause only for

- The [Always pause](../biblioteca/autonomia.md#always-pause) list.
  While one item waits, keep doing the work that does not depend on it.
- A target only the user can set, when none was given. Propose one from the baseline
  and proceed with it.
