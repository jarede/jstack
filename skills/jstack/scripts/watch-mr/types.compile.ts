import { parseMrIid } from "./types.ts";
import type {
  CiClean,
  ForgeMergeAllowed,
  MrContext,
  ReadyMr,
  TerminalVerdict,
} from "./types.ts";

type ReadyVerdict = Extract<TerminalVerdict, { readonly kind: "READY" }>;

const context = {
  host: "git.example.test",
  path: "group/project",
  iid: parseMrIid(123),
} satisfies MrContext;
const cleanCi = {
  kind: "ci-clean",
  source: "pipeline-jobs",
  all: [
    {
      kind: "passed",
      name: "ci",
      reportedState: "success",
      description: "",
      link: "",
      stage: "test",
    },
  ],
  failed: [],
  pending: [],
  hadPreviousPassingCi: false,
  forge: {
    kind: "allowed",
    detailedMergeStatus: "mergeable",
  },
} satisfies CiClean;
const readyMr = {
  kind: "ready-mr",
  context,
  proof: {
    mergeability: "clear",
    threads: [],
    ci: cleanCi,
    gate: {
      state: "opened",
      approval: "approved",
      draft: "not-draft",
    },
  },
} satisfies ReadyMr;
const ready = {
  schemaVersion: 1,
  sequence: 1,
  observedAt: "2026-07-26T00:00:00.000Z",
  mode: "single",
  kind: "READY",
  terminal: true,
  exitCode: 0,
  scope: { kind: "single", mr: readyMr },
} satisfies ReadyVerdict;

void ready;

const refused = {
  kind: "refused",
  detailedMergeStatus: "ci_must_pass",
  pipelineStatus: "failed",
} as const;

// @ts-expect-error a failed pipeline refusal is not an allowance.
const refusalIsNotAllowed: ForgeMergeAllowed = refused;

// @ts-expect-error CI cannot be clean while the forge refuses the merge.
const refusalIsNotClean: CiClean = { ...cleanCi, forge: refused };

// @ts-expect-error READY cannot carry the failing-checks exit code.
const readyWithBlockerExit: ReadyVerdict = { ...ready, exitCode: 4 };

const unprovenMr = { kind: "ready-mr", context } as const;

// @ts-expect-error An open READY row must carry positive readiness proof.
const readyWithoutProof: ReadyMr = unprovenMr;

void refusalIsNotAllowed;
void refusalIsNotClean;
void readyWithBlockerExit;
void readyWithoutProof;
