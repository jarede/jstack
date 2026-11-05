tools := "skills/jstack/scripts"

# List the recipes
default:
    @just --list

# Link skills, agents, and opencode commands into ~/.claude and ~/.config/opencode
install:
    scripts/install.sh

# Show what install would do, without touching anything
dry-run:
    scripts/install.sh --dry-run

# Remove only jstack's links
uninstall:
    scripts/install.sh --uninstall

# Validate frontmatter, links, and leftovers from the Cursor original
check:
    python3 scripts/check.py

# Install the bun dependencies of the MR watcher and the orchestration CLI, and the statechart dev dependencies
deps:
    cd {{tools}} && bun install
    cd skills/statechart/scripts && npm install --no-save fast-check@4.5.3

# Run the orch and watch-mr tests and the statechart tests
test:
    cd {{tools}} && bun run test
    cd skills/statechart/scripts && node --disable-warning=ExperimentalWarning --test test/*.test.ts

# Typecheck watch-mr
typecheck:
    cd {{tools}} && bun run typecheck

# Everything a change should pass before commit
ci: check test typecheck
