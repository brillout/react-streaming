import { assert, assertUsage, createDebugger } from '../utils'

export const debugFlow = createDebugger('react-streaming:flow')

// Needed for the hacky solution to workaround https://github.com/facebook/react/issues/24536
export function afterReactBugCatch(fn: Function) {
  setTimeout(() => {
    fn()
  }, 0)
}

export function assertReactImport(fn: unknown, fnName: 'renderToPipeableStream' | 'renderToReadableStream') {
  assert(typeof fn === 'function')
  assertUsage(fn, `Couldn't import ${fnName}() from 'react-dom'`)
}

export function wrapStreamEnd(streamEnd: Promise<void>, didError: boolean): Promise<boolean> {
  return (
    streamEnd
      // Needed because of the `afterReactBugCatch()` hack above, otherwise `onBoundaryError` triggers after `streamEnd` resolved
      .then(() => new Promise<void>((r) => setTimeout(r, 0)))
      .then(() => !didError)
  )
}

export function startTimeout(
  abortFn: () => void,
  options: { timeout?: number | null; onTimeout?: () => void },
): undefined | (() => void) {
  let stopTimeout: undefined | (() => void)
  if (options.timeout !== null) {
    const t = setTimeout(
      () => {
        abortFn()
        options.onTimeout?.()
      },
      (options.timeout ?? 20) * 1000,
    )
    stopTimeout = () => {
      clearTimeout(t)
    }
  }
  return stopTimeout
}
