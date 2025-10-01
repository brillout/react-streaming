export { useSuspenseData }
export { ReactStreamingProviderSuspenseData }

import React, { useContext } from 'react'
import { Suspenses } from '../../shared/useSuspense'
import { getGlobalObject } from '../utils'

const globalObject = getGlobalObject('useSuspenseData.ts', {
  ctxSuspenses: React.createContext<Suspenses>(undefined as never),
})

function ReactStreamingProviderSuspenseData({ children }: { children: React.ReactNode }) {
  const suspenses: Suspenses = {}
  return React.createElement(globalObject.ctxSuspenses.Provider, { value: suspenses }, children)
}

function useSuspenseData() {
  const suspenses = useContext(globalObject.ctxSuspenses)
  return suspenses
}
