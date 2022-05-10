export { renderToStream }
export { disable }

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
  disable?: boolean
  seoStrategy?: SeoStrategy
  userAgent?: string
  onError?: (err: unknown) => void
  renderToReadableStream?: typeof renderToReadableStream
  renderToPipeableStream?: typeof renderToPipeableStream
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
  allReady: Promise<void>
  injectToStream: (chunk: string) => void
}

const globalConfig: { disable: boolean } = ((globalThis as any).__react_streaming = (globalThis as any)
  .__react_streaming || {
  disable: false
})
function disable() {
  globalConfig.disable = true
}

async function renderToStream(element: React.ReactNode, options: Options = {}): Promise<Result> {
  element = React.createElement(SsrDataProvider, null, element)
  let injectToStream: (chunk: string) => void
  element = React.createElement(
    StreamProvider,
    { value: { injectToStream: (chunk: string) => injectToStream(chunk) } },
    element
  )

  const disable = globalConfig.disable || (options.disable ?? resolveSeoStrategy(options).disableStream)
  const webStream = options.webStream ?? !(await nodeStreamModuleIsAvailable())
  if (!webStream) {
    const result = await renderToNodeStream(element, disable, options)
    injectToStream = result.injectToStream
    return result
  } else {
    const result = await renderToWebStream(element, disable, options)
    injectToStream = result.injectToStream
    return result
  }
}

async function renderToNodeStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    debug?: boolean
    onError?: (err: unknown) => void
    renderToReadableStream?: typeof renderToReadableStream
    renderToPipeableStream?: typeof renderToPipeableStream
  }
) {
  let resolveShell!: () => void
  let resolveAll!: () => void
  let rejectAll!: (e: unknown) => void
  const shellReady = new Promise<void>((r) => {
    resolveShell = () => r()
  })
  const allReady = new Promise<void>((res, rej) => {
    resolveAll = () => res()
    rejectAll = (e) => rej(e)
  })
  let allReadyAvailable = false
  let didError = false
  let firstErr: unknown = null
  const onError = (err: unknown) => {
    didError = true
    firstErr ??= err
    resolveShell()
    options.onError?.(err)
  }
  const renderToPipeableStream_ = options.renderToPipeableStream ?? renderToPipeableStream
  assertReactImport(renderToPipeableStream_, 'renderToPipeableStream')
  const { pipe: pipeOriginal } = renderToPipeableStream_(element, {
    onShellReady() {
      if (!disable) {
        resolveShell()
      }
    },
    onAllReady() {
      resolveShell()
      resolveAll()
    },
    onShellError: (err) => {
      // We should catch this to prevent Node.js shutting down, since users can't catch this as it's not returned
      if (!allReadyAvailable) allReady.catch(() => {})
      onError(err)
    },
    onError,
  })
  const { pipeWrapper, injectToStream } = await createPipeWrapper(pipeOriginal, {
    debug: options.debug,
    // This only receives fatal errors
    onError: (fatalErr) => {
      options.onError?.(fatalErr)
      rejectAll(fatalErr)
    }
  })
  await shellReady
  if (didError) {
    throw firstErr
  }
  allReadyAvailable = true
  return {
    pipe: pipeWrapper,
    readable: null,
    allReady,
    injectToStream
  }
}
async function renderToWebStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    debug?: boolean
    onError?: (err: unknown) => void
    renderToReadableStream?: typeof renderToReadableStream
  }
) {
  let didError = false
  let firstErr: unknown = null
  const onError = (err: unknown) => {
    didError = true
    firstErr = firstErr || err
    options.onError?.(err)
  }
  const renderToReadableStream_ = options.renderToReadableStream ?? renderToReadableStream
  assertReactImport(renderToReadableStream_, 'renderToReadableStream')
  const readableOriginal = await renderToReadableStream_(element, { onError,  })
  const { allReady } = readableOriginal
  if (didError) {
    throw firstErr
  }
  if (disable) {
    await allReady
  }
  if (didError) {
    throw firstErr
  }
  const { readableWrapper, injectToStream } = createReadableWrapper(readableOriginal, options)
  return {
    readable: readableWrapper,
    pipe: null,
    allReady,
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
