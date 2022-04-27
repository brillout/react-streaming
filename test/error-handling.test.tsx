import { describe, expect, it } from 'vitest'
import { render } from './render'
import { onConsoleError } from './onConsoleError'
import React from 'react'

describe('error handling', async () => {
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`renderToStream(Page) instead of renderToStream(<Page/>) - ${streamType} stream`, async () => {
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
      const Page = (() => {}) as any
      const { data, streamEnded } = await render(Page, { streamType })
      await streamEnded
      // Seems like a React bug. Seems like React closes the stream without invoking one of its error hooks.
      expect(data.content).toBe('')
      expect(warning).toBe(true)
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`Empty Page - ${streamType} stream`, async () => {
      const Page = (() => {}) as any
      const { data, streamEnded } = await render(<Page />, { streamType })
      await streamEnded
      expect(data.content).toBe('')
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`throw Error() in compoment - ${streamType} stream`, async () => {
      const Page = (() => {
        throw new Error('some-error')
      }) as any
      let didError = false
      try {
        await render(<Page />, { streamType })
      } catch (err) {
        didError = true
        expect(err.message).toBe('some-error')
      }
      expect(didError).toBe(true)
    })
  })
})
