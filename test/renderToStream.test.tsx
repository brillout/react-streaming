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

        {
          const dataContent = [
            '<h1>Welcome</h1>This page is:<ul>',
            // Suspense fallback
            '<li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li>',
            '<li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li></ul>',
            // Injection
            '<script type="module" src="/main.js"></script>',
            // Injection useAsync()
            '<script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script>',
            // Suspense resolving
            '<div hidden id="S:0"><p>Hello, I was lazy.</p></div><script>function $RC(a,b){a=document.getElementById(a);b=document.getElementById(b);b.parentNode.removeChild(b);if(a){a=a.previousSibling;var f=a.parentNode,c=a.nextSibling,e=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d)if(0===e)break;else e--;else"$"!==d&&"$?"!==d&&"$!"!==d||e++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;b.firstChild;)f.insertBefore(b.firstChild,c);a.data="$";a._reactRetry&&a._reactRetry()}};$RC("B:0","S:0")</script>',
          ].join('')
          try {
            expect(data.content).toBe(dataContent)
          } catch (err) {
            console.log('=== expected ===\n', dataContent)
            console.log('=== actual ===\n', data.content)
            console.log()
            throw err
          }
        }
      })
    })
  })
})
