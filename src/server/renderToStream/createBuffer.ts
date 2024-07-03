export { createBuffer }
export type { InjectToStream }
export type { StreamOperations }
export type { Chunk }

import { assert, assertUsage, createDebugger, isPromise } from '../utils'

const debug = createDebugger('react-streaming:buffer')

// - According to sebmarkbage chunks should be injected "before React writes".
//   - https://github.com/reactwg/react-18/discussions/114#:~:text=Injecting%20Into%20the%20SSR%20Stream
//   - Indeed, chunks cannot be arbitrary injected between React chunks.
//   - It isn't clear what "before React writes" means. I interpret it like this: nothing should be injected between two React synchronous writes. My interpreted rule seems to be working so far.
//     - It's also the interpretation of the Apollo GraphQL team: https://github.com/apollographql/apollo-client-nextjs/issues/325#issuecomment-2205375796
// - Being able to pass a chunk promise to injectToStream() is required for integrating Apollo GraphQL, see:
//   - https://github.com/apollographql/apollo-client-nextjs/issues/325#issuecomment-2199664143
//   - https://github.com/brillout/react-streaming/issues/40
type InjectToStreamOptions = {
  flush?: boolean
  /* We used to have this option (https://github.com/brillout/react-streaming/commit/2f5bf270832a8a45f04af6821d709f590cc9cb7f) but it isn't needed anymore.
  tolerateStreamEnded?: boolean
  */
}
type Chunk = string | Promise<string> // A chunk doesn't have to be a string. Let's progressively add all expected types as users complain.
type InjectToStream = (chunk: Chunk, options?: InjectToStreamOptions) => Promise<void>

type StreamOperations = {
  operations: null | { writeChunk: (chunk: unknown) => void; flush: null | (() => void) }
}
function createBuffer(streamOperations: StreamOperations): {
  injectToStream: InjectToStream
  onReactWrite: (chunk: unknown) => Promise<void>
  onBeforeEnd: () => Promise<void>
  hasStreamEnded: () => boolean
} {
  const buffer: { chunk: Chunk; flush: undefined | boolean }[] = []
  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'

  // Needed to avoid React hydration mismatch.
  //  - There seem to always(?) be a hydration mismatch whenever something is injected before the first react write.
  //  - Reproduction: https://github.com/vikejs/vike/commit/45e4ffea06335ddbcf2826b0113be7f925617daa
  //  - Thus, we delay any write to the stream until react wrote its first chunk.
  let writePermission = false

  return { injectToStream, onReactWrite, onBeforeEnd, hasStreamEnded }

  async function injectToStream(chunk: Chunk, options?: InjectToStreamOptions) {
    if (debug.isEnabled) {
      debug('injectToStream()', getChunkAsString(chunk))
    }
    if (hasStreamEnded()) {
      assertUsage(
        false,
        `Cannot inject the following chunk because the stream has already ended. Either 1) don't inject chunks after the stream ends, or 2) use the hasStreamEnded() function. The chunk:\n${getChunkAsString(
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
    await flushBuffer()
  }

  async function onBeforeEnd() {
    writePermission = true // in case React didn't write anything
    await flushBuffer()
    assert(buffer.length === 0)
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
