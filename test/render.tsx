export { render }

import { renderToStream } from '../src/renderToStream'
import { renderToReadableStream } from 'react-dom/server.browser'
import { Writable } from 'stream'
import { onConsoleError } from './onConsoleError'
import { assertUsage } from '../src/utils'

assertUsage(
  typeof ReadableStream !== 'undefined',
  'Cannot run test suite. Because Web Streams are not available. Use a Node.js version that supports Web Streams, such as Node.js 18.'
)

onConsoleError((arg) => {
  // https://github.com/facebook/react/pull/22797
  if (
    typeof arg === 'string' &&
    arg.startsWith(
      'Warning: Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.'
    )
  ) {
    return { suppress: true }
  }
})

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
