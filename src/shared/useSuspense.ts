export { useSuspense }
export type { Suspenses }
export type { Suspense }

import { hasDepsChanged, Deps } from './deps'
import { assert } from './utils'

type Suspenses = Record<string, Suspense>
type Suspense =
  | { state: 'pending'; promise: Promise<unknown>; deps: Deps }
  | { state: 'error'; err: unknown; deps: Deps }
  | { state: 'done'; value: unknown; deps: Deps }

function useSuspense<T>({
  key,
  deps,
  suspenses,
  resolver,
  resolverSync
}: {
  suspenses: Suspenses
  resolver: () => Promise<T>
  resolverSync?: () => null | { value: T; deps: Deps }
  key: string
  deps: Deps
}): T {
  let suspense = suspenses[key]

  // Sync
  if (!suspense && resolverSync) {
    const resolved = resolverSync()
    if (resolved) {
      const { value, deps } = resolved
      suspense = suspenses[key] = { state: 'done', value, deps }
    }
  }

  // Async
  if (!suspense || hasDepsChanged(deps, suspense.deps)) {
    let promise: Promise<T>
    try {
      promise = resolver()
      promise.then((value) => {
        suspense = suspenses[key] = { state: 'done', value, deps }
      })
      suspense = { state: 'pending', promise, deps }
    } catch (err) {
      suspense = { state: 'error', err, deps }
    }
    suspenses[key] = suspense
  }

  if (suspense.state === 'pending') {
    throw suspense.promise
  }
  if (suspense.state === 'error') {
    // Retry next time
    delete suspenses[key]
    const { err } = suspense
    // React swallows boundary errors
    console.error(err)
    throw err
  }
  if (suspense.state === 'done') {
    return suspense.value as T
  }
  assert(false)
}
