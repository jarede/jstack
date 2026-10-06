.PHONY: help install uninstall status check import dry-run

help:
	@echo "make install    liga as skills do skills.txt no Claude Code e no opencode"
	@echo "make dry-run    mostra o que o install faria, sem mudar nada"
	@echo "make status     mostra o que esta instalado e o que esta fora do jstack"
	@echo "make check      valida as skills (frontmatter, nomes, links)"
	@echo "make import SKILL=<nome> TARGET=<claude|opencode>   traz uma skill avulsa para o jstack"
	@echo "make uninstall  remove os links (nao apaga nada do repositorio)"

install: check
	@bash scripts/install.sh

dry-run:
	@bash scripts/install.sh --dry-run

uninstall:
	@bash scripts/uninstall.sh

status:
	@bash scripts/status.sh

check:
	@python3 scripts/check.py

import:
	@test -n "$(SKILL)" -a -n "$(TARGET)" || (echo "uso: make import SKILL=<nome> TARGET=<claude|opencode>"; exit 1)
	@bash scripts/import.sh "$(SKILL)" "$(TARGET)"
