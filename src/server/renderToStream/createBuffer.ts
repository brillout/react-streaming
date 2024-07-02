export { createBuffer }
export type { InjectToStream }
export type { StreamOperations }
export type { Chunk }

import { assert, assertUsage, createDebugger } from '../utils'

const debug = createDebugger('react-streaming:buffer')

type InjectToStreamOptions = {
  flush?: boolean
  /* We used to have this option (https://github.com/brillout/react-streaming/commit/2f5bf270832a8a45f04af6821d709f590cc9cb7f) but it isn't needed anymore
  tolerateStreamEnded?: boolean
  */
}
// A chunk doesn't have to be a string: let's wait for users to complain and let's progressively add all expected types.
type Chunk = string
type InjectToStream = (chunk: Chunk, options?: InjectToStreamOptions) => void
type StreamOperations = {
  operations: null | { writeChunk: (chunk: unknown) => void; flush: null | (() => void) }
}

function createBuffer(streamOperations: StreamOperations): {
  injectToStream: InjectToStream
  onBeforeWrite: (chunk: unknown) => void
  onBeforeEnd: () => void
  hasStreamEnded: () => boolean
} {
  const buffer: { chunk: Chunk; flush: undefined | boolean }[] = []
  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'

  // Needed to avoid React hydration mismatch.
  //  - There seem to always(?) be a hydration mismatch whenever something is injected before the first react write.
  //  - Reproduction: https://github.com/vikejs/vike/commit/45e4ffea06335ddbcf2826b0113be7f925617daa
  //  - Thus, we delay any write to the stream until react wrote its first chunk.
  let writePermission: null | boolean = null

  return { injectToStream, onBeforeWrite, onBeforeEnd, hasStreamEnded }

  function injectToStream(chunk: Chunk, options?: InjectToStreamOptions) {
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
    flushBuffer()
  }

  function flushBuffer() {
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
    buffer.forEach((bufferEntry) => {
      assert(streamOperations.operations)
      const { writeChunk } = streamOperations.operations
      writeChunk(bufferEntry.chunk)
      if (bufferEntry.flush) {
        flushStream = true
      }
    })
    buffer.length = 0
    assert(streamOperations.operations)
    if (flushStream && streamOperations.operations.flush !== null) {
      streamOperations.operations.flush()
      debug('stream flushed')
    }
  }

  function onBeforeWrite(chunk: unknown) {
    state === 'UNSTARTED' && debug('>>> START')
    if (debug.isEnabled) {
      debug(`react write${!writePermission ? '' : ' (allowed)'}`, getChunkAsString(chunk))
    }
    state = 'STREAMING'
    if (writePermission) {
      flushBuffer()
    }
    if (writePermission === null) {
      writePermission = false
      debug('writePermission =', writePermission)
      setTimeout(() => {
        debug('>>> setTimeout()')
        writePermission = true
        debug('writePermission =', writePermission)
        flushBuffer()
      }, 0)
    }
  }

  function onBeforeEnd() {
    writePermission = true
    debug('writePermission =', writePermission)
    flushBuffer()
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
