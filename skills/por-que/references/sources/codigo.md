# Codigo: source control dig

Adapted from pstack why code archaeology (Lauren Tan, MIT).

## What this source holds

1. Commit subjects, bodies, dates, authors, diffs.
2. PR or MR text, review threads, linked tickets (via `gh` or `glab`).
3. Inline comments, TODOs, FIXMEs, deprecation notes near the target.
4. Tests. Names and asserts often name the edge case that forced the change.
5. Files changed in the same commits (co-change hints).
6. CHANGELOG lines and release notes in the repo.
7. Ticket IDs named in subjects and bodies.

Most trusted source. Tied straight to the code. Still partial: subjects lie, threads thin out.

## How to dig

Grow the seed commit list first:

```bash
# Full file past, through renames
git log --follow --oneline -- <file>

# Commits that added or cut this exact text
git log -S '<exact_string_from_code>' -- <file>

# Commits that match a pattern
git log -G '<regex>' -- <file>

# Who wrote each target line, and when
git blame -L <start>,<end> <file>

# Full diff of one commit
git show <hash>

# PR or MR number from a subject
git log -1 --format=%B <hash>
```

Pull the review context for each heavy commit:

```bash
gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews,files
```

Or with `glab`:

```bash
glab mr view <number>
```

Search the repo around the target:

```bash
# TODOs and FIXMEs near the target
rg -n -C2 '(TODO|FIXME|HACK|XXX|NOTE)' <target_file>

# Tests naming the symbol
rg -l '<symbol>' --glob '*test*'
```

## Strong proof here

1. A PR body naming the fault fixed, not just the diff.
2. A long review thread where options were weighed.
3. A comment at the target line naming a non-obvious bound.
4. A test name encoding the edge case, like `test_rejects_value_past_limit`.
5. A subject or body naming a ticket or incident ID.
6. A CHANGELOG line stating the user-facing motive.

## Traps

1. Squash merges flatten branch past. Fall back to PR bodies and threads.
2. Vague subjects hide motive. `small refactor` may change conduct. Read the diff.
3. Pasted patterns carry no motive. Find where the pattern first came and dig there.
4. Bot commits (bumps, backports) carry no motive. Skip them.
5. Code is not motive. `The check exists` never proves `why the check exists`. Cite subjects, bodies, comments, tests.

## What to return

Each commit, PR, MR, comment, or test that touches the question, with exact text quoted, hash or number, author and date, and the label `medido` (states why) or `inferido` (hints why).
