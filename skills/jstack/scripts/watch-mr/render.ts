import type * as T from "./types.ts";
export const renderJson = (verdict: T.WatcherVerdict): string =>
  `${JSON.stringify(verdict)}\n`;
function mrUrl(context: T.MrContext): string {
  const path = `${context.path}/-/merge_requests/${context.iid}`;
  return context.host === null ? path : `https://${context.host}/${path}`;
}
function ciCell(row: T.MrSnapshot): string {
  if (row.kind !== "open") return "-";
  const was = row.ci.hadPreviousPassingCi ? ", was ✅" : "";
  switch (row.ci.kind) {
    case "ci-clean":
      return "✅";
    case "ci-pending":
      return `⏳ ${row.ci.pending.length} pending${was}`;
    case "ci-failing":
      return `❌ ${row.ci.failed.length} failed${row.ci.pending.length ? `, ${row.ci.pending.length} pending` : ""}${was}`;
    case "ci-forge-rejected":
      return `❌ GitLab reports a failing pipeline${was}`;
    default: {
      const exhaustive: never = row.ci;
      return exhaustive;
    }
  }
}
function reviewCell(row: T.MrSnapshot): string {
  if (row.kind !== "open") return "-";
  const open = row.threads.length;
  return row.reviewAutomationRunning
    ? open
      ? `🤖 running, ${open} open`
      : "🤖 running"
    : open
      ? `📝 ${open} open`
      : "✅";
}
function mergeCell(row: T.MrSnapshot): string {
  if (row.kind === "merged") return "✅ merged";
  if (row.kind === "closed") return "❌ closed";
  if (row.facts.state === "locked") return "⏳ locked";
  if (row.facts.draft || row.facts.mergeStatus.kind === "draft")
    return "⏸ draft";
  if (row.facts.mergeStatus.kind === "approval-wait")
    return `⏳ ${row.facts.mergeStatus.raw}`;
  if (row.facts.hasConflicts || row.facts.mergeStatus.kind === "conflict")
    return "⚠️ conflict";
  if (
    row.facts.mergeStatus.kind === "unknown" ||
    row.facts.mergeStatus.kind === "unknown-poll"
  )
    return `❓ ${row.facts.mergeStatus.raw}`;
  return "✅";
}
export function renderStatusTable(rows: T.NonEmpty<T.MrSnapshot>): string {
  const lines = ["| MR | CI | Review | Merge |", "| --- | --- | --- | --- |"];
  for (const row of rows) {
    const url = mrUrl(row.context);
    lines.push(
      `| [!${row.context.iid}](${url}) | ${ciCell(row)} | ${reviewCell(row)} | ${mergeCell(row)} |`
    );
  }
  return `${lines.join("\n")}\n`;
}
// A comment body is untrusted data written by anyone who can comment. Tabs and
// ANSI escapes would shift the columns below or rewrite the terminal, so they
// are dropped before the body joins a status line.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
function bodyPreview(body: string): string {
  const [firstLine = ""] = body.replace(/\r/g, "").split("\n");
  return firstLine.replace(CONTROL_CHARACTERS, " ").slice(0, 180);
}
function threadLine(thread: T.ReviewThread): string {
  const note = thread.firstNote;
  return [
    thread.id,
    note?.path ?? "None",
    note?.line ?? "None",
    note?.authorUsername ?? "None",
    `isReviewBot=${thread.isReviewBot}`,
    `botReviewPasses=${thread.botReviewPasses}`,
    bodyPreview(note?.body ?? ""),
  ].join(" ");
}
type StatusQueryBlocker = {
  readonly kind: "status-query";
  readonly failures: number;
  readonly failure: { readonly detail: string };
};
function renderBlocker(blocker: T.MergeBlocker | StatusQueryBlocker): string {
  switch (blocker.kind) {
    case "merge-conflicts":
      return [
        "BLOCKER: merge-conflicts",
        `mr=${blocker.mr.iid}`,
        `detailed_merge_status=${blocker.facts.detailedMergeStatus}`,
        `has_conflicts=${blocker.facts.hasConflicts}`,
        "action=report the conflict; do not rebase or retarget",
      ].join("\n");
    case "review-threads":
      return [
        "BLOCKER: review-threads",
        `mr=${blocker.mr.iid}`,
        `unresolved=${blocker.threads.length}`,
        ...blocker.threads.map(threadLine),
      ].join("\n");
    case "failing-checks": {
      const failed = blocker.ci.kind === "ci-failing" ? blocker.ci.failed : [];
      const details = failed.map(
        (check) =>
          `${check.name} ${check.reportedState} ${check.description} ${check.link}`
      );
      if (blocker.ci.kind === "ci-forge-rejected")
        details.push(
          `detailed_merge_status=${blocker.ci.forge.detailedMergeStatus}`,
          `pipelineStatus=${blocker.ci.forge.pipelineStatus}`
        );
      return [
        "BLOCKER: failing-checks",
        `mr=${blocker.mr.iid}`,
        `failed=${failed.length}`,
        ...details,
      ].join("\n");
    }
    case "merge-gate": {
      if (blocker.reason === "unknown-merge-status")
        return [
          "BLOCKER: unknown-merge-status",
          `mr=${blocker.mr.iid}`,
          `detailed_merge_status=${blocker.raw}`,
          "action=report the unknown merge status; do not treat it as ready",
        ].join("\n");
      const action =
        blocker.reason === "closed-without-merge"
          ? "restore or remove the closed MR from the queued stack"
          : "mark the MR ready for review before waiting for the merge train";
      return [
        `BLOCKER: ${blocker.reason}`,
        `mr=${blocker.mr.iid}`,
        `action=${action}`,
      ].join("\n");
    }
    case "status-query":
      return [
        "BLOCKER: status-query",
        `failures=${blocker.failures}`,
        `detail=${blocker.failure.detail}`,
        "action=verify the project path, GitLab authentication, and API availability, then rearm",
      ].join("\n");
    default: {
      const exhaustive: never = blocker;
      return exhaustive;
    }
  }
}
function waitLine(verdict: Extract<T.WatcherVerdict, { readonly kind: "WAITING" }>): string {
  const iid = verdict.frontier.iid;
  switch (verdict.reason.kind) {
    case "pending-checks":
      return `WAITING: frontier=!${iid}; ${verdict.reason.pending.length} check${verdict.reason.pending.length === 1 ? "" : "s"} pending\n`;
    case "merge-train":
      return `WAITING: frontier=!${iid} is blocker-free; waiting for merge train (${verdict.reason.unmergedCount} MR${verdict.reason.unmergedCount === 1 ? "" : "s"} unmerged; trains ${verdict.reason.trains})\n`;
    case "approval-wait":
      return `WAITING: frontier=!${iid}; approval wait (${verdict.reason.status}; approvals left ${verdict.reason.approvalsLeft ?? "unknown"})\n`;
    case "unknown-merge-status":
      return `WAITING: frontier=!${iid}; unknown merge status ${verdict.reason.raw}; polling again\n`;
    default: {
      const exhaustive: never = verdict.reason;
      return exhaustive;
    }
  }
}
export function renderPretty(verdict: T.WatcherVerdict): string {
  switch (verdict.kind) {
    case "QUEUE":
      return `QUEUE: captured ${verdict.queue.length} MR${verdict.queue.length === 1 ? "" : "s"} bottom-to-top: ${verdict.queue.map((mr) => `!${mr.iid}`).join(",")}\n`;
    case "STATUS":
      return renderStatusTable(verdict.rows);
    case "WAITING":
      return waitLine(verdict);
    case "ADVANCE":
      return `ADVANCE: merged !${verdict.merged.iid}; next=!${verdict.frontier.iid}; remaining=${verdict.remaining}\n`;
    case "RETRY":
      return `RETRY: GitLab status query failed; retrying in ${verdict.retryInSeconds}s\ndetail=${verdict.failure.detail}\n`;
    case "BLOCKER":
      return `${renderBlocker(verdict.blocker)}\n`;
    case "READY": {
      const detail =
        verdict.scope.kind === "single" && verdict.scope.mr.kind === "ready-mr"
          ? `\ndetailed_merge_status=${verdict.scope.mr.proof.ci.forge.detailedMergeStatus}\napproval=${verdict.scope.mr.proof.gate.approval}\nisDraft=${verdict.scope.mr.proof.gate.draft === "draft-allowed"}${verdict.scope.mr.proof.gate.draft === "draft-allowed" ? "\nnote=draft allowed (--allow-draft); leave the draft; do not mark it ready" : ""}`
          : "";
      return `READY: no merge conflicts, no unresolved review threads, no failing or pending checks${detail}\n`;
    }
    case "COMPLETE":
      return `COMPLETE: queued stack merged (${verdict.queue.length} MR${verdict.queue.length === 1 ? "" : "s"})\n`;
    case "TIMEOUT":
      if (verdict.reason.kind === "pending-checks")
        return "TIMEOUT: checks still pending\n";
      if (verdict.reason.kind === "approval-wait")
        return `TIMEOUT: approval still waiting (${verdict.reason.status})\n`;
      if (verdict.reason.kind === "unknown-merge-status")
        return `TIMEOUT: merge status still unknown (${verdict.reason.raw})\n`;
      if (verdict.reason.kind === "status-unavailable")
        return "TIMEOUT: GitLab status remained unavailable\n";
      return `TIMEOUT: queued stack still has ${verdict.reason.unmergedCount} MR${verdict.reason.unmergedCount === 1 ? "" : "s"} unmerged; frontier=!${verdict.reason.frontier.iid}\n`;
    default: {
      const exhaustive: never = verdict;
      return exhaustive;
    }
  }
}
