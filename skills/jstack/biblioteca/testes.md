# Tests

**Write the test first when the user asks for it, or when the bug or behaviour has an obvious,
cheap, local test target. Otherwise prove the change with evidence (`verificacao.md`) and say why
no test was written.**

Adapted from superpowers `test-driven-development` (Jesse Vincent, MIT) and pstack `tdd`,
`principle-test-behavior-not-implementation` (Lauren Tan, MIT).

## When writing tests first

1. **RED** — write one test for one behaviour. Run it. It must fail, and fail because the
   behaviour is missing, not because of a typo or an import error. A test that passes before the
   code exists is testing something else: fix the test.
2. **GREEN** — write the least code that makes it pass. Run it, then run the project's whole test
   command, not only your file.
3. **REFACTOR** — clean up with the suite green. No new behaviour here.
4. Commit.

For a bug fix, the test reproduces the reported failure first. Prove it guards the fix: revert the
fix, see the test fail, restore it, see it pass.

## A test must be able to fail

- Call the code the way its users do: the public function, the command, the endpoint.
- Assert a **literal** expected value: the exact rows, the exact total, the exact message.
- Ask: would this test still pass if the code returned a wrong but plausible result? If yes,
  rewrite the assertion or delete the test.
- Never compute the expected value with the code under test, or with a copy of its logic.
- Mock only at boundaries you do not own (network, clock, third-party APIs). A test whose only
  assertion is on a mock proves the mock works.
- Prefer the real database or a real fixture when the project supports it.

## Skip tests when

- the test path is unclear, expensive, or needs integration you cannot run here;
- the work is a read-only investigation;
- the change is configuration or documentation with nothing to execute.

Record the skip in the task list as `pulado: <motivo>`, and verify with evidence instead: the
reproduced symptom before and after, a golden-output diff, or the command output.
