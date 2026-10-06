# Playbook: feature

Adapted from pstack feature (Lauren Tan, MIT).

Use for: new behaviour (a flag, an endpoint, a screen, a report, a module). Size: **spike** answers
feasibility only; **delimitado** names the shape in chat and builds; **arquitetural** writes a spec
or plan first.

## Steps

1. Learn the affected code with skill `como-funciona` — `../../como-funciona/SKILL.md`. A one-file
   change may skip it as `pulado: <motivo>`.
2. Design for the size — `../biblioteca/design.md`. Name the data shape first. Architect sketch when
   the change crosses a function boundary. No waiting: build after naming the shape.
3. Write the throughput checkpoint as four todo items — `../biblioteca/plano.md`. Each item answered
   or `n/a: <motivo>`.
4. Execute: few tasks → inline; many tasks → skill `orquestra` (needs a written plan,
   `../biblioteca/plano.md`, When to write a plan); several valid shapes → skill `arena`.
5. Tests — `../biblioteca/testes.md` — and verification on the real surface —
   `../biblioteca/verificacao.md`.
6. Small ordered commits. Verify each unit before the next. One change, one check.
7. Review: contested design or arquitetural size → skill `interrogar`; else a fresh subagent
   (Claude Code `Agent` tool, opencode `subagent` tool) reviews the diff against the design. Handle
   findings with `../biblioteca/revisao-recebida.md`.
8. Finish — `../biblioteca/finalizacao.md`.

## Done means

- The new behaviour is shown working on the real surface (command, request or screen, with output).
- Project checks green in this message; review findings fixed or declined with a reason.
- Every step not run is listed as `pulado: <motivo>`.
- A verdict (VERIFICADO / INCONCLUSIVO / BLOQUEADO) is given.

## Pause only for

- [Always pause](../biblioteca/autonomia.md) items (production writes, deploy, merge to shared
  branches, messages to others). They park; work continues around them.
- The work grows past its size (a delimitado needing a new module): say so, move to arquitetural.
  Default is to keep going at the new size.
- A choice changes cost, data, or an interface others depend on: state the default, keep working on
  the rest meanwhile.
