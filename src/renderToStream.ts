export { renderToStream }
export { disable }

import React from 'react'
import ReactDOMServer, { version as reactDomVersion } from 'react-dom/server'
import type {
  renderToPipeableStream as RenderToPipeableStream,
  renderToReadableStream as RenderToReadableStream
} from 'react-dom/server'
import { SsrDataProvider } from './useSsrData'
import { StreamProvider } from './useStream'
import { createPipeWrapper, Pipe } from './renderToStream/createPipeWrapper'
import { createReadableWrapper } from './renderToStream/createReadableWrapper'
import { resolveSeoStrategy, SeoStrategy } from './renderToStream/resolveSeoStrategy'
import { assert, assertUsage, createDebugger } from './utils'
import { nodeStreamModuleIsAvailable } from './renderToStream/loadNodeStreamModule'
const debug = createDebugger('react-streaming:flow')

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
  debug(`disable === ${disable} && webStream === ${webStream}`)

  let result: Result
  if (!webStream) {
    result = await renderToNodeStream(element, disable, options)
  } else {
    result = await renderToWebStream(element, disable, options)
  }

  injectToStream = result.injectToStream

  debug('promise `await renderToStream()` resolved')
  return result
}

async function renderToNodeStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    debug?: boolean
    onBoundaryError?: (err: unknown) => void
    renderToPipeableStream?: typeof RenderToPipeableStream
  }
) {
  debug('creating Node.js Stream Pipe')

  let onAllReady!: () => void
  const allReady = new Promise<void>((r) => {
    onAllReady = () => r()
  })
  let onShellReady!: () => void
  const shellReady = new Promise<void>((r) => {
    onShellReady = () => r()
  })

  let didError = false
  let firstErr: unknown = null
  let reactBug: unknown = null
  const onError = (err: unknown) => {
    debug('[react] onError() / onShellError()')
    didError = true
    firstErr ??= err
    onShellReady()
    afterReactBugCatch(() => {
      // Is not a React internal error (i.e. a React bug)
      if (err !== reactBug) {
        options.onBoundaryError?.(err)
      }
    })
  }
  const renderToPipeableStream =
    options.renderToPipeableStream ?? (await import('react-dom/server')).renderToPipeableStream
  assertReactImport(renderToPipeableStream, 'renderToPipeableStream')
  const { pipe: pipeOriginal } = renderToPipeableStream(element, {
    onShellReady() {
      debug('[react] onShellReady()')
      onShellReady()
    },
    onAllReady() {
      debug('[react] onAllReady()')
      onShellReady()
      onAllReady()
    },
    onShellError: onError,
    onError
  })
  let promiseResolved = false
  const { pipeWrapper, injectToStream, streamEnd } = await createPipeWrapper(pipeOriginal, {
    onReactBug(err) {
      debug('react bug')
      didError = true
      firstErr ??= err
      reactBug = err
      // Only log if it wasn't used as rejection for `await renderToStream()`
      if (reactBug !== firstErr || promiseResolved) {
        console.error(reactBug)
      }
    }
  })
  await shellReady
  if (didError) throw firstErr
  if (disable) await allReady
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
    renderToReadableStream?: typeof RenderToReadableStream
  }
) {
  debug('creating Web Stream Pipe')

  let didError = false
  let firstErr: unknown = null
  let reactBug: unknown = null
  const onError = (err: unknown) => {
    didError = true
    firstErr = firstErr || err
    afterReactBugCatch(() => {
      // Is not a React internal error (i.e. a React bug)
      if (err !== reactBug) {
        options.onBoundaryError?.(err)
      }
    })
  }
  const renderToReadableStream =
    options.renderToReadableStream ?? (await import('react-dom/server')).renderToReadableStream
  assertReactImport(renderToReadableStream, 'renderToReadableStream')
  const readableOriginal = await renderToReadableStream(element, { onError })
  const { allReady } = readableOriginal
  let promiseResolved = false
  // Upon React internal errors (i.e. React bugs), React rejects `allReady`.
  // React doesn't reject `allReady` upon boundary errors.
  allReady.catch((err) => {
    debug('react bug')
    didError = true
    firstErr = firstErr || err
    reactBug = err
    // Only log if it wasn't used as rejection for `await renderToStream()`
    if (reactBug !== firstErr || promiseResolved) {
      console.error(reactBug)
    }
  })
  if (didError) throw firstErr
  if (disable) await allReady
  if (didError) throw firstErr
  const { readableWrapper, streamEnd, injectToStream } = createReadableWrapper(readableOriginal)
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
  assert(
    typeof ReactDOMServer.renderToPipeableStream === 'function' ||
      typeof ReactDOMServer.renderToReadableStream === 'function'
  )
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
