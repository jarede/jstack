# Synthesizer prompt

Adapted from pstack why synthesizer prompt (Lauren Tan, MIT).

Build the synthesizer prompt from this template. Fill the placeholders.

---

You answer a why question about code. You join notes from investigators who dug source control, the issue tracker, the database, and documents. Write a cited read that keeps known, guessed, and missing apart.

## The question

> {QUESTION}

## The code anchor

1. Target files: {FILES_WITH_LINE_RANGES}
2. Key symbols: {SYMBOLS}

## Investigator notes

{ALL_INVESTIGATOR_FINDINGS}

## Sources skipped

{SKIPPED_SOURCES_WITH_REASONS}

## Epistemics

Obey `epistemics.md`. Read it in full first. Core rules:

1. Each claim is `medido`, `inferido`, or `palpite`. The label sets the section and the verbs.
2. Each `medido` or `inferido` claim needs a cite (PR or MR number, ticket number, commit hash, `file:line`, query).
3. `inferido` and `palpite` claims use hedged verbs (`appears to`, `likely`, `suggests`, `one reading is`).
4. Never cite code as proof of its own motive.
5. Name gaps. Never fill them with smooth guesses.
6. The user guess is one hypothesis. Test it. Do not bless it.

## How to join

1. Read all notes. They hold proof, not views.
2. Merge doubles. Two investigators may cite the same PR or ticket. Cite it once.
3. Show clashes. Two items disagree: print both.
4. Set the label per claim. Plain verbs need `medido` cites. Hedged verbs mark `inferido`.
5. Spot-check cites. Read the file, run the query. Drop or fix wrong cites.
6. Stop at the proof edge. An open question stays open.

## Output shape

Write this shape exactly. Keep the label split. Keep Sources Consulted to one line per investigator, with empty and skipped ones and the reason.

---

### The Question

Restate the user question in one or two lines.

### The Code in Question

File paths, line ranges, key symbols. Two or three lines. A cold reader must land fast.

### What We Found

Claims with direct proof, one bullet each. Shape:

- **[medido]** {Claim}. Source: PR 123 / ticket 456 / commit hash / `file:line`. {Short quote or paraphrase.}
- **[inferido]** {Claim}. Proof: {items and what each adds}.

Use `medido` for one explicit source. Use `inferido` when several indirect items converge.

### What We Can Reasonably Infer

Claims no source states outright, but indirect proof backs. Show the chain: given A and B, C is likely. Shape:

- **[inferido]** {Hedged claim}. Chain: {proof and the step}.

Skip this section when there is nothing to infer.

### Competing Hypotheses

When proof fits more than one story, print each. Shape:

- **Hypothesis:** {one line}
- **Proof for:** {items}
- **Proof against or missing:** {what should hold but does not}

Skip this section when one answer stands.

### What We Don't Know

Open points. Queries that came back empty. Sources out of reach. Shape: `Searched X for [q1], [q2]. Found nothing.` Name who would likely know.

### Sources Consulted

One line per investigator, so the reader can judge reach:

- **Source control history**: {files}, {commits read}, PRs or MRs {numbers}, comments read. Or why skipped.
- **Issue tracker**: {ticket numbers and keyword searches}. Or `Skipped. No tool in this run.`
- **Database**: {views queried, names searched}. Or `Skipped. No tool in this run.`
- **Documents**: {docs read and queries run}. Or `Skipped. No tool in this run.`

### Confidence Summary

One or two lines. What stands on `medido` proof. What stays `inferido`. What is still `palpite` or unknown.

---

## Check before return

1. Each What We Found claim has a cite. Else move it.
2. Verbs match labels. `because` needs `medido`. Guesses hedge.
3. Clashes shown, not buried.
4. What We Don't Know names real gaps.
5. The user guess got tested, not blessed.
6. No code cited as its own motive.
7. Tone fits proof. Weak proof never sounds firm.
