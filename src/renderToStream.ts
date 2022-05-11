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
  onBoundaryError?: (err: unknown) => void
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
  streamEnd: Promise<boolean>
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

  let result: Result
  if (!webStream) {
    result = await renderToNodeStream(element, disable, options)
  } else {
    result = await renderToWebStream(element, disable, options)
  }

  injectToStream = result.injectToStream

  return result
}

async function renderToNodeStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    debug?: boolean
    onBoundaryError?: (err: unknown) => void
    renderToReadableStream?: typeof renderToReadableStream
    renderToPipeableStream?: typeof renderToPipeableStream
  }
) {
  let onShellReady!: () => void
  const shellReady = new Promise<void>((r) => {
    onShellReady = () => r()
  })
  let didError = false
  let firstErr: unknown = null
  let reactBug: unknown = null
  const onError = (err: unknown) => {
    didError = true
    firstErr ??= err
    onShellReady()
    afterReactBugCatch(() => {
      if (err !== reactBug) { // Is not a React internal error (i.e. a React bug)
        options.onBoundaryError?.(err)
      }
    })
  }
  const renderToPipeableStream_ = options.renderToPipeableStream ?? renderToPipeableStream
  assertReactImport(renderToPipeableStream_, 'renderToPipeableStream')
  const { pipe: pipeOriginal } = renderToPipeableStream_(element, {
    onShellReady() {
      onShellReady()
    },
    onAllReady() {
      onShellReady()
    },
    onShellError: onError,
    onError
  })
  let promiseResolved = false
  const { pipeWrapper, injectToStream, streamEnd } = await createPipeWrapper(pipeOriginal, {
    debug: options.debug,
    onReactBug(err) {
      didError = true
      firstErr ??= err
      reactBug = err
      if (reactBug !== firstErr || promiseResolved) { // Only log if it wasn't used as rejection for `await renderToStream()`
        console.error(reactBug)
      }
    }
  })
  await shellReady
  if (didError) throw firstErr
  if (disable) await streamEnd
  if (didError) throw firstErr
  promiseResolved = true
  return {
    pipe: pipeWrapper,
    readable: null,
    streamEnd: wrapStreamEnd(streamEnd, didError),
    injectToStream
  }
}
async function renderToWebStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    debug?: boolean
    onBoundaryError?: (err: unknown) => void
    renderToReadableStream?: typeof renderToReadableStream
  }
) {
  let didError = false
  let firstErr: unknown = null
  let reactBug: unknown = null
  const onError = (err: unknown) => {
    didError = true
    firstErr = firstErr || err
    afterReactBugCatch(() => {
      if (err !== reactBug) { // Is not a React internal error (i.e. a React bug)
        options.onBoundaryError?.(err)
      }
    })
  }
  const renderToReadableStream_ = options.renderToReadableStream ?? renderToReadableStream
  assertReactImport(renderToReadableStream_, 'renderToReadableStream')
  const readableOriginal = await renderToReadableStream_(element, { onError })
  const { allReady } = readableOriginal
  let promiseResolved = false
  // Upon React internal errors (i.e. React bugs), React rejects `allReady`.
  // React doesn't reject `allReady` upon boundary errors.
  allReady.catch((err) => {
    didError = true
    firstErr = firstErr || err
    reactBug = err
    if (reactBug !== firstErr || promiseResolved) { // Only log if it wasn't used as rejection for `await renderToStream()`
      console.error(reactBug)
    }
  })
  if (didError) throw firstErr
  if (disable) await allReady
  if (didError) throw firstErr
  const { readableWrapper, streamEnd, injectToStream } = createReadableWrapper(readableOriginal, options)
  promiseResolved = true
  return {
    readable: readableWrapper,
    pipe: null,
    streamEnd: wrapStreamEnd(streamEnd, didError),
    injectToStream
  }
}

// Needed for the hacky solution to workaround https://github.com/facebook/react/issues/24536
function afterReactBugCatch(fn: Function) {
  setTimeout(() => {
    fn()
  }, 0)
}
function wrapStreamEnd(streamEnd: Promise<void>, didError: boolean): Promise<boolean> {
  return (
    streamEnd
      // Needed because of the `afterReactBugCatch()` hack above, otherwise `onBoundaryError` triggers after `streamEnd` resolved
      .then(() => new Promise<void>((r) => setTimeout(r, 0)))
      .then(() => !didError)
  )
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
