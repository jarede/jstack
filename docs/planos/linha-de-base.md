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
