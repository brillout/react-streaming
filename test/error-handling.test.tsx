import { describe, expect, it } from 'vitest'
import { render } from './render'
import { onConsoleError } from './onConsoleError'

describe('error handling', async () => {
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`renderToStream(App) instead of renderToStream(<App/>) - ${streamType} stream`, async () => {
      let warning = false
      onConsoleError((errMsg) => {
        if (
          errMsg.includes(
            'Warning: Functions are not valid as a React child. This may happen if you return a Component instead of <Component /> from render. Or maybe you meant to call this function rather than return it'
          )
        ) {
          warning = true
          return { suppress: true, removeListener: true }
        }
      })
      const App = (() => {}) as any
      const { data, endPromise } = await render(App, { streamType })
      await endPromise
      // Seems like a React bug. Seems like React closes the stream without invoking one of its error hooks.
      expect(data.content).toBe('')
      expect(warning).toBe(true)
    })
  })
})
