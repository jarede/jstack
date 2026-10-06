# Playbook: prototipo

Adapted from pstack prototype, principle-exhaust-the-design-space (Lauren Tan, MIT).

Use for: settling a design or behaviour fork cheaply by observing it (cursor vs BULK COLLECT, which layout, which query shape), or when [autonomia](../biblioteca/autonomia.md) (Before you ask) sends a question here.
Speed over polish. The prototype is throwaway; the real build follows. No waiting. Size is always **spike**.

## Steps

1. Name the decision the prototype settles. No decision means no prototype; go to [feature](feature.md).
2. Work in `.agentes/prototipo-<tema>/`, never in production source. Build the smallest script, query, or page that shows the fork.
3. Build 2 to 3 variants behind one switch (one CLI flag or one env var). Label each variant.
4. Observe each variant on the real surface: timing, output, row counts; one screenshot for UI.
5. For a port, run each variant through the golden check when one exists; keep results green.
6. Present variants, evidence, and trade-offs in the reply:

| Variant | Evidence | Trade-off |
|---|---|---|
| A | timing, output, row counts | what it costs |
| B | timing, output, row counts | what it costs |

7. State one recommendation and say plainly the prototype is throwaway.
8. Continue the parent playbook at once with the chosen direction ([bug](bug.md), [perf](perf.md), [feature](feature.md) or [portagem](portagem.md)); do not wait.

## Done means

- The decision is settled by observed evidence, not by opinion.
- Variants, evidence, trade-offs, and one recommendation are in the reply.
- The scratch path is named and the artifact is marked throwaway.

## Pause only for

- [Always pause](../biblioteca/autonomia.md) items (production writes, deploys, messages to others).
- The fork needs a product call no observation settles; propose a default and keep working.
