export { createPipeWrapper }
export { nodeStreamModuleIsAvailable }
export type { Pipe }

import type { Readable as ReadableType, Writable as WritableType } from 'stream'
import { createBuffer } from './createBuffer'

function createPipeWrapper(pipeOriginal: Pipe, { debug, onError }: { debug?: boolean; onError: (err: unknown) => void }) {
  const pipeWrapper = createPipeWrapper()
  const bufferParams: {
    debug?: boolean
    writeChunk: null | ((_chunk: string) => void)
  } = {
    debug,
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
        },
        // If we don't define `destroy()`, then Node.js will `process.exit()`
        destroy(err) {
          onError(err)
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
  const streamModule = loadStreamModule()
  const { Readable, Writable } = streamModule as StreamModule
  return { Readable, Writable }
}

function nodeStreamModuleIsAvailable(): boolean {
  const req = require // bypass static analysis of bundlers
  try {
    loadStreamModule()
    req('stream')
    return true
  } catch {
    return false
  }
}

function loadStreamModule() {
  const req = require // bypass static analysis of bundlers
  const streamModule = req('stream')
  return streamModule
}
