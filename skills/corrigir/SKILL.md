---
name: corrigir
description: Use when the user invokes /corrigir (or @corrigir) because agents keep repeating the same mistakes in a repository and the user wants each mistake made impossible instead of corrected again.
disable-model-invocation: true
---

# Corrigir
Adapted from pstack correct, principle-encode-lessons-in-structure (Lauren Tan, MIT).

Assume every contributor is an agent.
It sees only the files it opened.
It copies the nearest example.
It takes the quick path that compiles.
Design the repo so a change that looks right from one file is right for the whole repo.

## 1. Find the mistake classes

1. Read recent history: `git log`, reverts, and review comments (`gh` or `glab`, whichever the remote uses).
2. Read `.agentes/decisoes.tsv` and `.agentes/revisao-*.md` from orquestra runs, plus interrogar reports.
3. Read the repo AGENTS.md and CLAUDE.md, and this project's Claude Code memory files of feedback type only.
4. Group repeated mistakes into classes. A class counts after it happened twice, or when the user names it.
5. Rank classes by frequency. Fix the most frequent first, one commit per class.

## 2. Fix each class at the highest level that works

1. **Architecture.** Give each piece of state one owner and one supported way. Hide internals so the wrong import fails. Delete old ways and dead code an agent would copy.
2. **Types.** Enforce the rule so the bad state cannot be written. When bad code still compiles, go to level 3.
3. **Lint or check.** Add a lint or a step in the repo check command whose error names the file, helper, or shape to use instead. Fail only on newly added cases when the pattern is already common.
4. **Test.** Add a regression check that fails without the fix and passes with it (`../jstack/biblioteca/testes.md`). Remove any check that would still pass if the code did nothing (`../jstack/biblioteca/verificacao.md`).
5. **Docs or agent rules last.** Write docs or agent rules only for judgment calls. Nothing fails when an agent skips them.

## 3. Fix and prove

1. Work on a work branch. Commits there are fine, one per class.
2. Run the same command locally and in CI. Both runs stay green.
3. Prove each new check fails on a real past mistake: add a throwaway worktree at the old commit (`git worktree add <tmp> <sha>`), run the check, show the failing output, then remove the worktree.
4. Mark exceptions on the offending line with a reason, an expiry date, and a human approval.
5. Push and open a PR per `../jstack/biblioteca/finalizacao.md`.

## 4. Keep the rule table

1. Keep the table in the repo agent file (AGENTS.md or CLAUDE.md of the repo).
2. Each row pairs one rule with what enforces it.

| Regra | Garantida por |
|---|---|
| Lower-case row keys | `fetch_rows` helper plus check script |

3. When the user corrects you, fix the mistake and add the row. When the row exists but nothing enforces it, raise the level in the same change. Drop a row once its mistake cannot happen.

## 5. Reply

1. Report one row per class: evidence, chosen level, and why a higher level did not work.
2. Paste the failing output from the old commit and the passing output after the fix.

## Example

| Case | Shape |
|---|---|
| Symptom | Row dicts built from cursor rows use upper-case keys |
| Architecture fix | One `fetch_rows` helper builds lower-case keys; it is the only way to fetch rows |
| Check | Repo check fails on `["UPPER_CASE"]` key access and names `fetch_rows` |
