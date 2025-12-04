export { renderToWebStream }

import React from 'react'
import type { renderToReadableStream as renderToReadableStream__ } from 'react-dom/server'
import { createReadableWrapper } from './createReadableWrapper.js'
import {
  getErrorWithComponentStack,
  type ErrorInfo,
  afterReactBugCatch,
  assertReactImport,
  debugFlow,
  wrapStreamEnd,
} from './common.js'
import type { ClearTimeouts, SetAbortFn, StreamOptions } from '../renderToStream.js'
import type { DoNotClosePromise } from './orchestrateChunks.js'
import { version } from 'react-dom/server'
import { assert, assertVersion } from '../utils.js'

const isReactBug = '__@brillout/react-streaming__isReactBug'

async function renderToWebStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    onBoundaryError?: (err: unknown) => void
    streamOptions?: StreamOptions
    renderToReadableStream?: typeof renderToReadableStream__
  },
  doNotClosePromise: DoNotClosePromise,
  setAbortFn: SetAbortFn,
  clearTimeouts: ClearTimeouts,
) {
  debugFlow('creating Web Stream Pipe')

  // 'react-dom/server.edge' doesn't exist in React 18
  assertVersion('React', version, '19.0.0')
  // We import 'react-dom/server.edge' only if needed, because merely importing 'react-dom/server.browser' was preventing Node.js from exiting (e.g. after running Vike's prerender() API). But maybe that isn't the case with 'react-dom/server.edge' anymore?
  // - Reproduction: https://github.com/vikejs/vike/blob/a0d6777c84aee4c2e5bd0a0a585b18f7a87c8cac/test/playground/scripts/prerender.js
  // @ts-expect-error types export missing
  const moduleExports = await import('react-dom/server.edge')
  assert(moduleExports?.default?.renderToReadableStream, moduleExports)
  const renderToReadableStream_ = moduleExports.default.renderToReadableStream

  const controller: AbortController = new AbortController()
  setAbortFn(() => {
    controller.abort()
  })

  let didError = false
  let firstErr: unknown = null
  // We intentionally swallow boundary errors, see https://github.com/brillout/react-streaming#error-handling
  const onBoundaryError = (err: unknown, errorInfo?: ErrorInfo) => {
    err = getErrorWithComponentStack(err, errorInfo)
    afterReactBugCatch(() => {
      // Is not a React internal error (i.e. a React bug)
      if ((err as Record<string, unknown>)[isReactBug]) return
      options.onBoundaryError?.(err)
    })
  }
  const onReactBug = (err: unknown) => {
    debugFlow('react bug')
    didError = true
    firstErr ??= err
    ;(err as Record<string, unknown>)[isReactBug] = true
    // Only log if it wasn't used as rejection value for `await renderToStream()`
    if (err !== firstErr || promiseResolved) {
      console.error(err)
    }
  }

  const renderToReadableStream =
    options.renderToReadableStream ?? (renderToReadableStream_ as typeof renderToReadableStream__)
  if (!options.renderToReadableStream) {
    assertReactImport(renderToReadableStream, 'renderToReadableStream')
  }
  const readableOriginal = await renderToReadableStream(element, {
    onError: onBoundaryError,
    signal: controller.signal,
    ...options.streamOptions,
  })
  const { allReady } = readableOriginal
  let promiseResolved = false
  // Upon React internal errors (i.e. React bugs), React rejects `allReady`. React doesn't reject `allReady` upon boundary errors.
  allReady.catch(onReactBug)
  if (didError) throw firstErr
  if (disable) await allReady
  if (didError) throw firstErr
  const { readableForUser, streamEnd, injectToStream, hasStreamEnded } = createReadableWrapper(
    readableOriginal,
    clearTimeouts,
    doNotClosePromise,
  )
  promiseResolved = true
  return {
    readable: readableForUser,
    pipe: null,
    abort: controller.abort,
    streamEnd: wrapStreamEnd(streamEnd, didError),
    injectToStream,
    hasStreamEnded,
  }
}
