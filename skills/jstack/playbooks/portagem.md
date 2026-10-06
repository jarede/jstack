# Playbook: portagem

Adapted from pstack refactoring (Lauren Tan, MIT).

Use for: porting or migrating code where the new version must behave like the old one (a routine in
another language, an old job on a new scheduler, a module on another stack). Size: **spike** answers
"can this be ported?" only; **delimitado** ports one unit; **arquitetural** ports many and writes a
spec first.

## Steps

1. Read the source in full. State the scope as decisions in the reply: what is ported, what stays,
   who calls it, whether old and new coexist. Defaults: side by side, no switch-over, fidelity
   including the source's bugs. Only the switch-over and changing behaviour others depend on are the
   user's calls; follow the defaults meanwhile.
2. Pin behaviour first: capture **golden outputs** from the source and a check that compares new
   against golden — `../biblioteca/verificacao.md`. Capture in a non-production copy or from a past
   run's output, never by writing to production.
3. Arquitetural: Architect sketch first — `../biblioteca/design.md` — then a plan file when the work
   runs under orquestra — `../biblioteca/plano.md`.
4. Execute: few tasks → inline; many → skill `orquestra` (models from `../biblioteca/modelos.md`).
   Fidelity first: copy behaviour unless a scope decision says otherwise.
5. Refactor inside the port: subtract before you add; migrate all callers and delete the old API in
   the same wave when old and new need not coexist; revert a diff that does not lower reader load.
6. Verify every task: the parity check, plus the port signals in `../../orquestra/reviewing.md`.
   Run migrations twice.
7. Large or risky port: skill `interrogar` with the faithful-port filter before finishing.
8. Finish — `../biblioteca/finalizacao.md`.

## Done means

- The parity check passes for every ported unit, with its output shown, over a non-empty input.
- Each task has a verdict (VERIFICADO / INCONCLUSIVO / BLOQUEADO) tied to a commit.
- Every behaviour difference from the source is listed and was approved by the user.

## Pause only for

- [Always pause](../biblioteca/autonomia.md) items. They park; work continues around them.
- The source cannot be read or run to capture golden outputs: say what is missing. Default is to
  proceed with the readable part meanwhile.
- The switch-over, or a fix to a source bug that changes behaviour others depend on: the user's
  call. Default is side by side with bugs kept until they decide.
