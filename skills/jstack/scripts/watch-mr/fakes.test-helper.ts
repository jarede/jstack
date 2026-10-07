import type {
  ApprovalState,
  Check,
  FailedCheck,
  ForgeReader,
  PassedCheck,
  PendingCheck,
  SkippedCheck,
  MergeRequestFacts,
  MergeTrainRead,
  MrContext,
  OpenMergeRequest,
  PipelineRecord,
  Project,
  ReviewThread,
} from "./types.ts";
import { parseMrIid } from "./types.ts";

export interface FakeReaderOptions {
  readonly facts?: Partial<Omit<MergeRequestFacts, "context">>;
  readonly jobs?: readonly Check[];
  readonly threads?: readonly ReviewThread[];
  readonly pipelines?: readonly PipelineRecord[];
  readonly approvals?: ApprovalState;
  readonly openMergeRequests?: readonly OpenMergeRequest[];
  readonly origin?: Project | null;
  readonly current?: MrContext;
  readonly defaultBranch?: string;
  readonly train?: MergeTrainRead;
  readonly bots?: readonly string[];
}

export function passingCheck(name = "ci"): PassedCheck {
  return {
    kind: "passed",
    name,
    reportedState: "success",
    description: "",
    link: "",
    stage: "test",
  };
}

export function pendingCheck(name = "ci"): PendingCheck {
  return {
    kind: "pending",
    name,
    reportedState: "running",
    description: "",
    link: "",
    stage: "test",
  };
}

export function failedCheck(name = "ci"): FailedCheck {
  return {
    kind: "failed",
    name,
    reportedState: "failed",
    description: "",
    link: "",
    stage: "test",
  };
}

export function skippedCheck(name = "ci"): SkippedCheck {
  return {
    kind: "skipped",
    name,
    reportedState: "skipped",
    description: "",
    link: "",
    stage: "test",
  };
}

export function fakeReader(
  options: FakeReaderOptions = {}
): ForgeReader & { readonly calls: readonly string[] } {
  const calls: string[] = [];
  const context = options.current ?? {
    host: "git.example.test",
    path: "group/project",
    iid: parseMrIid(1),
  };
  const defaults: MergeRequestFacts = {
    context,
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
  };
  return {
    calls,
    bots: options.bots ?? [],
    async originProject() {
      calls.push("originProject");
      return options.origin === undefined
        ? { host: "git.example.test", path: "group/project" }
        : options.origin;
    },
    async currentMr(project, iid) {
      calls.push("currentMr");
      return {
        ...(project ?? context),
        iid: iid ?? context.iid,
      };
    },
    async mergeRequest(requested) {
      calls.push("mergeRequest");
      return { ...defaults, ...options.facts, context: requested };
    },
    async openMergeRequests() {
      calls.push("openMergeRequests");
      return options.openMergeRequests ?? [];
    },
    async defaultBranch() {
      calls.push("defaultBranch");
      return options.defaultBranch ?? "main";
    },
    async pipelineJobs(_requested, pipeline) {
      calls.push(
        pipeline.projectId === null
          ? "pipelineJobs"
          : `pipelineJobs:${pipeline.projectId}`
      );
      return options.jobs ?? [passingCheck()];
    },
    async discussions() {
      calls.push("discussions");
      return options.threads ?? [];
    },
    async approvals() {
      calls.push("approvals");
      return options.approvals ?? { approved: true, approvalsLeft: 0 };
    },
    async pipelines() {
      calls.push("pipelines");
      return options.pipelines ?? [{ id: 1, sha: "head", status: "success" }];
    },
    async mergeTrain() {
      calls.push("mergeTrain");
      return options.train ?? { kind: "absent" };
    },
  };
}
