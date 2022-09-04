export { useAsync }

import { useId } from 'react'
import { StreamUtils, useStream } from './useStream'
import { assert } from './utils'
import { stringify } from '@brillout/json-s/stringify'
import { InitData, initDataHtmlClass } from '../shared/initData'
import { useSuspense } from '../shared/useSuspense'
import { assertKey, stringifyKey } from '../shared/key'
import { useSuspenseData } from './useAsync/useSuspenseData'

function useAsync<T>(key: unknown, asyncFn: () => Promise<T>): T {
  assertKey(key)
  const asyncKey = stringifyKey(key)
  const elementId = useId()

  const streamUtils = useStream()
  assert(streamUtils)

  const resolver = async () => {
    const value = await asyncFn()
    provideInitData(streamUtils, { asyncKey, value, elementId })
    return value
  }

  const suspenses = useSuspenseData()
  assert(suspenses)

  return useSuspense({ suspenses, resolver, asyncKey, elementId })
}

// See consumer `getInitData()`
function provideInitData(streamUtils: StreamUtils, initData: InitData) {
  const initDataSerialized = stringify(initData)
  const initDataInjection = `<script class="${initDataHtmlClass}" type="application/json">${initDataSerialized}</script>`
  streamUtils.injectToStream(initDataInjection)
}
