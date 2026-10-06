import { spawn } from "node:child_process";
import type * as T from "./types.ts";
import { DETAILED_MERGE_STATUS_MAP, nonEmpty, parseMrIid } from "./types.ts";

export interface CommandResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}
export interface CommandRunner {
  run(
    argv: readonly [string, ...string[]],
    cwd?: string
  ): Promise<CommandResult>;
}
export class WatcherQueryError extends Error {
  readonly failure: T.QueryFailure;
  constructor(failure: T.QueryFailure) {
    super(failure.detail);
    this.name = "WatcherQueryError";
    this.failure = failure;
  }
}
export class ChecksUnavailable extends WatcherQueryError {
  constructor(detail: string) {
    super({ kind: "checks-unavailable", retryable: true, detail });
    this.name = "ChecksUnavailable";
  }
}
const firstLine = (value: string): string =>
  value.trim().split(/\r?\n/, 1)[0]?.slice(0, 240) ?? "";
export function spawnRunner(): CommandRunner {
  return {
    run(argv, cwd) {
      return new Promise((resolve) => {
        const child = spawn(argv[0], argv.slice(1), {
          cwd,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk: string) => {
          stderr += chunk;
        });
        child.on("error", (error) =>
          resolve({ code: -1, stdout: "", stderr: error.message })
        );
        child.on("close", (code) =>
          resolve({ code: code ?? -1, stdout, stderr })
        );
      });
    },
  };
}
function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new WatcherQueryError({
      kind: "json-parse",
      retryable: true,
      detail: `${label}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
function raw(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function missing(path: string, value?: unknown): never {
  throw new WatcherQueryError({
    kind: "missing-key",
    retryable: true,
    detail:
      value === undefined
        ? `missing ${path}`
        : `invalid ${path}: ${raw(value)}`,
    ...(value === undefined ? {} : { rawValue: raw(value) }),
  });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) missing(path, value);
  return value;
}
function list(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) missing(path, value);
  return value;
}
function string(value: unknown, path: string): string {
  if (typeof value !== "string") missing(path, value);
  return value;
}
function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") missing(path, value);
  return value;
}
function integer(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) missing(path, value);
  return value;
}
const optionalString = (value: unknown, path: string): string | null =>
  value === null || value === undefined ? null : string(value, path);
const optionalPositiveInteger = (
  value: unknown,
  path: string
): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = integer(value, path);
  if (parsed <= 0) missing(path, value);
  return parsed;
};
export function encodeProjectPath(path: string): string {
  return encodeURIComponent(path);
}
export function projectEndpoint(project: T.Project, suffix: string): string {
  return `projects/${encodeProjectPath(project.path)}${suffix}`;
}
export function glabApiArgv(
  project: T.Project,
  endpoint: string,
  paginate: boolean
): [string, ...string[]] {
  const argv: [string, ...string[]] = ["glab", "api"];
  if (project.host !== null && project.host.length > 0)
    argv.push("--hostname", project.host);
  if (paginate) argv.push("--paginate");
  argv.push(endpoint);
  return argv;
}
export function parseProjectPath(value: string): string {
  const path = value.trim().replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");
  const parts = path.split("/");
  if (
    parts.length < 2 ||
    parts.some((part) => part.length === 0 || part === "." || part === "..")
  )
    throw new Error(`invalid project path: ${value}`);
  return path;
}
export function parseProjectRemote(value: string): T.Project | null {
  const trimmed = value.trim();
  let host = "";
  let path = "";
  const scp = /^git@([^:]+):(.+)$/.exec(trimmed);
  if (scp !== null) {
    host = scp[1] ?? "";
    path = scp[2] ?? "";
  } else {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:" && url.protocol !== "ssh:") return null;
      host = url.hostname;
      path = url.pathname;
    } catch {
      return null;
    }
  }
  path = path.replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");
  if (host.length === 0 || !path.includes("/")) return null;
  try {
    return { host, path: parseProjectPath(path) };
  } catch {
    return null;
  }
}
const STATUS_KIND = new Map<string, T.MergeStatusKind>(
  DETAILED_MERGE_STATUS_MAP.map(([status, kind]) => [status, kind])
);
export function mapDetailedMergeStatus(value: string): T.MergeStatusClass {
  const kind = STATUS_KIND.get(value.toLowerCase());
  switch (kind) {
    case "ready":
      return { kind: "ready" };
    case "pipeline-wait":
      return value.toLowerCase() === "ci_still_running"
        ? { kind: "pipeline-wait", raw: "ci_still_running" }
        : { kind: "pipeline-wait", raw: "ci_must_pass" };
    case "conflict":
      return value.toLowerCase() === "need_rebase"
        ? { kind: "conflict", raw: "need_rebase" }
        : { kind: "conflict", raw: "conflict" };
    case "threads":
      return { kind: "threads", raw: "discussions_not_resolved" };
    case "approval-wait":
      return value.toLowerCase() === "requested_changes"
        ? { kind: "approval-wait", raw: "requested_changes" }
        : { kind: "approval-wait", raw: "not_approved" };
    case "draft":
      return { kind: "draft", raw: "draft_status" };
    case "unknown-poll": {
      const raw = value.toLowerCase();
      if (raw === "checking" || raw === "unchecked" || raw === "preparing")
        return { kind: "unknown-poll", raw };
      return { kind: "unknown", raw: value };
    }
    default:
      return { kind: "unknown", raw: value };
  }
}
const MR_STATES = ["opened", "closed", "merged", "locked"] as const;
export function parseMergeRequest(
  value: unknown,
  context: T.MrContext
): T.MergeRequestFacts {
  const object = record(value, "merge request");
  const pipeline = object.head_pipeline;
  let headPipeline: T.MergeRequestFacts["headPipeline"] = null;
  if (pipeline !== null && pipeline !== undefined) {
    const pipe = record(pipeline, "merge request.head_pipeline");
    const id = integer(pipe.id, "merge request.head_pipeline.id");
    if (id <= 0) missing("merge request.head_pipeline.id", pipe.id);
    headPipeline = {
      id,
      status: string(pipe.status, "merge request.head_pipeline.status"),
      projectId: optionalPositiveInteger(
        pipe.project_id,
        "merge request.head_pipeline.project_id"
      ),
    };
  }
  const detailedMergeStatus = string(
    object.detailed_merge_status,
    "merge request.detailed_merge_status"
  );
  return {
    context,
    state: enumMember(
      object.state,
      MR_STATES,
      "merge request.state"
    ),
    draft: boolean(object.draft, "merge request.draft"),
    detailedMergeStatus,
    mergeStatus: mapDetailedMergeStatus(detailedMergeStatus),
    hasConflicts: boolean(object.has_conflicts, "merge request.has_conflicts"),
    sha: optionalString(object.sha, "merge request.sha"),
    sourceBranch: string(object.source_branch, "merge request.source_branch"),
    targetBranch: string(object.target_branch, "merge request.target_branch"),
    mergedAt: optionalString(object.merged_at, "merge request.merged_at"),
    headPipeline,
    blockingDiscussionsResolved: boolean(
      object.blocking_discussions_resolved,
      "merge request.blocking_discussions_resolved"
    ),
  };
}
function enumMember<const V extends readonly string[]>(
  value: unknown,
  values: V,
  path: string
): V[number] {
  if (typeof value === "string")
    for (const candidate of values) if (candidate === value) return candidate;
  return missing(path, value);
}
/**
 * The project a head pipeline's jobs and pipelines live in. A fork merge
 * request carries `head_pipeline.project_id` because its pipeline is created in
 * the source project; asking the MR's own project for those jobs 404s.
 */
export function pipelineProject(
  context: T.Project,
  projectId: number | null
): T.Project {
  return projectId === null ? context : { host: context.host, path: String(projectId) };
}
export function latestJobAttempts(value: unknown): readonly unknown[] {
  const jobs = list(value, "jobs");
  const latest = new Map<string, { readonly id: number; readonly job: unknown }>();
  for (const job of jobs) {
    const object = record(job, "job");
    const name = string(object.name, "job.name");
    const id = integer(object.id ?? 0, "job.id");
    const held = latest.get(name);
    if (held === undefined || id >= held.id)
      latest.set(name, { id, job });
  }
  return [...latest.values()]
    .sort((a, b) => a.id - b.id)
    .map((entry) => entry.job);
}
export function mapJob(value: unknown): T.Check {
  const object = record(value, "job");
  const name = string(object.name, "job.name");
  const stage = string(object.stage, "job.stage");
  const status = string(object.status, "job.status").toLowerCase();
  const allowFailure = object.allow_failure === true;
  const link = typeof object.web_url === "string" ? object.web_url : "";
  const details = {
    name,
    stage,
    description: "",
    link,
    reportedState: status,
  };
  if (status === "success") return { ...details, kind: "passed" };
  if (status === "skipped") return { ...details, kind: "skipped" };
  if (status === "failed" || status === "canceled")
    return allowFailure
      ? { ...details, kind: "skipped" }
      : { ...details, kind: "failed" };
  // scheduled, preparing and waiting_for_resource are queued, not failed: the
  // job has a runner slot pending and has not run a script yet. GitLab Free
  // reports them before the job starts, and a parallel matrix is scheduled.
  if (
    status === "created" ||
    status === "pending" ||
    status === "running" ||
    status === "manual" ||
    status === "scheduled" ||
    status === "preparing" ||
    status === "waiting_for_resource"
  )
    return status === "manual" && allowFailure
      ? { ...details, kind: "skipped" }
      : { ...details, kind: "pending" };
  return { ...details, kind: "failed", reportedState: status || "unknown" };
}
function noteAuthor(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const author = record(value, "note.author");
  return optionalString(author.username, "note.author.username");
}
function parseNote(value: unknown): T.ReviewNote & {
  readonly system: boolean;
  readonly resolvable: boolean;
  readonly resolved: boolean;
} {
  const object = record(value, "note");
  const position =
    object.position === null || object.position === undefined
      ? null
      : record(object.position, "note.position");
  return {
    authorUsername: noteAuthor(object.author),
    body: string(object.body, "note.body"),
    path:
      position === null
        ? null
        : optionalString(position.new_path, "note.position.new_path"),
    line:
      position === null ||
      position.new_line === null ||
      position.new_line === undefined
        ? null
        : integer(position.new_line, "note.position.new_line"),
    createdAt: string(object.created_at, "note.created_at"),
    system: object.system === true,
    resolvable: object.resolvable === true,
    resolved: object.resolved === true,
  };
}
function isBot(username: string | null, bots: readonly string[]): boolean {
  if (username === null) return false;
  const lower = username.toLowerCase();
  return bots.some((bot) => bot.toLowerCase() === lower);
}
export function parseDiscussions(
  value: unknown,
  bots: readonly string[] = []
): readonly T.ReviewThread[] {
  const discussions = list(value, "discussions");
  const parsed: {
    readonly id: string;
    readonly firstNote: T.ReviewNote | null;
    readonly blocking: boolean;
    readonly bot: boolean;
  }[] = [];
  let passes = 0;
  for (const item of discussions) {
    const discussion = record(item, "discussion");
    const all = list(discussion.notes, "discussion.notes").map(parseNote);
    // GitLab puts `resolvable` and `resolved` on the discussion's first note.
    // A diff thread whose note 0 is the system "changed this line in version
    // N" note still resolves on note 0, and replies carry resolvable: false,
    // so reading the first surviving non-system note would drop the thread.
    const head = all[0];
    if (head === undefined) continue;
    const notes = all.filter((note) => !note.system);
    for (const note of notes) if (isBot(note.authorUsername, bots)) passes += 1;
    // Display and bot detection use the first note a human wrote.
    const first = notes[0];
    parsed.push({
      id: string(discussion.id, "discussion.id"),
      firstNote:
        first === undefined
          ? null
          : {
              authorUsername: first.authorUsername,
              body: first.body,
              path: first.path,
              line: first.line,
              createdAt: first.createdAt,
            },
      blocking: head.resolvable && !head.resolved,
      bot: isBot(first?.authorUsername ?? null, bots),
    });
  }
  return parsed
    .filter((thread) => thread.blocking)
    .map(({ id, firstNote, bot }) => ({
      id,
      firstNote,
      isReviewBot: bot,
      botReviewPasses: passes,
    }));
}
export function parseApprovals(value: unknown): T.ApprovalState {
  const object = record(value, "approvals");
  // GitLab Free omits approvals_left: it has no approval rules to count against.
  const approvalsLeft =
    object.approvals_left === undefined || object.approvals_left === null
      ? null
      : integer(object.approvals_left, "approvals.approvals_left");
  if (approvalsLeft !== null && approvalsLeft < 0)
    missing("approvals.approvals_left", approvalsLeft);
  return {
    approved: boolean(object.approved, "approvals.approved"),
    approvalsLeft,
  };
}
export function parseOpenMergeRequests(
  value: unknown
): readonly T.OpenMergeRequest[] {
  return list(value, "open merge requests").map((item, index) => {
    const object = record(item, `open merge requests[${index}]`);
    return {
      iid: parseMrIid(object.iid, `open merge requests[${index}].iid`),
      sourceBranch: string(
        object.source_branch,
        `open merge requests[${index}].source_branch`
      ),
      targetBranch: string(
        object.target_branch,
        `open merge requests[${index}].target_branch`
      ),
    };
  });
}
export function parsePipelines(value: unknown): readonly T.PipelineRecord[] {
  return list(value, "pipelines").map((item, index) => {
    const object = record(item, `pipelines[${index}]`);
    const id = integer(object.id, `pipelines[${index}].id`);
    if (id <= 0) missing(`pipelines[${index}].id`, object.id);
    return {
      id,
      sha: string(object.sha, `pipelines[${index}].sha`),
      status: string(object.status, `pipelines[${index}].status`).toLowerCase(),
    };
  });
}
export function parseMergeTrain(value: unknown): readonly T.MrIid[] {
  return list(value, "merge trains").map((item, index) => {
    const object = record(item, `merge trains[${index}]`);
    const mergeRequest = record(
      object.merge_request,
      `merge trains[${index}].merge_request`
    );
    return parseMrIid(
      mergeRequest.iid,
      `merge trains[${index}].merge_request.iid`
    );
  });
}
/**
 * GitLab Free has no merge trains, so `merge_trains` is not a route there and
 * `glab api` exits non-zero with 404. A wrong project path or a token without
 * access produces the same 404 with the body `{"message":"404 Project Not
 * Found"}`; that is a project-level miss, not an absent feature, and must
 * surface as the retryable `command-exit` failure every other reader raises.
 */
export function mergeTrainAbsent(result: CommandResult): boolean {
  if (result.code === 0) return false;
  const output = `${result.stdout}\n${result.stderr}`;
  if (!/\b(?:403|404)\b/.test(output)) return false;
  if (/\bProject Not Found\b/i.test(output)) return false;
  // What is left is GitLab refusing this route rather than this project.
  return true;
}
/**
 * One ordered stack, bottom to top, plus everything discovery left out of it.
 *
 * A stack is the chain that starts at a merge request targeting the default
 * branch and walks children down: each next MR targets the previous MR's
 * source branch. The current git branch only chooses which root to prefer, so
 * discovery works from the default branch (where the stack root lives) and
 * after the bottom MR has merged.
 *
 * Two shapes are deliberately not linearised into one list:
 *
 * - siblings, MRs sharing a target branch. Two features that both target `a`
 *   are two stacks, not one. Only the sibling on the preferred branch's chain
 *   is followed and the others are reported.
 * - a release MR, a long-lived integration branch merged into the default
 *   branch. `develop -> main` is not the root of a feature stack, so it is
 *   reported and work stacked on `develop` is discovered from `develop`.
 *
 * The walk never crosses the default branch: an MR targeting the default
 * branch is always a root, never a child, so a release never absorbs a stack.
 */
/**
 * Long-lived integration branches. An MR merging one of these into the default
 * branch is a release, not the bottom of a feature stack: GitLab reports
 * `develop -> main` while the stack under `develop` is still in flight, and
 * treating that MR as the root makes `lowestUnmerged` a release the stack has
 * nothing to do with. Overridable per call for a project that names its
 * integration branch differently.
 */
const INTEGRATION_BASE_BRANCHES: readonly string[] = [
  "develop",
  "production",
  "staging",
];
export interface StackOrder {
  readonly stack: T.NonEmpty<T.MrContext>;
  /** Open MRs sharing a target branch with the stack, outside the chain. */
  readonly siblings: readonly T.MrIid[];
  /** Release MRs left out of the stack, by iid. */
  readonly releases: readonly T.MrIid[];
  /** Chain members a walk tried to re-enter: the branch graph loops. */
  readonly cycles: readonly T.MrIid[];
}
interface StackTables {
  readonly roots: readonly T.OpenMergeRequest[];
  readonly releases: readonly T.OpenMergeRequest[];
  readonly childrenOf: ReadonlyMap<string, readonly T.OpenMergeRequest[]>;
}
function stackTables(
  sorted: readonly T.OpenMergeRequest[],
  defaultBranch: string,
  integrationBases: readonly string[]
): StackTables {
  const releases = sorted.filter(
    (mr) =>
      mr.targetBranch === defaultBranch &&
      integrationBases.includes(mr.sourceBranch)
  );
  const released = new Set(releases.map((mr) => mr.iid));
  // Work stacked on an integration branch in release is discovered from that
  // branch; the release MR itself is not part of any chain.
  const anchors = new Set<string>([
    defaultBranch,
    ...releases.map((mr) => mr.sourceBranch),
  ]);
  const roots: T.OpenMergeRequest[] = [];
  const childrenOf = new Map<string, T.OpenMergeRequest[]>();
  for (const mr of sorted) {
    if (released.has(mr.iid)) continue;
    if (anchors.has(mr.targetBranch)) {
      roots.push(mr);
      continue;
    }
    childrenOf.set(mr.targetBranch, [
      ...(childrenOf.get(mr.targetBranch) ?? []),
      mr,
    ]);
  }
  return { roots, releases, childrenOf };
}
export function orderStack(args: {
  readonly context: T.MrContext;
  readonly open: readonly T.OpenMergeRequest[];
  readonly defaultBranch: string;
  /** The current git branch. It picks a root; it is never required to be one. */
  readonly preferredBranch?: string | null;
  readonly integrationBases?: readonly string[];
}): StackOrder {
  const sorted = [...args.open].sort((a, b) => a.iid - b.iid);
  const { roots, releases, childrenOf } = stackTables(
    sorted,
    args.defaultBranch,
    args.integrationBases ?? INTEGRATION_BASE_BRANCHES
  );
  if (roots.length === 0)
    throw new WatcherQueryError({
      kind: "invalid-context",
      retryable: false,
      rawValue: args.defaultBranch,
      detail:
        sorted.length === 0
          ? `no open merge request in ${args.context.path}`
          : `no open merge request targets ${args.defaultBranch} in ${args.context.path}`,
    });
  const preferred =
    args.preferredBranch ??
    sorted.find((mr) => mr.iid === args.context.iid)?.sourceBranch ??
    null;
  const reaches = (
    mr: T.OpenMergeRequest,
    seen: ReadonlySet<T.MrIid>
  ): boolean => {
    if (preferred !== null && mr.sourceBranch === preferred) return true;
    if (seen.has(mr.iid)) return false;
    const next = new Set(seen).add(mr.iid);
    const children: readonly T.OpenMergeRequest[] =
      childrenOf.get(mr.sourceBranch) ?? [];
    return children.some((child) => reaches(child, next));
  };
  const root: T.OpenMergeRequest =
    roots.find((candidate) => reaches(candidate, new Set())) ?? roots[0];
  const chain: T.OpenMergeRequest[] = [];
  const siblings: T.MrIid[] = [];
  const cycles: T.MrIid[] = [];
  const seen = new Set<T.MrIid>();
  let current: T.OpenMergeRequest | undefined = root;
  while (current !== undefined) {
    chain.push(current);
    seen.add(current.iid);
    const options: readonly T.OpenMergeRequest[] =
      childrenOf.get(current.sourceBranch) ?? [];
    for (const repeat of options) if (seen.has(repeat.iid)) cycles.push(repeat.iid);
    const fresh: readonly T.OpenMergeRequest[] = options.filter(
      (child) => !seen.has(child.iid)
    );
    if (fresh.length === 0) break;
    const chosen: T.OpenMergeRequest =
      fresh.find((child) => reaches(child, seen)) ?? fresh[0];
    for (const sibling of fresh)
      if (sibling.iid !== chosen.iid) siblings.push(sibling.iid);
    current = chosen;
  }
  const otherRoots = roots.filter((mr) => mr.iid !== root.iid).map((mr) => mr.iid);
  return {
    stack: nonEmpty(
      chain.map((mr) => ({ ...args.context, iid: mr.iid }))
    ) ?? [args.context],
    siblings: [...siblings, ...otherRoots],
    releases: releases.map((mr) => mr.iid),
    cycles: [...new Set(cycles)],
  };
}
export function reviewBots(
  flags: readonly string[],
  envValue: string | undefined
): readonly string[] {
  const fromEnv = (envValue ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return [...new Set([...flags.map((bot) => bot.trim()).filter(Boolean), ...fromEnv])];
}
export interface OpenStackEntry {
  readonly iid: number;
  readonly branch: string;
  readonly state: "OPEN";
}
export class GlabForgeReader implements T.ForgeReader {
  readonly bots: readonly string[];
  private readonly runner: CommandRunner;
  constructor(
    options: {
      readonly bots?: readonly string[];
      readonly runner?: CommandRunner;
    } = {}
  ) {
    this.bots = options.bots ?? [];
    this.runner = options.runner ?? spawnRunner();
  }
  private async run(
    argv: readonly [string, ...string[]],
    cwd?: string
  ): Promise<CommandResult> {
    return this.runner.run(argv, cwd);
  }
  private async runJson(
    argv: readonly [string, ...string[]],
    cwd?: string
  ): Promise<unknown> {
    const result = await this.run(argv, cwd);
    if (result.code !== 0)
      throw new WatcherQueryError({
        kind: "command-exit",
        retryable: true,
        code: result.code,
        detail:
          firstLine(result.stderr) ||
          firstLine(result.stdout) ||
          `${argv[0]} exited ${result.code}`,
      });
    return parseJson(result.stdout, argv[argv.length - 1] ?? argv[0]);
  }
  async originProject(): Promise<T.Project | null> {
    const result = await this.run(["git", "remote", "get-url", "origin"]);
    return result.code === 0 ? parseProjectRemote(result.stdout) : null;
  }
  async currentMr(
    project: T.Project | null,
    iid: T.MrIid | null
  ): Promise<T.MrContext> {
    const resolved = project ?? (await this.originProject());
    if (resolved === null)
      throw new WatcherQueryError({
        kind: "invalid-context",
        retryable: false,
        rawValue: "",
        detail: "could not infer the project from the origin remote",
      });
    if (iid !== null) return { ...resolved, iid };
    const branchResult = await this.run([
      "git",
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    if (branchResult.code !== 0)
      throw new WatcherQueryError({
        kind: "command-exit",
        retryable: true,
        code: branchResult.code,
        detail:
          firstLine(branchResult.stderr) || "could not read the current branch",
      });
    const branch = branchResult.stdout.trim();
    if (branch.length === 0 || branch === "HEAD")
      throw new WatcherQueryError({
        kind: "invalid-context",
        retryable: false,
        rawValue: branch,
        detail: "HEAD is detached; pass --mr",
      });
    const matches = parseOpenMergeRequests(
      await this.runJson(
        glabApiArgv(
          resolved,
          `${projectEndpoint(resolved, "/merge_requests")}?state=opened&source_branch=${encodeURIComponent(branch)}&per_page=100`,
          true
        )
      )
    ).filter((mr) => mr.sourceBranch === branch);
    const match = matches[0];
    if (match === undefined)
      throw new WatcherQueryError({
        kind: "invalid-context",
        retryable: false,
        rawValue: branch,
        detail: `no open merge request for branch ${branch} in ${resolved.path}`,
      });
    return { ...resolved, iid: match.iid };
  }
  async mergeRequest(context: T.MrContext): Promise<T.MergeRequestFacts> {
    return parseMergeRequest(
      await this.runJson(
        glabApiArgv(
          context,
          projectEndpoint(context, `/merge_requests/${context.iid}`),
          false
        )
      ),
      context
    );
  }
  async openMergeRequests(
    project: T.Project
  ): Promise<readonly T.OpenMergeRequest[]> {
    return parseOpenMergeRequests(
      await this.runJson(
        glabApiArgv(
          project,
          `${projectEndpoint(project, "/merge_requests")}?state=opened&per_page=100`,
          true
        )
      )
    );
  }
  async defaultBranch(project: T.Project): Promise<string> {
    const object = record(
      await this.runJson(
        glabApiArgv(project, projectEndpoint(project, ""), false)
      ),
      "project"
    );
    return string(object.default_branch, "project.default_branch");
  }
  async pipelineJobs(
    context: T.MrContext,
    pipeline: T.HeadPipeline
  ): Promise<readonly T.Check[]> {
    const project = pipelineProject(context, pipeline.projectId);
    // include_retried=false keeps superseded attempts out of the list. As a
    // belt, latestJobAttempts keeps the highest id per name, because a retried
    // job would otherwise read as a failure next to its own green attempt.
    const value = await this.runJson(
      glabApiArgv(
        project,
        `${projectEndpoint(project, `/pipelines/${pipeline.id}/jobs`)}?per_page=100&include_retried=false`,
        true
      )
    );
    return latestJobAttempts(value).map(mapJob);
  }
  async discussions(context: T.MrContext): Promise<readonly T.ReviewThread[]> {
    return parseDiscussions(
      await this.runJson(
        glabApiArgv(
          context,
          `${projectEndpoint(context, `/merge_requests/${context.iid}/discussions`)}?per_page=100`,
          true
        )
      ),
      this.bots
    );
  }
  async approvals(context: T.MrContext): Promise<T.ApprovalState> {
    return parseApprovals(
      await this.runJson(
        glabApiArgv(
          context,
          projectEndpoint(context, `/merge_requests/${context.iid}/approvals`),
          false
        )
      )
    );
  }
  async pipelines(
    context: T.MrContext,
    projectId: number | null
  ): Promise<readonly T.PipelineRecord[]> {
    const project = pipelineProject(context, projectId);
    return parsePipelines(
      await this.runJson(
        glabApiArgv(
          project,
          `${projectEndpoint(project, `/merge_requests/${context.iid}/pipelines`)}?per_page=100`,
          true
        )
      )
    );
  }
  async mergeTrain(project: T.Project): Promise<T.MergeTrainRead> {
    const result = await this.run(
      glabApiArgv(
        project,
        `${projectEndpoint(project, "/merge_trains")}?scope=active&per_page=100`,
        true
      )
    );
    if (mergeTrainAbsent(result)) return { kind: "absent" };
    if (result.code !== 0)
      throw new WatcherQueryError({
        kind: "command-exit",
        retryable: true,
        code: result.code,
        detail:
          firstLine(result.stderr) ||
          firstLine(result.stdout) ||
          `glab api exited ${result.code}`,
      });
    return { kind: "active", iids: parseMergeTrain(parseJson(result.stdout, "merge trains")) };
  }
}
export function syntheticPending(name: string, reportedState: string): T.PendingCheck {
  return {
    kind: "pending",
    name,
    reportedState,
    description: "",
    link: "",
    stage: "",
  };
}
export async function resolveChecks(
  reader: T.ForgeReader,
  facts: T.MergeRequestFacts
): Promise<T.CheckRead> {
  const pipeline = facts.headPipeline;
  if (pipeline === null) {
    if (
      facts.mergeStatus.kind === "pipeline-wait" ||
      facts.mergeStatus.kind === "unknown-poll"
    )
      return {
        source: "pipeline-jobs",
        checks: [syntheticPending("pipeline", facts.detailedMergeStatus)],
      };
    return {
      source: "pipeline-jobs",
      checks: [
        {
          kind: "skipped",
          name: "pipeline",
          reportedState: "none",
          description: "",
          link: "",
          stage: "",
        },
      ],
    };
  }
  const jobs = await reader.pipelineJobs(facts.context, pipeline);
  const checks = nonEmpty(jobs);
  if (checks !== null) return { source: "pipeline-jobs", checks };
  if (
    pipeline.status === "failed" ||
    pipeline.status === "canceled" ||
    pipeline.status === "success"
  )
    throw new ChecksUnavailable(
      `pipeline ${pipeline.id} job list was empty (status ${pipeline.status})`
    );
  return {
    source: "pipeline-jobs",
    checks: [syntheticPending("pipeline", pipeline.status)],
  };
}
export async function resolveContext(args: {
  readonly reader: T.ForgeReader;
  readonly host?: string | null;
  readonly project: string | null;
  readonly mr: T.MrIid | null;
}): Promise<T.MrContext> {
  const origin = await args.reader.originProject();
  const host = args.host ?? origin?.host ?? null;
  const project =
    args.project === null
      ? origin === null
        ? null
        : { ...origin, host }
      : { host, path: parseProjectPath(args.project) };
  if (args.mr !== null && project !== null)
    return { ...project, iid: args.mr };
  return args.reader.currentMr(project, args.mr);
}
export async function discoverStack(
  reader: T.ForgeReader,
  context: T.MrContext
): Promise<T.NonEmpty<T.MrContext>> {
  const [open, defaultBranch] = await Promise.all([
    reader.openMergeRequests(context),
    reader.defaultBranch(context),
  ]);
  return orderStack({ context, open, defaultBranch }).stack;
}
async function gitText(
  run: (argv: readonly [string, ...string[]]) => Promise<CommandResult>,
  argv: readonly [string, ...string[]]
): Promise<string> {
  const result = await run(argv);
  if (result.code !== 0)
    throw new Error(
      firstLine(result.stderr) ||
        firstLine(result.stdout) ||
        `${argv[0]} ${argv[1]} exited ${result.code}`
    );
  return result.stdout.trim();
}
async function glabJson(
  run: (argv: readonly [string, ...string[]]) => Promise<CommandResult>,
  argv: readonly [string, ...string[]],
  label: string
): Promise<unknown> {
  const result = await run(argv);
  if (result.code !== 0)
    throw new Error(
      firstLine(result.stderr) ||
        firstLine(result.stdout) ||
        `glab api exited ${result.code}`
    );
  return parseJson(result.stdout, label);
}
export async function discoverOpenStack(args: {
  readonly repo: string;
  readonly projectPath: string | null;
  readonly runner?: CommandRunner;
  /** Called with the MRs discovery left out, so the caller can report them. */
  readonly onExcluded?: (detail: string) => void;
}): Promise<readonly OpenStackEntry[]> {
  const runner = args.runner ?? spawnRunner();
  const reader = new GlabForgeReader({ runner });
  // glab resolves the project and the host from the working directory, so
  // every call runs inside the repository, never in the caller's directory.
  const inRepo = (
    argv: readonly [string, ...string[]]
  ): Promise<CommandResult> => runner.run(argv, args.repo);
  const git = (
    argv: readonly [string, ...string[]]
  ): Promise<CommandResult> => inRepo(argv);
  let project: T.Project;
  if (args.projectPath !== null) {
    const origin = await git(["git", "remote", "get-url", "origin"]);
    const remote = origin.code === 0 ? parseProjectRemote(origin.stdout) : null;
    project = {
      host: remote?.host ?? null,
      path: parseProjectPath(args.projectPath),
    };
  } else {
    const remote = parseProjectRemote(
      await gitText(git, ["git", "remote", "get-url", "origin"])
    );
    if (remote === null)
      throw new Error("could not infer the project from the origin remote");
    project = remote;
  }
  const branch = await gitText(git, [
    "git",
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ]);
  if (branch.length === 0 || branch === "HEAD")
    throw new Error("HEAD is detached; cannot discover a stack");
  const open = parseOpenMergeRequests(
    await glabJson(
      inRepo,
      glabApiArgv(
        project,
        `${projectEndpoint(project, "/merge_requests")}?state=opened&per_page=100`,
        true
      ),
      "glab merge request list"
    )
  );
  const defaultBranch = string(
    record(
      await glabJson(
        inRepo,
        glabApiArgv(project, projectEndpoint(project, ""), false),
        "glab project"
      ),
      "glab project"
    ).default_branch,
    "project.default_branch"
  );
  // The branch only picks which root to prefer, so frontier set still runs from
  // the default branch and after the bottom MR of the stack has merged.
  const seed = open.find((mr) => mr.sourceBranch === branch);
  const ordered = orderStack({
    context: { ...project, iid: seed?.iid ?? 0 as T.MrIid },
    open,
    defaultBranch,
    preferredBranch: branch,
  });
  const byIid = new Map(open.map((mr) => [mr.iid, mr]));
  // Excluded MRs are reported, never silently dropped and never folded in:
  // a sibling is a second stack, a release is not a feature root.
  const excluded = [
    ...ordered.siblings.map((iid) => `!${iid} sibling`),
    ...ordered.releases.map((iid) => `!${iid} release into ${defaultBranch}`),
    ...ordered.cycles.map((iid) => `!${iid} branch cycle`),
  ];
  if (excluded.length > 0)
    args.onExcluded?.(
      `${excluded.join(", ")} not in the stack in ${project.path} (one chain per target branch; releases are not stack roots)`
    );
  return ordered.stack.map((context) => {
    const mr = byIid.get(context.iid);
    if (mr === undefined)
      throw new Error(`stack mr ${context.iid} is not in the open list`);
    return { iid: mr.iid, branch: mr.sourceBranch, state: "OPEN" as const };
  });
}
