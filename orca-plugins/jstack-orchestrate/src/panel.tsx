import {
  atom,
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Heading,
  plugin,
  read,
  Row,
  Separator,
  set,
  Stack,
  Text,
  update
} from 'orca'
import type { Program, Snapshot } from './protocol'

const snapshot = atom<Snapshot | null>(null)
const failure = atom<string | null>(null)
const busy = atom(false)

function apply(next: Snapshot): void {
  update(snapshot, (current) => (current && current.checkedAt > next.checkedAt ? current : next))
}

async function load(refresh: boolean): Promise<void> {
  set(busy, true)
  try {
    const next = await plugin.request(refresh ? 'programs.refresh' : 'programs.snapshot')
    apply(next)
    set(failure, null)
  } catch (error) {
    set(failure, error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  } finally {
    set(busy, false)
  }
}

export function setup(): () => void {
  void load(false)
  const subscription = plugin.on('programs.changed', (next) => apply(next))
  return () => subscription.dispose()
}

function pipelineTone(pipeline: string | null): 'neutral' | 'accent' | 'success' | 'danger' | 'warning' {
  switch (pipeline) {
    case 'success':
      return 'success'
    case 'failed':
      return 'danger'
    case 'running':
    case 'pending':
    case 'created':
      return 'accent'
    case 'canceled':
    case 'cancelled':
    case 'skipped':
    case 'manual':
      return 'warning'
    default:
      return 'neutral'
  }
}

function taskTone(status: string): 'neutral' | 'accent' | 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'completed':
    case 'succeeded':
      return 'success'
    case 'failed':
      return 'danger'
    case 'running':
    case 'working':
      return 'accent'
    case 'blocked':
      return 'warning'
    default:
      return 'neutral'
  }
}

function ProgramCard({ program }: { program: Program }) {
  return (
    <Card
      title={program.objective ?? program.slug}
      description={`${program.slug} · ${program.runId}`}
    >
      <Stack gap="sm">
        {program.errors.length > 0 ? (
          <Callout tone="danger" title="Errors">
            <Stack gap="xs">
              {program.errors.map((error) => (
                <Text size="xs">{error}</Text>
              ))}
            </Stack>
          </Callout>
        ) : null}

        <Text size="sm" weight="semibold">
          Pending gates ({program.gates.length})
        </Text>
        {program.gates.length === 0 ? (
          <Text size="xs" muted>
            {program.gatesOk ? 'none' : 'unavailable'}
          </Text>
        ) : (
          program.gates.map((gate) => (
            <Stack key={gate.id} gap="xs">
              <Text size="sm">{gate.question}</Text>
              {gate.options.length > 0 ? (
                <Text size="xs" muted>
                  options: {gate.options.join(' · ')}
                </Text>
              ) : null}
            </Stack>
          ))
        )}

        <Separator />

        <Text size="sm" weight="semibold">
          Tasks ({program.tasks.length})
        </Text>
        {program.tasks.length === 0 ? (
          <Text size="xs" muted>
            {program.tasksOk ? 'none' : 'unavailable'}
          </Text>
        ) : (
          program.tasks.map((task) => (
            <Row key={task.id} gap="xs" align="center">
              <Badge tone={taskTone(task.status)}>{task.status}</Badge>
              <Text size="xs" truncate>
                {task.title}
              </Text>
            </Row>
          ))
        )}

        <Separator />

        <Text size="sm" weight="semibold">
          Frontier MR
        </Text>
        {program.frontier ? (
          <Row gap="xs" align="center" wrap>
            <Text size="sm">!{program.frontier.iid}</Text>
            <Badge tone={pipelineTone(program.frontier.pipeline)}>
              {program.frontier.pipeline ?? 'no pipeline'}
            </Badge>
            <Text size="xs" muted truncate>
              {program.frontier.title ?? program.frontier.state ?? ''}
            </Text>
          </Row>
        ) : (
          <Text size="xs" muted>
            {program.frontierMr === null
              ? 'not set in orca.json'
              : program.frontierOk
                ? 'none'
                : 'unavailable'}
          </Text>
        )}
      </Stack>
    </Card>
  )
}

export default function Panel() {
  const current = read(snapshot)
  const problem = read(failure)
  const working = read(busy)

  return (
    <Stack gap="md">
      <Row justify="between" align="center">
        <Heading>jstack orchestrate</Heading>
        <Button size="xs" variant="ghost" icon="refresh" disabled={working} onPress={() => load(true)}>
          Refresh
        </Button>
      </Row>

      {problem ? (
        <Callout tone="danger" title="Panel error">
          <Text size="xs">{problem}</Text>
        </Callout>
      ) : null}

      {current === null ? (
        <Text size="sm" muted>
          Loading…
        </Text>
      ) : current.programs.length === 0 ? (
        <EmptyState
          title="No programs"
          icon="flag"
          description="Add absolute repo paths in Settings → Plugins → jstack orchestrate."
        />
      ) : (
        <Stack gap="md">
          <Row gap="xs" align="center" wrap>
            <Badge tone={current.tone}>{current.text.replace(/^jstack: /, '')}</Badge>
            <Text size="xs" muted>
              checked {new Date(current.checkedAt).toISOString().slice(11, 19)}Z
            </Text>
          </Row>
          {current.programs.map((program) => (
            <ProgramCard key={program.key} program={program} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
