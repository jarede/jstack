import pathlib
import unittest

REPO = pathlib.Path(__file__).resolve().parent.parent


class OpencodeCommandTests(unittest.TestCase):
    def test_commands_load_skill_through_shell_not_read_tool(self):
        # opencode's read tool may not expand "~"; the shell does. The command must have the
        # model print the skill with cat, not "read ~/..." or load it with the skill tool.
        cmds = sorted((REPO / "commands" / "opencode").glob("*.md"))
        self.assertTrue(cmds)
        for cmd in cmds:
            body = cmd.read_text()
            skill = cmd.stem
            self.assertIn(f"cat ~/.claude/skills/{skill}/SKILL.md", body, cmd.name)
            self.assertNotIn("read tool", body, cmd.name)


if __name__ == "__main__":
    unittest.main()
