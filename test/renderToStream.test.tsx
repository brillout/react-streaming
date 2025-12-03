import { describe, expect, it } from 'vitest'
import React from 'react'
import { Page } from './Page'
import { render } from './render'

describe('renderToStream()', async () => {
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    ;[true, false].forEach((disable) => {
      it(`basic - ${streamType} Stream${disable ? ' - disabled' : ''}`, async () => {
        const { data, streamEnd } = await render(<div>hello</div>, { streamType, disable })
        await streamEnd
        expect(data.content).toBe('<div>hello</div>')
      })
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    ;[true, false].forEach((disable) => {
      it(`injectToStream - basic - ${streamType} stream${disable ? ' - disabled' : ''}`, async () => {
        const { data, streamEnd, injectToStream, doNotClose } = await render(<>hi</>, { streamType, disable })
        const makeClosableAgain = doNotClose()
        injectToStream('<script type="module" src="/main.js"></script>')
        makeClosableAgain()
        await streamEnd
        expect(data.content).toBe('hi<script type="module" src="/main.js"></script>')
      })
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    ;[true, false].forEach((disable) => {
      it(`injectToStream - useAsync() - ${streamType} stream${disable ? ' - disabled' : ''}`, async () => {
        const { data, streamEnd, injectToStream } = await render(<Page />, { streamType, disable: false })
        injectToStream('<script type="module" src="/main.js"></script>')

        let timeoutResolved = false
        setTimeout(() => {
          expect(data.content.endsWith('<script type="module" src="/main.js"></script>')).toBe(true)
          timeoutResolved = true
        }, 5)

        expect(timeoutResolved).toBe(false)
        await streamEnd
        expect(timeoutResolved).toBe(true)

        try {
          await injectToStream('someChunk')
          expect(1).toBe(2)
        } catch (err) {
          expect(err.message).include('Cannot inject the following chunk because the stream has already ended')
        }

        //  Begin:
        //  ```html
        //  <h1>Welcome</h1>This page is:<ul>'
        //  ```
        //
        //  // Suspense fallback for LazyComponent
        //  ```html
        //  <li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li>
        //  ```
        //
        //  ```html
        //  <li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li>
        //  ```
        //
        //  // Suspense fallback for ErrorOnServer (client-only component)
        //  ```html
        //  <li><!--$!--><template data-msg="..." data-stck="..."></template><p>loading on server</p><!--/$--></li>
        //  ```
        //
        //  ```html
        //  </ul>
        //  ```
        //
        //  // Injection:
        //  ```html
        //  <script type="module" src="/main.js"></script>
        //  ```
        //
        //  // Injection useAsync()
        //  ```html
        //  <script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script>
        //  ```
        //
        //  // Suspense resolving LazyComponent
        //  ```html
        //  <div hidden id="S:0"><p>Hello, I was lazy.</p></div><script><!--...--></script>
        //  ```
        expect(data.content).toContain('<h1>Welcome</h1>This page is:<ul>')
        expect(data.content).toContain('<!--$?--><template id="B:0"></template><p>Loading...</p><!--/$-->')
        expect(data.content).toContain('<li>Rendered to HTML.</li>')
        expect(data.content).toContain('<li>Interactive. <button type="button">Counter <!-- -->0</button></li>')
        expect(data.content).toContain('<script type="module" src="/main.js"></script>')
        expect(data.content).toContain(
          '<script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script>',
        )
        expect(data.content).toContain('<div hidden id="S:0"><p>Hello, I was lazy.</p></div>')
        expect(data.content).toContain('$RC("B:0","S:0")')
        // ErrorOnServer component should render fallback on server
        expect(data.content).toContain('<p>loading on server</p>')
        expect(data.content).toContain('Only renders on client')
      })
    })
  })
})
