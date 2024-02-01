export { renderToStream }
export { disable }

import React from 'react'
import ReactDOMServer, { version as reactDomVersion } from 'react-dom/server'
import type {
  renderToPipeableStream as RenderToPipeableStream,
  renderToReadableStream as RenderToReadableStream
} from 'react-dom/server'
import { SuspenseData } from './useAsync/useSuspenseData'
import { StreamProvider } from './useStream'
import type { Pipe } from './renderToStream/createPipeWrapper'
import { resolveSeoStrategy, SeoStrategy } from './renderToStream/resolveSeoStrategy'
import { assert, assertUsage } from './utils'
import { nodeStreamModuleIsAvailable } from './renderToStream/loadNodeStreamModule'
import { renderToWebStream } from './renderToStream/renderToWebStream'
import { renderToNodeStream } from './renderToStream/renderToNodeStream'
import { debugFlow } from './renderToStream/misc'

assertReact()

type Options = {
  webStream?: boolean
  disable?: boolean
  seoStrategy?: SeoStrategy
  userAgent?: string
  onBoundaryError?: (err: unknown) => void
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
  disabled: boolean
  injectToStream: (chunk: unknown) => void
}

const globalConfig: { disable: boolean } = ((globalThis as any).__react_streaming = (globalThis as any)
  .__react_streaming || {
  disable: false
})
function disable() {
  globalConfig.disable = true
}

async function renderToStream(element: React.ReactNode, options: Options = {}): Promise<Result> {
  element = React.createElement(SuspenseData, null, element)
  let injectToStream: (chunk: unknown) => void = (chunk) => buffer.push(chunk)
  const buffer: unknown[] = []
  element = React.createElement(
    StreamProvider,
    {
      value: {
        injectToStream: (chunk: unknown) => {
          injectToStream(chunk)
        }
      }
    },
    element
  )

  const disable = globalConfig.disable || (options.disable ?? resolveSeoStrategy(options).disableStream)
  const webStream = options.webStream ?? !(await nodeStreamModuleIsAvailable())
  debugFlow(`disable === ${disable} && webStream === ${webStream}`)

  let result: Result
  const resultPartial: Pick<Result, 'disabled'> = { disabled: disable }
  if (!webStream) {
    result = { ...resultPartial, ...(await renderToNodeStream(element, disable, options)) }
  } else {
    result = { ...resultPartial, ...(await renderToWebStream(element, disable, options)) }
  }

  injectToStream = result.injectToStream
  buffer.forEach((chunk) => injectToStream(chunk))
  buffer.length = 0

  debugFlow('promise `await renderToStream()` resolved')
  return result
}

// To debug wrong peer dependency loading:
//  - https://stackoverflow.com/questions/21056748/seriously-debugging-node-js-cannot-find-module-xyz-abcd
//  - https://stackoverflow.com/questions/59865584/how-to-invalidate-cached-require-resolve-results
function assertReact() {
  const versionMajor = parseInt(reactDomVersion.split('.')[0]!, 10)
  assertUsage(
    versionMajor >= 18,
    `\`react-dom@${reactDomVersion}\` was loaded, but react-streaming only works with React version 18 or greater.`
  )
  assert(
    typeof ReactDOMServer.renderToPipeableStream === 'function' ||
      typeof ReactDOMServer.renderToReadableStream === 'function'
  )
}
