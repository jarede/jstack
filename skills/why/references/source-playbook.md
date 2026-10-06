# Source playbooks

Use the evidence categories and availability in the jstack skill's `references/environment.md`. Discover MCP tools at run time. In Claude Code, inspect the session tool list for `mcp__<server>__*` tools. In opencode, run `opencode2 mcp list`.

| Evidence category | Tool from the environment table | Guidance |
|---|---|---|
| Source control and MRs | `git`, `glab` | [`code-archaeology.md`](./sources/code-archaeology.md) |
| Issue tracker | GitLab issues through `glab`, when confirmed | Use the available issue tool. |
| Long-form docs | Repository docs and READMEs; wiki or docs site only when named | Use the available search or read tool. |
| Real-time chat | Tool discovered at run time | Use the available chat tool. |
| Observability and error tracking | Tool discovered at run time | Use the available observability or error tracking tool. |
| Database | MCP servers discovered at run time | Use the available database tool when relevant. |

A category with no available tool is a skipped source. Report it as skipped and state why. Do not invent a tool or search path for an environment-table TODO.

Cross-cutting guidance:

- [`incident-postmortem.md`](./sources/incident-postmortem.md). Add this when the target code looks defensive, such as null checks, retries, timeouts, rate limits, feature flags, egress guards, or OOM handlers.
