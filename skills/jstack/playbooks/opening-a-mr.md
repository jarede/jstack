### Opening an MR

Invoked at the end of every other playbook.

**Worktree.** Work from a git worktree off trunk. Give every concurrent subagent its own worktree. If a checkout has unrelated changes, preserve them and create a fresh worktree for this change. If a worktree is snarled, create a fresh one from trunk and redo the change minimally.

**Commits.** Commit liberally. Rebase into small, ordered commits before opening MRs. Each commit is a future MR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit. New commit when separable.

**MRs.** Run the code cleanup pass from `../references/harness.md` over the diff before commit. Run `/no-comments` before review. Write every MR title, MR description, and commit body with `/technical-writing`, then apply `/unslop`. Apply every technical-writing layer except Diátaxis. Use one word for each action, keep articles, and avoid `-ing` when a plain verb works.

**Titles.** Use Conventional Commits in the form `type(scope): subject`. Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf` as the type. Use the changed area, such as `jstack` or `playbooks`, as the scope. Keep the subject short and imperative. Name a real symbol when one carries the change. For example, `fix(jstack): retarget opening-a-mr babysit trigger`. Do not add a trailing period.

**Descriptions.** The MR description is a briefing, not the lab notebook. A reviewer who has the diff should learn why the change exists, what it leaves out, what it could break, and how you proved it works, in under a minute. Write short, simple sentences with few identifiers. Do not write walls of text. The squash commit body is the MR description. If the description would make the squash commit longer than about 40 lines, cut it.

Put each section under a `##` heading, not a bold lead-in, so the sections stand apart. Use these sections in order. Drop a section when it has nothing to say.

- `## Why` gives the problem and the approach in one to three short sentences. Do not list SHAs or rebase genealogy. Do not add a "based on main" preamble.
- `## What changed` has one to three short bullets. Name a real symbol or path only when it carries the change. Name both sides of a rename or retarget.
- `## Scope` always names what the MR covers and what it deliberately leaves out, for example a related follow-up or a known gap. Use one to three short items. Do not list symbols or paths, and do not write a file-by-file essay.
- `## Tradeoffs` names only rejected alternatives that a reviewer would otherwise ask about. Skip this section when there was no real choice.
- `## Blast Radius` gives one or two sentences on who or what the change touches and why that is safe or risky. If trunk is red, state the cost of leaving it red.
- `## Verification` has one to three bullets. Each bullet names a real run path and its outcome. For a performance change, report one primary number with its unit in `before → after` form. Link the arena or swarm directory for the remaining evidence. Do not include sample-size methodology, swarm recitals, or metric tables.

After these sections, attach videos or screenshots when they prove a claim. Do not paste full SHAs, swarm or arena lane recitals, lever-correction essays, file-by-file checklists, or "CLEAN" verdicts. Put these details in a linked artifact. A commit body does not restate its subject.

**Forge.** Resolve the forge before the first MR operation and keep that choice for create, edit, view, watch, and merge. Check `git remote get-url origin`. For a GitLab remote on `git.bistek.com.br`, use `glab` as described in `../references/environment.md`. For a `github.com` remote, use `gh`.

**Built-in MR tool.** When the run provides a built-in MR tool, create, edit, retarget, and mark ready through it, never through a forge CLI. Its own instructions say how. An MR made with the CLI misses what the tool tracks, such as a description later runs can edit. Use the resolved forge for everything the tool does not cover, and for every MR operation when the run has no such tool.

**Size and stacks.** Prefer five narrow MRs to one large MR. A stack is a base-branch chain. The root MR targets trunk. Each child branch rebases onto its parent's exact tip and its MR targets the parent branch. Without a built-in MR tool, create a child with `glab mr create --source-branch <branch> --target-branch <parent-branch> --title <title> --description-file <file>` for GitLab, or the GitHub equivalent for a GitHub remote. Retarget an existing child with `glab mr update <iid> --target-branch <parent-branch>`. Branch from trunk only for independent work. Rebase on trunk before substantial stack work.

**Readiness.** Open every MR ready, never as a draft. A built-in MR tool can default to draft, so set `draft: false` on every creation call through it. With GitLab, create the MR without a draft title prefix. With `gh`, omit `--draft`. If a GitLab MR still opens as a draft, mark it ready with `glab mr update <iid> --ready`. Run `glab mr view <iid> --output json` before you refer to GitLab MR status.

**Babysit.** Opening an MR does not start a babysit. Post the URL and keep building. Finish the phase or stack first. Run a separate babysit pass only when the operator asks for one after the whole stack exists. A babysit for each new MR stalls the build and spends checks on commits that later waves restart. Push back when feedback drifts from intent.

A subagent that opens an MR runs `interrogate`, the code cleanup pass, and `/no-comments`, and posts the URL. Then it returns to the parent without babysitting, unless it is an Autopilot-full or Autopilot-stack owner. That owner's brief assigns the babysit loop and is the ask `playbooks/babysit.md` waits for. The owner starts the loop after its code-ready report and reports merge-ready or STACK-READY as its playbook says. The rules here and in `playbooks/babysit.md` that hold babysitting until a whole stack is built do not apply to that owner.
