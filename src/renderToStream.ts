export { renderToStream }

import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { assert, assertUsage } from './utils'
import type { Readable as ReadableType, Writable as WritableType } from 'stream'

async function renderToStream(element: React.ReactNode, options: { debug?: boolean } = {}) {
  let reject: (err: unknown) => void
  let resolve: () => void
  let resolved = false
  const promise = new Promise<{ pipe: Pipe; injectToStream: (chunk: string) => void }>((resolve_, reject_) => {
    resolve = () => {
      if (resolved) return
      resolved = true
      resolve_({ pipe: wrapper.pipeWrapper, injectToStream: wrapper.injectToStream })
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

  const streamUtils = { injectToStream: (chunk: string) => wrapper.injectToStream(chunk) }

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

  const wrapper = getPipeWrapper(pipe, options)
  ;(wrapper.pipeWrapper as any).injectToStream = wrapper.injectToStream

  return promise
}

function getPipeWrapper(pipeOriginal: Pipe, options: { debug?: boolean } = {}) {
  const { Writable } = loadStreamNodeModule()

  /*/
  const DEBUG = true
  /*/
  const DEBUG = !!options.debug
  //*/
  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'
  let write: null | ((_chunk: string) => void) = null
  const buffer: string[] = []
  const pipeWrapper = createPipeWrapper()
  let writePermission: null | boolean = null // Set to `null` because React fails to hydrate if something is injected before the first react write

  return { pipeWrapper, injectToStream }

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
      assert(write)
      write(chunk)
    })
    buffer.length = 0
  }

  function createPipeWrapper(): Pipe {
    const pipeWrapper: Pipe = (writable: WritableType) => {
      DEBUG && console.log('>>> pipe() call')
      const writableProxy = new Writable({
        write(chunk: unknown, encoding, callback) {
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
          writable.write(chunk, encoding, callback)
        },
        final(callback) {
          DEBUG && console.log('>>> final()')
          writePermission = true
          DEBUG && console.log('writePermission =', writePermission)
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
        DEBUG && console.log('>>> flush()')
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
