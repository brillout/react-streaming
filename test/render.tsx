export { render }

import { renderToStream } from '../src/server/index.node-and-web'
import { renderToReadableStream } from 'react-dom/server.browser'
import { Writable } from 'stream'
import { onConsoleError } from './onConsoleError'
import { assertUsage } from '../src/utils/assert'

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

async function render(
  element: React.ReactNode,
  {
    streamType,
    onBoundaryError,
    disable
  }: {
    streamType: 'web' | 'node'
    onBoundaryError?: (err: unknown) => void
    disable?: boolean
  }
) {
  const options = { userAgent, onBoundaryError, disable }
  if (streamType === 'node') {
    const { pipe, injectToStream, streamEnd } = await renderToStream(element, options)
    const { writable, data } = createWritable()
    pipe(writable)
    return { data, injectToStream, streamEnd }
  }
  if (streamType === 'web') {
    const { readable, injectToStream, streamEnd } = await renderToStream(element, {
      webStream: true,
      renderToReadableStream,
      ...options
    })
    const { writable, data } = createWebWritable()
    readable.pipeTo(writable)
    return { data, injectToStream, streamEnd }
  }
}

function createWritable() {
  const data = {
    content: ''
  }
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      data.content += chunk
      callback()
    }
  })
  return { writable, data }
}

function createWebWritable() {
  const data = {
    content: ''
  }
  const writable = new WritableStream({
    write(chunk) {
      chunk = decodeChunk(chunk)
      data.content += chunk
    }
  })
  return { writable, data }
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
