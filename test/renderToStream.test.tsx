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
        //  // Suspense fallback
        //  ```html
        //  <li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li>
        //  ```
        //
        //  ```html
        //  <li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li></ul>
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
        //  // Suspense resolving
        //  ```html
        //  <div hidden id="S:0"><p>Hello, I was lazy.</p></div><script><!--...--></script>
        //  ```
        expect(data.content).toMatchInlineSnapshot(
          `"<h1>Welcome</h1>This page is:<ul><li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li></ul><script type="module" src="/main.js"></script><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script><div hidden id="S:0"><p>Hello, I was lazy.</p></div><script>$RC=function(b,c,e){c=document.getElementById(c);c.parentNode.removeChild(c);var a=document.getElementById(b);if(a){b=a.previousSibling;if(e)b.data="$!",a.setAttribute("data-dgst",e);else{e=b.parentNode;a=b.nextSibling;var f=0;do{if(a&&8===a.nodeType){var d=a.data;if("/$"===d)if(0===f)break;else f--;else"$"!==d&&"$?"!==d&&"$!"!==d||f++}d=a.nextSibling;e.removeChild(a);a=d}while(a);for(;c.firstChild;)e.insertBefore(c.firstChild,a);b.data="$"}b._reactRetry&&b._reactRetry()}};$RC("B:0","S:0")</script>"`,
        )
      })
    })
  })
})
