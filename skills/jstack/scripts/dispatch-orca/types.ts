/**
 * Runtime-issued Orca terminal handle, shaped like `term_<uuid>`. Handles are
 * not stable across an Orca restart, which is why every read of one goes
 * through `Orca.listTerminals` instead of trusting the stored state file.
 */
export type TerminalHandle = string;

export type SplitDirection = "horizontal" | "vertical";

/**
 * One row of `orca terminal list --json` `result.terminals[]`, narrowed to the
 * two fields dispatch needs: which pane it is and which tab it shares with the
 * coordinator. Every other field in the real payload is ignored on purpose.
 */
export interface TerminalInfo {
  readonly handle: TerminalHandle;
  readonly tabId: string;
}

/** `orca ... --json` failure body: `error.code` and `error.message`. */
export interface OrcaError {
  readonly code: string;
  readonly message: string;
}

export type ListTerminalsResult =
  | { readonly ok: true; readonly terminals: readonly TerminalInfo[] }
  | { readonly ok: false; readonly error: OrcaError };

export interface SplitRequest {
  readonly terminal: TerminalHandle;
  readonly direction: SplitDirection;
  readonly command: string;
}

/**
 * A split either answers with the new pane handle or fails. The observed
 * failure is a non-zero exit carrying
 * `{"ok":false,"error":{"code":"runtime_error","message":"Timed out waiting for split pane handle"}}`
 * after the pane already started, which is why failure is a value here and not
 * an exception: it routes to recovery instead of to a retry.
 */
export type SplitResult =
  | { readonly ok: true; readonly handle: TerminalHandle }
  | { readonly ok: false; readonly error: OrcaError };

export type CloseResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: OrcaError };

/** The boundary every test drives. No method throws; every failure is a value. */
export interface Orca {
  listTerminals(): Promise<ListTerminalsResult>;
  split(request: SplitRequest): Promise<SplitResult>;
  close(request: { readonly terminal: TerminalHandle }): Promise<CloseResult>;
}

export interface DispatchFs {
  /** Byte length, or null when the path does not exist. */
  fileSize(path: string): number | null;
  readTextFile(path: string): string | null;
  writeTextFile(path: string, contents: string): void;
  removeFile(path: string): void;
}

export interface DispatchClock {
  /** Milliseconds since the epoch. */
  now(): number;
  /** ISO timestamp, used for the state file's `startedAt`. */
  observedAt(): string;
  sleep(milliseconds: number): Promise<void>;
}

/** Contents of `<dirname(report)>/<name>.dispatch.json`. */
export interface DispatchRecord {
  readonly handle: TerminalHandle;
  readonly startedAt: string;
}

export type DispatchFailureReason =
  | "caller-tab-unknown"
  | "terminal-list-unavailable"
  | "no-new-pane";

/**
 * The two in-flight states: a pane adopted from the state file, and one this
 * process opened. They are not exit statuses; they are what the wait loop
 * holds while it polls.
 */
export type InFlightState =
  | { readonly kind: "running"; readonly handle: TerminalHandle }
  | { readonly kind: "dispatched"; readonly handle: TerminalHandle };

/** Where the dispatch machine stands once the wait loop has resolved. */
export type DispatchState =
  | { readonly kind: "done"; readonly handle: TerminalHandle | null }
  | {
      readonly kind: "dispatch-failed";
      readonly handle: null;
      readonly reason: DispatchFailureReason;
      readonly tabId: string | null;
      readonly splitError: OrcaError | null;
    }
  | {
      readonly kind: "ambiguous";
      readonly handle: null;
      readonly handles: readonly TerminalHandle[];
      readonly tabId: string | null;
    }
  | { readonly kind: "pane-gone"; readonly handle: TerminalHandle }
  | { readonly kind: "still-running"; readonly handle: TerminalHandle };

/** `DispatchState` without the two in-flight kinds: everything with an exit code. */
export type TerminalState = Exclude<DispatchState, InFlightState>;

/** The word printed on the one-line output and carried in the JSON `status`. */
export type DispatchStatus =
  | "done"
  | "dispatch-failed"
  | "ambiguous"
  | "pane-gone-no-report"
  | "still-running";

/** Everything `dispatch()` needs. The state file path is derived, not passed. */
export interface DispatchRequest {
  readonly name: string;
  readonly model: string;
  readonly workdir: string;
  readonly brief: string;
  readonly report: string;
  readonly terminal: TerminalHandle;
  readonly direction: SplitDirection;
  readonly timeoutMinutes: number;
  readonly recoverSeconds: number;
}

export interface DispatchDependencies {
  readonly orca: Orca;
  readonly fs: DispatchFs;
  readonly clock: DispatchClock;
}

/** Recovery polls the terminal list every 3s while a split has no answer. */
export const RECOVERY_POLL_MS = 3_000;

/** The wait loop polls for the report file every 15s. */
export const WAIT_POLL_MS = 15_000;

export function stateFileName(name: string): string {
  return `${name}.dispatch.json`;
}