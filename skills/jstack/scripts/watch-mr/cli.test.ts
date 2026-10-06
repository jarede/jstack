import { describe, expect, it } from "bun:test";
import { type CliRuntime, main, parseArgs } from "./cli.ts";
import {
  fakeReader,
  passingCheck,
  pendingCheck,
} from "./fakes.test-helper.ts";
import { renderJson, renderPretty } from "./render.ts";
import type {
  CiClean,
  ForgeReader,
  ReadyMr,
  WatcherVerdict,
} from "./types.ts";
import { parseMrIid } from "./types.ts";

const silentIo = { stdout: () => {}, stderr: () => {} };
const cleanEnv = {};

function testRuntime(reader: ForgeReader): {
  readonly runtime: CliRuntime;
  readonly stdout: string[];
  readonly stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    runtime: {
      reader,
      clock: {
        now: () => 0,
        observedAt: () => "2026-07-26T00:00:00.000Z",
        async sleep() {
          throw new Error("test unexpectedly slept");
        },
      },
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
    },
  };
}

describe("parseArgs", () => {
  it("uses the specified defaults", () => {
    expect(parseArgs([], silentIo, cleanEnv)).toMatchObject({
      host: null,
      project: null,
      mr: null,
      mode: "single",
      stackMrs: [],
      statusOnly: false,
      pretty: false,
      bots: [],
      polling: {
        interval: 60,
        sweepInterval: 300,
        timeout: 0,
        maxQueryErrors: 5,
        allowDraft: false,
      },
    });
  });

  it("reads GITLAB_HOST from the injected env, not the ambient one", () => {
    expect(parseArgs([], silentIo, { GITLAB_HOST: "git.bistek.com.br" }).host).toBe(
      "git.bistek.com.br"
    );
    expect(parseArgs(["--host", "git.other.test"], silentIo, {
      GITLAB_HOST: "git.bistek.com.br",
    }).host).toBe("git.other.test");
  });

  it("parses a frozen queued stack bottom-to-top and collects bots", () => {
    const parsed = parseArgs(
      [
        "--queued-stack",
        "--stack-mrs",
        "!10, 11,!12",
        "--interval",
        "2.5",
        "--sweep-interval",
        "30",
        "--timeout",
        "0",
        "--max-query-errors",
        "3",
        "--allow-draft",
        "--pretty",
        "--bot",
        "duo",
        "--bot",
        "sast",
      ],
      silentIo,
      { JSTACK_REVIEW_BOTS: "secret-detection, duo" }
    );
    expect(parsed.mode).toBe("queued-stack");
    expect(parsed.stackMrs.map(Number)).toEqual([10, 11, 12]);
    expect(parsed.bots).toEqual(["duo", "sast", "secret-detection"]);
    expect(parsed.polling).toEqual({
      interval: 2.5,
      sweepInterval: 30,
      timeout: 0,
      maxQueryErrors: 3,
      allowDraft: true,
    });
    expect(parsed.pretty).toBe(true);
  });

  it("rejects every invalid mode and numeric shape as usage", async () => {
    const invalid = [
      ["--unknown"],
      ["--interval", "0"],
      ["--sweep-interval", "-1"],
      ["--timeout", "-1"],
      ["--max-query-errors", "1.5"],
      ["--stack", "--queued-stack"],
      ["--stack-mrs", "1,2"],
      ["--queued-stack", "--stack-mrs", "1,1"],
    ];
    for (const argv of invalid) {
      const harness = testRuntime(fakeReader());
      expect(await main(argv, harness.runtime, cleanEnv)).toBe(64);
      expect(harness.stdout).toEqual([]);
      expect(harness.stderr.join("")).toContain("error:");
    }
  });
});

describe("rendering", () => {
  const mr = {
    host: "git.example.test",
    path: "group/project",
    iid: parseMrIid(1),
  };
  const status = {
    schemaVersion: 1,
    sequence: 1,
    observedAt: "2026-07-26T00:00:00.000Z",
    mode: "single",
    kind: "STATUS",
    terminal: true,
    exitCode: 0,
    reason: "status-only",
    rows: [
      {
        kind: "merged",
        context: mr,
        facts: {
          context: mr,
          state: "merged",
          draft: false,
          detailedMergeStatus: "mergeable",
          mergeStatus: { kind: "ready" },
          hasConflicts: false,
          sha: "head",
          sourceBranch: "feature",
          targetBranch: "main",
          mergedAt: "now",
          headPipeline: null,
          blockingDiscussionsResolved: true,
        },
      },
    ],
  } satisfies WatcherVerdict;

  it("emits compact valid JSON by default", () => {
    const rendered = renderJson(status);
    expect(rendered.endsWith("\n")).toBe(true);
    expect(JSON.parse(rendered)).toEqual(status);
  });

  it("renders the Markdown table from the same verdict only", () => {
    const rendered = renderPretty(status);
    expect(rendered).toContain("| MR | CI | Review | Merge |");
    expect(rendered).toContain(
      "| [!1](https://git.example.test/group/project/-/merge_requests/1) | - | - | ✅ merged |"
    );
  });

  // Every verdict kind the watcher can end on, plus the two blocker branches
  // the GitLab port introduced. A renamed field here throws TypeError on a real
  // exit, which no other test reached.
  const envelope = {
    schemaVersion: 1,
    sequence: 1,
    observedAt: "2026-07-26T00:00:00.000Z",
    mode: "single",
  } as const;
  const cleanCi = {
    kind: "ci-clean",
    source: "pipeline-jobs",
    all: [passingCheck()],
    failed: [],
    pending: [],
    hadPreviousPassingCi: false,
    forge: { kind: "allowed", detailedMergeStatus: "mergeable" },
  } satisfies CiClean;
  const readyMr = {
    kind: "ready-mr",
    context: mr,
    proof: {
      mergeability: "clear",
      threads: [],
      ci: cleanCi,
      gate: { state: "opened", approval: "approved", draft: "not-draft" },
    },
  } satisfies ReadyMr;
  const thread = {
    id: "d1",
    firstNote: {
      authorUsername: "ada",
      body: "please fix\tthis",
      path: "a.ts",
      line: 4,
      createdAt: "t",
    },
    isReviewBot: false,
    botReviewPasses: 0,
  };
  const table: readonly (readonly [string, WatcherVerdict, string])[] = [
    [
      "READY",
      {
        ...envelope,
        kind: "READY",
        terminal: true,
        exitCode: 0,
        scope: { kind: "single", mr: readyMr },
      },
      "READY: no merge conflicts, no unresolved review threads",
    ],
    [
      "WAITING",
      {
        ...envelope,
        kind: "WAITING",
        terminal: false,
        frontier: mr,
        reason: { kind: "pending-checks", pending: [pendingCheck()] },
      },
      "WAITING: frontier=!1; 1 check pending",
    ],
    [
      "ADVANCE",
      {
        ...envelope,
        mode: "queued-stack",
        kind: "ADVANCE",
        terminal: false,
        merged: mr,
        frontier: { ...mr, iid: parseMrIid(2) },
        remaining: 2,
      },
      "ADVANCE: merged !1; next=!2; remaining=2",
    ],
    [
      "COMPLETE",
      {
        ...envelope,
        mode: "queued-stack",
        kind: "COMPLETE",
        terminal: true,
        exitCode: 0,
        queue: [mr],
        merged: [{ kind: "merged-mr", context: mr, mergedAt: "now" }],
      },
      "COMPLETE: queued stack merged (1 MR)",
    ],
    [
      "TIMEOUT",
      {
        ...envelope,
        kind: "TIMEOUT",
        terminal: true,
        exitCode: 5,
        reason: { kind: "pending-checks", pending: [pendingCheck()] },
      },
      "TIMEOUT: checks still pending",
    ],
    [
      "ci-forge-rejected",
      {
        ...envelope,
        kind: "BLOCKER",
        terminal: true,
        exitCode: 4,
        blocker: {
          kind: "failing-checks",
          mr,
          ci: {
            ...cleanCi,
            kind: "ci-forge-rejected",
            forge: {
              kind: "refused",
              detailedMergeStatus: "ci_must_pass",
              pipelineStatus: "failed",
            },
          },
        },
      },
      "pipelineStatus=failed",
    ],
    [
      "unknown-merge-status",
      {
        ...envelope,
        kind: "BLOCKER",
        terminal: true,
        exitCode: 6,
        blocker: {
          kind: "merge-gate",
          mr,
          reason: "unknown-merge-status",
          raw: "security_policy_violations",
        },
      },
      "BLOCKER: unknown-merge-status",
    ],
    [
      "review-threads",
      {
        ...envelope,
        kind: "BLOCKER",
        terminal: true,
        exitCode: 3,
        blocker: { kind: "review-threads", mr, threads: [thread] },
      },
      "BLOCKER: review-threads",
    ],
  ];
  for (const [name, verdict, expected] of table) {
    it(`renders ${name} in --pretty text`, () => {
      expect(renderPretty(verdict)).toContain(expected);
    });
  }

  // A comment body is untrusted data: a tab would shift every later column and
  // an escape sequence can rewrite the terminal.
  it("strips control characters out of a rendered comment body", () => {
    const rendered = renderPretty({
      ...envelope,
      kind: "BLOCKER",
      terminal: true,
      exitCode: 3,
      blocker: {
        kind: "review-threads",
        mr,
        threads: [
          {
            ...thread,
            firstNote: {
              ...thread.firstNote,
              body: "pwned\t\u001b]0;title\u0007\u007f done\nsecond line",
            },
          },
        ],
      },
    });
    expect(rendered).toContain("pwned  ]0;title   done");
    expect(rendered).not.toContain("\u001b");
    expect(rendered).not.toContain("\u007f");
    expect(rendered).not.toContain("\t");
  });
});

describe("main", () => {
  it("returns EX_USAGE 64 and writes usage errors only to stderr", async () => {
    const harness = testRuntime(fakeReader());
    expect(await main(["--interval", "0"], harness.runtime, cleanEnv)).toBe(64);
    expect(harness.stdout).toEqual([]);
    expect(harness.stderr.join("")).toContain(
      "option '--interval <seconds>' argument '0' is invalid"
    );
  });

  it("bypasses the queue machine for queued-stack status-only", async () => {
    const reader = fakeReader();
    const harness = testRuntime(reader);
    const code = await main(
      [
        "--project",
        "group/project",
        "--queued-stack",
        "--stack-mrs",
        "1",
        "--status-only",
      ],
      harness.runtime,
      cleanEnv
    );
    expect(code).toBe(0);
    expect(harness.stdout).toHaveLength(1);
    const verdict: unknown = JSON.parse(harness.stdout[0] ?? "");
    expect(verdict).toMatchObject({
      kind: "STATUS",
      terminal: true,
      exitCode: 0,
      mode: "queued-stack",
    });
    expect(harness.stdout[0]).not.toContain('"kind":"QUEUE"');
  });

  it("returns exit 4 for a hidden forge-side CI refusal", async () => {
    const reader = fakeReader({
      facts: {
        detailedMergeStatus: "ci_must_pass",
        mergeStatus: { kind: "pipeline-wait", raw: "ci_must_pass" },
        headPipeline: { id: 7, status: "failed", projectId: null },
      },
      jobs: [passingCheck()],
      pipelines: [{ id: 7, sha: "head", status: "failed" }],
    });
    const harness = testRuntime(reader);
    const code = await main(
      ["--project", "group/project", "--mr", "1"],
      harness.runtime,
      cleanEnv
    );
    expect(code).toBe(4);
    expect(harness.stdout).toHaveLength(1);
    expect(JSON.parse(harness.stdout[0] ?? "")).toMatchObject({
      kind: "BLOCKER",
      exitCode: 4,
      blocker: {
        kind: "failing-checks",
        ci: { kind: "ci-forge-rejected" },
      },
    });
  });

  it("shows help without touching the reader", async () => {
    const reader = fakeReader();
    const harness = testRuntime(reader);
    expect(await main(["--help"], harness.runtime, cleanEnv)).toBe(0);
    const help = harness.stdout.join("");
    expect(help).toContain("JSON (NDJSON while polling)");
    expect(help).toContain("--project");
    expect(help).toContain("--mr");
    expect(help).toContain("--stack-mrs");
    expect(help).toContain("--bot");
    expect(help).toContain("--queued-stack");
    expect(reader.calls).toEqual([]);
  });
});
