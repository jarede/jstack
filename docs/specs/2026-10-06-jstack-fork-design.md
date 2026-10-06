# jstack como fork independente de superpowers + pstack — design

Data: 2026-10-06 · Status: aguardando revisão

## Objetivo

Transformar o jstack num pacote de processo de engenharia **próprio**, que junta o melhor do
[superpowers](https://github.com/obra/superpowers) (Jesse Vincent) e do
[pstack](https://github.com/cursor/plugins/tree/main/pstack) (Lauren Tan, a poteto), sem depender de
nenhum dos dois. O pacote deve funcionar igual no **Claude Code** e no **opencode**.

**Sucesso:**

- Com o superpowers desinstalado, `/jstack <pedido>` cobre portagem, bug/investigação, feature e
  execução longa sem supervisão.
- O mesmo `/jstack` funciona no opencode, usando um modelo não-Claude.
- Nenhum processo roda sem ser chamado.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Relação com superpowers/pstack | Fork independente. Absorve e adapta, com atribuição; o plugin superpowers sai no fim |
| Ativação | Só sob demanda. Nada é injetado no início da sessão |
| Entrada | Um comando roteador `/jstack <pedido>` que escolhe um playbook |
| Playbooks v1 | portagem, bug (inclui investigação só de leitura), feature, longa (execução sem supervisão) |
| Ambientes | Claude Code e opencode, com o mesmo conteúdo |
| Testes | TDD pragmático: teste primeiro quando o caminho é barato e óbvio, ou quando o usuário pede; senão, verificação por evidência |
| Arquitetura | Abordagem A: roteador + playbooks como arquivos + biblioteca compartilhada |
| Renomeações | `orchestrating-engineer-reviewer-implementer` → `orquestra`; `running-an-arena-with-opencode` → `arena`; `interrogating-with-opencode` → `interrogar` |
| Modelos | Definidos uma vez por `/jstack-setup` (adaptado do `setup-pstack`); as skills leem a configuração em vez de perguntar a cada execução |

## 1. Roteador — `skills/jstack/SKILL.md`

Frontmatter: `name: jstack`, `disable-model-invocation: true`, e uma `description` que diz quando
chamar. O opencode v2 respeita `disable-model-invocation`, segundo a doc oficial de skills.

**Invocação:**

- Claude Code: `/jstack <pedido>`.
- opencode: `/jstack <pedido>` (comando, seção 4) ou `@jstack`.

**Passos:**

1. **Classificar** o pedido em `portagem`, `bug`, `feature` ou `longa`.
   - Ambíguo entre dois: uma única pergunta.
   - Sem encaixe: dizer isso e responder sem processo.
   - `longa` envolve outro playbook, por exemplo "portagem dentro do contrato longa".
2. **Medir o tamanho:** spike, delimitado (mudança pequena num fluxo que já existe) ou
   arquitetural. O tamanho define quanto do playbook roda.
3. **Copiar literalmente** os passos do playbook para a lista de tarefas. Passo pulado fica como
   `pulado: <motivo>`, nunca é apagado.
4. **Executar** cada passo, lendo o arquivo da biblioteca ou chamando a skill de execução indicada.

**Regras permanentes** durante o pedido:

- Evidência antes de afirmar.
- "Pronto" só com a saída do comando de verificação colada.
- Perguntar ao usuário só o que não dá para descobrir rodando algo.
- Modelos vêm de `~/.config/jstack/modelos.conf` (seção 3a). Se o papel não estiver configurado
  ou o id não existir mais, pergunte. Nunca escolha um modelo por conta própria.
- Nada é mesclado, publicado ou enviado sem o usuário escolher.

As skills de execução existentes continuam com disparo automático. Só o processo é sob demanda.

## 2. Playbooks — `skills/jstack/playbooks/`

Referências entre colchetes apontam para `biblioteca/`.

### portagem.md

1. Ler a origem; confirmar o escopo (dentro/fora).
2. Capturar golden outputs da origem antes de qualquer código. Escrever `check-NN.sh` de
   paridade, fora do alcance de escrita de implementadores.
3. Plano com tarefas verificáveis [plano].
4. Executar inline (poucas tarefas) ou com `orquestra` (modelos do `modelos.conf`).
5. Verificar cada tarefa: paridade + [verificacao] (escada, teste que não falha, guard que a origem
   não tem, rodar duas vezes).
6. Mudança grande ou arriscada: `interrogar` com o filtro de portagem fiel.
7. Finalizar [finalizacao].

### bug.md

1. Reproduzir o sintoma. Não reproduziu → INCONCLUSIVO, e o playbook para.
2. Causa raiz [debugging]: uma hipótese por vez; 3 correções falhas → questionar a premissa.
3. Só investigação → relatório com fatos e hipóteses separados; fim.
4. Corrigir na causa. Teste de regressão quando o caminho for barato [testes]; senão, reprodução
   antes/depois como evidência.
5. Verificar [verificacao]; finalizar [finalizacao].

### feature.md

1. Design [design]: delimitado → design curto no chat aprovado; arquitetural → spec escrita
   aprovada.
2. Plano [plano] (só arquitetural).
3. Executar: inline, `orquestra`, ou `arena` para tarefa de formato aberto.
4. Testes [testes] + [verificacao].
5. Revisão: `interrogar` se arquitetural; senão, uma revisão do diff.
6. Finalizar [finalizacao].

### longa.md

Envolve outro playbook.

1. **Contrato em `.agentes/contrato.md`:** objetivo, "pronto significa…" checável, worktree novo,
   permissões já respondidas, orçamento de tempo e saída de emergência ("travou → pare e escreva o
   porquê").
2. **Pré-requisito:** o usuário já viu esse tipo de tarefa dar certo com supervisão. Se não viu,
   recomendar rodar supervisionado primeiro.
3. **Loop:** uma mudança, uma checagem, uma linha em `.agentes/decisoes.tsv`. O critério de pronto
   nunca é afrouxado.
4. **Pausa segura:** commit `wip:` + `.agentes/RETOMAR.md` antes de parar ou compactar.
5. **Na volta:** um modelo de outra família lê `decisoes.tsv` e escreve uma seção "Atenção". Nada é
   mesclado sem o usuário.

## 3. Biblioteca — `skills/jstack/biblioteca/`

Cada arquivo funde as duas fontes. Uma regra vive num lugar só.

| Arquivo | Do superpowers | Do pstack | Regras próprias |
|---|---|---|---|
| `design.md` | brainstorming: triagem de tamanho, uma pergunta por vez, 2–3 abordagens, design por seções, portão de aprovação | architect; "o melhor spec é código" (protótipo descartável) | Spec em `docs/specs/AAAA-MM-DD-<tema>.md`; sem revisão adversarial de plano sem código |
| `plano.md` | writing-plans: tarefas de 2–5 min, arquivos exatos, passo de verificação; using-git-worktrees | sequence-verifiable-units; checkpoint de vazão (bloqueios, independentes, estado compartilhado) | Independência medida por arquivos; plano em `docs/planos/` |
| `verificacao.md` | verification-before-completion | escada de evidência, teste que não falha, golden outputs, INCONCLUSIVO, rodar duas vezes, explain-the-number | Fonte única; `orquestra/reviewing.md` aponta para cá |
| `testes.md` | ciclo RED/GREEN | tdd pragmático; test-behavior-not-implementation | Teste primeiro quando barato/óbvio ou pedido; senão, evidência |
| `debugging.md` | systematic-debugging | attack-the-premise; fix-root-causes | Guard que silencia não é correção |
| `finalizacao.md` | finishing-a-development-branch | corpo de PR em formato de briefing; veredito preso ao SHA | Merge/PR só por escolha do usuário |
| `revisao-recebida.md` | receiving-code-review | lead-judgment (filtrar, não agregar) | Sem concordância por educação |
| `skills.md` | writing-skills (teste com subagente antes/depois) | eval cego (ideia) | Substitui `superpowers:writing-skills` no AGENTS.md |
| `ferramentas.md` | — | — | Equivalência Claude Code × opencode (abaixo) |

`ferramentas.md`:

| Ação | Claude Code | opencode |
|---|---|---|
| Perguntar ao usuário | AskUserQuestion | pergunta no texto e para |
| Lista de tarefas | ferramenta de tarefas/todos | todowrite |
| Subagente | Agent tool | tool `task` |
| Outro modelo | `opencode2 run -m` | `opencode2 run -m`, ou `task` com outro agente |
| Ambiente | `$CLAUDE_CODE_ENTRYPOINT` | — |

## 3a. Setup de modelos — `skills/jstack-setup/SKILL.md`

Adaptado do `setup-pstack`. Define, uma vez, qual modelo faz cada papel. `disable-model-invocation:
true`; é chamado por `/jstack-setup` (Claude Code) ou `/jstack-setup` / `@jstack-setup` (opencode).
Rodar de novo atualiza.

**Passos:**

1. **Detectar os modelos disponíveis:**
   - opencode: `opencode2 models`, um `provedor/modelo` por linha.
   - Claude (subagentes): `opus`, `sonnet`, `haiku`, ou `inherit` (o mesmo modelo da sessão).
   - Nunca gravar um id que não apareceu na detecção.
2. **Carregar o estado atual:** se `~/.config/jstack/modelos.conf` existir, os valores dele são o
   ponto de partida; senão, os padrões abaixo. Papel que não existe mais é descartado e mostrado.
3. **Mostrar papel → modelo e confirmar:** aceitar como está ou trocar papéis específicos, com os
   modelos detectados como opções. Ids que sumiram aparecem marcados como "precisa escolher".
4. **Validar:** todo id opencode precisa estar no `opencode2 models`. Painéis (listas) devem ter
   modelos de famílias diferentes; se não tiverem, avisar.
5. **Gravar `~/.config/jstack/modelos.conf`** inteiro, de forma idempotente. Fica fora do
   repositório, porque depende da conta e da máquina.

**Formato e padrões:**

```
# jstack — modelo por papel. Gerado por /jstack-setup. Apague uma linha para voltar ao padrao.
# Variante opcional: provedor/modelo#variante (repassada ao opencode2 run -m).
orquestra revisor:        opencode-go/deepseek-v4.1-flash
orquestra implementador:  opencode/muse-spark-1.3-contributor-free
interrogar revisores:     opencode-go/deepseek-v4.1-flash, opencode-go/kimi-k3, opencode-go/glm-5.3
interrogar claude:        inherit
arena candidatos:         opencode-go/deepseek-v4.1-flash, opencode-go/kimi-k3
arena juiz:               opencode-go/grok-4.7
longa auditor:            opencode-go/gpt-6-luna
```

Os padrões são sugestões iniciais. A primeira execução do setup mostra todos e o usuário confirma
ou troca antes de gravar.

**Como as skills usam:**

- `orquestra`, `interrogar`, `arena` e `longa` leem o papel correspondente do `modelos.conf`.
- O pedido do usuário sobrepõe só aquela execução ("usa o kimi para revisar").
- Antes de despachar, o id é conferido no `opencode2 models`. Se sumiu, perguntar e sugerir
  `/jstack-setup`.
- Sem `modelos.conf`: perguntar uma vez e sugerir `/jstack-setup`.

Isso substitui a regra antiga "pergunte os modelos a cada execução". A decisão de custo continua do
usuário: ela é tomada no setup.

## 4. Instalação, migração e repositório

- `skills.txt` ganha `jstack claude` e `jstack-setup claude`; o opencode lê `~/.claude/skills`.
- Novos `commands/opencode/jstack.md` e `commands/opencode/jstack-setup.md`: comandos com
  `$ARGUMENTS` que carregam a skill correspondente. O `install.sh` linka `commands/opencode/*.md` em `~/.config/opencode/commands/`,
  com backup. O `uninstall.sh` e o `status.sh` também tratam comandos.
- `check.py` valida também:
  - links entre `playbooks/` e `biblioteca/`;
  - `disable-model-invocation: true` no `jstack`;
  - frontmatter dos comandos.
- Renomeações (`orquestra`, `arena`, `interrogar`): pasta, `name`, `skills.txt`, referências em
  todas as skills, README, NOTICE. O install remove os links com os nomes antigos.
- `orquestra/reviewing.md` fica só com o que é específico de trabalho delegado. O geral aponta para
  `biblioteca/verificacao.md`.
- AGENTS.md: `superpowers:writing-skills` → `skills/jstack/biblioteca/skills.md`.
- NOTICE.md ganha a seção superpowers (Jesse Vincent, MIT, texto da licença, tabela de origem). O
  README cita as duas inspirações.
- **Saída do superpowers em etapas:**
  1. jstack pronto e testado, com o superpowers ainda instalado.
  2. Uso em paralelo por alguns dias.
  3. O usuário desinstala o plugin quando decidir (`/plugin uninstall superpowers` num terminal
     `claude`). Nunca desinstalado automaticamente.

## 5. Verificação

1. **Linha de base:** três subagentes sem o jstack (portagem de procedure, bug relatado, feature
   pequena), com o comportamento registrado.
2. **Roteamento:** 8 pedidos (2 por playbook), mais 2 ambíguos e 1 sem encaixe.
   - Critério: 8/8 corretos.
   - Os ambíguos geram exatamente uma pergunta.
   - O sem encaixe é respondido sem processo.
3. **Aplicação:** um cenário completo por playbook.
   - Critério: nenhum passo some.
   - Passos pulados aparecem como `pulado: <motivo>`.
   - Nenhum caminho de arquivo quebrado.
   - Nada é mesclado sem pergunta.
4. **Ambientes reais:**
   - Claude Code: `/jstack` aparece e não dispara sozinho.
   - opencode: `opencode2 api GET /api/skill` lista o `jstack`.
   - opencode: um `opencode2 run` com modelo barato (escolhido pelo usuário) roteia "investigue por
     que X" para `bug`.
5. **Setup:** num HOME temporário, `/jstack-setup` simulado por um subagente gera um
   `modelos.conf` válido; um id inexistente é recusado; um papel apagado volta ao padrão.
6. **Mecânico:** `just check` verde; `just install` idempotente num HOME temporário (CI); comando do
   opencode linkado.

## Fora do escopo (v1)

- Playbooks de refactor, perf e hillclimb.
- Skill de verificação do projeto (`create-verification-skill`).
- Automação de PR (`watch-pr`, babysit).

Ficam listados no README como próximos passos.
