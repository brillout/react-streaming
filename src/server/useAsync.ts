export { useAsync }
export { InitDataProvider }

import React, { useContext } from 'react'
import { StreamUtils, useStream } from './useStream'
import { assert } from './utils'
import { Deps } from '../shared/deps'
import { stringify } from '@brillout/json-s/stringify'
import { InitData, initDataHtmlClass } from '../shared/initData'
import { Suspenses, useSuspense } from '../shared/useSuspense'

const ctxSuspenses = React.createContext<Suspenses>(undefined as never)

function InitDataProvider({ children }: { children: React.ReactNode }) {
  const suspenses = {}
  return React.createElement(ctxSuspenses.Provider, { value: suspenses }, children)
}

function useAsync<T>(asyncFn: () => Promise<T>, key: string, deps: Deps = []): T {
  assert(deps)
  assert(key)

  const streamUtils = useStream()
  assert(streamUtils)

  const resolver = async () => {
    const value = await asyncFn()
    provideInitData(streamUtils, { key, value, deps })
    return value
  }

  const suspenses = useContext(ctxSuspenses)
  assert(suspenses)

  return useSuspense({ suspenses, resolver, key, deps })
}

// See consumer `getInitData()`
function provideInitData(streamUtils: StreamUtils, initData: InitData) {
  const initDataSerialized = `<script class="${initDataHtmlClass}" type="application/json">${stringify(
    initData
  )}</script>`
  streamUtils.injectToStream(initDataSerialized)
}
