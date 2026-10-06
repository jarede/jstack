"""Validate every skill in the repository. Exits 1 on any error.

Checks, per skill:
- skills.txt and skills/ agree (every listed skill exists, every folder is listed once, valid target)
- SKILL.md starts with YAML frontmatter holding `name` and `description`
- `name` matches the folder and uses only lowercase letters, digits and hyphens (Claude Code and
  opencode both require this)
- `description` is 1-1024 characters
- every relative Markdown link inside the skill points at a file that exists

Warnings (do not fail): description without a "when to use" cue, SKILL.md over 500 lines.
Usage: python3 scripts/check.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKILLS = ROOT / "skills"
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")

errors, warnings = [], []


def frontmatter(text):
    """Return a dict of the top-level keys of a simple YAML frontmatter block."""
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    if end == -1:
        return None
    block = text[4:end].splitlines()
    data, key = {}, None
    for line in block:
        m = re.match(r"^([A-Za-z_][\w-]*):\s?(.*)$", line)
        if m:
            key, value = m.group(1), m.group(2).strip()
            data[key] = "" if value in (">", ">-", "|", "|-") else value.strip("'\"")
        elif key and line.startswith((" ", "\t")):
            data[key] = (data[key] + " " + line.strip()).strip()
    return data


def manifest():
    entries = {}
    for n, raw in enumerate((ROOT / "skills.txt").read_text().splitlines(), 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 2 or parts[1] not in ("claude", "opencode"):
            errors.append(f"skills.txt:{n}: esperado '<skill> <claude|opencode>', veio {raw!r}")
            continue
        if parts[0] in entries:
            errors.append(f"skills.txt:{n}: {parts[0]} listada duas vezes")
        entries[parts[0]] = parts[1]
    return entries


def check_skill(folder):
    skill_md = folder / "SKILL.md"
    if not skill_md.is_file():
        errors.append(f"{folder.name}: falta SKILL.md")
        return
    text = skill_md.read_text(encoding="utf-8")
    fm = frontmatter(text)
    if fm is None:
        errors.append(f"{folder.name}: SKILL.md sem frontmatter YAML (--- ... ---)")
        return
    name, desc = fm.get("name", ""), fm.get("description", "")
    if name != folder.name:
        errors.append(f"{folder.name}: name '{name}' diferente do nome da pasta")
    if not NAME_RE.match(name):
        errors.append(f"{folder.name}: name '{name}' deve ter so minusculas, digitos e hifens")
    if not desc:
        errors.append(f"{folder.name}: description vazia")
    elif len(desc) > 1024:
        errors.append(f"{folder.name}: description com {len(desc)} caracteres (max 1024)")
    elif not re.search(r"\b(use when|use quando|use it|use this|apply when)\b", desc, re.I):
        warnings.append(f"{folder.name}: description nao diz quando usar ('Use when ...')")
    lines = text.count("\n")
    if lines > 500:
        warnings.append(f"{folder.name}: SKILL.md com {lines} linhas; mova detalhes para arquivos de referencia")

    for md in folder.rglob("*.md"):
        body = md.read_text(encoding="utf-8")
        body = re.sub(r"```.*?```", "", body, flags=re.S)  # ignore links inside code blocks
        for target in LINK_RE.findall(body):
            if re.match(r"^[a-z]+:", target) or target.startswith(("#", "/", "~", "<")):
                continue
            path = (md.parent / target.split("#", 1)[0]).resolve()
            if not path.exists():
                errors.append(f"{md.relative_to(ROOT)}: link quebrado -> {target}")


def main():
    entries = manifest()
    folders = {p.name: p for p in SKILLS.iterdir() if p.is_dir()}
    for name in entries:
        if name not in folders:
            errors.append(f"skills.txt lista '{name}', mas skills/{name}/ nao existe")
    for name, folder in sorted(folders.items()):
        if name not in entries:
            errors.append(f"skills/{name}/ nao esta no skills.txt")
        check_skill(folder)

    for w in warnings:
        print(f"aviso  {w}")
    for e in errors:
        print(f"ERRO   {e}")
    print(f"{len(folders)} skills, {len(errors)} erros, {len(warnings)} avisos")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
