export { useAsync }

import { useId } from 'react'
import { assert } from './utils'
import { parse } from '@brillout/json-s/parse'
import { InitData, initDataHtmlClass } from '../shared/initData'
import { useSuspense, Suspenses } from '../shared/useSuspense'
import { assertKey, stringifyKey } from '../shared/key'

const suspenses: Suspenses = {}

function useAsync<T>(key: unknown, asyncFn: () => Promise<T>): T {
  assertKey(key)
  const asyncKey = stringifyKey(key)
  const elementId = useId()

  const resolver = async () => {
    const value = await asyncFn()
    return value
  }

  const resolverSync = () => {
    const initData = getInitData(asyncKey, elementId)
    if (initData) {
      const { value } = initData
      return { value: value as T }
    }
    return null
  }

  return useSuspense({ suspenses, resolver, resolverSync, asyncKey, elementId, needsWorkaround: true })
}

// See provider `provideInitData()`
function getInitData(asyncKey: string, elementId: string): InitData | null {
  const elements = Array.from(window.document.querySelectorAll(`.${initDataHtmlClass}`))
  for (const elem of elements) {
    assert(elem.textContent)
    const initData = parse(elem.textContent) as InitData
    assert(typeof initData.asyncKey === 'string')
    assert(typeof initData.elementId === 'string')
    if (initData.asyncKey === asyncKey && initData.elementId === elementId) {
      return initData
    }
  }
  return null
}
