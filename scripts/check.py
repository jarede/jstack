#!/usr/bin/env python3
"""Validate jstack: skill frontmatter, links between files, and leftovers from the Cursor original.

Exit status 1 on any error. Run from anywhere: python3 scripts/check.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TEXT_SUFFIXES = {".md", ".ts", ".sh", ".mjs", ".json", ".yml", ".tsv"}
ATTRIBUTION_FILES = {"README.md", "LICENSE"}

# Each pattern names something that only exists in Cursor's pstack, or a pstack name jstack renamed.
LEFTOVERS = [
    (r"(?i)\bcursor\b", "Cursor reference"),
    (r"\.cursor/", "Cursor path"),
    (r"pstack-models|setup-pstack|poteto-mode|poteto-agent|poteto-help", "pstack name renamed in jstack"),
    (r"\bAskQuestion\b", "Cursor tool name (use the question tool from harness.md)"),
    (r"\bgeneralPurpose\b", "Cursor agent type (general-purpose / general)"),
    (r'environment: "cloud"|\bcloud agents?\b', "Cursor cloud agent"),
    (r"\breadonly: (true|false)\b", "Cursor Task parameter"),
    (r"`Task`|\bTask tool\b|\bTask calls?\b", "Cursor Task tool (use the spawn action from harness.md)"),
    (r"cursor-team-kit|\bdeslop\b|control-ui|control-cli", "cursor-team-kit skill"),
    (r"\borigin pr\b|\bOrigin\b|\bGraphite\b", "Origin / Graphite forge"),
    (r"(?i)\bbugbot\b", "Cursor Bugbot"),
    (r"\bgh (pr|api|run)\b", "GitHub CLI call (use glab, see environment.md)"),
    (r"grok-4\.7-[a-z]+-fast|claude-opus-5-5-[a-z]+", "Cursor model slug (use models.md roles)"),
]

errors: list[str] = []
warnings: list[str] = []


def frontmatter(path: Path) -> dict[str, str] | None:
    lines = path.read_text().splitlines()
    if not lines or lines[0] != "---":
        return None
    fields: dict[str, str] = {}
    for line in lines[1:]:
        if line == "---":
            return fields
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if m:
            fields[m.group(1)] = m.group(2).strip().strip('"')
    return None


def check_skills() -> None:
    for skill in sorted((ROOT / "skills").iterdir()):
        if not skill.is_dir():
            continue
        md = skill / "SKILL.md"
        rel = md.relative_to(ROOT)
        if not md.is_file():
            errors.append(f"{skill.relative_to(ROOT)}: missing SKILL.md")
            continue
        fm = frontmatter(md)
        if fm is None:
            errors.append(f"{rel}: missing or unterminated frontmatter")
            continue
        name = fm.get("name", "")
        if name != skill.name:
            errors.append(f"{rel}: name '{name}' must equal the folder name '{skill.name}'")
        if not NAME_RE.match(skill.name) or len(skill.name) > 64:
            errors.append(f"{rel}: folder name must be lowercase kebab-case, at most 64 chars")
        desc = fm.get("description", "")
        if not desc:
            errors.append(f"{rel}: empty description")
        elif len(desc) > 1024:
            errors.append(f"{rel}: description longer than 1024 chars")
        if len(md.read_text().splitlines()) > 500:
            warnings.append(f"{rel}: longer than 500 lines")


def check_agents() -> None:
    for harness, required in (("claude", ("name", "description")), ("opencode", ("description", "mode"))):
        for md in sorted((ROOT / "agents" / harness).glob("*.md")):
            fm = frontmatter(md) or {}
            for key in required:
                if not fm.get(key):
                    errors.append(f"{md.relative_to(ROOT)}: missing '{key}' in frontmatter")
            if harness == "claude" and fm.get("name") != md.stem:
                errors.append(f"{md.relative_to(ROOT)}: name must equal the file name")
        claude = {p.stem for p in (ROOT / "agents" / "claude").glob("*.md")}
        opencode = {p.stem for p in (ROOT / "agents" / "opencode").glob("*.md")}
    for missing in sorted(claude ^ opencode):
        errors.append(f"agents/: '{missing}' must exist for both claude and opencode")


def text_files():
    for path in sorted(ROOT.rglob("*")):
        parts = path.relative_to(ROOT).parts
        if parts[0] in {".git", ".claude", ".jstack", "build", "node_modules", "scripts"} or "node_modules" in parts:
            continue
        if path.is_file() and path.suffix in TEXT_SUFFIXES and path.name != "bun.lock":
            yield path


def skill_root(path: Path) -> Path | None:
    parts = path.relative_to(ROOT).parts
    if len(parts) >= 2 and parts[0] == "skills":
        return ROOT / "skills" / parts[1]
    return None


LINK_RE = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")
TICK_RE = re.compile(r"`((?:\.\./|[A-Za-z0-9_.-]+/)[A-Za-z0-9_./-]+\.(?:md|sh|ts|mjs|tsv))`")


def resolves(path: Path, ref: str) -> bool:
    candidates = [path.parent / ref]
    root = skill_root(path)
    if root:
        candidates += [root / ref, ROOT / "skills" / ref]
    candidates += [ROOT / ref, ROOT / "skills" / "jstack" / ref]
    return any(c.exists() for c in candidates)


def check_text() -> None:
    for path in text_files():
        rel = path.relative_to(ROOT)
        text = path.read_text()
        if str(rel) not in ATTRIBUTION_FILES:
            for n, line in enumerate(text.splitlines(), 1):
                for pattern, why in LEFTOVERS:
                    if re.search(pattern, line):
                        errors.append(f"{rel}:{n}: {why}: {line.strip()[:120]}")
        if path.suffix != ".md":
            continue
        for ref in LINK_RE.findall(text):
            if re.match(r"^[a-z]+:", ref) or ref.startswith("/"):
                continue
            if not resolves(path, ref):
                errors.append(f"{rel}: broken link '{ref}'")
        for ref in TICK_RE.findall(text):
            if ref.startswith(("~", ".jstack/", ".claude/")) or "<" in ref:
                continue
            if not resolves(path, ref):
                errors.append(f"{rel}: path '{ref}' does not exist")


def kebab(title: str) -> str:
    cleaned = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    return re.sub(r"[\s-]+", "-", cleaned).strip("-")


SECTION_ENTRY_RE = re.compile(r"^\s*-\s+\*\*(.+?)\*\*(.*)$")
GIVEN_NAME_RE = re.compile(r"\(\*\*([a-z0-9][a-z0-9-]*)\*\*\)")
FILE_POINTER_RE = re.compile(r"File:\s*`([^`]+)`")


def section_entries(text: str, heading: str):
    inside = False
    for n, line in enumerate(text.splitlines(), 1):
        if line.startswith("## "):
            inside = line[3:].strip() == heading
            continue
        if inside:
            m = SECTION_ENTRY_RE.match(line)
            if m:
                yield n, m.group(1), m.group(2)


def check_index() -> None:
    skill_md = ROOT / "skills" / "jstack" / "SKILL.md"
    text = skill_md.read_text()
    rel = skill_md.relative_to(ROOT)
    for n, title, rest in section_entries(text, "Principles"):
        given = GIVEN_NAME_RE.search(rest)
        name = given.group(1) if given else f"principle-{kebab(title)}"
        if not (ROOT / "skills" / name / "SKILL.md").is_file():
            errors.append(
                f"{rel}:{n}: principle '{title}' -> skills/{name}/SKILL.md does not exist"
            )
    for n, title, rest in section_entries(text, "Playbooks"):
        given = FILE_POINTER_RE.search(rest)
        path = given.group(1) if given else f"playbooks/{kebab(title)}.md"
        if not (ROOT / "skills" / "jstack" / path).is_file():
            errors.append(
                f"{rel}:{n}: playbook '{title}' -> skills/jstack/{path} does not exist"
            )


def main() -> int:
    check_skills()
    check_agents()
    check_text()
    check_index()
    for w in warnings:
        print(f"warn  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
