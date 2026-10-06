# Lista as receitas
default:
    @just --list

# Valida as skills (frontmatter, nomes, links, skills.txt)
check:
    @python3 scripts/check.py

# Roda os testes do tooling
test:
    @python3 -m unittest discover -s tests -p 'test_*.py'
    @bash tests/test_install.sh

# Liga as skills do skills.txt no Claude Code e no opencode (valida antes)
install: check
    @bash scripts/install.sh

# Mostra o que o install faria, sem mudar nada
dry-run:
    @bash scripts/install.sh --dry-run

# Mostra o que esta instalado e as skills fora do jstack
status:
    @bash scripts/status.sh

# Traz para o jstack uma skill criada direto na pasta do Claude Code ou do opencode
import skill target:
    @bash scripts/import.sh {{skill}} {{target}}

# Remove os links do jstack (nao apaga nada do repositorio)
uninstall:
    @bash scripts/uninstall.sh
