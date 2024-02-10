export { renderToWebStream }

import React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import { createReadableWrapper } from './createReadableWrapper'
import { afterReactBugCatch, assertReactImport, debugFlow, wrapStreamEnd } from './misc'

async function renderToWebStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    debug?: boolean
    onBoundaryError?: (err: unknown) => void
    renderToReadableStream?: typeof RenderToReadableStream
  }
) {
  debugFlow('creating Web Stream Pipe')

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
    options.renderToReadableStream ??
    // We directly use import() because it needs to be bundled for Cloudflare Workers
    ((await import('react-dom/server.browser' as string)).renderToReadableStream as typeof RenderToReadableStream)
  if (!options.renderToReadableStream) {
    assertReactImport(renderToReadableStream, 'renderToReadableStream')
  }
  const readableOriginal = await renderToReadableStream(element, { onError })
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
  const { readableForUser, streamEnd, injectToStream } = createReadableWrapper(readableOriginal)
  promiseResolved = true
  return {
    readable: readableForUser,
    pipe: null,
    streamEnd: wrapStreamEnd(streamEnd, didError),
    injectToStream
  }
}
