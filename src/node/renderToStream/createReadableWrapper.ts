export { createReadableWrapper }

import { createBuffer } from './createBuffer'

// `readableFromReact` is the readable stream provided by React
// `readableForUser` is the readable stream we give to the user (the wrapper)
// Essentially: what React writes to `readableFromReact` is forwarded to `readableForUser`

function createReadableWrapper(readableFromReact: ReadableStream) {
  const bufferParams: {
    writeChunk: null | ((_chunk: string) => void)
  } = {
    writeChunk: null
  }
  let controllerOfUserStream: ReadableStreamController<any>
  let onEnded!: () => void
  const streamEnd = new Promise<void>((r) => {
    onEnded = () => r()
  })
  const readableForUser = new ReadableStream({
    start(controller) {
      controllerOfUserStream = controller
      onReady(onEnded)
    }
  })
  const { injectToStream, onBeforeWrite, onBeforeEnd } = createBuffer(bufferParams)
  return { readableForUser, streamEnd, injectToStream }

  async function onReady(onEnded: () => void) {
    const writeChunk = (bufferParams.writeChunk = (chunk: unknown) => {
      controllerOfUserStream.enqueue(encodeForWebStream(chunk))
    })

    const reader = readableFromReact.getReader()

    while (true) {
      let result: ReadableStreamDefaultReadResult<any>
      try {
        result = await reader.read()
      } catch (err) {
        controllerOfUserStream.close()
        throw err
      }
      const { value, done } = result
      if (done) {
        break
      }
      onBeforeWrite(value)
      writeChunk(value)
    }

    // Collect `injectToStream()` calls stuck in an async call
    setTimeout(() => {
      onBeforeEnd()
      controllerOfUserStream.close()
      onEnded()
    }, 0)
  }
}

let encoder: TextEncoder
function encodeForWebStream(thing: unknown) {
  if (!encoder) {
    encoder = new TextEncoder()
  }
  if (typeof thing === 'string') {
    return encoder.encode(thing)
  }
  return thing
}
