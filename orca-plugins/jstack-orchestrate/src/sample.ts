import type { Snapshot } from './core'

export const sampleSnapshot: Snapshot = {
  checkedAt: 1_763_000_000_000,
  text: 'jstack: 1 gate · !12 ✓',
  tone: 'warning',
  tooltip: 'jstack orchestrate: 1 program · 1 gate pending · gate: Ship the tokens screen?',
  programs: [
    {
      key: '/repo/.jstack/orchestrate/tokens/orca.json',
      repo: '/repo',
      slug: 'tokens',
      objective: 'Ship the tokens screen',
      runId: 'run_test',
      coordinator: 'terminal_handle',
      gates: [
        {
          id: 'gate_1',
          taskId: 'task_1',
          question: 'Ship the tokens screen?',
          options: ['ship', 'hold']
        }
      ],
      tasks: [
        { id: 'task_1', title: 'tokens endpoint', status: 'blocked' },
        { id: 'task_2', title: 'tokens screen', status: 'completed' }
      ],
      frontierMr: 12,
      frontier: {
        iid: 12,
        title: 'feat(tokens): inventário de tokens',
        state: 'opened',
        pipeline: 'success',
        webUrl: 'https://git.example/mr/12'
      },
      gatesOk: true,
      tasksOk: true,
      frontierOk: true,
      errors: []
    }
  ]
}

export const errorSnapshot: Snapshot = {
  checkedAt: 1_763_000_000_000,
  text: 'jstack: 0 gates · !12 ?',
  tone: 'neutral',
  tooltip: 'jstack orchestrate: 1 program · 0 gates pending · error: glab mr view !12: exit 1: 404',
  programs: [
    {
      key: '/repo/.jstack/orchestrate/tokens/orca.json',
      repo: '/repo',
      slug: 'tokens',
      objective: 'Ship the tokens screen',
      runId: 'run_test',
      coordinator: 'terminal_handle',
      gates: [],
      tasks: [],
      frontierMr: 12,
      frontier: null,
      gatesOk: true,
      tasksOk: true,
      frontierOk: false,
      errors: ['glab mr view !12: exit 1: 404 Not Found']
    }
  ]
}
