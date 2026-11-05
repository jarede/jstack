import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Dirent } from 'node:fs'
import type { OrcaWorkerApi } from 'orca/worker'
import {
  clip,
  deriveNotifications,
  parseConfig,
  parseGateList,
  parseMrView,
  parseRunList,
  parseTaskList,
  summarize,
  type Frontier,
  type Gate,
  type OrcaConfig,
  type Program,
  type Snapshot,
  type Task
} from './core'

const STATUS_ITEM = 'programs'
const TIMEOUT_MS = 15_000
const SHELL_TIMEOUT_MS = 5_000

interface RunResult {
  exit: number | null
  signal: string | null
  stdout: string
  stderr: string
  error: string | null
}

interface RunOptions {
  cwd?: string
  timeout?: number
}

interface Settings {
  repoPaths: unknown
  orcaPath: string
  glabPath: string
  intervalSeconds: number
}

interface Binaries {
  orca: string
  glab: string
}

interface FoundProgram {
  key: string
  repo: string
  slug: string
  config: OrcaConfig
}

function run(bin: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    execFile(
      bin,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeout ?? TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
        env: process.env
      },
      (error, stdout, stderr) => {
        const failure = error as (NodeJS.ErrnoException & { code?: number | string; signal?: string }) | null
        resolve({
          exit: typeof failure?.code === 'number' ? failure.code : failure ? null : 0,
          signal: failure?.signal ?? null,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          error: failure ? `${failure.code ?? 'error'}: ${failure.message}` : null
        })
      }
    )
  })
}

function commandFailure(result: RunResult): string | null {
  if (result.error) return result.error
  if (result.exit !== 0) {
    const detail = clip(result.stderr || result.stdout || 'no output', 300)
    return `exit ${result.exit ?? result.signal ?? '?'}: ${detail}`
  }
  return null
}

function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

function log(orca: OrcaWorkerApi, message: string): void {
  try {
    orca.log(`[jstack-orchestrate] ${message}`)
  } catch {
    // Logging must never be the reason a check fails.
  }
}

async function readSettings(orca: OrcaWorkerApi): Promise<Settings> {
  let raw: Record<string, unknown> = {}
  try {
    const answer = (await orca.host.call('settings.get', {})) as unknown
    if (answer && typeof answer === 'object' && 'settings' in answer) {
      const settings = (answer as { settings?: unknown }).settings
      if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
        raw = settings as Record<string, unknown>
      }
    }
  } catch (error) {
    log(orca, `settings.get failed: ${errorText(error)}`)
  }

  return {
    repoPaths: raw.repoPaths,
    orcaPath: typeof raw.orcaPath === 'string' ? raw.orcaPath.trim() : '',
    glabPath: typeof raw.glabPath === 'string' ? raw.glabPath.trim() : '',
    intervalSeconds: typeof raw.intervalSeconds === 'number' ? raw.intervalSeconds : 30
  }
}

function repoPaths(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : []
  return list
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.startsWith('/'))
}

function intervalMs(seconds: number): number {
  const bounded = Number.isFinite(seconds) ? Math.min(3600, Math.max(5, seconds)) : 30
  return Math.round(bounded * 1000)
}

let binaries: Binaries | null = null
let binaryKey = ''
let binaryPromise: Promise<Binaries> | null = null

async function fromLoginShell(name: string): Promise<string | null> {
  const shell = process.env.SHELL || '/bin/zsh'
  const result = await run(shell, ['-lc', `command -v ${name}`], { timeout: SHELL_TIMEOUT_MS })
  if (result.error) return null
  const path = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('/'))
    .at(-1)
  return path && existsSync(path) ? path : null
}

async function resolveBinaries(orca: OrcaWorkerApi, settings: Settings): Promise<Binaries> {
  const key = `${settings.orcaPath}\u0000${settings.glabPath}`
  if (binaries && binaryKey === key) return binaries
  if (binaryPromise && binaryKey === key) return binaryPromise

  binaryKey = key
  binaryPromise = (async () => {
    const orcaBin =
      settings.orcaPath || (await fromLoginShell('orca')) || '/usr/local/bin/orca'
    const glabBin =
      settings.glabPath || (await fromLoginShell('glab')) || '/opt/homebrew/bin/glab'

    binaries = { orca: orcaBin, glab: glabBin }
    log(orca, `resolved orca=${orcaBin} glab=${glabBin}`)
    return { orca: orcaBin, glab: glabBin }
  })()

  try {
    return await binaryPromise
  } finally {
    binaryPromise = null
  }
}

async function findPrograms(orca: OrcaWorkerApi, repoPath: string): Promise<FoundProgram[]> {
  const directory = join(repoPath, '.jstack', 'orchestrate')
  let entries: Dirent[]
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') log(orca, `cannot read ${directory}: ${errorText(error)}`)
    return []
  }

  const programs: FoundProgram[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const file = join(directory, entry.name, 'orca.json')

    let text: string | null = null
    try {
      text = await readFile(file, 'utf8')
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') log(orca, `cannot read ${file}: ${errorText(error)}`)
      continue
    }

    const parsed = parseConfig(text)
    if ('error' in parsed) {
      log(orca, `skip ${file}: ${parsed.error}`)
      continue
    }

    programs.push({
      key: file,
      repo: parsed.config.repo ?? repoPath,
      slug: entry.name,
      config: parsed.config
    })
  }
  return programs
}

async function inspectProgram(
  found: FoundProgram,
  bins: Binaries,
  objective: string | null
): Promise<Program> {
  const errors: string[] = []

  const gateArgs = [
    'orchestration',
    'gate-list',
    '--run',
    found.config.runId,
    '--from',
    found.config.coordinator,
    '--status',
    'pending',
    '--json'
  ]
  const gateRun = await run(bins.orca, gateArgs)
  let gates: Gate[] = []
  let gatesOk = false
  const gateFailure = commandFailure(gateRun)
  if (gateFailure) {
    errors.push(`gate-list: ${gateFailure}`)
  } else {
    const parsed = parseGateList(gateRun.stdout)
    if (parsed.error) errors.push(`gate-list: ${parsed.error}`)
    else {
      gates = parsed.gates
      gatesOk = true
    }
  }

  const taskArgs = [
    'orchestration',
    'task-list',
    '--run',
    found.config.runId,
    '--from',
    found.config.coordinator,
    '--json'
  ]
  const taskRun = await run(bins.orca, taskArgs)
  let tasks: Task[] = []
  let tasksOk = false
  const taskFailure = commandFailure(taskRun)
  if (taskFailure) {
    errors.push(`task-list: ${taskFailure}`)
  } else {
    const parsed = parseTaskList(taskRun.stdout)
    if (parsed.error) errors.push(`task-list: ${parsed.error}`)
    else {
      tasks = parsed.tasks
      tasksOk = true
    }
  }

  let frontier: Frontier | null = null
  let frontierOk = false
  if (found.config.frontierMr) {
    const glabArgs = ['mr', 'view', String(found.config.frontierMr), '-F', 'json']
    const glabRun = await run(bins.glab, glabArgs, { cwd: found.repo })
    const glabFailure = commandFailure(glabRun)
    if (glabFailure) {
      errors.push(`glab mr view !${found.config.frontierMr}: ${glabFailure}`)
    } else {
      const parsed = parseMrView(glabRun.stdout)
      if ('error' in parsed) errors.push(`glab mr view !${found.config.frontierMr}: ${parsed.error}`)
      else {
        frontier = parsed.mr
        frontierOk = true
      }
    }
  }

  return {
    key: found.key,
    repo: found.repo,
    slug: found.slug,
    objective,
    runId: found.config.runId,
    coordinator: found.config.coordinator,
    gates,
    tasks,
    frontierMr: found.config.frontierMr ?? null,
    frontier,
    gatesOk,
    tasksOk,
    frontierOk,
    errors
  }
}

async function collect(orca: OrcaWorkerApi, settings: Settings, bins: Binaries): Promise<Program[]> {
  const found: FoundProgram[] = []
  const seen = new Set<string>()
  for (const repoPath of repoPaths(settings.repoPaths)) {
    for (const program of await findPrograms(orca, repoPath)) {
      if (seen.has(program.key)) continue
      seen.add(program.key)
      found.push(program)
    }
  }
  if (found.length === 0) return []

  let objectives: Record<string, string> = {}
  const runList = await run(bins.orca, ['orchestration', 'run-list', '--json'])
  if (runList.error || runList.exit !== 0) {
    log(orca, `run-list: ${commandFailure(runList) ?? 'unreadable output'}`)
  } else {
    objectives = parseRunList(runList.stdout)
  }

  return Promise.all(
    found.map((program) => inspectProgram(program, bins, objectives[program.config.runId] ?? null))
  )
}

let latest: Snapshot | null = null
let previous: Snapshot | null = null
let inFlight: Promise<Snapshot> | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let stopped = false

async function doRefresh(orca: OrcaWorkerApi): Promise<Snapshot> {
  const settings = await readSettings(orca)
  const bins = await resolveBinaries(orca, settings)

  let programs: Program[] = []
  try {
    programs = await collect(orca, settings, bins)
  } catch (error) {
    log(orca, `check failed: ${errorText(error)}`)
  }

  const snapshot = summarize(programs, Date.now())
  const before = previous
  previous = snapshot
  latest = snapshot

  try {
    await orca.host.call('statusBar.update', {
      id: STATUS_ITEM,
      text: snapshot.text,
      tone: snapshot.tone,
      tooltip: snapshot.tooltip
    })
  } catch (error) {
    log(orca, `statusBar.update failed: ${errorText(error)}`)
  }

  for (const notification of deriveNotifications(before, snapshot)) {
    try {
      await orca.host.call('notifications.show', notification)
    } catch (error) {
      log(orca, `notifications.show failed: ${errorText(error)}`)
    }
  }

  try {
    orca.panels.post('programs.changed', snapshot)
  } catch (error) {
    log(orca, `panels.post failed: ${errorText(error)}`)
  }

  const firstError = programs.flatMap((program) => program.errors)[0]
  log(
    orca,
    `${snapshot.text} | programs=${programs.length} | tone=${snapshot.tone} | ` +
      `error=${firstError ?? '-'} | orca=${bins.orca} glab=${bins.glab}`
  )
  return snapshot
}

function refresh(orca: OrcaWorkerApi): Promise<Snapshot> {
  if (!inFlight) {
    inFlight = doRefresh(orca).finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

async function schedule(orca: OrcaWorkerApi): Promise<void> {
  if (stopped) return
  let seconds = 30
  try {
    seconds = (await readSettings(orca)).intervalSeconds
  } catch (error) {
    log(orca, `settings.get failed while scheduling: ${errorText(error)}`)
  }
  if (stopped) return
  timer = setTimeout(() => {
    void tick(orca)
  }, intervalMs(seconds))
}

async function tick(orca: OrcaWorkerApi): Promise<void> {
  try {
    await refresh(orca)
  } catch (error) {
    log(orca, `check failed: ${errorText(error)}`)
  }
  await schedule(orca)
}

export default function activate(orca: OrcaWorkerApi): void {
  stopped = false
  previous = null
  latest = null
  orca.panels.handle('programs.snapshot', async () => latest ?? (await refresh(orca)))
  orca.panels.handle('programs.refresh', async () => refresh(orca))

  void (async () => {
    try {
      const settings = await readSettings(orca)
      await resolveBinaries(orca, settings)
    } catch (error) {
      log(orca, `could not resolve binaries: ${errorText(error)}`)
    }
    await tick(orca)
  })()
}

export function deactivate(): void {
  stopped = true
  if (timer) clearTimeout(timer)
  timer = null
}
