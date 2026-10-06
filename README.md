# jstack

Minhas skills pessoais para agentes de código: **Claude Code** e **opencode**. Este repositório é a
fonte única delas. As pastas de skills de cada ferramenta só contêm links simbólicos para cá.

> **Inspiração:** o jstack é inspirado no [pstack](https://github.com/cursor/plugins/tree/main/pstack),
> da [poteto](https://x.com/poteto) (Lauren Tan): o conjunto de skills que ela usa no dia a dia no
> Cursor. O pstack mostrou o valor de juntar processo, princípios e workflows multi-modelo num pacote
> só, versionado e mantido como código. Várias skills daqui adaptam ideias e textos dela
> (rubrica de revisão adversarial, arena, triagem de chamados, checklist de revisão). Veja
> [NOTICE.md](NOTICE.md) para a atribuição e a licença MIT do pstack.

## Como eu trabalho (e por que estas skills existem)

O Claude é o **engenheiro**: escreve spec e plano, escolhe os modelos e faz a revisão final. Modelos
mais baratos rodam pelo **opencode** (`opencode2 run`) nos outros papéis:

- um **revisor** intermediário, que escreve os briefs, despacha e confere cada entrega
- **implementadores** baratos, um por tarefa

Os agentes rodam em painéis do herdr (CLI) ou em abas do Terminal do app
desktop do Claude. Briefs e relatórios ficam em `.agentes/` no projeto.

| Skill | Alvo | Para quê |
|---|---|---|
| [orquestra](skills/orquestra/SKILL.md) | claude | Executar um plano com revisor + implementadores opencode: contrato do brief, piloto, veredito por tarefa, log de decisões |
| [orchestrating-herdr-agents](skills/orchestrating-herdr-agents/SKILL.md) | claude | Lançar e esperar agentes CLI no herdr, ou em abas no app desktop |
| [interrogar](skills/interrogar/SKILL.md) | claude | Revisão adversarial de um diff por modelos de famílias diferentes, com veredito filtrado pelo Claude |
| [arena](skills/arena/SKILL.md) | claude | N tentativas paralelas da mesma tarefa em worktrees, juiz cruzado, escolha da base e enxerto |
| [triaging-desk-tickets](skills/triaging-desk-tickets/SKILL.md) | claude | Triagem só de leitura da fila do Desk: classificação, causa provável, duplicados, relatório local |
| [custo-sessao](skills/custo-sessao/SKILL.md) | opencode | Custo e tokens da sessão atual do opencode (SQLite local) |
| [english-tutor](skills/english-tutor/SKILL.md) | opencode | Corrige só erros de inglês que mudam o sentido |
| [simplified-technical-english](skills/simplified-technical-english/SKILL.md) | opencode | Explicações técnicas em ASD-STE100 |

## Instalação

Requisitos: macOS ou Linux, `bash`, `python3`, [`just`](https://github.com/casey/just) (`brew install just`).

```bash
git clone https://github.com/jarede/jstack.git ~/projetos/jstack
cd ~/projetos/jstack
just dry-run    # mostra o que vai acontecer
just install    # valida e cria os links
just status     # confere
```

O `just install`:

1. Roda `just check`. Se alguma skill estiver inválida, nada é instalado.
2. Para cada linha do [skills.txt](skills.txt), cria um link `<pasta do alvo>/<skill>` →
   `skills/<skill>`.
3. Se já existir uma **pasta real** com esse nome, ela é movida para
   `~/.jstack-backup/<data-hora>/`, nunca apagada.
4. É idempotente. Rodar de novo não muda o que já está certo.

Depois de instalar, abra uma sessão nova do Claude Code ou do opencode para ele recarregar as skills.

### Onde cada ferramenta procura skills

| Alvo no `skills.txt` | Pasta | Quem lê |
|---|---|---|
| `claude` | `~/.claude/skills/` | Claude Code **e** opencode 2 |
| `opencode` | `~/.config/opencode/skills/` | só o opencode |

O opencode 2 também lê `~/.claude/skills/` e `~/.agents/skills/`. Confirmei com
`opencode2 api GET /api/skill`. Por isso **cada skill tem um alvo só**. Instalar nas duas pastas faria
a skill aparecer duplicada no opencode. Use `claude` para skills que servem às duas ferramentas, e
`opencode` para as que só fazem sentido lá.

## Manutenção

Editar uma skill é editar o arquivo em `skills/`. Como as pastas instaladas são links, a mudança vale
na próxima sessão, sem reinstalar.

```bash
just check                                # valida tudo
just status                               # o que está instalado / o que está fora do jstack
just import nova-skill claude             # traz uma skill criada direto em ~/.claude/skills
just uninstall                            # remove só os links do jstack
```

### Criar uma skill nova

1. Crie `skills/<nome>/SKILL.md`. O `name` deve ser igual ao nome da pasta e usar só minúsculas,
   dígitos e hífens. A `description` diz **quando** usar ("Use when…") e tem no máximo 1024
   caracteres.
2. Adicione `<nome> <claude|opencode>` ao `skills.txt`.
3. `just install`, depois commit.

No Claude Code, a skill `superpowers:writing-skills` guia o processo: teste a skill com um subagente
antes e depois de escrever. As regras de convivência para agentes que editam este repositório estão
em [AGENTS.md](AGENTS.md).

### O que o `just check` valida

- `skills.txt` e `skills/` batem: toda skill listada existe, toda pasta está listada, alvo válido.
- Frontmatter com `name` e `description`, `name` igual à pasta e no formato aceito pelas duas
  ferramentas, `description` entre 1 e 1024 caracteres.
- Links relativos em Markdown apontam para arquivos que existem.
- Avisos (não falham): `description` sem "quando usar", `SKILL.md` com mais de 500 linhas.

O mesmo check roda no GitHub Actions a cada push.

## Estrutura

```
jstack/
├── skills.txt          # manifesto: <skill> <alvo>
├── skills/<nome>/      # uma pasta por skill (SKILL.md + references/ + scripts/)
├── scripts/            # install, uninstall, status, import, check
├── justfile
├── AGENTS.md           # regras para agentes que mantêm este repositório
└── NOTICE.md           # atribuição ao pstack (MIT)
```
