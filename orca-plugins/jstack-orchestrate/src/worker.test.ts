import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, assert, beforeEach, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'

let cacheDir = ''
let cacheBefore = process.env.XDG_CACHE_HOME

beforeEach(async () => {
  cacheBefore = process.env.XDG_CACHE_HOME
  cacheDir = await mkdtemp(join(tmpdir(), 'jstack-orchestrate-cache-'))
  process.env.XDG_CACHE_HOME = cacheDir
})

afterEach(async () => {
  if (cacheBefore === undefined) delete process.env.XDG_CACHE_HOME
  else process.env.XDG_CACHE_HOME = cacheBefore
  await rm(cacheDir, { recursive: true, force: true })
})

test('starts with no repo paths and reports the idle state', async () => {
  const worker = await mountWorker(main, {
    host: mockHost({ settings: { repoPaths: '', intervalSeconds: 3600 } })
  })
  try {
    const snapshot = await worker.request('programs.snapshot')
    assert.equal(snapshot.text, 'jstack: idle')
    assert.equal(snapshot.tone, 'neutral')
    assert.deepEqual(snapshot.programs, [])

    const updates = worker.host.callsOf('statusBar.update') as { id?: string; text?: string }[]
    assert.ok(updates.some((update) => update.id === 'programs' && update.text === 'jstack: idle'))
    assert.deepEqual(worker.refusals, [])
  } finally {
    await worker.deactivate()
  }
})

test('a gate that appears across a worker restart still notifies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jstack-orchestrate-'))
  try {
    const repo = join(dir, 'repo')
    await mkdir(join(repo, '.jstack', 'orchestrate', 'program'), { recursive: true })
    await writeFile(
      join(repo, '.jstack', 'orchestrate', 'program', 'orca.json'),
      JSON.stringify({ runId: 'run_test', coordinator: 'term_test' })
    )

    const gatesFile = join(dir, 'gates.json')
    const fakeOrca = join(dir, 'orca')
    await writeFile(
      fakeOrca,
      `#!/bin/sh
case "$2" in
  gate-list) cat "${gatesFile}" ;;
  task-list) printf '%s' '{"ok":true,"result":{"tasks":[]}}' ;;
  run-list) printf '%s' '{"ok":true,"result":{"runs":[]}}' ;;
esac
`
    )
    await chmod(fakeOrca, 0o755)

    const settings = {
      repoPaths: repo,
      orcaPath: fakeOrca,
      glabPath: '/bin/true',
      intervalSeconds: 3600
    }
    const empty = JSON.stringify({ ok: true, result: { gates: [] } })
    const pending = JSON.stringify({
      ok: true,
      result: {
        gates: [
          {
            id: 'gate_1',
            task_id: 'task_1',
            question: 'Ship it?',
            options: '["ok"]',
            status: 'pending'
          }
        ]
      }
    })

    await writeFile(gatesFile, empty)
    const first = await mountWorker(main, { host: mockHost({ settings }) })
    try {
      const snapshot = await first.request('programs.snapshot')
      assert.equal(snapshot.text, 'jstack: 0 gates')
      assert.deepEqual(first.host.callsOf('notifications.show'), [])
    } finally {
      await first.deactivate()
    }

    await writeFile(gatesFile, pending)
    const second = await mountWorker(main, { host: mockHost({ settings }) })
    try {
      const snapshot = await second.request('programs.snapshot')
      assert.equal(snapshot.text, 'jstack: 1 gate')
      const calls = second.host.callsOf('notifications.show') as { title: string; body: string }[]
      assert.equal(calls.length, 1)
      assert.equal(calls[0].title, 'jstack: decision gate pending')
      assert.match(calls[0].body, /Ship it\?/)
    } finally {
      await second.deactivate()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
