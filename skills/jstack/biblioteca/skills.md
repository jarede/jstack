# Writing skills

A skill is tested like code: watch an agent fail without it, write the least text that fixes what
you saw, watch it pass, close the loopholes. **No skill and no edit to a skill without a failing
test first.**

Adapted from superpowers `writing-skills` (Jesse Vincent, MIT) and pstack `eval` (Lauren Tan, MIT).

## RED — baseline without the skill

1. Write 3 or more scenarios that should use the skill, plus **one that should not**.
2. Run each in a fresh subagent **without** the skill (Claude Code: `Agent`; opencode: `subagent`).
   Tell it not to change anything and to describe exactly what it would do, in order.
3. Record verbatim what it did, what it missed and the reasons it gave for skipping things. That
   record is the test the skill must pass. If the baseline already does the right thing, there is
   nothing to write.

## GREEN — the least skill that fixes it

- Address the specific failures from RED, not hypothetical ones.
- Run the same scenarios with the skill. Every miss from RED must now be covered; the
  should-not-trigger scenario must stay untouched.

## REFACTOR — close loopholes

Each new excuse or shortcut you see in a run gets an explicit counter in the skill (a rule, a red
flag, a row in a table). Re-run until the scenarios pass without new excuses. Match the form to
the failure: a skipped rule needs a prohibition and red flags; output with the wrong shape needs a
recipe of what the output is; a missing element needs a required slot in the template.

## Frontmatter and naming

- `name`: same as the folder; only `[a-z0-9-]`.
- `description`: third person, starts with "Use when…", says **when** to use it — symptoms,
  situations, words the user says. Never summarise the workflow: an agent that reads a workflow in
  the description follows the description and skips the body. Max 1024 characters.
- **On-demand skills** (process skills such as `jstack`, `jstack-setup`): `disable-model-invocation:
  true` in the frontmatter **and** `sob-demanda` as the third column in `skills.txt`.
- One target per skill in `skills.txt` (`claude` or `opencode`), never both: opencode also reads
  `~/.claude/skills`.

## Size and structure

- `SKILL.md` holds the rules and the flow; details over ~100 lines go in a sibling file linked by
  a relative path (`references/x.md`). `just check` fails on broken links.
- One excellent example beats several mediocre ones. No stories about the session it came from.
- Tables for scanning, numbered lists for steps, flowcharts only for a non-obvious decision.

## Blind evaluation (for important changes)

When comparing two versions of a skill, keep the candidate unaware it is being tested: an organic
request, sanitized folder names, no "test/eval/judge" words. A judge from another model family
scores both outputs on a rubric the candidates never saw. Grade what the agent actually read and
did (its transcript, the diff), never what it says it did.

## Checklist

- [ ] RED recorded (3+ scenarios, 1 should-not-trigger)
- [ ] frontmatter valid; `just check` green
- [ ] GREEN: every RED miss covered; should-not-trigger untouched
- [ ] loopholes closed and re-run
- [ ] adapted text credited in `NOTICE.md`
