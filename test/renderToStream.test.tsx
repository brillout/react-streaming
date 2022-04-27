import { describe, expect, it } from 'vitest'
import React from 'react'
import { Page } from './Page'
import { assertUsage } from '../src/utils'
import { render } from './render'
import { onConsoleError } from './onConsoleError'

onConsoleError((errMsg) => {
  // https://github.com/facebook/react/pull/22797
  if( errMsg.includes('Warning: Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.') )
  return { suppress: true }
})

assertUsage(
  typeof ReadableStream !== 'undefined',
  'Cannot run test suite. Because Web Streams are not available. Use a Node.js version that supports Web Streams, such as Node.js 18.'
)

describe('renderToStream()', async () => {
  const testBasic = (streamType: 'node' | 'web') => {
    return async () => {
      const { data, endPromise } = await render(<div>hello</div>, { streamType })
      await endPromise
      expect(data.content).toBe('<div>hello</div>')
    }
  }
  it('basic - Node.js Stream', testBasic('node'))
  it('basic - Web Stream', testBasic('web'))

  const testInjectToStream = (streamType: 'node' | 'web') => {
    return async () => {
      const { data, endPromise, injectToStream } = await render(<>hi</>, { streamType })
      injectToStream('<script type="module" src="/main.js"></script>')
      await endPromise
      expect(data.content).toBe('hi<!-- --><script type="module" src="/main.js"></script>')
    }
  }
  it('injectToStream - basic - Node.js Stream', testInjectToStream('node'))
  it('injectToStream - basic - Web Stream', testInjectToStream('web'))

  const testUseAsync = (streamType: 'node' | 'web') => {
    return async () => {
      const { data, endPromise, injectToStream } = await render(<Page />, { streamType })
      injectToStream('<script type="module" src="/main.js"></script>')

      let timeoutResolved = false
      setTimeout(() => {
        expect(data.content.endsWith('<script type="module" src="/main.js"></script>')).toBe(true)
        timeoutResolved = true
      }, 5)

      expect(timeoutResolved).toBe(false)
      await endPromise
      expect(timeoutResolved).toBe(true)

      try {
        injectToStream('someChunk')
        expect(1).toBe(2)
      } catch (err) {
        expect(err.message).toBe(
          '[react-streaming][Wrong Usage] Cannot inject following chunk after stream has ended: `someChunk`'
        )
      }

      expect(data.content).toBe(
        [
          '<h1>Welcome</h1>This page is:<!-- --><ul>',
          // Suspense fallback
          '<li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li>',
          '<li>Rendered to HTML.</li><li>Interactive. <!-- --><button type="button">Counter <!-- -->0<!-- --></button></li></ul>',
          // Injection
          '<script type="module" src="/main.js"></script>',
          // Injection useAsync()
          '<script class="react-streaming_ssr-data" type="application/json">[{"key":":R7:","value":"Hello, I was lazy."}]</script>',
          // Suspense resolving
          '<div hidden id="S:0"><p>Hello, I was lazy.</p></div><script>function $RC(a,b){a=document.getElementById(a);b=document.getElementById(b);b.parentNode.removeChild(b);if(a){a=a.previousSibling;var f=a.parentNode,c=a.nextSibling,e=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d)if(0===e)break;else e--;else"$"!==d&&"$?"!==d&&"$!"!==d||e++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;b.firstChild;)f.insertBefore(b.firstChild,c);a.data="$";a._reactRetry&&a._reactRetry()}};$RC("B:0","S:0")</script>'
        ].join('')
      )
    }
  }
  it('injectToStream - useAsync() - Node.js Stream', testUseAsync('node'))
  it('injectToStream - useAsync() - Web Stream', testUseAsync('web'))
})
