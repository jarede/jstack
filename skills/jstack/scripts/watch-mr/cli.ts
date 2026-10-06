import { setTimeout as delay } from "node:timers/promises";
import {
  Command,
  CommanderError,
  InvalidArgumentError,
  Option,
} from "commander";
import {
  GlabForgeReader,
  WatcherQueryError,
  discoverStack,
  resolveContext,
  reviewBots,
} from "./gitlab.ts";
import {
  runQueued,
  runSimple,
  statusQueryVerdict,
  verdictFactory,
  type WatchClock,
} from "./policy.ts";
import { renderJson, renderPretty } from "./render.ts";
import type * as T from "./types.ts";
import { nonEmpty, parseMrIid } from "./types.ts";
export interface CliOptions {
  readonly host: string | null;
  readonly project: string | null;
  readonly mr: T.MrIid | null;
  readonly mode: T.WatchMode;
  readonly stackMrs: readonly T.MrIid[];
  readonly statusOnly: boolean;
  readonly pretty: boolean;
  readonly bots: readonly string[];
  readonly polling: T.PollingOptions;
}
function positiveNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new InvalidArgumentError("must be greater than zero");
  return parsed;
}
function nonNegativeNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new InvalidArgumentError("must be zero or greater");
  return parsed;
}
function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new InvalidArgumentError("must be a positive integer");
  return parsed;
}
function mrIid(value: string): T.MrIid {
  try {
    return parseMrIid(Number(value.trim().replace(/^[#!]/, "")));
  } catch {
    throw new InvalidArgumentError("must be a positive integer");
  }
}
function stackMrList(value: string): T.NonEmpty<T.MrIid> {
  const numbers = value.split(",").map((part) => mrIid(part.trim()));
  if (new Set(numbers).size !== numbers.length)
    throw new InvalidArgumentError("contains a duplicate MR");
  const parsed = nonEmpty(numbers);
  if (parsed === null) throw new InvalidArgumentError("cannot be empty");
  return parsed;
}
function collectBot(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
interface RawOptions {
  readonly host?: string;
  readonly project?: string;
  readonly mr?: T.MrIid;
  readonly stack: boolean;
  readonly queuedStack: boolean;
  readonly stackMrs?: T.NonEmpty<T.MrIid>;
  readonly interval: number;
  readonly sweepInterval: number;
  readonly timeout: number;
  readonly maxQueryErrors: number;
  readonly statusOnly: boolean;
  readonly allowDraft: boolean;
  readonly pretty: boolean;
  readonly bot: string[];
}
export function parseArgs(
  argv: readonly string[],
  io: Pick<CliRuntime, "stdout" | "stderr">,
  env: Readonly<Record<string, string | undefined>> = process.env
): CliOptions {
  const program = new Command("watch-mr")
    .description(
      "Watch one merge request, a connected stack, or a queued stack.\nJSON (NDJSON while polling) is the default. --pretty renders human text."
    )
    .configureOutput({ writeOut: io.stdout, writeErr: io.stderr })
    .exitOverride()
    .option(
      "--host <hostname>",
      "GitLab host; default is GITLAB_HOST, then the origin remote"
    )
    .option(
      "--project <group/project>",
      "GitLab project path; default is the origin remote"
    )
    .option(
      "--mr <iid>",
      "merge request iid; default is the MR for the current branch",
      mrIid
    )
    .addOption(
      new Option("--stack", "watch the connected open stack")
        .default(false)
        .conflicts("queuedStack")
    )
    .option(
      "--queued-stack",
      "watch the captured stack until every MR merges",
      false
    )
    .option(
      "--stack-mrs <iid,iid,...>",
      "frozen bottom-to-top queue (queued mode only)",
      stackMrList
    )
    .option("--interval <seconds>", "poll interval", positiveNumber, 60)
    .option(
      "--sweep-interval <seconds>",
      "whole-stack sweep interval",
      positiveNumber,
      300
    )
    .option(
      "--timeout <seconds>",
      "deadline; 0 disables it",
      nonNegativeNumber,
      0
    )
    .option(
      "--max-query-errors <count>",
      "consecutive query-error budget",
      positiveInteger,
      5
    )
    .option("--status-only", "print one status table and exit 0", false)
    .option("--allow-draft", "do not treat a draft as a merge gate", false)
    .option("--pretty", "render human text instead of JSON", false)
    .option(
      "--bot <username>",
      "review bot username; repeatable. Also read from JSTACK_REVIEW_BOTS",
      collectBot,
      [] as string[]
    );
  program.parse(argv, { from: "user" });
  const raw = program.opts<RawOptions>();
  if (raw.stackMrs !== undefined && !raw.queuedStack)
    program.error("error: --stack-mrs requires --queued-stack");
  return {
    host: raw.host ?? env.GITLAB_HOST ?? null,
    project: raw.project ?? null,
    mr: raw.mr ?? null,
    mode: raw.queuedStack ? "queued-stack" : raw.stack ? "stack" : "single",
    stackMrs: raw.stackMrs ?? [],
    statusOnly: raw.statusOnly,
    pretty: raw.pretty,
    bots: reviewBots(raw.bot, env.JSTACK_REVIEW_BOTS),
    polling: {
      interval: raw.interval,
      sweepInterval: raw.sweepInterval,
      timeout: raw.timeout,
      maxQueryErrors: raw.maxQueryErrors,
      allowDraft: raw.allowDraft,
    },
  };
}
export interface CliRuntime {
  readonly reader: T.ForgeReader;
  readonly clock: WatchClock;
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}
function realRuntime(bots: readonly string[]): CliRuntime {
  return {
    reader: new GlabForgeReader({ bots }),
    clock: {
      now: () => performance.now() / 1_000,
      observedAt: () => new Date().toISOString(),
      sleep: async (seconds) => {
        await delay(seconds * 1_000);
      },
    },
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  };
}
export async function main(
  argv: readonly string[],
  runtime?: CliRuntime,
  env: Readonly<Record<string, string | undefined>> = process.env
): Promise<number> {
  let options: CliOptions;
  const io = runtime ?? {
    stdout: (value: string) => process.stdout.write(value),
    stderr: (value: string) => process.stderr.write(value),
  };
  try {
    options = parseArgs(argv, io, env);
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    return error.exitCode === 0 ? 0 : 64;
  }
  const active = runtime ?? realRuntime(options.bots);
  const render = options.pretty ? renderPretty : renderJson;
  const emit = (verdict: T.ProgressVerdict): void =>
    active.stdout(render(verdict));
  let contexts: T.NonEmpty<T.MrContext>;
  try {
    const seed = await resolveContext({
      reader: active.reader,
      host: options.host,
      project: options.project,
      mr: options.mr ?? options.stackMrs[0] ?? null,
    });
    contexts =
      nonEmpty(options.stackMrs.map((iid) => ({ ...seed, iid }))) ??
      (options.mode === "single"
        ? [seed]
        : await discoverStack(active.reader, seed));
  } catch (error) {
    if (!(error instanceof WatcherQueryError)) throw error;
    const verdict = statusQueryVerdict(
      verdictFactory(active.clock, options.mode),
      1,
      error.failure
    );
    active.stdout(render(verdict));
    return verdict.exitCode;
  }
  const dependencies = { reader: active.reader, clock: active.clock, emit };
  const verdict =
    options.mode === "queued-stack" && !options.statusOnly
      ? await runQueued({ dependencies, contexts, options: options.polling })
      : await runSimple({
          dependencies,
          contexts,
          mode: options.mode,
          statusOnly: options.statusOnly,
          options: options.polling,
        });
  active.stdout(render(verdict));
  return verdict.exitCode;
}
