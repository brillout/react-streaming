export { createPipeWrapper }
export type { Pipe }

import type { Writable as StreamNodeWritable } from 'stream'
import { createDebugger } from '@brillout/debug'
import { createBuffer } from './createBuffer'
import { loadNodeStreamModule } from './loadNodeStreamModule'
const debug = createDebugger('react-streaming:createPipeWrapper')

// `pipeFromReact` is the pipe provided by React
// `pipeForUser` is the pipe we give to the user will (the wrapper)
// `writableFromUser` is the writable provided by the user (i.e. `pipeForUser(writableFromUser)`), for example a Express.js's `res` writable stream.
// `writableForReact` is the writable that React directly writes to.
// Essentially: what React writes to `writableForReact` is piped to `writableFromUser`

type Pipe = (writable: StreamNodeWritable) => void

async function createPipeWrapper(pipeFromReact: Pipe, { onReactBug }: { onReactBug: (err: unknown) => void }) {
  const { Writable } = await loadNodeStreamModule()
  const { pipeForUser, streamEnd } = createPipeForUser()
  const bufferParams: {
    writeChunk: null | ((_chunk: string) => void)
  } = {
    writeChunk: null
  }
  const { injectToStream, onBeforeWrite, onBeforeEnd } = createBuffer(bufferParams)
  return { pipeForUser, streamEnd, injectToStream }

  function createPipeForUser(): { pipeForUser: Pipe; streamEnd: Promise<void> } {
    debug('createPipeForUser()')
    let onEnded!: () => void
    const streamEnd = new Promise<void>((r) => {
      onEnded = () => r()
    })
    const pipeForUser: Pipe = (writableFromUser: StreamNodeWritable) => {
      const writableForReact = new Writable({
        write(chunk: unknown, encoding, callback) {
          debug('write')
          onBeforeWrite(chunk)
          writableFromUser.write(chunk, encoding, callback)
        },
        final(callback) {
          debug('final')
          onBeforeEnd()
          writableFromUser.end()
          onEnded()
          callback()
        },
        destroy(err) {
          debug(`destroy (\`!!err === ${!!err}\`)`)
          // Upon React internal errors (i.e. React bugs), React destroys the stream.
          if (err) onReactBug(err)
          writableFromUser.destroy(err ?? undefined)
          onEnded()
        }
      })
      bufferParams.writeChunk = (chunk: string) => {
        writableFromUser.write(chunk)
      }
      ;(writableForReact as any).flush = () => {
        if (typeof (writableFromUser as any).flush === 'function') {
          ;(writableFromUser as any).flush()
        }
      }
      pipeFromReact(writableForReact)
    }
    return { pipeForUser, streamEnd }
  }
}
