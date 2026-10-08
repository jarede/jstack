import { isAbsolute } from "node:path";
import {
  Command,
  CommanderError,
  InvalidArgumentError,
} from "commander";
import { CliOrca, nodeFs } from "./orca.ts";
import { EXIT_USAGE, dispatch, exitCodeOf } from "./policy.ts";
import { renderResult, renderUsage } from "./render.ts";
import type {
  DispatchClock,
  DispatchDependencies,
  DispatchRequest,
  TerminalHandle,
} from "./types.ts";

/** jstack names the run, the state file, and the pane title. Keep it a slug. */
const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface CliOptions {
  readonly name: string;
  readonly model: string;
  readonly workdir: string;
  readonly brief: string;
  readonly report: string;
  readonly terminal: TerminalHandle;
  readonly timeoutMinutes: number;
  readonly recoverSeconds: number;
  readonly json: boolean;
}

export interface CliRuntime extends DispatchDependencies {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

function positiveNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new InvalidArgumentError("must be greater than zero");
  return parsed;
}

function absolutePath(value: string): string {
  if (!isAbsolute(value))
    throw new InvalidArgumentError("must be an absolute path");
  return value;
}

function nonEmpty(value: string): string {
  if (value.trim() === "") throw new InvalidArgumentError("cannot be empty");
  return value;
}

interface RawOptions {
  readonly name: string;
  readonly model: string;
  readonly workdir: string;
  readonly brief: string;
  readonly report: string;
  readonly terminal?: string;
  readonly timeoutMin: number;
  readonly recoverSec: number;
  readonly json: boolean;
}

export function parseArgs(
  argv: readonly string[],
  io: Pick<CliRuntime, "stdout" | "stderr">,
  env: Readonly<Record<string, string | undefined>> = process.env
): CliOptions {
  const program = new Command("dispatch-orca")
    .description(
      "Dispatch one code delegate into an Orca pane and wait for its report.\nNever dispatches twice for one unit: a recorded handle is resumed, a split that did not answer is recovered from the terminal list."
    )
    .configureOutput({ writeOut: io.stdout, writeErr: io.stderr })
    .exitOverride()
    .requiredOption("--name <name>", "unit name; also names the state file", nonEmpty)
    .requiredOption("--model <provider/model>", "model the delegate runs on", nonEmpty)
    .requiredOption("--workdir <path>", "absolute working directory", absolutePath)
    .requiredOption("--brief <path>", "absolute path of the brief", absolutePath)
    .requiredOption("--report <path>", "absolute path of the final report", absolutePath)
    .option(
      "--terminal <handle>",
      "caller terminal handle; default is ORCA_TERMINAL_HANDLE",
      nonEmpty
    )
    .option("--timeout-min <minutes>", "wait deadline for this run", positiveNumber, 45)
    .option("--recover-sec <seconds>", "window to recover a split with no answer", positiveNumber, 60)
    .option("--json", "print one JSON object instead of prose", false);
  program.parse(argv, { from: "user" });
  const raw = program.opts<RawOptions>();
  if (!NAME_RE.test(raw.name))
    program.error(
      `error: --name ${raw.name} must be 1-64 characters of [a-z0-9._-]`
    );
  const terminal = (raw.terminal ?? env.ORCA_TERMINAL_HANDLE ?? "").trim();
  if (terminal === "")
    program.error(
      "error: --terminal is required; no ORCA_TERMINAL_HANDLE in the environment"
    );
  return {
    name: raw.name,
    model: raw.model,
    workdir: raw.workdir,
    brief: raw.brief,
    report: raw.report,
    terminal,
    timeoutMinutes: raw.timeoutMin,
    recoverSeconds: raw.recoverSec,
    json: raw.json,
  };
}

function realClock(): DispatchClock {
  return {
    now: () => Date.now(),
    observedAt: () => new Date().toISOString(),
    sleep: async (milliseconds) => {
      await new Promise((resolve) => setTimeout(resolve, milliseconds));
    },
  };
}

function realRuntime(): CliRuntime {
  return {
    orca: new CliOrca(),
    fs: nodeFs(),
    clock: realClock(),
    stdout: (value) => process.stdout.write(`${value}\n`),
    stderr: (value) => process.stderr.write(`${value}\n`),
  };
}

function requestOf(options: CliOptions): DispatchRequest {
  return {
    name: options.name,
    model: options.model,
    workdir: options.workdir,
    brief: options.brief,
    report: options.report,
    terminal: options.terminal,
    direction: "horizontal",
    timeoutMinutes: options.timeoutMinutes,
    recoverSeconds: options.recoverSeconds,
  };
}

/** Best-effort look at argv, so a usage failure can still report `--report`. */
function peekReport(argv: readonly string[]): string {
  const index = argv.indexOf("--report");
  const value = index === -1 ? undefined : argv[index + 1];
  return value === undefined || value.startsWith("--") ? "" : value;
}

export async function main(
  argv: readonly string[],
  runtime?: CliRuntime,
  env: Readonly<Record<string, string | undefined>> = process.env
): Promise<number> {
  const io = runtime ?? {
    stdout: (value: string) => process.stdout.write(`${value}\n`),
    stderr: (value: string) => process.stderr.write(`${value}\n`),
  };
  let options: CliOptions;
  try {
    options = parseArgs(argv, io, env);
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    if (error.exitCode === 0) return 0;
    const json = argv.includes("--json");
    if (json) io.stdout(`${renderUsage(error.message, { report: peekReport(argv), json })}\n`);
    return EXIT_USAGE;
  }
  const request = requestOf(options);
  const active = runtime ?? realRuntime();
  const state = await dispatch(active, request);
  active.stdout(`${renderResult(state, { request, json: options.json })}\n`);
  return exitCodeOf(state);
}