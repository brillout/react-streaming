import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStream } from '../src/renderToStream'
import { Writable } from 'stream'
import { Page } from './Page'

describe('renderToStream()', async () => {
  it('basic', async () => {
    const { pipe } = await renderToStream(<div>hello</div>)
    const { writable, endPromise, data } = createWritable()
    pipe(writable)
    await endPromise
    expect(data.content).toBe('<div>hello</div>')
  })

  it('injectToStream - basic', async () => {
    const { pipe, injectToStream } = await renderToStream(<>hi</>)
    injectToStream('<script type="module" src="/main.js"></script>')
    const { writable, endPromise, data } = createWritable()
    pipe(writable)
    await endPromise
    expect(data.content).toBe('hi<!-- --><script type="module" src="/main.js"></script>')
  })

  it('injectToStream - useAsync()', async () => {
    const { pipe, injectToStream } = await renderToStream(<Page />)
    injectToStream('<script type="module" src="/main.js"></script>')
    const { writable, endPromise, data } = createWritable()
    pipe(writable)

    let timeoutResolved = false
    setTimeout(() => {
      expect(data.content.endsWith('<script type="module" src="/main.js"></script>')).toBe(true)
      timeoutResolved = true
    }, 10)

    expect(timeoutResolved).toBe(false)
    await endPromise
    expect(timeoutResolved).toBe(true)

    try {
      injectToStream('someChunk')
      expect(1).toBe(2)
    } catch(err) {
      expect(err.message).toBe("[react-streaming][Wrong Usage] Cannot inject following chunk after stream has ended: `someChunk`")
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
  })
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
