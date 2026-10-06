# Playbook: feature

Use for: new behaviour (a flag, an endpoint, a screen, a report, a module). Size: **spike** answers
feasibility only; **delimitado** gets a short design in chat and no plan file; **arquitetural** gets a
written spec and a plan.

## Steps

1. Design for its size and get the user's approval before any code — `../biblioteca/design.md`.
   Read the repo first; ask only what reading cannot answer, one question at a time.
2. Plan (arquitetural only) — `../biblioteca/plano.md`; the user chooses how it runs.
3. Execute: inline; or skill `orquestra` for many tasks on opencode; or skill `arena` for one task
   whose shape is open. Models from `../biblioteca/modelos.md`.
4. Tests by the pragmatic rule — `../biblioteca/testes.md` — and verify every task —
   `../biblioteca/verificacao.md`.
5. Review: arquitetural → skill `interrogar` on the branch; delimitado → one review of the diff
   against the approved design. Handle findings with `../biblioteca/revisao-recebida.md`.
6. Finish — `../biblioteca/finalizacao.md`.

## Done means

- The behaviour the approved design describes is shown working (command, request or screen, with
  its output).
- Project checks green in this message; review findings fixed or declined with a reason.
- Every step not run is listed as `pulado: <motivo>`.

## Stop and ask when

- The design has not been approved for its size.
- The work turns out bigger than its size (a delimitado that needs a new module): say so and move
  to arquitetural.
- A choice changes cost, data or an interface someone else depends on.
