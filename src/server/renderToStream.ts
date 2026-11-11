export { renderToStream }
export { disable }
export { renderToNodeStream_set }
export { renderToWebStream_set }
export type { StreamReturnUtils }
export type { SetAbortFn }
export type { ClearTimeouts }
export type { RenderToStreamOptions }

import React from 'react'
import { version as reactDomVersion } from 'react-dom'
import type {
  RenderToPipeableStreamOptions,
  renderToReadableStream as RenderToReadableStream,
  RenderToReadableStreamOptions,
} from 'react-dom/server'
import { ReactStreamingProviderSuspenseData } from './useAsync/useSuspenseData.js'
import { StreamProvider } from './useStream.js'
import type { Pipe } from './renderToStream/createPipeWrapper.js'
import { resolveSeoStrategy, SeoStrategy } from './renderToStream/resolveSeoStrategy.js'
import { assert, assertUsage, getGlobalObject } from './utils.js'
import type { RenderToNodeStream } from './renderToStream/renderToNodeStream.js'
import type { RenderToWebStream } from './renderToStream/renderToWebStream.js'
import { debugFlow } from './renderToStream/common.js'
import type { InjectToStream } from './index.node-and-web.js'
import type { Chunk, DoNotClosePromise } from './renderToStream/orchestrateChunks.js'
const globalObject = getGlobalObject('renderToStream.ts', {
  renderToNodeStream: null as null | RenderToNodeStream,
  renderToWebStream: null as null | RenderToWebStream,
  renderToReadableStreamNode: null as null | typeof RenderToReadableStream,
})

assertReact()

export type StreamOptions =
  | Omit<RenderToPipeableStreamOptions, 'onShellReady' | 'onShellError' | 'onError' | 'onAllReady'>
  | Omit<RenderToReadableStreamOptions, 'onError' | 'signal'>

type RenderToStreamOptions = {
  webStream?: boolean
  disable?: boolean
  seoStrategy?: SeoStrategy
  userAgent?: string
  onBoundaryError?: (err: unknown) => void
  streamOptions?: StreamOptions
  timeout?: number | null
  onTimeout?: () => void
  signal?: AbortSignal
}
type StreamReturnMain =
  | {
      pipe: Pipe
      readable: null
    }
  | {
      pipe: null
      readable: ReadableStream
    }
type StreamReturnUtils = {
  injectToStream: InjectToStream
  hasStreamEnded: () => boolean
  streamEnd: Promise<boolean>
  doNotClose: () => () => void
}
type StreamReturn = StreamReturnMain &
  StreamReturnUtils & {
    disabled: boolean
    abort: () => void
  }

type AbortFn = () => void
type SetAbortFn = (abortFn: AbortFn) => void
type ClearTimeouts = () => void

const globalConfig: { disable: boolean } = ((globalThis as any).__react_streaming = (globalThis as any)
  .__react_streaming || {
  disable: false,
})
function disable() {
  globalConfig.disable = true
}

async function renderToStream(element: React.ReactNode, options: RenderToStreamOptions = {}): Promise<StreamReturn> {
  element = React.createElement(ReactStreamingProviderSuspenseData, null, element)

  const buffer: Chunk[] = []
  let injectToStream: InjectToStream = async (chunk) => {
    buffer.push(chunk)
  }

  const doNotClosePromise: DoNotClosePromise = { promise: null }
  let doNotCloseTimeout: NodeJS.Timeout | null = null
  const doNotClose = () => {
    let resolve: () => void
    doNotClosePromise.promise = new Promise((r) => (resolve = r))

    if (doNotCloseTimeout) clearTimeout(doNotCloseTimeout)
    doNotCloseTimeout = setTimeout(() => {
      assertUsage(
        false,
        'makeClosableAgain() not called after 10 seconds (`const makeClosableAgain = stream.doNotClose()`)',
      )
    }, 10 * 1000)

    const makeClosableAgain = () => {
      // TO-DO/eventually: add timeout to ensure makeClosableAgain() was called
      resolve!()
      clearTimeout(doNotCloseTimeout!)
    }
    return makeClosableAgain
  }

  let abortFn: AbortFn | undefined
  const setAbortFn: SetAbortFn = (fn) => {
    abortFn = fn
    if (options.signal?.aborted) abortFn()
  }
  const onSignalAbort = () => abortFn?.()
  options.signal?.addEventListener('abort', onSignalAbort)
  const streamTimeout = (() => {
    // User explicity opting out of timeout (the default value is `undefined` not `null`)
    if (options.timeout === null) return null
    return setTimeout(
      () => {
        assert(abortFn)
        abortFn()
        options.onTimeout?.()
      },
      (options.timeout ?? 20) * 1000,
    )
  })()

  const clearTimeouts: ClearTimeouts = () => {
    if (streamTimeout !== null) clearTimeout(streamTimeout)
    if (doNotCloseTimeout !== null) clearTimeout(doNotCloseTimeout)
    options.signal?.removeEventListener('abort', onSignalAbort)
  }

  let streamEndResolve!: (value: boolean) => void
  const streamEnd = new Promise<boolean>((resolve) => {
    streamEndResolve = resolve
  })
  let hasStreamEnded: undefined | (() => boolean)
  element = React.createElement(
    StreamProvider,
    {
      value: {
        injectToStream: (chunk, options) => injectToStream(chunk, options),
        hasStreamEnded: () => (!hasStreamEnded ? false : hasStreamEnded()),
        doNotClose,
        streamEnd,
      },
    },
    element,
  )

  const disable = globalConfig.disable || (options.disable ?? resolveSeoStrategy(options).disableStream)
  const webStream = options.webStream ?? !globalObject.renderToNodeStream
  debugFlow(`disable === ${disable} && webStream === ${webStream}`)

  // When streaming is disabled, React still outlines Suspense boundaries larger than `progressiveChunkSize` into out-of-order segments that require an inline `$RC` script to reveal — defeating `disable`'s purpose (bots/SEO, stream-to-string).
  // https://github.com/brillout/react-streaming/pull/59
  if (disable) {
    options = {
      ...options,
      streamOptions: {
        ...options.streamOptions,
        progressiveChunkSize: Number.MAX_SAFE_INTEGER,
      },
    }
  }

  let ret: StreamReturn
  const retCommon: Pick<StreamReturn, 'disabled' | 'doNotClose'> = { disabled: disable, doNotClose }
  try {
    if (!webStream) {
      ret = {
        ...retCommon,
        ...(await globalObject.renderToNodeStream!(
          element,
          disable,
          options,
          doNotClosePromise,
          setAbortFn,
          clearTimeouts,
        )),
      }
    } else {
      assert(globalObject.renderToWebStream)
      ret = {
        ...retCommon,
        ...(await globalObject.renderToWebStream(
          element,
          disable,
          options,
          doNotClosePromise,
          setAbortFn,
          clearTimeouts,
          globalObject.renderToReadableStreamNode,
        )),
      }
    }
  } catch (err) {
    clearTimeouts()
    throw err
  }

  injectToStream = ret.injectToStream
  buffer.forEach((chunk) => injectToStream(chunk))
  buffer.length = 0

  hasStreamEnded = ret.hasStreamEnded
  ret.streamEnd.then(streamEndResolve)
  // Properly handling rejection is complex, but luckily streamEnd never rejects
  // https://github.com/brillout/promise-forwarding
  ret.streamEnd.catch(() => assert(false)) // streamEnd never rejects

  debugFlow('promise `await renderToStream()` resolved')
  return ret
}

function renderToNodeStream_set(renderToNodeStream: RenderToNodeStream) {
  globalObject.renderToNodeStream = renderToNodeStream
}
function renderToWebStream_set(
  renderToWebStream: RenderToWebStream,
  renderToReadableStreamNode?: typeof RenderToReadableStream,
) {
  globalObject.renderToWebStream = renderToWebStream
  if (renderToReadableStreamNode) globalObject.renderToReadableStreamNode = renderToReadableStreamNode
}

// To debug wrong peer dependency loading:
//  - https://stackoverflow.com/questions/21056748/seriously-debugging-node-js-cannot-find-module-xyz-abcd
//  - https://stackoverflow.com/questions/59865584/how-to-invalidate-cached-require-resolve-results
function assertReact() {
  const versionMajor = parseInt(reactDomVersion.split('.')[0]!, 10)
  assertUsage(
    versionMajor >= 18,
    `\`react-dom@${reactDomVersion}\` was loaded, but react-streaming only works with React version 18 or greater.`,
  )
}
