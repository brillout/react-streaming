export { useAsync }

import { assert } from './utils'
import { parse } from '@brillout/json-s/parse'
import type { Deps } from '../shared/deps'
import { InitData, initDataHtmlClass } from '../shared/initData'
import { useSuspense, Suspenses } from '../shared/useSuspense'

const suspenses: Suspenses = {}

function useAsync<T>(asyncFn: () => Promise<T>, key: string, deps: Deps = []): T {
  assert(deps)
  assert(key)

  const resolver = async () => {
    const value = await asyncFn()
    return value
  }

  const resolverSync = () => {
    const initData = getInitData(key)
    if (initData) {
      const { deps, value } = initData
      return { deps, value: value as T }
    }
    return null
  }

  return useSuspense({ suspenses, resolver, resolverSync, key, deps })
}

// See provider `provideInitData()`
function getInitData(key: string): InitData | null {
  const elements = Array.from(window.document.querySelectorAll(`.${initDataHtmlClass}`))
  for (const elem of elements) {
    assert(elem.textContent)
    const initData = parse(elem.textContent) as InitData
    assert(typeof initData.key === 'string')
    if (initData.key === key) {
      return initData
    }
  }
  return null
}
