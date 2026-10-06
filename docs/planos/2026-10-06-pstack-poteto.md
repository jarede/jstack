# Plano: trazer 7 itens do pstack e adotar a autonomia e o planejamento da poteto

Goal: jstack gains the poteto principles index, her autonomy model ("never block on the human"),
her planning stance ("the best spec is code"), five new playbooks, a measurement library file and
four new skills (`como-funciona`, `por-que`, `corrigir`, `refletir`).

Architecture: jstack stays a router (`skills/jstack/SKILL.md`) over playbooks and a library. The
new canonical rules live in two library files, `biblioteca/autonomia.md` and
`biblioteca/principios.md`. Every other file links to them and does not restate them.

Source material: the pstack checkout at `.agentes/pstack/` (MIT, Lauren Tan). Read the named source
files before writing. Adapt, do not paste: Cursor mechanisms are replaced as listed in
`.agentes/ordens.md`.

Baseline failures this plan must fix: `.agentes/red.md`.

## Global constraints

1. Bodies of SKILL.md, playbooks and library files are in English, in the style of the existing
   files (short sentences, numbered steps, tables to scan). Portuguese terms of the process stay as
   they are: spike, delimitado, arquitetural, `pulado: <motivo>`, VERIFICADO, DEVOLVIDO,
   INCONCLUSIVO, BLOQUEADO, `.agentes/`, `decisoes.tsv`, `RETOMAR.md`.
2. Each new or rewritten file has, right under its title, one line of credit:
   `Adapted from pstack <names> (Lauren Tan, MIT).` Keep existing superpowers credits.
3. Never write the text `pstack:` or `superpowers:` followed by a name (the checker rejects it).
4. Every relative link and every backticked relative path must exist. `just check` must be green.
5. Do not edit the YAML frontmatter of any SKILL.md unless your task says so.
6. Only edit the files of your task. The four new skill folders and the eight new library and
   playbook files already exist as stubs; replace their `TODO` body.
7. Size limits: a playbook at most 60 lines; a library file at most 110 lines; a SKILL.md at most
   150 lines (move details to `references/`).
8. No real ticket numbers, names, secrets or customer data in examples.

## Fixed names (other tasks link to these, do not rename)

- `skills/jstack/biblioteca/autonomia.md` sections: `## Just do it`, `## Always pause`,
  `## Before you ask`, `## Session overrides`, `## Reporting`.
- `skills/jstack/biblioteca/principios.md` section: `## Index`.
- `skills/jstack/biblioteca/plano.md` section: `## Throughput checkpoint` and `## When to write a plan`.
- Playbooks: `investigacao`, `bug`, `perf`, `feature`, `portagem`, `prototipo`, `longa`,
  `retomar`, `pausar` (files `skills/jstack/playbooks/<name>.md`).
- Every playbook has the sections `## Steps`, `## Done means`, `## Pause only for`. The last one
  links `../biblioteca/autonomia.md` (section Always pause) and adds only playbook-specific items.
  It replaces the old `## Stop and ask when`.

## Task 1 (pilot): skill `corrigir`

Files: `skills/corrigir/SKILL.md` (body only).
Source: `.agentes/pstack/skills/correct/SKILL.md`, `.agentes/pstack/skills/principle-encode-lessons-in-structure/SKILL.md`.

Write the body (40 to 70 lines). Keep the structure of the source: find the mistake classes, fix
each at the highest level that works (architecture, then types, then a lint or check whose error
names the fix, then a test, docs or agent rules last), fix and prove, keep the rule table, reply.
Adaptations:
- Where to find past mistakes: `git log`, reverts, review comments (`gh` or `glab`, whichever the
  remote uses), `.agentes/decisoes.tsv` and `.agentes/revisao-*.md` from orquestra runs, interrogar
  reports, the repo's `AGENTS.md` and `CLAUDE.md`, and Claude Code memory files of type feedback
  for this project only.
- Agent instruction file = `AGENTS.md` or `CLAUDE.md` of the repo; the rule table lives there with
  columns `Regra | Garantida por`.
- Prove a new check fails on a real past mistake: run it on the past commit in a throwaway worktree
  (`git worktree add <tmp> <sha>`), show the failing output, then remove the worktree.
- One worked example only, from a Python + Oracle repo: dictionaries built from cursor rows with
  upper-case keys. Architecture fix: one helper that builds rows with lower-case keys and is the
  only way to fetch rows. Check: a script in the repo's check command that fails on `["UPPER_CASE"]`
  key access. Show it as a short table, not a story.
- Autonomy: commits on the work branch are fine (one per class). Pushing and PRs follow
  `../jstack/biblioteca/finalizacao.md`.
Verification: `just check` green; the body contains the five levels in order and the rule table.

## Task 2: library `autonomia.md` and `principios.md`

Files: `skills/jstack/biblioteca/autonomia.md`, `skills/jstack/biblioteca/principios.md`.
Sources: `.agentes/pstack/skills/poteto-mode/SKILL.md` (sections Non-negotiables second bullet,
Autonomy, Writing the reply), `.agentes/pstack/skills/principle-never-block-on-the-human/SKILL.md`,
`.agentes/pstack/skills/poteto-mode/playbooks/autonomous-run.md` step 4, `.agentes/pstack/README.md`
(principles table), and every `.agentes/pstack/skills/principle-*/SKILL.md`.

`autonomia.md` (60 to 100 lines), sections in this order:
- Intro, two sentences: the user supervises asynchronously; reversible work proceeds and the user
  course-corrects after the fact.
- `## Just do it`: reversible work proceeds without asking. List: reading anything; SELECT queries;
  editing code; creating a branch or worktree (never commit on `main` or another shared branch:
  create a work branch yourself); commits on the work branch; running tests, linters and the
  project's checks; prototypes in a scratch folder; delegating to agents with the models in
  `modelos.md`; pushing the work branch and opening a ready PR at the end (`finalizacao.md`);
  internal notes on a ticket that only the team sees.
- `## Always pause`: ask first, every time. List: merge or push to `main` or any shared branch;
  force-push; deploy; any INSERT, UPDATE, DELETE, MERGE, DDL or job run against a production or
  shared database, including to reproduce a bug or capture golden outputs (use a non-production
  copy or the output of a past run instead); deleting data, branches with unmerged work, or files
  you did not create in this task; any message that reaches a requester, a customer or another
  team (public ticket reply, e-mail, chat); a model or tier that is not in `modelos.conf`. While
  one item waits for the user, keep doing the work that does not depend on it.
- `## Before you ask`: classify the fork before asking. A fact you can observe by running
  something (behaviour, timing, output, which of two implementations is faster) is not the user's
  question: settle it with `../playbooks/prototipo.md` or by measuring. An internal choice with the
  same observable behaviour is yours: decide and report. Only a product or preference call that no
  experiment settles goes to the user. When you ask, state the default you will take, keep working
  on everything the question does not block, and let the user answer in their own words.
  Ambiguous request: pick the most likely reading from the facts, say which, and proceed.
- `## Session overrides`: "não para", "vou dormir", "roda até acabar", "sozinho", `/loop` → keep
  going until the exit condition; only Always pause items stop a thread, and they are parked, not
  waited on.
- `## No is an answer`: when asked whether to do something or shown an approach, give the real
  judgment; push back when it does not earn its place. Agreement is not the default.
- `## Reporting`: from Writing the reply. Short declarative sentences. Impact first: who the work
  is for and what changes for them, then what the next maintainer inherits. Every claim carries
  its evidence or its label in the same sentence (medido, inferido, palpite). Never fabricate a
  link, citation or file reference. Never hand the user a check you could run yourself. Name each
  principle from `principios.md` that changed a decision, and the decision it changed.

`principios.md` (70 to 110 lines):
- Intro: read the Index at the start of every `/jstack` task; cite a principle only after reading
  its row.
- `## Index`: one table with columns `Principle | Group | Rule | Applied in`. One row for each of
  the 24 principles in the README table, same names and groups. Rule: one or two sentences
  rewritten from the principle's SKILL.md. Applied in: a relative link to the jstack file where the
  principle is put to work, chosen from: `verificacao.md` (prove-it-works, explain-the-number also
  `medicao.md`), `debugging.md` (fix-root-causes, attack-the-premise), `testes.md`
  (test-behavior-not-implementation), `plano.md` (sequence-verifiable-units,
  separate-before-serializing-shared-state), `design.md` (foundational-thinking, model-the-domain,
  exhaust-the-design-space, redesign-from-first-principles, boundary-discipline,
  type-system-discipline, minimize-reader-load), `autonomia.md` (never-block-on-the-human),
  `../playbooks/portagem.md` (migrate-callers-then-delete-legacy-apis, make-operations-idempotent,
  outcome-oriented-execution, subtract-before-you-add), `../playbooks/longa.md`
  (guard-the-context-window), `../../corrigir/SKILL.md` (encode-lessons-in-structure),
  `../../orquestra/SKILL.md` (build-the-lever), `design.md` for the rest.
- `## The five that change most decisions`: laziness-protocol, subtract-before-you-add,
  build-the-lever, never-block-on-the-human, prove-it-works, each with one "in practice" sentence
  for a Python/Oracle codebase.
Verification: `just check` green; 24 rows; every section name above present.

## Task 3: library `medicao.md` and playbook `perf`

Files: `skills/jstack/biblioteca/medicao.md`, `skills/jstack/playbooks/perf.md`.
Sources: `.agentes/pstack/skills/benchmark-checklist/SKILL.md`,
`.agentes/pstack/skills/principle-explain-the-number/SKILL.md`,
`.agentes/pstack/skills/poteto-mode/playbooks/perf-issue.md`,
`.agentes/pstack/skills/poteto-mode/playbooks/hillclimb.md`.

`medicao.md` (50 to 90 lines): the checklist before trusting, reporting or acting on a number
(limiter, tuning, limits, errors, repeatability as median of N, end-to-end relevance, did the work
happen: print a count of work done and an error count). Add an Oracle column of examples: warm vs
cold buffer cache, a cached plan, rows actually processed, `EXPLAIN PLAN` or the real plan,
elapsed time from the job log vs wall clock. End with how to report: one primary number with unit,
`antes → depois`, and the artifact path.

`perf.md` (40 to 60 lines). Use for: a measured slowness or a regression in time or resources.
Steps:
1. Build the measurement harness first (a script that runs the slow path on realistic data and
   prints the metric, rows processed and errors) and record the baseline. Vet it with
   `../biblioteca/medicao.md`. Running anything that writes to a production or shared database is
   an Always pause item.
2. Understand the path with skill `como-funciona`; for "it used to be fast", seed hypotheses with
   `git log` over the path and skill `por-que`.
3. Try the performance mantras in order, cheapest first (copy the seven from perf-issue.md); stop
   at the first that meets the target.
4. One change, one measurement, keep or revert; one row per attempt in `.agentes/decisoes.tsv`
   (`hora	hipotese	mudanca	antes	depois	delta	testes	veredito`). Never stack untested
   changes. Correctness gates (tests, golden outputs) stay green.
5. Plateau is not a stop: pivot category before concluding. For a long target-driven loop, wrap
   this playbook in `longa`.
6. Finish with `../biblioteca/finalizacao.md`, citing the number.
Done means: baseline and final numbers from the same harness, the delta, the artifact path,
correctness checks green. Pause only for: the autonomia Always pause list; a target that only the
user can set when none was given (propose one from the baseline and proceed with it).
Verification: `just check` green; seven mantras present.

## Task 4: playbooks `investigacao` and `prototipo`

Files: `skills/jstack/playbooks/investigacao.md`, `skills/jstack/playbooks/prototipo.md`.
Sources: `.agentes/pstack/skills/poteto-mode/playbooks/investigation.md`,
`.agentes/pstack/skills/poteto-mode/playbooks/prototype.md`,
`.agentes/pstack/skills/principle-exhaust-the-design-space/SKILL.md`.

`investigacao.md` (25 to 45 lines). Use for: read-only questions (como funciona X, por que Y é
assim, quem decidiu, "tem certeza?", X ou Y?). Size is always spike. No waiting for a nod: reading,
`git log` and SELECTs are Just do it items. Steps: 1. route "how" questions to skill
`como-funciona` (`../../como-funciona/SKILL.md`); route "why / who decided / since when" to skill
`por-que`: it is on-demand, so read `../../por-que/SKILL.md` and follow it. Both for mixed
questions. 2. Throughput checkpoint is one line: `n/a: investigação só de leitura`. 3. Output the
como-funciona shape, or a recommendation with a trade-off table for "X or Y". Facts and hypotheses
separated, each with its evidence pointer. 4. "Tem certeza?" gets a real judgment with reasons.
No code change: if the user also asked for a change, continue under `bug`, `perf` or `feature`.
Done means: every claim has an evidence pointer or a label (medido, inferido, palpite).

`prototipo.md` (30 to 50 lines). Use for: settling a design or behavioural fork cheaply by
observing it instead of asking (cursor vs BULK COLLECT, which layout, which query shape), or when
`autonomia.md` Before you ask sends a question here. Adapt the six steps of prototype.md. Scratch
folder: `.agentes/prototipo-<tema>/`, never production source. Smallest script, query or page.
Variants behind one switch (a CLI flag or an env var), each labelled. Observe: timing, output,
row counts, a screenshot for UI. Correctness for a port: run each variant through the golden check
when one exists. Present variants, evidence, trade-offs, recommendation; say plainly it is
throwaway; then continue the parent playbook with the chosen direction (no waiting).
Verification: `just check` green.

## Task 5: playbooks `retomar` and `pausar`

Files: `skills/jstack/playbooks/retomar.md`, `skills/jstack/playbooks/pausar.md`.
Sources: `.agentes/pstack/skills/poteto-mode/playbooks/session-pickup.md`,
`.agentes/pstack/skills/poteto-mode/playbooks/pause-safely.md`.

`retomar.md` (25 to 45 lines). Use for: "retoma", "continua de onde parou", taking over another
agent's work. Steps adapted from session-pickup:
1. Find the trail, in this order: `.agentes/RETOMAR.md`, `.agentes/decisoes.tsv`,
   `.agentes/RELATORIO-FINAL.md`, `.agentes/jstack-<tema>.md`, `.agentes/contrato.md`, plan files in
   `docs/planos/`, the branch (`git log <base>..HEAD`, `git diff <base>`, `git status`), and the
   previous session transcript of this same project only (Claude Code:
   `~/.claude/projects/<cwd with / replaced by ->/*.jsonl`, newest first; opencode: its session for
   this directory). Never read transcripts of other projects.
2. Rebuild operational state: branch, worktree, what landed, open task list, decisions. The trail
   is authoritative: do not re-derive it and do not redo the design.
3. Diff done vs pending; name the resume point.
4. Recreate the task list from the original playbook's steps, marking done steps with their
   evidence, and continue under that playbook.
5. Verify inherited claims on the real artifact (`../biblioteca/verificacao.md`): a previous
   "passing" report is not proof.
Done means: the reply says where the previous agent stopped, what was inherited vs redone, the
resume point.

`pausar.md` (20 to 35 lines). Use for: "para agora", "vou desligar", context near its limit, or
`longa` stopping. Steps: 1. stop at a safe boundary; start nothing new; stop agents you launched
for this task (kill their `opencode2 run` processes, close tabs or panes you opened). 2. no push
and no PR only to pause (unless the branch was already pushed: then push the wip). 3. commit
everything as one `wip: <estado>` commit on the work branch; if the tree is broken, say so in the
commit body. 4. write `.agentes/RETOMAR.md` with: intenção, o que estava fazendo, progresso e o que
está verificado, estado atual, próximos passos, arquivos-chave, armadilhas; point to
`decisoes.tsv` instead of copying it. Reply: where you stopped, what is on disk vs only in your
head, the commit, the first action on resume (`/jstack retoma`).
Verification: `just check` green.

## Task 6: library `design.md`, `plano.md`, `finalizacao.md`

Files: those three in `skills/jstack/biblioteca/`.
Sources: `.agentes/pstack/skills/architect/SKILL.md` and its `references/design-red-flags.md`,
`.agentes/pstack/skills/poteto-mode/playbooks/feature.md`,
`.agentes/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md` (steps 1 and 2 only),
`.agentes/pstack/skills/poteto-mode/playbooks/opening-a-pr.md`, `.agentes/pstack/README.md`
section "why are there no planning skills?".

`design.md`. Design is no longer an approval gate.
- Goal line becomes: the right shape named before logic is written; the user course-corrects
  after seeing it.
- Size: keep the three sizes and the "size only goes up" rule. spike: answer, no nod needed.
  delimitado: name the data shape and the files, write the short design in the reply, then build
  without waiting. arquitetural: the Architect sketch below, then build or plan per `plano.md`
  (When to write a plan).
- Understand: keep "read first". Replace the question rules with a link to `autonomia.md`
  (Before you ask).
- Options: keep 2 to 3 approaches and the recommendation; choose it and proceed; show the
  alternatives as a table in the reply.
- New `## Architect sketch` (from architect/SKILL.md): name the data shape first and its
  organizing structure (a state machine over scattered booleans, a table over branching, a typed
  model over repeated shape assumptions); write the caller's usage first; then types and
  signatures; then module layout. When the change crosses a function boundary and more than one
  shape is plausible, run 2 to 3 sketches in parallel fresh subagents and pick with reasons.
  Stay in the loop while implementation fills it in.
- Replace the prototype section with one line pointing to `../playbooks/prototipo.md`.
- Replace `## Present and approve` with `## Present`: what to show (shape, alternatives table,
  files, verification) and that work continues; a spec file `docs/specs/AAAA-MM-DD-<tema>.md` is
  written only when the work goes to orquestra or longa, or the user asks.
- Keep `## Design red flags`.
- `## Never`: keep the rule about adversarial review of a plan with no code; add "write logic
  before naming the data shape"; remove the approval rules.

`plano.md`.
- New first section `## When to write a plan`: only when the work spans phases or several PRs,
  when it will run under orquestra or longa (they need a written plan), or when the user asks. One
  or two files with an obvious approach: no plan; say so. The best spec is code. Settle open
  questions with a prototype before writing the plan.
- New section `## Throughput checkpoint` (move the four items here, unchanged in meaning): it
  applies to every non-trivial multi-step task, plan or no plan, written as four todo items, each
  answered or `n/a: <motivo>`.
- Keep file map, header, tasks, review focus, self-review.
- Workspace: never commit on `main` or a shared branch; create the work branch or worktree
  yourself (no consent needed).
- Hand-off: you pick the execution mode (inline, orquestra, arena) with the reason from the plan,
  state it, and start. The user can redirect.

`finalizacao.md`.
- Title rule becomes: every playbook ends by delivering a reviewable branch; merging into a
  shared branch waits for the user (`autonomia.md`, Always pause).
- Verify: unchanged (red branch is not finished).
- Commits: rebase into small ordered commits; titles in Conventional Commits
  `type(scope): assunto` (feat, fix, docs, refactor, test, chore, perf), imperative, no final
  period.
- Deliver (default, no question): push the work branch and open a ready PR or MR (`gh` or `glab`,
  whichever the remote uses; never a draft); post the URL. No remote: keep the branch and say so.
  Opening a PR does not start any babysitting.
- Only on the user's request: merge, landing, discarding work (discard needs an explicit
  confirmation typed by the user).
- PR body: sections `## Por quê`, `## O que mudou`, `## Escopo` (what it covers and what it
  leaves out), `## Trade-offs` (only rejected alternatives a reviewer would ask about),
  `## Raio de impacto`, `## Verificação` (1 to 3 bullets, each a real command and its result; perf
  as one number `antes → depois`). Under a minute to read; no SHAs, no file-by-file lists.
- Clean up: close tabs, panes and scratch you opened; remove a worktree only after its branch is
  pushed; keep `.agentes/` reports.
Verification: `just check` green; no sentence in design.md asks to wait for approval.

## Task 7: playbooks `feature`, `bug`, `portagem`, `longa`

Files: those four in `skills/jstack/playbooks/`.
Sources: `.agentes/pstack/skills/poteto-mode/playbooks/feature.md`, `bug-fix.md`,
`refactoring.md`, `autonomous-run.md`.

Common: rename `## Stop and ask when` to `## Pause only for`, link `../biblioteca/autonomia.md`
(Always pause) and keep only playbook-specific items, each with the default you proceed on.

`feature.md`: steps 1. skill `como-funciona` over the affected code (`pulado:` allowed for a
one-file change); 2. design for the size (`../biblioteca/design.md`): data shape named, Architect
sketch when crossing a function boundary; no waiting; 3. throughput checkpoint
(`../biblioteca/plano.md`) as four todo items; 4. execute: inline, or skill `orquestra` for many
tasks (needs a plan, `plano.md` When to write a plan), or skill `arena` when the implementation
admits several valid shapes; 5. tests (`testes.md`) and verification on the real surface
(`verificacao.md`); 6. small ordered commits, each verified before the next; 7. review: skill
`interrogar` when the design is contested or the size is arquitetural, otherwise a fresh subagent
against the design; findings via `revisao-recebida.md`; 8. finish (`finalizacao.md`).

`bug.md`: remove the read-only investigation branch (it is now `investigacao`). Slowness goes to
`perf`. Steps: 1. reproduce it yourself on the real surface or the closest you can reach;
synthesize the trigger or instrument until it fires; ask the user only with a specific reason,
after driving it as far as it goes; reproduction that would write to a production or shared
database is an Always pause item. No reproduction → INCONCLUSIVO. 2. binary-search the cause:
candidate hypotheses, seeded by skill `como-funciona` and, for regressions, skill `por-que`
(read its SKILL.md, it is on-demand); runtime evidence eliminates them (`debugging.md`).
3. fix at the cause; Architect sketch if it crosses a function boundary; a belt-and-suspenders
change does not ship; revert what refuted hypotheses motivated. 4. verify on the same surface.
5. commits: the failing reproduction or test lands before the fix (`testes.md`). 6. finish.
Pause only for: the root cause is a product decision (present it with a recommendation and keep
the reproduction).

`portagem.md`: keep golden outputs and parity. Step 1 becomes: read the source in full and state
the scope as decisions in the reply (what is ported, what stays, callers, coexistence), with
defaults: side by side, no switch-over, fidelity including the source's bugs. Only the switch-over
and changing behaviour others depend on are the user's calls; proceed with the defaults meanwhile.
Arquitetural: Architect sketch, and a plan file when it runs under orquestra. Add a refactor note
(from refactoring.md): pin behaviour first (golden or characterization test), subtract before you
add, migrate callers and delete the old API in the same wave when old and new do not need to
coexist, and revert a diff that does not lower reader load. Keep "run migrations twice"
(make-operations-idempotent).

`longa.md` (from autonomous-run): remove the question about supervised runs. Steps 1. state the
exit condition as a checkable predicate and write the contract to `.agentes/contrato.md`; show it
in the first message and start (no approval). 2. fresh worktree (`plano.md` Workspace). 3. pick
the wake mechanism: Claude Code background waits or `/loop`; opencode a background shell writing
to a file. 4. each iteration makes the smallest change the evidence justifies, verifies it against
the predicate, commits if it advanced, discards it otherwise; one row in `decisoes.tsv` per
iteration. 5. mid-run discoveries are yours (broken skill, flaky check, related bug: fix in its own
commit); do not park reversible work; surface only Always pause items, product calls, or a real
dead end. 6. a plateau is not a stop: pivot; never relax the predicate. 7. stopping early or near
the context limit: `pausar.md`. 8. end: the `longa auditor` writes `## Atenção` in
`.agentes/RELATORIO-FINAL.md`; finish with `finalizacao.md` (branch pushed and PR opened; no merge).
Keep the contract template, with "Permissões" defaulting to `autonomia.md`.
Verification: `just check` green; no `## Stop and ask when` left in any playbook.

## Task 8: router `jstack/SKILL.md`, `ferramentas.md`, opencode command

Files: `skills/jstack/SKILL.md` (body and description), `skills/jstack/biblioteca/ferramentas.md`,
`commands/opencode/jstack.md` (description line only).
Source: `.agentes/pstack/skills/poteto-mode/SKILL.md` (Playbooks section).

`SKILL.md`:
- Set the frontmatter `description` to exactly: `Use when the user invokes /jstack (or @jstack) to
  run a task through jstack's engineering process - investigating how or why something works,
  fixing a bug, improving performance, building a feature, porting or refactoring code,
  prototyping a decision, a long unattended run, or resuming or pausing work.`
- Credit line: superpowers and pstack, as today.
- `## 1. Classify`: table with the nine playbooks and a pt example each: investigacao, bug, perf,
  feature, portagem (ports, migrations and refactors), prototipo, longa (wraps another), retomar,
  pausar. Ambiguous: pick the most likely reading from the facts, say which in the announcement,
  proceed (link `biblioteca/autonomia.md`, Before you ask); no question. "era 10 min, agora 40" is
  a perf regression. Fits none (a factual question, a chat): no playbook, answer directly.
- `## 2. Size`: unchanged rule; sizes from `biblioteca/design.md`.
- `## 3. Read the two rules files`: read `biblioteca/principios.md` (Index) and
  `biblioteca/autonomia.md` at the start of every task.
- `## 4. Copy the steps` and `## 5. Run`: as today, but stopping happens only per `autonomia.md`.
- `## Standing rules`: 1 evidence before claims (`verificacao.md`); 2 never block on the human
  (`autonomia.md`): proceed, present, let the user course-correct; pause only for the Always pause
  list; 3 models are the user's decision (`modelos.md`); 4 name the principles that changed a
  decision (`principios.md`); 5 report per `autonomia.md` (Reporting). Remove "approval is per
  stage" and "one question per message".
- `## Map`: add principios.md, autonomia.md, medicao.md. Execution skills: orquestra, arena,
  interrogar, orchestrating-herdr-agents, como-funciona, por-que (on-demand: read its SKILL.md),
  corrigir and refletir (on-demand, user-invoked).

`ferramentas.md`:
- Change "A question to the user ends your turn. Do not continue with a guessed answer." to: ask
  only per `autonomia.md`; a question states the default you will take; keep doing the work the
  question does not block.
- Add rows: "Wait in the background or keep going" (Claude Code `run_in_background` or `/loop`;
  opencode a background shell writing to a file); "Read a previous session" (Claude Code
  `~/.claude/projects/<cwd with / replaced by ->/*.jsonl`; opencode `~/.local/share/opencode/opencode.db`);
  extend the on-demand row with `/por-que`, `/corrigir`, `/refletir`.

`commands/opencode/jstack.md`: description becomes
`Run a task through the jstack process (investigacao, bug, perf, feature, portagem, prototipo, longa, retomar, pausar)`.
Verification: `just check` and `just test` green.

## Task 9: skill `como-funciona`

Files: `skills/como-funciona/SKILL.md` (body only), `skills/como-funciona/references/explorer-prompt.md`,
`skills/como-funciona/references/explainer-prompt.md`.
Sources: `.agentes/pstack/skills/how/SKILL.md` and its two references.

Adapt the flow of how/SKILL.md. Subagents: Claude Code `Agent` (type Explore for read-only
exploration), opencode `subagent`; they run on the session model (no role in `modelos.conf`).
Explorers may read the Oracle dictionary with SELECT only (`ALL_SOURCE`, `ALL_DEPENDENCIES`,
`ALL_TAB_COLUMNS`) when a database tool is available. Output in the user's language with the
sections Overview, Key Concepts, How It Works, Where Things Live, Gotchas, every claim with
`arquivo:linha` or the query used. For "why" questions point to skill `por-que`.
Verification: `just check` green; both references linked from SKILL.md.

## Task 10: skill `por-que`

Files: `skills/por-que/SKILL.md` (body only), `skills/por-que/references/epistemics.md`,
`investigator-prompt.md`, `synthesizer-prompt.md`, `source-playbook.md`,
`references/sources/codigo.md`, `references/sources/desk.md`, `references/sources/oracle.md`,
`references/sources/docs.md`.
Sources: `.agentes/pstack/skills/why/` (SKILL.md, references, `references/sources/code-archaeology.md`
and `incident-postmortem.md`).

Adapt why/SKILL.md. Drop Slack, Datadog, Sentry, Databricks, Linear and Notion. Evidence
categories: source control (`codigo.md`: git blame, `git log --follow -p`, `git log -S`, PR or MR
bodies via `gh` or `glab`); issue tracker (`desk.md`: the Desk helpdesk through its MCP tools
when available, read-only, search by procedure, table or screen name, read comments; never write
to a ticket; cite ticket numbers only, no personal data; GitHub or GitLab issues when the repo uses
them); database (`oracle.md`: SELECT only on `ALL_OBJECTS` created and last_ddl_time,
`ALL_SOURCE`, `ALL_TAB_COMMENTS`, `ALL_COL_COMMENTS`, `ALL_DEPENDENCIES`, header comments with
dates or ticket references); documents (`docs.md`: `docs/specs`, `docs/planos`, README,
`AGENTS.md`, `CLAUDE.md`, `.agentes/decisoes.tsv` and reports). Discover at run time which tools
exist and skip a category with no tool, saying so. Investigators run as parallel fresh subagents
(Claude Code `Agent`, opencode `subagent`) on the session model. Keep the epistemics: confidence
levels and phrasing; facts vs inferences.
Verification: `just check` green; every reference file linked from SKILL.md or source-playbook.md.

## Task 11: skill `refletir`

Files: `skills/refletir/SKILL.md` (body only), `skills/refletir/references/judgment-reviewer.md`,
`tooling-reviewer.md`, `divergent-reviewer.md`, `synthesizer.md`.
Sources: `.agentes/pstack/skills/reflect/` (SKILL.md and references).

Adapt reflect/SKILL.md:
- Locate the transcript: Claude Code `~/.claude/projects/<cwd with / and . replaced by ->/`,
  files `<session-id>.jsonl` and subagents under `<session-id>/subagents/`; take the newest whose
  first user message matches this conversation's opening request. opencode: this directory's
  session in `~/.local/share/opencode/opencode.db`. Never read another project's folder. No match:
  write a tight digest of the session and pass that.
- Three reviewers in parallel as fresh subagents (Claude Code `Agent`, opencode `subagent`) on the
  session model; then one synthesizer; then the structural check (anything a lint, script or check
  would enforce better moves to Backlog and is pointed to skill `corrigir`).
- Apply: present Accepted, Rejected, Backlog, then apply the Accepted edits without waiting
  (they are reversible commits on a work branch of the skills repo). Find the repo with
  `cd ~/.claude/skills/jstack && pwd -P` and go two levels up. Edits follow
  `../jstack/biblioteca/skills.md`: a substantive edit or a new skill needs its RED and GREEN runs;
  a one-line fix does not. Finish with `../jstack/biblioteca/finalizacao.md`.
- Backlog: write it to `.agentes/refletir-backlog.md` of the skills repo.
- Summary for the user as in the source step 6.
Verification: `just check` green; four references linked.

## Task 12: wiring (runs last, alone)

Files: `README.md`, `NOTICE.md`, `AGENTS.md`, `CLAUDE.md`, `skills/orquestra/SKILL.md` (the
prerequisite paragraph only).
- README: playbook table with the nine playbooks; skill table with the four new skills and their
  target; the "Usando o processo" paragraph says the process proceeds without asking and pauses
  only for irreversible actions, and that plans are written only for multi-phase or delegated
  work.
- NOTICE.md: add rows to the pstack table for every new or changed file and its pstack origin
  (Tasks 1 to 11).
- AGENTS.md and CLAUDE.md rule 5: the on-demand process skills are `jstack`, `jstack-setup`,
  `por-que`, `corrigir`, `refletir`. Both files must stay identical in that rule.
- orquestra prerequisite: a written plan comes from `/jstack` per `plano.md` (When to write a
  plan): work delegated to orquestra always gets one.
Verification: `just check` and `just test` green.
