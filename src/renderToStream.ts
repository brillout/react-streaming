export { renderToStream }

import React from 'react'
import { renderToPipeableStream, renderToReadableStream, version as reactDomVersion } from 'react-dom/server'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { createPipeWrapper, Pipe } from './renderToStream/createPipeWrapper'
import { createReadableWrapper } from './renderToStream/createReadableWrapper'
import { resolveSeoStrategy, SeoStrategy } from './renderToStream/resolveSeoStrategy'
import { assert, assertUsage } from './utils'
import { nodeStreamModuleIsAvailable } from './renderToStream/loadNodeStreamModule'

assertReact()

type Options = {
  debug?: boolean
  webStream?: boolean
  disabled?: boolean
  seoStrategy?: SeoStrategy
  userAgent?: string
  renderToReadableStream?: typeof renderToReadableStream
  renderToPipeableStream?: typeof renderToPipeableStream
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
  const webStream = options.webStream ?? !(await nodeStreamModuleIsAvailable())
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
  options: {
    debug?: boolean
    renderToReadableStream?: typeof renderToReadableStream
    renderToPipeableStream?: typeof renderToPipeableStream
  }
) {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = () => r()
  })
  let didError = false
  let firstErr: unknown = null
  const onError = (err: unknown) => {
    didError = true
    firstErr = firstErr || err
    resolve()
  }
  const renderToPipeableStream_ = options.renderToPipeableStream ?? renderToPipeableStream
  assertReactImport(renderToPipeableStream_, 'renderToPipeableStream')
  const { pipe: pipeOriginal } = renderToPipeableStream_(element, {
    onAllReady() {
      resolve()
    },
    onShellReady() {
      if (!disabled) {
        resolve()
      }
    },
    onError,
    onShellError: onError
  })
  const { pipeWrapper, injectToStream } = await createPipeWrapper(pipeOriginal, {
    debug: options.debug,
    onError
  })
  await promise
  if (didError) {
    throw firstErr
  }
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
  let didError = false
  let firstErr: unknown = null
  const onError = (err: unknown) => {
    didError = true
    firstErr = firstErr || err
  }
  const renderToReadableStream_ = options.renderToReadableStream ?? renderToReadableStream
  assertReactImport(renderToReadableStream_, 'renderToReadableStream')
  const readableOriginal = await renderToReadableStream_(element, { onError })
  if (didError) {
    throw firstErr
  }
  if (disabled) {
    await readableOriginal.allReady
  }
  if (didError) {
    throw firstErr
  }
  const { readableWrapper, injectToStream } = createReadableWrapper(readableOriginal, options)
  return {
    readable: readableWrapper,
    pipe: null,
    injectToStream
  }
}

// To debug wrong peer dependency loading:
//  - https://stackoverflow.com/questions/21056748/seriously-debugging-node-js-cannot-find-module-xyz-abcd
//  - https://stackoverflow.com/questions/59865584/how-to-invalidate-cached-require-resolve-results
function assertReact() {
  const versionMajor = parseInt(reactDomVersion.split('.')[0], 10)
  assertUsage(
    versionMajor >= 18,
    `\`react-dom@${reactDomVersion}\` was loaded, but react-streaming only works with React version 18 or greater.`
  )
  assert(typeof renderToPipeableStream === 'function' || typeof renderToReadableStream === 'function')
}
function assertReactImport(fn: unknown, fnName: string) {
  assertUsage(
    fn,
    [
      'Your environment seems broken.',
      `(Could not import \`${fnName}\` from \`react-dom/server\`).`,
      'Create a new GitHub issue at https://github.com/brillout/react-streaming to discuss a solution.'
    ].join(' ')
  )
  assert(typeof fn === 'function')
}
