---
name: simplified-technical-english
description: Write technical explanations, procedures, and descriptions in ASD-STE100 Simplified Technical English (STE) — the international controlled-language standard for technical documentation, originally built by Airbus so non-native engineers could read maintenance manuals unambiguously. Use this skill whenever you are about to EXPLAIN something technical: what code does, how a system works, step-by-step procedures, how to run a command, what a file or config option means, what a change did, or a warning before a destructive action. Also use it when writing or reviewing technical documentation, README files, code comments, and commit messages. Do NOT use it for ordinary conversation — greetings, clarifying questions, opinions, agreement, or anything that is not a technical explanation. Trigger it even when the user does not mention STE by name, since most requests to "explain", "walk me through", or "document" are exactly the trigger.
license: MIT
compatibility: opencode
---

# Simplified Technical English (ASD-STE100)

## Why this exists

ASD-STE100 is a controlled natural language: a restricted grammar plus a
controlled vocabulary, designed so that a reader who is not a native English
speaker cannot misread a technical instruction. Airbus built it in the 1980s
because maintenance manuals were being written in English by French, German, and
Spanish engineers and then translated — and people were getting hurt.

Two things follow from that origin, and they are the whole reason this skill is
worth applying here:

1. **It is optimised for a non-native reader.** For this user, who is learning
   English, STE is not just a style constraint — it is vocabulary practice.
   Choosing approved words repeatedly is how the useful ones stick.
2. **Its whole purpose is to remove ambiguity, not to remove personality.** A
   rule that makes a sentence harder to understand is a misapplication, even if
   the rule technically applies. Unambiguous always wins over conforming.

ASD's own front matter states the standard must not be used alone; it is meant to
sit alongside a style guide. Treat it that way here — apply the rules, and use
plain judgment when following them would make the explanation worse.

## Scope: when this applies and when it does not

**Apply STE to:**

- Descriptions of what code, a file, or a system does
- Procedures and step-by-step walkthroughs
- Explanations of a command, a config value, or an API
- Summaries of what a change did
- Warnings before destructive actions
- Technical docs, README content, code comments, commit messages

**Do not apply STE to:**

- Greetings, acknowledgements, and conversational filler
- Questions back to the user ("which directory do you mean?")
- Opinions, agreement, and decisions ("good call, let's do that")
- Discussion *about* our conversation
- Anything where the user is being social, not being served

The test: if the sentence is doing work for a reader who needs to understand or
carry out something technical, it is in scope. If it is just talk, it is out.

Mixing is fine and normal. A reply can open with normal English and switch to
STE for the technical body. Do not announce the switch.

## The rules that change writing most

These are the high-value ones. Full rule numbering is in
`references/rules.md` — read it when a case is genuinely borderline.

### One instruction per sentence

If a sentence contains two actions, split it. This is the single most effective
rule and the one most often broken.

- Non-STE: `Run the migration and then restart the service.`
- STE: `Run the migration. Restart the service.`

### Sentence length

- **Procedures / instructions: 20 words maximum**
- **Descriptions / explanations: 25 words maximum**

Count them. When a thought will not fit, that is usually a sign it is two
thoughts. Split it, or move the detail into a vertical list.

### Active voice

Name the actor. Passive voice is allowed in a description only when the actor is
genuinely unknown or irrelevant.

- Non-STE: `The config file was modified by the installer.`
- STE: `The installer modified the config file.`

### Simple tenses only

Use simple present for instructions and general facts, simple past for events that
already happened, and `will` for the future. No present continuous, no perfect
tenses, no `going to`.

- Non-STE: `The server is running the new build.` → STE: `The server runs the new build.`
- Non-STE: `We have finished the setup.` → STE: `We finished the setup.`

### No contractions

Write `do not`, not `don't`. `is not`, not `isn't`. This also means no `-ing`
auxiliary forms at all: `is running` becomes `runs`, `has finished` becomes
finished. The only `-ing` forms STE permits are technical nouns (`filtering`,
`threading`) used as nouns.

### Approved modal verbs, each with one job

| Word | Use it for | Example |
|---|---|---|
| **shall** | An instruction directed at the reader | `Do not remove the cover.` (use imperative) |
| **must** | A mandatory requirement from an outside source | `The filter must be replaced every 500 hours.` |
| **will** | A future consequence | `The service will restart.` |
| **can** | Possibility or ability | `You can use either port.` |
| **may** | Permission | `You may use the maintenance mode.` |

Getting these confused is a common and consequential error: telling a reader a
requirement is optional (`may`) or that a permission is mandatory (`must`) can
cause real harm. When a sentence contains a requirement, be deliberate.

### Do not cut grammar to be short

Never drop the subject, verb, or article to save words. This is why STE has
sentence-length limits instead of a style of telegraphic English. `Install the
package` is not STE; `Install the package` is complete because `install` is
already imperative.

### Structure

- One topic per paragraph, maximum 6 sentences
- Use a vertical (numbered or bulleted) list for anything with more than two
  steps or more than three items
- Start a safety instruction with a command or a condition, never with a
  rationale: `WARNING: Do not power off the unit.` not `If the unit is on, you
  must not turn it off because data will be lost.`

### Punctuation

Plain marks only: period, comma, colon, semicolon, parentheses, hyphen,
apostrophe. Avoid special symbols in procedures. Keep any symbol that a real tool
requires — `|`, `>`, `$` — because that is the actual command and clarity wins.

## Vocabulary: the part that is easy to get wrong

The official dictionary holds roughly 900 approved general words. Do not attempt
to memorize it, and do not try to reject uncommon words — the list in
`references/vocabulary.md` covers the words that actually come up.

**The critical distinction: technical terms are already approved.**

STE approves Technical Names and Technical Verbs outside the core dictionary
(rules 1.5 and 1.12). So domain vocabulary is fine and must not be mangled:
`asyncio`, `idempotent`, `commit`, `schema`, `dependency injection`,
`middleware`, `CDN`, `ORM`, `JWT`, `endpoint`. A word is only a violation if it is
a *general English* word that has an approved equivalent.

That is what keeps this useful for real technical work instead of turning every
explanation into baby talk.

The substitutions that matter most, because they are the ones a reader most needs
clarified:

| Instead of | Write | Why |
|---|---|---|
| utilize, leverage, employ | use | Plain verb, no loss |
| perform, conduct, carry out | do | STE prefers the short verb |
| terminate, abort, cancel | stop | One approved verb, one meaning |
| in order to | to | Two words become one |
| at this point in time / currently | now | One word |
| is able to | can | Modal, clearer about possibility |
| has the ability to | can | Same |
| a large number of | many | Fewer words, same meaning |
| in the event that | if | Conditional, not nominalised |
| prior to | before | Preposition, not adjective |
| approximately | about | Adverb, simpler |
| numerous | many | Approved adjective |
| additionally / furthermore | also | One adverb |
| nevertheless / however | but | Simpler conjunction |
| assist, facilitate | help | Approved verb |
| attempt | try | Approved verb |
| purchase | buy | Approved verb |
| require | need | Approved verb |
| sufficient | enough | Approved adjective |
| additional | more | Approved adjective |
| prior | before | Adverb or preposition |

## Workflow

1. Decide whether the content is in scope. If it is ordinary conversation, write
   normally and skip this skill entirely.
2. Write the technical content first in whatever way is clearest to you.
3. Then tighten it: split compound sentences, convert to active voice, reduce to
   simple tenses, expand contractions, check modals against the table above,
   swap unapproved general words for approved ones.
4. Count words on any sentence over 20 and split it if needed.
5. Leave code blocks, file paths, CLI commands, and API signatures exactly as
   they are. They are not prose and rewriting them breaks the instructions.

Step 2 before step 3 matters. Drafting straight into constraints tends to produce
compressed prose that is technically compliant and practically useless. Get the
meaning right, then simplify.

## Interaction with the other standing instructions

**The English tutor runs first.** When the user writes a message with a
meaning-level error, correct it — in normal English, as that skill requires —
then give the explanation in STE. Keep the two visually separate so the
correction does not read as part of the technical content.

**The high help level still applies.** Explaining what a step does and why is
required, and STE is genuinely good at it: short active sentences with a clear
actor carry rationale well. But STE's 20-word limit means rationale often needs
several sentences, not one long one. Do not drop the reasoning to satisfy the
length rule — split it across sentences instead.

**When the rules conflict with clarity, clarity wins.** If an approved word makes
an explanation harder to follow, use the clearer word. An ambiguous explanation
defeats the entire purpose of the standard. Flag the trade-off in one short line
when it happens, so the user can judge.

## Anti-patterns

These are the ways this skill goes wrong in practice.

- **Compressed prose.** Stack of nouns, no articles, no helper verbs, to hit the
  word count. Violates the no-omission rule and reads as telegrams. Split into
  real sentences instead.
- **Vocabulary policing of technical terms.** Rewriting `asynchronous` to
  `not at the same time`. Technical names are approved. Leave them.
- **Mechanical modal use.** `shall` everywhere, or `will` for requirements. The
  four modals carry different legal and safety weight; use the table.
- **Full-compliance performance.** Hunting for violations in a two-line reply
  nobody asked to be documented. The standard is for documentation and for
  explanations that someone will act on. Not for "here's your file."
- **Passive voice in instructions.** Procedures are always active. If the actor
  is unknown, the sentence belongs in a description, not a procedure.