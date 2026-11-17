---
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
disable-model-invocation: true
---

# Why

Answer from the record, not the code: read the commits and MR discussions that introduced the target and each later change, and other sources if the trail is thin. Cite what the authors wrote, mark your own inferences as inferences, and say what the record does not answer. Read MRs with `glab mr view <iid> --comments` (`gh` only for a `github.com` remote). For other sources, use the tools in the jstack skill's `references/environment.md` (**Evidence sources for why, recall, and reflect**).
