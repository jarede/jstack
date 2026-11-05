import { afterEach, assert, mockHost, mount, test, type TestPanel } from 'orca/testing'
import * as panelModule from './panel'
import { sampleSnapshot } from './sample'

let panel: TestPanel | undefined
afterEach(() => panel?.unmount())

test('lists the gate, its options, tasks and the frontier pipeline', async () => {
  panel = await mount(panelModule, {
    host: mockHost({ requests: { 'programs.snapshot': sampleSnapshot } })
  })

  assert.ok(panel.find({ text: 'Ship the tokens screen?' }))
  assert.ok(panel.find({ text: /options: ship · hold/ }))
  assert.ok(panel.find({ text: 'blocked' }))
  assert.ok(panel.find({ text: /!12/ }))
  assert.deepEqual(panel.errors, [])
  assert.deepEqual(panel.refusals, [])
})

test('shows the empty state when there are no programs', async () => {
  panel = await mount(panelModule, {
    host: mockHost({
      requests: {
        'programs.snapshot': {
          checkedAt: 0,
          text: 'jstack: idle',
          tone: 'neutral',
          tooltip: 'jstack orchestrate: no programs found',
          programs: []
        }
      }
    })
  })

  assert.ok(panel.find({ type: 'EmptyState' }))
  assert.deepEqual(panel.errors, [])
})
