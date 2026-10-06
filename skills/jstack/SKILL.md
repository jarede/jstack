---
name: jstack
description: Use when the user invokes /jstack (or @jstack) to run a task through jstack's engineering process - investigating how or why something works, fixing a bug, improving performance, building a feature, porting or refactoring code, prototyping a decision, a long unattended run, or resuming or pausing work.
disable-model-invocation: true
---

# jstack

An on-demand engineering process. You were invoked with a request. Run it through exactly one
playbook, at the right size, with the standing rules below. Nothing here runs unless the user calls
`/jstack`.

Adapted from superpowers (Jesse Vincent) and pstack (Lauren Tan, the poteto), both MIT — see the
repository's NOTICE.md.

## 1. Classify

Pick one playbook:

| Playbook | Use for | Example |
|---|---|---|
| [investigacao](playbooks/investigacao.md) | read-only questions: how, why, who decided, X or Y | "como o sync decide o que enviar?" |
| [bug](playbooks/bug.md) | something behaves wrongly | "o relatório está dobrando valores" |
| [perf](playbooks/perf.md) | a measured slowness or regression in time or resources | "era 10 min, agora 40" |
| [feature](playbooks/feature.md) | new behaviour | "adiciona exportação CSV" |
| [portagem](playbooks/portagem.md) | the new code must behave like existing code: ports, migrations and refactors | "porta a procedure X para Python" |
| [prototipo](playbooks/prototipo.md) | settle a design or behavioural fork cheaply by observing it | "testa cursor contra BULK COLLECT" |
| [longa](playbooks/longa.md) | hours without the user watching; wraps another playbook | "roda a portagem das 15 procedures durante a noite" |
| [retomar](playbooks/retomar.md) | resume or take over prior work | "retoma de onde paramos ontem" |
| [pausar](playbooks/pausar.md) | stop cleanly so work can resume later | "para agora, continuo amanhã" |

1. `longa` always wraps one of the others. Say which ("longa + portagem").
2. Ambiguous between two: pick the most likely reading from the facts. Say which reading you
   picked in the announcement. Then proceed. See `biblioteca/autonomia.md` (Before you ask).
   Ask no question to classify.
3. Fits none (a factual question, a chat): no playbook applies. Answer directly, without process.

Announce the playbook and size in one line before starting.

## 2. Size

Classify the size as **spike**, **delimitado** or **arquitetural** using
`biblioteca/design.md` (section Size). When in doubt, take the heavier. Size only goes up during
the task, never down.

## 3. Read the two rules files

At the start of every task, read both rules files:

1. `biblioteca/principios.md` (the Index).
2. `biblioteca/autonomia.md`.

Cite a principle only after reading its row.

## 4. Copy the steps

Copy the chosen playbook's `## Steps` **verbatim** into the task list (Claude Code: the task/todo
tool; opencode: `.agentes/jstack-<tema>.md`, see `biblioteca/ferramentas.md`). A step that does not
run for this size, or that you decide to skip, **stays in the list** as `pulado: <motivo>` — never
delete it. Also copy the playbook's `## Done means` as the final item. For `longa`, copy longa's
steps and put the wrapped playbook's steps as sub-items of longa's step 4; both `## Done means`
sections go at the end.

## 5. Run

Work the steps in order. When a step points to a library file or a skill, read that file (or follow
that skill) at that moment, not before. Mark each step done only with its evidence. When a step
cannot continue, stop with the right verdict (INCONCLUSIVO or BLOQUEADO,
`biblioteca/verificacao.md`) and tell the user what is needed. Stopping happens only per
`biblioteca/autonomia.md`: park what waits on an Always pause item and keep doing the rest.
Multi-step throughput goes through `biblioteca/plano.md`.

## Standing rules

These hold for the whole request:

1. **Evidence before claims.** Nothing is "done", "fixed" or "passing" without the command and its
   output in the same message — `biblioteca/verificacao.md`.
2. **Never block on the human.** Proceed with reversible work, present the result, and let the user
   course-correct after the fact. Pause only for the Always pause list — `biblioteca/autonomia.md`.
3. **Models are the user's decision.** Roles come from `~/.config/jstack/modelos.conf` —
   `biblioteca/modelos.md`. Never pick a model yourself.
4. **Name the principles that changed a decision.** Name each principle from
   `biblioteca/principios.md` that changed a decision, and the decision it changed.
5. **Report so the user can act.** Follow `biblioteca/autonomia.md` (Reporting). Every claim
   carries its evidence or its label in the same sentence. Numbers go through
   `biblioteca/medicao.md`.

## Harness

Claude Code and opencode have different tools for asking, tracking and delegating:
`biblioteca/ferramentas.md`.

## Map

| Library file | Covers |
|---|---|
| [principios.md](biblioteca/principios.md) | principle index; read at the start of every task |
| [autonomia.md](biblioteca/autonomia.md) | when to proceed, when to pause, how to report |
| [medicao.md](biblioteca/medicao.md) | trusting, reporting and acting on a number |
| [design.md](biblioteca/design.md) | size, questions, options, prototypes, spec |
| [plano.md](biblioteca/plano.md) | file map, throughput checkpoint, tasks, review focus, worktrees, hand-off |
| [verificacao.md](biblioteca/verificacao.md) | the gate, evidence ladder, checks that lie, golden outputs, verdicts |
| [testes.md](biblioteca/testes.md) | when to test first, tests that can fail, when to skip |
| [debugging.md](biblioteca/debugging.md) | reproduce, root cause, three failed fixes, fix at the cause |
| [finalizacao.md](biblioteca/finalizacao.md) | options, PR body, clean up |
| [revisao-recebida.md](biblioteca/revisao-recebida.md) | handling review findings |
| [modelos.md](biblioteca/modelos.md) | model per role, `/jstack-setup` |
| [ferramentas.md](biblioteca/ferramentas.md) | tool equivalents between harnesses |
| [skills.md](biblioteca/skills.md) | writing and testing skills |

Execution skills used by the playbooks: `orquestra` (reviewer plus implementers), `arena`
(competing attempts), `interrogar` (multi-model review), `orchestrating-herdr-agents` (launching
and waiting for CLI agents), `como-funciona` (how things work), `por-que` (on-demand: read its
SKILL.md when a step sends you there), `corrigir` and `refletir` (on-demand, user-invoked).
