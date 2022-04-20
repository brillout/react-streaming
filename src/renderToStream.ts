export { renderToStream }

import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { Writable } from 'stream'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { assert } from './utils'
import type { Readable as ReadableType, Writable as WritableType } from 'stream'

async function renderToStream(element: React.ReactNode) {
  let reject: (err: unknown) => void
  let resolve: () => void
  let resolved = false
  const promise = new Promise<typeof pipeWrapper>((resolve_, reject_) => {
    resolve = () => {
      if (resolved) return
      resolved = true
      resolve_(pipeWrapper)
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

  const { pipeWrapper, injectToStream } = await getPipeWrapper(pipe)
  ;(pipeWrapper as any).injectToStream = injectToStream

  return promise
}

async function getPipeWrapper(pipeOriginal: (writable: Writable) => void) {
  const { Writable } = await loadStreamNodeModule()

  let state: 'UNSTARTED' | 'STREAMING' | 'ENDED' = 'UNSTARTED'
  let write: null | ((_chunk: string) => void) = null
  const buffer: string[] = []
  const pipeWrapper = createPipeWrapper()

  return { pipeWrapper, injectToStream }

  function injectToStream(chunk: string) {
    process.nextTick(() => {
      assert(state !== 'ENDED')
      // console.log('injectToStream', state)
      if (state === 'STREAMING') {
        flushBuffer()
        assert(write)
        write(chunk)
      } else if (state === 'UNSTARTED') {
        buffer.push(chunk)
      } else {
        assert(false)
      }
    })
  }

  function flushBuffer() {
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

  function createPipeWrapper() {
    const pipeWrapper = (writable: Writable) => {
      // console.log('pipe() call')
      const writableProxy = new Writable({
        write(chunk: unknown, encoding, callback) {
          // console.log('react write')
          state = 'STREAMING'
          flushBuffer()
          writable.write(chunk, encoding, callback)
        },
        final(callback) {
          flushBuffer()
          state = 'ENDED'
          writable.end()
          callback()
        }
      })
      write = (chunk: string) => {
        writable.write(chunk)
      }
      ;(writableProxy as any).flush = () => {
        flushBuffer()
        if (typeof (writable as any).flush === 'function') {
          ;(writable as any).flush()
        }
      }
      pipeOriginal(writableProxy)
    }
    return pipeWrapper
  }
}

async function loadStreamNodeModule(): Promise<{
  Readable: typeof ReadableType
  Writable: typeof WritableType
}> {
  const streamModule = await dynamicImport('stream')
  const { Readable, Writable } = streamModule as any
  return { Readable, Writable }
}

function dynamicImport(modulePath: string): Promise<Record<string, unknown>> {
  // bypass static analysis of bundlers
  return new Function('modulePath', 'return import(modulePath)')(modulePath)
}
