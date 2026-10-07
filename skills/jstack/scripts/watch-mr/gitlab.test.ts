import { describe, expect, it } from "bun:test";
import {
  ChecksUnavailable,
  WatcherQueryError,
  discoverStack,
  glabApiArgv,
  latestJobAttempts,
  mapDetailedMergeStatus,
  mapJob,
  mergeTrainAbsent,
  orderStack,
  parseApprovals,
  parseDiscussions,
  parseMergeRequest,
  parseProjectRemote,
  resolveChecks,
  resolveContext,
  type CommandRunner,
} from "./gitlab.ts";
import { GlabForgeReader } from "./gitlab.ts";
import { fakeReader, passingCheck } from "./fakes.test-helper.ts";
import {
  DETAILED_MERGE_STATUS_MAP,
  parseMrIid,
  type OpenMergeRequest,
} from "./types.ts";

const context = {
  host: "git.example.test",
  path: "group/sub/project",
  iid: parseMrIid(42),
};

const rawMergeRequest = {
  state: "opened",
  draft: false,
  detailed_merge_status: "mergeable",
  has_conflicts: false,
  sha: "abc",
  source_branch: "feature",
  target_branch: "main",
  merged_at: null,
  head_pipeline: { id: 7, status: "success" },
  blocking_discussions_resolved: true,
};

describe("detailed_merge_status mapping", () => {
  it("maps every named status and keeps an unknown raw value", () => {
    for (const [status, kind] of DETAILED_MERGE_STATUS_MAP) {
      expect(mapDetailedMergeStatus(status).kind).toBe(kind);
    }
    expect(mapDetailedMergeStatus("security_policy_violations")).toEqual({
      kind: "unknown",
      raw: "security_policy_violations",
    });
    expect(mapDetailedMergeStatus("MERGEABLE").kind).toBe("ready");
  });
});

describe("job mapping", () => {
  it("does not block on allow_failure and fails closed on an unknown status", () => {
    expect(
      mapJob({
        name: "lint",
        stage: "test",
        status: "failed",
        allow_failure: true,
      }).kind
    ).toBe("skipped");
    expect(
      mapJob({
        name: "lint",
        stage: "test",
        status: "canceled",
        allow_failure: false,
      }).kind
    ).toBe("failed");
    expect(
      mapJob({
        name: "deploy",
        stage: "deploy",
        status: "manual",
        allow_failure: false,
      }).kind
    ).toBe("pending");
    expect(
      mapJob({ name: "mystery", stage: "test", status: "future" }).kind
    ).toBe("failed");
    expect(
      mapJob({ name: "unit", stage: "test", status: "success" })
    ).toMatchObject({ kind: "passed", reportedState: "success" });
  });

  // GitLab reports these three for a job that has a runner slot pending and has
  // not run a script. They were failing closed, which ended watch-mr at exit 4
  // naming a job that had not started.
  it("treats every queued job status as pending", () => {
    for (const status of ["scheduled", "preparing", "waiting_for_resource"]) {
      expect(
        mapJob({ name: "unit: [1]", stage: "test", status, allow_failure: false })
      ).toMatchObject({ kind: "pending", reportedState: status });
    }
    expect(
      mapJob({
        name: "deploy",
        stage: "deploy",
        status: "scheduled",
        allow_failure: true,
      }).kind
    ).toBe("pending");
  });
});

describe("merge request parsing", () => {
  it("reads GitLab fields and rejects an unknown lifecycle state", () => {
    expect(parseMergeRequest(rawMergeRequest, context)).toMatchObject({
      state: "opened",
      sourceBranch: "feature",
      targetBranch: "main",
      mergeStatus: { kind: "ready" },
      headPipeline: { id: 7, status: "success" },
    });
    expect(() =>
      parseMergeRequest({ ...rawMergeRequest, state: "future" }, context)
    ).toThrow(WatcherQueryError);
  });
});

describe("discussions", () => {
  it("reads resolution from the first note and display from the first human note", () => {
    const threads = parseDiscussions(
      [
        {
          // GitLab puts resolvable/resolved on note 0 and appends
          // "changed this line in version N of the diff" as a system note
          // inside the same discussion. Replies carry resolvable: false.
          id: "sys",
          notes: [
            {
              id: 1,
              body: "changed this line in version 2 of the diff",
              system: true,
              resolvable: true,
              resolved: false,
              author: { username: "root" },
              created_at: "t",
            },
            {
              id: 2,
              body: "please fix",
              system: false,
              resolvable: false,
              resolved: false,
              author: { username: "review-bot" },
              created_at: "t",
              position: { new_path: "a.ts", new_line: 4 },
            },
          ],
        },
        {
          id: "done",
          notes: [
            {
              id: 3,
              body: "pass",
              system: false,
              resolvable: true,
              resolved: true,
              author: { username: "review-bot" },
              created_at: "t",
            },
          ],
        },
        {
          id: "human",
          notes: [
            {
              id: 4,
              body: "lgtm",
              system: false,
              resolvable: false,
              resolved: false,
              author: { username: "ada" },
              created_at: "t",
            },
          ],
        },
      ],
      ["review-bot"]
    );
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      id: "sys",
      isReviewBot: true,
      botReviewPasses: 2,
      firstNote: { authorUsername: "review-bot", path: "a.ts", line: 4 },
    });
  });

  it("does not block on a system-first discussion whose first note is not resolvable", () => {
    expect(
      parseDiscussions([
        {
          id: "sys-only",
          notes: [
            {
              id: 1,
              body: "added 1 commit",
              system: true,
              resolvable: false,
              resolved: false,
              author: { username: "root" },
              created_at: "t",
            },
            {
              id: 2,
              body: "please fix",
              system: false,
              resolvable: false,
              resolved: false,
              author: { username: "ada" },
              created_at: "t",
            },
          ],
        },
      ])
    ).toEqual([]);
  });
});

describe("project path and stack order", () => {
  it("parses subgroup remotes and URL-encodes the API path", () => {
    expect(
      parseProjectRemote("git@git.example.test:group/sub/project.git")
    ).toEqual({ host: "git.example.test", path: "group/sub/project" });
    expect(
      parseProjectRemote("https://git.example.test/group/sub/project.git")
    ).toEqual({ host: "git.example.test", path: "group/sub/project" });
    expect(glabApiArgv(context, "projects/group%2Fsub%2Fproject", true)).toEqual([
      "glab",
      "api",
      "--hostname",
      "git.example.test",
      "--paginate",
      "projects/group%2Fsub%2Fproject",
    ]);
  });
});

describe("stack discovery", () => {
  const mr = (
    iid: number,
    sourceBranch: string,
    targetBranch: string
  ): OpenMergeRequest => ({
    iid: parseMrIid(iid),
    sourceBranch,
    targetBranch,
  });
  const cases: readonly {
    readonly name: string;
    readonly open: readonly OpenMergeRequest[];
    readonly defaultBranch?: string;
    readonly preferred?: string | null;
    readonly iid?: number;
    readonly stack: readonly number[];
    readonly siblings?: readonly number[];
    readonly releases?: readonly number[];
    readonly cycles?: readonly number[];
  }[] = [
    {
      name: "a linear stack walks children down from the default branch",
      open: [
        mr(41, "base-feature", "main"),
        mr(42, "feature", "base-feature"),
        mr(43, "upstack", "feature"),
      ],
      stack: [41, 42, 43],
    },
    {
      name: "siblings are reported, not linearised into one stack",
      open: [mr(10, "a", "main"), mr(20, "b", "a"), mr(30, "c", "a")],
      preferred: "b",
      iid: 20,
      stack: [10, 20],
      siblings: [30],
    },
    {
      name: "a sibling with children of its own is still reported",
      open: [
        mr(10, "a", "main"),
        mr(20, "b", "a"),
        mr(21, "b2", "b"),
        mr(30, "c", "a"),
        mr(31, "c2", "c"),
      ],
      preferred: "b",
      iid: 20,
      stack: [10, 20, 21],
      siblings: [30],
    },
    {
      name: "a second root is a sibling, never appended to the chain",
      open: [
        mr(10, "a", "main"),
        mr(11, "a2", "a"),
        mr(99, "other", "main"),
      ],
      preferred: "a",
      iid: 10,
      stack: [10, 11],
      siblings: [99],
    },
    {
      name: "a two-cycle stops instead of looping forever",
      open: [mr(10, "a", "main"), mr(11, "b", "a"), mr(12, "a", "b")],
      preferred: "b",
      iid: 11,
      stack: [10, 11, 12],
      cycles: [11],
    },
    {
      name: "a three-cycle stops at the merge request it returns to",
      open: [
        mr(10, "a", "main"),
        mr(11, "b", "a"),
        mr(12, "c", "b"),
        mr(13, "a", "c"),
      ],
      preferred: "c",
      iid: 12,
      stack: [10, 11, 12, 13],
      cycles: [11],
    },
    {
      name: "a missing seed still discovers the stack from the default branch",
      open: [mr(10, "a", "main"), mr(11, "a2", "a")],
      preferred: "main",
      iid: 999,
      stack: [10, 11],
    },
    {
      name: "a develop release is not the root of a feature stack",
      open: [
        mr(5, "develop", "main"),
        mr(10, "a", "develop"),
        mr(20, "b", "a"),
      ],
      preferred: "b",
      iid: 20,
      stack: [10, 20],
      releases: [5],
    },
    {
      name: "the lowest root is preferred when the branch is in none of them",
      open: [mr(10, "a", "main"), mr(99, "other", "main")],
      preferred: "unrelated",
      iid: 999,
      stack: [10],
      siblings: [99],
    },
    {
      name: "an MR targeting another branch is not a root at all",
      open: [mr(10, "a", "main"), mr(15, "side", "release")],
      preferred: "a",
      iid: 10,
      stack: [10],
      siblings: [],
      releases: [],
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      const ordered = orderStack({
        context: { ...context, iid: parseMrIid(testCase.iid ?? context.iid) },
        open: testCase.open,
        defaultBranch: testCase.defaultBranch ?? "main",
        preferredBranch: testCase.preferred ?? null,
      });
      expect(ordered.stack.map((item) => Number(item.iid))).toEqual([
        ...testCase.stack,
      ]);
      expect(ordered.siblings.map(Number)).toEqual([...(testCase.siblings ?? [])]);
      expect(ordered.releases.map(Number)).toEqual([
        ...(testCase.releases ?? []),
      ]);
      expect(ordered.cycles.map(Number)).toEqual([...(testCase.cycles ?? [])]);
    });
  }

  it("fails only when no open merge request targets the default branch", () => {
    expect(() =>
      orderStack({
        context,
        open: [mr(10, "a", "develop"), mr(20, "b", "a")],
        defaultBranch: "main",
        preferredBranch: "b",
      })
    ).toThrow("no open merge request targets main in group/sub/project");
    expect(() =>
      orderStack({ context, open: [], defaultBranch: "main" })
    ).toThrow("no open merge request in group/sub/project");
    expect(
      orderStack({
        context,
        open: [mr(10, "a", "main")],
        defaultBranch: "main",
        preferredBranch: "not-a-branch",
      }).stack.map((item) => Number(item.iid))
    ).toEqual([10]);
  });

  it("treats a configured integration branch as a release too", () => {
    const ordered = orderStack({
      context,
      open: [mr(5, "trunk-next", "main"), mr(10, "a", "trunk-next")],
      defaultBranch: "main",
      preferredBranch: "a",
      integrationBases: ["trunk-next"],
    });
    expect(ordered.stack.map((item) => Number(item.iid))).toEqual([10]);
    expect(ordered.releases.map(Number)).toEqual([5]);
  });
});

describe("checks and trains", () => {
  it("reads pipeline jobs and synthesizes a wait when the pipeline has not started", async () => {
    const reader = fakeReader({ jobs: [passingCheck("unit")] });
    const read = await resolveChecks(reader, {
      ...(await reader.mergeRequest(context)),
      context,
    });
    expect(read.source).toBe("pipeline-jobs");
    expect(read.checks.map((check) => check.name)).toEqual(["unit"]);

    const waiting = await resolveChecks(reader, {
      ...(await reader.mergeRequest(context)),
      context,
      headPipeline: null,
      detailedMergeStatus: "ci_still_running",
      mergeStatus: { kind: "pipeline-wait", raw: "ci_still_running" },
    });
    expect(waiting.checks[0]).toMatchObject({ kind: "pending", name: "pipeline" });
    expect(reader.calls).toEqual(["mergeRequest", "pipelineJobs", "mergeRequest"]);
  });

  it("fails closed when a settled pipeline has no jobs", async () => {
    const reader = fakeReader({ jobs: [] });
    const facts = await reader.mergeRequest(context);
    await expect(resolveChecks(reader, facts)).rejects.toBeInstanceOf(
      ChecksUnavailable
    );
  });

  it("treats an endpoint-level 403 or 404 as an absent queue", async () => {
    expect(
      mergeTrainAbsent({ code: 1, stdout: "", stderr: "glab: HTTP 404" })
    ).toBe(true);
    expect(
      mergeTrainAbsent({ code: 1, stdout: '{"message":"403 Forbidden"}', stderr: "" })
    ).toBe(true);
    expect(mergeTrainAbsent({ code: 1, stdout: "", stderr: "HTTP 500" })).toBe(
      false
    );
    const calls: string[][] = [];
    const runner: CommandRunner = {
      async run(argv) {
        calls.push([...argv]);
        return { code: 1, stdout: "", stderr: "404 Not Found" };
      },
    };
    const reader = new GlabForgeReader({ runner });
    expect(await reader.mergeTrain(context)).toEqual({ kind: "absent" });
    expect(calls[0]?.[0]).toBe("glab");
    expect(calls[0]?.join(" ")).not.toContain(";");
    expect(calls[0]).toContain("--paginate");
    expect(calls[0]?.some((arg) => arg.includes("group%2Fsub%2Fproject"))).toBe(
      true
    );
  });

  // A mistyped --project, a moved project or a token without access all answer
  // `{"message":"404 Project Not Found"}`. Reading that as "trains are off" made
  // --queued-stack wait on a train that was never the problem.
  it("surfaces a project-level 404 as a retryable failure, not an absent train", async () => {
    const wrongProject = { code: 1, stdout: '{"message":"404 Project Not Found"}', stderr: "glab: 404 Project Not Found" };
    expect(mergeTrainAbsent(wrongProject)).toBe(false);
    const reader = new GlabForgeReader({
      runner: { async run() { return wrongProject; } },
    });
    await expect(reader.mergeTrain(context)).rejects.toThrow(WatcherQueryError);
    try {
      await reader.mergeTrain(context);
    } catch (error) {
      const failure = (error as WatcherQueryError).failure;
      expect(failure.kind).toBe("command-exit");
      expect(failure.retryable).toBe(true);
    }
  });
});

describe("pipeline job reads", () => {
  const recordingRunner = (): {
    readonly calls: string[][];
    readonly runner: CommandRunner;
  } => {
    const calls: string[][] = [];
    return {
      calls,
      runner: {
        async run(argv) {
          calls.push([...argv]);
          const endpoint = argv[argv.length - 1] ?? "";
          if (endpoint.includes("/jobs")) {
            return {
              code: 0,
              stderr: "",
              stdout: JSON.stringify([
                { id: 1200, name: "lint", stage: "test", status: "failed", retried: true },
                { id: 1201, name: "lint", stage: "test", status: "success" },
                { id: 1199, name: "unit", stage: "test", status: "success" },
              ]),
            };
          }
          return { code: 0, stdout: "[]", stderr: "" };
        },
      },
    };
  };

  it("asks for live attempts only and keeps the highest id per name", async () => {
    const { calls, runner } = recordingRunner();
    const reader = new GlabForgeReader({ runner });
    const checks = await reader.pipelineJobs(context, {
      id: 42,
      status: "success",
      projectId: null,
    });
    expect(calls[0]?.join(" ")).toContain("include_retried=false");
    // The superseded `failed` attempt would otherwise read as ci-failing while
    // GitLab reports the pipeline green.
    expect(checks).toEqual([
      { kind: "passed", name: "unit", reportedState: "success", description: "", link: "", stage: "test" },
      { kind: "passed", name: "lint", reportedState: "success", description: "", link: "", stage: "test" },
    ]);
  });

  it("keeps the latest attempt whichever order GitLab returns them in", () => {
    expect(
      latestJobAttempts([
        { id: 5, name: "lint", stage: "test", status: "failed" },
        { id: 2, name: "lint", stage: "test", status: "success" },
      ]).map(mapJob)
    ).toMatchObject([{ kind: "failed", reportedState: "failed" }]);
    expect(
      latestJobAttempts([
        { id: 9, name: "lint", stage: "test", status: "success" },
        { id: 7, name: "lint", stage: "test", status: "failed" },
      ]).map(mapJob)
    ).toMatchObject([{ kind: "passed", reportedState: "success" }]);
  });

  // head_pipeline.project_id exists because a fork MR's pipeline is created in
  // the source project; asking the MR's own project for its jobs 404s.
  it("reads a fork merge request's jobs from the head pipeline's project", async () => {
    const endpoints: string[] = [];
    const reader = new GlabForgeReader({
      runner: {
        async run(argv) {
          const endpoint = argv[argv.length - 1] ?? "";
          endpoints.push(endpoint);
          return {
            code: 0,
            stderr: "",
            stdout: endpoint.includes("/jobs")
              ? JSON.stringify([{ id: 1, name: "lint", stage: "test", status: "success" }])
              : JSON.stringify([{ id: 900, sha: "abc", status: "success" }]),
          };
        },
      },
    });
    const fork = { ...context, iid: parseMrIid(7) };
    expect(
      await reader.pipelineJobs(fork, { id: 900, status: "success", projectId: 314 })
    ).toMatchObject([{ kind: "passed" }]);
    await reader.pipelines(fork);
    expect(endpoints).toEqual([
      "projects/314/pipelines/900/jobs?per_page=100&include_retried=false",
      "projects/group%2Fsub%2Fproject/merge_requests/7/pipelines?per_page=100",
    ]);
  });

  it("parses head_pipeline.project_id and keeps the MR project without one", () => {
    expect(
      parseMergeRequest(
        {
          ...rawMergeRequest,
          head_pipeline: { id: 900, status: "running", project_id: 314 },
        },
        context
      ).headPipeline
    ).toEqual({ id: 900, status: "running", projectId: 314 });
    expect(
      parseMergeRequest(
        { ...rawMergeRequest, head_pipeline: { id: 7, status: "success" } },
        context
      ).headPipeline
    ).toEqual({ id: 7, status: "success", projectId: null });
  });
});

describe("pagination", () => {
  // A project with more than 100 open MRs, discussions, jobs or pipelines gets
  // a truncated list without --paginate, and a blocking thread in page 2 turns
  // into READY.
  it("passes --paginate to all five paginated readers", async () => {
    const calls: string[][] = [];
    const reader = new GlabForgeReader({
      runner: {
        async run(argv) {
          calls.push([...argv]);
          const endpoint = argv[argv.length - 1] ?? "";
          if (endpoint.includes("/jobs"))
            return { code: 0, stderr: "", stdout: "[]" };
          if (endpoint.endsWith("/pipelines?per_page=100"))
            return { code: 0, stderr: "", stdout: "[]" };
          return { code: 0, stderr: "", stdout: "[]" };
        },
      },
    });
    await reader.openMergeRequests(context);
    await reader.pipelineJobs(context, {
      id: 42,
      status: "success",
      projectId: null,
    });
    await reader.discussions(context);
    await reader.pipelines(context);
    await reader.mergeTrain(context);
    expect(calls).toHaveLength(5);
    expect(calls.map((argv) => argv.join(" "))).toEqual([
      expect.stringContaining("--paginate"),
      expect.stringContaining("--paginate"),
      expect.stringContaining("--paginate"),
      expect.stringContaining("--paginate"),
      expect.stringContaining("--paginate"),
    ]);
    for (const argv of calls) expect(argv[0]).toBe("glab");
  });
});

describe("watcher stack discovery", () => {
  it("watches the stack rooted at the default branch, not only the current MR", async () => {
    // watch-mr --stack from the bottom of the stack, and from the default
    // branch once the bottom MR merged: the context MR is the seed only.
    const reader = fakeReader({
      openMergeRequests: [
        { iid: parseMrIid(10), sourceBranch: "base-feature", targetBranch: "main" },
        { iid: parseMrIid(11), sourceBranch: "feature", targetBranch: "base-feature" },
        { iid: parseMrIid(12), sourceBranch: "upstack", targetBranch: "feature" },
      ],
      defaultBranch: "main",
    });
    expect(
      (await discoverStack(reader, { ...context, iid: parseMrIid(11) })).map(
        (item) => Number(item.iid)
      )
    ).toEqual([10, 11, 12]);
    expect(
      (await discoverStack(reader, { ...context, iid: parseMrIid(999) })).map(
        (item) => Number(item.iid)
      )
    ).toEqual([10, 11, 12]);
  });

  it("reports the merge requests the stack left out instead of watching them silently", async () => {
    const notes: string[] = [];
    const reader = fakeReader({
      openMergeRequests: [
        { iid: parseMrIid(10), sourceBranch: "a", targetBranch: "main" },
        { iid: parseMrIid(20), sourceBranch: "b", targetBranch: "a" },
        { iid: parseMrIid(30), sourceBranch: "c", targetBranch: "a" },
        { iid: parseMrIid(5), sourceBranch: "develop", targetBranch: "main" },
      ],
      defaultBranch: "main",
    });
    expect(
      (
        await discoverStack(
          reader,
          { ...context, iid: parseMrIid(20) },
          (detail) => notes.push(detail)
        )
      ).map((item) => Number(item.iid))
    ).toEqual([10, 20]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("!30 sibling");
    expect(notes[0]).toContain("!5 release into main");
    expect(
      await discoverStack(
        fakeReader({
          openMergeRequests: [
            { iid: parseMrIid(10), sourceBranch: "a", targetBranch: "main" },
            { iid: parseMrIid(20), sourceBranch: "b", targetBranch: "a" },
          ],
          defaultBranch: "main",
        }),
        { ...context, iid: parseMrIid(20) },
        (detail) => notes.push(detail)
      )
    ).toHaveLength(2);
    expect(notes).toHaveLength(1);
  });
});

describe("context resolution", () => {
  it("returns an explicit project and iid without a current-MR query", async () => {
    const reader = fakeReader();
    expect(
      await resolveContext({
        reader,
        project: "group/project",
        mr: context.iid,
      })
    ).toEqual({
      host: "git.example.test",
      path: "group/project",
      iid: context.iid,
    });
    expect(reader.calls).toEqual(["originProject"]);
  });
  it("prefers an explicit host over the origin remote's host", async () => {
    expect(
      await resolveContext({
        reader: fakeReader(),
        host: "git.bistek.com.br",
        project: "group/project",
        mr: context.iid,
      })
    ).toEqual({
      host: "git.bistek.com.br",
      path: "group/project",
      iid: context.iid,
    });
  });
});

describe("approvals", () => {
  it("reads approvals_left on GitLab Premium", () => {
    expect(parseApprovals({ approved: false, approvals_left: 2 })).toEqual({
      approved: false,
      approvalsLeft: 2,
    });
  });
  it("accepts GitLab Free, which omits approvals_left", () => {
    expect(
      parseApprovals({
        user_has_approved: false,
        user_can_approve: true,
        approved: false,
        approved_by: [],
      })
    ).toEqual({ approved: false, approvalsLeft: null });
  });
});
