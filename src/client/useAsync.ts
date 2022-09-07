export { useAsync }

import { useId } from 'react'
import { assert, getGlobalVariable } from './utils'
import { parse } from '@brillout/json-serializer/parse'
import { InitData, initDataHtmlClass } from '../shared/initData'
import { useSuspense, Suspenses } from '../shared/useSuspense'
import { assertKey, stringifyKey } from '../shared/key'

const suspenses = getGlobalVariable<Suspenses>('suspenses', {})

function useAsync<T>(keyValue: unknown, asyncFn: () => T): Awaited<T> {
  assertKey(keyValue)
  const key = stringifyKey(keyValue)
  const elementId = useId()

  const resolver = async () => {
    const value = await asyncFn()
    return value
  }

  const resolverSync = () => {
    const initData = getInitData(key, elementId)
    if (initData) {
      const { value } = initData
      return { value: value as Awaited<T> }
    }
    return null
  }

  return useSuspense({
    suspenses,
    resolver,
    resolverSync,
    key,
    elementId,
    needsWorkaround: true,
    asyncFnName: asyncFn.name
  })
}

// See provider `provideInitData()`
function getInitData(key: string, elementId: string): InitData | null {
  const elements = Array.from(window.document.querySelectorAll(`.${initDataHtmlClass}`))
  for (const elem of elements) {
    assert(elem.textContent)
    const initData = parse(elem.textContent) as InitData
    assert(typeof initData.key === 'string')
    assert(typeof initData.elementId === 'string')
    if (initData.key === key && initData.elementId === elementId) {
      return initData
    }
  }
  return null
}
