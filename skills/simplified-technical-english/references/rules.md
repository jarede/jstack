# ASD-STE100 writing rules

Reference for the rules in detail. Organized by topic rather than by official
rule number, because numbering shifted between issues and citing a wrong number
is worse than citing none. Issue 9 (January 2025) is the current edition and
carries 53 rules across 9 sections. If you need an exact citation, read the
official PDF at <https://www.asd-ste100.org/>.

Rule 1.5 (technical names) and 1.12 (technical verbs) are the two cited most
often, and both are stable across issues.

---

## Section 1 — Words

**1.1 Approved words and meanings.** Every general English word must appear in the
dictionary, used as the part of speech and with the meaning given there. If the
dictionary gives no meaning, you may not use the word in that meaning.

**1.2 One word, one part of speech, one meaning.** `test` is approved as a noun.
It is not approved as a verb. `close` (v) is approved for a door or an electrical
circuit only, not for a meeting or a deal.

**1.3 Unapproved words.** Each has suggested approved alternatives in the
dictionary. The alternatives are suggestions, not requirements — a different
approved word that keeps the meaning is equally valid.

**1.4 Plurals.** Approved plural forms only. Irregular plurals of unapproved words
are still unapproved.

**1.5 Technical names.** Domain terms not in the dictionary are approved as
nouns. This is why `asyncio`, `idempotent`, and `middleware` need no
justification. Multi-word technical names may be up to three words long.

**1.6 Unapproved words between a verb and its object.** Do not insert
unapproved descriptive words to modify a noun directly after a verb — the
sentence gets shorter and clearer without them.

**1.7 Verbs that need an object.** Some approved verbs are transitive only. Using
one intransitively is a violation.

**1.8 Multi-word nouns.** Maximum three words. `aural warning system` is
acceptable; a four-word noun is not. Break it with a preposition or split the
sentence.

**1.9 Words not in the dictionary.** A word absent from the dictionary is not
automatically approved — check whether the dictionary lists it as unapproved with
suggested alternatives.

**1.10–1.12 Technical verbs and verb control.** Technical verbs outside the
dictionary are approved (1.12). Check that the verb is used in a permitted
construction.

---

## Section 2 — Verbs

**2.1 One verb per clause.** Do not chain verbs with `and` in one clause when the
subject is the same. Split the sentence.

**2.2 Pronouns with verbs.** Avoid the pronoun `it` for a technical object. Name
the object again — this is a large part of why STE text repeats nouns, and the
repetition is deliberate.

**2.3 `to` as an infinitive marker.** `to` is approved before an infinitive. Do
not use it between two verbs that both carry meaning.

**2.4 Verb complement.** Some approved verbs require a specific complement. Check
the dictionary entry.

---

## Section 3 — Modal verbs and conditionals

**3.1 Approved modals only.** `shall`, `must`, `may`, `can`, `will`. Other
modals — `could`, `would`, `should`, `might` — are not approved. This is a real
constraint, not a preference.

**3.2 One meaning per modal.** The table in SKILL.md is normative:

| Modal | Meaning |
|---|---|
| `shall` | Instruction directed at the reader |
| `must` | Mandatory requirement imposed from outside |
| `will` | Future fact or certain consequence |
| `can` | Possibility or ability |
| `may` | Permission |

**3.3 Past participle as adjective only.** The past participle appears only
modifying a noun, or after `to be` / `to become`. Never as a verb.

**3.4 No `either` / `or` pairs.** Write `x or y`, not `either x or y`.

**3.5 No contractions of modals.** `cannot` and `must not`, not `can't` and
`mustn't`. (These two are the notable approved contractions; everything else is
spelled out.)

**3.6 Conditional clauses.** Approved forms only — `if`, `when`, `unless`, `as`,
`in case of`. See the subjunctions section.

---

## Section 4 — Tenses

**4.1 Simple present** for instructions, general facts, and descriptions.

**4.2 Simple past** for an action that already finished. Never present perfect
(`has finished`), never present continuous (`is running`).

**4.3 Simple future** uses `will`, not `going to` and not `shall` for
prediction.

**4.4 No verb inflections that add aspect or emphasis.** Drop `-ing`, `-ed`
doubling, and similar forms that signal ongoing or completed action.

---

## Section 5 — Verb forms

Permitted forms, and nothing else:

- infinitive (`to install`)
- imperative (`Install the panel`)
- simple present (`the panel installs`)
- simple past (`the panel installed`)
- simple future (`the panel will install`)
- past participle, **only as an adjective** (`the installed panel`)

**5.1 No auxiliary verbs** for building complex constructions. `is being`, `has
been`, `will be` are all unavailable outside the passive.

**5.2 No `-ing` forms** except technical nouns used as nouns or as modifiers
inside a technical noun. `filtering` as a noun is fine; `the system is filtering`
is not.

**5.3 The passive voice** uses `to be` plus a past participle. Allowed in
descriptions when the agent is unknown or irrelevant. Never in a procedure.

**5.4 Phrasal verbs** are not split by an adverb. `Turn off the power`, not
`Turn the power off` — though `power off` as a noun form is a separate case.

**5.5 Adverbs of manner** come from a restricted set and follow the verb
directly.

---

## Section 6 — Articles

**6.1 Use `a`, `an`, and `the`.** Articles are mandatory where English requires
them.

**6.2 `the`** marks a specific item already identified. Do not use `the` for a
general or plural noun in a description where the specific instance does not
matter.

**6.3 Do not omit articles** to shorten a sentence. This is the rule most often
broken when chasing the word limit — and the reason telegraphic STE is wrong.

---

## Section 7 — Nouns, adjectives, and pronouns

**7.1 Noun stacks** — maximum three words, and no noun-noun chains beyond that.

**7.2 Adjective order** follows a fixed order: quantity, quality, size, shape,
colour, material, purpose.

**7.3 Every adjective needs its noun.** No implied or dropped nouns.

**7.4 Plurals** used for quantities, per the quantities section below.

---

## Section 8 — `To be`

**8.1 Approved forms only**: `am`, `is`, `are`, `was`, `were`, `be`, `been`,
`being`.

**8.2 Not as an auxiliary** except in the passive and in the copula. So no `is
running`, no `is being installed`.

**8.3 No contractions** — `is not`, not `isn't`. This removes `it's`, which is a
common source of real ambiguity anyway.

**8.4 `to be` vs `to exist`.** Use `exists` for existence, `is` for
identification or description. `There is` is approved in a restricted form.

---

## Section 9 — Prepositions

**9.1 Approved prepositions only**, used with the nouns the dictionary specifies.

**9.2 Do not use a preposition where a verb is approved.** `access to` is
approved as a noun phrase, but `enter` may be approved as a verb for the same
action. Check.

**9.3 No preposition stacking.** Do not end a sentence with a preposition, and do
not use two prepositions in sequence to express one relationship.

**9.4 Position.** Prepositions sit before the noun phrase in normal use, except
for the approved verb particles covered in 5.4.

---

## Section 10 — Quantities and dimensions

**10.1 Approved forms only** for expressing quantity, dimension, tolerance, and
range. Use `more than`, `less than`, `a maximum of`, `a minimum of`.

**10.2 State the unit every time.** A number without a unit is ambiguous. `0.10`
means nothing; `0.10 mm` does.

**10.3 Use figures** for numerical values in instructions and descriptions, not
spelled-out words.

**10.4 Plural nouns** for quantities — `three bolts`, not `three of bolt`.

**Example**: `The dimension must not be more than 0.10 mm.` This shows the
combined form: approved comparison word, figure, unit, modal.

---

## Section 11 — Conjunctions

**11.1 `and` and `or` only.** Do not write `and/or`, `either/or`, `but/and`.

**11.2 `but`** is approved and is preferred over `however` and `nevertheless`.

**11.3 Do not chain clauses** with three or more conjunctions. Split them.

---

## Section 12 — Subjunctions (subordinate connectors)

**12.1 Approved forms**: `if`, `when`, `unless`, `as`, `while`, `after`,
`before`, `until`, `whenever`.

**12.2 Do not use `in order to`, `so as to`, `in the event that`, `in the case
that`, `due to the fact that`.** Use `to`, `if`, `because`.

**12.3 `before` and `after`** are the approved sequence markers. Not `prior to`,
not `subsequent to`.

**12.4 One subordinate clause per sentence** where possible.

---

## Section 13 — Pronouns

**13.1 Approved pronouns**: `it`, `they`, `you`, `we`, `this`, `that`, `these`,
`those`, `which`, `who`, `what`, `there`.

**13.2 Avoid `it`** when it would refer to a previous technical object. Repeat
the noun instead.

**13.3 `you`** refers to the reader and is correct in instructions.

**13.4 Do not use pronouns to refer to a person** unless the person is clearly
identified. `he` and `she` are restricted.

---

## Section 14 — Punctuation

**14.1 Approved marks only**: period, comma, colon, semicolon, parenthesis,
hyphen, apostrophe. Note the American spelling.

**14.2 No special characters** in procedures. Where a real command requires
`|` or `>` or `$`, keep them — accuracy outranks compliance.

**14.3 One punctuation mark per sentence position.** No doubled marks, no `?!`.

**14.4 Commas and colons** are approved for lists and for introducing a list.
Do not overuse them to lengthen a short sentence.

**14.5 Hyphens** for compound modifiers only, following the adjective order in
7.2.

---

## Section 15 — Numerical values

**15.1 Use figures**, not words, for values in instructions and descriptions.

**15.2 Use approved unit symbols** and always state the unit.

**15.3 Decimal points**: `0.10 mm`, not `.10 mm` and not `0,10 mm`. The dictionary
prescribes the American convention.

**15.4 Ranges** use `to`, not a dash or a hyphen: `from 5 to 10 mm`.

---

## The writing rules that are not about grammar

These come from the specification's general writing guidance and matter as much as
the grammar rules in practice.

- **One instruction per sentence.**
- **Maximum 20 words** in an instruction or procedure step.
- **Maximum 25 words** in a description or explanation sentence.
- **One topic per paragraph. Maximum 6 sentences per paragraph.**
- **Use a vertical list** for steps and for complex content. Two or more steps
  go in a numbered list; three or more related items go in a bulleted list.
- **Use the active voice.** Passive only in descriptions, and only when the actor
  is genuinely unknown.
- **Make instructions clear and specific.** Do not write "handle with care" —
  write what to do.
- **Start safety instructions with a command or a condition**, never with the
  reason.
- **Do not use rhetorical questions** in procedures or warnings.
- **Do not use emotional or persuasive language** in technical text. State facts.
- **Use the same approved word for the same concept** throughout a document.
  Consistency is a large part of what the standard buys.
- **Do not omit parts of a sentence** to meet the length limit. Split the sentence
  instead.