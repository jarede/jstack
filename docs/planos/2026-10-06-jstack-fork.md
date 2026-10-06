# jstack fork (superpowers + pstack) — Implementation Plan

> **For agentic workers:** execute task by task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Read the spec first. Every task ends with `just check` green and a commit.

**Goal:** Turn jstack into a self-contained, on-demand engineering process (`/jstack`) that merges the
best of superpowers and pstack and works the same in Claude Code and opencode.

**Architecture:** One on-demand router skill (`skills/jstack/`) with four playbooks and a shared
library as plain files (loaded only when the router says so), one on-demand setup skill
(`skills/jstack-setup/`) that writes `~/.config/jstack/modelos.conf`, renamed execution skills
(`orquestra`, `arena`, `interrogar`) that read that config, and opencode commands that make
`/jstack` and `/jstack-setup` available there. Repo tooling (check/install/uninstall/status) learns
about commands, on-demand skills and renamed skills.

**Tech Stack:** Markdown skills (Agent Skills format), bash 3.2 (macOS), Python 3 stdlib (`unittest`),
`just`, GitHub Actions.

**Spec:** `docs/specs/2026-10-06-jstack-fork-design.md`

## Global Constraints

- Skill folder name == frontmatter `name`, only `[a-z0-9-]`; `description` 1–1024 chars, third
  person, starts with "Use when", says **when**, never the workflow.
- `jstack` and `jstack-setup` have `disable-model-invocation: true`. No other skill gets it.
- Skill bodies are written in **English** (like the existing skills). File and folder names,
  status words (VERIFICADO, DEVOLVIDO, INCONCLUSIVO, BLOQUEADO) and user-facing report headings are
  Portuguese. Output to the user is in the user's language.
- One target per skill in `skills.txt`. New skills: `jstack claude sob-demanda`,
  `jstack-setup claude sob-demanda`.
- Nothing in the repo may depend on superpowers or pstack being installed. Paths to their source
  appear only in this plan and in `NOTICE.md`.
- Adapted text keeps attribution: superpowers (Jesse Vincent, MIT), pstack (Lauren Tan, MIT).
- Never commit `~/.config/jstack/modelos.conf`; it is per machine.
- Scripts stay bash 3.2 compatible: no associative arrays, no `mapfile`, no `${var,,}`.
- Size budget: router `SKILL.md` ≤ 1200 words; each playbook ≤ 600 words; each library file
  ≤ 1200 words. Detail beyond that goes in a second file, not a longer one.

## Review Focus

1. **opencode cannot load an on-demand skill through its `skill` tool.** `disable-model-invocation`
   blocks the model, so `commands/opencode/jstack.md` must tell the model to **read the file**
   `~/.claude/skills/jstack/SKILL.md`, not "load the skill". Covered by the opencode test in Task 11.
2. **An old link (`orchestrating-engineer-reviewer-implementer`, `running-an-arena-with-opencode`,
   `interrogating-with-opencode`) left in `~/.claude/skills` after the rename** would make both names
   visible and point at a folder that no longer exists. A dangling link must be removed too. Test in
   Task 1.
3. **`modelos.conf` missing, or naming a model that no longer exists in `opencode2 models`.** The skills
   must ask and suggest `/jstack-setup`, never dispatch blindly or silently pick another model. Covered
   by the scenario test in Task 9.
4. **A request that fits no playbook, or fits two.** The router must answer without process, or ask
   exactly one question. Covered by the routing test in Task 11.
5. **Running `just install` twice, or on a machine that still has real folders with the old names.**
   It must be idempotent and back folders up, never delete them. Test in Task 1.

## Sources (read-only, for adaptation)

```bash
SP=~/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/skills
git clone -q --depth 1 --filter=blob:none --sparse https://github.com/cursor/plugins /tmp/pstack-src \
  && git -C /tmp/pstack-src sparse-checkout set pstack
PS=/tmp/pstack-src/pstack
```

If `$SP` is missing (plugin already uninstalled), clone `https://github.com/obra/superpowers` to
`/tmp/superpowers-src` and use its `skills/`.

## File Map

```
skills.txt                                  # + jstack, jstack-setup (sob-demanda); renamed entries
renomeadas.txt                              # NEW: "<old> <new>" — install removes old links
commands/opencode/jstack.md                 # NEW
commands/opencode/jstack-setup.md           # NEW
scripts/lib.sh                              # + COMMANDS_DIR, renamed_entries, is_our_link for dangling
scripts/install.sh                          # + commands, + remove renamed links
scripts/uninstall.sh                        # + commands dir
scripts/status.sh                           # + commands section
scripts/check.py                            # + sob-demanda flag, commands frontmatter, JSTACK_ROOT env
tests/test_check.py                         # NEW (unittest)
tests/test_install.sh                       # NEW (temp HOME)
justfile                                    # + test recipe
.github/workflows/check.yml                 # run tests
skills/orquestra/                           # RENAMED from orchestrating-engineer-reviewer-implementer
skills/arena/                               # RENAMED from running-an-arena-with-opencode
skills/interrogar/                          # RENAMED from interrogating-with-opencode
skills/jstack/SKILL.md                      # NEW router
skills/jstack/playbooks/{portagem,bug,feature,longa}.md
skills/jstack/biblioteca/{design,plano,verificacao,testes,debugging,finalizacao,revisao-recebida,skills,ferramentas,modelos}.md
skills/jstack-setup/SKILL.md                # NEW
AGENTS.md, README.md, NOTICE.md             # updated
docs/planos/linha-de-base.md                # NEW: RED baseline record
```

---

### Task 0: Baseline (RED) for the process

**Files:**
- Create: `docs/planos/linha-de-base.md`

- [ ] **Step 1: Prepare sources** — run the commands in "Sources". Confirm `ls $SP` lists
  `brainstorming writing-plans …` and `ls $PS/skills` lists `interrogate arena …`.

- [ ] **Step 2: Run three baseline subagents in parallel** (Agent tool, `general-purpose`, background).
  Each gets **no jstack files** and this preamble: "You are Claude Code in repo
  /Users/jarede/projetos/bistek/prezzo. Do not modify anything; describe exactly what you would do,
  in order, as tool calls and questions to the user. Under 300 words." Tasks:
  - A: "porta a procedure PRC_PRECO do Oracle para Python no prezzo"
  - B: "o desconto de ponto extra não está sendo aplicado na Tlantic, investiga e corrige"
  - C: "adiciona um flag --dry-run no comando de sincronização"

- [ ] **Step 3: Record** in `docs/planos/linha-de-base.md`, per scenario: the steps the agent
  proposed, and which of these it **missed**: golden outputs before code; reproduce before fixing;
  design approval before code; a verification command with its output before claiming done;
  asking before merging/opening a PR. These misses are what Tasks 3–8 must fix.

- [ ] **Step 4: Commit**

```bash
git add docs/planos/linha-de-base.md
git commit -m "docs: linha de base (RED) do processo sem jstack"
```

### Task 1: Tooling — on-demand flag, commands, renamed links, tests

**Files:**
- Create: `renomeadas.txt`, `tests/test_check.py`, `tests/test_install.sh`, `commands/opencode/.gitkeep`
- Modify: `scripts/lib.sh`, `scripts/install.sh`, `scripts/uninstall.sh`, `scripts/status.sh`,
  `scripts/check.py`, `justfile`, `.github/workflows/check.yml`

**Interfaces:**
- Produces: manifest line format `<skill> <claude|opencode> [sob-demanda]`;
  `renomeadas.txt` line format `<old> <new>`; `commands/opencode/*.md` linked into
  `$OPENCODE_COMMANDS_DIR` (default `~/.config/opencode/commands`); `check.py` honours env
  `JSTACK_ROOT`; `just test` runs both test files.

- [ ] **Step 1: Write the failing check tests** — `tests/test_check.py`:

```python
import os, pathlib, shutil, subprocess, sys, tempfile, textwrap, unittest

REPO = pathlib.Path(__file__).resolve().parent.parent
CHECK = REPO / "scripts" / "check.py"


def make_repo(skills, manifest, commands=None):
    root = pathlib.Path(tempfile.mkdtemp())
    (root / "skills").mkdir()
    for name, front in skills.items():
        d = root / "skills" / name
        d.mkdir()
        (d / "SKILL.md").write_text(f"---\n{front}\n---\n\n# {name}\n")
    (root / "skills.txt").write_text(manifest)
    if commands:
        cdir = root / "commands" / "opencode"
        cdir.mkdir(parents=True)
        for fname, body in commands.items():
            (cdir / fname).write_text(body)
    return root


def run_check(root):
    env = dict(os.environ, JSTACK_ROOT=str(root))
    return subprocess.run([sys.executable, str(CHECK)], env=env, capture_output=True, text=True)


GOOD = "name: {n}\ndescription: Use when testing the checker."


class CheckTests(unittest.TestCase):
    def test_on_demand_skill_requires_flag(self):
        root = make_repo({"jstack": GOOD.format(n="jstack")}, "jstack claude sob-demanda\n")
        r = run_check(root)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("disable-model-invocation", r.stdout)

    def test_on_demand_skill_with_flag_passes(self):
        front = GOOD.format(n="jstack") + "\ndisable-model-invocation: true"
        root = make_repo({"jstack": front}, "jstack claude sob-demanda\n")
        r = run_check(root)
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_flag_without_sob_demanda_fails(self):
        front = GOOD.format(n="x") + "\ndisable-model-invocation: true"
        root = make_repo({"x": front}, "x claude\n")
        r = run_check(root)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("sob-demanda", r.stdout)

    def test_command_needs_description(self):
        root = make_repo({"x": GOOD.format(n="x")}, "x claude\n",
                         {"jstack.md": "---\nagent: build\n---\nfaz $ARGUMENTS\n"})
        r = run_check(root)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("commands/opencode/jstack.md", r.stdout)

    def test_unknown_third_column_fails(self):
        root = make_repo({"x": GOOD.format(n="x")}, "x claude talvez\n")
        self.assertEqual(run_check(root).returncode, 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run it, expect failures** — `python3 -m unittest tests/test_check.py -v`.
  Expected: `test_on_demand_skill_requires_flag`, `test_flag_without_sob_demanda_fails`,
  `test_command_needs_description`, `test_unknown_third_column_fails` FAIL; the env var is ignored so
  the real repo is checked.

- [ ] **Step 3: Implement in `scripts/check.py`**
  - `ROOT = pathlib.Path(os.environ.get("JSTACK_ROOT") or pathlib.Path(__file__).resolve().parent.parent)` (add `import os`).
  - `manifest()` accepts 2 or 3 tokens; third token must be `sob-demanda`; returns
    `{name: (target, on_demand_bool)}`; update `main()` to use `entries[name][0]` where it used the target.
  - In `check_skill(folder, on_demand)`: `flag = fm.get("disable-model-invocation", "").lower() == "true"`;
    `on_demand and not flag` → error `"{name}: sob-demanda no skills.txt exige disable-model-invocation: true"`;
    `flag and not on_demand` → error `"{name}: disable-model-invocation: true exige sob-demanda no skills.txt"`.
  - New `check_commands()`: for each `ROOT/commands/opencode/*.md`, parse with `frontmatter()`;
    missing frontmatter or empty `description` → error `"commands/opencode/<file>: falta description no frontmatter"`.
    Call it from `main()`.

- [ ] **Step 4: Run tests, expect PASS** — `python3 -m unittest tests/test_check.py -v` → 5 passed;
  `python3 scripts/check.py` on the real repo still → `0 erros`.

- [ ] **Step 5: Write the failing install test** — `tests/test_install.sh`:

```bash
#!/usr/bin/env bash
# Install/uninstall against a temporary HOME. Exits non-zero on the first failed assertion.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
export HOME="$(mktemp -d)"
C="$HOME/.claude/skills"; O="$HOME/.config/opencode/skills"; K="$HOME/.config/opencode/commands"
fail() { echo "FAIL: $*"; exit 1; }

# A real folder and a stale link with an old (renamed) name must be handled.
mkdir -p "$C" "$K"
first_old="$(sed -e 's/#.*//' -e '/^[[:space:]]*$/d' "$REPO/renomeadas.txt" | awk 'NR==1{print $1}')"
if [ -n "$first_old" ]; then
  ln -s "$REPO/skills/$first_old" "$C/$first_old"      # dangling link into the repo
fi
mkdir -p "$C/orquestra"; echo x > "$C/orquestra/SKILL.md"  # real folder in the way

bash "$REPO/scripts/install.sh" >/dev/null
bash "$REPO/scripts/install.sh" >/dev/null                 # idempotent

[ -L "$C/orquestra" ] || fail "orquestra should be a link"
ls "$HOME"/.jstack-backup/*/claude/orquestra/SKILL.md >/dev/null 2>&1 || fail "real folder not backed up"
[ -z "$first_old" ] || [ ! -e "$C/$first_old" -a ! -L "$C/$first_old" ] || fail "old link $first_old not removed"
for f in "$REPO"/commands/opencode/*.md; do
  [ -e "$f" ] || continue
  [ -L "$K/$(basename "$f")" ] || fail "command $(basename "$f") not linked"
done

bash "$REPO/scripts/uninstall.sh" >/dev/null
[ ! -L "$C/orquestra" ] || fail "uninstall left orquestra"
echo "test_install: ok"
```

  Create `renomeadas.txt`:

```
# <nome antigo> <nome novo> — o install remove links antigos que apontem para este repositório.
orchestrating-engineer-reviewer-implementer  orquestra
running-an-arena-with-opencode               arena
interrogating-with-opencode                  interrogar
```

- [ ] **Step 6: Run it, expect FAIL** — `bash tests/test_install.sh` → `FAIL: orquestra should be a link`
  (the skill is not renamed yet, and install does not know `renomeadas.txt`). Note: this test is
  completed by Task 2; here it must fail.

- [ ] **Step 7: Implement scripts**
  - `lib.sh`: add `OPENCODE_COMMANDS_DIR="${OPENCODE_COMMANDS_DIR:-$HOME/.config/opencode/commands}"`,
    `RENAMED="$JSTACK_ROOT/renomeadas.txt"`, and
    ```bash
    renamed_entries() {
      [ -f "$RENAMED" ] || return 0
      sed -e 's/#.*//' -e '/^[[:space:]]*$/d' "$RENAMED" | awk '{print $1, $2}'
    }
    ```
    `is_our_link` already only reads the link text, so it matches dangling links too — keep it.
  - `install.sh`, before the manifest loop:
    ```bash
    while read -r old new; do
      for dir in "$CLAUDE_DIR" "$OPENCODE_DIR"; do
        if is_our_link "$dir/$old"; then
          echo "rm    $old (renomeada para $new)"
          run rm "$dir/$old"
        fi
      done
    done < <(renamed_entries)
    ```
    After the manifest loop, link commands with the same backup rule:
    ```bash
    if [ -d "$JSTACK_ROOT/commands/opencode" ]; then
      run mkdir -p "$OPENCODE_COMMANDS_DIR"
      for src in "$JSTACK_ROOT"/commands/opencode/*.md; do
        [ -e "$src" ] || continue
        dest="$OPENCODE_COMMANDS_DIR/$(basename "$src")"
        if is_our_link "$dest" && [ "$(readlink "$dest")" = "$src" ]; then
          echo "ok    comando $(basename "$src")"; continue
        fi
        if [ -e "$dest" ] || [ -L "$dest" ]; then
          backup="$BACKUP_ROOT/$STAMP/commands"
          echo "bkp   comando $(basename "$src") -> $backup/"
          run mkdir -p "$backup"; run mv "$dest" "$backup/"
        fi
        echo "link  comando $(basename "$src") -> $dest"
        run ln -s "$src" "$dest"
      done
    fi
    ```
  - `install.sh` manifest loop: `manifest_entries` already prints only `$1 $2`; no change.
  - `uninstall.sh`: add `"$OPENCODE_COMMANDS_DIR"` to the `for dir in` list.
  - `status.sh`: after "Gerenciadas", print a "Comandos opencode:" section listing each
    `commands/opencode/*.md` as `instalado` / `NAO instalado`.
  - `justfile`: add
    ```
    # Roda os testes do tooling
    test:
        @python3 -m unittest discover -s tests -p 'test_*.py'
        @bash tests/test_install.sh
    ```
    and make `install: check` unchanged.
  - `.github/workflows/check.yml`: replace the install step body with
    `python3 -m unittest discover -s tests -p 'test_*.py'` and `bash tests/test_install.sh`.

- [ ] **Step 8: Run** `python3 -m unittest discover -s tests -p 'test_*.py' -v` → PASS.
  `bash tests/test_install.sh` still FAILS only on `orquestra` (expected until Task 2).
  `just check` → green.

- [ ] **Step 9: Commit**

```bash
git add renomeadas.txt tests scripts justfile .github commands
git commit -m "tooling: skills sob demanda, comandos opencode, links renomeados e testes"
```

### Task 2: Rename `orquestra`, `arena`, `interrogar`

**Files:**
- Rename: `skills/orchestrating-engineer-reviewer-implementer` → `skills/orquestra`;
  `skills/running-an-arena-with-opencode` → `skills/arena`;
  `skills/interrogating-with-opencode` → `skills/interrogar`
- Modify: their `SKILL.md` `name:`, `skills.txt`, every reference in `skills/**`, `README.md`,
  `NOTICE.md`, `AGENTS.md`

- [ ] **Step 1: Failing check** — `grep -rn -E 'orchestrating-engineer-reviewer-implementer|running-an-arena-with-opencode|interrogating-with-opencode' skills README.md NOTICE.md AGENTS.md skills.txt`
  → many hits (expected).

- [ ] **Step 2: Rename**

```bash
git mv skills/orchestrating-engineer-reviewer-implementer skills/orquestra
git mv skills/running-an-arena-with-opencode skills/arena
git mv skills/interrogating-with-opencode skills/interrogar
grep -rl -E 'orchestrating-engineer-reviewer-implementer|running-an-arena-with-opencode|interrogating-with-opencode' \
  skills README.md NOTICE.md AGENTS.md skills.txt | xargs sed -i '' \
  -e 's/orchestrating-engineer-reviewer-implementer/orquestra/g' \
  -e 's/running-an-arena-with-opencode/arena/g' \
  -e 's/interrogating-with-opencode/interrogar/g'
```

  Then fix the H1 titles by hand: `# Orchestrating Engineer, Reviewer and Implementer` →
  `# Orquestra`, `# Running an Arena With opencode` → `# Arena`, `# Interrogating With opencode` →
  `# Interrogar`. Fix `skills.txt` column alignment.

- [ ] **Step 3: Verify** — the grep from Step 1 returns only `renomeadas.txt` lines (it is not in
  the grep list, so: no output). `just check` → `0 erros`. `bash tests/test_install.sh` →
  `test_install: ok`.

- [ ] **Step 4: Install for real and confirm** — `just install`; `ls -la ~/.claude/skills` shows
  `orquestra arena interrogar` as links and no old names; `just status` shows all `instalada`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "renomeia orquestra, arena e interrogar"
```

### Task 3: Library — `verificacao.md` and `testes.md`

**Files:**
- Create: `skills/jstack/biblioteca/verificacao.md`, `skills/jstack/biblioteca/testes.md`
- Modify: `skills/orquestra/reviewing.md` (keep delegated-work specifics, point to verificacao.md)

**Sources:** `$SP/verification-before-completion/SKILL.md`, `$SP/test-driven-development/SKILL.md`
(+ `writing-good-tests.md` if present), `$PS/skills/principle-prove-it-works`,
`$PS/skills/principle-test-behavior-not-implementation`, `$PS/skills/principle-explain-the-number`,
`$PS/skills/blast-radius`, `$PS/skills/tdd`, current `skills/orquestra/reviewing.md`.

**Content contract — `verificacao.md`** (≤ 1200 words). Sections, in order:
1. `# Verification` + one-line rule: "No claim of done, fixed or passing without the command and its
   output in the same message."
2. `## The gate` — before saying done: identify the command that proves it, run it fresh, read the
   whole output and the exit code, then state the result with the evidence.
3. `## Evidence ladder` — the five rungs (Said, Cited, Walked, Ran, Reproduced), as now in
   reviewing.md; "accept on rung 4 or 5".
4. `## Checks that lie` — table moved from reviewing.md: test cannot fail (wrong-but-plausible value),
   ran over nothing (0 rows, unfetched cursor, uncommitted), not idempotent (run twice),
   passes too easily (what else could it be measuring), number without explanation (what limits it).
5. `## Golden outputs` — capture source output before changing anything; compare old vs new; the
   check script lives outside the implementer's write scope.
6. `## Verdict` — VERIFICADO / DEVOLVIDO / INCONCLUSIVO / BLOQUEADO with one line each;
   "INCONCLUSIVO is not a pass".
7. `## Red flags` — "should work", "probably", "tests pass" with no output, trusting a sub-agent
   report, partial checks.

**Content contract — `testes.md`** (≤ 800 words):
1. `# Tests` — pragmatic rule verbatim: "Write the test first when the user asks for it, or when the
   bug or behaviour has an obvious, cheap, local test target. Otherwise prove the change with
   evidence (verificacao.md) and say why no test was written."
2. `## When writing tests first` — RED (run, see it fail for the right reason), GREEN (minimal code),
   REFACTOR; commit.
3. `## A test must be able to fail` — call code the way its users do; assert a literal expected
   value; would it pass with a wrong-but-plausible result? then rewrite; never compute the expected
   value with the code under test; mocks only at boundaries.
4. `## Skip tests when` — test path unclear, expensive, integration-heavy, or read-only
   investigation; record `pulado: <motivo>`.

**`reviewing.md` after the change:** keep the delegated-specific rows (rewrote instead of copied,
invented API workaround, guard the source lacks, wrong-case dict keys, check script changed, kept a
known-wrong snippet), the DEVOLVIDO/escalation rules and the SHA rule; replace the ladder, verdict
definitions and generic rows with: "General rules — evidence ladder, checks that lie, verdicts —
are in `../jstack/biblioteca/verificacao.md`. Read it first."

- [ ] **Step 1:** Write both files from the contract, adapting (not copying) the sources.
- [ ] **Step 2:** Edit `reviewing.md` as above.
- [ ] **Step 3: Verify** —
  `grep -c -E '^## ' skills/jstack/biblioteca/verificacao.md` → 6;
  `wc -w skills/jstack/biblioteca/{verificacao,testes}.md` within budget;
  `grep -n 'verificacao.md' skills/orquestra/reviewing.md` → 1+ hit;
  `just check` → 0 erros (catches the relative link).
- [ ] **Step 4: Commit** — `git add skills && git commit -m "biblioteca: verificacao e testes"`

### Task 4: Library — `design.md` and `plano.md`

**Files:** Create `skills/jstack/biblioteca/design.md`, `skills/jstack/biblioteca/plano.md`

**Sources:** `$SP/brainstorming/SKILL.md`, `$SP/writing-plans/SKILL.md`,
`$SP/using-git-worktrees/SKILL.md`, `$PS/skills/architect/SKILL.md` +
`references/design-red-flags.md`, `$PS/skills/principle-sequence-verifiable-units`,
`$PS/skills/poteto-mode/playbooks/feature.md` (throughput checkpoint),
`$PS/skills/poteto-mode/playbooks/prototype.md`.

**Content contract — `design.md`** (≤ 1200 words):
1. `# Design` — goal: an understanding the user can recognise and correct, approved before code.
2. `## Size` — spike / delimitado / arquitetural with the definitions from the spec; "when in doubt,
   take the heavier one"; size only goes up mid-task.
3. `## Understand` — read the repo first; one question per message, multiple choice when possible;
   write back the understanding (what they said vs assumptions).
4. `## Options` — 2–3 approaches with trade-offs, recommendation first; YAGNI.
5. `## Prototype when observation settles it` — a throwaway sketch beats debate; label it throwaway.
6. `## Present and approve` — delimitado: short design in chat, stop for yes; arquitetural: sections
   with approval each, then spec at `docs/specs/AAAA-MM-DD-<tema>.md`, self-review (placeholders,
   contradictions, ambiguity, scope), user reviews the file.
7. `## Design red flags` — 5–8 bullets adapted from design-red-flags.md (hand-synced lists, two ways
   to do one thing, internals importable, the next contributor copies the nearest example).
8. `## Never` — adversarial review of a plan with no code behind it; starting code before approval.

**Content contract — `plano.md`** (≤ 1200 words):
1. `# Plan` — for arquitetural work, after the spec is approved; saved to `docs/planos/AAAA-MM-DD-<tema>.md`.
2. `## Before tasks` — file map (one responsibility per file); throughput checkpoint: blocking first
   steps, independent workstreams, shared mutable state, smallest safe decomposition;
   **independence is about files**.
3. `## Tasks` — 2–5 minute steps; exact paths; the test or check and its expected output; commit per
   task; no placeholders (list the banned forms).
4. `## Review focus` — the 3–5 inputs the spec implies but tests don't cover; each gets a test in its task.
5. `## Workspace` — when to use a git worktree (parallel agents, long runs, risky work); create with
   `git worktree add`; confirm the baseline test run is green before starting; copy untracked
   needs (`opencode.json`, `.venv`, `.env`).
6. `## Hand-off` — ask the user to review the plan and choose: inline, `orquestra` (opencode), or
   `arena` for one open-shaped task.

- [ ] **Step 1:** Write both files. **Step 2: Verify** — section counts (8 and 6 `## `), word
  budget, `just check`. **Step 3: Commit** — `git commit -m "biblioteca: design e plano"`.

### Task 5: Library — `debugging.md`, `finalizacao.md`, `revisao-recebida.md`

**Sources:** `$SP/systematic-debugging/` (all files), `$SP/finishing-a-development-branch/SKILL.md`,
`$SP/receiving-code-review/SKILL.md`, `$PS/skills/principle-fix-root-causes`,
`$PS/skills/principle-attack-the-premise`, `$PS/skills/poteto-mode/playbooks/opening-a-pr.md`,
`$PS/skills/interrogate/references/lead-judgment.md`.

**`debugging.md`** (≤ 1200 words): `# Debugging`; `## Reproduce first` (no repro → INCONCLUSIVO);
`## Root cause` (read errors fully, recent changes, trace data backwards, one hypothesis at a time,
smallest test of it); `## After three failed fixes` (stop; write the shared premise; question it —
attack-the-premise); `## Fix at the cause` ("a guard that silences is not a fix"; no
belt-and-suspenders); `## Red flags`.

**`finalizacao.md`** (≤ 800 words): `# Finishing`; `## Verify` (full test/check run, output pasted);
`## Options` — present exactly: merge locally, open PR, keep branch, discard (discard asks for typed
confirmation); **never merge, push or open a PR without the user's choice**; `## PR body` — briefing
format: what changed, why, how it was verified (commands + results), risks, deviations from plan;
`## Clean up` — remove worktrees created for the work, only after the choice.

**`revisao-recebida.md`** (≤ 600 words): `# Receiving review`; check each point against the code
before agreeing; no performative agreement ("você está certo!" without verifying); push back with
evidence; apply the lead-judgment filters (hypothetical vs actual, "I would do it differently",
missing context); one item at a time, test each.

- [ ] **Step 1:** Write the three files. **Step 2: Verify** — `grep -n 'never merge' -i
  skills/jstack/biblioteca/finalizacao.md` → hit; `grep -n 'three' -i debugging.md` → hit; budgets;
  `just check`. **Step 3: Commit** — `git commit -m "biblioteca: debugging, finalizacao, revisao-recebida"`.

### Task 6: Library — `ferramentas.md`, `skills.md`, `modelos.md`; AGENTS.md

**Sources:** `$SP/writing-skills/SKILL.md` (+ `testing-skills-with-subagents.md`),
`$PS/skills/poteto-mode/playbooks/eval.md`, spec section 3 (tools table) and 3a (config format).

**`ferramentas.md`** (≤ 600 words): `# Tools across harnesses`; detect harness
(`$CLAUDE_CODE_ENTRYPOINT` set → Claude Code; `claude-desktop` → desktop app, no herdr); the table
from the spec; "Run another model" row points to `orquestra`/`orchestrating-herdr-agents`;
"Ask the user" in opencode: write the question with lettered options and **stop the turn**.

**`modelos.md`** (≤ 500 words): `# Models`; file `~/.config/jstack/modelos.conf`; format (copy the
block from spec 3a); lookup rule: role line → list split on `,` → trim; user's request overrides one
run; before dispatch `opencode2 models | grep -qx '<id-without-#variant>'`; missing file or id →
ask once and suggest `/jstack-setup`; never pick a model yourself.

**`skills.md`** (≤ 1000 words): `# Writing skills`; RED (baseline subagent without the skill, record
what it does), GREEN (write the minimum that fixes what you saw), REFACTOR (close loopholes); frontmatter
rules (Global Constraints); description = when, not workflow; one target per skill; on-demand skills need
`sob-demanda` + `disable-model-invocation: true`; test with 3+ scenarios incl. one that should NOT
trigger; blind evaluation idea from eval.md (judge reads transcripts, not self-reports).

**AGENTS.md:** replace `siga \`superpowers:writing-skills\`` with
`siga \`skills/jstack/biblioteca/skills.md\``; add rule "Skills de processo (`jstack`, `jstack-setup`)
são sob demanda: `sob-demanda` no skills.txt e `disable-model-invocation: true`."

- [ ] **Step 1:** Write the three files and edit AGENTS.md. **Step 2: Verify** —
  `grep -rn 'superpowers' AGENTS.md` → no output; `grep -n 'jstack-setup' skills/jstack/biblioteca/modelos.md` → hit;
  `just check`. **Step 3: Commit** — `git commit -m "biblioteca: ferramentas, modelos, skills; AGENTS sem superpowers"`.

### Task 7: Playbooks

**Files:** Create `skills/jstack/playbooks/{portagem,bug,feature,longa}.md`

**Sources:** spec section 2 (authoritative step lists); `$PS/docs/guide/07-overnight.md` and
`$PS/skills/poteto-mode/playbooks/{autonomous-run,pause-safely,bug-fix}.md` for `longa.md`/`bug.md` wording.

**Format of every playbook** (≤ 600 words):

```markdown
# Playbook: <nome>

Use for: <one line>. Size rules: <what changes for spike / delimitado / arquitetural>.

## Steps
1. <step> — read `../biblioteca/<file>.md` | use skill `<name>`
2. ...

## Done means
- <checkable condition, with the command that proves it>

## Stop and ask when
- <condition>
```

Steps are the spec's lists, numbered exactly as there, each naming the library file or skill it uses
by relative path. `longa.md` additionally has `## Contract template` with the `.agentes/contrato.md`
skeleton (objetivo, pronto significa, worktree, permissões, orçamento, saída de emergência) and
`## decisoes.tsv` with the header line `hora	fase	decisao	motivo	evidencia	resultado`.

- [ ] **Step 1:** Write the four files. **Step 2: Verify** — each has `## Steps`, `## Done means`,
  `## Stop and ask when`: `for f in skills/jstack/playbooks/*.md; do grep -c -E '^## (Steps|Done means|Stop and ask when)' $f; done` → `3` four times;
  `just check` (all `../biblioteca/*.md` links resolve). **Step 3: Commit** — `git commit -m "jstack: playbooks"`.

### Task 8: Router `skills/jstack/SKILL.md` and opencode command

**Files:** Create `skills/jstack/SKILL.md`, `commands/opencode/jstack.md`; Modify `skills.txt`

**Router content contract** (≤ 1200 words):

```markdown
---
name: jstack
description: Use when the user invokes /jstack (or @jstack) to run a task through jstack's engineering process - porting/migrating code, fixing or investigating a bug, building a feature, or a long unattended run.
disable-model-invocation: true
---
```

Sections: `# jstack` (what it is; adapted from superpowers and pstack, see NOTICE); `## 1. Classify`
(the four playbooks with one-line "use for", two examples each; ambiguous → one question; no fit →
say so and answer without process; `longa` wraps another); `## 2. Size` (pointer to
`biblioteca/design.md#size`, one-line summary); `## 3. Copy the steps` ("copy the playbook's steps
verbatim into the task list; a skipped step stays as `pulado: <motivo>`"); `## 4. Run`;
`## Standing rules` (the five from spec section 1, with the models rule pointing to
`biblioteca/modelos.md`); `## Harness` (pointer to `biblioteca/ferramentas.md`); `## Map` (table:
playbook → file; library file → what it covers).

**`commands/opencode/jstack.md`:**

```markdown
---
description: Run a task through the jstack process (portagem, bug, feature, longa)
---
Read the file ~/.claude/skills/jstack/SKILL.md with your read tool and follow it exactly for this
request. Read the playbook and library files it points to, relative to ~/.claude/skills/jstack/,
when it tells you to. Do not try to load "jstack" with the skill tool: it is user-invoked only.

Request: $ARGUMENTS
```

`skills.txt`: add `jstack  claude  sob-demanda`.

- [ ] **Step 1:** Write both files; edit `skills.txt`. **Step 2: Verify** — `just check` (on-demand flag
  enforced); `just install`; `ls -la ~/.config/opencode/commands/jstack.md` is a link;
  `wc -w skills/jstack/SKILL.md` ≤ 1200. **Step 3: Commit** — `git commit -m "jstack: roteador e comando opencode"`.

### Task 9: `jstack-setup` and config use in skills

**Files:** Create `skills/jstack-setup/SKILL.md`, `commands/opencode/jstack-setup.md`;
Modify `skills.txt`, `skills/orquestra/SKILL.md`, `skills/interrogar/SKILL.md`, `skills/arena/SKILL.md`,
`skills/jstack/playbooks/longa.md`

**Source:** `$PS/skills/setup-pstack/SKILL.md`, spec section 3a.

**`jstack-setup/SKILL.md`** (≤ 900 words), frontmatter:

```markdown
---
name: jstack-setup
description: Use when the user invokes /jstack-setup (or @jstack-setup) to choose or change which model plays each jstack role - orquestra reviewer and implementer, interrogar reviewers, arena candidates and judge, longa auditor.
disable-model-invocation: true
---
```

Body: the five steps of spec 3a (detect → load current → show and confirm → validate → write),
the full default file block, "never write an id that was not detected", "families in a panel should
differ — warn if not", "re-running updates", confirm the path written. In opencode, asking = lettered
options in text and stop.

**`commands/opencode/jstack-setup.md`:** same shape as `jstack.md`, reading
`~/.claude/skills/jstack-setup/SKILL.md`.

**Skill edits:** in `orquestra/SKILL.md`, replace the section "Ask Which Models Before Dispatching
Anything" with "Models": read roles `orquestra revisor` / `orquestra implementador` per
`../jstack/biblioteca/modelos.md`; user override per run; ask only if missing/invalid; keep the red
flag "picking the models yourself". Same pattern in `interrogar/SKILL.md` step 3 (roles
`interrogar revisores`, `interrogar claude`) and `arena/SKILL.md` Phase A item 3 (roles
`arena candidatos`, `arena juiz`), and `longa.md` (role `longa auditor`).

`skills.txt`: add `jstack-setup  claude  sob-demanda`.

- [ ] **Step 1:** Write and edit. **Step 2: Verify** — `grep -rn 'opencode2 models' skills/orquestra/SKILL.md skills/interrogar/SKILL.md skills/arena/SKILL.md` → each still checks ids; `grep -rln 'modelos.md' skills` → 4 files; `just check`; `just install`.
- [ ] **Step 3: Scenario test (Review Focus 3)** — subagent reads `skills/interrogar/` and
  `skills/jstack/biblioteca/modelos.md`; scenario: `modelos.conf` absent; then: it lists
  `opencode-go/kimi-k3` which is not in `opencode2 models`. Expected answer: asks the user and suggests
  `/jstack-setup` in both cases; never substitutes a model. Fix wording until it does.
- [ ] **Step 4: Commit** — `git commit -m "jstack-setup: modelos por papel; skills leem modelos.conf"`.

### Task 10: README, NOTICE

- `NOTICE.md`: add `## superpowers — Jesse Vincent` with source URL, the MIT text from
  `$SP/../LICENSE`, and a table: `biblioteca/design.md` ← brainstorming; `plano.md` ← writing-plans,
  using-git-worktrees; `verificacao.md` ← verification-before-completion; `testes.md` ←
  test-driven-development; `debugging.md` ← systematic-debugging; `finalizacao.md` ←
  finishing-a-development-branch; `revisao-recebida.md` ← receiving-code-review; `skills.md` ←
  writing-skills. Extend the pstack table with the new library/playbook rows and `jstack-setup` ←
  `setup-pstack`. Update renamed paths.
- `README.md`: inspiration paragraph names both (pstack da poteto, superpowers do Jesse Vincent);
  new section "Usando o processo" (`/jstack <pedido>`, `/jstack-setup`, the four playbooks, "nada
  roda sozinho"); skills table with new names + `jstack`, `jstack-setup`; "Saindo do superpowers"
  (the three steps from spec section 4); "Próximos passos" (out-of-scope list); `just test` in
  maintenance.

- [ ] **Step 1:** Edit. **Step 2: Verify** — `grep -n 'Jesse Vincent' NOTICE.md README.md` → hits in
  both; `grep -n 'poteto' README.md` uses feminine forms ("da poteto"); `just check`.
  **Step 3: Commit** — `git commit -m "docs: README e NOTICE para o fork"`.

### Task 11: Verification (GREEN) and real environments

- [ ] **Step 1: Routing test** — one subagent per batch, given only `skills/jstack/`; for each request it
  returns `playbook | size | first 3 copied steps`:
  1. "porta a view VW_ESTOQUE para uma função Python" → portagem
  2. "migra os jobs do cron antigo para o scheduler novo, mesma saída" → portagem
  3. "o relatório de margem está dobrando valores desde ontem" → bug
  4. "por que o sync de preços demora 40 min?" → bug (investigação)
  5. "adiciona exportação CSV na tela de pedidos" → feature
  6. "cria um endpoint de saúde" → feature (delimitado)
  7. "roda a portagem das 15 procedures durante a noite" → longa + portagem
  8. "deixa o agente refatorando o módulo X sozinho até amanhã" → longa + feature
  9. ambiguous: "mexe no cálculo de desconto" → exactly one question
  10. ambiguous: "o export está lento, melhora" → exactly one question (bug vs feature)
  11. no fit: "qual a diferença entre UNION e UNION ALL?" → answers without process
  Pass: 8/8 correct, 9–10 one question each, 11 no process. Record in `docs/planos/linha-de-base.md`
  under "GREEN".
- [ ] **Step 2: Application test** — rerun Task 0's three scenarios **with** jstack. Pass: every miss
  recorded in Task 0 is now covered; skipped steps appear as `pulado: <motivo>`; no broken path; no
  merge/PR without asking. Record results.
- [ ] **Step 3: Claude Code** — in a new session, the skill list shows `jstack` and `jstack-setup`
  only as user-invocable; ask the user to type `/jstack qual playbook para "corrige o bug X"?` and
  confirm it routes to `bug`.
- [ ] **Step 4: opencode** — `opencode2 reload`; `opencode2 api GET /api/skill | grep -o '"path":"[^"]*jstack[^"]*"'`
  lists both skills. **Ask the user which cheap model to use**, then:
  `opencode2 run -m <model> "/jstack investigue por que o teste X falha — apenas diga qual playbook e tamanho escolheu e os passos copiados, nao execute nada"`.
  Pass: it read `~/.claude/skills/jstack/SKILL.md` (visible in output or `--format json`) and chose
  `bug`. Covers Review Focus 1.
- [ ] **Step 5: Mechanical** — `just test` green; `just check` green; push; CI green
  (`gh run list -L1`).
- [ ] **Step 6: Commit** the recorded results — `git commit -m "docs: resultados GREEN do jstack"`; push.

---

## Self-review notes

- Spec coverage: §1 → Task 8; §2 → Task 7; §3 → Tasks 3–6; §3a → Tasks 6 (modelos.md) and 9;
  §4 → Tasks 1, 2, 6, 10; §5 → Tasks 0, 9 (step 3), 11; out-of-scope → Task 10 README.
- Review Focus mapping: 1 → Tasks 8, 11.4; 2 and 5 → Task 1 test_install; 3 → Task 9.3; 4 → Task 11.1.
