export { wrapStreamEnd }
export { assertReactImport }
export { getErrorFixed }
export { afterReactBugCatch }
export { debugFlow }
export type { ErrorInfo }

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
function getErrorFixed(errorOriginal: unknown, errorInfo?: ErrorInfo) {
  if (!errorInfo?.componentStack || !isObject(errorOriginal)) return errorOriginal
  const errorOiginalStackLines = String(errorOriginal.stack).split('\n')
  const cutoff = errorOiginalStackLines.findIndex((l) => l.includes('node_modules') && l.includes('react'))
  if (cutoff === -1) return errorOriginal

  const stackFixed = [
    ...errorOiginalStackLines.slice(0, cutoff),
    ...errorInfo.componentStack.split('\n').filter(Boolean),
    ...errorOiginalStackLines.slice(cutoff),
  ].join('\n')
  const errorFixed = structuredClone(errorOriginal)
  errorFixed.stack = stackFixed

  // https://gist.github.com/brillout/066293a687ab7cf695e62ad867bc6a9c
  Object.defineProperty(errorFixed, 'getOriginalError', {
    value: () => errorOriginal,
    enumerable: true,
    configurable: false,
    writable: false,
  })

  // Used by Vike
  // - It doesn't seem to be needed? Can we remove this?
  Object.defineProperty(errorOriginal, 'getEnhancedError', {
    value: () => errorFixed,
    enumerable: true,
    configurable: false,
    writable: false,
  })

  return errorFixed
}
