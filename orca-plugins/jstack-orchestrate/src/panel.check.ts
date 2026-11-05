import { defineCheck } from 'orca/testing'
import { errorSnapshot, sampleSnapshot } from './sample'

export default defineCheck({
  empty: {
    requests: {
      'programs.snapshot': {
        checkedAt: 0,
        text: 'jstack: idle',
        tone: 'neutral',
        tooltip: 'jstack orchestrate: no programs found',
        programs: []
      }
    }
  },
  busy: {
    requests: {
      'programs.snapshot': sampleSnapshot
    }
  },
  error: {
    requests: {
      'programs.snapshot': errorSnapshot
    }
  }
})
