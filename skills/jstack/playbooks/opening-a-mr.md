### Opening an MR

Invoked at the end of every other playbook.

**Worktree.** Work from a git worktree off trunk. Give every concurrent subagent its own worktree. If a checkout has unrelated changes, preserve them and create a fresh worktree for this change. If a worktree is snarled, create a fresh one from trunk and redo the change minimally.

**Commits.** Commit liberally. Rebase into small, ordered commits before opening MRs. Each commit is a future MR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit. New commit when separable. Commit bodies don't restate the subject.

**MRs.** Run the code cleanup pass from `../references/harness.md` over the diff before commit and `/no-comments` before review. Write every MR title, description, and commit body with `/technical-writing` (every layer except Diátaxis, and apply the STE vocabulary rules: one word per action, keep articles, a plain verb over `-ing` where one works), then apply `/unslop`.

**Titles.** Read the target repo's own convention first, from recent merged MRs or `git log --oneline origin/main`, and follow it over this default. By default, use Conventional Commits `type(scope): subject`, no trailing period. Type such as `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf`. Scope is the area, such as `jstack` or `playbooks`. Subject is short, imperative, and names a real symbol when one carries the change, for example `fix(jstack): retarget opening-a-mr babysit trigger`.

**Descriptions.** The MR description is a one-minute briefing, not a lab notebook, for a reviewer who has the diff. It says why the change exists, what it leaves out, what it could break, and how you proved it works. Write short, simple sentences with few identifiers, no walls of text. The MR description becomes the squash commit body, so keep that commit under about 40 lines. Use `##` headings, not bold lead-ins, with these exact pt-br headings, in this order, and drop a section with nothing to say:

- `## Por quê`: the problem and approach, one to three short sentences. No SHAs, rebase genealogy, or "based on main" preamble.
- `## O que mudou`: one to three short bullets. Name a real symbol or path only when it carries the change. Name both sides of a rename or retarget.
- `## Escopo`: always. One to three short items on what it covers and what it deliberately leaves out (a follow-up, a known gap). No symbols, paths, or file-by-file essay.
- `## Alternativas descartadas`: only rejected alternatives a reviewer would otherwise ask about. Skip when there was no real choice.
- `## Raio de impacto`: one or two sentences on who or what it touches and why that is safe or risky. If trunk is red, state the cost of leaving it red.
- `## Verificação`: one to three bullets, each a real run path and its outcome. Perf: one primary number with its unit, `before → after`, and a link to the arena or swarm directory for the rest. No sample-size methodology, swarm recitals, or metric tables.

After the sections, attach videos or screenshots when they prove a claim. Full SHAs, swarm or arena lane recitals, lever-correction essays, file-by-file checklists, and "CLEAN" verdicts go in a linked artifact, not the body.

**Forge.** Resolve the forge before the first MR operation and keep that choice for create, edit, view, watch, and merge. Check `git remote get-url origin`. For a GitLab remote on `git.bistek.com.br`, use `glab` as described in `../references/environment.md`. For a `github.com` remote, use `gh`.

**Built-in MR tool.** When the run provides a built-in MR tool, create, edit, retarget, and mark ready through it, never through a forge CLI. A CLI-made MR misses what the tool tracks. Use the resolved forge for everything the tool does not cover, and for every MR operation when the run has no such tool.

**Size and stacks.** Prefer five narrow MRs to one large MR. A stack is a base-branch chain. The root MR targets trunk. Each child branch rebases onto its parent's exact tip and its MR targets the parent branch. As a parent merges, move its child onto trunk per `playbooks/shipping.md` step 4. Without a built-in MR tool, per the resolved forge, create a child with `glab mr create --source-branch <branch> --target-branch <parent-branch> --title <title> --description-file <file>` for GitLab, or the GitHub equivalent for a GitHub remote. Retarget an existing child with `glab mr update <iid> --target-branch <parent-branch>`. Branch from trunk only for independent work. Rebase on trunk before substantial stack work.

**Readiness.** Open every MR ready, never as a draft. A built-in MR tool can default to draft, so set `draft: false` on every creation call through it. With GitLab, create the MR without a draft title prefix. With `gh`, omit `--draft`. If a GitLab MR still opens as a draft, mark it ready with `glab mr update <iid> --ready`. Run `glab mr view <iid> --output json` before you refer to GitLab MR status.

**Babysit.** Opening an MR does not start a babysit. Post the URL and keep building. Finish the phase or stack first. Run a separate babysit pass only when the operator asks for one after the whole stack exists. A babysit for each new MR stalls the build and spends checks on commits later waves restart. Push back when feedback drifts from intent.

A subagent that opens an MR runs `interrogate`, the code cleanup pass, and `/no-comments`, and posts the URL. It returns to the parent without babysitting, unless it is an Autopilot-full or Autopilot-stack owner. That owner's brief assigns the babysit loop and is the ask `playbooks/babysit.md` waits for. The owner starts the loop after its code-ready report, reports merge-ready or STACK-READY per its playbook, and is exempt from the rules here and in `playbooks/babysit.md` that hold babysitting until a whole stack is built.
