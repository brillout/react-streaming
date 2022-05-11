export { createPipeWrapper }
export type { Pipe }

import type { Writable as StreamNodeWritable } from 'stream'
import { createBuffer } from './createBuffer'
import { loadNodeStreamModule } from './loadNodeStreamModule'

type Pipe = (writable: StreamNodeWritable) => void

async function createPipeWrapper(
  pipeOriginal: Pipe,
  { debug, onFatalError }: { debug?: boolean; onFatalError: (err: unknown) => void }
) {
  const { Writable } = await loadNodeStreamModule()
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
    const pipeWrapper: Pipe = (writable: StreamNodeWritable) => {
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
        destroy(err) {
          onFatalError(err)
          writable.destroy(err ?? undefined)
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
