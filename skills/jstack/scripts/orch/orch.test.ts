import { afterEach, describe, expect, it } from "bun:test";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NotFoundError,
  UserError,
  openStore,
  parseVerdict,
  type OpenStoreOptions,
  type Store,
} from "./store.ts";

const SCRIPT = join(import.meta.dir, "orch.ts");
const directories: string[] = [];
const handles: Store[] = [];

interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function makeDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "orch-test-"));
  directories.push(directory);
  return directory;
}

function useStore(
  directory: string,
  options?: OpenStoreOptions
): Store {
  const store = openStore(directory, options);
  handles.push(store);
  return store;
}

async function initializedStore(
  options?: OpenStoreOptions
): Promise<{
  readonly directory: string;
  readonly store: Store;
}> {
  const directory = await makeDirectory();
  const store = useStore(directory, options);
  await store.init();
  return { directory, store };
}

function git({
  args,
  repo,
}: {
  args: readonly string[];
  repo: string;
}): string {
  const result = Bun.spawnSync(["git", "-C", repo, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr.toString()}`
    );
  }
  return result.stdout.toString().trim();
}

async function makeGitStack(
  directory: string,
  options: {
    /** Leave these branches as origin remote refs only, with no local branch. */
    readonly remoteOnly?: readonly string[];
    /** End on this branch instead of the last one created. */
    readonly checkout?: string;
  } = {}
): Promise<{
  readonly repo: string;
  readonly bottomSha: string;
  readonly middleSha: string;
  readonly topSha: string;
}> {
  const repo = join(directory, "repo");
  await mkdir(repo);
  git({ repo, args: ["init", "--initial-branch=main"] });
  git({ repo, args: ["config", "user.name", "Orch Test"] });
  git({ repo, args: ["config", "user.email", "orch@example.com"] });
  git({
    repo,
    args: ["remote", "add", "origin", "git@git.example.test:group/stack.git"],
  });
  await writeFile(join(repo, "main.txt"), "main\n");
  git({ repo, args: ["add", "."] });
  git({ repo, args: ["commit", "-m", "main"] });

  const branches = ["stack/bottom", "stack/middle", "stack/top"];
  for (const [index, branch] of branches.entries()) {
    git({ repo, args: ["checkout", "-b", branch] });
    await writeFile(join(repo, `stack-${index}.txt`), `${branch}\n`);
    git({ repo, args: ["add", "."] });
    git({ repo, args: ["commit", "-m", branch] });
  }

  const shas = {
  bottomSha: git({ repo, args: ["rev-parse", "stack/bottom"] }),
  middleSha: git({ repo, args: ["rev-parse", "stack/middle"] }),
  topSha: git({ repo, args: ["rev-parse", "stack/top"] }),
};
  git({ repo, args: ["checkout", options.checkout ?? "stack/top"] });

  // A stack branch discovered from GitLab can exist only on the remote, pushed
  // from another clone or by a teammate. `git rev-parse <bare name>` resolves
  // neither refs/heads/<b> nor refs/remotes/origin/<b>, so the local ref is
  // replaced by the remote one.
  for (const branch of options.remoteOnly ?? []) {
    git({ repo, args: ["update-ref", `refs/remotes/origin/${branch}`, `refs/heads/${branch}`] });
    git({ repo, args: ["checkout", "main"] });
    git({ repo, args: ["branch", "-D", branch] });
  }
  if ((options.remoteOnly ?? []).length > 0)
    git({ repo, args: ["checkout", options.checkout ?? "main"] });

  return { repo, ...shas };
}

const OPEN_MRS = [
  { iid: 10, source_branch: "stack/bottom", target_branch: "main" },
  { iid: 13, source_branch: "stack/middle", target_branch: "stack/bottom" },
  { iid: 11, source_branch: "stack/top", target_branch: "stack/middle" },
];

async function withFakeGlab<T>({
  directory,
  operation,
  listOutput,
}: {
  directory: string;
  operation: () => Promise<T>;
  listOutput?: string;
}): Promise<T> {
  const bin = join(directory, "bin");
  const repo = realpathSync(join(directory, "repo"));
  await mkdir(bin);
  const glab = join(bin, "glab");
  await writeFile(
    glab,
    `#!/usr/bin/env bash
set -euo pipefail
if [ "$(pwd -P)" != "${repo}" ]; then
  printf 'glab ran outside the fixture repo: %s\\n' "$(pwd -P)" >&2
  exit 2
fi
case "$*" in
  *"/merge_requests?state=opened&per_page=100"*)
    cat <<'JSON'
${listOutput ?? JSON.stringify(OPEN_MRS)}
JSON
    ;;
  *"projects/group%2Fstack"*)
    printf '{"default_branch":"main"}\\n'
    ;;
  *"/merge_requests/"*)
    printf 'unexpected glab arguments: %s\\n' "$*" >&2
    exit 2
    ;;
  *)
    printf 'unexpected glab arguments: %s\\n' "$*" >&2
    exit 2
    ;;
esac
`
  );
  await chmod(glab, 0o755);

  const originalPath = process.env.PATH;
  process.env.PATH = `${bin}:${originalPath ?? ""}`;
  try {
    return await operation();
  } finally {
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }
  }
}

function runCli(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env
): RunResult {
  const result = Bun.spawnSync([process.execPath, SCRIPT, ...args], { env });
  return {
    code: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

afterEach(async () => {
  for (const store of handles.splice(0).reverse()) {
    await store.close();
  }
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("Store", () => {
  it("initializes an idempotent plain-file store and releases its lock", async () => {
    const directory = await makeDirectory();
    const store = useStore(directory);

    expect(await store.init()).toEqual({ store: directory });
    const firstUnits = await readFile(join(directory, "units.tsv"), "utf8");
    const firstLedger = await readFile(
      join(directory, "ledger.tsv"),
      "utf8"
    );

    expect(await store.init()).toEqual({ store: directory });
    expect(await readFile(join(directory, "units.tsv"), "utf8")).toBe(
      firstUnits
    );
    expect(await readFile(join(directory, "ledger.tsv"), "utf8")).toBe(
      firstLedger
    );
    expect((await readdir(directory)).sort()).toEqual([
      ".orch.lock",
      "frontier.json",
      "gates.md",
      "inbox",
      "ledger.tsv",
      "preferences.md",
      "units.tsv",
    ]);

    await store.close();
    expect(await readdir(directory)).not.toContain(".orch.lock");
  });

  it("composes unit add, set, get, list, and counts", async () => {
    const { store } = await initializedStore();

    expect(
      await store.units.add({
        id: "u1",
        track: "build",
        brief: "briefs/u1.md",
      })
    ).toMatchObject({ id: "u1", state: "pending" });
    expect(
      await store.units.add({ id: "=SUM(A1)", track: "+build" })
    ).toMatchObject({ id: "'=SUM(A1)", track: "'+build" });

    const updated = await store.units.set({
      id: "u1",
      state: "done",
      branch: "poteto/u1",
      pr: 184530,
      sha: "abc123",
    });
    expect(updated).toEqual({
      id: "u1",
      track: "build",
      state: "done",
      branch: "poteto/u1",
      pr: "184530",
      sha: "abc123",
      brief: "briefs/u1.md",
    });
    expect(await store.units.get("u1")).toEqual(updated);
    expect(
      await store.units.list({ state: "done", track: "build" })
    ).toEqual([updated]);
    expect(await store.units.counts()).toEqual({ done: 1, pending: 1 });
    await expect(
      store.units.add({ id: "u1", track: "build" })
    ).rejects.toThrow("unit u1 already exists");
    await expect(
      store.units.set({ id: "missing", state: "done" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("records, replaces, checks, and summarizes typed ledger verdicts", async () => {
    const { store } = await initializedStore();

    try {
      await store.ledger.check({ pr: 184530, sha: "abc123" });
      throw new Error("expected ledger check to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      if (error instanceof NotFoundError) {
        expect(error.output).toEqual({
          compact: "NOT-VERIFIED",
          json: {
            pr: "184530",
            sha: "abc123",
            verdict: "NOT-VERIFIED",
          },
        });
      }
    }
    expect(() => parseVerdict("looks-good")).toThrow("verdict must be");

    const recorded = await store.ledger.record({
      pr: 184530,
      sha: "abc123",
      verdict: "unit-test-verified",
      evidence: "reports/verify.md",
      verifier: "opus",
    });
    expect(await store.ledger.check({ pr: 184530, sha: "abc123" })).toEqual(
      recorded
    );
    expect(await store.ledger.summary()).toEqual({
      "unit-test-verified": 1,
    });

    await store.ledger.record({
      pr: 184530,
      sha: "abc123",
      verdict: "live-ui-verified",
      evidence: "reports/live.md",
    });
    expect(await store.ledger.summary()).toEqual({
      "live-ui-verified": 1,
    });
  });

  it("pushes, peeks, and atomically drains inbox pointers", async () => {
    const { directory, store } = await initializedStore();

    const first = await store.inbox.push({
      agent: "worker-1",
      unit: "u1",
      status: "done",
      report: "reports/u1.md",
    });
    expect(first.pointer).toMatchObject({ unit: "u1", status: "done" });
    expect(first.filename).toEndWith(".tsv");
    await store.inbox.push({
      agent: "worker-2",
      unit: "u2",
      status: "failed",
    });

    expect(await store.inbox.count()).toBe(2);
    expect(await store.inbox.peek()).toHaveLength(2);
    expect(await store.inbox.count()).toBe(2);
    expect(await store.inbox.drain()).toHaveLength(2);
    expect(await store.inbox.count()).toBe(0);
    expect(await readdir(join(directory, "inbox"))).toEqual([]);
    expect(
      (await readdir(directory)).filter((name) =>
        name.startsWith(".inbox-drain-")
      )
    ).toEqual([]);
  });

  it("replaces a stale lock whose holder pid is dead", async () => {
    const { directory } = await initializedStore();
    const exited = Bun.spawn(["true"]);
    await exited.exited;
    await writeFile(join(directory, ".orch.lock"), `${exited.pid}\n`);

    const stale: string[] = [];
    const recovered = useStore(directory, {
      onStaleLock: (holder) => stale.push(holder),
    });
    expect(
      await recovered.units.add({ id: "u1", track: "build" })
    ).toMatchObject({ id: "u1" });
    expect(stale).toEqual([String(exited.pid)]);
    await recovered.close();
    expect(await readdir(directory)).not.toContain(".orch.lock");
  });

  it("blocks a writer and steals the pid lock only with force", async () => {
    const { directory, store } = await initializedStore();
    await store.close();
    await writeFile(join(directory, ".orch.lock"), `${process.pid}\n`);

    const blocked = useStore(directory);
    await expect(
      blocked.units.add({ id: "u1", track: "build" })
    ).rejects.toThrow(`store lock held by pid ${process.pid}`);

    const stolen: string[] = [];
    const forced = useStore(directory, {
      force: true,
      onLockStolen: (holder) => stolen.push(holder),
    });
    expect(
      await forced.units.add({ id: "u1", track: "build" })
    ).toMatchObject({ id: "u1" });
    expect(stolen).toEqual([String(process.pid)]);
    await forced.close();
    expect(await readdir(directory)).not.toContain(".orch.lock");
  });

  it("parks gates, stores standing orders, and renders status", async () => {
    const { directory, store } = await initializedStore();
    await store.units.add({ id: "u1", track: "build" });
    expect(
      await store.gates.park({
        id: "release",
        question: "Ship now?",
        options: "ship,wait",
        defaultAnswer: "wait",
      })
    ).toMatchObject({ kind: "open", id: "release" });
    expect(
      await store.standing.add({ line: "Never force push." })
    ).toEqual({ number: 1, line: "Never force push." });

    const first = await store.status.render();
    expect(first.changed).toBe("first render");
    expect(first.summary.openGateIds).toEqual(["release"]);
    expect(await readFile(join(directory, "status.md"), "utf8")).toContain(
      "| release | open | Ship now? |"
    );
    expect((await store.status.render()).changed).toBe("no derived changes");

    expect(
      await store.gates.resolve({ id: "release", answer: "ship" })
    ).toMatchObject({ kind: "resolved", answer: "ship" });
    expect((await store.status.render()).changed).toBe("open gates 1->0");
    expect(await store.gates.list()).toEqual([]);
    expect(await store.standing.show()).toEqual([
      { number: 1, line: "Never force push." },
    ]);
  });

  it("resolves the ordered GitLab frontier and validates an optional pin", async () => {
    const { directory, store } = await initializedStore();
    const stack = await makeGitStack(directory);

    await withFakeGlab({
      directory,
      operation: async () => {
        expect(await store.frontier.set({ repo: stack.repo })).toEqual({
          generation: 1,
          prs: [
            {
              pr: 10,
              branches: "stack/bottom",
              sha: stack.bottomSha,
              state: "OPEN",
            },
            {
              pr: 13,
              branches: "stack/middle",
              sha: stack.middleSha,
              state: "OPEN",
            },
            {
              pr: 11,
              branches: "stack/top",
              sha: stack.topSha,
              state: "OPEN",
            },
          ],
          lowestUnmerged: 10,
        });
        expect(
          (
            await store.frontier.set({
              repo: stack.repo,
              project: "group/stack",
              prs: [10, 13, 11],
            })
          ).generation
        ).toBe(2);
        expect((await store.frontier.show()).generation).toBe(2);
        await expect(
          store.frontier.set({
            repo: stack.repo,
            prs: [10, 11, 12],
          })
        ).rejects.toThrow(
          "frontier pin mismatch: missing from glab: 12; extra in glab: 13"
        );
        await expect(
          store.frontier.set({
            repo: stack.repo,
            prs: [13, 10, 11],
          })
        ).rejects.toThrow(
          "frontier pin mismatch: order differs: expected 13,10,11; glab 10,13,11"
        );
        await expect(
          store.frontier.set({
            repo: stack.repo,
            prs: [10, 10],
          })
        ).rejects.toThrow("--prs must not contain duplicates");
      },
    });
  });

  // Shipping runs frontier set from the default branch, where the stack root
  // lives, and again after the bottom MR merged and its branch was deleted.
  // No open MR has source_branch: "main", so requiring one as the seed made
  // the command unusable at the moment it matters most.
  it("discovers the stack from the default branch with no open MR for the current branch", async () => {
    const { directory, store } = await initializedStore();
    const stack = await makeGitStack(directory, { checkout: "main" });

    await withFakeGlab({
      directory,
      operation: async () => {
        expect((await store.frontier.set({ repo: stack.repo })).prs).toEqual([
          { pr: 10, branches: "stack/bottom", sha: stack.bottomSha, state: "OPEN" },
          { pr: 13, branches: "stack/middle", sha: stack.middleSha, state: "OPEN" },
          { pr: 11, branches: "stack/top", sha: stack.topSha, state: "OPEN" },
        ]);
      },
    });
  });

  it("resolves a stack branch that exists only on the remote", async () => {
    const { directory, store } = await initializedStore();
    const stack = await makeGitStack(directory, { remoteOnly: ["stack/top"] });

    await withFakeGlab({
      directory,
      operation: async () => {
        expect((await store.frontier.set({ repo: stack.repo })).prs).toEqual([
          { pr: 10, branches: "stack/bottom", sha: stack.bottomSha, state: "OPEN" },
          { pr: 13, branches: "stack/middle", sha: stack.middleSha, state: "OPEN" },
          { pr: 11, branches: "stack/top", sha: stack.topSha, state: "OPEN" },
        ]);
      },
    });
  });

  it("reports a branch that resolves to nothing, naming both refs it tried", async () => {
    const { directory, store } = await initializedStore();
    const stack = await makeGitStack(directory, {
      checkout: "main",
      remoteOnly: ["stack/bottom"],
    });
    git({ repo: stack.repo, args: ["update-ref", "-d", "refs/remotes/origin/stack/bottom"] });

    await withFakeGlab({
      directory,
      operation: async () => {
        await expect(store.frontier.set({ repo: stack.repo })).rejects.toThrow(
          /tried refs\/heads\/stack\/bottom, refs\/remotes\/origin\/stack\/bottom/
        );
      },
    });
  });

  it("does not linearise siblings and never roots a stack at a develop release", async () => {
    const notes: string[] = [];
    const { directory, store } = await initializedStore({
      onStackExcluded: (detail) => notes.push(detail),
    });
    const stack = await makeGitStack(directory, { checkout: "main" });

    await withFakeGlab({
      directory,
      listOutput: JSON.stringify([
        ...OPEN_MRS,
        { iid: 5, source_branch: "develop", target_branch: "main" },
        { iid: 20, source_branch: "stack/sibling", target_branch: "stack/bottom" },
      ]),
      operation: async () => {
        // !20 shares target_branch stack/bottom with !13, so it is a second
        // stack, and !5 is a release into main, not a feature root.
        expect((await store.frontier.set({ repo: stack.repo })).prs).toEqual([
          { pr: 10, branches: "stack/bottom", sha: stack.bottomSha, state: "OPEN" },
          { pr: 13, branches: "stack/middle", sha: stack.middleSha, state: "OPEN" },
          { pr: 11, branches: "stack/top", sha: stack.topSha, state: "OPEN" },
        ]);
      },
    });

    expect(notes.join("\n")).toContain("!20 sibling");
    expect(notes.join("\n")).toContain("!5 release into main");
  });

  it("fails when no open merge request targets the default branch", async () => {
    const { directory, store } = await initializedStore();
    const stack = await makeGitStack(directory, { checkout: "main" });

    await withFakeGlab({
      directory,
      listOutput: JSON.stringify([
        { iid: 11, source_branch: "stack/middle", target_branch: "stack/bottom" },
      ]),
      operation: async () => {
        await expect(store.frontier.set({ repo: stack.repo })).rejects.toThrow(
          "glab stack discovery failed: no open merge request targets main in group/stack"
        );
      },
    });
  });

  it("rejects unparseable glab output loudly", async () => {
    const { directory, store } = await initializedStore();
    const stack = await makeGitStack(directory);

    await withFakeGlab({
      directory,
      listOutput: "this line is not GitLab output",
      operation: async () => {
        await expect(store.frontier.set({ repo: stack.repo })).rejects.toThrow(
          "glab stack discovery failed: glab merge request list"
        );
      },
    });
  });

  it("rejects malformed TSV, verdict, frontier, and inbox data", async () => {
    const { directory, store } = await initializedStore();

    await writeFile(join(directory, "units.tsv"), "wrong\n");
    await expect(store.units.list()).rejects.toThrow(
      "units.tsv has an invalid header"
    );
    await writeFile(
      join(directory, "units.tsv"),
      "id\ttrack\tstate\tbranch\tpr\tsha\tbrief\nshort\trow\n"
    );
    await expect(store.units.list()).rejects.toThrow(
      "units.tsv has a malformed row"
    );

    await writeFile(
      join(directory, "ledger.tsv"),
      "pr\tsha\tverdict\tevidence\tverifier\tts\n1\tsha\tinvalid\treport\tme\tnow\n"
    );
    await expect(store.ledger.summary()).rejects.toThrow(
      "ledger.tsv has invalid verdict invalid"
    );

    await writeFile(join(directory, "frontier.json"), '{"generation":"1"}\n');
    await expect(store.frontier.show()).rejects.toThrow(
      "frontier.json has an invalid shape"
    );

    await writeFile(join(directory, "inbox", "bad.tsv"), "too\tshort\n");
    await expect(store.inbox.peek()).rejects.toThrow(
      "inbox pointer bad.tsv is malformed"
    );
  });

  it("rejects operations after close", async () => {
    const { store } = await initializedStore();
    await store.close();
    await expect(store.units.list()).rejects.toThrow("store is closed");
    await expect(store.status.render()).rejects.toBeInstanceOf(UserError);
  });
});

describe("orch CLI", () => {
  it("prints commander help and rejects invalid parsing with exit 1", async () => {
    const help = runCli(["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("Commands:");
    expect(help.stdout).toContain("unit");
    expect(help.stdout).toContain("ledger");

    const frontierHelp = runCli(["frontier", "set", "--help"]);
    expect(frontierHelp.code).toBe(0);
    expect(frontierHelp.stdout).toContain("--repo <dir>");
    expect(frontierHelp.stdout).toContain("--project <group/project>");
    expect(frontierHelp.stdout).toContain("--prs <n,...>");

    const directory = await makeDirectory();
    const invalid = runCli(["--store", directory, "unit", "add", "u1"]);
    expect(invalid.code).toBe(1);
    expect(invalid.stderr).toContain("required option '--track <track>'");
  });

  it("accepts ORCH_STORE and emits complete JSON", async () => {
    const directory = await makeDirectory();
    const env = { ...process.env, ORCH_STORE: directory };
    expect(runCli(["init"], env).code).toBe(0);

    const added = runCli(
      ["unit", "add", "u1", "--track", "build", "--json"],
      env
    );
    expect(added.code).toBe(0);
    expect(JSON.parse(added.stdout)).toEqual({
      id: "u1",
      track: "build",
      state: "pending",
      branch: "",
      pr: "",
      sha: "",
      brief: "",
    });
  });

  it("maps user and not-found outcomes to the preserved exit codes", async () => {
    const directory = await makeDirectory();
    expect(runCli(["--store", directory, "init"]).code).toBe(0);

    const missingRepo = runCli([
      "--store",
      directory,
      "frontier",
      "set",
    ]);
    expect(missingRepo.code).toBe(1);
    expect(missingRepo.stderr).toContain(
      "set --repo <dir> or ORCH_REPO"
    );

    const userError = runCli([
      "--store",
      directory,
      "unit",
      "add",
      "",
      "--track",
      "build",
    ]);
    expect(userError.code).toBe(1);
    expect(userError.stderr).toContain("unit id must not be empty");

    const missingUnit = runCli([
      "--store",
      directory,
      "unit",
      "get",
      "missing",
    ]);
    expect(missingUnit.code).toBe(2);
    expect(missingUnit.stderr).toContain("unit missing not found");

    const missingLedger = runCli([
      "--store",
      directory,
      "--json",
      "ledger",
      "check",
      "184530",
      "abc123",
    ]);
    expect(missingLedger.code).toBe(2);
    expect(JSON.parse(missingLedger.stdout)).toEqual({
      pr: "184530",
      sha: "abc123",
      verdict: "NOT-VERIFIED",
    });
    expect(missingLedger.stderr).toBe("");
  });
});
