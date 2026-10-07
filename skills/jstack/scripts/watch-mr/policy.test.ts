import { describe, expect, it } from "bun:test";
import { ChecksUnavailable, WatcherQueryError } from "./gitlab.ts";
import {
  applyQueueSnapshot,
  assessForgeMerge,
  classifyMr,
  createQueueState,
  evaluateQueue,
  planQueue,
  queryBackoffSeconds,
  readSnapshot,
  runQueued,
  selectTierMajorStackDecision,
} from "./policy.ts";
import {
  fakeReader,
  failedCheck,
  passingCheck,
  pendingCheck,
} from "./fakes.test-helper.ts";
import type {
  ForgeReader,
  MergeRequestFacts,
  MrContext,
  NonEmpty,
  PollingOptions,
  ProgressVerdict,
} from "./types.ts";
import { parseMrIid } from "./types.ts";

const context = (iid: number): MrContext => ({
  host: "git.example.test",
  path: "group/project",
  iid: parseMrIid(iid),
});
const options = {
  interval: 10,
  sweepInterval: 300,
  timeout: 0,
  maxQueryErrors: 5,
  allowDraft: false,
} satisfies PollingOptions;
const absent = { kind: "absent" } as const;

function facts(patch: Partial<MergeRequestFacts> = {}): MergeRequestFacts {
  return {
    context: context(1),
    state: "opened",
    draft: false,
    detailedMergeStatus: "mergeable",
    mergeStatus: { kind: "ready" },
    hasConflicts: false,
    sha: "head",
    sourceBranch: "feature",
    targetBranch: "main",
    mergedAt: null,
    headPipeline: { id: 7, status: "success", projectId: null },
    blockingDiscussionsResolved: true,
    ...patch,
  };
}

describe("readiness truth table", () => {
  it("refuses only a clean job list when the pipeline failed and CI must pass", () => {
    const base = facts({
      detailedMergeStatus: "ci_must_pass",
      mergeStatus: { kind: "pipeline-wait", raw: "ci_must_pass" },
      headPipeline: { id: 7, status: "failed", projectId: null },
    });
    expect(
      assessForgeMerge({ facts: base, failed: null, pending: null }).kind
    ).toBe("refused");
    expect(
      assessForgeMerge({
        facts: facts({ headPipeline: { id: 7, status: "failed", projectId: null } }),
        failed: null,
        pending: null,
      }).kind
    ).toBe("allowed");
    expect(
      assessForgeMerge({
        facts: base,
        failed: null,
        pending: [pendingCheck()],
      }).kind
    ).toBe("allowed");
  });

  // ci_must_pass is GitLab's cached merge verdict; the head pipeline is the
  // fact. Synthesising a pending check while the pipeline was already green
  // left a row that was ci-clean and simultaneously WAITING on zero jobs, so
  // with --timeout 0 it polled forever and never emitted READY.
  for (const status of ["ci_must_pass", "ci_still_running"] as const) {
    it(`reaches READY when ${status} sits on a settled head pipeline`, async () => {
      const reader = fakeReader({
        facts: {
          detailedMergeStatus: status,
          mergeStatus: { kind: "pipeline-wait", raw: status },
          headPipeline: { id: 7, status: "success", projectId: null },
        },
        jobs: [passingCheck()],
        pipelines: [{ id: 7, sha: "head", status: "success" }],
      });
      const snapshot = await readSnapshot({
        reader,
        context: context(1),
        pendingHistory: "include",
        allowDraft: false,
      });
      expect(snapshot.kind).toBe("open");
      if (snapshot.kind !== "open") throw new Error("expected open snapshot");
      expect(snapshot.ci.kind).toBe("ci-clean");
      expect(classifyMr(snapshot)).toMatchObject({
        kind: "ready",
        mr: { proof: { ci: { kind: "ci-clean" } } },
      });
    });
  }

  it("still waits on ci_must_pass while the head pipeline has not settled", async () => {
    const reader = fakeReader({
      facts: {
        detailedMergeStatus: "ci_must_pass",
        mergeStatus: { kind: "pipeline-wait", raw: "ci_must_pass" },
        headPipeline: { id: 7, status: "running", projectId: null },
      },
      jobs: [passingCheck()],
    });
    const snapshot = await readSnapshot({
      reader,
      context: context(1),
      pendingHistory: "include",
      allowDraft: false,
    });
    if (snapshot.kind !== "open") throw new Error("expected open snapshot");
    expect(classifyMr(snapshot)).toMatchObject({
      kind: "waiting",
      reason: { kind: "pending-checks", pending: [{ name: "pipeline" }] },
    });
  });

  it("turns a clean visible list plus a forge refusal into an explicit CI blocker", async () => {
    const reader = fakeReader({
      facts: {
        detailedMergeStatus: "ci_must_pass",
        mergeStatus: { kind: "pipeline-wait", raw: "ci_must_pass" },
        headPipeline: { id: 7, status: "failed", projectId: null },
      },
      jobs: [passingCheck()],
      pipelines: [{ id: 7, sha: "head", status: "failed" }],
    });
    const snapshot = await readSnapshot({
      reader,
      context: context(1),
      pendingHistory: "include",
      allowDraft: false,
    });
    expect(snapshot.kind).toBe("open");
    if (snapshot.kind !== "open") throw new Error("expected open snapshot");
    expect(snapshot.ci.kind).toBe("ci-forge-rejected");
    expect(classifyMr(snapshot)).toMatchObject({
      kind: "blocker",
      blocker: { kind: "failing-checks" },
    });
  });

  // The row this used to produce was ci-clean off a pipeline that never ran,
  // so classifyMr called it ready.
  it("never reports ci-clean for a mergeable MR with no pipeline on a gated project", async () => {
    const reader = fakeReader({
      facts: { headPipeline: null },
      pipelineGate: { kind: "required" },
    });
    const rejection = readSnapshot({
      reader,
      context: context(1),
      pendingHistory: "include",
      allowDraft: false,
    });
    await expect(rejection).rejects.toBeInstanceOf(ChecksUnavailable);
    await expect(rejection).rejects.toThrow(
      "group/project requires a successful pipeline and merge request !1 has none"
    );
  });
});

describe("snapshot query planning", () => {
  it("does not query pipeline history while queued checks are pending", async () => {
    const reader = fakeReader({ jobs: [pendingCheck()] });
    const snapshot = await readSnapshot({
      reader,
      context: context(2),
      pendingHistory: "omit",
      allowDraft: false,
    });
    expect(snapshot.kind).toBe("open");
    if (snapshot.kind !== "open") throw new Error("expected open snapshot");
    expect(snapshot.ci.kind).toBe("ci-pending");
    expect(reader.calls).toEqual([
      "mergeRequest",
      "discussions",
      "pipelineJobs",
    ]);
  });

  it("queries pipeline history for settled and failed lists", async () => {
    const settled = fakeReader();
    await readSnapshot({
      reader: settled,
      context: context(3),
      pendingHistory: "omit",
      allowDraft: false,
    });
    expect(settled.calls).toContain("pipelines");

    const failed = fakeReader({ jobs: [failedCheck()] });
    await readSnapshot({
      reader: failed,
      context: context(4),
      pendingHistory: "omit",
      allowDraft: false,
    });
    expect(failed.calls).toContain("pipelines");
  });

  it("short-circuits merged rows before threads and checks", async () => {
    const reader = fakeReader({
      facts: { state: "merged", mergedAt: "2026-07-26T00:00:00Z" },
    });
    expect(
      (
        await readSnapshot({
          reader,
          context: context(5),
          pendingHistory: "include",
          allowDraft: false,
        })
      ).kind
    ).toBe("merged");
    expect(reader.calls).toEqual(["mergeRequest"]);
  });
});

it("scans stacks tier-major so an upstack conflict outranks frontier CI", async () => {
  const frontier = await readSnapshot({
    reader: fakeReader({
      jobs: [failedCheck()],
      pipelines: [{ id: 7, sha: "head", status: "failed" }],
    }),
    context: context(10),
    pendingHistory: "omit",
    allowDraft: false,
  });
  const upstack = await readSnapshot({
    reader: fakeReader({
      facts: {
        hasConflicts: true,
        detailedMergeStatus: "conflict",
        mergeStatus: { kind: "conflict", raw: "conflict" },
      },
    }),
    context: context(11),
    pendingHistory: "omit",
    allowDraft: false,
  });
  const decision = selectTierMajorStackDecision([frontier, upstack]);
  expect(decision).toMatchObject({
    kind: "blocker",
    blocker: { kind: "merge-conflicts", mr: { iid: 11 } },
  });
});

it("attributes a stack wait to the MR whose checks are pending, not the bottom", async () => {
  const readyBottom = await readSnapshot({
    reader: fakeReader(),
    context: context(20),
    pendingHistory: "omit",
    allowDraft: false,
  });
  const pendingUpstack = await readSnapshot({
    reader: fakeReader({ jobs: [pendingCheck("upstack-build")] }),
    context: context(21),
    pendingHistory: "omit",
    allowDraft: false,
  });
  const decision = selectTierMajorStackDecision([readyBottom, pendingUpstack]);
  expect(decision).toMatchObject({
    kind: "waiting",
    frontier: { iid: 21 },
    reason: { kind: "pending-checks", pending: [{ name: "upstack-build" }] },
  });
});

it("waits on a draft while checks are pending, then reports the draft gate", async () => {
  const pending = await readSnapshot({
    reader: fakeReader({
      facts: { draft: true, detailedMergeStatus: "draft_status", mergeStatus: { kind: "draft", raw: "draft_status" } },
      jobs: [pendingCheck()],
    }),
    context: context(12),
    pendingHistory: "omit",
    allowDraft: false,
  });
  expect(classifyMr(pending).kind).toBe("waiting");

  const settled = await readSnapshot({
    reader: fakeReader({
      facts: {
        draft: true,
        detailedMergeStatus: "draft_status",
        mergeStatus: { kind: "draft", raw: "draft_status" },
      },
    }),
    context: context(12),
    pendingHistory: "omit",
    allowDraft: false,
  });
  expect(classifyMr(settled)).toMatchObject({
    kind: "blocker",
    blocker: { kind: "merge-gate", reason: "draft-mr" },
  });
});

it("waits on approval and polls an unknown transient status", async () => {
  const approval = await readSnapshot({
    reader: fakeReader({
      facts: {
        detailedMergeStatus: "not_approved",
        mergeStatus: { kind: "approval-wait", raw: "not_approved" },
      },
      approvals: { approved: false, approvalsLeft: 1 },
    }),
    context: context(13),
    pendingHistory: "include",
    allowDraft: false,
  });
  expect(classifyMr(approval)).toMatchObject({
    kind: "waiting",
    reason: { kind: "approval-wait", status: "not_approved", approvalsLeft: 1 },
  });

  const checking = await readSnapshot({
    reader: fakeReader({
      facts: {
        detailedMergeStatus: "checking",
        mergeStatus: { kind: "unknown-poll", raw: "checking" },
      },
    }),
    context: context(14),
    pendingHistory: "include",
    allowDraft: false,
  });
  expect(classifyMr(checking)).toMatchObject({
    kind: "waiting",
    reason: { kind: "unknown-merge-status", raw: "checking" },
  });
});

describe("queued-stack cadence", () => {
  async function openSnapshot(mr: MrContext) {
    return readSnapshot({
      reader: fakeReader(),
      context: mr,
      pendingHistory: "omit",
      allowDraft: false,
    });
  }

  it("drops a sweep head only after its snapshot succeeds", async () => {
    const queue = [context(20), context(21), context(22)] satisfies NonEmpty<MrContext>;
    let state = createQueueState(queue, 0);
    const first = await openSnapshot(queue[0]);
    state = applyQueueSnapshot(state, first, 0, options).state;
    expect(state.work).toMatchObject({
      kind: "whole-stack-sweep",
      remaining: [{ iid: 21 }, { iid: 22 }],
    });
    const second = await openSnapshot(queue[1]);
    state = applyQueueSnapshot(state, second, 60, options).state;
    expect(state.work).toMatchObject({
      kind: "whole-stack-sweep",
      remaining: [{ iid: 22 }],
    });
  });

  it("resumes the sweep at the MR whose read failed", async () => {
    const middle = context(21);
    const base = fakeReader();
    let failNext = true;
    const timeline: string[] = [];
    const reader = {
      ...base,
      async mergeRequest(mr: MrContext) {
        if (mr.iid === middle.iid && failNext) {
          failNext = false;
          timeline.push(`fail:${mr.iid}`);
          throw new WatcherQueryError({
            kind: "command-exit",
            retryable: true,
            detail: "rate limited",
            code: 1,
          });
        }
        timeline.push(`read:${mr.iid}`);
        return base.mergeRequest(mr);
      },
    } satisfies ForgeReader;
    let now = 0;
    let sleeps = 0;
    const running = runQueued({
      dependencies: {
        reader,
        clock: {
          now: () => now,
          observedAt: () => "2026-07-26T00:00:00.000Z",
          async sleep(seconds) {
            timeline.push("sleep");
            now += seconds;
            sleeps += 1;
            if (sleeps === 2) throw new Error("stop after resume proof");
          },
        },
        emit(verdict) {
          timeline.push(`emit:${verdict.kind}`);
        },
      },
      contexts: [context(20), middle, context(22)],
      options,
    });
    await expect(running).rejects.toThrow("stop after resume proof");
    expect(timeline).toEqual([
      "emit:QUEUE",
      "read:20",
      "fail:21",
      "emit:RETRY",
      "sleep",
      "read:21",
      "read:22",
      "emit:STATUS",
      "emit:WAITING",
      "sleep",
    ]);
  });

  it("emits a completed sweep only after its final successful snapshot", async () => {
    const queue = [context(30), context(31)] satisfies NonEmpty<MrContext>;
    let state = createQueueState(queue, 0);
    const first = applyQueueSnapshot(
      state,
      await openSnapshot(queue[0]),
      0,
      options
    );
    expect(first.completedSweepRows).toBeNull();
    state = first.state;
    const second = applyQueueSnapshot(
      state,
      await openSnapshot(queue[1]),
      5,
      options
    );
    expect(second.completedSweepRows?.map((row) => Number(row.context.iid))).toEqual([
      30, 31,
    ]);
    expect(second.state.nextSweepAt).toBe(305);
  });

  it("ADVANCE continues directly to the new frontier without sleeping", async () => {
    const one = context(40);
    const two = context(41);
    const base = fakeReader();
    const reads = new Map<number, number>();
    const timeline: string[] = [];
    const reader = {
      ...base,
      async mergeRequest(mr: MrContext) {
        timeline.push(`read:${mr.iid}`);
        const row = await base.mergeRequest(mr);
        const count = (reads.get(mr.iid) ?? 0) + 1;
        reads.set(mr.iid, count);
        return mr.iid === one.iid && count > 1
          ? { ...row, state: "merged" as const, mergedAt: "2026-07-26T00:00:00Z" }
          : row;
      },
    } satisfies ForgeReader;
    let now = 0;
    let sleeps = 0;
    const emitted: ProgressVerdict[] = [];
    const running = runQueued({
      dependencies: {
        reader,
        clock: {
          now: () => now,
          observedAt: () => "2026-07-26T00:00:00.000Z",
          async sleep(seconds) {
            timeline.push("sleep");
            now += seconds;
            sleeps += 1;
            if (sleeps === 2) throw new Error("stop after advance proof");
          },
        },
        emit(verdict) {
          emitted.push(verdict);
          timeline.push(`emit:${verdict.kind}`);
        },
      },
      contexts: [one, two],
      options,
    });
    await expect(running).rejects.toThrow("stop after advance proof");
    expect(emitted.some((event) => event.kind === "ADVANCE")).toBe(true);
    const firstSleep = timeline.indexOf("sleep");
    expect(timeline.slice(firstSleep, firstSleep + 5)).toEqual([
      "sleep",
      "read:40",
      "emit:ADVANCE",
      "read:41",
      "emit:WAITING",
    ]);
  });

  it("deduplicates identical waits and schedules the next due sweep", async () => {
    const queue = [context(50)] satisfies NonEmpty<MrContext>;
    let state = createQueueState(queue, 0);
    state = applyQueueSnapshot(
      state,
      await openSnapshot(queue[0]),
      0,
      options
    ).state;
    const first = evaluateQueue(state, 0, options, absent);
    expect(first.kind).toBe("waiting");
    if (first.kind !== "waiting") throw new Error("expected waiting");
    expect(first.emit).toBe(true);
    expect(first.reason.kind).toBe("merge-train");
    const second = evaluateQueue(first.state, 10, options, absent);
    expect(second.kind).toBe("waiting");
    if (second.kind !== "waiting") throw new Error("expected waiting");
    expect(second.emit).toBe(false);
    expect(planQueue(second.state, 300).work?.kind).toBe("whole-stack-sweep");
  });
});

it("uses the specified retry floor and cap", () => {
  expect(queryBackoffSeconds(1, 1)).toBe(60);
  expect(queryBackoffSeconds(1, 2)).toBe(120);
  expect(queryBackoffSeconds(60, 4)).toBe(300);
});
