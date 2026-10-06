import { WatcherQueryError, resolveChecks, syntheticPending } from "./gitlab.ts";
import type * as T from "./types.ts";
import { nonEmpty } from "./types.ts";

const failedPipeline = (
  status: string | undefined
): status is "failed" | "canceled" =>
  status === "failed" || status === "canceled";

export function assessForgeMerge(args: {
  readonly facts: T.MergeRequestFacts;
  readonly failed: T.NonEmpty<T.FailedCheck> | null;
  readonly pending: T.NonEmpty<T.PendingCheck> | null;
}): T.ForgeMergeAssessment {
  const pipelineStatus = args.facts.headPipeline?.status;
  if (
    args.facts.mergeStatus.kind === "pipeline-wait" &&
    args.facts.mergeStatus.raw === "ci_must_pass" &&
    args.failed === null &&
    args.pending === null &&
    failedPipeline(pipelineStatus)
  )
    return {
      kind: "refused",
      detailedMergeStatus: args.facts.detailedMergeStatus,
      pipelineStatus,
    };
  return {
    kind: "allowed",
    detailedMergeStatus: args.facts.detailedMergeStatus,
  };
}
function previousPassingCi(
  facts: T.MergeRequestFacts,
  pipelines: readonly T.PipelineRecord[]
): boolean {
  return pipelines.some(
    (pipeline) => pipeline.sha !== facts.sha && pipeline.status === "success"
  );
}
const SYNTHETIC_THREAD: T.ReviewThread = {
  id: "blocking-discussions",
  firstNote: null,
  isReviewBot: false,
  botReviewPasses: 0,
};
function blockingThreads(
  facts: T.MergeRequestFacts,
  threads: readonly T.ReviewThread[]
): readonly T.ReviewThread[] {
  if (threads.length > 0) return threads;
  if (
    facts.mergeStatus.kind === "threads" ||
    facts.blockingDiscussionsResolved === false
  )
    return [SYNTHETIC_THREAD];
  return threads;
}
export async function readSnapshot(args: {
  readonly reader: T.ForgeReader;
  readonly context: T.MrContext;
  readonly pendingHistory: "include" | "omit";
  readonly allowDraft: boolean;
}): Promise<T.MrSnapshot> {
  const facts = await args.reader.mergeRequest(args.context);
  if (facts.state === "merged" || facts.mergedAt !== null)
    return { kind: "merged", context: args.context, facts };
  if (facts.state === "closed")
    return { kind: "closed", context: args.context, facts };
  if (facts.state === "locked")
    return {
      kind: "open",
      context: args.context,
      facts,
      threads: [],
      approvals: null,
      reviewAutomationRunning: false,
      ci: {
        kind: "ci-pending",
        source: "pipeline-jobs",
        all: [syntheticPending("pipeline", "locked")],
        failed: [],
        pending: [syntheticPending("pipeline", "locked")],
        hadPreviousPassingCi: false,
      },
    };
  const threads = blockingThreads(
    facts,
    await args.reader.discussions(args.context)
  );
  const checks = await resolveChecks(args.reader, facts);
  const failed = nonEmpty(
    checks.checks.filter(
      (check): check is T.FailedCheck => check.kind === "failed"
    )
  );
  let pending = nonEmpty(
    checks.checks.filter(
      (check): check is T.PendingCheck => check.kind === "pending"
    )
  );
  if (
    pending === null &&
    failed === null &&
    (facts.mergeStatus.kind === "pipeline-wait" ||
      facts.mergeStatus.kind === "unknown-poll") &&
    !failedPipeline(facts.headPipeline?.status) &&
    // ci_must_pass against a green head pipeline is GitLab's verdict lagging
    // the pipeline, not work in flight. Synthesising a pending check there
    // made the row permanently WAITING with zero pending jobs.
    facts.headPipeline?.status !== "success"
  )
    pending = [syntheticPending("pipeline", facts.detailedMergeStatus)];
  const reviewAutomationRunning =
    checks.checks.some(
      (check) =>
        check.kind === "pending" &&
        args.reader.bots.some((bot) =>
          check.name.toLowerCase().includes(bot.toLowerCase())
        )
    ) || threads.some((thread) => thread.isReviewBot);
  if (failed === null && pending !== null && args.pendingHistory === "omit")
    return {
      kind: "open",
      context: args.context,
      facts,
      threads,
      approvals: null,
      reviewAutomationRunning,
      ci: {
        kind: "ci-pending",
        source: checks.source,
        all: checks.checks,
        failed: [],
        pending,
        hadPreviousPassingCi: false,
      },
    };
  const pipelines = await args.reader.pipelines(
    args.context,
    facts.headPipeline?.projectId ?? null
  );
  const approvals =
    facts.state === "opened" ? await args.reader.approvals(args.context) : null;
  const hadPreviousPassingCi = previousPassingCi(facts, pipelines);
  const base = {
    source: checks.source,
    all: checks.checks,
    hadPreviousPassingCi,
  };
  const forge = assessForgeMerge({ facts, failed, pending });
  let ci: T.CiState;
  if (failed !== null)
    ci = {
      ...base,
      kind: "ci-failing",
      failed,
      pending: pending ?? [],
      forge,
    };
  else if (forge.kind === "refused")
    ci = {
      ...base,
      kind: "ci-forge-rejected",
      failed: [],
      pending: pending ?? [],
      forge,
    };
  else if (pending !== null)
    ci = { ...base, kind: "ci-pending", failed: [], pending };
  else
    ci = {
      ...base,
      kind: "ci-clean",
      failed: [],
      pending: [],
      forge,
    };
  return {
    kind: "open",
    context: args.context,
    facts,
    threads,
    ci,
    approvals,
    reviewAutomationRunning,
  };
}
const locked = (row: T.MrSnapshot): boolean =>
  row.kind === "open" && row.facts.state === "locked";
const conflictBlocker = (row: T.MrSnapshot): T.MergeBlocker | null =>
  row.kind === "open" &&
  !locked(row) &&
  (row.facts.hasConflicts || row.facts.mergeStatus.kind === "conflict")
    ? { kind: "merge-conflicts", mr: row.context, facts: row.facts }
    : null;
function threadBlocker(row: T.MrSnapshot): T.MergeBlocker | null {
  if (row.kind !== "open" || locked(row)) return null;
  const threads = nonEmpty(row.threads);
  return threads === null
    ? null
    : { kind: "review-threads", mr: row.context, threads };
}
const ciBlocker = (row: T.MrSnapshot): T.MergeBlocker | null =>
  row.kind === "open" &&
  !locked(row) &&
  (row.ci.kind === "ci-failing" || row.ci.kind === "ci-forge-rejected")
    ? { kind: "failing-checks", mr: row.context, ci: row.ci }
    : null;
function isDraft(row: T.MrSnapshot): boolean {
  return (
    row.kind === "open" &&
    (row.facts.draft || row.facts.mergeStatus.kind === "draft")
  );
}
function gateBlocker(
  row: T.MrSnapshot,
  allowDraft: boolean
): T.MergeBlocker | null {
  if (locked(row)) return null;
  if (row.kind === "closed")
    return { kind: "merge-gate", mr: row.context, reason: "closed-without-merge" };
  if (row.kind !== "open") return null;
  if (row.facts.mergeStatus.kind === "unknown")
    return {
      kind: "merge-gate",
      mr: row.context,
      reason: "unknown-merge-status",
      raw: row.facts.mergeStatus.raw,
    };
  if (isDraft(row) && !allowDraft && row.ci.kind !== "ci-pending")
    return { kind: "merge-gate", mr: row.context, reason: "draft-mr" };
  return null;
}
function localWait(row: T.MrSnapshot): T.WaitReason | null {
  if (row.kind !== "open") return null;
  if (row.facts.state === "locked")
    return { kind: "unknown-merge-status", raw: "locked" };
  if (row.facts.mergeStatus.kind === "unknown-poll")
    return { kind: "unknown-merge-status", raw: row.facts.mergeStatus.raw };
  if (row.ci.kind === "ci-pending")
    return { kind: "pending-checks", pending: row.ci.pending };
  if (row.facts.mergeStatus.kind === "approval-wait")
    return {
      kind: "approval-wait",
      status: row.facts.mergeStatus.raw,
      approvalsLeft: row.approvals?.approvalsLeft ?? null,
    };
  // A settled head pipeline satisfies ci_must_pass, as on GitHub: the forge
  // status is a cached verdict and the pipeline is the fact. Without this the
  // row is both ci-clean and WAITING, which contradicts its own proof.
  if (
    row.facts.mergeStatus.kind === "pipeline-wait" &&
    row.facts.headPipeline?.status !== "success"
  )
    return {
      kind: "pending-checks",
      pending: [syntheticPending("pipeline", row.facts.detailedMergeStatus)],
    };
  return null;
}
function readyContribution(
  row: T.MrSnapshot,
  allowDraft: boolean
): T.ReadyMr | T.MergedMr | null {
  if (row.kind === "merged")
    return {
      kind: "merged-mr",
      context: row.context,
      mergedAt: row.facts.mergedAt,
    };
  if (
    row.kind !== "open" ||
    row.ci.kind !== "ci-clean" ||
    row.threads.length !== 0 ||
    conflictBlocker(row) !== null ||
    gateBlocker(row, allowDraft) !== null ||
    localWait(row) !== null
  )
    return null;
  return {
    kind: "ready-mr",
    context: row.context,
    proof: {
      mergeability: "clear",
      threads: [],
      ci: row.ci,
      gate: {
        state: "opened",
        approval: row.approvals?.approved === true ? "approved" : "not-required",
        draft: isDraft(row) ? "draft-allowed" : "not-draft",
      },
    },
  };
}
export function classifyMr(
  row: T.MrSnapshot,
  allowDraft = false
): T.MrDecision {
  for (const blocker of [
    conflictBlocker(row),
    threadBlocker(row),
    ciBlocker(row),
    gateBlocker(row, allowDraft),
  ])
    if (blocker !== null) return { kind: "blocker", blocker };
  const wait = localWait(row);
  if (wait !== null)
    return { kind: "waiting", frontier: row.context, reason: wait };
  const ready = readyContribution(row, allowDraft);
  if (ready === null) throw new Error("snapshot has no classified decision");
  return ready.kind === "merged-mr"
    ? { kind: "merged", mr: ready }
    : { kind: "ready", mr: ready };
}
export function selectTierMajorStackDecision(
  rows: T.NonEmpty<T.MrSnapshot>,
  allowDraft = false
): T.StackDecision {
  for (const tier of [conflictBlocker, threadBlocker, ciBlocker])
    for (const row of rows) {
      const blocker = tier(row);
      if (blocker !== null) return { kind: "blocker", blocker };
    }
  for (const row of rows) {
    const blocker = gateBlocker(row, allowDraft);
    if (blocker !== null) return { kind: "blocker", blocker };
  }
  for (const row of rows) {
    const wait = localWait(row);
    if (wait !== null)
      return { kind: "waiting", frontier: row.context, reason: wait };
  }
  const mrs = nonEmpty(
    rows
      .map((row) => readyContribution(row, allowDraft))
      .filter((row): row is T.ReadyMr | T.MergedMr => row !== null)
  );
  if (mrs === null || mrs.length !== rows.length)
    throw new Error("stack has no classified decision");
  return { kind: "clear", mrs };
}
export const queryBackoffSeconds = (
  interval: number,
  failures: number
): number => Math.min(Math.max(interval, 60) * 2 ** (failures - 1), 300);
interface Envelope<M extends T.WatchMode> {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly observedAt: string;
  readonly mode: M;
}
type Payload<V> = V extends unknown
  ? Omit<V, keyof Envelope<T.WatchMode>>
  : never;
type VerdictPayload = Payload<T.WatcherVerdict>;
export interface VerdictStamp<M extends T.WatchMode = T.WatchMode> {
  <const P extends VerdictPayload>(payload: P): Envelope<M> & P;
  <const P extends VerdictPayload, M2 extends T.WatchMode>(
    payload: P,
    mode: M2
  ): Envelope<M2> & P;
}
export function verdictFactory<M extends T.WatchMode>(
  clock: WatchClock,
  mode: M
): VerdictStamp<M> {
  let sequence = 0;
  function stamp<const P extends VerdictPayload>(payload: P): Envelope<M> & P;
  function stamp<const P extends VerdictPayload, M2 extends T.WatchMode>(
    payload: P,
    mode: M2
  ): Envelope<M2> & P;
  function stamp<const P extends VerdictPayload>(
    payload: P,
    override?: T.WatchMode
  ): Envelope<T.WatchMode> & P {
    return {
      schemaVersion: 1,
      sequence: (sequence += 1),
      observedAt: clock.observedAt(),
      mode: override ?? mode,
      ...payload,
    };
  }
  return stamp;
}
function blockerVerdict(
  stamp: VerdictStamp,
  blocker: T.MergeBlocker
): T.BlockerVerdict {
  switch (blocker.kind) {
    case "merge-conflicts":
      return stamp({ kind: "BLOCKER", terminal: true, exitCode: 2, blocker });
    case "review-threads":
      return stamp({ kind: "BLOCKER", terminal: true, exitCode: 3, blocker });
    case "failing-checks":
      return stamp({ kind: "BLOCKER", terminal: true, exitCode: 4, blocker });
    case "merge-gate":
      return stamp({ kind: "BLOCKER", terminal: true, exitCode: 6, blocker });
    default: {
      const exhaustive: never = blocker;
      return exhaustive;
    }
  }
}
export function statusQueryVerdict(
  stamp: VerdictStamp,
  failures: number,
  failure: T.QueryFailure
): T.BlockerVerdict {
  return stamp({
    kind: "BLOCKER",
    terminal: true,
    exitCode: 7,
    blocker: { kind: "status-query", failures, failure },
  });
}
export interface WatchClock {
  now(): number;
  observedAt(): string;
  sleep(seconds: number): Promise<void>;
}
export interface RunDependencies {
  readonly reader: T.ForgeReader;
  readonly clock: WatchClock;
  readonly emit: (verdict: T.ProgressVerdict) => void;
}
const deadlinePassed = (
  started: number,
  options: T.PollingOptions,
  now: number
): boolean => options.timeout > 0 && now - started >= options.timeout;
type StepResult<V> =
  | { readonly kind: "terminal"; readonly verdict: V }
  | {
      readonly kind: "sleep";
      readonly seconds: number;
      readonly onDeadline?: () => V;
    }
  | { readonly kind: "continue" };
function timeoutReason(reason: T.WaitReason): T.TimeoutVerdict["reason"] {
  switch (reason.kind) {
    case "pending-checks":
      return { kind: "pending-checks", pending: reason.pending };
    case "approval-wait":
      return { kind: "approval-wait", status: reason.status };
    case "unknown-merge-status":
      return { kind: "unknown-merge-status", raw: reason.raw };
    case "merge-train":
      return {
        kind: "queued-stack",
        frontier: { host: null, path: "", iid: reason.unmergedCount as T.MrIid },
        unmergedCount: reason.unmergedCount,
      };
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}
async function pollUntilTerminal<V>(args: {
  readonly dependencies: RunDependencies;
  readonly options: T.PollingOptions;
  readonly stamp: VerdictStamp;
  readonly step: () => Promise<StepResult<V>>;
}): Promise<V | T.BlockerVerdict | T.TimeoutVerdict> {
  let failures = 0;
  const started = args.dependencies.clock.now();
  while (true) {
    let result: StepResult<V>;
    try {
      result = await args.step();
      failures = 0;
    } catch (error) {
      if (!(error instanceof WatcherQueryError)) throw error;
      failures += 1;
      if (!error.failure.retryable || failures >= args.options.maxQueryErrors)
        return statusQueryVerdict(args.stamp, failures, error.failure);
      const retryInSeconds = queryBackoffSeconds(
        args.options.interval,
        failures
      );
      args.dependencies.emit(
        args.stamp({
          kind: "RETRY",
          terminal: false,
          failure: error.failure,
          consecutiveFailures: failures,
          retryInSeconds,
        })
      );
      if (deadlinePassed(started, args.options, args.dependencies.clock.now()))
        return args.stamp({
          kind: "TIMEOUT",
          terminal: true,
          exitCode: 5,
          reason: { kind: "status-unavailable", failure: error.failure },
        });
      await args.dependencies.clock.sleep(retryInSeconds);
      continue;
    }
    if (result.kind === "terminal") return result.verdict;
    if (result.kind === "sleep") {
      if (
        result.onDeadline !== undefined &&
        deadlinePassed(started, args.options, args.dependencies.clock.now())
      )
        return result.onDeadline();
      await args.dependencies.clock.sleep(result.seconds);
    }
  }
}
export async function runSimple(args: {
  readonly dependencies: RunDependencies;
  readonly contexts: T.NonEmpty<T.MrContext>;
  readonly mode: T.WatchMode;
  readonly statusOnly: boolean;
  readonly options: T.PollingOptions;
}): Promise<T.TerminalVerdict> {
  const stamp = verdictFactory(args.dependencies.clock, args.mode);
  const step = async (): Promise<StepResult<T.TerminalVerdict>> => {
    const rows: T.MrSnapshot[] = [];
    for (const context of args.contexts)
      rows.push(
        await readSnapshot({
          reader: args.dependencies.reader,
          context,
          pendingHistory: "include",
          allowDraft: args.options.allowDraft,
        })
      );
    const complete = nonEmpty(rows);
    if (complete === null) throw new Error("watch context cannot be empty");
    if (args.statusOnly)
      return {
        kind: "terminal",
        verdict: stamp({
          kind: "STATUS",
          terminal: true,
          exitCode: 0,
          reason: "status-only",
          rows: complete,
        }),
      };
    if (args.mode === "queued-stack")
      throw new Error("queued-stack requires status-only in the simple runner");
    if (args.mode === "stack")
      args.dependencies.emit(
        stamp(
          { kind: "STATUS", terminal: false, reason: "poll", rows: complete },
          args.mode
        )
      );
    const decision =
      args.mode === "single"
        ? classifyMr(complete[0], args.options.allowDraft)
        : selectTierMajorStackDecision(complete, args.options.allowDraft);
    if (decision.kind === "blocker")
      return {
        kind: "terminal",
        verdict: blockerVerdict(stamp, decision.blocker),
      };
    if (decision.kind === "ready" || decision.kind === "merged")
      return {
        kind: "terminal",
        verdict: stamp(
          {
            kind: "READY",
            terminal: true,
            exitCode: 0,
            scope: { kind: "single", mr: decision.mr },
          },
          args.mode
        ),
      };
    if (decision.kind === "clear")
      return {
        kind: "terminal",
        verdict: stamp(
          {
            kind: "READY",
            terminal: true,
            exitCode: 0,
            scope: { kind: "stack", mrs: decision.mrs },
          },
          args.mode
        ),
      };
    args.dependencies.emit(
      stamp({
        kind: "WAITING",
        terminal: false,
        frontier: decision.frontier,
        reason: decision.reason,
      })
    );
    return {
      kind: "sleep",
      seconds: args.options.interval,
      onDeadline: () =>
        stamp({
          kind: "TIMEOUT",
          terminal: true,
          exitCode: 5,
          reason:
            decision.reason.kind === "merge-train"
              ? {
                  kind: "queued-stack",
                  frontier: decision.frontier,
                  unmergedCount: decision.reason.unmergedCount,
                }
              : timeoutReason(decision.reason),
        }),
    };
  };
  return pollUntilTerminal({
    dependencies: args.dependencies,
    options: args.options,
    stamp,
    step,
  });
}
export type QueueWork =
  | {
      readonly kind: "whole-stack-sweep";
      readonly remaining: T.NonEmpty<T.MrContext>;
    }
  | { readonly kind: "frontier-poll"; readonly frontier: T.MrContext };
export interface QueueState {
  readonly queue: T.NonEmpty<T.MrContext>;
  readonly snapshots: ReadonlyMap<T.MrIid, T.MrSnapshot>;
  readonly work: QueueWork | null;
  readonly nextSweepAt: number;
  readonly frontier: T.MrContext | null;
  readonly lastWaitKey: string | null;
  readonly startedAt: number;
}
export const createQueueState = (
  queue: T.NonEmpty<T.MrContext>,
  now: number
): QueueState => ({
  queue,
  snapshots: new Map(),
  work: { kind: "whole-stack-sweep", remaining: queue },
  nextSweepAt: now,
  frontier: null,
  lastWaitKey: null,
  startedAt: now,
});
const orderedRows = (state: QueueState): T.MrSnapshot[] =>
  state.queue.flatMap((context) => {
    const row = state.snapshots.get(context.iid);
    return row === undefined ? [] : [row];
  });
const activeRows = (state: QueueState): T.MrSnapshot[] =>
  orderedRows(state).filter((row) => row.kind !== "merged");
export function planQueue(state: QueueState, now: number): QueueState {
  if (state.work !== null) return state;
  if (state.snapshots.size === 0 || now >= state.nextSweepAt) {
    const remaining = nonEmpty(
      state.queue.filter(
        (context) => state.snapshots.get(context.iid)?.kind !== "merged"
      )
    );
    if (remaining !== null)
      return { ...state, work: { kind: "whole-stack-sweep", remaining } };
  }
  const frontier = activeRows(state)[0]?.context;
  return frontier === undefined
    ? state
    : { ...state, work: { kind: "frontier-poll", frontier } };
}
export interface QueueSnapshotResult {
  readonly state: QueueState;
  readonly completedSweepRows: T.NonEmpty<T.MrSnapshot> | null;
}
export function applyQueueSnapshot(
  state: QueueState,
  snapshot: T.MrSnapshot,
  now: number,
  options: T.PollingOptions
): QueueSnapshotResult {
  if (state.work === null) throw new Error("queue has no read in flight");
  const snapshots = new Map(state.snapshots);
  snapshots.set(snapshot.context.iid, snapshot);
  const base = { ...state, snapshots };
  if (state.work.kind === "frontier-poll")
    return { state: { ...base, work: null }, completedSweepRows: null };
  const [head, ...tail] = state.work.remaining;
  if (head.iid !== snapshot.context.iid)
    throw new Error("snapshot does not match sweep head");
  const remaining = nonEmpty(tail);
  if (remaining !== null)
    return {
      state: { ...base, work: { kind: "whole-stack-sweep", remaining } },
      completedSweepRows: null,
    };
  const rows = nonEmpty(
    state.queue.flatMap((context) => {
      const row = snapshots.get(context.iid);
      return row === undefined ? [] : [row];
    })
  );
  if (rows === null || rows.length !== state.queue.length)
    throw new Error("sweep completed without every snapshot");
  return {
    state: { ...base, work: null, nextSweepAt: now + options.sweepInterval },
    completedSweepRows: rows,
  };
}
export type QueueEvaluation =
  | {
      readonly kind: "complete";
      readonly state: QueueState;
      readonly merged: T.NonEmpty<T.MergedMr>;
    }
  | {
      readonly kind: "blocker";
      readonly state: QueueState;
      readonly blocker: T.MergeBlocker;
    }
  | {
      readonly kind: "advance";
      readonly state: QueueState;
      readonly merged: T.MrContext;
      readonly frontier: T.MrContext;
      readonly remaining: number;
    }
  | {
      readonly kind: "timeout";
      readonly state: QueueState;
      readonly frontier: T.MrContext;
      readonly unmergedCount: number;
    }
  | {
      readonly kind: "waiting";
      readonly state: QueueState;
      readonly frontier: T.MrContext;
      readonly reason: T.WaitReason;
      readonly emit: boolean;
    };
function waitKey(frontier: T.MrContext, reason: T.WaitReason): string {
  switch (reason.kind) {
    case "pending-checks":
      return `pending:${frontier.iid}:${reason.pending.length}`;
    case "merge-train":
      return `train:${frontier.iid}:${reason.unmergedCount}:${reason.trains}`;
    case "approval-wait":
      return `approval:${frontier.iid}:${reason.status}:${reason.approvalsLeft}`;
    case "unknown-merge-status":
      return `unknown:${frontier.iid}:${reason.raw}`;
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}
export function evaluateQueue(
  state: QueueState,
  now: number,
  options: T.PollingOptions,
  train: T.MergeTrainRead
): QueueEvaluation {
  const active = activeRows(state);
  if (active.length === 0) {
    const merged = nonEmpty(
      orderedRows(state).flatMap((row) =>
        row.kind === "merged"
          ? [
              {
                kind: "merged-mr" as const,
                context: row.context,
                mergedAt: row.facts.mergedAt,
              },
            ]
          : []
      )
    );
    if (merged === null) throw new Error("empty queue cannot complete");
    return { kind: "complete", state, merged };
  }
  const rows = nonEmpty(active);
  if (rows === null) throw new Error("active queue cannot be empty");
  const decision = selectTierMajorStackDecision(rows, options.allowDraft);
  if (decision.kind === "blocker")
    return { kind: "blocker", state, blocker: decision.blocker };
  const frontier = rows[0].context;
  if (state.frontier !== null && state.frontier.iid !== frontier.iid)
    return {
      kind: "advance",
      state: { ...state, frontier, lastWaitKey: null },
      merged: state.frontier,
      frontier,
      remaining: active.length,
    };
  if (deadlinePassed(state.startedAt, options, now))
    return {
      kind: "timeout",
      state: { ...state, frontier },
      frontier,
      unmergedCount: active.length,
    };
  const frontierWait = localWait(rows[0]);
  const inTrain =
    train.kind === "active" && train.iids.some((iid) => iid === frontier.iid);
  const reason =
    frontierWait ??
    ({
      kind: "merge-train",
      unmergedCount: active.length,
      trains: train.kind,
      inTrain,
    } as const);
  const key = waitKey(frontier, reason);
  return {
    kind: "waiting",
    state: { ...state, frontier, lastWaitKey: key },
    frontier,
    reason,
    emit: state.lastWaitKey !== key,
  };
}
export async function runQueued(args: {
  readonly dependencies: RunDependencies;
  readonly contexts: T.NonEmpty<T.MrContext>;
  readonly options: T.PollingOptions;
}): Promise<T.QueueTerminalVerdict> {
  let state = createQueueState(args.contexts, args.dependencies.clock.now());
  const stamp = verdictFactory(args.dependencies.clock, "queued-stack");
  args.dependencies.emit(
    stamp({ kind: "QUEUE", terminal: false, queue: args.contexts })
  );
  const step = async (): Promise<StepResult<T.QueueTerminalVerdict>> => {
    state = planQueue(state, args.dependencies.clock.now());
    if (state.work === null) {
      const train = await args.dependencies.reader.mergeTrain(args.contexts[0]);
      const complete = evaluateQueue(
        state,
        args.dependencies.clock.now(),
        args.options,
        train
      );
      if (complete.kind !== "complete")
        throw new Error("queue has no work while active");
      return {
        kind: "terminal",
        verdict: stamp({
          kind: "COMPLETE",
          terminal: true,
          exitCode: 0,
          queue: state.queue,
          merged: complete.merged,
        }),
      };
    }
    const context =
      state.work.kind === "whole-stack-sweep"
        ? state.work.remaining[0]
        : state.work.frontier;
    const snapshot = await readSnapshot({
      reader: args.dependencies.reader,
      context,
      pendingHistory: "omit",
      allowDraft: args.options.allowDraft,
    });
    const applied = applyQueueSnapshot(
      state,
      snapshot,
      args.dependencies.clock.now(),
      args.options
    );
    state = applied.state;
    if (applied.completedSweepRows !== null)
      args.dependencies.emit(
        stamp({
          kind: "STATUS",
          terminal: false,
          reason: "whole-stack-sweep",
          rows: applied.completedSweepRows,
        })
      );
    if (state.work !== null) return { kind: "continue" };
    const train = await args.dependencies.reader.mergeTrain(args.contexts[0]);
    const evaluation = evaluateQueue(
      state,
      args.dependencies.clock.now(),
      args.options,
      train
    );
    state = evaluation.state;
    switch (evaluation.kind) {
      case "complete":
        return {
          kind: "terminal",
          verdict: stamp({
            kind: "COMPLETE",
            terminal: true,
            exitCode: 0,
            queue: state.queue,
            merged: evaluation.merged,
          }),
        };
      case "blocker":
        return {
          kind: "terminal",
          verdict: blockerVerdict(stamp, evaluation.blocker),
        };
      case "advance":
        args.dependencies.emit(
          stamp({
            kind: "ADVANCE",
            terminal: false,
            merged: evaluation.merged,
            frontier: evaluation.frontier,
            remaining: evaluation.remaining,
          })
        );
        return { kind: "continue" };
      case "timeout":
        return {
          kind: "terminal",
          verdict: stamp({
            kind: "TIMEOUT",
            terminal: true,
            exitCode: 5,
            reason: {
              kind: "queued-stack",
              frontier: evaluation.frontier,
              unmergedCount: evaluation.unmergedCount,
            },
          }),
        };
      case "waiting":
        if (evaluation.emit)
          args.dependencies.emit(
            stamp({
              kind: "WAITING",
              terminal: false,
              frontier: evaluation.frontier,
              reason: evaluation.reason,
            })
          );
        return { kind: "sleep", seconds: args.options.interval };
      default: {
        const exhaustive: never = evaluation;
        return exhaustive;
      }
    }
  };
  return pollUntilTerminal({
    dependencies: args.dependencies,
    options: args.options,
    stamp,
    step,
  });
}
