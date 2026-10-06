# Playbook: longa

Use for: work that runs for hours without the user watching ("durante a noite", "até amanhã",
"sozinho"). It always **wraps another playbook** (portagem, bug or feature), whose steps run inside
this contract. Adapted from pstack's overnight guide (Lauren Tan, MIT).

## Steps

1. Ask the user whether they have already seen this kind of task succeed with supervision. If not,
   recommend running it supervised first, and continue only if the user insists.
2. Write the contract to `.agentes/contrato.md` (template below) and get the user's approval of it.
3. Create a fresh worktree for the run — `../biblioteca/plano.md` (Workspace).
4. Run the wrapped playbook's steps under the loop discipline: one change, one check, one row in
   `.agentes/decisoes.tsv`. Discard changes that did not help. The "done means" of the contract is
   **never relaxed** during the run. Delegated work uses skill `orquestra` with its deadlines.
5. Pause safely when stopping, blocked or near the context limit: commit `wip: <estado>` and write
   `.agentes/RETOMAR.md` (what is done, what is next, open decisions).
6. At the end, an auditor from another model family (role `longa auditor` in
   `../biblioteca/modelos.md`) reads `decisoes.tsv` and the diff and writes an `## Atenção` section
   in `.agentes/RELATORIO-FINAL.md`. Nothing is merged: finishing waits for the user —
   `../biblioteca/finalizacao.md`.

## Contract template

```markdown
# Contrato — <tema>
- Objetivo: <uma frase>
- Pronto significa: <condição checável + comando que prova>
- Playbook envolvido: portagem | bug | feature
- Worktree: <caminho> (branch <nome>)
- Permissões já respondidas: <o que pode sem perguntar; o que nunca pode>
- Orçamento: <horas> e <custo/modelos>
- Saída de emergência: se travar, pare, escreva o porquê em RETOMAR.md e encerre.
```

## decisoes.tsv

```
hora	fase	decisao	motivo	evidencia	resultado
```

Evidence is a pointer (file, commit, log line), never prose.

## Done means

- The contract's "pronto significa" is met, with the proving command's output in
  `RELATORIO-FINAL.md`; or the run stopped through the emergency exit with `RETOMAR.md` written.
- `decisoes.tsv` has one row per decision; the auditor's `## Atenção` section exists.

## Stop and ask when

- The contract is not approved, or the precondition is not met and the user has not insisted.
- Something outside the contract's permissions is needed.
- The emergency exit fires.
