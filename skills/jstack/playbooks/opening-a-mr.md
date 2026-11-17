### Opening an MR

Invoked at the end of every other playbook.

Work from a git worktree off trunk, and keep unrelated work out of it. Rebase into small, landable commits. Run the code cleanup pass from `../references/harness.md` over the diff before commit and `/no-comments` before review. Write the title, description, and commit bodies with `/technical-writing`, then `/unslop`.

Title: the repository's own convention from `git log --oneline origin/main`, else `type(scope): subject`, naming a real symbol when one carries the change. Description: a one-minute briefing under 40 lines with these `##` headings in order, dropping empty ones: `## Por quê`, `## O que mudou`, `## Escopo`, `## Alternativas descartadas` (only rejected alternatives a reviewer would otherwise ask about), `## Raio de impacto`, `## Verificação`. Evidence logs, run histories, and long tables go in a linked file or an MR comment.

Stack follow-ups by target branch. Open MRs ready, through the run's MR tool with `draft: false`. Without one, resolve the forge from `git remote get-url origin`. On `git.bistek.com.br`, run `glab mr create --source-branch <branch> --target-branch <parent-branch> --title <title> --description-file <file>` without a draft prefix (see `../references/environment.md`). If it still opens as a draft, run `glab mr update <iid> --ready`. On a `github.com` remote, use `gh` without a draft flag. Opening an MR does not start a babysit. An Autopilot-full or Autopilot-stack owner is the exception, because its brief assigns the babysit loop.
