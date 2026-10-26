import { dirname, join } from "node:path";
import {
  RECOVERY_POLL_MS,
  WAIT_POLL_MS,
  exitFileName,
  stateFileName,
  type DispatchDependencies,
  type DispatchFs,
  type DispatchRecord,
  type DispatchRequest,
  type DispatchState,
  type DispatchStatus,
  type InFlightState,
  type ListTerminalsResult,
  type OrcaError,
  type PaneNode,
  type SplitDirection,
  type SplitResult,
  type TerminalHandle,
  type TerminalInfo,
  type TerminalState,
} from "./types.ts";

/** Exit codes the coordinator dispatches on. Usage errors never reach a state. */
export const EXIT_DONE = 0;
export const EXIT_USAGE = 2;
export const EXIT_DISPATCH_FAILED = 3;
export const EXIT_AMBIGUOUS = 4;
export const EXIT_PANE_GONE = 5;
export const EXIT_DELEGATE_EXITED = 6;
export const EXIT_STILL_RUNNING = 124;

export function statusOf(state: TerminalState): DispatchStatus {
  switch (state.kind) {
    case "done":
      return "done";
    case "dispatch-failed":
      return "dispatch-failed";
    case "ambiguous":
      return "ambiguous";
    case "pane-gone":
      return "pane-gone-no-report";
    case "exited":
      return "exited-no-report";
    case "still-running":
      return "still-running";
    default: {
      const undecided: never = state;
      return undecided;
    }
  }
}

export function exitCodeOf(state: TerminalState): number {
  switch (state.kind) {
    case "done":
      return EXIT_DONE;
    case "dispatch-failed":
      return EXIT_DISPATCH_FAILED;
    case "ambiguous":
      return EXIT_AMBIGUOUS;
    case "pane-gone":
      return EXIT_PANE_GONE;
    case "exited":
      return EXIT_DELEGATE_EXITED;
    case "still-running":
      return EXIT_STILL_RUNNING;
    default: {
      const undecided: never = state;
      return undecided;
    }
  }
}

/** The handle an operator can act on: the pane when there is one, else null. */
export function handleOf(state: TerminalState): TerminalHandle | null {
  return state.kind === "ambiguous" || state.kind === "dispatch-failed"
    ? null
    : state.handle;
}

export function statePathFor(request: DispatchRequest): string {
  return join(dirname(request.report), stateFileName(request.name));
}

/** The exit sidecar the pane writes once the delegate process returns. */
export function exitPathFor(request: DispatchRequest): string {
  return join(dirname(request.report), exitFileName(request.name));
}

/** The status the delegate's shell recorded, or null when it never wrote one. */
export function readExitStatus(fs: DispatchFs, path: string): number | null {
  const raw = fs.readTextFile(path);
  if (raw === null) return null;
  const status = Number.parseInt(raw.trim(), 10);
  return Number.isNaN(status) ? null : status;
}

/** Step 1: the report is the only completion signal, and its size is the proof. */
export function reportReady(fs: DispatchFs, report: string): boolean {
  const size = fs.fileSize(report);
  return size !== null && size > 0;
}

export function readStateFile(
  fs: DispatchFs,
  path: string
): DispatchRecord | null {
  const raw = fs.readTextFile(path);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as {
    readonly handle?: unknown;
    readonly startedAt?: unknown;
  };
  if (typeof record.handle !== "string" || record.handle === "") return null;
  return {
    handle: record.handle,
    startedAt: typeof record.startedAt === "string" ? record.startedAt : "",
  };
}

export function writeStateFile(
  fs: DispatchFs,
  path: string,
  record: DispatchRecord
): void {
  fs.writeTextFile(path, `${JSON.stringify(record)}\n`);
}

/** Step 2: only a handle a fresh list still shows counts as running. */
export function liveHandle(
  listed: ListTerminalsResult,
  handle: TerminalHandle
): TerminalHandle | null {
  if (!listed.ok) return null;
  return listed.terminals.some((row) => row.handle === handle) ? handle : null;
}

/** The tab the coordinator's own pane lives in; recovery diffs inside it. */
export function callerTabId(
  terminals: readonly TerminalInfo[],
  caller: TerminalHandle
): string | null {
  return terminals.find((row) => row.handle === caller)?.tabId ?? null;
}

export function tabHandles(
  terminals: readonly TerminalInfo[],
  tabId: string
): ReadonlySet<TerminalHandle> {
  return new Set(
    terminals.filter((row) => row.tabId === tabId).map((row) => row.handle)
  );
}

/** Handles in the tab that were not there when the split was attempted. */
export function newHandlesInTab(
  terminals: readonly TerminalInfo[],
  tabId: string,
  snapshot: ReadonlySet<TerminalHandle>
): readonly TerminalHandle[] {
  return [
    ...new Set(
      terminals
        .filter((row) => row.tabId === tabId && !snapshot.has(row.handle))
        .map((row) => row.handle)
    ),
  ].sort();
}

export interface PaneSplitTarget {
  readonly terminal: TerminalHandle;
  readonly direction: SplitDirection;
}

interface PaneLeaf {
  readonly handle: TerminalHandle;
  readonly depth: number;
  readonly parentDirection: SplitDirection | null;
}

/** Leaves in tree order: `first` before `second`, so top-down then left-right. */
function paneLeaves(
  node: PaneNode,
  depth: number,
  parentDirection: SplitDirection | null
): readonly PaneLeaf[] {
  if (node.type === "terminal")
    return [{ handle: node.handle, depth, parentDirection }];
  return [
    ...paneLeaves(node.first, depth + 1, node.direction),
    ...paneLeaves(node.second, depth + 1, node.direction),
  ];
}

/**
 * Which pane the next delegate splits, and across which axis. Splitting the
 * shallowest delegate keeps the grid square, and crossing the parent's
 * direction keeps each new pane the same size as its siblings. The direction
 * is inverted because in Orca `horizontal` stacks panes and `vertical` puts
 * them side by side.
 */
export function planPaneSplit(
  tree: PaneNode | null,
  coordinator: TerminalHandle
): PaneSplitTarget {
  const fallback: PaneSplitTarget = {
    terminal: coordinator,
    direction: "horizontal",
  };
  if (tree === null) return fallback;
  const leaves = paneLeaves(tree, 0, null);
  if (!leaves.some((leaf) => leaf.handle === coordinator)) return fallback;
  let target: PaneLeaf | null = null;
  for (const leaf of leaves) {
    if (leaf.handle === coordinator) continue;
    if (target === null || leaf.depth < target.depth) target = leaf;
  }
  if (target === null) return fallback;
  return {
    terminal: target.handle,
    direction: target.parentDirection === "horizontal" ? "vertical" : "horizontal",
  };
}

export type StartPlan =
  | { readonly kind: "done" }
  | { readonly kind: "resume"; readonly handle: TerminalHandle }
  | { readonly kind: "dispatch" };

export function planStart(args: {
  readonly reportPresent: boolean;
  readonly record: TerminalHandle | null;
  readonly listed: ListTerminalsResult;
}): StartPlan {
  if (args.reportPresent) return { kind: "done" };
  const running =
    args.record === null ? null : liveHandle(args.listed, args.record);
  return running === null
    ? { kind: "dispatch" }
    : { kind: "resume", handle: running };
}

export type SplitPlan =
  | { readonly kind: "adopt"; readonly handle: TerminalHandle }
  | { readonly kind: "recover"; readonly error: OrcaError };

export function decideSplit(result: SplitResult): SplitPlan {
  return result.ok
    ? { kind: "adopt", handle: result.handle }
    : { kind: "recover", error: result.error };
}

export type RecoveryPlan =
  | { readonly kind: "adopted"; readonly handle: TerminalHandle }
  | { readonly kind: "ambiguous"; readonly handles: readonly TerminalHandle[] }
  | { readonly kind: "keep-polling" };

export function decideRecovery(
  candidates: readonly TerminalHandle[]
): RecoveryPlan {
  const unique = [...new Set(candidates)].sort();
  if (unique.length === 0) return { kind: "keep-polling" };
  return unique.length === 1
    ? { kind: "adopted", handle: unique[0] }
    : { kind: "ambiguous", handles: unique };
}

export type WaitPlan =
  | { readonly kind: "done" }
  | { readonly kind: "exited" }
  | { readonly kind: "pane-gone" }
  | { readonly kind: "still-running" }
  | { readonly kind: "poll-again" };

/**
 * The order carries the rule: a report that landed outranks everything, an exit
 * sidecar outranks a pane that vanished (the shell stays open after the delegate
 * dies, so the pane alone cannot tell a finished unit from a running one), a
 * vanished pane outranks the deadline, and the deadline is only consulted while
 * both still say the unit is alive.
 */
export function decideWait(args: {
  readonly reportPresent: boolean;
  readonly exitPresent: boolean;
  readonly paneListed: boolean;
  readonly deadlineReached: boolean;
}): WaitPlan {
  if (args.reportPresent) return { kind: "done" };
  if (args.exitPresent) return { kind: "exited" };
  if (!args.paneListed) return { kind: "pane-gone" };
  if (args.deadlineReached) return { kind: "still-running" };
  return { kind: "poll-again" };
}

/** Single-quote for `/bin/sh`. A quote inside a path or model id must survive. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/**
 * The command the pane runs: one opencode run, one brief, one report, and a
 * sidecar recording the exit status. The status is captured inside `/bin/sh -c`
 * because the pane shell is the operator's, which may be fish and has no `$?`;
 * the delegate's own output still reaches the pane untouched.
 */
export function delegateCommand(request: DispatchRequest): string {
  const prompt =
    `Read and follow the brief in ${request.brief}. ` +
    `Write your final report to ${request.report}.`;
  const run =
    `opencode run --auto ` +
    `-m ${shellQuote(request.model)} ` +
    `--title ${shellQuote(`jstack ${request.name}`)} ` +
    `${shellQuote(prompt)}`;
  const capture = `${run}; printf '%s' "$?" > ${shellQuote(exitPathFor(request))}`;
  return `cd ${shellQuote(request.workdir)} && /bin/sh -c ${shellQuote(capture)}`;
}

/**
 * A failed list is not evidence the pane died, so it keeps the pane counted as
 * listed and lets the deadline decide instead of guessing a dead pane.
 */
async function paneStillListed(
  orca: DispatchDependencies["orca"],
  handle: TerminalHandle
): Promise<boolean> {
  const listed = await orca.listTerminals();
  return !listed.ok || listed.terminals.some((row) => row.handle === handle);
}

/**
 * The wait signal is the report file. The pane shell never exits after the
 * delegate finishes, so `orca terminal wait --for exit` would answer "still
 * working" on a finished unit; the report is what closes the loop. A delegate
 * that died before writing one leaves its exit sidecar, which ends the wait
 * immediately instead of running the deadline out.
 */
async function waitForReport(
  deps: DispatchDependencies,
  request: DispatchRequest,
  inflight: InFlightState
): Promise<TerminalState> {
  const handle = inflight.handle;
  const statePath = statePathFor(request);
  const exitPath = exitPathFor(request);
  const deadline = deps.clock.now() + request.timeoutMinutes * 60_000;
  while (true) {
    const exitStatus = readExitStatus(deps.fs, exitPath);
    const plan = decideWait({
      reportPresent: reportReady(deps.fs, request.report),
      exitPresent: exitStatus !== null,
      paneListed: await paneStillListed(deps.orca, handle),
      deadlineReached: deps.clock.now() >= deadline,
    });
    if (plan.kind === "done") {
      await deps.orca.close({ terminal: handle });
      deps.fs.removeFile(statePath);
      deps.fs.removeFile(exitPath);
      return { kind: "done", handle };
    }
    if (plan.kind === "exited")
      return { kind: "exited", handle, exitStatus: exitStatus ?? 0 };
    if (plan.kind === "pane-gone") return { kind: "pane-gone", handle };
    if (plan.kind === "still-running")
      return { kind: "still-running", handle };
    await deps.clock.sleep(WAIT_POLL_MS);
  }
}

type RecoveryOutcome =
  | { readonly kind: "handle"; readonly handle: TerminalHandle }
  | { readonly kind: "state"; readonly state: TerminalState };

/**
 * A split that did not answer may still have started a pane. Diff the caller's
 * tab against the snapshot taken before the split: one new handle is the pane
 * that was asked for, several belong to somebody else and must not be picked.
 */
async function recoverHandle(
  deps: DispatchDependencies,
  request: DispatchRequest,
  args: {
    readonly tabId: string;
    readonly snapshot: ReadonlySet<TerminalHandle>;
    readonly splitError: OrcaError;
  }
): Promise<RecoveryOutcome> {
  const deadline = deps.clock.now() + request.recoverSeconds * 1_000;
  while (true) {
    const listed = await deps.orca.listTerminals();
    const plan = decideRecovery(
      listed.ok ? newHandlesInTab(listed.terminals, args.tabId, args.snapshot) : []
    );
    if (plan.kind === "adopted")
      return { kind: "handle", handle: plan.handle };
    if (plan.kind === "ambiguous")
      return {
        kind: "state",
        state: {
          kind: "ambiguous",
          handle: null,
          handles: plan.handles,
          tabId: args.tabId,
        },
      };
    if (deps.clock.now() >= deadline)
      return {
        kind: "state",
        state: {
          kind: "dispatch-failed",
          handle: null,
          reason: "no-new-pane",
          tabId: args.tabId,
          splitError: args.splitError,
        },
      };
    await deps.clock.sleep(RECOVERY_POLL_MS);
  }
}

/**
 * The rule this script exists to enforce: one unit, one pane, ever. A report
 * short-circuits, a live recorded handle resumes the wait instead of splitting
 * again, and a split that does not answer is recovered from the terminal list
 * before it is ever called a failure.
 */
export async function dispatch(
  deps: DispatchDependencies,
  request: DispatchRequest
): Promise<TerminalState> {
  if (reportReady(deps.fs, request.report))
    return { kind: "done", handle: null };

  const record = readStateFile(deps.fs, statePathFor(request));
  const listed = await deps.orca.listTerminals();
  const plan = planStart({
    reportPresent: false,
    record: record?.handle ?? null,
    listed,
  });
  if (plan.kind === "done") return { kind: "done", handle: null };
  if (plan.kind === "resume")
    return waitForReport(deps, request, { kind: "running", handle: plan.handle });

  // Nothing to adopt. This is the only place a split may run, and it refuses to
  // run blind: without the caller's tab there is nothing to recover against.
  if (!listed.ok)
    return {
      kind: "dispatch-failed",
      handle: null,
      reason: "terminal-list-unavailable",
      tabId: null,
      splitError: listed.error,
    };
  const tabId = callerTabId(listed.terminals, request.terminal);
  if (tabId === null)
    return {
      kind: "dispatch-failed",
      handle: null,
      reason: "caller-tab-unknown",
      tabId: null,
      splitError: null,
    };

  // A sidecar left by a previous run would end this wait the moment it starts,
  // so a fresh delegate always begins without one.
  deps.fs.removeFile(exitPathFor(request));
  const target = planPaneSplit(
    listed.layouts.find((layout) => layout.tabId === tabId)?.panes ?? null,
    request.terminal
  );
  const splitPlan = decideSplit(
    await deps.orca.split({
      terminal: target.terminal,
      direction: target.direction,
      command: delegateCommand(request),
    })
  );
  let handle: TerminalHandle;
  if (splitPlan.kind === "adopt") {
    handle = splitPlan.handle;
  } else {
    const recovered = await recoverHandle(deps, request, {
      tabId,
      snapshot: tabHandles(listed.terminals, tabId),
      splitError: splitPlan.error,
    });
    if (recovered.kind === "state") return recovered.state;
    handle = recovered.handle;
  }

  writeStateFile(deps.fs, statePathFor(request), {
    handle,
    startedAt: deps.clock.observedAt(),
  });
  return waitForReport(deps, request, { kind: "dispatched", handle });
}