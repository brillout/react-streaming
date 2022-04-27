import { describe, expect, it } from 'vitest'
import { render } from './render'
import { onConsoleError } from './onConsoleError'

describe('error handling', async () => {
  const testError = (streamType: 'node' | 'web') => {
    it(`basic - Invalid React Component - ${streamType === 'node' ? 'Node.js' : 'Web'} Stream`, async () => {
      let warning = false
      onConsoleError((errMsg) => {
        if (
          errMsg.includes(
            'Warning: Functions are not valid as a React child. This may happen if you return a Component instead of <Component /> from render. Or maybe you meant to call this function rather than return it'
          )
        ) {
        }
        warning = true
        return { suppress: true, removeListener: true }
      })
      const { data, endPromise } = await render((() => {}) as any, { streamType })
      await endPromise
      expect(data.content).toBe('')
      expect(warning).toBe(true)
    })
  }
  testError('node')
  testError('web')
})
