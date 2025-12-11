export { renderToNodeStream }

import React from 'react'
import { renderToPipeableStream as renderToPipeableStream_ } from 'react-dom/server.node'
import type { renderToPipeableStream as renderToPipeableStream__ } from 'react-dom/server'
import { createPipeWrapper } from './createPipeWrapper.js'
import { assertReactImport, debugFlow, wrapStreamEnd, handleErrors } from './common.js'
import type { ClearTimeouts, SetAbortFn, StreamOptions } from '../renderToStream.js'
import type { DoNotClosePromise } from './orchestrateChunks.js'

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

  const { state, onShellError, onBoundaryError, onReactBug } = handleErrors(options, () => promiseResolved)

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
    // @ts-expect-error Taking a leap of faith that `errorInfo` will eventually be passed to onShellError()
    // https://github.com/facebook/react/issues/35349
    onShellError(err: any, errorInfo: any) {
      onShellError(err, errorInfo)
      onShellReady()
    },
    onAllReady() {
      debugFlow('[react] onAllReady()')
      onShellReady()
      onAllReady()
    },
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
  if (state.didError) throw state.firstErr
  if (disable) await allReady
  if (state.didError) throw state.firstErr
  promiseResolved = true
  return {
    pipe: pipeForUser,
    abort,
    readable: null,
    streamEnd: wrapStreamEnd(streamEnd, state.didError),
    injectToStream,
    hasStreamEnded,
  }
}
