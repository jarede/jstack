# Incident & Postmortem Context

Not a separate source, a **cross-cutting angle**. Incidents often motivate defensive code ("we added this check after the X outage"), so if the target looks defensive (null checks, retry logic, timeout handling, rate limiting, feature flags), search the available evidence categories in the jstack skill's `references/environment.md`:

- **Source control and MRs**: use `git` and `glab` to find commits, issues, MRs, discussions, and pipelines tied to an incident or defensive change. Commits with messages like "fix for incident", "add defensive check", or "revert" followed by "re-apply with..." are strong signals.
- **Issue tracker**: search incident and reliability issues when the environment table confirms an available tool.
- **Long-form docs**: search repository docs, READMEs, and the named wiki or docs site when available.
- **Real-time chat**: search incident discussion when an available tool exists.
- **Observability and error tracking**: search incidents, logs, traces, and errors when an available tool exists.
- **Database**: use an available database MCP only when stored data could explain the behavior.

If you find an incident link, read the full postmortem. Postmortems typically have an "Action Items" section that ties directly to code changes. When multiple available sources corroborate an incident and link it to the target MR, the evidence is stronger. Keep unavailable categories listed as skipped sources in the final report.

Worth spending time on when the code's defensive character makes an incident-driven origin plausible. Skip it for code that doesn't look defensive.
