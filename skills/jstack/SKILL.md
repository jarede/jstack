---
name: jstack
description: Use when the user invokes /jstack (or @jstack) to run a task through jstack's engineering process - porting/migrating code, fixing or investigating a bug, building a feature, or a long unattended run.
disable-model-invocation: true
---

# jstack

An on-demand engineering process. You were invoked with a request; run it through exactly one
playbook, at the right size, with the standing rules below. Nothing here runs unless the user calls
`/jstack`.

Adapted from superpowers (Jesse Vincent) and pstack (Lauren Tan, the poteto), both MIT — see the
repository's NOTICE.md.

## 1. Classify

Pick one playbook:

| Playbook | Use for | Examples |
|---|---|---|
| [portagem](playbooks/portagem.md) | the new code must behave like existing code | "porta a procedure X para Python"; "migra os jobs do cron para o scheduler, mesma saída" |
| [bug](playbooks/bug.md) | something behaves wrongly, or a read-only "why/investigate" | "o relatório está dobrando valores"; "por que o sync demora 40 min?" |
| [feature](playbooks/feature.md) | new behaviour | "adiciona exportação CSV"; "cria um endpoint de saúde" |
| [longa](playbooks/longa.md) | hours without the user watching | "roda a portagem das 15 procedures durante a noite" |

- `longa` always **wraps** one of the other three: say which ("longa + portagem").
- **Ambiguous between two** (e.g. "o export está lento, melhora" — bug or feature?): ask **exactly
  one** question that decides it, then continue.
- **Fits none** (a factual question, a one-line explanation, a chat): say that no playbook applies
  and answer directly, without process.

Tell the user the playbook you chose, in one line, before starting.

## 2. Size

Classify the size as **spike**, **delimitado** or **arquitetural** using
`biblioteca/design.md` (section Size). When in doubt, take the heavier. Each playbook says which of
its steps run for each size. Size only goes up during the task, never down.

## 3. Copy the steps

Copy the chosen playbook's `## Steps` **verbatim** into the task list (Claude Code: the task/todo
tool; opencode: `.agentes/jstack-<tema>.md`, see `biblioteca/ferramentas.md`). A step that does not
run for this size, or that you decide to skip, **stays in the list** as `pulado: <motivo>` — never
delete it. Also copy the playbook's `## Done means` as the final item.

## 4. Run

Work the steps in order. When a step points to a library file or a skill, read that file (or follow
that skill) at that moment, not before. Mark each step done only with its evidence. When a step
cannot continue, stop with the right verdict (INCONCLUSIVO or BLOQUEADO,
`biblioteca/verificacao.md`) and tell the user what is needed.

## Standing rules

These hold for the whole request:

1. **Evidence before claims.** Nothing is "done", "fixed" or "passing" without the command and its
   output in the same message — `biblioteca/verificacao.md`.
2. **Ask only what you cannot find out.** Read the repo, the database (SELECT only) and the docs
   first. Then one question per message.
3. **Models are the user's decision.** Roles come from `~/.config/jstack/modelos.conf` —
   `biblioteca/modelos.md`. Never pick a model yourself.
4. **Nothing irreversible without a choice.** No merge, push, PR, deploy, deletion or message to
   anyone without the user choosing it — `biblioteca/finalizacao.md`.
5. **Approval is per stage.** Approving an idea does not approve the code; approving a design does
   not approve a merge.

## Harness

Claude Code and opencode have different tools for asking, tracking and delegating:
`biblioteca/ferramentas.md`.

## Map

| Library file | Covers |
|---|---|
| [design.md](biblioteca/design.md) | size, questions, options, prototypes, approval, spec |
| [plano.md](biblioteca/plano.md) | file map, throughput checkpoint, tasks, review focus, worktrees, hand-off |
| [verificacao.md](biblioteca/verificacao.md) | the gate, evidence ladder, checks that lie, golden outputs, verdicts |
| [testes.md](biblioteca/testes.md) | when to test first, tests that can fail, when to skip |
| [debugging.md](biblioteca/debugging.md) | reproduce, root cause, three failed fixes, fix at the cause |
| [finalizacao.md](biblioteca/finalizacao.md) | options, PR body, clean up |
| [revisao-recebida.md](biblioteca/revisao-recebida.md) | handling review findings |
| [modelos.md](biblioteca/modelos.md) | model per role, `/jstack-setup` |
| [ferramentas.md](biblioteca/ferramentas.md) | tool equivalents between harnesses |
| [skills.md](biblioteca/skills.md) | writing and testing skills |

Execution skills used by the playbooks: `orquestra` (opencode reviewer + implementers), `arena`
(competing attempts), `interrogar` (multi-model review), `orchestrating-herdr-agents` (launching
and waiting for CLI agents).
