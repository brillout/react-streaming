export { wrapStreamEnd }
export { assertReactImport }
export { addPrettifyThisError }
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

type ErrorInfo = { componentStack?: string }
function addPrettifyThisError(err: unknown, errorInfo?: ErrorInfo) {
  if (isObject(err) && errorInfo?.componentStack) {
    Object.defineProperty(err, 'prettifyThisError', {
      enumerable: false,
      value: () => `${err.stack}\nThe above error occurred at:${errorInfo.componentStack}`,
      writable: true,
    })
  }
}
