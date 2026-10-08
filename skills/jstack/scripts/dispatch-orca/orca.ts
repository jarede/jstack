import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  CloseResult,
  DispatchFs,
  ListTerminalsResult,
  Orca,
  OrcaError,
  SplitRequest,
  SplitResult,
  TerminalHandle,
  TerminalInfo,
} from "./types.ts";

interface Envelope {
  readonly ok?: unknown;
  readonly result?: unknown;
  readonly error?: unknown;
}

interface CliRun {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function runCli(argv: readonly string[]): Promise<CliRun> {
  const child = Bun.spawn(["orca", ...argv], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
}

function parseEnvelope(run: CliRun): Envelope | null {
  try {
    const parsed: unknown = JSON.parse(run.stdout);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Envelope;
  } catch {
    return null;
  }
}

/** Keep the failure readable: one line, bounded, no shell noise in the message. */
function summarize(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim() !== "");
  return (firstLine ?? "").trim().slice(0, 200);
}

function readError(body: unknown): OrcaError | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as { readonly code?: unknown; readonly message?: unknown };
  if (typeof record.message !== "string") return null;
  return {
    code: typeof record.code === "string" ? record.code : "unknown_error",
    message: record.message,
  };
}

function unreadable(run: CliRun): OrcaError {
  return {
    code: run.exitCode === 0 ? "unexpected_result" : "unreadable_output",
    message:
      summarize(run.stderr) ||
      summarize(run.stdout) ||
      `orca exited with status ${run.exitCode}`,
  };
}

/** The failure an `ok: false` envelope, or a non-zero exit, resolves to. */
function failureOf(run: CliRun, envelope: Envelope | null): OrcaError {
  const reported = envelope === null ? null : readError(envelope.error);
  return reported ?? unreadable(run);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asHandle(value: unknown): TerminalHandle | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Narrows `result.terminals[]` to the handle and tab. Rows without both are
 * dropped: a handle with no tab cannot take part in the recovery diff, and
 * guessing a tab is how a second delegate's pane gets adopted.
 */
function readTerminals(result: unknown): readonly TerminalInfo[] | null {
  const holder = asRecord(result);
  const rows = holder === null ? null : holder.terminals;
  if (!Array.isArray(rows)) return null;
  const terminals: TerminalInfo[] = [];
  for (const row of rows) {
    const record = asRecord(row);
    if (record === null) continue;
    const handle = asHandle(record.handle);
    const tabId = asHandle(record.tabId);
    if (handle !== null && tabId !== null) terminals.push({ handle, tabId });
  }
  return terminals;
}

/**
 * The real Orca CLI. Every method shells out with `--json` and converts a
 * non-zero exit that carries a JSON error body into a result value, because
 * `split` answers that way when the pane started but the handle never came
 * back.
 */
export class CliOrca implements Orca {
  async listTerminals(): Promise<ListTerminalsResult> {
    const run = await runCli(["terminal", "list", "--json"]);
    const envelope = parseEnvelope(run);
    if (run.exitCode !== 0 || envelope?.ok !== true)
      return { ok: false, error: failureOf(run, envelope) };
    const terminals = readTerminals(envelope.result);
    if (terminals === null)
      return { ok: false, error: unreadable(run) };
    return { ok: true, terminals };
  }

  async split(request: SplitRequest): Promise<SplitResult> {
    const run = await runCli([
      "terminal",
      "split",
      "--terminal",
      request.terminal,
      "--direction",
      request.direction,
      "--command",
      request.command,
      "--json",
    ]);
    const envelope = parseEnvelope(run);
    if (run.exitCode !== 0 || envelope?.ok !== true)
      return { ok: false, error: failureOf(run, envelope) };
    // `result.split.handle` is the documented shape. Anything else is treated as
    // an unreadable success and routed to recovery, never adopted blindly.
    const result = asRecord(envelope.result);
    const split = result === null ? null : asRecord(result.split);
    const handle = split === null ? null : asHandle(split.handle);
    if (handle === null) return { ok: false, error: unreadable(run) };
    return { ok: true, handle };
  }

  async close(request: { readonly terminal: TerminalHandle }): Promise<CloseResult> {
    const run = await runCli([
      "terminal",
      "close",
      "--terminal",
      request.terminal,
      "--json",
    ]);
    const envelope = parseEnvelope(run);
    if (run.exitCode !== 0 || envelope?.ok !== true)
      return { ok: false, error: failureOf(run, envelope) };
    return { ok: true };
  }
}

export function nodeFs(): DispatchFs {
  return {
    fileSize(path) {
      try {
        return statSync(path).size;
      } catch {
        return null;
      }
    },
    readTextFile(path) {
      try {
        return readFileSync(path, "utf8");
      } catch {
        return null;
      }
    },
    writeTextFile(path, contents) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, contents);
    },
    removeFile(path) {
      rmSync(path, { force: true });
    },
  };
}