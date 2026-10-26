# jstack

My agent skills for **Claude Code** and **opencode**. A fork of [pstack](https://github.com/cursor/plugins/tree/main/pstack) by [poteto](https://x.com/poteto) (Lauren Tan), adapted from Cursor to my harnesses and to a self-hosted GitLab. pstack's idea stays the same. If you want to go fast, go deep first. Write less code, verify it, and parallelize only work you can trust.

The original is MIT licensed. See [LICENSE](LICENSE). The skills keep poteto's rules and voice. What changed is the plumbing: harness tools, model routing, the forge, and the environment.

## Install

Requirements: macOS or Linux, `bash`, `python3`, `just`. For the full set also `opencode2` (multi-model roles), `glab` (GitLab), and `bun` (the MR watcher and the orchestration CLI).

```bash
git clone https://github.com/jarede/jstack.git ~/projetos/jstack
cd ~/projetos/jstack
just dry-run
just install
```

`just` alone lists every recipe.

The install script links:

| From | To | Read by |
|---|---|---|
| `skills/<id>/` | `~/.claude/skills/<id>` | Claude Code and opencode (opencode reads this folder too) |
| `agents/claude/*.md` | `~/.claude/agents/` | Claude Code |
| `agents/opencode/*.md` | `~/.config/opencode/agents/` | opencode |
| generated `build/commands/<id>.md` | `~/.config/opencode/commands/` | opencode, so `/how`, `/jstack`, and friends work there too |

It is idempotent. Every link that points into this repository is managed by it, and stale ones are removed. A real file in the way is moved to `~/.jstack-backup/<timestamp>/`. `just uninstall` removes only jstack's links. Start a new session after installing.

## Get started

1. Run `/setup-jstack` once. It detects the Claude aliases and opencode models you have and writes `~/.config/jstack/models.conf`.
2. Type `/jstack <task>` whenever the task needs rigor. It matches the task to a playbook, copies the playbook's steps into the todo list, and routes to the other skills as the steps need them.
3. Unsure which skill fits? `/jstack-help`.

There is no always-on mode. Type `/jstack` at the start of each task. The [guide](docs/guide/README.md) walks through a first real task.

## Models

Roles are split by model strength, as in pstack. Code delegates go to a fast code model through `opencode2 run`. The hardest changes, prose, and judgment go to Claude Opus. Review panels pair two model families. The defaults and the value syntax (`claude:opus`, `opencode:opencode-go/grok-4.7`, `inherit`) live in [models.md](skills/jstack/references/models.md). [harness.md](skills/jstack/references/harness.md) says how each harness spawns each kind of value.

## Environment

Facts about my infrastructure live in one file, [environment.md](skills/jstack/references/environment.md): the GitLab host (`git.bistek.com.br`, `glab`), the QA Docker host (`qa.bistek.com.br`), and the evidence sources **why** can query. Lines marked **TODO** are facts nobody has confirmed yet, such as how a branch deploys to QA. Agents check or ask before relying on them, then record the answer there. To add a technology (an issue tracker, observability, chat), add it to that file first.

## Skills

`/jstack` runs most of these for you. Call one directly when you want just that.

| Skill | Use it when |
|---|---|
| [`/jstack`](skills/jstack/SKILL.md) | default entry point for any non-trivial task. 23 playbooks, from bug fix to overnight autopilot. |
| [`/jstack-help`](skills/jstack-help/SKILL.md) | you are unsure which skill, playbook, or principle fits. |
| [`/setup-jstack`](skills/setup-jstack/SKILL.md) | you want to choose the model per role. |
| [`/how`](skills/how/SKILL.md) | you want a walkthrough of how a subsystem works. |
| [`/why`](skills/why/SKILL.md) | you want to know why something was built this way, from every evidence source available. |
| [`/recall`](skills/recall/SKILL.md) | you are resuming work and want your recent context rebuilt from your transcripts and the shared record. |
| [`/ketchup`](skills/ketchup/SKILL.md) | you want to catch up on what changed in this chat since your last message, in plain words, with every call waiting on you laid out so you can decide from the reply alone. |
| [`/blast-radius`](skills/blast-radius/SKILL.md) | a small-looking change might break something else. |
| [`/architect`](skills/architect/SKILL.md) | code is about to cross a function boundary and the caller's usage, types, and module shape should be settled first. |
| [`/arena`](skills/arena/SKILL.md) | you want N parallel attempts at the same thing, then the best parts of each. |
| [`/swarm`](skills/swarm/SKILL.md) | you want N parallel workers over slices or races, then one report. |
| [`/interrogate`](skills/interrogate/SKILL.md) | you have a diff and want models from different families to try to break it. |
| [`/figure-it-out`](skills/figure-it-out/SKILL.md) | no bundled playbook fits. It designs one for the task. |
| [`/show-me-your-work`](skills/show-me-your-work/SKILL.md) | you want a reviewable decision trail. |
| [`/reflect`](skills/reflect/SKILL.md) | a long task landed and the recipe should become a skill edit. |
| [`/correct`](skills/correct/SKILL.md) | you keep correcting agents for the same mistakes. |
| [`/teach`](skills/teach/SKILL.md) | you want to understand a change or subsystem, diagram by diagram. |
| [`/tdd`](skills/tdd/SKILL.md) | a bug has a cheap local test path. Failing test first. |
| [`/benchmark-checklist`](skills/benchmark-checklist/SKILL.md) | you measured a speedup or regression and want the number vetted. |
| [`/no-comments`](skills/no-comments/SKILL.md) | strip comments before review. Spawns `comment-sicko`. |
| [`/unslop`](skills/unslop/SKILL.md) | clean AI tells out of prose. |
| [`/technical-writing`](skills/technical-writing/SKILL.md) | docs, READMEs, MR descriptions, commit messages. |
| [`/bro`](skills/bro/SKILL.md) | restate the last message in plain language. |
| [`/in-your-own-words`](skills/in-your-own-words/SKILL.md) | you want the agent to restate your goal and the problem before it starts. |
| [`/sharpen`](skills/sharpen/SKILL.md) | you want a prompt rewritten deeper, not bigger, before you send it. It returns the prompt and doesn't do the task. |
| [`/typescript-best-practices`](skills/typescript-best-practices/SKILL.md) | reading or editing TypeScript. |
| [`/create-verification-skill`](skills/create-verification-skill/SKILL.md) | a project has no scripted way to prove app behavior. |
| [`/maintain-verification-skill`](skills/maintain-verification-skill/SKILL.md) | a project's verify skill drifted from the app. |
| [`/create-formal-verification-skill`](skills/create-formal-verification-skill/SKILL.md) | a race, a retry, or an invariant needs proof in every case, not only the ones tests reach. |
| [`/maintain-formal-verification-skill`](skills/maintain-formal-verification-skill/SKILL.md) | code covered by a formal check changed, and you need to know whether a failure is drift or a bug. |
| [`/statechart`](skills/statechart/SKILL.md) | someone who owns the behavior needs to see it, not read a spec. Draws a TLA+ model as a Mermaid statechart, with each bug as a numbered path. |
| [`/automate-me`](skills/automate-me/SKILL.md) | you want a personal `-mode` skill drafted from how you actually work. |

Plus 24 `principle-*` skills, one rule each, indexed inline by `/jstack`.

## Maintenance

Editing a skill is editing its file here. Installed copies are links, so a change applies from the next session.

```bash
just check      # frontmatter, links, and leftovers from the Cursor original
just install    # after adding or removing a skill or agent
just deps       # once, before the bun tests
just ci         # check, then the bun tests and the typecheck
```

New skills follow the [Authoring a skill](skills/jstack/playbooks/authoring-a-skill.md) playbook.

## Layout

```
jstack/
├── skills/<id>/            one folder per skill (SKILL.md, references/, scripts/)
│   └── jstack/             router, playbooks/, references/ (harness, models, environment, review bots), scripts/
├── agents/claude/          Claude Code subagents (jstack-agent, comment-sicko)
├── agents/opencode/        the same agents in opencode's format
├── docs/guide/             the walkthrough
└── scripts/                install.sh, check.py
```
