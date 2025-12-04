export { wrapStreamEnd }
export { assertReactImport }
export { debugFlow }
export { handleErrors }

import { toPosixPath } from '../../utils/path.js'
import { assert, assertUsage, createDebugger, getBetterError, isObject } from '../utils.js'

const debugFlow = createDebugger('react-streaming:flow')
const isReactBug = '__@brillout/react-streaming__isReactBug'

// Needed for the hacky solution to workaround https://github.com/facebook/react/issues/24536
function afterReactBugCatch(fn: Function) {
  setTimeout(() => {
    fn()
  }, 0)
}

function assertReactImport(fn: unknown, fnName: 'renderToPipeableStream' | 'renderToReadableStream') {
  assert(typeof fn === 'function')
  assertUsage(fn, `Couldn't import ${fnName}() from 'react-dom'`)
}

function wrapStreamEnd(streamEnd: Promise<void>, didError: boolean): Promise<boolean> {
  return (
    streamEnd
      // Needed because of the `afterReactBugCatch()` hack above, otherwise `onBoundaryError` triggers after `streamEnd` resolved
      .then(() => new Promise<void>((r) => setTimeout(r, 0)))
      .then(() => !didError)
  )
}

function handleErrors(
  options: {
    onBoundaryError?: (err: unknown) => void
  },
  isPromiseResolved: () => boolean,
) {
  const state = {
    didError: false,
    firstErr: null as unknown,
  }

  const onShellError = (err: unknown, errorInfo?: ErrorInfo) => {
    debugFlow('[react] onShellError()')
    err = getErrorWithComponentStack(err, errorInfo)
    state.didError = true
    state.firstErr ??= err
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
    state.didError = true
    state.firstErr ??= err
    ;(err as Record<string, unknown>)[isReactBug] = true
    // Only log if it wasn't used as rejection value for `await renderToStream()`
    if (err !== state.firstErr || isPromiseResolved()) {
      console.error(err)
    }
  }

  return {
    state,
    onShellError,
    onBoundaryError,
    onReactBug,
  }
}

// Inject componentStack to the error's stack trace
type ErrorInfo = { componentStack?: string }
function getErrorWithComponentStack(errorOriginal: unknown, errorInfo?: ErrorInfo) {
  if (!errorInfo?.componentStack || !isObject(errorOriginal)) return errorOriginal
  const errorStackLines = String(errorOriginal.stack).split('\n')

  // Inject the component stack right before the React stack trace (potentially *after* some vike-react or react-streaming strack trace, e.g. if react-streaming's useAsync() throws an error).
  const cutoff = errorStackLines.findIndex((l) => {
    l = toPosixPath(l)
    return l.includes('node_modules/react-dom/') || l.includes('node_modules/react/')
  })
  if (cutoff === -1) return errorOriginal

  const errorStackLinesBegin = errorStackLines.slice(0, cutoff)
  const errorStackLinesEnd = errorStackLines.slice(cutoff)
  const componentStackLines = errorInfo.componentStack.split('\n').filter(Boolean)
  if (componentStackLines[0] === errorStackLinesBegin.at(-1)) componentStackLines.shift()
  const stackEnhanced = [
    //
    ...errorStackLinesBegin,
    ...componentStackLines,
    ...errorStackLinesEnd,
  ].join('\n')

  const errorBetter = getBetterError(errorOriginal, { stack: stackEnhanced })
  return errorBetter
}
