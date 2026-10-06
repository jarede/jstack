# Docs: long-form dig

## What this source holds

1. Specs: `docs/specs` holds designs written before the code.
2. Plans: `docs/planos` holds scoped work and past choices.
3. Root docs: README, `AGENTS.md`, `CLAUDE.md` hold standing rules and shape notes.
4. Decision logs: `.agentes/decisoes.tsv` holds dated rows of hypothesis, change, result.
5. Reports: `.agentes/` reports hold past digests, reviews, and findings.

Best at written rationale: the choice weighed before it became code.

## How to dig

1. Search by symbol, procedure, table, or screen name across all five places.
2. Read each hit in full. Motive sits in rejected options and trade-off notes, not headers.
3. Follow links inside docs: spec to plan, plan to decision row, report to commit.
4. Read `.agentes/decisoes.tsv` newest-first around the target dates.
5. Cross-source links stay out. A doc naming a ticket is a lead for the tracker dig, not a detour.
6. Stale docs happen. Check the doc date against the code date. Say which is newer.

## Strong proof here

1. A spec naming the picked option and the dropped ones, with reasons.
2. A plan scoping the work to a named fault or demand.
3. A decision row tying a change to a measured result.
4. A report quoting the author motive verbatim.

## Traps

1. Plan as proof of code. A plan states intent. Only the diff proves it landed.
2. Stale shape. Docs rot. The code wins on what, the doc wins on why, dates decide.
3. Copied rationale. A new doc may paste an old motive. Trace to the first writer.
4. Missing docs. No spec for old code is normal. Name the gap.

## What to return

Each doc, row, or report that touches the question, with path, exact quoted lines, dates, and the label `medido` (states why) or `inferido` (hints why). Plus the queries run and the empty ones.
