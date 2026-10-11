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
});
