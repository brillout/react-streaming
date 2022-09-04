export { useSuspense }
export type { Suspenses }
export type { Suspense }

import { assert } from './utils'

type Suspenses = Record<
  string, // `suspenseId`
  Suspense
>
type Suspense =
  | { state: 'pending'; promise: Promise<unknown> }
  | { state: 'error'; err: unknown }
  | { state: 'done'; value: unknown }

// We basically rename `suspenseId`
const brokenIds: Record<
  string, // `asyncKey`
  { suspenseId: string }
> = {}

function useSuspense<T>({
  asyncKey,
  elementId,
  suspenses,
  resolver,
  resolverSync,
  needsWorkaround
}: {
  asyncKey: string
  elementId: string
  suspenses: Suspenses
  resolver: () => Promise<T>
  needsWorkaround?: true
  resolverSync?: () => null | { value: T }
}): T {
  const suspenseId = getSuspenseId(asyncKey, elementId)
  let suspense = suspenses[suspenseId]

  {
    const broken = brokenIds[asyncKey]
    if (broken) {
      delete brokenIds[asyncKey]

      assert(!suspense) // If this assertion fails then we don't need the workarond around anymore. Hooray!
      suspense = suspenses[suspenseId] = suspenses[broken.suspenseId]!
      assert(suspense)
      assert(suspense.state === 'done')
      delete suspenses[broken.suspenseId]
    }
  }

  // Sync
  if (!suspense && resolverSync) {
    const resolved = resolverSync()
    if (resolved) {
      const { value } = resolved
      suspense = suspenses[suspenseId] = { state: 'done', value }
    }
  }

  // Async
  if (!suspense) {
    let promise: Promise<T>
    try {
      promise = resolver()
      promise.then((value) => {
        suspense = suspenses[suspenseId] = { state: 'done', value }
        if (needsWorkaround) {
          brokenIds[asyncKey] = { suspenseId }
        }
      })
      suspense = suspenses[suspenseId] = { state: 'pending', promise }
    } catch (err) {
      suspense = suspenses[suspenseId] = { state: 'error', err }
    }
  }

  if (suspense.state === 'pending') {
    throw suspense.promise
  }
  if (suspense.state === 'error') {
    // Retry next time
    delete suspenses[suspenseId]
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

function getSuspenseId(asyncKey: string, elementId: string) {
  assert(!elementId.includes('_'))
  return `${asyncKey}_${elementId}`
}
