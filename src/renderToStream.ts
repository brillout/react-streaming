export { renderToStream }

import React from 'react'
import { renderToPipeableStream, renderToReadableStream } from 'react-dom/server'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { assertWarning } from './utils'
import './shims.d'
import isBot from 'isbot-fast'
import { createPipeWrapper, nodeStreamModuleIsAvailable, Pipe } from './renderToStream/createPipeWrapper'
import { createReadableWrapper } from './renderToStream/createReadableWrapper'

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
  const webStream = options.webStream ?? !nodeStreamModuleIsAvailable()

  const onError = (err: unknown) => {
    reject(err)
  }

  const streamUtils = { injectToStream: (chunk: string) => injectToStream(chunk) }

  element = React.createElement(StreamProvider, { value: streamUtils }, element)
  element = React.createElement(SsrDataProvider, null, element)

  let pipe: null | Pipe = null
  let readable: null | ReadableStream = null
  let injectToStream: (chunk: string) => void

  if (!webStream) {
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

    const { pipeWrapper, injectToStream: injectToStream_ } = createPipeWrapper(pipeOriginal, options)
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
    const { readableWrapper, injectToStream: injectToStream_ } = createReadableWrapper(readableOriginal, options)
    readable = readableWrapper
    injectToStream = injectToStream_
    resolve()
  }

  return promise
}
