export { createReadableWrapper }

import { orchestrateChunks, type DoNotClosePromise, StreamOperations } from './orchestrateChunks'
import type { ClearTimeouts } from '../renderToStream'

// `readableFromReact` is the readable stream provided by React.
// `readableForUser` is the readable stream we give to the user (the wrapper).
// Essentially: what React writes to `readableFromReact` is forwarded to `readableForUser`.

function createReadableWrapper(
  readableFromReact: ReadableStream,
  clearTimeouts: ClearTimeouts,
  doNotClosePromise: DoNotClosePromise,
) {
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
  const { injectToStream, onReactWrite, onBeforeEnd, hasStreamEnded } = orchestrateChunks(
    streamOperations,
    doNotClosePromise,
  )
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
      // We cannot await inside this while-loop because of Rule 1: https://github.com/brillout/react-streaming/tree/main/src#rule-1
      onReactWrite(value)
    }

    clearTimeouts()

    await onBeforeEnd()
    controllerOfUserStream.close()
    onEnded()
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
