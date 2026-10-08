import { describe, expect, it } from "bun:test";
import { main } from "./cli.ts";
import { dispatch } from "./policy.ts";
import {
  FAKE_START,
  fakeClock,
  fakeFs,
  fakeOrca,
  orcaError,
  splitFailure,
  terminal,
  type FakeClockOptions,
  type FakeOrcaOptions,
} from "./fakes.test-helper.ts";
import type {
  CliOptions,
  CliRuntime,
} from "./cli.ts";
import type {
  DispatchRequest,
  TerminalInfo,
} from "./types.ts";

const caller = terminal("term_caller", "tab-1");
const sibling = terminal("term_sibling", "tab-1");
const delegate = terminal("term_delegate", "tab-1");
const statePath = "/repo/.jstack/runs/d1.dispatch.json";
const report = "/repo/.jstack/runs/d1.report.md";

const argv = [
  "--name",
  "d1",
  "--model",
  "opencode-go/grok-4.7",
  "--workdir",
  "/repo",
  "--brief",
  "/repo/.jstack/runs/d1.brief.md",
  "--report",
  report,
  "--terminal",
  "term_caller",
];

const request = (overrides: Partial<DispatchRequest> = {}): DispatchRequest => ({
  name: "d1",
  model: "opencode-go/grok-4.7",
  workdir: "/repo",
  brief: "/repo/.jstack/runs/d1.brief.md",
  report,
  terminal: "term_caller",
  direction: "horizontal",
  timeoutMinutes: 45,
  recoverSeconds: 60,
  ...overrides,
});

interface Harness {
  readonly orca: ReturnType<typeof fakeOrca>;
  readonly fs: ReturnType<typeof fakeFs>;
  readonly clock: ReturnType<typeof fakeClock>;
}

function harness(options: {
  readonly listScript?: readonly (readonly TerminalInfo[])[];
  readonly splitResult?: FakeOrcaOptions["splitResult"];
  readonly onSleep?: FakeClockOptions["onSleep"];
  readonly seed?: Readonly<Record<string, string>>;
}): Harness {
  const fs = fakeFs();
  for (const [path, contents] of Object.entries(options.seed ?? {}))
    fs.seed(path, contents);
  return {
    orca: fakeOrca({
      ...(options.listScript === undefined ? {} : { listScript: options.listScript }),
      ...(options.splitResult === undefined ? {} : { splitResult: options.splitResult }),
    }),
    fs,
    clock: fakeClock(
      options.onSleep === undefined ? {} : { onSleep: options.onSleep }
    ),
  };
}

function runtime(built: Harness): { runtime: CliRuntime; stdout: string[] } {
  const stdout: string[] = [];
  return {
    stdout,
    runtime: {
      orca: built.orca,
      fs: built.fs,
      clock: built.clock,
      stdout: (value) => stdout.push(value),
      stderr: () => {},
    },
  };
}

describe("step 1: the report already landed", () => {
  it("prints done and never splits", async () => {
    const built = harness({
      seed: { [report]: "# d1\n" },
      listScript: [[caller]],
      splitResult: orcaError("invalid_argument", "must not be called"),
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main(argv, active)).toBe(0);
    expect(stdout).toEqual(["done\n"]);
    expect(built.orca.calls).not.toContain("split");
  });

  it("does not even ask the terminal list", async () => {
    const built = harness({ seed: { [report]: "# d1\n" } });
    const { runtime: active } = runtime(built);
    await main(argv, active);
    expect(built.orca.calls).toEqual([]);
  });
});

describe("step 2: the recorded pane is still alive", () => {
  it("waits for the report instead of splitting again", async () => {
    let seedReport = (): void => {};
    const built = harness({
      listScript: [[caller, sibling, delegate]],
      onSleep: (slept) => seedReport(),
      seed: {
        [statePath]: JSON.stringify({
          handle: "term_delegate",
          startedAt: "2026-07-26T00:00:00.000Z",
        }),
      },
    });
    seedReport = () => {
      built.fs.seed(report, "# d1\n");
    };
    const { runtime: active, stdout } = runtime(built);
    expect(await main(argv, active)).toBe(0);
    expect(stdout).toEqual(["done\n"]);
    expect(built.orca.calls).not.toContain("split");
    expect(built.orca.calls.filter((call) => call === "close")).toHaveLength(1);
    expect(built.fs.files.has(statePath)).toBe(false);
  });

  it("dispatches when the recorded handle is gone, because nothing is running", async () => {
    const fresh = terminal("term_new", "tab-1");
    const built = harness({
      listScript: [[caller, sibling], [caller, sibling, fresh]],
      splitResult: { ok: true, handle: "term_new" },
      seed: {
        [statePath]: JSON.stringify({
          handle: "term_delegate",
          startedAt: "2026-07-26T00:00:00.000Z",
        }),
      },
    });
    const state = await dispatch(
      { orca: built.orca, fs: built.fs, clock: built.clock },
      request({ timeoutMinutes: 1 / 60 })
    );
    expect(state.kind).toBe("still-running");
    expect(built.orca.splits).toHaveLength(1);
    expect(built.fs.files.get(statePath)).toContain("term_new");
  });
});

describe("step 3: the split answers", () => {
  it("waits, closes the pane, and clears the state file when the report lands", async () => {
    const built = harness({
      listScript: [[caller, sibling], [caller, sibling, delegate]],
      splitResult: { ok: true, handle: "term_delegate" },
      onSleep: (slept) => {
        if (slept.length === 1) built.fs.seed(report, "# d1\n");
      },
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main(argv, active)).toBe(0);
    expect(stdout).toEqual(["done\n"]);
    expect(built.orca.splits).toHaveLength(1);
    expect(built.orca.closes).toEqual(["term_delegate"]);
    expect(built.fs.files.has(statePath)).toBe(false);
  });

  it("writes the state file as soon as the handle is known", async () => {
    const built = harness({
      listScript: [[caller, sibling], [caller, sibling, delegate]],
      splitResult: { ok: true, handle: "term_delegate" },
    });
    await dispatch(
      { orca: built.orca, fs: built.fs, clock: built.clock },
      request({ timeoutMinutes: 1 / 60 })
    );
    const record: unknown = JSON.parse(
      built.fs.files.get(statePath) as string
    );
    expect(record).toMatchObject({ handle: "term_delegate" });
    expect((record as { startedAt: string }).startedAt).toBe(
      new Date(FAKE_START).toISOString()
    );
  });

  it("passes the delegate command and the caller handle to the split", async () => {
    const built = harness({
      listScript: [[caller, sibling], [caller, sibling, delegate]],
      splitResult: { ok: true, handle: "term_delegate" },
    });
    await dispatch(
      { orca: built.orca, fs: built.fs, clock: built.clock },
      request({ timeoutMinutes: 1 / 60 })
    );
    expect(built.orca.splits[0]).toMatchObject({
      terminal: "term_caller",
      direction: "horizontal",
    });
    expect(built.orca.splits[0]?.command).toContain("opencode run --auto");
  });
});

describe("step 3: the split timed out but the pane started", () => {
  it("adopts the one new handle in the tab and never splits twice", async () => {
    const built = harness({
      // list 1 is the pre-split snapshot, list 2 the first recovery poll,
      // list 3 the second, where the pane finally shows up.
      listScript: [
        [caller, sibling],
        [caller, sibling],
        [caller, sibling, delegate],
        [caller, sibling, delegate],
      ],
      splitResult: splitFailure(),
      onSleep: (slept) => {
        if (slept.length === 1) built.fs.seed(report, "# d1\n");
      },
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main(argv, active)).toBe(0);
    expect(stdout).toEqual(["done\n"]);
    expect(built.orca.splits).toHaveLength(1);
    expect(built.orca.closes).toEqual(["term_delegate"]);
    expect(built.clock.slept[0]).toBe(3_000);
  });

  it("ignores a new handle in another tab and fails with 3", async () => {
    const stray = terminal("term_other_tab", "tab-2");
    const built = harness({
      listScript: [
        [caller, sibling],
        [caller, sibling, stray],
        [caller, sibling, stray],
        [caller, sibling, stray],
        [caller, sibling, stray],
        [caller, sibling, stray],
        [caller, sibling, stray],
        [caller, sibling, stray],
      ],
      splitResult: splitFailure(),
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main([...argv, "--recover-sec", "9"], active)).toBe(3);
    expect(stdout[0]).toStartWith("dispatch-failed:");
    expect(built.orca.splits).toHaveLength(1);
    expect(built.orca.closes).toEqual([]);
    expect(built.fs.files.has(statePath)).toBe(false);
  });

  it("refuses to pick between two new panes and fails with 4", async () => {
    const other = terminal("term_someone_else", "tab-1");
    const built = harness({
      listScript: [[caller, sibling], [caller, sibling, delegate, other]],
      splitResult: splitFailure(),
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main(argv, active)).toBe(4);
    expect(stdout[0]).toContain("term_delegate");
    expect(stdout[0]).toContain("term_someone_else");
    expect(stdout[0]).toContain("none was adopted");
    expect(built.orca.closes).toEqual([]);
    expect(built.fs.files.has(statePath)).toBe(false);
  });

  it("records dispatch-failed as the one status a retry may repeat", async () => {
    const built = harness({
      listScript: [[caller, sibling]],
      splitResult: splitFailure(),
    });
    const state = await dispatch(
      { orca: built.orca, fs: built.fs, clock: built.clock },
      request({ recoverSeconds: 0.001 })
    );
    expect(state).toMatchObject({ kind: "dispatch-failed", reason: "no-new-pane" });
  });
});

describe("step 4: waiting", () => {
  it("exits 5 when the pane vanishes without a report", async () => {
    const built = harness({
      listScript: [[caller, sibling, delegate], [caller, sibling]],
      splitResult: { ok: true, handle: "term_delegate" },
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main(argv, active)).toBe(5);
    expect(stdout[0]).toStartWith("pane-gone-no-report:");
    expect(built.orca.closes).toEqual([]);
  });

  it("exits 124 with the pane and the state file left in place", async () => {
    const built = harness({
      listScript: [[caller, sibling], [caller, sibling, delegate]],
      splitResult: { ok: true, handle: "term_delegate" },
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main([...argv, "--timeout-min", "1"], active)).toBe(124);
    expect(stdout[0]).toContain("still open");
    expect(stdout[0]).toContain("resumes the wait instead of dispatching");
    expect(built.orca.closes).toEqual([]);
    expect(built.fs.files.has(statePath)).toBe(true);
  });

  it("resumes the wait on a second run without splitting again", async () => {
    // The report lands only after the first run has already given up, so the
    // second run has something to resume into. The clock is shared between
    // runs, so the poll count is tracked per run.
    let running = false;
    let sleptThisRun = 0;
    const built = harness({
      listScript: [[caller, sibling, delegate]],
      splitResult: { ok: true, handle: "term_delegate" },
      onSleep: () => {
        if (!running) return;
        sleptThisRun += 1;
        if (sleptThisRun === 1) built.fs.seed(report, "# d1\n");
      },
      seed: {
        [statePath]: JSON.stringify({
          handle: "term_delegate",
          startedAt: "2026-07-26T00:00:00.000Z",
        }),
      },
    });
    // First run: the pane is live, the deadline passes, nothing is closed.
    const first = runtime(built);
    expect(await main([...argv, "--timeout-min", "1"], first.runtime)).toBe(124);
    expect(built.orca.splits).toHaveLength(0);
    // Second run, same args: the recorded handle is resumed, not re-dispatched.
    running = true;
    const second = runtime(built);
    expect(await main([...argv, "--timeout-min", "1"], second.runtime)).toBe(0);
    expect(built.orca.splits).toHaveLength(0);
    expect(built.orca.closes).toEqual(["term_delegate"]);
    expect(built.fs.files.has(statePath)).toBe(false);
  });

  it("polls for the report every 15 seconds", async () => {
    const built = harness({
      listScript: [[caller, sibling], [caller, sibling, delegate]],
      splitResult: { ok: true, handle: "term_delegate" },
    });
    await dispatch(
      { orca: built.orca, fs: built.fs, clock: built.clock },
      request({ timeoutMinutes: 1 })
    );
    expect(new Set(built.clock.slept)).toEqual(new Set([15_000]));
  });

  it("treats an unreadable terminal list as still running, not as a dead pane", async () => {
    const orca = fakeOrca({ splitResult: { ok: true, handle: "term_delegate" } });
    const listed: unknown[] = [];
    orca.listTerminals = async () => {
      orca.calls.push("listTerminals");
      const next = listed.shift();
      return next === undefined
        ? orcaError("unreadable_output", "no json")
        : (next as never);
    };
    listed.push({ ok: true, terminals: [caller, sibling] });
    listed.push({ ok: true, terminals: [caller, sibling, delegate] });
    const fs = fakeFs();
    const clock = fakeClock({
      onSleep: (slept) => {
        if (slept.length === 1) fs.seed(report, "# d1\n");
      },
    });
    const state = await dispatch(
      { orca, fs, clock },
      request()
    );
    expect(state.kind).toBe("done");
  });
});

describe("usage", () => {
  it("returns 2 and writes the JSON envelope only when --json is asked for", async () => {
    const built = harness({});
    const first = runtime(built);
    expect(await main([...argv.slice(0, 2)], first.runtime)).toBe(2);
    expect(first.stdout).toEqual([]);

    const second = runtime(built);
    expect(
      await main([...argv.slice(0, 2), "--json"], second.runtime)
    ).toBe(2);
    expect(JSON.parse(second.stdout[0] as string)).toMatchObject({
      status: "usage",
      exitCode: 2,
    });
  });

  it("does not dispatch when the caller terminal is unknown", async () => {
    const built = harness({
      listScript: [[sibling]],
      splitResult: { ok: true, handle: "term_delegate" },
    });
    const state = await dispatch(
      { orca: built.orca, fs: built.fs, clock: built.clock },
      request()
    );
    expect(state).toMatchObject({
      kind: "dispatch-failed",
      reason: "caller-tab-unknown",
    });
    expect(built.orca.splits).toHaveLength(0);
  });

  it("does not dispatch when the terminal list cannot be read", async () => {
    const built = harness({ splitResult: { ok: true, handle: "term_delegate" } });
    built.orca.listTerminals = async () => {
      built.orca.calls.push("listTerminals");
      return orcaError("unreadable_output", "no json");
    };
    const state = await dispatch(
      { orca: built.orca, fs: built.fs, clock: built.clock },
      request()
    );
    expect(state).toMatchObject({
      kind: "dispatch-failed",
      reason: "terminal-list-unavailable",
    });
    expect(built.orca.splits).toHaveLength(0);
  });
});

describe("the state file is what makes a rerun safe", () => {
  it("survives a process that died between the split and the wait", async () => {
    const built = harness({
      listScript: [[caller, sibling, delegate]],
      splitResult: { ok: true, handle: "term_delegate" },
      seed: {
        [statePath]: JSON.stringify({
          handle: "term_delegate",
          startedAt: "2026-07-26T00:00:00.000Z",
        }),
      },
      onSleep: (slept) => {
        if (slept.length === 1) built.fs.seed(report, "# d1\n");
      },
    });
    const { runtime: active, stdout } = runtime(built);
    expect(await main(argv, active)).toBe(0);
    expect(built.orca.splits).toHaveLength(0);
    expect(stdout).toEqual(["done\n"]);
  });
});