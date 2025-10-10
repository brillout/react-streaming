export { wrapStreamEnd }
export { assertReactImport }
export { getErrorEnhanced }
export { afterReactBugCatch }
export { debugFlow }
export type { ErrorInfo }

import { toPosixPath } from '../../utils/path'
import { assert, assertUsage, createDebugger, isObject } from '../utils'

const debugFlow = createDebugger('react-streaming:flow')

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

// Inject componentStack to the error's stack trace
type ErrorInfo = { componentStack?: string }
function getErrorEnhanced(errorOriginal: unknown, errorInfo?: ErrorInfo) {
  if (!errorInfo?.componentStack || !isObject(errorOriginal)) return errorOriginal
  const errorOriginalStackLines = String(errorOriginal.stack).split('\n')
  const cutoff = errorOriginalStackLines.findIndex((l) => {
    l = toPosixPath(l)
    return l.includes('node_modules/react-dom/') || l.includes('node_modules/react/')
  })
  if (cutoff === -1) return errorOriginal

  const errorOriginalStackLinesBegin = errorOriginalStackLines.slice(0, cutoff)
  const errorOriginalStackLinesEnd = errorOriginalStackLines.slice(cutoff)
  const componentStackLines = errorInfo.componentStack.split('\n').filter(Boolean)
  const stackEnhanced = [
    //
    ...errorOriginalStackLinesBegin,
    ...componentStackLines,
    ...errorOriginalStackLinesEnd,
  ].join('\n')
  const errorEnhanced = structuredClone(errorOriginal)
  errorEnhanced.stack = stackEnhanced

  // https://gist.github.com/brillout/066293a687ab7cf695e62ad867bc6a9c
  Object.defineProperty(errorEnhanced, 'getOriginalError', {
    value: () => errorOriginal,
    enumerable: true,
  })

  // Used by Vike
  // - https://github.com/vikejs/vike/blob/6d5ed71068a95e5a2a7c28647de460b833e4e185/packages/vike/node/runtime/logErrorServer.ts#L10-L14
  // - https://gist.github.com/brillout/066293a687ab7cf695e62ad867bc6a9c
  // - It doesn't seem to be needed? (The error Vike receives is already enhanced.) Should we remove this?
  Object.defineProperty(errorOriginal, 'getEnhancedError', {
    value: () => errorEnhanced,
    enumerable: true,
  })

  return errorEnhanced
}
