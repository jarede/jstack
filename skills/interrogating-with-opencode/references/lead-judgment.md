# Lead Judgment

Adapted from pstack `interrogate` by Lauren Tan (MIT). You are the lead: a pragmatic senior
engineer, not a neutral aggregator. **Filter, contextualize, decide.**

The reviewers saw a diff and one paragraph. They do not know what was already tried, the
constraints outside the code, which parts are temporary, or what the next change will do. You
have the conversation. Use it.

## Synthesize first

1. Parse every review file in full.
2. **Consensus**: the same issue raised independently by 2+ models is the strongest signal.
3. **Lone findings**: still read them; weight accordingly.
4. **Deduplicate**: different wording, same issue → merge, list every model that raised it.
5. **Disagreements**: one model flags X, another says X is fine → keep both as context.

## Filters

- **Nitpick gravity.** Adversarial reviewers fill the page. If a reviewer's findings are all nits,
  the code is probably fine — say so.
- **Hypothetical vs actual.** "What if None arrives here?" counts only if a caller can really pass
  None. Trace the call site; dismiss if validated upstream.
- **Premature abstraction.** Suggestions to extract or add interfaces: does this code need to vary
  in a second way? If not, dismiss.
- **"I would have done it differently."** The most common false positive. Not actionable without a
  concrete problem. Dismiss and say why.
- **Missing context.** Flags on code the change did not touch, patterns consistent with the rest
  of the codebase, advice that conflicts with known constraints. Dismiss gracefully.
- **Faithful port.** "Improvements" that would change behaviour versus the source are Noted, not
  Act on — unless the source itself has a bug, which goes to the user as a separate decision.

## When reviewers are right

Do not dismiss what is uncomfortable. Weight up a finding when several models raised it, when it
shows a concrete execution path, when it reveals a gap in your own model of the code, or when you
read it and think "...yeah, actually". Security and correctness findings get extra scrutiny even
from a single model.

## Buckets

Every finding goes in one bucket, with the models that raised it and a one-line reason:

- **Act on** — real correctness, security or maintainability problems given the actual goal; would
  block a real PR. **Five items or fewer** — more means you are not filtering hard enough.
- **Consider** — legitimate, but unclear it is worth the cost now. State the trade-off.
- **Noted** — technically valid, not actionable now.
- **Dismissed** — wrong, nitpicky or missing context. Always shown: it is how the user can overrule
  you.

## Verdict format

```
### Intenção
> <intent paragraph>

### Revisores
- <label>: <model id>, <N> achados   (one line each; name any reviewer dropped at the deadline
  or that wrote outside its review file)

### Agir
<description — models that raised it — why it matters>

### Considerar
<description — models — the trade-off>

### Anotado
<short list>

### Descartado
<finding — why dismissed>

### Mapa de concordância
<where models agreed, where they diverged, and what that pattern says>
```
