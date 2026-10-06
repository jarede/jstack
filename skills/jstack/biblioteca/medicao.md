# medicao

Adapted from pstack benchmark-checklist, explain-the-number, perf-issue, hillclimb (Lauren Tan, MIT).

Use this before you trust, report, or act on a number: a speedup, a regression, a latency, or a throughput.

1. Write the claim first, in ship words ("export is 30% faster at p50 on the 60k-row table").
2. Read the measurement script. Note what it times, what it counts, and what it ignores.
3. Check load with `uptime` and cores with `nproc`. If the box is busy, interleave the sides.
4. For a quick ballpark one run is enough. Still check Errors and Work done below, and say it was one run.
5. A choice between options is never a ballpark: run the full checklist.

Answer each question with evidence from a run, not from a guess about the code.

## Checklist

1. **Limiter.** Ask "why not double?" Name what bounds the run: one core, a lock, disk, network,
   or the load driver. Profile in a run you do not report. Map the hot spot to source.
   If a change did not move the number, the limiter says why.
2. **Tuning.** Run both sides as production runs them: same build flags, same settings, same data
   size. Caches as warm or cold as production sees them. A limiter that is a setting means that
   side needs tuning: tune it, then measure again. If one side runs on defaults, you compared
   settings, not code.
3. **Limits.** Do the arithmetic (the limits check). Bytes per second against disk and network
   bandwidth. Ops per second times cost per op against the cores you have. Time saved against time
   the changed piece took. Past a limit means the run measured something else.
4. **Errors.** Count failures and wrong outputs, apart from good results. Rejects are often fast;
   retries and timeouts are slow. Outputs must be right, not just present. If the script hides the
   error count, add the count.
5. **Repeatability.** Take the median of N runs, alternating the sides (A, B, A, B). Run each side
   at least 5 times so warmup and drift hit both. Report the median and the range. A gap smaller
   than run-to-run noise is no measurable difference.
6. **Relevance.** Measure the end-to-end path the user waits on, with realistic size and load.
   Report the piece as a share of the whole. A piece at 1% of the run buys at most 1% when fully
   fixed.
7. **Work done.** Print a count of work done and an error count. The request reached the server.
   Rows were written. Bytes were read. The code used the result. Skipped or cached work prints a
   fine number for nothing done.

## Oracle examples

Use the Oracle column when the number comes from a database job.

| Check | Oracle example |
|---|---|
| Limiter | one hot core parsing rows; elapsed per execution in `V$SQL` |
| Tuning | warm vs cold buffer cache; plan cached in the shared pool or flushed, as production sees it |
| Limits | rows actually processed per second vs I/O and cores; full-scan cost from the real plan |
| Errors | rejected rows and job-log failures counted apart from good rows |
| Repeatability | median of 5 runs, sides alternated, same cache state per side |
| Relevance | elapsed time from the job log vs wall clock for the whole job; the statement as a share of that whole |
| Work done | rows read or written printed by the job; `EXPLAIN PLAN` checked against the real plan |
| Noise | load from `uptime` noted per run; sides interleaved under the same noise |

## Report

1. One primary number with its unit ("p50 41 ms → 33 ms").
2. The run count, the range, and the limiter ("median of 7 runs per side, range 32–35 ms, bound by parse on one core").
3. The verdict: faster, slower, no measurable difference, or inconclusive. Call it inconclusive when the limiter is unnamed, a side ran untuned, or errors or work-done went unchecked.
4. `antes → depois` plus the artifact path: the log, trace, or notes file with the runs.
5. Keep the runs, the range, and the limiter evidence in the artifact, not in the headline.

Vet every number used in `../playbooks/perf.md` with this file before acting on it.
Numbers that must also prove behaviour hold meet `verificacao.md` too.
