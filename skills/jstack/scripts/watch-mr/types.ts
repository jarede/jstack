declare const mrIidBrand: unique symbol;
export type MrIid = number & { readonly [mrIidBrand]: "MrIid" };
export type NonEmpty<T> = readonly [T, ...T[]];
export function nonEmpty<T>(items: readonly T[]): NonEmpty<T> | null {
  return items.length === 0 ? null : [items[0], ...items.slice(1)];
}
export function parseMrIid(value: unknown, label = "MR iid"): MrIid {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
    throw new Error(`${label} must be a positive integer`);
  return value as MrIid;
}
export interface Project {
  readonly host: string | null;
  readonly path: string;
}
export interface MrContext extends Project {
  readonly iid: MrIid;
}
/**
 * Known `detailed_merge_status` values and the policy class each one feeds.
 * Any other string is `unknown` and the raw value is kept for the output.
 */
export const DETAILED_MERGE_STATUS_MAP = [
  ["mergeable", "ready"],
  ["ci_must_pass", "pipeline-wait"],
  ["ci_still_running", "pipeline-wait"],
  ["conflict", "conflict"],
  ["need_rebase", "conflict"],
  ["discussions_not_resolved", "threads"],
  ["not_approved", "approval-wait"],
  ["requested_changes", "approval-wait"],
  ["draft_status", "draft"],
  ["checking", "unknown-poll"],
  ["unchecked", "unknown-poll"],
  ["preparing", "unknown-poll"],
] as const;
export type KnownMergeStatus = (typeof DETAILED_MERGE_STATUS_MAP)[number][0];
export type MergeStatusKind = (typeof DETAILED_MERGE_STATUS_MAP)[number][1];
export type MergeStatusClass =
  | { readonly kind: "ready" }
  | {
      readonly kind: "pipeline-wait";
      readonly raw: "ci_must_pass" | "ci_still_running";
    }
  | { readonly kind: "conflict"; readonly raw: "conflict" | "need_rebase" }
  | { readonly kind: "threads"; readonly raw: "discussions_not_resolved" }
  | {
      readonly kind: "approval-wait";
      readonly raw: "not_approved" | "requested_changes";
    }
  | { readonly kind: "draft"; readonly raw: "draft_status" }
  | {
      readonly kind: "unknown-poll";
      readonly raw: "checking" | "unchecked" | "preparing";
    }
  | { readonly kind: "unknown"; readonly raw: string };
export type MrState = "opened" | "closed" | "merged" | "locked";
/**
 * The head pipeline and the project it runs in. A merge request from a fork
 * runs its pipeline in the source project, so every job and pipeline read for
 * this MR has to name that project, not the MR's own.
 */
export interface HeadPipeline {
  readonly id: number;
  readonly status: string;
  readonly projectId: number | null;
}
export interface MergeRequestFacts {
  readonly context: MrContext;
  readonly state: MrState;
  readonly draft: boolean;
  readonly detailedMergeStatus: string;
  readonly mergeStatus: MergeStatusClass;
  readonly hasConflicts: boolean;
  readonly sha: string | null;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly mergedAt: string | null;
  readonly headPipeline: HeadPipeline | null;
  readonly blockingDiscussionsResolved: boolean;
}
export interface OpenMergeRequest {
  readonly iid: MrIid;
  readonly sourceBranch: string;
  readonly targetBranch: string;
}
export interface ReviewNote {
  readonly authorUsername: string | null;
  readonly body: string;
  readonly path: string | null;
  readonly line: number | null;
  readonly createdAt: string;
}
export interface ReviewThread {
  readonly id: string;
  readonly firstNote: ReviewNote | null;
  readonly isReviewBot: boolean;
  readonly botReviewPasses: number;
}
interface CheckDetails {
  readonly name: string;
  readonly reportedState: string;
  readonly description: string;
  readonly link: string;
  readonly stage: string;
}
export type Check =
  | PassedCheck
  | SkippedCheck
  | FailedCheck
  | PendingCheck;
export type PassedCheck = CheckDetails & { readonly kind: "passed" };
export type SkippedCheck = CheckDetails & { readonly kind: "skipped" };
export type FailedCheck = CheckDetails & { readonly kind: "failed" };
export type PendingCheck = CheckDetails & { readonly kind: "pending" };
export interface CheckRead {
  readonly source: "pipeline-jobs";
  readonly checks: NonEmpty<Check>;
}
export interface PipelineRecord {
  readonly id: number;
  readonly sha: string;
  readonly status: string;
}
export interface ApprovalState {
  readonly approved: boolean;
  readonly approvalsLeft: number | null;
}
export type MergeTrainRead =
  | { readonly kind: "absent" }
  | { readonly kind: "active"; readonly iids: readonly MrIid[] };
export type ForgeMergeRefusal = {
  readonly kind: "refused";
  readonly detailedMergeStatus: string;
  readonly pipelineStatus: "failed" | "canceled";
};
export type ForgeMergeAllowed = {
  readonly kind: "allowed";
  readonly detailedMergeStatus: string;
};
export type ForgeMergeAssessment = ForgeMergeAllowed | ForgeMergeRefusal;
interface CiBase {
  readonly source: CheckRead["source"];
  readonly all: NonEmpty<Check>;
  readonly hadPreviousPassingCi: boolean;
}
export type CiFailing = CiBase & {
  readonly kind: "ci-failing";
  readonly failed: NonEmpty<FailedCheck>;
  readonly pending: readonly PendingCheck[];
  readonly forge: ForgeMergeAssessment;
};
export type CiForgeRejected = CiBase & {
  readonly kind: "ci-forge-rejected";
  readonly failed: readonly [];
  readonly pending: readonly PendingCheck[];
  readonly forge: ForgeMergeRefusal;
};
export type CiPending = CiBase & {
  readonly kind: "ci-pending";
  readonly failed: readonly [];
  readonly pending: NonEmpty<PendingCheck>;
};
export type CiClean = CiBase & {
  readonly kind: "ci-clean";
  readonly failed: readonly [];
  readonly pending: readonly [];
  readonly forge: ForgeMergeAllowed;
};
export type CiState = CiFailing | CiForgeRejected | CiPending | CiClean;
export type MrSnapshot =
  | {
      readonly kind: "merged" | "closed";
      readonly context: MrContext;
      readonly facts: MergeRequestFacts;
    }
  | {
      readonly kind: "open";
      readonly context: MrContext;
      readonly facts: MergeRequestFacts;
      readonly threads: readonly ReviewThread[];
      readonly ci: CiState;
      readonly approvals: ApprovalState | null;
      readonly reviewAutomationRunning: boolean;
    };
export interface ReadyMr {
  readonly kind: "ready-mr";
  readonly context: MrContext;
  readonly proof: {
    readonly mergeability: "clear";
    readonly threads: readonly [];
    readonly ci: CiClean;
    readonly gate: {
      readonly state: "opened";
      readonly approval: "approved" | "not-required";
      readonly draft: "not-draft" | "draft-allowed";
    };
  };
}
export interface MergedMr {
  readonly kind: "merged-mr";
  readonly context: MrContext;
  readonly mergedAt: string | null;
}
export type MergeGateReason =
  | "closed-without-merge"
  | "draft-mr"
  | "unknown-merge-status";
export type MergeBlocker =
  | {
      readonly kind: "merge-conflicts";
      readonly mr: MrContext;
      readonly facts: MergeRequestFacts;
    }
  | {
      readonly kind: "review-threads";
      readonly mr: MrContext;
      readonly threads: NonEmpty<ReviewThread>;
    }
  | {
      readonly kind: "failing-checks";
      readonly mr: MrContext;
      readonly ci: CiFailing | CiForgeRejected;
    }
  | {
      readonly kind: "merge-gate";
      readonly mr: MrContext;
      readonly reason: "closed-without-merge" | "draft-mr";
    }
  | {
      readonly kind: "merge-gate";
      readonly mr: MrContext;
      readonly reason: "unknown-merge-status";
      readonly raw: string;
    };
export type QueryFailure =
  | {
      readonly kind: "json-parse";
      readonly retryable: true;
      readonly detail: string;
    }
  | {
      readonly kind: "missing-key";
      readonly retryable: true;
      readonly detail: string;
      readonly rawValue?: string;
    }
  | {
      readonly kind: "command-exit";
      readonly retryable: true;
      readonly detail: string;
      readonly code: number;
    }
  | {
      readonly kind: "checks-unavailable";
      readonly retryable: true;
      readonly detail: string;
    }
  | {
      readonly kind: "invalid-context";
      readonly retryable: false;
      readonly detail: string;
      readonly rawValue: string;
    };
export type WaitReason =
  | {
      readonly kind: "pending-checks";
      readonly pending: NonEmpty<PendingCheck>;
    }
  | {
      readonly kind: "merge-train";
      readonly unmergedCount: number;
      readonly trains: "active" | "absent";
      readonly inTrain: boolean;
    }
  | {
      readonly kind: "approval-wait";
      readonly status: "not_approved" | "requested_changes";
      readonly approvalsLeft: number | null;
    }
  | { readonly kind: "unknown-merge-status"; readonly raw: string };
/**
 * `frontier` names the lowest unmerged MR that is actually waiting.
 * `reason` is that MR's wait only. Pooling every row's pending checks
 * under the bottom MR misattributes upstack waits to the frontier.
 *
 * Single and stack mode use this decision. Queued mode reports its own
 * merge frontier. When that MR is blocker-free it emits a merge-train
 * wait and ignores upstack pending, because upstack checks do not block
 * the frontier merge.
 */
export interface WaitingDecision {
  readonly kind: "waiting";
  readonly frontier: MrContext;
  readonly reason: WaitReason;
}
export type MrDecision =
  | { readonly kind: "blocker"; readonly blocker: MergeBlocker }
  | WaitingDecision
  | { readonly kind: "ready"; readonly mr: ReadyMr }
  | { readonly kind: "merged"; readonly mr: MergedMr };
export type StackDecision =
  | { readonly kind: "blocker"; readonly blocker: MergeBlocker }
  | WaitingDecision
  | { readonly kind: "clear"; readonly mrs: NonEmpty<ReadyMr | MergedMr> };
export type WatchMode = "single" | "stack" | "queued-stack";
interface EventBase<K extends string, M extends WatchMode = WatchMode> {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly observedAt: string;
  readonly mode: M;
  readonly kind: K;
}
interface Progress<K extends string, M extends WatchMode = WatchMode>
  extends EventBase<K, M> {
  readonly terminal: false;
}
interface Terminal<
  K extends string,
  C extends number,
  M extends WatchMode = WatchMode,
> extends EventBase<K, M> {
  readonly terminal: true;
  readonly exitCode: C;
}
export type ProgressVerdict =
  | (Progress<"QUEUE", "queued-stack"> & {
      readonly queue: NonEmpty<MrContext>;
    })
  | (Progress<"STATUS", "stack" | "queued-stack"> & {
      readonly reason: "poll" | "whole-stack-sweep";
      readonly rows: NonEmpty<MrSnapshot>;
    })
  | (Progress<"WAITING"> & {
      readonly frontier: MrContext;
      readonly reason: WaitReason;
    })
  | (Progress<"ADVANCE", "queued-stack"> & {
      readonly merged: MrContext;
      readonly frontier: MrContext;
      readonly remaining: number;
    })
  | (Progress<"RETRY"> & {
      readonly failure: QueryFailure;
      readonly consecutiveFailures: number;
      readonly retryInSeconds: number;
    });
export type BlockerVerdict =
  | (Terminal<"BLOCKER", 2> & {
      readonly blocker: Extract<MergeBlocker, { readonly kind: "merge-conflicts" }>;
    })
  | (Terminal<"BLOCKER", 3> & {
      readonly blocker: Extract<MergeBlocker, { readonly kind: "review-threads" }>;
    })
  | (Terminal<"BLOCKER", 4> & {
      readonly blocker: Extract<MergeBlocker, { readonly kind: "failing-checks" }>;
    })
  | (Terminal<"BLOCKER", 6> & {
      readonly blocker: Extract<MergeBlocker, { readonly kind: "merge-gate" }>;
    })
  | (Terminal<"BLOCKER", 7> & {
      readonly blocker: {
        readonly kind: "status-query";
        readonly failures: number;
        readonly failure: QueryFailure;
      };
    });
export type TimeoutVerdict = Terminal<"TIMEOUT", 5> & {
  readonly reason:
    | {
        readonly kind: "pending-checks";
        readonly pending: NonEmpty<PendingCheck>;
      }
    | {
        readonly kind: "approval-wait";
        readonly status: "not_approved" | "requested_changes";
      }
    | { readonly kind: "unknown-merge-status"; readonly raw: string }
    | { readonly kind: "status-unavailable"; readonly failure: QueryFailure }
    | {
        readonly kind: "queued-stack";
        readonly frontier: MrContext;
        readonly unmergedCount: number;
      };
};
export type TerminalVerdict =
  | (Terminal<"STATUS", 0> & {
      readonly reason: "status-only";
      readonly rows: NonEmpty<MrSnapshot>;
    })
  | (Terminal<"READY", 0, "single" | "stack"> & {
      readonly scope:
        | { readonly kind: "single"; readonly mr: ReadyMr | MergedMr }
        | {
            readonly kind: "stack";
            readonly mrs: NonEmpty<ReadyMr | MergedMr>;
          };
    })
  | (Terminal<"COMPLETE", 0, "queued-stack"> & {
      readonly queue: NonEmpty<MrContext>;
      readonly merged: NonEmpty<MergedMr>;
    })
  | BlockerVerdict
  | TimeoutVerdict;
export type WatcherVerdict = ProgressVerdict | TerminalVerdict;
export type ExitCode = TerminalVerdict["exitCode"];
export type QueueTerminalVerdict =
  | Extract<TerminalVerdict, { readonly kind: "COMPLETE" }>
  | BlockerVerdict
  | TimeoutVerdict;
export interface ForgeReader {
  readonly bots: readonly string[];
  originProject(): Promise<Project | null>;
  currentMr(project: Project | null, iid: MrIid | null): Promise<MrContext>;
  mergeRequest(context: MrContext): Promise<MergeRequestFacts>;
  openMergeRequests(project: Project): Promise<readonly OpenMergeRequest[]>;
  defaultBranch(project: Project): Promise<string>;
  pipelineJobs(
    context: MrContext,
    pipeline: HeadPipeline
  ): Promise<readonly Check[]>;
  discussions(context: MrContext): Promise<readonly ReviewThread[]>;
  approvals(context: MrContext): Promise<ApprovalState>;
  /** `projectId` is the head pipeline's project: a fork MR runs it elsewhere. */
  pipelines(
    context: MrContext,
    projectId: number | null
  ): Promise<readonly PipelineRecord[]>;
  mergeTrain(project: Project): Promise<MergeTrainRead>;
}
export interface PollingOptions {
  readonly interval: number;
  readonly sweepInterval: number;
  readonly timeout: number;
  readonly maxQueryErrors: number;
  readonly allowDraft: boolean;
}
