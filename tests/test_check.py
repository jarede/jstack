import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

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

    def test_renamed_name_still_in_manifest_fails(self):
        root = make_repo({"velho": GOOD.format(n="velho")}, "velho claude\n")
        (root / "renomeadas.txt").write_text("velho novo\n")
        r = run_check(root)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("renomeadas.txt", r.stdout)

    def test_backtick_path_to_missing_file_fails(self):
        root = make_repo({"x": GOOD.format(n="x")}, "x claude\n")
        (root / "skills" / "x" / "playbooks").mkdir()
        (root / "skills" / "x" / "biblioteca").mkdir()
        (root / "skills" / "x" / "biblioteca" / "real.md").write_text("# real\n")
        (root / "skills" / "x" / "playbooks" / "p.md").write_text(
            "Read `../biblioteca/real.md` and `../biblioteca/sumiu.md`.\n")
        r = run_check(root)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("sumiu.md", r.stdout)
        self.assertNotIn("real.md", r.stdout)

    def test_unknown_third_column_fails(self):
        root = make_repo({"x": GOOD.format(n="x")}, "x claude talvez\n")
        self.assertEqual(run_check(root).returncode, 1)


if __name__ == "__main__":
    unittest.main()
