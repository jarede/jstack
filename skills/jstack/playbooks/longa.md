# Playbook: longa

Adapted from pstack autonomous-run (Lauren Tan, MIT).

Use for: work that runs for hours without the user watching ("durante a noite", "até amanhã",
"sozinho"). It always **wraps another playbook** (portagem, bug or feature), whose steps run inside
this contract.

## Steps

1. State the exit condition as a checkable predicate. Write the contract to `.agentes/contrato.md`
   (template below). Show it in the first message and start. No approval wait.
2. Create a fresh worktree for the run — `../biblioteca/plano.md` (Workspace).
3. Pick the wake mechanism: Claude Code background wait or `/loop`; opencode a background shell that
   writes to a file.
4. Each iteration makes the smallest change the evidence justifies, verifies it against the
   predicate, commits if it advanced, discards it otherwise. One row per iteration in
   `.agentes/decisoes.tsv`.
5. Mid-run discoveries are yours (broken skill, flaky check, related bug: fix in its own commit).
   Do not park reversible work. Surface only Always pause items, product calls, or a real dead end.
6. A plateau is not a stop: change direction. Never relax the predicate.
7. Stopping early or near the context limit: `pausar.md`.
8. End: the `longa auditor` writes an `## Atenção` section in `.agentes/RELATORIO-FINAL.md`. Finish
   with `../biblioteca/finalizacao.md`: branch pushed and PR opened, no merge.

## Contract template

```markdown
# Contrato — <tema>
- Objetivo: <uma frase>
- Pronto significa: <condição checável + comando que prova>
- Playbook envolvido: portagem | bug | feature
- Worktree: <caminho> (branch <nome>)
- Permissões já respondidas: <o que pode sem perguntar, default `../biblioteca/autonomia.md`; o que nunca pode>
- Orçamento: <horas> e <custo/modelos>
- Saída de emergência: se travar, pare, escreva o porquê em RETOMAR.md e encerre.
```

## decisoes.tsv

```
hora	fase	decisao	motivo	evidencia	resultado
```

Path: `.agentes/decisoes.tsv`. Wrapped perf attempts go to `.agentes/medicoes.tsv` (see [perf](perf.md)).

Evidence is a pointer (file, commit, log line), never prose.

## Done means

- The contract's "pronto significa" is met, with the proving command's output in
  `RELATORIO-FINAL.md`; or the run stopped through the emergency exit with `RETOMAR.md` written.
- `decisoes.tsv` has one row per decision; the auditor's `## Atenção` section exists.

## Pause only for

- [Always pause](../biblioteca/autonomia.md) items. They park; the run continues around them.
- Something outside the contract's permissions is needed: surface it. Default is to keep going on
  everything inside the contract meanwhile.
- A real dead end: surface it with the evidence. Default is to pivot first before calling it one.
