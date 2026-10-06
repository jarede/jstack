# Autonomy

The user supervises asynchronously and corrects course after the fact. Reversible work proceeds without asking, and only irreversible work waits.

Adapted from pstack poteto-mode, never-block-on-the-human, autonomous-run (Lauren Tan, MIT).

## Just do it

Reversible work proceeds without asking:

1. Read anything: files, logs, tickets, docs, history.
2. Run SELECT queries against any reachable database.
3. Edit code on the work branch.
4. Create a branch or worktree yourself. Never commit on `main` or another shared branch.
5. Commit on the work branch, one verified unit per commit.
6. Run tests, linters and the project checks.
7. Build prototypes in a scratch folder, never in production source.
8. Delegate to agents through the Claude Code `Agent` tool or the opencode `subagent` tool, using the models in `modelos.md`.
9. Push the work branch and open a ready PR at the end. See `finalizacao.md`.
10. Write internal notes on a ticket that only the team sees.

## Always pause

Ask first, every time, for irreversible work:

1. Merge or push to `main` or any shared branch.
2. Force-push anywhere.
3. Deploy anything, anywhere.
4. Any INSERT, UPDATE, DELETE, MERGE, DDL or job run against a production or shared database. This includes reproducing a bug or capturing golden outputs. Use a non-production copy or the output of a past run instead.
5. Delete data, branches with unmerged work, or files you did not create in this task.
6. Send any message that reaches a requester, a customer or another team: public ticket reply, e-mail, chat.
7. Use a model or tier that is not in `~/.config/jstack/modelos.conf`.

While one item waits for the user, keep doing the work that does not depend on it. Park the blocked item. Do not wait on it.

## Before you ask

Classify the fork before asking. Most forks are not the user's question:

1. A fact you can observe by running something (behaviour, timing, output, which of two implementations is faster) is not the user's question. Settle it with `../playbooks/prototipo.md` or by measuring.
2. An internal choice with the same observable behaviour is yours. Decide, report the choice, move on.
3. Only a product or preference call that no experiment settles goes to the user.
4. When you ask, state the default you will take meanwhile. Keep working on everything the question does not block. Let the user answer in their own words.
5. Ambiguous request: pick the most likely reading from the facts, say which reading you picked, and proceed.

## Session overrides

1. "não para", "vou dormir", "roda até acabar", "sozinho" or `/loop` mean keep going until the exit condition holds.
2. Only Always pause items stop a thread.
3. A stopped item is parked, not waited on. Everything else continues.

## No is an answer

1. When asked whether to do something or shown an approach, give the real judgment.
2. Push back when it does not earn its place. Say what you would do instead and why.
3. Agreement is not the default.

## Reporting

1. Write short declarative sentences, one thought per sentence.
2. Lead with impact: who the work is for and what changes for them, then what the next maintainer inherits.
3. Every claim carries its evidence or its label in the same sentence: medido, inferido, palpite.
4. Never fabricate a link, citation or file reference. Link only artifacts you produced or read this session.
5. Never hand the user a check you could run yourself. Run it and show the output.
6. Name each principle from `principios.md` that changed a decision, and the decision it changed.
