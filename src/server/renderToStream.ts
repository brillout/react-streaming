export { renderToStream }
export { disable }
export { renderToNodeStream_set }
export { renderToWebStream_set }

import React from 'react'
import ReactDOMServer, { version as reactDomVersion } from 'react-dom/server'
import type {
  renderToPipeableStream as RenderToPipeableStream,
  RenderToPipeableStreamOptions,
  renderToReadableStream as RenderToReadableStream,
  RenderToReadableStreamOptions,
} from 'react-dom/server'
import { SuspenseData } from './useAsync/useSuspenseData'
import { StreamProvider } from './useStream'
import type { Pipe } from './renderToStream/createPipeWrapper'
import { resolveSeoStrategy, SeoStrategy } from './renderToStream/resolveSeoStrategy'
import { assert, assertUsage, getGlobalObject } from './utils'
import type { renderToNodeStream as renderToNodeStream_ } from './renderToStream/renderToNodeStream'
import type { renderToWebStream as renderToWebStream_ } from './renderToStream/renderToWebStream'
import { debugFlow } from './renderToStream/common'
import type { InjectToStream } from './index.node-and-web'
const globalObject = getGlobalObject('renderToStream.ts', {
  renderToNodeStream: null as null | typeof renderToNodeStream_,
  renderToWebStream: null as null | typeof renderToWebStream_,
})

assertReact()

export type StreamOptions =
  | Omit<RenderToPipeableStreamOptions, 'onShellReady' | 'onShellError' | 'onError' | 'onAllReady'>
  | Omit<RenderToReadableStreamOptions, 'onError' | 'signal'>

type Options = {
  webStream?: boolean
  disable?: boolean
  seoStrategy?: SeoStrategy
  userAgent?: string
  onBoundaryError?: (err: unknown) => void
  streamOptions?: StreamOptions
  timeout?: number | null
  onTimeout?: () => void
  // Are these two options still needed? I think we can now remove them.
  //  - options.renderToReadableStream used to be needed by https://github.com/brillout/react-streaming/blob/43941f65e84e88a05801a93723df0e38687df872/test/render.tsx#L51 but that isnt' the case anymore.
  //  - option.renderToPipeableStream was introduced by https://github.com/brillout/react-streaming/commit/9f0403d7b738e59ddc3dcaa27f0e3fd33a8f5895 but I don't remember why. Do we still it?
  //  - TODO: the options are now deprecated (see assert() below) => remove if no user complains
  renderToReadableStream?: typeof RenderToReadableStream
  renderToPipeableStream?: typeof RenderToPipeableStream
}
type Result = (
  | {
      pipe: Pipe
      readable: null
    }
  | {
      pipe: null
      readable: ReadableStream
    }
) & {
  streamEnd: Promise<boolean>
  hasStreamEnded: () => boolean
  disabled: boolean
  injectToStream: InjectToStream
  abort: () => void
}

const globalConfig: { disable: boolean } = ((globalThis as any).__react_streaming = (globalThis as any)
  .__react_streaming || {
  disable: false,
})
function disable() {
  globalConfig.disable = true
}

async function renderToStream(element: React.ReactNode, options: Options = {}): Promise<Result> {
  // Let's see if a user complains
  assertUsage(!options.renderToPipeableStream && !options.renderToReadableStream, 'using deprecated options')

  element = React.createElement(SuspenseData, null, element)
  let injectToStream: InjectToStream = (chunk) => {
    buffer.push(chunk)
    // I guess it's safe to assume that the chunk will successfully be injected
    return true
  }
  const buffer: unknown[] = []
  element = React.createElement(
    StreamProvider,
    { value: { injectToStream: (chunk: unknown, options) => injectToStream(chunk, options) } },
    element,
  )

  const disable = globalConfig.disable || (options.disable ?? resolveSeoStrategy(options).disableStream)
  const webStream = options.webStream ?? !globalObject.renderToNodeStream
  debugFlow(`disable === ${disable} && webStream === ${webStream}`)

  let result: Result
  const resultPartial: Pick<Result, 'disabled'> = { disabled: disable }
  if (!webStream) {
    result = { ...resultPartial, ...(await globalObject.renderToNodeStream!(element, disable, options)) }
  } else {
    assert(globalObject.renderToWebStream)
    result = { ...resultPartial, ...(await globalObject.renderToWebStream(element, disable, options)) }
  }

  injectToStream = result.injectToStream
  buffer.forEach((chunk) => injectToStream(chunk))
  buffer.length = 0

  debugFlow('promise `await renderToStream()` resolved')
  return result
}

function renderToNodeStream_set(renderToNodeStream: typeof renderToNodeStream_) {
  globalObject.renderToNodeStream = renderToNodeStream
}
function renderToWebStream_set(renderToWebStream: typeof renderToWebStream_) {
  globalObject.renderToWebStream = renderToWebStream
}

// To debug wrong peer dependency loading:
//  - https://stackoverflow.com/questions/21056748/seriously-debugging-node-js-cannot-find-module-xyz-abcd
//  - https://stackoverflow.com/questions/59865584/how-to-invalidate-cached-require-resolve-results
function assertReact() {
  const versionMajor = parseInt(reactDomVersion.split('.')[0]!, 10)
  assertUsage(
    versionMajor >= 18,
    `\`react-dom@${reactDomVersion}\` was loaded, but react-streaming only works with React version 18 or greater.`,
  )
  assert(
    typeof ReactDOMServer.renderToPipeableStream === 'function' ||
      typeof ReactDOMServer.renderToReadableStream === 'function',
  )
}
