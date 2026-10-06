---
name: custo-sessao
description: Consultar e apresentar o custo (USD) e uso de tokens da sessão atual do opencode, incluindo subagentes filhos. Use quando o usuário perguntar "quanto custou essa sessão", "custo", "tokens", "billing" ou "uso de API" do opencode. Lê `~/.local/share/opencode/opencode.db` (SQLite), identifica a sessão em andamento via `directory = $PWD`, soma custos da raiz + subagentes (parent_id), converte timestamps UTC para BRT (UTC-3) e formata tabela Markdown em pt-BR com provider, modelo, custo, tokens e cache hit rate. NÃO use para auditoria de longo prazo por projeto (use script ad-hoc) nem para billing de provedores externos além do que o opencode registra.
license: MIT
compatibility: opencode
---

# Apresentar custo da sessão do opencode

Workflow para consultar o SQLite local do opencode
(`~/.local/share/opencode/opencode.db`), identificar a sessão em andamento
(e seus subagentes filhos), e apresentar o custo total em **BRT (São Paulo,
UTC-3)**, com breakdown de tokens e nota sobre o provedor.

> **Quando usar:** o usuário perguntar "quanto custou essa sessão", "custo",
> "tokens", "billing", "uso de API" — ou em auditoria de uso ao final de uma
> janela de trabalho.
>
> **Quando NÃO usar:** o usuário quiser auditoria por projeto ao longo de
> semanas (use um script ad-hoc — esta skill foca na sessão corrente).
> Sessões de outros projetos/workspaces ficam fora do escopo.

---

## Contexto técnico

- **opencode** persiste estado em `~/.local/share/opencode/opencode.db`
  (SQLite 3).
- **Tabela `session`** (campos relevantes):
  - `id` (text, `ses_<hex>`)
  - `title`, `parent_id` (subagentes têm `parent_id` apontando para a sessão raiz)
  - `directory` (cwd do projeto no momento da sessão)
  - `model` (text JSON: `{"id", "providerID", "variant"}`)
  - `cost` (real, USD)
  - `tokens_input`, `tokens_output`, `tokens_reasoning`
  - `tokens_cache_read`, `tokens_cache_write`
  - `time_created`, `time_updated` (**ms epoch UTC**)
- **Fuso:** `datetime(t/1000, 'unixepoch')` no SQLite devolve UTC. São Paulo
  está em **UTC-3** o ano inteiro (DST abolido em 2019). Subtrair **10800 s**.
- **Custo zero não significa grátis:** sessões com `providerID='opencode'` e
  `variant='max'` (ex.: `deepseek-v4-flash-free`) têm `cost=0` mas tokens
  continuam sendo processados. Vale sempre reportar o provider, não só o $.
- **Cache read** é barato/cobrado marginalmente, mas infla tráfego.

---

## Fase 1 — Localizar a sessão

1. Liste as últimas sessões do diretório atual (cwd) e peça confirmação
   se houver mais de uma janela aberta:

   ```bash
   DB=~/.local/share/opencode/opencode.db
   sqlite3 "$DB" "SELECT id, title, time_updated FROM session
     WHERE directory = '$(pwd)' ORDER BY time_updated DESC LIMIT 5"
   ```

2. Default: pegar a de `time_updated` mais recente (= a sessão em que estamos
   respondendo agora).

3. Se o usuário pedir explicitamente uma sessão anterior pelo título ou ID,
   use a dele.

---

## Fase 2 — Descobrir subagentes (filhos)

Subagentes lançados via `task` tool viram sessões com `parent_id = <id_raiz>`.
Inclua TODOS no cálculo (custo e tokens são somados).

```bash
sqlite3 "$DB" "SELECT id, title, cost, model FROM session
  WHERE parent_id = '<session_id>' ORDER BY time_created"
```

E também a própria raiz:

```bash
sqlite3 "$DB" "SELECT id, title, cost, model, tokens_input, tokens_output,
  tokens_cache_read, tokens_cache_write, tokens_reasoning,
  time_created, time_updated FROM session WHERE id = '<session_id>'"
```

---

## Fase 3 — Apresentar

Monte uma tabela Markdown em pt-BR (sempre em BRT, sempre com USD):

```markdown
## Custo da sessão `<título resumido>`

| Sessão | Modelo | Provider | Custo (USD) | In BRT | Fim BRT | Tokens in / out / cache_read |
|---|---|---|---:|---|---|---|
| <raiz> | <model.id> | <providerID> | $X.XXXX | dd/mm HH:MM | dd/mm HH:MM | N / N / N |
| <subagente> | <model.id> | <providerID> | $X.XXXX | dd/mm HH:MM | dd/mm HH:MM | N / N / N |
| **Total** | | | **$X.XXXX** | | **<N min>** | N / N / N |

- **Duração total (raiz):** dd/mm HH:MM → dd/mm HH:MM = **<N min>**
- **Cache hit rate:** `<cache_read> / (<cache_read> + <input>) * 100>%`
  dos tokens de input vieram do cache.
- **Subagentes:** <N> filhos (free tier se `variant='max'`).
```

Conversão BRT (rode uma vez por linha no SQLite):

```bash
TZ_OFFSET=10800  # 3h em segundos
sqlite3 "$DB" "SELECT
  datetime(time_created/1000 - $TZ_OFFSET, 'unixepoch') AS brt_start,
  datetime(time_updated/1000 - $TZ_OFFSET, 'unixepoch') AS brt_end,
  (time_updated - time_created)/60000 AS dur_min
  FROM session WHERE id = '<session_id>'"
```

---

## Fase 4 — Comparação opcional

Se o usuário quiser contexto histórico do mesmo `directory`:

```bash
sqlite3 "$DB" "SELECT title, cost, time_created
  FROM session WHERE directory = '<dir>' ORDER BY time_created DESC LIMIT 10"
```

Apresente como lista curta ("nas últimas 10 sessões deste projeto, você gastou
em média $X.XX").

---

## Erros comuns

- **DB não existe** (`~/.local/share/opencode/opencode.db`): opencode nunca
  rodou nesse Mac. Informe e pare — não chute valores.
- **Sessão não encontrada no DB**: o cwd pode ter mudado, ou o opencode fechou
  sem flush. Liste por `directory` amplo e peça confirmação.
- **Múltiplas raízes candidatas**: o usuário pode ter 2 janelas. Mostre as 5
  mais recentes e pergunte.
- **`model` é JSON** — use `json_extract(model, '$.id')` no SQLite, ou
  `printf('%s', model)` para mostrar o objeto cru.
- **Tokens reasoning**: o opencode preenche para modelos que expõem reasoning
  (ex.: `deepseek-v4-flash-free` na sessão `ses_124e5278affe9r9NMBRyuCXJTy`
  tinha 588 reasoning tokens). Reporte como linha separada se > 0.

---

## Exemplo de saída esperada

```
## Custo da sessão "Lediane's request in Bistek report PDF"

| Sessão | Modelo | Provider | Custo (USD) | In BRT | Fim BRT | Tokens in / out / cache_read |
|---|---|---|---:|---|---|---|
| Raiz | minimax-m3 | opencode-go | $0.18988 | 18/06 11:22 | 18/06 12:12 | 248.642 / 39.575 / 7.176.562 |
| @general subagent | minimax-m3 | opencode-go | $0.05710 | 18/06 11:30 | 18/06 11:35 | 86.013 / 21.069 / 2.003.459 |
| **Total** | | | **$0.24698** | | **50 min** | 334.655 / 60.644 / 9.180.021 |

- **Duração raiz:** 18/06 11:22 → 18/06 12:12 = 50 min
- **Cache hit rate:** 96.5% (9.18M lidos do cache vs 334k processados)
- **Subagentes:** 1 (provider `opencode-go`, variant `default` — mesmo modelo da raiz, não foi roteado para `deepseek-v4-flash-free`)
```

---

## Limites

- Não lê o `metadata` da sessão (não traz billing do provedor upstream, só o
  que o opencode registra).
- Se o opencode estiver rodando em outro host, este DB local não reflete.
  Pergunte ao usuário em caso de dúvida.
- Não cobre workspaces compartilhados (vários projetos na mesma sessão).
