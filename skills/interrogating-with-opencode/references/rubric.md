# Review Rubric

Adapted from pstack `interrogate` (rubric + code-quality lens) by Lauren Tan (MIT). Use the lenses
that are relevant to the change.

## Correctness

Does the code do what the intent says?

- Edge cases: empty input, None/NULL, boundary values, Oracle `''` = NULL, DATE vs TIMESTAMP
- Errors: caught, propagated, or silently swallowed?
- Off-by-one, type coercion, encoding, rounding of money values
- Does the happy path work? Does the sad path work?
- Idempotency: what happens if this runs twice, or if a previous run crashed halfway? "It depends
  on what was left behind" means a reconciliation step is missing.
- Concurrency: if several actors touch the same rows, files or state, is access serialized
  structurally (locks, sequences, exclusive ownership) or only by convention?
- SQL: does a `select max(id)` or read-then-write race with another session?

For a possible bug, trace the execution path. Do not write "this could be None" — show the call
chain that makes it None.

## Root causes vs symptoms

Is the change fixing the real problem or hiding a symptom? Read callers, callees and types first.

- A guard clause that masks a broken invariant
- A retry that hides a broken contract
- A cast or `str()`/`int()` that silences a modelling error
- A fix in module A that belongs in module B's contract
- A comment saying "don't do X" where a check, constraint or test could make X impossible

## Structure

- Validation at the boundary (input, DB, API), then trusted inside — not scattered
- Mixed abstraction levels: orchestration and low-level detail in the same function
- New coupling that makes future changes harder
- Data structures that fit how the data is actually accessed
- Bolted on vs integrated: would the code look like this if the requirement had been known from
  the start?
- Ad-hoc `if` branches inserted into an unrelated existing flow ("spaghetti growth")
- Logic in the wrong layer, or a new helper that duplicates an existing one
- A file pushed past ~1000 lines

Do not penalise simple code for lacking abstraction. Three duplicated lines beat a premature
abstraction.

## Verification

- Are there tests? Do they test behaviour or implementation details?
- Would each test still pass if every function it imports returned None? Then it tests nothing.
- Bug fix → is there a test that fails without the fix?
- Does the code check the real thing (the actual row, the actual output) or a proxy?
- For delegated work: does it verify output artifacts, or trust self-reports?

## Complexity budget

- Code that could be simpler without losing correctness
- Abstractions with a single call site; parameters for cases that do not exist
- Dead code, unused imports, leftover compatibility paths
- Look for a restructuring that deletes complexity instead of moving it around

## Security

For each finding, trace the input to the sink and show it.

- User input reaching SQL, shell, `eval` or HTML without binding/escaping (string-built SQL
  instead of bind variables)
- Missing authentication or authorization on a new endpoint
- Secrets in code, logs or error messages
- Check-then-use races in security-relevant paths
