export { renderToWebStream }

import React from 'react'
// @ts-expect-error types export missing
import { renderToReadableStream as renderToReadableStream_ } from 'react-dom/server.browser'
import type { renderToReadableStream as renderToReadableStream__ } from 'react-dom/server'
import { createReadableWrapper } from './createReadableWrapper'
import { afterReactBugCatch, assertReactImport, debugFlow, wrapStreamEnd } from './common'
import type { ClearTimeouts, SetAbortFn, StreamOptions } from '../renderToStream'
import type { DoNotClosePromise } from './orchestrateChunks'

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

  const controller: AbortController = new AbortController()
  setAbortFn(() => {
    controller.abort()
  })

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
    options.renderToReadableStream ?? (renderToReadableStream_ as typeof renderToReadableStream__)
  if (!options.renderToReadableStream) {
    assertReactImport(renderToReadableStream, 'renderToReadableStream')
  }
  const readableOriginal = await renderToReadableStream(element, {
    onError,
    signal: controller.signal,
    ...options.streamOptions,
  })
  const { allReady } = readableOriginal
  let promiseResolved = false
  // Upon React internal errors (i.e. React bugs), React rejects `allReady`.
  // React doesn't reject `allReady` upon boundary errors.
  allReady.catch((err) => {
    debugFlow('react bug')
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
