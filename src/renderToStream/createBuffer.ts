export { createBuffer }

import { assert } from 'vitest'
import { assertUsage } from '../utils'

function createBuffer(bufferParams: { debug: boolean; writeChunk: null | ((_chunk: string) => void) }) {
  const DEBUG = !!bufferParams.debug
  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'
  const buffer: string[] = []
  let writePermission: null | boolean = null // Set to `null` because React fails to hydrate if something is injected before the first react write

  return { injectToStream, onBeforeWrite, onBeforeEnd }

  function onBeforeWrite(chunk: unknown) {
    DEBUG && state === 'UNSTARTED' && console.log('>>> START')
    DEBUG && console.log(`react write ${!writePermission ? '' : '(writePermission)'}:`, String(chunk))
    state = 'STREAMING'
    if (writePermission) {
      flushBuffer()
    }
    if (writePermission == true || writePermission === null) {
      writePermission = false
      DEBUG && console.log('writePermission =', writePermission)
      setTimeout(() => {
        DEBUG && console.log('>>> setTimeout()')
        writePermission = true
        DEBUG && console.log('writePermission =', writePermission)
        flushBuffer()
      })
    }
  }

  function onBeforeEnd() {
    writePermission = true
    DEBUG && console.log('writePermission =', writePermission)
    flushBuffer()
    assert(buffer.length === 0)
    state = 'ENDED'
    DEBUG && console.log('>>> END')
  }

  function injectToStream(chunk: string) {
    assertUsage(state !== 'ENDED', `Cannot inject following chunk after stream has ended: \`${chunk}\``)
    DEBUG && console.log('injectToStream:', chunk)
    buffer.push(chunk)
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
    buffer.forEach((chunk) => {
      const { writeChunk } = bufferParams
      assert(writeChunk)
      writeChunk(chunk)
    })
    buffer.length = 0
  }
}
