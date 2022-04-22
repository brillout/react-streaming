export { renderToStream }

import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { assert } from './utils'
import type { Readable as ReadableType, Writable as WritableType } from 'stream'

async function renderToStream(element: React.ReactNode) {
  let reject: (err: unknown) => void
  let resolve: () => void
  let resolved = false
  const promise = new Promise<{ pipe: Pipe }>((resolve_, reject_) => {
    resolve = () => {
      if (resolved) return
      resolved = true
      resolve_({ pipe: pipeWrapper })
    }
    reject = (err: unknown) => {
      if (resolved) return
      resolved = true
      reject_(err)
    }
  })

  // https://github.com/omrilotan/isbot
  // https://github.com/mahovich/isbot-fast
  // https://stackoverflow.com/questions/34647657/how-to-detect-web-crawlers-for-seo-using-express/68869738#68869738
  const isBot = false
  const seoStrategy: string = 'conservative'
  // const seoStrategy = 'speed'

  const onError = (err: unknown) => {
    reject(err)
  }

  const streamUtils = { injectToStream: (chunk: string) => injectToStream(chunk) }

  element = React.createElement(StreamProvider, { value: streamUtils }, element)
  element = React.createElement(SsrDataProvider, null, element)

  let { pipe } = renderToPipeableStream(element, {
    onAllReady() {
      resolve()
    },
    onShellReady() {
      if (!isBot || seoStrategy === 'speed') {
        resolve()
      }
    },
    onShellError: onError,
    onError
  })

  const { pipeWrapper, injectToStream } = getPipeWrapper(pipe)
  ;(pipeWrapper as any).injectToStream = injectToStream

  return promise
}

function getPipeWrapper(pipeOriginal: Pipe) {
  const { Writable } = loadStreamNodeModule()

  /*/
  const DEBUG_SEQUENCING = true
  /*/
  const DEBUG_SEQUENCING = false
  //*/
  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'
  let write: null | ((_chunk: string) => void) = null
  const buffer: string[] = []
  const pipeWrapper = createPipeWrapper()
  let writeUnlock: null | boolean = null // Set to `null` because React fails to hydrate if something is injected before the first react write

  return { pipeWrapper, injectToStream }

  function injectToStream(chunk: string) {
    DEBUG_SEQUENCING && console.log('injectToStream:', chunk)
    buffer.push(chunk)
    flushBuffer()
  }

  function flushBuffer() {
    if (!writeUnlock) {
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
      assert(write)
      write(chunk)
    })
    buffer.length = 0
  }

  function createPipeWrapper(): Pipe {
    const pipeWrapper: Pipe = (writable: WritableType) => {
      DEBUG_SEQUENCING && console.log('pipe() call')
      const writableProxy = new Writable({
        write(chunk: unknown, encoding, callback) {
          DEBUG_SEQUENCING && console.log('react write:', String(chunk))
          DEBUG_SEQUENCING && console.log('writeUnlock ===', writeUnlock)
          state = 'STREAMING'
          if (writeUnlock) {
            flushBuffer()
          }
          if (writeUnlock == true || writeUnlock === null) {
            writeUnlock = false
            DEBUG_SEQUENCING && console.log('writeUnlock =', writeUnlock)
            process.nextTick(() => {
              writeUnlock = true
              DEBUG_SEQUENCING && console.log('writeUnlock =', writeUnlock)
              flushBuffer()
            })
          }
          writable.write(chunk, encoding, callback)
        },
        final(callback) {
          writeUnlock = true
          DEBUG_SEQUENCING && console.log('writeUnlock =', writeUnlock)
          flushBuffer()
          assert(buffer.length === 0)
          state = 'ENDED'
          writable.end()
          callback()
        }
      })
      write = (chunk: string) => {
        writable.write(chunk)
      }
      ;(writableProxy as any).flush = () => {
        DEBUG_SEQUENCING && console.log('FLUSH')
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
