export type Tone = 'neutral' | 'warning' | 'danger'

export interface Gate {
  id: string
  taskId: string | null
  question: string
  options: string[]
}

export interface Task {
  id: string
  title: string
  status: string
}

export interface Frontier {
  iid: number
  title: string | null
  state: string | null
  pipeline: string | null
  webUrl: string | null
}

export interface OrcaConfig {
  runId: string
  coordinator: string
  repo?: string
  frontierMr?: number
}

export interface Program {
  key: string
  repo: string
  slug: string
  objective: string | null
  runId: string
  coordinator: string
  gates: Gate[]
  tasks: Task[]
  frontierMr: number | null
  frontier: Frontier | null
  gatesOk: boolean
  tasksOk: boolean
  frontierOk: boolean
  errors: string[]
}

export interface Snapshot {
  checkedAt: number
  programs: Program[]
  text: string
  tone: Tone
  tooltip: string
}

export interface Notification {
  title: string
  body: string
}

export interface ProgramState {
  key: string
  gatesOk: boolean
  gates: Gate[]
  frontierOk: boolean
  frontier: Frontier | null
}

export interface NotificationSource {
  programs: ProgramState[]
}

export interface NotificationState extends NotificationSource {
  version: 1
  savedAt: number
}

export interface PluginSettings {
  repoPaths: unknown
  orcaPath: string
  glabPath: string
  intervalSeconds: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const SETTING_KEYS = ['repoPaths', 'orcaPath', 'glabPath', 'intervalSeconds'] as const

export function parseSettings(answer: unknown): PluginSettings {
  const envelope = isRecord(answer) ? answer : {}
  const wrapped = isRecord(envelope.settings) ? envelope.settings : null
  const raw: Record<string, unknown> =
    wrapped ?? (SETTING_KEYS.some((key) => key in envelope) ? envelope : {})

  return {
    repoPaths: raw.repoPaths,
    orcaPath: asString(raw.orcaPath) ?? '',
    glabPath: asString(raw.glabPath) ?? '',
    intervalSeconds: typeof raw.intervalSeconds === 'number' ? raw.intervalSeconds : 30
  }
}

export function parseConfig(text: string | null): { config: OrcaConfig } | { error: string } {
  if (text === null) return { error: 'missing orca.json' }

  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { error: `malformed orca.json: ${message}` }
  }
  if (!isRecord(value)) return { error: 'malformed orca.json: not an object' }

  const runId = asString(value.runId)
  if (!runId) return { error: 'malformed orca.json: no runId' }
  const coordinator = asString(value.coordinator)
  if (!coordinator) return { error: 'malformed orca.json: no coordinator' }

  const config: OrcaConfig = { runId, coordinator }

  if (value.repo !== undefined && value.repo !== null) {
    const repo = asString(value.repo)
    if (!repo) return { error: 'malformed orca.json: repo is not a path' }
    config.repo = repo
  }

  if (value.frontierMr !== undefined && value.frontierMr !== null) {
    const raw = value.frontierMr
    const iid = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN
    if (!Number.isInteger(iid) || iid <= 0) {
      return { error: 'malformed orca.json: frontierMr is not an MR iid' }
    }
    config.frontierMr = iid
  }

  return { config }
}

function commandError(body: Record<string, unknown>, fallback: string): string {
  const error = isRecord(body.error) ? body.error : null
  if (!error) return fallback
  const code = asString(error.code) ?? 'error'
  const message = asString(error.message) ?? fallback
  return `${code}: ${message}`
}

function readBody(stdout: string, label: string): { result: Record<string, unknown>; error: null } | { result: null; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    return { result: null, error: `${label} did not print JSON: ${clip(stdout || '(empty)', 140)}` }
  }
  if (!isRecord(parsed)) return { result: null, error: `${label} printed JSON that is not an object` }
  if (parsed.ok === false) return { result: null, error: commandError(parsed, `${label} failed`) }
  return { result: isRecord(parsed.result) ? parsed.result : {}, error: null }
}

function gateQuestion(gate: Record<string, unknown>): string {
  for (const key of ['question', 'title', 'summary', 'prompt', 'reason', 'id']) {
    const value = asString(gate[key])
    if (value) return value
  }
  return 'pending decision gate'
}

function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => asString(entry) ?? String(entry)).filter(Boolean)
  const text = asString(value)
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) return parsed.map((entry) => asString(entry) ?? String(entry)).filter(Boolean)
  } catch {
    // Orca reports options as a JSON-encoded array; anything else is shown as one option.
  }
  return [text]
}

export function parseGateList(stdout: string): { gates: Gate[]; error: string | null } {
  const body = readBody(stdout, 'gate-list')
  if (body.error) return { gates: [], error: body.error }

  const rows = Array.isArray(body.result.gates) ? body.result.gates : []
  const gates = rows.flatMap((row): Gate[] => {
    if (!isRecord(row)) return []
    const status = asString(row.status)
    if (status && status.toLowerCase() !== 'pending') return []
    return [
      {
        id: asString(row.id) ?? asString(row.gateId) ?? '?',
        taskId: asString(row.taskId),
        question: gateQuestion(row),
        options: parseOptions(row.options)
      }
    ]
  })
  return { gates, error: null }
}

export function parseTaskList(stdout: string): { tasks: Task[]; error: string | null } {
  const body = readBody(stdout, 'task-list')
  if (body.error) return { tasks: [], error: body.error }

  const rows = Array.isArray(body.result.tasks) ? body.result.tasks : []
  const tasks = rows.flatMap((row): Task[] => {
    if (!isRecord(row)) return []
    return [
      {
        id: asString(row.id) ?? '?',
        title: asString(row.title) ?? '?',
        status: asString(row.status) ?? 'unknown'
      }
    ]
  })
  return { tasks, error: null }
}

export function parseRunList(stdout: string): Record<string, string> {
  const objectives: Record<string, string> = {}
  try {
    const parsed = JSON.parse(stdout) as unknown
    if (!isRecord(parsed) || !isRecord(parsed.result)) return objectives
    const runs = Array.isArray(parsed.result.runs) ? parsed.result.runs : []
    for (const run of runs) {
      if (!isRecord(run)) continue
      const id = asString(run.id)
      const objective = asString(run.objective)
      if (id && objective) objectives[id] = objective
    }
  } catch {
    // run-list only enriches the panel; a failure leaves the slug as the label.
  }
  return objectives
}

function pipelineStatus(value: unknown): string | null {
  if (!isRecord(value)) return null
  return asString(value.status)?.toLowerCase() ?? null
}

export function parseMrView(stdout: string): { mr: Frontier } | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    return { error: `glab mr view did not print JSON: ${clip(stdout || '(empty)', 140)}` }
  }
  if (!isRecord(parsed)) return { error: 'glab mr view printed JSON that is not an object' }
  if (isRecord(parsed.error)) {
    return { error: commandError(parsed, 'glab mr view failed') }
  }

  const raw = parsed.iid
  const iid = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isInteger(iid) || iid <= 0) return { error: 'glab mr view returned no iid' }

  const head = pipelineStatus(parsed.head_pipeline)
  return {
    mr: {
      iid,
      title: asString(parsed.title),
      state: asString(parsed.state),
      pipeline: head ?? pipelineStatus(parsed.pipeline),
      webUrl: asString(parsed.web_url)
    }
  }
}

export function isPipelineFailed(status: string | null): boolean {
  return status === 'failed'
}

export function pipelineSymbol(status: string | null): string {
  switch (status) {
    case 'success':
      return '✓'
    case 'failed':
      return '✗'
    case 'running':
    case 'pending':
    case 'created':
    case 'preparing':
    case 'waiting_for_resource':
    case 'scheduled':
      return '…'
    case 'canceled':
    case 'cancelled':
    case 'skipped':
    case 'manual':
      return '–'
    default:
      return '?'
  }
}

export function lowestFrontier(programs: Program[]): Frontier | null {
  const frontiers = programs.flatMap((program) => (program.frontier ? [program.frontier] : []))
  if (frontiers.length === 0) return null
  return frontiers.reduce((lowest, next) => (next.iid < lowest.iid ? next : lowest))
}

function firstGate(programs: Program[]): Gate | null {
  for (const program of programs) {
    if (program.gates.length > 0) return program.gates[0]
  }
  return null
}

export function statusText(programs: Program[]): string {
  if (programs.length === 0) return 'jstack: idle'
  const gates = programs.reduce((total, program) => total + program.gates.length, 0)
  const parts = [`${gates} gate${gates === 1 ? '' : 's'}`]
  const frontier = lowestFrontier(programs)
  if (frontier) parts.push(`!${frontier.iid} ${pipelineSymbol(frontier.pipeline)}`)
  return `jstack: ${parts.join(' · ')}`
}

export function statusTone(programs: Program[]): Tone {
  if (programs.some((program) => isPipelineFailed(program.frontier?.pipeline ?? null))) return 'danger'
  if (programs.some((program) => program.gates.length > 0)) return 'warning'
  return 'neutral'
}

export function statusTooltip(programs: Program[]): string {
  if (programs.length === 0) return 'jstack orchestrate: no programs found'

  const gates = programs.reduce((total, program) => total + program.gates.length, 0)
  const parts = [
    `${programs.length} program${programs.length === 1 ? '' : 's'}`,
    `${gates} gate${gates === 1 ? '' : 's'} pending`
  ]
  const gate = firstGate(programs)
  if (gate) {
    parts.push(`gate: ${clip(gate.question, 120)}`)
  } else {
    const error = programs.flatMap((program) => program.errors)[0]
    if (error) {
      parts.push(`error: ${clip(error, 140)}`)
    } else {
      const frontier = lowestFrontier(programs)
      if (frontier && isPipelineFailed(frontier.pipeline)) {
        parts.push(`!${frontier.iid} pipeline failed`)
      }
    }
  }
  return clip(`jstack orchestrate: ${parts.join(' · ')}`, 256)
}

export function summarize(programs: Program[], checkedAt: number): Snapshot {
  return {
    checkedAt,
    programs,
    text: statusText(programs),
    tone: statusTone(programs),
    tooltip: statusTooltip(programs)
  }
}

export function notificationState(snapshot: Snapshot, savedAt = snapshot.checkedAt): NotificationState {
  return {
    version: 1,
    savedAt,
    programs: snapshot.programs.map((program) => ({
      key: program.key,
      gatesOk: program.gatesOk,
      gates: program.gates,
      frontierOk: program.frontierOk,
      frontier: program.frontier
    }))
  }
}

function parseSavedFrontier(value: unknown): Frontier | null {
  if (!isRecord(value)) return null
  const iid = typeof value.iid === 'number' ? value.iid : NaN
  if (!Number.isInteger(iid) || iid <= 0) return null
  return {
    iid,
    title: asString(value.title),
    state: asString(value.state),
    pipeline: asString(value.pipeline),
    webUrl: asString(value.webUrl)
  }
}

function parseSavedGate(value: unknown): Gate | null {
  if (!isRecord(value)) return null
  const id = asString(value.id)
  if (!id) return null
  return {
    id,
    taskId: asString(value.taskId),
    question: asString(value.question) ?? 'pending decision gate',
    options: parseOptions(value.options)
  }
}

export function parseNotificationState(text: string): NotificationState | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.programs)) return null

  const programs = value.programs.flatMap((row): ProgramState[] => {
    if (!isRecord(row) || typeof row.key !== 'string') return []
    const gates = Array.isArray(row.gates)
      ? row.gates.flatMap((gate): Gate[] => {
          const parsed = parseSavedGate(gate)
          return parsed ? [parsed] : []
        })
      : []
    return [
      {
        key: row.key,
        gatesOk: row.gatesOk === true,
        gates,
        frontierOk: row.frontierOk === true,
        frontier: parseSavedFrontier(row.frontier)
      }
    ]
  })

  return {
    version: 1,
    savedAt: typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) ? value.savedAt : 0,
    programs
  }
}

export function deriveNotifications(previous: NotificationSource | null, current: Snapshot): Notification[] {
  if (!previous) return []

  const before = new Map(previous.programs.map((program) => [program.key, program]))
  const notifications: Notification[] = []

  for (const program of current.programs) {
    const old = before.get(program.key)
    if (!old) continue

    if (old.gatesOk && program.gatesOk && old.gates.length === 0 && program.gates.length > 0) {
      const label = program.objective ?? program.slug
      notifications.push({
        title: 'jstack: decision gate pending',
        body: clip(`${label}: ${program.gates[0].question}`, 200)
      })
    }

    const becameFailed =
      old.frontierOk &&
      program.frontierOk &&
      old.frontier !== null &&
      program.frontier !== null &&
      !isPipelineFailed(old.frontier.pipeline) &&
      isPipelineFailed(program.frontier.pipeline)
    if (becameFailed && program.frontier) {
      const label = program.objective ?? program.slug
      notifications.push({
        title: 'jstack: pipeline failed',
        body: clip(`${label}: !${program.frontier.iid} pipeline failed`, 200)
      })
    }
  }

  return notifications
}
