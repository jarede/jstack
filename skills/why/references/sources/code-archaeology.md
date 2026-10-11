# Code Archaeology (git + glab)

## What this source contains

- Commit history (messages, dates, authors, diffs)
- MR descriptions, review comments, and discussions (via `glab`)
- Inline code comments, TODOs, FIXMEs, deprecation notes
- ADRs (architectural decision records) if the repo keeps them
- Tests, whose names and assertions often encode the edge cases that motivated a change
- Related files modified in the same commits (co-change signal)
- CHANGELOG entries and release notes in the repo
- Issue/ticket IDs in commit messages and MR descriptions

The most trustworthy source, tied directly to the code, and the most complete. Everything that went through the repo should be here.

## How to search it

Expand the seed commit list:

```bash
# History through renames
git log --follow --oneline -- <file>

# Pickaxe: commits that added or removed this exact text
git log -S '<exact_string_from_code>' -- <file>

# Or for patterns:
git log -G '<regex>' -- <file>

# Who wrote each line and when
git blame -L <start>,<end> <file>

# One commit's full diff
git show <hash>

# Commits between two points affecting this file
git log <old>..<new> -p -- <file>
```

For each substantive commit, pull the MR context:

```bash
# MR iid from the merge commit or branch
git log -1 --format=%B <hash>

# MR body, review comments, and discussions. In an MR with discussion, the comments hold the real signal
glab mr view <iid> --output json

# MR comments and discussions
glab mr view <iid> --comments
```

Use `glab issue view <iid>` for linked GitLab issues when the issue tracker is confirmed. Use `glab ci status --branch <branch>`, `glab ci get --branch <branch> --output json`, or `glab api "projects/:id/merge_requests/<iid>/pipelines"` for relevant pipelines. The environment table is the source of truth for available tools. Use `gh` only when the repository remote is on `github.com`.

Look for out-of-band docs:

```bash
# ADRs often live in docs/adr/ or similar
rg -l -i 'architecture.decision' --glob '*.md'

# TODOs and FIXMEs near the target
rg -n -C2 '(TODO|FIXME|HACK|XXX|NOTE)' <target_file>

# Related tests
rg -l '<symbol>' --glob '*test*'
```

## What good evidence looks like here

- An MR description that explains the problem, not just the change ("This fixes the pagination bug that caused X")
- A long review thread where alternatives were debated
- An inline comment near the target line that explains a non-obvious constraint
- A test named `test_handles_edge_case_when_X` that reveals a motivating edge case
- A commit message that references a ticket or incident ID
- A CHANGELOG entry that summarizes the user-visible rationale

## Common pitfalls

- **Squash-merge flatlands.** Squashed MRs lose their branch commits. Fall back to the MR description and discussions.
- **Misleading commit messages.** "Small refactor" sometimes hides an intentional behavior change. Look at the diff, not the message.
- **Cargo-culted patterns.** The author may have copied a pattern without understanding why. Check whether it originated earlier in the codebase, and investigate *that* commit.
- **Bot commits and auto-merges.** Dependabot, Renovate, and automated backports usually carry no motivation. Skip them when looking for intent.
- **Treating code as evidence of intent.** The code isn't evidence for why it exists. Evidence comes from commit messages, MRs, comments, tests, and docs. Don't cite "the function is named X" as evidence of intent.

## What to return

Every commit/MR/comment that bears on the question, with:
- The exact text (quoted)
- The hash / MR iid / file:line
- Author and date
- Whether it's direct (explicitly addresses the question) or circumstantial
