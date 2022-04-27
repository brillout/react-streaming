export { render }

import { renderToStream } from '../src/renderToStream'
import { renderToReadableStream } from 'react-dom/server.browser'
import { Writable } from 'stream'

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
