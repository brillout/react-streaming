import { describe, expect, it, vitest } from 'vitest'
import { render } from './render'
import { onConsoleError } from './onConsoleError'
import React, { Suspense } from 'react'
import { useAsync } from '../src/server/hooks'
import { partRegex } from '@brillout/part-regex'

describe('error handling', async () => {
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`renderToStream(Page) instead of renderToStream(<Page/>) - ${streamType} stream`, async () => {
      let warning = false
      onConsoleError((arg) => {
        if (typeof arg === 'string' && arg.startsWith('Functions are not valid as a React child.')) {
          warning = true
          return { suppress: true, removeListener: true }
        }
      })
      const Page = (() => {}) as any
      const { data, streamEnd } = await render(Page, { streamType })
      await streamEnd
      // Seems like a React bug. Seems like React closes the stream without invoking one of its error hooks.
      expect(data.content).toBe('')
      expect(warning).toBe(true)
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`Empty Page - ${streamType} stream`, async () => {
      const Page = (() => {}) as any
      const { data, streamEnd } = await render(<Page />, { streamType })
      await streamEnd
      expect(data.content).toBe('')
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`throw Error() in compoment - ${streamType} stream`, async () => {
      const Page = (() => {
        throw new Error('some-error')
      }) as any
      let didError = false
      const onBoundaryError = vitest.fn()
      try {
        await render(<Page />, { streamType, onBoundaryError })
      } catch (err) {
        didError = true
        expect(err.message).toBe('some-error')
      }
      expect(didError).toBe(true)
      expect(onBoundaryError).not.toBeCalled()
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`throw Error() after suspense boundary - ${streamType} stream`, async () => {
      const LazyComponent = () => {
        useAsync(
          'lazy-component-key',
          () =>
            new Promise<string>((resolve) => {
              setTimeout(() => resolve('Hello, I was lazy.'), 100)
            }),
        )
        throw new Error('some-error')
      }
      const Page = (() => {
        return (
          <Suspense fallback={<p>Loading...</p>}>
            <LazyComponent />
          </Suspense>
        )
      }) as any
      const onBoundaryError = vitest.fn()
      // React swallows the error, and retries to resolve the suspense on the cient-side
      const { data, streamEnd } = await render(<Page />, { streamType, onBoundaryError })
      await streamEnd
      {
        const split = 'at LazyComponent'
        const [dataBegin, ...rest] = data.content.split(split)
        const dataEnd = rest.join(split)

        // Page Shell:
        // ```html
        // <!--$?--><template id="B:0"></template><p>Loading...</p><!--/$-->
        // ```
        //
        // `useAsync()` script injection:
        // ```html
        // <script class="react-streaming_initData" type="application/json">{"key":"\\"lazy-component-key\\"","value":"Hello, I was lazy.","elementId":":R0:"}</script>
        // ```
        expect(dataBegin).toMatchInlineSnapshot(
          `
          "<!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

          some-error" data-stck="Switched to client rendering because the server rendering errored:

          Error: some-error
              "
        `,
        )

        // React handling the suspense boundary error
        {
          const content = split + dataEnd
          const filePointer = /[^\)]+/
          try {
            expect(content).toMatch(
              partRegex`at Page (${filePointer})\\n    at ReactStreamingProviderSuspenseData (${filePointer})")</script>`,
            )
          } catch (err) {
            console.log('actual:', content)
            throw err
          }
        }
      }
      expect(onBoundaryError).toBeCalled()
    })
  })
})
