import type { Snapshot } from './core'

export type { Frontier, Gate, Notification, Program, Snapshot, Task, Tone } from './core'

declare module 'orca' {
  interface PluginRequests {
    'programs.snapshot': { output: Snapshot }
    'programs.refresh': { output: Snapshot }
  }

  interface PluginPanelEvents {
    'programs.changed': Snapshot
  }
}
