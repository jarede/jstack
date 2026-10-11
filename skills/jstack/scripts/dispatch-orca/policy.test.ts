import { describe, expect, it } from "bun:test";
import {
  callerTabId,
  decideRecovery,
  decideSplit,
  decideWait,
  delegateCommand,
  exitCodeOf,
  exitPathFor,
  liveHandle,
  newHandlesInTab,
  planStart,
  readExitStatus,
  readStateFile,
  reportReady,
  shellQuote,
  statePathFor,
  statusOf,
  tabHandles,
  writeStateFile,
} from "./policy.ts";
import { fakeFs, terminal } from "./fakes.test-helper.ts";
import type { DispatchRequest } from "./types.ts";

const request: DispatchRequest = {
  name: "d1",
  model: "opencode-go/grok-4.7",
  workdir: "/repo",
  brief: "/repo/.jstack/runs/d1.brief.md",
  report: "/repo/.jstack/runs/d1.report.md",
  terminal: "term_caller",
  direction: "horizontal",
  timeoutMinutes: 45,
  recoverSeconds: 60,
};

describe("state file", () => {
  it("sits next to the report and is named after the unit", () => {
    expect(statePathFor(request)).toBe(
      "/repo/.jstack/runs/d1.dispatch.json"
    );
    expect(exitPathFor(request)).toBe("/repo/.jstack/runs/d1.exit");
  });

  it("reads the exit sidecar as an integer status, or null when absent", () => {
    const fs = fakeFs();
    expect(readExitStatus(fs, exitPathFor(request))).toBeNull();
    fs.seed(exitPathFor(request), "1\n");
    expect(readExitStatus(fs, exitPathFor(request))).toBe(1);
    fs.seed(exitPathFor(request), "not a status");
    expect(readExitStatus(fs, exitPathFor(request))).toBeNull();
  });

  it("round-trips a handle and a start time", () => {
    const fs = fakeFs();
    const path = statePathFor(request);
    writeStateFile(fs, path, { handle: "term_x", startedAt: "2026-07-26T00:00:00.000Z" });
    expect(readStateFile(fs, path)).toEqual({
      handle: "term_x",
      startedAt: "2026-07-26T00:00:00.000Z",
    });
  });

  it("reads a missing or corrupt file as no handle rather than crashing", () => {
    const fs = fakeFs();
    expect(readStateFile(fs, statePathFor(request))).toBeNull();
    fs.seed(statePathFor(request), "{not json");
    expect(readStateFile(fs, statePathFor(request))).toBeNull();
    fs.seed(statePathFor(request), JSON.stringify({ handle: "" }));
    expect(readStateFile(fs, statePathFor(request))).toBeNull();
  });
});

describe("reportReady", () => {
  it("needs the file to exist and to have bytes in it", () => {
    const fs = fakeFs();
    expect(reportReady(fs, request.report)).toBe(false);
    fs.seed(request.report, "");
    expect(reportReady(fs, request.report)).toBe(false);
    fs.seed(request.report, " ");
    expect(reportReady(fs, request.report)).toBe(true);
  });
});

describe("planStart", () => {
  const listed = {
    ok: true as const,
    terminals: [terminal("term_caller"), terminal("term_x")],
  };

  it("short-circuits on a report that already landed", () => {
    expect(
      planStart({ reportPresent: true, record: "term_x", listed })
    ).toEqual({ kind: "done" });
  });

  it("resumes a recorded handle that a fresh list still shows", () => {
    expect(
      planStart({ reportPresent: false, record: "term_x", listed })
    ).toEqual({ kind: "resume", handle: "term_x" });
  });

  it("dispatches when there is no record, or the recorded pane is gone", () => {
    expect(planStart({ reportPresent: false, record: null, listed })).toEqual({
      kind: "dispatch",
    });
    expect(
      planStart({ reportPresent: false, record: "term_dead", listed })
    ).toEqual({ kind: "dispatch" });
  });

  it("never resumes from a list it could not read", () => {
    expect(
      planStart({
        reportPresent: false,
        record: "term_x",
        listed: { ok: false, error: { code: "x", message: "y" } },
      })
    ).toEqual({ kind: "dispatch" });
  });
});

describe("liveHandle", () => {
  it("only trusts a successful list", () => {
    const listed = { ok: true as const, terminals: [terminal("term_x")] };
    expect(liveHandle(listed, "term_x")).toBe("term_x");
    expect(liveHandle(listed, "term_y")).toBeNull();
  });
});

describe("tab snapshot", () => {
  const rows = [
    terminal("term_caller", "tab-1"),
    terminal("term_sibling", "tab-1"),
    terminal("term_elsewhere", "tab-2"),
  ];

  it("finds the caller's tab and no other", () => {
    expect(callerTabId(rows, "term_caller")).toBe("tab-1");
    expect(callerTabId(rows, "term_elsewhere")).toBe("tab-2");
    expect(callerTabId(rows, "term_gone")).toBeNull();
  });

  it("snapshots only the caller's tab", () => {
    expect([...tabHandles(rows, "tab-1")]).toEqual([
      "term_caller",
      "term_sibling",
    ]);
  });

  it("diffs out handles that were in the tab before the split", () => {
    const snapshot = tabHandles(rows, "tab-1");
    const after = [...rows, terminal("term_delegate", "tab-1")];
    expect(newHandlesInTab(after, "tab-1", snapshot)).toEqual(["term_delegate"]);
  });

  it("ignores a new handle in another tab", () => {
    const snapshot = tabHandles(rows, "tab-1");
    const after = [...rows, terminal("term_other_tab", "tab-2")];
    expect(newHandlesInTab(after, "tab-1", snapshot)).toEqual([]);
  });
});

describe("decideSplit", () => {
  it("adopts an answer and recovers from an error, including a timeout", () => {
    expect(decideSplit({ ok: true, handle: "term_x" })).toEqual({
      kind: "adopt",
      handle: "term_x",
    });
    expect(
      decideSplit({
        ok: false,
        error: { code: "runtime_error", message: "Timed out" },
      })
    ).toEqual({
      kind: "recover",
      error: { code: "runtime_error", message: "Timed out" },
    });
  });
});

describe("decideRecovery", () => {
  it("keeps polling while the tab shows nothing new", () => {
    expect(decideRecovery([])).toEqual({ kind: "keep-polling" });
  });

  it("adopts exactly one new handle", () => {
    expect(decideRecovery(["term_x"])).toEqual({
      kind: "adopted",
      handle: "term_x",
    });
  });

  it("refuses to pick between two, and reports them sorted", () => {
    expect(decideRecovery(["term_b", "term_a"])).toEqual({
      kind: "ambiguous",
      handles: ["term_a", "term_b"],
    });
  });

  it("does not let a duplicate listing look ambiguous", () => {
    expect(decideRecovery(["term_x", "term_x"])).toEqual({
      kind: "adopted",
      handle: "term_x",
    });
  });
});

describe("decideWait", () => {
  it("prefers the report over every other signal", () => {
    expect(
      decideWait({
        reportPresent: true,
        exitPresent: true,
        paneListed: false,
        deadlineReached: true,
      })
    ).toEqual({ kind: "done" });
  });

  it("prefers the exit sidecar over a vanished pane and the deadline", () => {
    expect(
      decideWait({
        reportPresent: false,
        exitPresent: true,
        paneListed: false,
        deadlineReached: true,
      })
    ).toEqual({ kind: "exited" });
    expect(
      decideWait({
        reportPresent: false,
        exitPresent: true,
        paneListed: true,
        deadlineReached: true,
      })
    ).toEqual({ kind: "exited" });
  });

  it("reports a vanished pane before it reports a timeout", () => {
    expect(
      decideWait({
        reportPresent: false,
        exitPresent: false,
        paneListed: false,
        deadlineReached: true,
      })
    ).toEqual({ kind: "pane-gone" });
  });

  it("times out only while the pane is alive and the report is missing", () => {
    expect(
      decideWait({
        reportPresent: false,
        exitPresent: false,
        paneListed: true,
        deadlineReached: true,
      })
    ).toEqual({ kind: "still-running" });
  });

  it("keeps waiting while the pane is alive and there is time left", () => {
    expect(
      decideWait({
        reportPresent: false,
        exitPresent: false,
        paneListed: true,
        deadlineReached: false,
      })
    ).toEqual({ kind: "poll-again" });
  });
});

describe("exit codes", () => {
  it("maps every terminal state to its documented code and status", () => {
    const table = [
      [{ kind: "done", handle: null }, "done", 0],
      [
        {
          kind: "dispatch-failed",
          handle: null,
          reason: "no-new-pane",
          tabId: null,
          splitError: null,
        },
        "dispatch-failed",
        3,
      ],
      [
        { kind: "ambiguous", handle: null, handles: [], tabId: null },
        "ambiguous",
        4,
      ],
      [{ kind: "pane-gone", handle: "term_x" }, "pane-gone-no-report", 5],
      [
        { kind: "exited", handle: "term_x", exitStatus: 1 },
        "exited-no-report",
        6,
      ],
      [{ kind: "still-running", handle: "term_x" }, "still-running", 124],
    ] as const;
    for (const [state, status, exitCode] of table) {
      expect(statusOf(state)).toBe(status);
      expect(exitCodeOf(state)).toBe(exitCode);
    }
  });
});

describe("delegateCommand", () => {
  it("runs the brief in the workdir on the requested model and records the exit", () => {
    expect(delegateCommand(request)).toBe(
      "cd '/repo' && /bin/sh -c 'opencode run --auto -m '\\''opencode-go/grok-4.7'\\'' " +
        "--title '\\''jstack d1'\\'' " +
        "'\\''Read and follow the brief in /repo/.jstack/runs/d1.brief.md. " +
        "Write your final report to /repo/.jstack/runs/d1.report.md.'\\''; " +
        "printf '\\''%s'\\'' \"$?\" > '\\''/repo/.jstack/runs/d1.exit'\\'''"
    );
  });

  it("survives a quote in a path instead of letting it end the word", () => {
    const odd = shellQuote("/repo/it's here");
    expect(odd).toBe("'/repo/it'\\''s here'");
    expect(delegateCommand({ ...request, workdir: "/repo/it's here" })).toContain(
      odd
    );
  });
});