export { createBuffer }
export type { InjectToStream }
export type { StreamOperations }
export type { Chunk }
export type { DoNotClosePromise }

import { assert, assertUsage, createDebugger, isPromise } from '../utils'

const debug = createDebugger('react-streaming:buffer')

type InjectToStreamOptions = {
  flush?: boolean
  /* We used to have this option (https://github.com/brillout/react-streaming/commit/2f5bf270832a8a45f04af6821d709f590cc9cb7f) but it isn't needed anymore.
  tolerateStreamEnded?: boolean
  */
}
type Chunk = string | Promise<string> // A chunk doesn't have to be a string. Let's progressively add all expected types as users complain.
// General notes about how to inject to the stream: https://github.com/brillout/react-streaming/tree/main/src#readme
type InjectToStream = (chunk: Chunk, options?: InjectToStreamOptions) => Promise<void>

type StreamOperations = {
  operations: null | { writeChunk: (chunk: unknown) => void; flush: null | (() => void) }
}
type DoNotClosePromise = { promise: null | Promise<void> }
function createBuffer(
  streamOperations: StreamOperations,
  doNotClosePromise: DoNotClosePromise,
): {
  injectToStream: InjectToStream
  onReactWrite: (chunk: unknown) => Promise<void>
  onBeforeEnd: () => Promise<void>
  hasStreamEnded: () => boolean
} {
  const buffer: { chunk: Chunk; flush: undefined | boolean }[] = []
  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'

  // See Rule 2: https://github.com/brillout/react-streaming/tree/main/src#rule-2
  let writePermission = false

  return { injectToStream, onReactWrite, onBeforeEnd, hasStreamEnded }

  async function injectToStream(chunk: Chunk, options?: InjectToStreamOptions) {
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
    buffer.push({ chunk, flush: options?.flush })
    await flushBuffer()
  }

  async function flushBuffer() {
    if (!writePermission) {
      return
    }
    if (buffer.length === 0) {
      return
    }
    if (state !== 'STREAMING') {
      assert(state === 'UNSTARTED')
      return
    }
    let flushStream = false
    for (let { chunk, flush } of buffer) {
      assert(streamOperations.operations)
      const { writeChunk } = streamOperations.operations
      if (isPromise(chunk)) chunk = await chunk
      writeChunk(chunk)
      if (flush) flushStream = true
    }
    buffer.length = 0
    assert(streamOperations.operations)
    if (flushStream && streamOperations.operations.flush !== null) {
      streamOperations.operations.flush()
      debug('stream flushed')
    }
  }

  async function onReactWrite(chunk: unknown) {
    state === 'UNSTARTED' && debug('>>> START')
    if (debug.isEnabled) {
      debug('react write', getChunkAsString(chunk))
    }
    state = 'STREAMING'
    const bufferReactEntry = { chunk: chunk as any, flush: true }
    if (!writePermission) {
      buffer.unshift(bufferReactEntry)
    } else {
      buffer.push(bufferReactEntry)
    }
    writePermission = true
    await new Promise((resolve) => {
      // We delay flushing because of Rule 1: https://github.com/brillout/react-streaming/tree/main/src#rule-1
      setTimeout(() => {
        resolve(flushBuffer())
      }, 0)
    })
  }

  async function onBeforeEnd() {
    writePermission = true // in case React didn't write anything
    await flushBuffer()
    assert(buffer.length === 0)
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
