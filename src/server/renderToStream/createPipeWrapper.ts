export { createPipeWrapper }
export type { Pipe }

import type { Writable as StreamNodeWritable } from 'stream'
import { createDebugger } from '../utils'
import { type DoNotClosePromise, orchestrateChunks, StreamOperations } from './orchestrateChunks'
const debug = createDebugger('react-streaming:createPipeWrapper')
import { Writable } from 'stream'
import type { ClearTimeouts } from '../renderToStream'

// `pipeFromReact` is the pipe provided by React.
// `pipeForUser` is the pipe we give to the user will (the wrapper).
// `writableFromUser` is the writable provided by the user (i.e. `pipeForUser(writableFromUser)`), for example a Express.js's `res` writable stream.
// `writableForReact` is the writable that React directly writes to (the wrapper).
// Essentially: what React writes to `writableForReact` is forwarded to `writableFromUser`.
// Note: with React, a Node.js stream is always a pipe.

type Pipe = (writable: StreamNodeWritable) => void

async function createPipeWrapper(
  pipeFromReact: Pipe,
  onReactBug: (err: unknown) => void,
  clearTimeouts: ClearTimeouts,
  doNotClosePromise: DoNotClosePromise,
) {
  const { pipeForUser, streamEnd } = createPipeForUser()
  const streamOperations: StreamOperations = {
    operations: null,
  }
  const { injectToStream, onReactWrite, onBeforeEnd, hasStreamEnded } = orchestrateChunks(
    streamOperations,
    doNotClosePromise,
  )
  return { pipeForUser, streamEnd, injectToStream, hasStreamEnded }

  function createPipeForUser(): { pipeForUser: Pipe; streamEnd: Promise<void> } {
    debug('createPipeForUser()')
    let onEnded!: () => void
    const streamEnd = new Promise<void>((r) => {
      onEnded = () => r()
    })
    const pipeForUser: Pipe = (writableFromUser: StreamNodeWritable) => {
      const writableForReact = new Writable({
        write(chunk: unknown, _encoding, callback) {
          debug('write')
          if (!writableFromUser.destroyed) {
            // We cannot await inside write() as we cannot make write() async because of Rule 1: https://github.com/brillout/react-streaming/tree/main/src#rule-1
            onReactWrite(chunk)
          } else {
            // - E.g. when the server closes the connection.
            // - Destroying twice is fine: https://github.com/brillout/react-streaming/pull/21#issuecomment-1554517163
            writableForReact.destroy()
          }
          callback()
        },
        async final(callback) {
          debug('final')
          clearTimeouts()
          await onBeforeEnd()
          writableFromUser.end()
          onEnded()
          callback()
        },
        destroy(err) {
          debug(`destroy (\`!!err === ${!!err}\`)`)
          clearTimeouts()
          // Upon React internal errors (i.e. React bugs), React destroys the stream.
          if (err) onReactBug(err)
          writableFromUser.destroy(err ?? undefined)
          onEnded()
        },
      })
      const flush = () => {
        if (typeof (writableFromUser as any).flush === 'function') {
          ;(writableFromUser as any).flush()
          debug('stream flushed (Node.js Writable)')
        }
      }
      streamOperations.operations = {
        flush,
        writeChunk(chunk: unknown) {
          writableFromUser.write(chunk)
        },
      }
      // Forward the flush() call. E.g. used by React to flush GZIP buffers, see https://github.com/brillout/vite-plugin-ssr/issues/466#issuecomment-1269601710
      ;(writableForReact as any).flush = flush
      pipeFromReact(writableForReact)
    }
    return { pipeForUser, streamEnd }
  }
}
