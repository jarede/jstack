# Linha de base (RED) — processo sem jstack

Data: 2026-10-06. Três subagentes `general-purpose`, sem os arquivos do jstack, no repositório
prezzo, só leitura. **O superpowers estava instalado**, então isto mede o comportamento atual, que
o jstack precisa igualar ou superar.

| Critério | A: portagem PRC_PRECO | B: bug ponto extra Tlantic | C: --dry-run na sincronização |
|---|---|---|---|
| Golden outputs da origem antes de código | **Faltou** (fala em "testes de equivalência sobre fixtures", sem capturar a saída real da procedure) | n/a | n/a |
| Script de paridade fora do alcance do implementador | **Faltou** | n/a | n/a |
| Reproduzir antes de corrigir | n/a | **Parcial**: pede dados para reproduzir e escreve teste que falha, mas não observa o sintoma no sistema real; sem saída INCONCLUSIVO se não reproduzir | n/a |
| Design aprovado antes de código | Sim (plano + aprovação) | n/a | **Parcial**: pergunta a semântica do dry-run, mas não apresenta um design curto para aprovar |
| Comando de verificação com saída antes de "pronto" | Sim (`just check`, `pytest`) | Sim | Sim |
| Pergunta antes de commit/MR | Sim | Sim | Sim |
| Uma pergunta por vez | **Não**: 5 perguntas de uma vez, algumas descobríveis lendo o banco | **Não**: 4 de uma vez | **Não**: 3 de uma vez |
| Passos pulados registrados | **Não** | **Não** | **Não** |
| Veredito explícito (VERIFICADO/INCONCLUSIVO) | **Não** | **Não** | **Não** |

**O que o jstack precisa corrigir:** golden outputs + check fora do alcance (portagem);
reprodução observada com saída INCONCLUSIVO (bug); design curto aprovado (feature delimitada);
perguntar só o que não dá para descobrir, uma por vez; registrar `pulado: <motivo>`; veredito
explícito no fim.

# GREEN — com jstack

## Roteamento (11 pedidos)

| # | Pedido | Esperado | Obtido |
|---|---|---|---|
| 1 | porta a view VW_ESTOQUE | portagem | portagem, delimitado |
| 2 | migra os jobs do cron, mesma saída | portagem | portagem, arquitetural |
| 3 | relatório de margem dobrando | bug | bug, delimitado |
| 4 | por que o sync demora 40 min? | bug (investigação) | bug, investigação (para no passo 3) |
| 5 | exportação CSV | feature | feature, delimitado |
| 6 | endpoint de saúde | feature | feature, delimitado |
| 7 | 15 procedures durante a noite | longa + portagem | longa + portagem |
| 8 | refatorando o módulo X até amanhã | longa + feature | **longa + portagem** — refatoração preserva comportamento; o roteador passou a dizer isso explicitamente (refactor → portagem) |
| 9 | mexe no cálculo de desconto | uma pergunta | uma pergunta (bug ou regra nova?) |
| 10 | o export está lento, melhora | uma pergunta | uma pergunta (regressão ou melhoria?) |
| 11 | UNION vs UNION ALL | sem processo | sem processo, resposta direta |

Resultado: 8/8 roteados (com a regra de refatoração explícita), 2/2 ambíguos com uma pergunta,
1/1 sem processo.

## Aplicação (os 3 cenários da linha de base)

| Critério | A portagem | B bug | C feature |
|---|---|---|---|
| Golden outputs antes de código | sim (passo 2 antes de 3–4) | n/a | n/a |
| Check fora do alcance do implementador | parcial → corrigido: commit próprio do golden + check antes do código, diff vazio no fim | n/a | n/a |
| Reproduzir antes de corrigir; INCONCLUSIVO se não | n/a | sim (sem exemplo → INCONCLUSIVO + uma pergunta) | n/a |
| Design curto aprovado antes de código | n/a | n/a | sim |
| Só perguntas não-descobríveis, uma por vez | sim | sim | sim |
| `pulado:` registrado | sim | sim | sim |
| Veredito explícito | sim | sim | parcial → corrigido no Done means do feature |
| Sem merge/PR sem perguntar | sim | sim | sim |

Lacunas encontradas e corrigidas no mesmo passo: caminho `orquestra/reviewing.md` sem base,
passos arquiteturais fora da lista numerada, investigação sem tamanho (agora spike), tamanho
provisório até ler a fonte, rodar procedure que escreve só perguntando, onde ficam golden/check,
quem revisa a feature delimitada, fallback quando `AskUserQuestion` não existe, onde entram os
passos do playbook envolvido pelo `longa`.

Ainda não verificado: instalação real no Claude Code e no opencode (feita depois do merge).
