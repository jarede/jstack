# Epistemics

Adapted from pstack why epistemics (Lauren Tan, MIT).

Code shows what it does. It never shows why it is so. Why lives in commits, PRs, tickets, docs. Those records are partial. Say what you know. Mark the rest.

## Levels

### 1. Medido

A source states it in plain text. Quote it. Cite it.

Examples:

1. A PR body says the change fixes a paging fault past 1000 rows.
2. A ticket says a requester asked for the check in review.
3. A comment says the upstream call rejects values past 100.
4. A doc says the team picked option A for restart safety.

Write with plain verbs. `X exists because Y.` Put the citation next to the verb.

### 2. Inferido

Indirect items converge. No source states it outright.

Examples:

1. A PR title says "faster path" and sibling commits touch the same hot path.
2. Tests added with the change all use very large inputs.

Write hedged. `Likely`, `appears to`, `suggests`, `is consistent with`. Show the chain: given A and B, C follows because D.

### 3. Palpite

A fair guess with thin support. Other readings fit as well.

Write it as a guess. `One reading is X, but no source states it.` Keep it in Competing Hypotheses.

### Gaps

A gap is a result. Name the question, the places searched, the queries used, what came back empty.

## Wording rules

1. Strong verbs (`because`, `the reason is`, `was designed to`, `fixes`, `the team decided`) need a `medido` cite beside them.
2. Hedged words (`appears to`, `likely`, `suggests`, `may have been`) mark `inferido`.
3. Never write `obviously`, `clearly`, `of course`, or `just` to wave a cause away.
4. Never write `I think`. Write `the record suggests`.

## Traps

1. Retrofit: code looks sound now, but the motive may be old or wrong. Do not invent a clean past.
2. Copy: a pattern may be pasted, not chosen. Trace where it first came.
3. Absence: no note about a risk is not proof nobody saw it.
4. User guess: test it like any other hypothesis. Do not confirm it by default.

## Contradictions

Two sources disagree: show both, with cites. Do not pick the tidy one.

## Check before delivery

1. Each `medido` claim has a cite. Else demote it.
2. Each `inferido` claim is hedged. Else hedge it.
3. No claim cites code as its own motive.
4. What We Don't Know names real gaps.
