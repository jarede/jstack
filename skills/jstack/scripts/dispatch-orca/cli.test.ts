import { describe, expect, it } from "bun:test";
import { parseArgs } from "./cli.ts";
import { renderResult, renderUsage } from "./render.ts";
import type { DispatchRequest } from "./types.ts";

const silentIo = { stdout: () => {}, stderr: () => {} };
const cleanEnv = {};
const required = [
  "--name",
  "d1",
  "--model",
  "opencode-go/grok-4.7",
  "--workdir",
  "/repo",
  "--brief",
  "/repo/.jstack/runs/d1.brief.md",
  "--report",
  "/repo/.jstack/runs/d1.report.md",
];

describe("parseArgs", () => {
  it("uses the specified defaults", () => {
    expect(
      parseArgs(required, silentIo, { ORCA_TERMINAL_HANDLE: "term_env" })
    ).toEqual({
      name: "d1",
      model: "opencode-go/grok-4.7",
      workdir: "/repo",
      brief: "/repo/.jstack/runs/d1.brief.md",
      report: "/repo/.jstack/runs/d1.report.md",
      terminal: "term_env",
      timeoutMinutes: 45,
      recoverSeconds: 60,
      json: false,
    });
  });

  it("reads ORCA_TERMINAL_HANDLE when --terminal is absent", () => {
    expect(
      parseArgs(required, silentIo, { ORCA_TERMINAL_HANDLE: "term_env" }).terminal
    ).toBe("term_env");
    expect(
      parseArgs(
        [...required, "--terminal", "term_flag"],
        silentIo,
        { ORCA_TERMINAL_HANDLE: "term_env" }
      ).terminal
    ).toBe("term_flag");
  });

  it("fails when neither --terminal nor the env var names a handle", () => {
    expect(() => parseArgs(required, silentIo, cleanEnv)).toThrow();
    expect(() =>
      parseArgs(required, silentIo, { ORCA_TERMINAL_HANDLE: "  " })
    ).toThrow();
  });

  it("rejects a relative --report, because the state file is derived from it", () => {
    expect(() =>
      parseArgs(
        [...required.slice(0, 8), "relative/report.md"],
        silentIo,
        { ORCA_TERMINAL_HANDLE: "term_env" }
      )
    ).toThrow();
  });

  it("rejects a name that is not a slug, because it names the state file", () => {
    for (const name of ["../escape", "has space", "", "x".repeat(65)]) {
      expect(() =>
        parseArgs(
          [required[0], name, ...required.slice(2)],
          silentIo,
          { ORCA_TERMINAL_HANDLE: "term_env" }
        )
      ).toThrow();
    }
  });

  it("rejects a non-positive timeout or recovery window", () => {
    expect(() =>
      parseArgs([...required, "--timeout-min", "0"], silentIo, {
        ORCA_TERMINAL_HANDLE: "term_env",
      })
    ).toThrow();
    expect(() =>
      parseArgs([...required, "--recover-sec", "-1"], silentIo, {
        ORCA_TERMINAL_HANDLE: "term_env",
      })
    ).toThrow();
  });
});

describe("renderResult", () => {
  const request: DispatchRequest = {
    name: "d1",
    model: "opencode-go/grok-4.7",
    workdir: "/repo",
    brief: "/repo/.jstack/runs/d1.brief.md",
    report: "/repo/.jstack/runs/d1.report.md",
    terminal: "term_caller",
    timeoutMinutes: 45,
    recoverSeconds: 60,
  };

  it("prints the bare status word for done", () => {
    expect(
      renderResult({ kind: "done", handle: null }, { request, json: false })
    ).toBe("done");
  });

  it("prints one JSON object with exactly the contract keys", () => {
    const line = renderResult(
      { kind: "still-running", handle: "term_x" },
      { request, json: true }
    );
    expect(JSON.parse(line)).toEqual({
      status: "still-running",
      handle: "term_x",
      report: "/repo/.jstack/runs/d1.report.md",
      exitCode: 124,
    });
  });

  it("prints null as the handle when no pane was adopted", () => {
    const line = renderResult(
      {
        kind: "ambiguous",
        handle: null,
        handles: ["term_a", "term_b"],
        tabId: "tab-1",
      },
      { request, json: true }
    );
    expect(JSON.parse(line)).toMatchObject({
      status: "ambiguous",
      handle: null,
      exitCode: 4,
    });
  });

  it("tells the operator a timed-out unit is still open and resumable", () => {
    const line = renderResult(
      { kind: "still-running", handle: "term_x" },
      { request, json: false }
    );
    expect(line.startsWith("still-running:")).toBe(true);
    expect(line).toContain("d1 is still open in handle term_x");
    expect(line).toContain("resumes the wait instead of dispatching");
  });

  it("carries the exit status in JSON for a delegate that died", () => {
    const line = renderResult(
      { kind: "exited", handle: "term_x", exitStatus: 1 },
      { request, json: true }
    );
    expect(JSON.parse(line)).toEqual({
      status: "exited-no-report",
      handle: "term_x",
      exitStatus: 1,
      report: "/repo/.jstack/runs/d1.report.md",
      exitCode: 6,
    });
  });

  it("tells the operator to read and close the pane of a delegate that died", () => {
    const line = renderResult(
      { kind: "exited", handle: "term_x", exitStatus: 1 },
      { request, json: false }
    );
    expect(line.startsWith("exited-no-report:")).toBe(true);
    expect(line).toContain("exited with status 1 in handle term_x");
    expect(line).toContain("orca terminal read --terminal term_x --json");
    expect(line).toContain("close it");
  });

  it("says a retry is safe only when no delegate was started", () => {
    const line = renderResult(
      {
        kind: "dispatch-failed",
        handle: null,
        reason: "no-new-pane",
        tabId: "tab-1",
        splitError: {
          code: "runtime_error",
          message: "Timed out waiting for split pane handle",
        },
      },
      { request, json: false }
    );
    expect(line).toContain("retrying is safe");
    expect(line).toContain("Timed out waiting for split pane handle");
  });

  it("never prints a handle for the ambiguous state", () => {
    const line = renderResult(
      {
        kind: "ambiguous",
        handle: null,
        handles: ["term_a", "term_b"],
        tabId: "tab-1",
      },
      { request, json: false }
    );
    expect(line).toContain("term_a, term_b");
    expect(line).toContain("none was adopted");
  });

  it("prints one line for a usage error, prose or JSON", () => {
    expect(
      renderUsage("missing --name", { report: "", json: false })
    ).toBe("usage: missing --name");
    expect(
      JSON.parse(renderUsage("missing --name", { report: "/r.md", json: true }))
    ).toEqual({ status: "usage", handle: null, report: "/r.md", exitCode: 2 });
  });
});