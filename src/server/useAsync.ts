export { useAsync }

import { useId } from 'react'
import { useStream } from './useStream.js'
import { assert } from './utils.js'
import { stringify } from '@brillout/json-serializer/stringify'
import { InitData, initDataHtmlClass } from '../shared/initData.js'
import { useSuspense } from '../shared/useSuspense.js'
import { assertKey, stringifyKey } from '../shared/key.js'
import { useSuspenseData } from './useAsync/useSuspenseData.js'
import type { StreamReturnUtils } from './renderToStream.js'

function useAsync<T>(keyValue: unknown, asyncFn: () => T): Awaited<T> {
  assertKey(keyValue)
  const key = stringifyKey(keyValue)
  const elementId = useId()

  const streamUtils = useStream()
  assert(streamUtils)

  const resolver = async () => {
    const value = await asyncFn()
    provideInitData(streamUtils, { key, value, elementId })
    return value
  }

  const suspenses = useSuspenseData()
  assert(suspenses)

  return useSuspense({ suspenses, resolver, key, elementId, asyncFnName: asyncFn.name })
}

// See consumer getInitData()
function provideInitData(streamUtils: StreamReturnUtils, initData: InitData) {
  const initDataSerialized = stringify(initData)
  const initDataInjection = `<script class="${initDataHtmlClass}" type="application/json">${initDataSerialized}</script>`
  streamUtils.injectToStream(initDataInjection)
}
