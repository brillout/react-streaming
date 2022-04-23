export { renderToStream }

import React from 'react'
import { renderToPipeableStream, renderToReadableStream } from 'react-dom/server'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { assert, assertUsage, assertWarning } from './utils'
import type { Readable as ReadableType, Writable as WritableType } from 'stream'
import isBot from 'isbot-fast'

type Return = { pipe: null | Pipe; readable: null | ReadableStream; injectToStream: (chunk: string) => void }
type SeoStrategy = 'conservative' | 'google-speed'

async function renderToStream(
  element: React.ReactNode,
  options: {
    debug?: boolean
    webStream?: boolean
    disabled?: boolean
    seoStrategy?: SeoStrategy
    userAgent?: string
    renderToReadableStream?: typeof renderToReadableStream
  } = {}
): Promise<Return> {
  let reject!: (err: unknown) => void
  let resolve!: () => void
  let resolved = false
  const promise = new Promise<Return>((resolve_, reject_) => {
    resolve = () => {
      if (resolved) return
      resolved = true
      resolve_({ pipe, readable, injectToStream })
    }
    reject = (err: unknown) => {
      if (resolved) return
      resolved = true
      reject_(err)
    }
  })

  const seoStrategy: SeoStrategy = options.seoStrategy || 'conservative'
  const disabled =
    options.disabled ??
    (() => {
      if (!options.userAgent) {
        assertWarning(
          false,
          'Streaming disabled. Provide `options.userAgent` to enable streaming. (react-streaming needs the User Agent string in order to be able to disable streaming for bots, e.g. for Google Bot.)'
        )
        return true
      }
      // https://github.com/omrilotan/isbot
      // https://github.com/mahovich/isbot-fast
      // https://stackoverflow.com/questions/34647657/how-to-detect-web-crawlers-for-seo-using-express/68869738#68869738
      if (!isBot(options.userAgent)) {
        return false
      }
      const isGoogleBot = options.userAgent.toLowerCase().includes('googlebot')
      if (seoStrategy === 'google-speed' && isGoogleBot) {
        return false
      }
      return true
    })()
  // options.debug = true

  const onError = (err: unknown) => {
    reject(err)
  }

  const streamUtils = { injectToStream: (chunk: string) => injectToStream(chunk) }

  element = React.createElement(StreamProvider, { value: streamUtils }, element)
  element = React.createElement(SsrDataProvider, null, element)

  let pipe: null | Pipe = null
  let readable: null | ReadableStream = null
  let injectToStream: (chunk: string) => void

  if (!options.webStream) {
    const { pipe: pipeOriginal } = renderToPipeableStream(element, {
      onAllReady() {
        resolve()
      },
      onShellReady() {
        if (!disabled) {
          resolve()
        }
      },
      onShellError: onError,
      onError
    })

    const { pipeWrapper, injectToStream: injectToStream_ } = getPipeWrapper(pipeOriginal, options)
    pipe = pipeWrapper
    injectToStream = injectToStream_
    // TODO implement cheat on vps side
    ;(pipe as any).injectToStream = injectToStream
  } else {
    const readableOriginal = await (options.renderToReadableStream ?? renderToReadableStream)(element, {
      onError
    })
    if (disabled) {
      await readableOriginal.allReady
    }
    const { readableWrapper, injectToStream: injectToStream_ } = getReadableWrapper(readableOriginal, options)
    readable = readableWrapper
    injectToStream = injectToStream_
    resolve()
  }

  return promise
}

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

function getPipeWrapper(pipeOriginal: Pipe, options: { debug?: boolean } = {}) {
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

function getReadableWrapper(readableOriginal: ReadableStream, options: { debug?: boolean }) {
  const bufferParams: {
    debug: boolean
    writeChunk: null | ((_chunk: string) => void)
  } = {
    debug: !!options.debug,
    writeChunk: null
  }
  let controllerWrapper: ReadableStreamController<any>
  const readableWrapper = new ReadableStream({
    start(controller) {
      controllerWrapper = controller
      onReady()
    }
  })
  const { injectToStream, onBeforeWrite, onBeforeEnd } = createBuffer(bufferParams)
  return { readableWrapper, injectToStream }

  async function onReady() {
    const writeChunk = (bufferParams.writeChunk = (chunk: unknown) => {
      controllerWrapper.enqueue(encodeForWebStream(chunk))
    })

    const reader = readableOriginal.getReader()

    while (true) {
      let result: ReadableStreamDefaultReadResult<any>
      try {
        result = await reader.read()
      } catch (err) {
        controllerWrapper.close()
        throw err
      }
      const { value, done } = result
      if (done) {
        break
      }
      onBeforeWrite(value)
      writeChunk(value)
    }

    // Collect `injectToStream()` calls stuck in an async call
    setTimeout(() => {
      onBeforeEnd()
      controllerWrapper.close()
    }, 0)
  }
}

let encoder: TextEncoder
function encodeForWebStream(thing: unknown) {
  if (!encoder) {
    encoder = new TextEncoder()
  }
  if (typeof thing === 'string') {
    return encoder.encode(thing)
  }
  return thing
}
