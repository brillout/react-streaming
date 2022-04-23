import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStream } from '../src/renderToStream'
import { renderToReadableStream } from 'react-dom/server.browser'
import { Writable } from 'stream'
import { Page } from './Page'
import { assertUsage } from '../src/utils'

// These warnings are expected:
// >
// > Warning: Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.
// >
// See https://github.com/facebook/react/pull/22797

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

function createWritable() {
  const data = {
    content: ''
  }
  let onEnded: () => void
  const endPromise = new Promise((r) => (onEnded = () => r(undefined)))
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      data.content += chunk
      callback()
    },
    final(callback) {
      onEnded()
      callback()
    }
  })
  return { writable, data, endPromise }
}

function createWebWritable() {
  const data = {
    content: ''
  }
  let onEnded: () => void
  const endPromise = new Promise((r) => (onEnded = () => r(undefined)))
  const writable = new WritableStream({
    write(chunk) {
      chunk = decodeChunk(chunk)
      data.content += chunk
    },
    close() {
      onEnded()
    }
  })
  return { writable, data, endPromise }
}

let decoder: TextDecoder
function decodeChunk(thing: any) {
  if (!decoder) {
    decoder = new TextDecoder()
  }
  if (typeof thing !== 'string') {
    return decoder.decode(thing)
  }
  return thing
}

const userAgent =
  'Mozilla/5.0 (X11; CrOS x86_64 14469.58.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.86 Safari/537.36'
async function render(element: React.ReactNode, { streamType }: { streamType: 'web' | 'node' }) {
  if (streamType === 'node') {
    const { pipe, injectToStream } = await renderToStream(element, { userAgent })
    const { writable, endPromise, data } = createWritable()
    pipe(writable)
    return { data, endPromise, injectToStream }
  }
  if (streamType === 'web') {
    const { readable, injectToStream } = await renderToStream(element, {
      webStream: true,
      renderToReadableStream,
      userAgent
    })
    const { writable, endPromise, data } = createWebWritable()
    readable.pipeTo(writable)
    return { data, endPromise, injectToStream }
  }
}
