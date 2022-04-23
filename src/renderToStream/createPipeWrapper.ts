export { createPipeWrapper }
export type { Pipe }

import type { Readable as ReadableType, Writable as WritableType } from 'stream'
import { createBuffer } from './createBuffer'

function createPipeWrapper(pipeOriginal: Pipe, options: { debug?: boolean } = {}) {
  const pipeWrapper = createPipeWrapper()
  const bufferParams: {
    debug: boolean
    writeChunk: null | ((_chunk: string) => void)
  } = {
    debug: !!options.debug,
    writeChunk: null
  }
  const { injectToStream, onBeforeWrite, onBeforeEnd } = createBuffer(bufferParams)
  return { pipeWrapper, injectToStream }

  function createPipeWrapper(): Pipe {
    const pipeWrapper: Pipe = (writable: WritableType) => {
      const { Writable } = loadStreamNodeModule()
      const writableProxy = new Writable({
        write(chunk: unknown, encoding, callback) {
          onBeforeWrite(chunk)
          writable.write(chunk, encoding, callback)
        },
        final(callback) {
          onBeforeEnd()
          writable.end()
          callback()
        }
      })
      bufferParams.writeChunk = (chunk: string) => {
        writable.write(chunk)
      }
      ;(writableProxy as any).flush = () => {
        if (typeof (writable as any).flush === 'function') {
          ;(writable as any).flush()
        }
      }
      pipeOriginal(writableProxy)
    }
    return pipeWrapper
  }
}

type Pipe = (writable: WritableType) => void
type StreamModule = {
  Readable: typeof ReadableType
  Writable: typeof WritableType
}

function loadStreamNodeModule(): StreamModule {
  const req = require // bypass static analysis of bundlers
  const streamModule = req('stream')
  const { Readable, Writable } = streamModule as StreamModule
  return { Readable, Writable }
}
