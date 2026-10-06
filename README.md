# jstack

Meu processo de engenharia e minhas skills pessoais para agentes de código: **Claude Code** e
**opencode**. Este repositório é a fonte única delas. As pastas de skills de cada ferramenta só
contêm links simbólicos para cá.

> **Inspiração:** o jstack junta o melhor de dois pacotes, sem depender de nenhum deles:
>
> - o [pstack](https://github.com/cursor/plugins/tree/main/pstack), da
>   [poteto](https://x.com/poteto) (Lauren Tan): o conjunto de skills que ela usa no dia a dia no
>   Cursor, com rigor de verificação, revisão multi-modelo, arena e execuções longas sem supervisão;
> - o [superpowers](https://github.com/obra/superpowers), do Jesse Vincent: o processo de design →
>   plano → testes → verificação → finalização.
>
> Várias skills e a biblioteca do `/jstack` adaptam ideias e textos dos dois. Veja
> [NOTICE.md](NOTICE.md) para a atribuição e as licenças MIT.

## Usando o processo

Nada roda sozinho. Quando quiser rigor, chame:

```
/jstack <pedido>          # Claude Code ou opencode (no opencode também: @jstack)
/jstack-setup             # escolhe uma vez qual modelo faz cada papel
```

O `/jstack` classifica o pedido num **playbook**, mede o tamanho (spike, delimitado ou
arquitetural), copia os passos para a lista de tarefas (passo pulado fica como `pulado: <motivo>`)
e executa com as regras fixas: evidência antes de afirmar, perguntar só o que não dá para
descobrir, modelos definidos por você, nada irreversível sem a sua escolha.

| Playbook | Para quê |
|---|---|
| [portagem](skills/jstack/playbooks/portagem.md) | Portar ou migrar código mantendo o comportamento: golden outputs, paridade, revisão |
| [bug](skills/jstack/playbooks/bug.md) | Reproduzir, achar a causa raiz, corrigir; ou só investigar |
| [feature](skills/jstack/playbooks/feature.md) | Design aprovado → plano → execução → testes → revisão |
| [longa](skills/jstack/playbooks/longa.md) | Execução de horas sem supervisão, com contrato, `decisoes.tsv` e auditoria no fim |

A [biblioteca](skills/jstack/biblioteca/) concentra as regras que os playbooks usam: design, plano,
verificação, testes, debugging, finalização, revisão recebida, modelos, ferramentas (Claude Code ×
opencode) e escrita de skills.

O `/jstack-setup` grava `~/.config/jstack/modelos.conf` (fora do repositório). `orquestra`,
`interrogar`, `arena` e o playbook `longa` leem dali em vez de perguntar a cada execução.

## Como eu trabalho (e por que estas skills existem)

O Claude é o **engenheiro**: escreve spec e plano e faz a revisão final. Modelos mais baratos rodam
pelo **opencode** (`opencode2 run`) nos outros papéis:

- um **revisor** intermediário, que escreve os briefs, despacha e confere cada entrega
- **implementadores** baratos, um por tarefa

Os agentes rodam em painéis do herdr (CLI) ou em abas do Terminal do app desktop do Claude.
Briefs e relatórios ficam em `.agentes/` no projeto.

| Skill | Alvo | Para quê |
|---|---|---|
| [jstack](skills/jstack/SKILL.md) | claude, sob demanda | Roteador do processo: playbooks + biblioteca |
| [jstack-setup](skills/jstack-setup/SKILL.md) | claude, sob demanda | Modelo por papel em `~/.config/jstack/modelos.conf` |
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
3. Liga os comandos de [commands/opencode/](commands/opencode/) em `~/.config/opencode/commands/`
   (`/jstack` e `/jstack-setup` no opencode).
4. Remove links com nomes antigos listados em [renomeadas.txt](renomeadas.txt).
5. Se já existir uma **pasta real** com esse nome, ela é movida para
   `~/.jstack-backup/<data-hora>/`, nunca apagada.
6. É idempotente. Rodar de novo não muda o que já está certo.

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

Skills de processo (`jstack`, `jstack-setup`) levam `sob-demanda` como terceira coluna do
`skills.txt` e `disable-model-invocation: true` no frontmatter: só rodam quando você chama.

## Saindo do superpowers

O jstack não depende do plugin superpowers. A troca é em etapas:

1. O jstack instalado e testado, com o superpowers ainda instalado (os dois convivem: o jstack não
   dispara sozinho).
2. Uso do `/jstack` em paralelo por alguns dias.
3. Quando decidir, desinstale o plugin num terminal `claude`: `/plugin uninstall superpowers`.

## Manutenção

Editar uma skill é editar o arquivo em `skills/`. Como as pastas instaladas são links, a mudança vale
na próxima sessão, sem reinstalar.

```bash
just check                                # valida tudo
just test                                 # testes do ferramental (check e install)
just status                               # o que está instalado / o que está fora do jstack
just import nova-skill claude             # traz uma skill criada direto em ~/.claude/skills
just uninstall                            # remove só os links do jstack
```

### Criar uma skill nova

1. Crie `skills/<nome>/SKILL.md`. O `name` deve ser igual ao nome da pasta e usar só minúsculas,
   dígitos e hífens. A `description` diz **quando** usar ("Use when…") e tem no máximo 1024
   caracteres.
2. Adicione `<nome> <claude|opencode>` ao `skills.txt` (mais `sob-demanda` se for de processo).
3. `just install`, depois commit.

O processo de escrita e teste de skills está em
[skills/jstack/biblioteca/skills.md](skills/jstack/biblioteca/skills.md): teste com subagente antes
e depois de escrever. As regras para agentes que editam este repositório estão em
[AGENTS.md](AGENTS.md).

### O que o `just check` valida

- `skills.txt` e `skills/` batem: toda skill listada existe, toda pasta está listada, alvo válido.
- Frontmatter com `name` e `description`, `name` igual à pasta e no formato aceito pelas duas
  ferramentas, `description` entre 1 e 1024 caracteres.
- `sob-demanda` no `skills.txt` ⇔ `disable-model-invocation: true` no frontmatter.
- Nomes em `renomeadas.txt` não podem continuar no `skills.txt`.
- Comandos em `commands/opencode/` têm `description`.
- Links relativos em Markdown e caminhos entre crases (`` `../biblioteca/x.md` ``) apontam para
  arquivos que existem.
- Avisos (não falham): `description` sem "quando usar", `SKILL.md` com mais de 500 linhas.

O check e os testes rodam no GitHub Actions a cada push.

## Próximos passos

Fora do escopo da primeira versão do processo:

- playbooks de refactor, performance e hillclimb;
- skill de verificação do projeto (dirigir o app como um usuário);
- automação de PR (acompanhar CI e revisões).

## Estrutura

```
jstack/
├── skills.txt          # manifesto: <skill> <alvo> [sob-demanda]
├── renomeadas.txt      # nomes antigos → novos (o install remove os links antigos)
├── skills/<nome>/      # uma pasta por skill (SKILL.md + references/ + scripts/)
│   └── jstack/         # roteador + playbooks/ + biblioteca/
├── commands/opencode/  # /jstack e /jstack-setup no opencode
├── scripts/            # install, uninstall, status, import, check
├── tests/              # testes do check e do install
├── docs/specs, docs/planos
├── justfile
├── AGENTS.md           # regras para agentes que mantêm este repositório
└── NOTICE.md           # atribuições (pstack, superpowers — MIT)
```
