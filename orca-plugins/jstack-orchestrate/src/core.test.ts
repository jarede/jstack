import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deriveNotifications,
  notificationState,
  parseConfig,
  parseGateList,
  parseMrView,
  parseNotificationState,
  parseSettings,
  parseTaskList,
  summarize,
  type Gate,
  type Program
} from './core'

function program(overrides: Partial<Program> = {}): Program {
  return {
    key: '/repo/.jstack/orchestrate/program/orca.json',
    repo: '/repo',
    slug: 'program',
    objective: 'Ship the thing',
    runId: 'run_test',
    coordinator: 'terminal_handle',
    gates: [],
    tasks: [],
    frontierMr: null,
    frontier: null,
    gatesOk: true,
    tasksOk: true,
    frontierOk: false,
    errors: [],
    ...overrides
  }
}

function gate(question: string, id = 'gate_1'): Gate {
  return { id, taskId: 'task_1', question, options: ['yes', 'no'] }
}

test('a 0 to N gate transition notifies once and N to N does not', () => {
  const before = summarize([program()], 1)
  const after = summarize([program({ gates: [gate('Ship it?')] })], 2)

  const first = deriveNotifications(before, after)
  assert.equal(first.length, 1)
  assert.equal(first[0].title, 'jstack: decision gate pending')
  assert.match(first[0].body, /Ship it\?/)

  assert.deepEqual(deriveNotifications(after, after), [])
  assert.deepEqual(
    deriveNotifications(after, summarize([program({ gates: [gate('Ship it?'), gate('Again?', 'gate_2')] })], 3)),
    []
  )
})

test('the first sample after activation never notifies', () => {
  const first = summarize([program({ gates: [gate('Ship it?')] })], 1)
  assert.deepEqual(deriveNotifications(null, first), [])
})

test('the saved state round-trips and keeps the 0 to N edge across a restart', () => {
  const saved = notificationState(summarize([program()], 1))
  const restored = parseNotificationState(JSON.stringify(saved))
  assert.deepEqual(restored, saved)

  const after = summarize([program({ gates: [gate('Ship it?')] })], 2)
  assert.equal(deriveNotifications(restored, after).length, 1)

  const alreadyPending = notificationState(summarize([program({ gates: [gate('Ship it?')] })], 1))
  assert.deepEqual(
    deriveNotifications(parseNotificationState(JSON.stringify(alreadyPending)), after),
    []
  )
})

test('a corrupt saved state is ignored', () => {
  assert.equal(parseNotificationState('{'), null)
  assert.equal(parseNotificationState('[]'), null)
  assert.equal(parseNotificationState('{"version":2,"programs":[]}'), null)
  assert.deepEqual(parseNotificationState('{"version":1,"programs":[{"key":"/repo/orca.json"}]}'), {
    version: 1,
    savedAt: 0,
    programs: [
      { key: '/repo/orca.json', gatesOk: false, gates: [], frontierOk: false, frontier: null }
    ]
  })
})

test('a failed pipeline gives danger and one notification', () => {
  const green = program({
    frontierMr: 12,
    frontierOk: true,
    frontier: { iid: 12, title: 'Frontier', state: 'opened', pipeline: 'success', webUrl: null }
  })
  const red = program({
    ...green,
    frontier: { iid: 12, title: 'Frontier', state: 'opened', pipeline: 'failed', webUrl: null }
  })

  const failed = summarize([red], 2)
  assert.equal(failed.tone, 'danger')
  assert.equal(failed.text, 'jstack: 0 gates · !12 ✗')

  const notifications = deriveNotifications(summarize([green], 1), failed)
  assert.equal(notifications.length, 1)
  assert.equal(notifications[0].title, 'jstack: pipeline failed')
  assert.match(notifications[0].body, /!12/)

  assert.deepEqual(deriveNotifications(failed, failed), [])
})

test('a missing or malformed orca.json is an error, not a crash', () => {
  assert.deepEqual(parseConfig(null), { error: 'missing orca.json' })

  const broken = parseConfig('{ not json')
  assert.ok('error' in broken && broken.error.startsWith('malformed orca.json'))

  assert.deepEqual(parseConfig('{}'), { error: 'malformed orca.json: no runId' })
  assert.deepEqual(parseConfig('{"runId":"run_1"}'), { error: 'malformed orca.json: no coordinator' })
  assert.deepEqual(parseConfig('{"runId":"run_1","coordinator":"t","frontierMr":"nope"}'), {
    error: 'malformed orca.json: frontierMr is not an MR iid'
  })

  assert.deepEqual(parseConfig('{"runId":"run_1","coordinator":"t","repo":"/repo","frontierMr":12}'), {
    config: { runId: 'run_1', coordinator: 't', repo: '/repo', frontierMr: 12 }
  })
})

test('a failing glab is reported in the tooltip, not raised', () => {
  const failed = parseMrView('')
  assert.ok('error' in failed && failed.error.includes('did not print JSON'))

  const refused = parseMrView('{"error":{"message":"404 Not Found"}}')
  assert.ok('error' in refused && refused.error.includes('404 Not Found'))

  const status = summarize(
    [
      program({
        frontierMr: 12,
        frontierOk: false,
        errors: ['glab mr view !12: exit 1: 404 Not Found']
      })
    ],
    1
  )
  assert.equal(status.tone, 'neutral')
  assert.match(status.tooltip, /error: glab mr view !12/)
})

test('the tooltip stays under 256 characters', () => {
  const status = summarize([program({ gates: [gate(`Ship ${'x'.repeat(600)}?`)] })], 1)
  assert.ok(status.tooltip.length <= 256, `tooltip was ${status.tooltip.length} characters`)
  assert.ok(status.tooltip.endsWith('…'))
})

test('no programs is the idle state', () => {
  const status = summarize([], 1)
  assert.equal(status.text, 'jstack: idle')
  assert.equal(status.tone, 'neutral')
  assert.equal(status.tooltip, 'jstack orchestrate: no programs found')
})

test('the status line shows the gate count and the frontier MR', () => {
  const status = summarize(
    [
      program({
        gates: [gate('Ship it?')],
        frontierMr: 12,
        frontierOk: true,
        frontier: { iid: 12, title: 'Frontier', state: 'opened', pipeline: 'success', webUrl: null }
      })
    ],
    1
  )
  assert.equal(status.text, 'jstack: 1 gate · !12 ✓')
  assert.equal(status.tone, 'warning')
})

test('parses the JSON shapes orca and glab print', () => {
  const gates = parseGateList(
    JSON.stringify({
      ok: true,
      result: {
        runId: 'run_test',
        gates: [
          {
            id: 'gate_1',
            taskId: 'task_1',
            status: 'pending',
            question: 'Liberar?',
            options: '["liberar","cancelar"]'
          },
          { id: 'gate_2', status: 'resolved', question: 'Old?', options: '[]' }
        ]
      }
    })
  )
  assert.equal(gates.error, null)
  assert.deepEqual(gates.gates, [
    { id: 'gate_1', taskId: 'task_1', question: 'Liberar?', options: ['liberar', 'cancelar'] }
  ])

  const failedGates = parseGateList('{"ok":false,"error":{"code":"run_required","message":"No Run"}}')
  assert.deepEqual(failedGates.gates, [])
  assert.equal(failedGates.error, 'run_required: No Run')

  const tasks = parseTaskList(
    '{"ok":true,"result":{"tasks":[{"id":"task_1","status":"blocked","title":"stop me"}],"runId":"run_test"}}'
  )
  assert.equal(tasks.error, null)
  assert.deepEqual(tasks.tasks, [{ id: 'task_1', title: 'stop me', status: 'blocked' }])

  const mr = parseMrView(
    JSON.stringify({
      iid: 2,
      title: 'Tokens',
      state: 'opened',
      web_url: 'https://git.example/mr/2',
      pipeline: null,
      head_pipeline: { id: 8587, status: 'success' }
    })
  )
  assert.ok('mr' in mr)
  assert.deepEqual(mr.mr, {
    iid: 2,
    title: 'Tokens',
    state: 'opened',
    pipeline: 'success',
    webUrl: 'https://git.example/mr/2'
  })
})

test('reads the settings record the worker API returns', () => {
  assert.deepEqual(
    parseSettings({
      repoPaths: '/Users/me/projetos/jstack',
      orcaPath: ' /usr/local/bin/orca ',
      glabPath: '',
      intervalSeconds: 10
    }),
    {
      repoPaths: '/Users/me/projetos/jstack',
      orcaPath: '/usr/local/bin/orca',
      glabPath: '',
      intervalSeconds: 10
    }
  )
})

test('also reads the raw settings.get envelope', () => {
  const answer = { settings: { repoPaths: '/repo', orcaPath: '', glabPath: '/bin/glab', intervalSeconds: 60 } }
  assert.deepEqual(parseSettings(answer), {
    repoPaths: '/repo',
    orcaPath: '',
    glabPath: '/bin/glab',
    intervalSeconds: 60
  })

  assert.deepEqual(parseSettings({ settings: { repoPaths: '/wrapped' }, repoPaths: '/flat' }), {
    repoPaths: '/wrapped',
    orcaPath: '',
    glabPath: '',
    intervalSeconds: 30
  })
})

test('settings of the wrong shape fall back to their defaults', () => {
  const defaults = { repoPaths: undefined, orcaPath: '', glabPath: '', intervalSeconds: 30 }
  assert.deepEqual(parseSettings(null), defaults)
  assert.deepEqual(parseSettings([]), defaults)
  assert.deepEqual(parseSettings({ settings: null }), defaults)
  assert.deepEqual(parseSettings({ unrelated: 'value' }), defaults)
  assert.deepEqual(parseSettings({ intervalSeconds: 'soon' }), defaults)
})
