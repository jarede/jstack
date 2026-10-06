# Environment

The one place for facts about the operator's infrastructure. Playbooks and skills say "the forge", "the QA host", or "the pipeline" and read the specifics here. When the environment changes, edit this file, not the playbooks.

A line marked **TODO** is a fact nobody has confirmed yet. Do not guess past it. Before relying on a TODO line, check it with a read-only command when one exists. Otherwise ask the operator once, then record the answer here in its own commit.

## Forge: GitLab

- Host: `git.bistek.com.br` (self-hosted GitLab). REST API at `https://git.bistek.com.br/api/v4/`.
- CLI: `glab`, already authenticated for this host. Check with `glab auth status --hostname git.bistek.com.br`.
- A pull request is a **merge request** (MR), addressed by its project-scoped `iid` (`!123`).
- Reading MR state: `glab mr view <iid> --output json`, `glab mr view <iid> --comments`, and `glab api "projects/:id/merge_requests/<iid>"`. `detailed_merge_status` is GitLab's merge verdict (`mergeable`, `ci_still_running`, `ci_must_pass`, `conflict`, `need_rebase`, `discussions_not_resolved`, `not_approved`, `draft_status`, `checking`, and more).
- Review threads are **discussions**: `glab api "projects/:id/merge_requests/<iid>/discussions"`. A blocking thread is a resolvable discussion with `resolved: false`. Reply with `glab api --method POST "projects/:id/merge_requests/<iid>/discussions/<discussion-id>/notes" --input <payload.json>`. Put the body in the JSON file as data, never in the command line.
- Approvals: `glab api "projects/:id/merge_requests/<iid>/approvals"`.
- Pipelines: `glab ci status --branch <b>`, `glab ci get --branch <b> --output json`, `glab ci trace <job-id>`, and `glab api "projects/:id/merge_requests/<iid>/pipelines"`. A fresh pipeline is `glab ci run --branch <b>`. Retry one job with `glab ci retry <job-id>`.
- Open: `glab mr create --source-branch <b> --target-branch <base> --title <t> --description-file <f>`. Retarget: `glab mr update <iid> --target-branch <base>`.
- Merge. `glab mr merge` sets auto-merge by default, so always pass the flag explicitly. Merge now: `glab mr merge <iid> --squash --auto-merge=false --sha <verified-head> --yes`. Merge when the pipeline succeeds: `glab mr merge <iid> --squash --auto-merge --sha <verified-head> --yes`. `--sha` refuses the merge if the head moved after the verdict.
- Stacked MRs: each MR targets the branch of the MR below it. GitLab retargets a child to the parent's target when the parent merges and its source branch is deleted. Verify the retarget, never assume it.
- Merge trains: **TODO** whether any project uses them. When a project does, a queued MR shows in `glab api "projects/:id/merge_trains"`.
- Automated reviewers: **TODO** which bots comment on MRs (GitLab Duo, SAST, secret detection, a custom bot). Their usernames go in the `--bot` list of `scripts/watch-mr/watch-mr` and in `review-bot-triage.md`.
- `gh` and GitHub remain valid for repositories hosted on github.com. Pick the forge from `git remote get-url origin`.

## QA environment: Docker on `qa.bistek.com.br`

- Containers for QA run on `qa.bistek.com.br`. The local machine has no Docker CLI. Install it (`brew install docker`) or run commands over SSH.
- Remote access: **TODO** confirm the SSH user and whether `DOCKER_HOST=ssh://<user>@qa.bistek.com.br docker ps` works from this machine.
- Deploying a branch or MR to QA: **TODO** (a GitLab CI deploy job, a compose file on the host, a registry tag). Until this is known, verification on QA is "deploy per the project's README, then drive the surface". Record the real steps here once seen.
- Reading QA logs: **TODO**. Expected `docker logs --since <t> <container>` through the remote context.
- Registry: **TODO** (the GitLab container registry on `git.bistek.com.br`, or another).

## Evidence sources for **why**, **recall**, and **reflect**

| Category | Tool here | Status |
|---|---|---|
| Source control and MRs | `git`, `glab` | available |
| Issue tracker | GitLab issues through `glab issue` | **TODO** confirm the team tracks work here, or name the real tracker |
| Long-form docs | repository docs, READMEs, wiki | **TODO** name the wiki or docs site |
| Real-time chat | none configured | **TODO** |
| Observability and error tracking | none configured | **TODO** |
| Database | MCP servers the session exposes, discovered at run time | available when connected |

**why** discovers MCP servers at run time. A category with no tool is a skipped source, reported as skipped.

## Adding a technology

To support a new tool (an issue tracker, an observability stack, a chat), add a row or a section here first. Then, when a skill needs per-tool steps, add one file under that skill's `references/` (for **why**, `references/sources/<tool>.md`, shaped like `code-archaeology.md`). Keep tool names out of playbooks.
