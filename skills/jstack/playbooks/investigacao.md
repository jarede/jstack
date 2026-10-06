# investigacao
Adapted from pstack investigation, principle-exhaust-the-design-space (Lauren Tan, MIT).

Use for: read-only questions (how X works, why Y is so, who decided, since when, "are you sure?", X or Y?).
Size is always **spike**. No code change. No waiting: reading, `git log`, and SELECT queries are Just do it items per [autonomia](../biblioteca/autonomia.md) (`../biblioteca/autonomia.md`).

## Steps

1. Route "how" questions to skill [como-funciona](../../como-funciona/SKILL.md) (`../../como-funciona/SKILL.md`); follow it.
2. Route "why / who decided / since when" to skill [por-que](../../por-que/SKILL.md) (`../../por-que/SKILL.md`); it is on-demand, so read its SKILL.md first and follow it.
3. Mixed questions use both skills; run the two tracks in parallel and merge at the end.
4. Throughput checkpoint is one line: `n/a: investigação só de leitura`.
5. Write the answer in the como-funciona shape (Overview, Key Concepts, How It Works, Where Things Live, Gotchas). For "X or Y", write a recommendation with a trade-off table instead:

| Option | Evidence | Trade-off |
|---|---|---|
| X | file:line, commit, or query result | what it costs |
| Y | file:line, commit, or query result | what it costs |

6. Keep facts and hypotheses apart. Each claim carries its evidence pointer or its label (medido, inferido, palpite).
7. "Are you sure?" gets a real judgment with reasons. Push back when the premise is wrong.
8. If the user also asked for a change, continue at once under [bug](bug.md), [perf](perf.md), or [feature](feature.md).

## Done means

- Every claim has an evidence pointer or a label (medido, inferido, palpite).
- Facts and hypotheses sit in separate lists.
- "X or Y" ends with one recommendation and its trade-off table.

## Pause only for

- [Always pause](../biblioteca/autonomia.md) items (production writes, deploys, messages to others).
- The question needs data you cannot read; name what is missing and stop as INCONCLUSIVO.
