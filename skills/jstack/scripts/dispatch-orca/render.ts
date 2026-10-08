import {
  EXIT_USAGE,
  exitCodeOf,
  handleOf,
  statusOf,
} from "./policy.ts";
import type {
  DispatchRequest,
  DispatchStatus,
  TerminalState,
} from "./types.ts";

export interface RenderContext {
  readonly request: DispatchRequest;
  readonly json: boolean;
}

/**
 * Detail lines carry the operator's next move. Every failure state says whether
 * a retry can start a second delegate, because that is the mistake this tool
 * exists to prevent.
 */
function detail(state: TerminalState, request: DispatchRequest): string {
  switch (state.kind) {
    case "done":
      return "";
    case "dispatch-failed": {
      const tab = state.tabId === null ? "the caller's tab" : `tab ${state.tabId}`;
      const cause =
        state.reason === "terminal-list-unavailable"
          ? "orca terminal list did not answer"
          : state.reason === "caller-tab-unknown"
            ? `handle ${request.terminal} is not in the terminal list`
            : `no new pane appeared in ${tab}`;
      const split = state.splitError === null ? "" : `; split said: ${state.splitError.message}`;
      return `: ${cause}; no delegate was started, retrying is safe${split}`;
    }
    case "ambiguous":
      return (
        `: ${state.handles.length} new panes in tab ${state.tabId ?? "?"} ` +
        `(${state.handles.join(", ")}); none was adopted, resolve by hand`
      );
    case "pane-gone":
      return (
        `: handle ${state.handle} left the terminal list and ${request.report} ` +
        "was never written"
      );
    case "still-running":
      return (
        `: ${request.name} is still open in handle ${state.handle}; running this ` +
        "command again resumes the wait instead of dispatching"
      );
    default: {
      const undecided: never = state;
      return undecided;
    }
  }
}

/** One line, always. `--json` swaps the prose for the machine envelope. */
export function renderResult(
  state: TerminalState,
  context: RenderContext
): string {
  if (context.json)
    return JSON.stringify({
      status: statusOf(state),
      handle: handleOf(state),
      report: context.request.report,
      exitCode: exitCodeOf(state),
    });
  const suffix = detail(state, context.request);
  return suffix === "" ? statusOf(state) : `${statusOf(state)}${suffix}`;
}

export function renderUsage(
  message: string,
  context: { readonly report: string; readonly json: boolean }
): string {
  return context.json
    ? JSON.stringify({
        status: "usage",
        handle: null,
        report: context.report,
        exitCode: EXIT_USAGE,
      })
    : `usage: ${message}`;
}

export type { DispatchStatus };