export { renderToWebStream }

import React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import { createReadableWrapper } from './createReadableWrapper.js'
import { assertReactImport, debugFlow, wrapStreamEnd, handleErrors } from './common.js'
import type { ClearTimeouts, SetAbortFn, StreamOptions } from '../renderToStream.js'
import type { DoNotClosePromise } from './orchestrateChunks.js'
import { version } from 'react-dom/server'
import { assert, assertVersion } from '../utils.js'

async function renderToWebStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    onBoundaryError?: (err: unknown) => void
    streamOptions?: StreamOptions
  },
  doNotClosePromise: DoNotClosePromise,
  setAbortFn: SetAbortFn,
  clearTimeouts: ClearTimeouts,
  renderToReadableStreamNode: null | typeof RenderToReadableStream,
) {
  debugFlow('creating Web Stream Pipe')

  const renderToReadableStream =
    // Set by the Node.js entry, so that Node.js Streams and Web Streams use the same React renderer: React doesn't support two renderers rendering the same context provider ("Detected multiple renderers concurrently rendering the same context provider")
    renderToReadableStreamNode ??
    // - Without the Node.js entry (e.g. Cloudflare Workers)
    // - Or with React 19.0 and 19.1, whose 'react-dom/server.node' doesn't have renderToReadableStream()
    (await loadEdgeBuild())

  const controller: AbortController = new AbortController()
  setAbortFn(() => {
    controller.abort()
  })

  const { state, onBoundaryError, onReactBug } = handleErrors(options, () => promiseResolved)

  assertReactImport(renderToReadableStream, 'renderToReadableStream')
  const readableOriginal = await renderToReadableStream(element, {
    onError: onBoundaryError,
    signal: controller.signal,
    ...options.streamOptions,
  })
  const { allReady } = readableOriginal
  let promiseResolved = false
  // Upon React internal errors (i.e. React bugs), React rejects `allReady`. React doesn't reject `allReady` upon boundary errors.
  allReady.catch(onReactBug)
  if (state.didError) throw state.firstErr
  if (disable) await allReady
  if (state.didError) throw state.firstErr
  const { readableForUser, streamEnd, injectToStream, hasStreamEnded } = createReadableWrapper(
    readableOriginal,
    clearTimeouts,
    doNotClosePromise,
  )
  promiseResolved = true
  return {
    readable: readableForUser,
    pipe: null,
    abort: () => controller.abort(),
    streamEnd: wrapStreamEnd(streamEnd, state.didError),
    injectToStream,
    hasStreamEnded,
  }
}

async function loadEdgeBuild() {
  // 'react-dom/server.edge' doesn't exist in React 18
  assertVersion('React', version, '19.0.0')
  // We import 'react-dom/server.edge' only if needed, because merely importing 'react-dom/server.browser' was preventing Node.js from exiting (e.g. after running Vike's prerender() API). But maybe that isn't the case with 'react-dom/server.edge' anymore?
  // - Reproduction: https://github.com/vikejs/vike/blob/a0d6777c84aee4c2e5bd0a0a585b18f7a87c8cac/test/playground/scripts/prerender.js
  const moduleExports = await import('react-dom/server.edge')
  assert(moduleExports?.default?.renderToReadableStream, moduleExports)
  return moduleExports.default.renderToReadableStream
}
