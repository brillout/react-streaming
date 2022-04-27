import { describe, expect, it } from 'vitest'
import { render } from './render'
import { onConsoleError } from './onConsoleError'
import React from 'react'

describe('error handling', async () => {
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`renderToStream(App) instead of renderToStream(<App/>) - ${streamType} stream`, async () => {
      let warning = false
      onConsoleError((arg) => {
        if (
          typeof arg === 'string' &&
          arg.startsWith(
            'Warning: Functions are not valid as a React child. This may happen if you return a Component instead of <Component /> from render. Or maybe you meant to call this function rather than return it.'
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
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`Empty App - ${streamType} stream`, async () => {
      const App = (() => {}) as any
      const { data, endPromise } = await render(<App />, { streamType })
      await endPromise
      expect(data.content).toBe('')
    })
  })
  ;(['node' /*'web'*/] as const).forEach((streamType: 'node' | 'web') => {
    it(`throw Error() in compoment - ${streamType} stream`, async () => {
      const App = (() => {
        throw new Error('some-error')
      }) as any
      try {
        await render(<App />, { streamType })
      } catch (err) {
        expect(err.message).toBe('some-error')
      }
    })
  })
})
