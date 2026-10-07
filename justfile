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

# Install the bun dependencies of the MR watcher and the orchestration CLI
deps:
    cd {{tools}} && bun install

# Run the orch and watch-mr tests
test:
    cd {{tools}} && bun run test

# Typecheck watch-mr
typecheck:
    cd {{tools}} && bun run typecheck

# Everything a change should pass before commit
ci: check test typecheck
