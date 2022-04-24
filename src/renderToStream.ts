export { renderToStream }

import React from 'react'
import { renderToPipeableStream, renderToReadableStream } from 'react-dom/server'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { createPipeWrapper, nodeStreamModuleIsAvailable, Pipe } from './renderToStream/createPipeWrapper'
import { createReadableWrapper } from './renderToStream/createReadableWrapper'
import { resolveSeoStrategy, SeoStrategy } from './renderToStream/resolveSeoStrategy'

type Options = {
  debug?: boolean
  webStream?: boolean
  disabled?: boolean
  seoStrategy?: SeoStrategy
  userAgent?: string
  renderToReadableStream?: typeof renderToReadableStream
}
type Result = {
  pipe: null | Pipe
  readable: null | ReadableStream
  injectToStream: (chunk: string) => void
}

async function renderToStream(element: React.ReactNode, options: Options = {}): Promise<Result> {
  element = React.createElement(SsrDataProvider, null, element)
  let injectToStream: (chunk: string) => void
  element = React.createElement(
    StreamProvider,
    { value: { injectToStream: (chunk: string) => injectToStream(chunk) } },
    element
  )

  const disabled = options.disabled ?? resolveSeoStrategy(options).disableStream
  const webStream = options.webStream ?? !nodeStreamModuleIsAvailable()
  if (!webStream) {
    const result = await renderToNodeStream(element, disabled, options)
    injectToStream = result.injectToStream
    return result
  } else {
    const result = await renderToWebStream(element, disabled, options)
    injectToStream = result.injectToStream
    return result
  }
}

async function renderToNodeStream(
  element: React.ReactNode,
  disabled: boolean,
  options: { renderToReadableStream?: typeof renderToReadableStream; debug?: boolean }
) {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = () => r()
  })
  const { pipe: pipeOriginal } = renderToPipeableStream(element, {
    onAllReady() {
      resolve()
    },
    onShellReady() {
      if (!disabled) {
        resolve()
      }
    }
  })
  const { pipeWrapper, injectToStream } = createPipeWrapper(pipeOriginal, options)
  await promise
  return {
    pipe: pipeWrapper,
    readable: null,
    injectToStream
  }
}
async function renderToWebStream(
  element: React.ReactNode,
  disabled: boolean,
  options: { renderToReadableStream?: typeof renderToReadableStream; debug?: boolean }
) {
  const readableOriginal = await (options.renderToReadableStream ?? renderToReadableStream)(element)
  if (disabled) {
    await readableOriginal.allReady
  }
  const { readableWrapper, injectToStream } = createReadableWrapper(readableOriginal, options)
  return {
    readable: readableWrapper,
    pipe: null,
    injectToStream
  }
}
