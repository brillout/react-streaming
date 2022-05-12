export { createReadableWrapper }

import { createBuffer } from './createBuffer'

function createReadableWrapper(readableOriginal: ReadableStream) {
  const bufferParams: {
    writeChunk: null | ((_chunk: string) => void)
  } = {
    writeChunk: null
  }
  let controllerWrapper: ReadableStreamController<any>
  let onEnded!: () => void
  const streamEnd = new Promise<void>((r) => {
    onEnded = () => r()
  })
  const readableWrapper = new ReadableStream({
    start(controller) {
      controllerWrapper = controller
      onReady(onEnded)
    }
  })
  const { injectToStream, onBeforeWrite, onBeforeEnd } = createBuffer(bufferParams)
  return { readableWrapper, streamEnd, injectToStream }

  async function onReady(onEnded: () => void) {
    const writeChunk = (bufferParams.writeChunk = (chunk: unknown) => {
      controllerWrapper.enqueue(encodeForWebStream(chunk))
    })

    const reader = readableOriginal.getReader()

    while (true) {
      let result: ReadableStreamDefaultReadResult<any>
      try {
        result = await reader.read()
      } catch (err) {
        controllerWrapper.close()
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
      controllerWrapper.close()
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
