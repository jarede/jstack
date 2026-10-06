# Receiving review

**Check each point against the code before agreeing. Technical correctness over politeness.**

Adapted from superpowers `receiving-code-review` (Jesse Vincent, MIT) and pstack `lead-judgment`
(Lauren Tan, MIT).

## For each point

1. Restate what the reviewer is asking for, in technical terms.
2. Check it against the code: does the problem exist? Can the bad input really arrive? Trace the
   caller.
3. Decide: **fix**, **push back** with evidence, or **ask** when the point is unclear.
4. Fix one point at a time and verify each (`verificacao.md`).

## Filters

- **Hypothetical vs actual** — "what if X is null?" matters only if a caller can pass null.
- **"I would do it differently"** — not a defect unless it names a concrete problem.
- **Missing context** — a point about code the change did not touch, or a pattern the rest of the
  codebase uses on purpose.
- **YAGNI** — a "professional" feature no one uses is not added because a reviewer asked.

Security and correctness points get extra care even when only one reviewer raised them.

## Never

- "Você está certo!" / "Ótimo ponto!" before checking. Agreement without verification is
  performative.
- Implement a suggestion you have not understood.
- Apply every point silently: the user sees what was fixed, what was declined, and why.
