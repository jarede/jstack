# Regras para agentes neste repositório

Este repositório guarda as skills pessoais do usuário para Claude Code e opencode. As pastas
`~/.claude/skills/<skill>` e `~/.config/opencode/skills/<skill>` são **links para `skills/` daqui**:
editar o arquivo instalado é editar este repositório.

## Ao criar ou editar uma skill

1. Trabalhe em `skills/<nome>/`. Nunca crie uma skill direto em `~/.claude/skills` ou
   `~/.config/opencode/skills`. Se encontrar uma lá, traga para cá com
   `just import <nome> <claude|opencode>`.
2. Siga `skills/jstack/biblioteca/skills.md`: rode um teste com subagente antes
   (comportamento sem a skill) e depois (com a skill).
3. `name` igual ao nome da pasta, só `[a-z0-9-]`. `description` em terceira pessoa, começando por
   "Use when…", descrevendo **quando** usar e não o passo a passo, com no máximo 1024 caracteres.
4. Skill nova → uma linha `<nome> <claude|opencode>` no `skills.txt`. Um alvo só por skill: o
   opencode 2 também lê `~/.claude/skills`.
5. Skills de processo (`jstack`, `jstack-setup`) são sob demanda: `sob-demanda` no skills.txt e
   `disable-model-invocation: true` no frontmatter.
6. Rode `just check` e `just test` e só faça commit com os dois verdes.
7. Conteúdo adaptado de terceiros → registre a origem e a licença em `NOTICE.md`.

## Não faça

- Não apague nada em `~/.jstack-backup/`: são as versões que o `install` tirou do lugar.
- Não coloque segredos, tokens ou dados de chamados reais em exemplos.
- Não instale a mesma skill nos dois alvos.
