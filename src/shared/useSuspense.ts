export { useSuspense }
export type { Suspenses }
export type { Suspense }

import { assert, getGlobalVariable } from './utils'

type Suspenses = Record<
  string, // `suspenseId`
  Suspense
>

type SuspenseDone = { state: 'done'; value: unknown }
type SuspensePending = { state: 'pending'; promise: Promise<unknown> }
type SuspenseError = { state: 'error'; err: unknown }
type Suspense = SuspenseDone | SuspensePending | SuspenseError

// Workaround for React useId() bug
const workaroundCache = getGlobalVariable<
  Record<
    string, // `asyncKey`
    { suspense: Suspense; cacheTimeout: null | ReturnType<typeof setTimeout> }
  >
>('workaroundCache', {})

//*/
const DEBUG = false
/*/
const DEBUG = true
//*/

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
  DEBUG && console.log('=== useSuspense()')

  const suspenseId = getSuspenseId(asyncKey, elementId)
  DEBUG && console.log('suspenseId', suspenseId)
  let suspense = suspenses[suspenseId]
  DEBUG && console.log('suspense', suspense)

  // Sync
  if (!suspense && resolverSync) {
    const resolved = resolverSync()
    if (resolved) {
      const { value } = resolved
      suspense = suspenses[suspenseId] = { state: 'done', value }
      DEBUG && console.log('resolverSync()', suspense)
    }
  }

  // We need to use a cache to workaround [Bug: useId() not working inside <Suspense> #24669](https://github.com/facebook/react/issues/24669)
  if (!suspense && needsWorkaround) {
    const found = workaroundCache[asyncKey]
    if (found) {
      suspense = found.suspense
      DEBUG && console.log('from workaroundCache', suspense)
      if (suspense.state === 'done') {
        suspenses[suspenseId] = suspense // The `useId()` bug doesn't apply anymore (i.e. `useId()` is stable) after the <Suspense> boundary resolved => we can now use the `suspenses` object as usual
        if (found.cacheTimeout === null) {
          // We need to allow concurrent <Suspense> boundaries with the same key to piggy back on the resolved value. Otherwise only one boundary gets the value while the others re-trigger the data fetching (i.e. `resolver()` & `asyncFn()`).
          found.cacheTimeout = setTimeout(
            () => {
              found.cacheTimeout = null
              delete workaroundCache[asyncKey]
            },
            // Too low => concurrent <Suspense> boundaries with the same key may re-trigger data fetching upon heavy & slow rendering.
            // Too high => user navigating to another page and quickly going back will see cached data. (But we don't want our low-level `useAsync()` hook to be a cache: it should be higher-level wrapper hooks such as React Query that implement caching.)
            1000
          )
        }
      }
    }
  }

  // Async
  {
    const updateSuspense = (s: Suspense) => {
      suspense = s
      if (!needsWorkaround) {
        suspenses[suspenseId] = suspense
        return
      }
      {
        const found = workaroundCache[asyncKey]
        if (found?.cacheTimeout) {
          clearTimeout(found.cacheTimeout)
        }
      }
      workaroundCache[asyncKey] = {
        suspense,
        cacheTimeout: null
      }
    }
    if (!suspense) {
      let promise: Promise<T>
      try {
        promise = resolver()
        DEBUG && console.log('resolver()')
        promise.then((value) => {
          updateSuspense({ state: 'done', value })
          DEBUG && console.log('=== resolver() done', suspense)
        })
        updateSuspense({ state: 'pending', promise })
      } catch (err) {
        updateSuspense({ state: 'error', err })
      }
      assert(suspense)
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
