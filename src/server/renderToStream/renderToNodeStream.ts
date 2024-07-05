export { renderToNodeStream }

import React from 'react'
// @ts-expect-error types export missing
import { renderToPipeableStream as renderToPipeableStream_ } from 'react-dom/server.node'
import type { renderToPipeableStream as renderToPipeableStream__ } from 'react-dom/server'
import { createPipeWrapper } from './createPipeWrapper'
import { afterReactBugCatch, assertReactImport, debugFlow, wrapStreamEnd } from './common'
import type { ClearTimeouts, SetAbortFn, StreamOptions } from '../renderToStream'
import type { DoNotClosePromise } from './orchestrateChunks'

async function renderToNodeStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    onBoundaryError?: (err: unknown) => void
    streamOptions?: StreamOptions
    renderToPipeableStream?: typeof renderToPipeableStream__
  },
  doNotClosePromise: DoNotClosePromise,
  setAbortFn: SetAbortFn,
  clearTimeouts: ClearTimeouts,
) {
  debugFlow('creating Node.js Stream Pipe')

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
    debugFlow('[react] onError() / onShellError()')
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
    options.renderToPipeableStream ?? (renderToPipeableStream_ as typeof renderToPipeableStream__)
  if (!options.renderToPipeableStream) {
    assertReactImport(renderToPipeableStream, 'renderToPipeableStream')
  }
  const { pipe: pipeOriginal, abort } = renderToPipeableStream(element, {
    ...options.streamOptions,
    onShellReady() {
      debugFlow('[react] onShellReady()')
      onShellReady()
    },
    onAllReady() {
      debugFlow('[react] onAllReady()')
      onShellReady()
      onAllReady()
    },
    onShellError: onError,
    onError,
  })
  setAbortFn(() => {
    abort()
  })
  let promiseResolved = false
  const onReactBug = (err: unknown) => {
    debugFlow('react bug')
    didError = true
    firstErr ??= err
    reactBug = err
    // Only log if it wasn't used as rejection for `await renderToStream()`
    if (reactBug !== firstErr || promiseResolved) {
      console.error(reactBug)
    }
  }
  const { pipeForUser, injectToStream, streamEnd, hasStreamEnded } = await createPipeWrapper(
    pipeOriginal,
    onReactBug,
    clearTimeouts,
    doNotClosePromise,
  )
  await shellReady
  if (didError) throw firstErr
  if (disable) await allReady
  if (didError) throw firstErr
  promiseResolved = true
  return {
    pipe: pipeForUser,
    abort,
    readable: null,
    streamEnd: wrapStreamEnd(streamEnd, didError),
    injectToStream,
    hasStreamEnded,
  }
}
