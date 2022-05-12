export { createPipeWrapper }
export type { Pipe }

import type { Writable as StreamNodeWritable } from 'stream'
import { createDebugger } from '../utils'
import { createBuffer } from './createBuffer'
import { loadNodeStreamModule } from './loadNodeStreamModule'
const debug = createDebugger('react-streaming:createPipeWrapper')

type Pipe = (writable: StreamNodeWritable) => void

async function createPipeWrapper(pipeOriginal: Pipe, { onReactBug }: { onReactBug: (err: unknown) => void }) {
  const { Writable } = await loadNodeStreamModule()
  const { pipeWrapper, streamEnd } = createPipeWrapper()
  const bufferParams: {
    writeChunk: null | ((_chunk: string) => void)
  } = {
    writeChunk: null
  }
  const { injectToStream, onBeforeWrite, onBeforeEnd } = createBuffer(bufferParams)
  return { pipeWrapper, streamEnd, injectToStream }

  function createPipeWrapper(): { pipeWrapper: Pipe; streamEnd: Promise<void> } {
    debug('createPipeWrapper()')
    let onEnded!: () => void
    const streamEnd = new Promise<void>((r) => {
      onEnded = () => r()
    })
    const pipeWrapper: Pipe = (writableOriginal: StreamNodeWritable) => {
      const writableProxy = new Writable({
        write(chunk: unknown, encoding, callback) {
          debug('write')
          onBeforeWrite(chunk)
          writableOriginal.write(chunk, encoding, callback)
        },
        final(callback) {
          debug('final')
          onBeforeEnd()
          writableOriginal.end()
          onEnded()
          callback()
        },
        destroy(err) {
          debug(`destroy (\`!!err === ${!!err}\`)`)
          // Upon React internal errors (i.e. React bugs), React destroys the stream.
          if (err) onReactBug(err)
          writableOriginal.destroy(err ?? undefined)
          onEnded()
        }
      })
      bufferParams.writeChunk = (chunk: string) => {
        writableOriginal.write(chunk)
      }
      ;(writableProxy as any).flush = () => {
        if (typeof (writableOriginal as any).flush === 'function') {
          ;(writableOriginal as any).flush()
        }
      }
      pipeOriginal(writableProxy)
    }
    return { pipeWrapper, streamEnd }
  }
}
