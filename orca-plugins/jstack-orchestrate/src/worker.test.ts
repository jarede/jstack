import { assert, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'

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
