# Playbook: portagem

Use for: porting or migrating code where the new version must behave like the old one (PL/SQL →
Python, an old job → a new scheduler, a module → another stack). Size: **spike** answers "can this
be ported?" only; **delimitado** (one function or query) runs steps 1, 2, 4, 5, 7; **arquitetural**
(many units) runs all steps and writes a spec first (`../biblioteca/design.md`).

## Steps

1. Read the source in full and confirm the scope with the user: what is ported, what stays, who
   calls it today, whether old and new run side by side. Read the source yourself (repo, database
   dictionary with SELECT only); ask only what reading cannot answer.
2. Capture **golden outputs** from the source before writing any code, and write `check-NN.sh`
   that compares new against golden — `../biblioteca/verificacao.md` (Golden outputs). Keep both
   out of the implementer's write scope. If the source has side effects (writes, e-mails, files sent),
   capture them in a non-production environment or by reading what a past run produced; never
   trigger them against production to get a golden file.
3. Arquitetural: write and get approval for a spec first — `../biblioteca/design.md` — then plan
   with verifiable tasks — `../biblioteca/plano.md`.
4. Execute: few tasks → inline; many → skill `orquestra` (models from `../biblioteca/modelos.md`).
   Fidelity first: copy behaviour, including the source's bugs, unless the user decides otherwise.
5. Verify every task: the parity check, plus every row of "Checks that lie" and the port-specific
   signals in `../../orquestra/reviewing.md` (guard the source lacks, wrong-case keys, rewrote instead of
   copied). Run migrations twice.
6. Large or risky port: skill `interrogar` with the faithful-port filter before finishing.
7. Finish — `../biblioteca/finalizacao.md`.

## Done means

- `check-NN.sh` passes for every ported unit, with its output shown, over a non-empty input.
- Each task has a verdict (VERIFICADO / INCONCLUSIVO / BLOQUEADO) tied to a commit.
- Every behaviour difference from the source is listed and was approved by the user.

## Stop and ask when

- The source cannot be read or run to capture golden outputs.
- The source has a bug and fixing it would change behaviour others depend on.
- Old and new must coexist and nobody has said how the switch happens.
