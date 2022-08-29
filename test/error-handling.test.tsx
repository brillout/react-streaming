import { describe, expect, it, vitest } from 'vitest'
import { render } from './render'
import { onConsoleError } from './onConsoleError'
import React, { Suspense } from 'react'
import { useAsync } from '../src/index'
import { partRegex } from '@brillout/part-regex'

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
          () =>
            new Promise<string>((resolve) => {
              setTimeout(() => resolve('Hello, I was lazy.'), 100)
            })
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
        const filePointer = /[^\)]+/
        const split = '<script>'
        const [dataBegin, dataEnd, ...rest] = data.content.split(split)
        expect(rest.length).toBe(0)
        const dataContentExpected = [
          // Page Shell
          '<!--$?--><template id="B:0"></template><p>Loading...</p><!--/$-->',
          // `useAsync()` script injection
          '<script class="react-streaming_ssr-data" type="application/json">{"key":":R0:","value":"Hello, I was lazy.","deps":[]}</script>',
        ].join('')
        try {
          expect(dataBegin).toMatch(dataContentExpected)
        } catch (err) {
          console.log('expected:', dataContentExpected)
          console.log('actual:', data.content)
          console.log('\n\n\n')
          throw err
        }
        // React handling the suspense boundary error
        expect(split + dataEnd).toMatch(
          partRegex`<script>function $RX(b,c,d,e){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),b._reactRetry&&b._reactRetry())};$RX("B:0","","some-error","\\n    at Page (${filePointer})\\n    at SsrDataProvider (${filePointer})")</script>`
        )
      }
      expect(onBoundaryError).toBeCalled()
    })
  })
})
