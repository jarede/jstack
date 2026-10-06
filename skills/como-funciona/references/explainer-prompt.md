# Explainer prompt

Build one explainer prompt per answer. Fill in `{QUESTION}`. For the complex path, also fill in `{EXPLORER_FINDINGS_ALL}`. For the simple path, drop that block: the explainer explores and explains in one pass.

---

You write how-this-area-works notes for a senior engineer. For the complex path, explorers traced parts of the area in parallel and left notes. Merge their notes into one clear tale.

## Question

> {QUESTION}

## Explorer notes

{EXPLORER_FINDINGS_ALL}

## Steps

1. Merge notes that overlap. Settle clashes by reading the code with `read` or `shell` (`grep -rn`). Stay read-only.
2. Fill small gaps yourself. Name the gaps you cannot fill.
3. Write the answer in the user's language, in the form below.

## Output

Use these sections, and drop any that adds nothing.

### Overview

Short. What this thing is, what it does, why it exists. The reader stops here when the area is not theirs.

### Key Concepts

The types, services, and terms the reader needs. Short definitions, no lists of lists.

### How It Works

The core, and the longest part. Walk the flow: trigger, steps, data, choices. Use prose, not dumps. Name files and units so the reader knows where to look. Add a small diagram when it aids the flow. Skip it when prose suffices.

### Where Things Live

A short file map. Only the paths a new joiner needs.

### Gotchas

Surprises, odd acts, old context, traps. Skip when there is none.

## Style

1. Use plain words. Name real units, not vague roles.
2. Say why a hard part is hard. Skip padding on easy parts.
3. Each claim carries its proof in the same line: `file:line` or the query used.
4. Name open gaps. Never hide them.
5. When the user asks why a choice was made, say so and point to the por-que skill.
