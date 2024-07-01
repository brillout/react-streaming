export { createReadableWrapper }

import { createBuffer, StreamOperations } from './createBuffer'

// `readableFromReact` is the readable stream provided by React.
// `readableForUser` is the readable stream we give to the user (the wrapper).
// Essentially: what React writes to `readableFromReact` is forwarded to `readableForUser`.

function createReadableWrapper(readableFromReact: ReadableStream, { stopTimeout }: { stopTimeout?: () => void }) {
  const streamOperations: StreamOperations = {
    operations: null,
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
    },
  })
  const { injectToStream, onBeforeWrite, onBeforeEnd, hasStreamEnded } = createBuffer(streamOperations)
  return { readableForUser, streamEnd, injectToStream, hasStreamEnded }

  async function onReady(onEnded: () => void) {
    streamOperations.operations = {
      writeChunk(chunk) {
        controllerOfUserStream.enqueue(encodeForWebStream(chunk) as any)
      },
      flush: null,
    }

    const reader = readableFromReact.getReader()

    while (true) {
      let result: ReadableStreamReadResult<any>
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
      streamOperations.operations.writeChunk(value)
    }

    stopTimeout?.()

    // Collect injectToStream() calls stuck in an async call.
    // Workaround for: https://github.com/brillout/react-streaming/issues/40#issuecomment-2199424650
    // We should probably remove this workaround once we have a proper solution.
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
