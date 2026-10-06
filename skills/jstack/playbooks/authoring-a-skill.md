### Authoring or modifying a skill

**You own the skill's voice.**

1. Test the skill with a fresh subagent before editing. Then author it inline at `skills/<id>/SKILL.md` in this repository, or `.claude/skills/<id>/SKILL.md` for a project skill. Set frontmatter `name` to the folder id in lowercase kebab-case, at most 64 characters. Write a `description` that says when to use the skill, at most 1024 characters. Set `disable-model-invocation: true` only when the skill is routed only through `/jstack` or typed by the operator. The **skill-creator** skill is an option when the session has it.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve. Test the edited skill with a fresh subagent.
3. Run `python3 scripts/check.py`. For a new skill, also run `scripts/install.sh`.
4. Run **Opening an MR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
