# Atribuições

## pstack — Lauren Tan (poteto)

O jstack é inspirado no [pstack](https://github.com/cursor/plugins/tree/main/pstack) e adapta partes
dele. O pstack é distribuído sob a licença MIT, reproduzida abaixo.

Partes adaptadas:

| Arquivo no jstack | Origem no pstack |
|---|---|
| `skills/interrogar/` (SKILL.md e `references/`) | `skills/interrogate/` (SKILL.md, `references/reviewer-prompt.md`, `rubric.md`, `code-quality-review.md`, `lead-judgment.md`) |
| `skills/arena/SKILL.md` | `skills/arena/SKILL.md` |
| `skills/triaging-desk-tickets/SKILL.md` | `automations/benny/skills/triage-issue-reports/SKILL.md` |
| `skills/orquestra/` (contrato do brief, piloto, log de decisões, `reviewing.md`) | `skills/poteto-mode/playbooks/orchestrate.md`, `docs/guide/07-overnight.md`, `skills/show-me-your-work`, `skills/blast-radius`, `skills/correct`, `skills/principle-test-behavior-not-implementation`, `skills/principle-build-the-lever`, `skills/figure-it-out` |
| `skills/jstack-setup/SKILL.md` | `skills/setup-pstack/SKILL.md` |
| `skills/jstack/SKILL.md` (roteador, passos copiados, `pulado:`) | `skills/poteto-mode/SKILL.md` |
| `skills/jstack/playbooks/longa.md` | `docs/guide/07-overnight.md`, `skills/poteto-mode/playbooks/autonomous-run.md`, `pause-safely.md` |
| `skills/jstack/biblioteca/verificacao.md` | `skills/principle-prove-it-works`, `principle-explain-the-number`, `blast-radius` |
| `skills/jstack/biblioteca/testes.md` | `skills/tdd`, `principle-test-behavior-not-implementation` |
| `skills/jstack/biblioteca/design.md` | `skills/architect` (+ `references/design-red-flags.md`), `playbooks/prototype.md` |
| `skills/jstack/biblioteca/plano.md` | `principle-sequence-verifiable-units`, `playbooks/feature.md`, `playbooks/multi-phase-plan.md` |
| `skills/jstack/biblioteca/debugging.md` | `principle-fix-root-causes`, `principle-attack-the-premise` |
| `skills/jstack/biblioteca/finalizacao.md` | `playbooks/opening-a-pr.md` |
| `skills/jstack/biblioteca/revisao-recebida.md` | `skills/interrogate/references/lead-judgment.md` |
| `skills/jstack/biblioteca/skills.md` | `playbooks/eval.md` |
| `skills/corrigir/` | `skills/correct/`, `skills/principle-encode-lessons-in-structure/` |
| `skills/como-funciona/` | `skills/how/` |
| `skills/por-que/` | `skills/why/` |
| `skills/refletir/` | `skills/reflect/` |
| `skills/jstack/biblioteca/autonomia.md` | `skills/poteto-mode/SKILL.md` (Autonomy, Writing the reply), `skills/principle-never-block-on-the-human/`, `playbooks/autonomous-run.md` |
| `skills/jstack/biblioteca/principios.md` | `README.md` (tabela de principios), `skills/principle-*/` |
| `skills/jstack/biblioteca/medicao.md` | `skills/benchmark-checklist/`, `skills/principle-explain-the-number/` |
| `skills/jstack/playbooks/perf.md` | `playbooks/perf-issue.md`, `playbooks/hillclimb.md` |
| `skills/jstack/playbooks/investigacao.md` | `playbooks/investigation.md` |
| `skills/jstack/playbooks/prototipo.md` | `playbooks/prototype.md`, `skills/principle-exhaust-the-design-space/` |
| `skills/jstack/playbooks/retomar.md` | `playbooks/session-pickup.md` |
| `skills/jstack/playbooks/pausar.md` | `playbooks/pause-safely.md` |
| `skills/jstack/playbooks/feature.md` | `playbooks/feature.md` |
| `skills/jstack/playbooks/bug.md` | `playbooks/bug-fix.md` |
| `skills/jstack/playbooks/portagem.md` | `playbooks/refactoring.md` |
| `skills/jstack/biblioteca/ferramentas.md` | `skills/poteto-mode/SKILL.md` |

As adaptações trocam o mecanismo do Cursor (Task tool com `model`, workers na nuvem, regras `.mdc`)
pelo deste setup: subagentes do Claude Code + `opencode2 run` em painéis do herdr ou abas do app
desktop.

```
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## superpowers — Jesse Vincent

A biblioteca do `/jstack` adapta o processo do [superpowers](https://github.com/obra/superpowers)
(versão 6.4.1), distribuído sob a licença MIT, reproduzida abaixo. O jstack não depende do plugin.

| Arquivo no jstack | Origem no superpowers |
|---|---|
| `skills/jstack/biblioteca/design.md` | `skills/brainstorming` |
| `skills/jstack/biblioteca/plano.md` | `skills/writing-plans`, `skills/using-git-worktrees` |
| `skills/jstack/biblioteca/verificacao.md` | `skills/verification-before-completion` |
| `skills/jstack/biblioteca/testes.md` | `skills/test-driven-development` |
| `skills/jstack/biblioteca/debugging.md` | `skills/systematic-debugging` |
| `skills/jstack/biblioteca/finalizacao.md` | `skills/finishing-a-development-branch` |
| `skills/jstack/biblioteca/revisao-recebida.md` | `skills/receiving-code-review` |
| `skills/jstack/biblioteca/skills.md` | `skills/writing-skills` |

```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
