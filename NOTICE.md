# Atribuições

## pstack — Lauren Tan (poteto)

O jstack é inspirado no [pstack](https://github.com/cursor/plugins/tree/main/pstack) e adapta partes
dele. O pstack é distribuído sob a licença MIT, reproduzida abaixo.

Partes adaptadas:

| Arquivo no jstack | Origem no pstack |
|---|---|
| `skills/interrogating-with-opencode/` (SKILL.md e `references/`) | `skills/interrogate/` (SKILL.md, `references/reviewer-prompt.md`, `rubric.md`, `code-quality-review.md`, `lead-judgment.md`) |
| `skills/running-an-arena-with-opencode/SKILL.md` | `skills/arena/SKILL.md` |
| `skills/triaging-desk-tickets/SKILL.md` | `automations/benny/skills/triage-issue-reports/SKILL.md` |
| `skills/orchestrating-engineer-reviewer-implementer/` (contrato do brief, piloto, log de decisões, `reviewing.md`) | `skills/poteto-mode/playbooks/orchestrate.md`, `docs/guide/07-overnight.md`, `skills/show-me-your-work`, `skills/blast-radius`, `skills/correct`, `skills/principle-test-behavior-not-implementation`, `skills/principle-build-the-lever`, `skills/figure-it-out` |

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
