# Principios

Adapted from pstack poteto-mode principles index (Lauren Tan, MIT).

Read the Index at the start of every `/jstack` task.
Cite a principle only after reading its row.

How to use the Index:

1. Scan the Principle column and pick the rows that match the decision in front of you.
2. Read the full row: the Group names the kind of decision, the Rule names the move.
3. Follow Applied in to the file where the principle is put to work, and follow that file's steps.
4. Name the principle in your reply only when it changed a decision, with the decision it changed.

## Index

One row per principle. Groups match the source table: 10 core, 6 architecture, 5 verification, 2 delegation, 1 meta.

| Principle | Group | Rule | Applied in |
|---|---|---|---|
| laziness-protocol | core | Delete first. Make the smallest change that solves the problem. | [design.md](design.md) |
| foundational-thinking | core | Name core types and data shapes before writing logic. Lay scaffold before features. | [design.md](design.md) |
| redesign-from-first-principles | core | Rebuild the design as if the new requirement had been there from day one. Do not bolt it on. | [design.md](design.md) |
| attack-the-premise | core | Two fixes that share one premise failed the same gate: suspect the premise. Write it down and count the imbalance per actor before the next fix. | [debugging.md](debugging.md) |
| subtract-before-you-add | core | Remove dead code and redundant guards first. Build on the simpler base. | [portagem.md](../playbooks/portagem.md) |
| minimize-reader-load | core | Count layers and hidden state a reader must hold. Collapse wrappers with one caller and shrink mutable scope. | [design.md](design.md) |
| outcome-oriented-execution | core | Converge on the target architecture at explicit phase boundaries. Do not keep throwaway compatibility code. | [portagem.md](../playbooks/portagem.md) |
| experience-first | core | Choose user delight over implementation convenience. Ship fewer polished features over more rough ones. | [design.md](design.md) |
| exhaust-the-design-space | core | Build 2 to 3 competing sketches and compare them before committing. | [design.md](design.md) |
| build-the-lever | core | Build the script or check that does the work instead of working by hand. The tool is the artifact a reviewer reruns. | [SKILL.md](../../orquestra/SKILL.md) |
| model-the-domain | architecture | Encode the domain in a structure, not scattered conditionals. A state machine beats scattered flags. | [design.md](design.md) |
| boundary-discipline | architecture | Validate at system boundaries and trust internal types. Keep business logic in pure functions. | [design.md](design.md) |
| type-system-discipline | architecture | Make illegal states unrepresentable and brand semantic primitives. Parse external data at boundaries. | [design.md](design.md) |
| make-operations-idempotent | architecture | Converge to the same end state on rerun. Ask what a second run and a crash halfway would do. | [portagem.md](../playbooks/portagem.md) |
| migrate-callers-then-delete-legacy-apis | architecture | Migrate callers and delete the old API in the same wave. Do not keep compatibility layers. | [portagem.md](../playbooks/portagem.md) |
| separate-before-serializing-shared-state | architecture | Give each actor its own owned target first. Serialize structurally only when one shared writer is a real invariant. | [plano.md](plano.md) |
| prove-it-works | verification | Verify against the real artifact before declaring done. Script the check when you can. | [verificacao.md](verificacao.md) |
| fix-root-causes | verification | Reproduce first and ask why until you reach the root cause. Fix it there, not the symptom. | [debugging.md](debugging.md) |
| sequence-verifiable-units | verification | Break multi-step work into small units that each end in a check. Verify each before the next. | [plano.md](plano.md) |
| test-behavior-not-implementation | verification | Call the code the way its users do and assert the literal result. Delete a test that cannot fail on a defect. | [testes.md](testes.md) |
| explain-the-number | verification | Name the limiter and rule out what else the number could measure. Keep run count and spread with the number. | [verificacao.md](verificacao.md), [medicao.md](medicao.md) |
| guard-the-context-window | delegation | Route bulk reads and outputs to subagents. Keep summaries in the main thread. | [longa.md](../playbooks/longa.md) |
| never-block-on-the-human | delegation | Proceed on reversible work and present the result. Reserve questions for irreversible actions. | [autonomia.md](autonomia.md) |
| encode-lessons-in-structure | meta | Encode a recurring correction as a check or helper, not more text. Fix the structure, not the instance. | [SKILL.md](../../corrigir/SKILL.md) |

Applied in points at the jstack file where the principle is put to work.
The primary file is listed; explain-the-number also informs medicao.md.

## The five that change most decisions

These five change the most decisions. Read their rows first when time is short:

1. **laziness-protocol.** Delete before you add, and keep the diff minimal.
   It changes sizing decisions: a refactor starts with removals, not new layers.
   In practice in a Python/Oracle repo: remove the dead branch and the unused helper before writing the new query path.
   Cite it when you cut scope the request seemed to ask for.
2. **subtract-before-you-add.** Cut dead weight first, then build on the simpler base.
   It changes sequencing decisions: removal lands before construction, never after.
   In practice in a Python/Oracle repo: drop the redundant validator and the stub reference before adding the new fetch helper.
   Cite it when the base gets simpler before it gets bigger.
3. **build-the-lever.** Build the script that does or proves the work; the tool is the artifact a reviewer reruns.
   It changes execution decisions: one rerunnable script beats hand edits spread over files.
   In practice in a Python/Oracle repo: write the codemod that migrates every cursor call site instead of editing them by hand.
   Cite it when the diff contains a script the reviewer can run.
4. **never-block-on-the-human.** Proceed on reversible work, present the result, and let the user course-correct.
   It changes pacing decisions: observable questions get settled by running, not by asking.
   In practice in a Python/Oracle repo: run the SELECT variants yourself and report timings instead of asking which query to try.
   Cite it when you acted without asking and show the result.
5. **prove-it-works.** Verify against the real artifact, not a proxy or a self-report.
   It changes done decisions: nothing is done until the real surface was checked.
   In practice in a Python/Oracle repo: run the job against the staging copy and show row counts before declaring the migration done.
   Cite it when a check, not a claim, closes the task.
