export { renderToNodeStream }

import React from 'react'
// @ts-expect-error types export missing
import { renderToPipeableStream as renderToPipeableStream_ } from 'react-dom/server.node'
import type { renderToPipeableStream as renderToPipeableStream__ } from 'react-dom/server'
import { createPipeWrapper } from './createPipeWrapper.js'
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

const isReactBug = '__@brillout/react-streaming__isReactBug'

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
  const onShellError = (err: unknown, errorInfo?: ErrorInfo) => {
    debugFlow('[react] onShellError()')
    err = getErrorWithComponentStack(err, errorInfo)
    didError = true
    firstErr ??= err
    onShellReady()
  }
  // We intentionally swallow boundary errors, see https://github.com/brillout/react-streaming#error-handling
  const onBoundaryError = (err: unknown, errorInfo?: ErrorInfo) => {
    debugFlow('[react] onError()')
    err = getErrorWithComponentStack(err, errorInfo)
    afterReactBugCatch(() => {
      // Is not a React internal error (i.e. a React bug)
      if ((err as Record<string, unknown>)[isReactBug]) return
      options.onBoundaryError?.(err)
    })
  }
  const onReactBug = (err: unknown) => {
    debugFlow('[react] React bug')
    didError = true
    firstErr ??= err
    ;(err as Record<string, unknown>)[isReactBug] = true
    // Only log if it wasn't used as rejection value for `await renderToStream()`
    if (err !== firstErr || promiseResolved) {
      console.error(err)
    }
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
    onShellError,
    onError: onBoundaryError,
  })
  setAbortFn(() => {
    abort()
  })
  let promiseResolved = false
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
