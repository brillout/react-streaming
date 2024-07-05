export { createBuffer }
export type { InjectToStream }
export type { StreamOperations }
export type { Chunk }
export type { DoNotClosePromise }

import { assert, assertUsage, createDebugger, isPromise } from '../utils'

const debug = createDebugger('react-streaming:buffer')

type InjectToStreamOptions = {
  flush?: boolean
}
type Chunk = string | Promise<string> // A chunk doesn't have to be a string. Let's progressively add all expected types as users complain.
// General notes about how to inject to the stream: https://github.com/brillout/react-streaming/tree/main/src#readme
type InjectToStream = (chunk: Chunk, options?: InjectToStreamOptions) => void

type StreamOperations = {
  operations: null | { writeChunk: (chunk: unknown) => void; flush: null | (() => void) }
}
type DoNotClosePromise = { promise: null | Promise<void> }
function createBuffer(
  streamOperations: StreamOperations,
  doNotClosePromise: DoNotClosePromise,
): {
  injectToStream: InjectToStream
  onReactWrite: (chunk: unknown) => void
  onBeforeEnd: () => Promise<void>
  hasStreamEnded: () => boolean
} {
  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'

  let userChunkPromise: null | Promise<void> = null

  // See Rule 2: https://github.com/brillout/react-streaming/tree/main/src#rule-2
  let onFirstReactWrite: () => void
  let firstReactWritePromise: Promise<void> | null = new Promise<void>((resolve) => {
    onFirstReactWrite = () => {
      if (firstReactWritePromise === null) return
      firstReactWritePromise = null
      resolve()
    }
  })
  let isFirstReactWrite = true

  return { injectToStream, onReactWrite, onBeforeEnd, hasStreamEnded }

  function injectToStream(chunk: Chunk, options?: InjectToStreamOptions) {
    if (debug.isEnabled) {
      debug('injectToStream()', getChunkAsString(chunk))
    }
    if (hasStreamEnded()) {
      assertUsage(
        false,
        `Cannot inject the following chunk because the stream has already ended. Consider using the doNotClose() and hasStreamEnded() utilities. The chunk:\n${getChunkAsString(
          chunk,
        )}`,
      )
    }
    const userChunkPromisePrevious = userChunkPromise
    userChunkPromise = (async () => {
      if (userChunkPromisePrevious) await userChunkPromisePrevious
      if (firstReactWritePromise !== null) await firstReactWritePromise
      if (isPromise(chunk)) chunk = await chunk
      writeChunk(chunk, options?.flush)
    })()
  }

  function writeChunk(chunk: unknown, flush?: boolean) {
    if (state !== 'STREAMING') {
      assert(state === 'UNSTARTED')
      return
    }
    assert(streamOperations.operations)
    streamOperations.operations.writeChunk(chunk)
    if (flush && streamOperations.operations.flush !== null) {
      streamOperations.operations.flush()
      debug('stream flushed')
    }
  }

  async function onReactWrite(chunk: unknown) {
    if (debug.isEnabled) {
      debug('react write', getChunkAsString(chunk))
    }

    const write = () => writeChunk(chunk, true)

    if (isFirstReactWrite) {
      isFirstReactWrite = false
      state = 'STREAMING'
      write()
      onFirstReactWrite()
    } else {
      assert(state === 'STREAMING')
      await userChunkPromise
      write()
    }
  }

  async function onBeforeEnd() {
    assert(state === 'UNSTARTED' || 'STREAMING')
    // In case React didn't write anything
    onFirstReactWrite()
    state = 'STREAMING'

    await userChunkPromise
    await doNotClosePromise.promise
    state = 'ENDED'
    debug('>>> END')
  }

  function hasStreamEnded() {
    return state === 'ENDED'
  }
}

function getChunkAsString(chunk: unknown): string {
  try {
    return new TextDecoder().decode(chunk as any)
  } catch (err) {
    return String(chunk)
  }
}
