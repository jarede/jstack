import type {
  CloseResult,
  DispatchClock,
  DispatchFs,
  ListTerminalsResult,
  Orca,
  OrcaError,
  SplitRequest,
  SplitResult,
  TabLayout,
  TerminalHandle,
  TerminalInfo,
} from "./types.ts";

export interface FakeOrcaOptions {
  /**
   * Terminal lists returned by successive `listTerminals` calls. The last entry
   * repeats forever, so a test only scripts the transitions it cares about.
   */
  readonly listScript?: readonly (readonly TerminalInfo[])[];
  /** Pane trees served with every list; a tab with no entry reads as no tree. */
  readonly layouts?: readonly TabLayout[];
  readonly splitResult?: SplitResult;
}

export interface FakeOrca extends Orca {
  readonly calls: string[];
  readonly splits: SplitRequest[];
  readonly closes: TerminalHandle[];
}

export function terminal(handle: string, tabId = "tab-1"): TerminalInfo {
  return { handle, tabId };
}

export function orcaError(
  code: string,
  message: string
): { readonly ok: false; readonly error: OrcaError } {
  return { ok: false, error: { code, message } };
}

export function splitFailure(): SplitResult {
  return orcaError("runtime_error", "Timed out waiting for split pane handle");
}

export function fakeOrca(options: FakeOrcaOptions = {}): FakeOrca {
  const calls: string[] = [];
  const splits: SplitRequest[] = [];
  const closes: TerminalHandle[] = [];
  const script =
    options.listScript === undefined ? [[]] : [...options.listScript];
  const splitResult: SplitResult =
    options.splitResult ?? orcaError("invalid_argument", "nothing scripted");
  const next = (): ListTerminalsResult => {
    const index = Math.min(calls.filter((call) => call === "listTerminals").length - 1, script.length - 1);
    return {
      ok: true,
      terminals: script[Math.max(index, 0)] ?? [],
      layouts: options.layouts ?? [],
    };
  };
  return {
    calls,
    splits,
    closes,
    async listTerminals() {
      calls.push("listTerminals");
      return next();
    },
    async split(request) {
      calls.push("split");
      splits.push(request);
      return splitResult;
    },
    async close(request): Promise<CloseResult> {
      calls.push("close");
      closes.push(request.terminal);
      return { ok: true };
    },
  };
}

export interface FakeClock extends DispatchClock {
  /** Epoch milliseconds the clock has been advanced to, for assertions. */
  readonly slept: readonly number[];
}

export interface FakeClockOptions {
  readonly start?: number;
  /** Called after time advances, so a test can land a report mid-poll. */
  readonly onSleep?: (slept: readonly number[], count: number) => void;
}

/**
 * A clock that never really sleeps: `sleep` advances virtual time and hands
 * control back to the test, which is what lets a scenario say "the report
 * lands on the third poll" without any wall-clock wait.
 */
/** The epoch millisecond every fake clock starts from unless told otherwise. */
export const FAKE_START = 1_700_000_000_000;

export function fakeClock(options: FakeClockOptions = {}): FakeClock {
  const slept: number[] = [];
  let now = options.start ?? FAKE_START;
  return {
    slept,
    now: () => now,
    observedAt: () => new Date(now).toISOString(),
    async sleep(milliseconds) {
      now += milliseconds;
      slept.push(milliseconds);
      options.onSleep?.(slept, slept.length);
    },
  };
}

export interface FakeFs extends DispatchFs {
  readonly files: Map<string, string>;
  /** Write a file only once it is read, to make ordering explicit. */
  seed(path: string, contents: string): void;
}

export function fakeFs(): FakeFs {
  const files = new Map<string, string>();
  return {
    files,
    seed(path, contents) {
      files.set(path, contents);
    },
    fileSize(path) {
      return files.has(path) ? (files.get(path) as string).length : null;
    },
    readTextFile(path) {
      return files.get(path) ?? null;
    },
    writeTextFile(path, contents) {
      files.set(path, contents);
    },
    removeFile(path) {
      files.delete(path);
    },
  };
}