export { renderToNodeStream }

import React from 'react'
import type { renderToPipeableStream as RenderToPipeableStream } from 'react-dom/server'
import { createPipeWrapper } from './createPipeWrapper'
import import_ from '@brillout/import'
import { afterReactBugCatch, assertReactImport, debugFlow, wrapStreamEnd } from './misc'

async function renderToNodeStream(
  element: React.ReactNode,
  disable: boolean,
  options: {
    debug?: boolean
    onBoundaryError?: (err: unknown) => void
    renderToPipeableStream?: typeof RenderToPipeableStream
  }
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
    options.renderToPipeableStream ??
    // We don't directly use import() because it shouldn't be bundled for Cloudflare Workers: the module react-dom/server.node contains a require('stream') which fails on Cloudflare Workers
    ((await import_('react-dom/server.node')).renderToPipeableStream as typeof RenderToPipeableStream)
  assertReactImport(renderToPipeableStream, 'renderToPipeableStream')
  const { pipe: pipeOriginal } = renderToPipeableStream(element, {
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
    onError
  })
  let promiseResolved = false
  const { pipeForUser, injectToStream, streamEnd } = await createPipeWrapper(pipeOriginal, {
    onReactBug(err) {
      debugFlow('react bug')
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
    pipe: pipeForUser,
    readable: null,
    streamEnd: wrapStreamEnd(streamEnd, didError),
    injectToStream
  }
}
