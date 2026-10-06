# Regras para agentes neste repositório

Este repositório guarda as skills pessoais do usuário para Claude Code e opencode. As pastas
`~/.claude/skills/<skill>` e `~/.config/opencode/skills/<skill>` são **links para `skills/` daqui**:
editar o arquivo instalado é editar este repositório.

## Ao criar ou editar uma skill

1. Trabalhe em `skills/<nome>/`. Nunca crie uma skill direto em `~/.claude/skills` ou
   `~/.config/opencode/skills`. Se encontrar uma lá, traga para cá com
   `make import SKILL=<nome> TARGET=<claude|opencode>`.
2. No Claude Code, siga `superpowers:writing-skills`: rode um teste com subagente antes
   (comportamento sem a skill) e depois (com a skill).
3. `name` igual ao nome da pasta, só `[a-z0-9-]`. `description` em terceira pessoa, começando por
   "Use when…", descrevendo **quando** usar e não o passo a passo, com no máximo 1024 caracteres.
4. Skill nova → uma linha `<nome> <claude|opencode>` no `skills.txt`. Um alvo só por skill: o
   opencode 2 também lê `~/.claude/skills`.
5. Rode `make check` e só faça commit com ele verde.
6. Conteúdo adaptado de terceiros → registre a origem e a licença em `NOTICE.md`.

## Não faça

- Não apague nada em `~/.jstack-backup/`: são as versões que o `install` tirou do lugar.
- Não coloque segredos, tokens ou dados de chamados reais em exemplos.
- Não instale a mesma skill nos dois alvos.
