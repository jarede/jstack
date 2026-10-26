import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "check-plan.mjs");
const FIXTURE = join(import.meta.dir, "check-plan.fixture.md");
const directories: string[] = [];

async function makeDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "check-plan-test-"));
  directories.push(directory);
  return directory;
}

function run(args: readonly string[]): {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = Bun.spawnSync([process.execPath, SCRIPT, ...args]);
  return {
    code: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

const REPORT =
  "Add the bounded cache (MR 41)  boxes=22  files=1 build=1 you-see=1 verify-unit=1 verify-live=10 verify-perf=4 review-gate=0 merge=4\n";

async function runAppended(lines: readonly string[]): Promise<{
  readonly file: string;
  readonly base: number;
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  const directory = await makeDirectory();
  const file = join(directory, "plan.md");
  const fixture = await readFile(FIXTURE, "utf8");
  await writeFile(file, `${fixture}${lines.join("\n")}\n`);
  return { file, base: fixture.split("\n").length, ...run([file]) };
}

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("check-plan", () => {
  it("passes a plan written per the multi-phase playbook", () => {
    const result = run([FIXTURE]);
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
  });

  it("fails a plan that uses the PR wording the playbook dropped", async () => {
    const directory = await makeDirectory();
    const copy = join(directory, "plan.md");
    const text = await readFile(FIXTURE, "utf8");
    await writeFile(copy, text.replaceAll("An MR is verified", "A PR is verified"));
    const result = run([copy]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("does not open with the rule");
  });

  it("treats a tilde fence body as code", async () => {
    const result = await runAppended([
      "~~~markdown",
      "The cache evicted the — key.",
      "~~~",
    ]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(`${REPORT}1 MR sections, 0 problems\n`);
  });

  it("treats a three-backtick line inside a four-backtick fence as code", async () => {
    const result = await runAppended([
      "````markdown",
      "```",
      "The cache evicted the — key.",
      "````",
    ]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(`${REPORT}1 MR sections, 0 problems\n`);
  });

  it("checks prose after a four-backtick fence closes", async () => {
    const result = await runAppended([
      "````markdown",
      "```",
      "The cache evicted the — key.",
      "````",
      "The cache evicted the — key after the close.",
    ]);
    expect(result.code).toBe(1);
    expect(result.stderr).toBe(`${result.file}:${result.base + 4}: long dash\n`);
    expect(result.stdout).toBe(`${REPORT}1 MR sections, 1 problems\n`);
  });

  it("treats a double-backtick span with a single backtick inside as code", async () => {
    const result = await runAppended([
      "Render ``a — b`c`` in the log line.",
    ]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(`${REPORT}1 MR sections, 0 problems\n`);
  });
});
