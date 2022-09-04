export { useSuspenseData }
export { SuspenseData }

import React, { createContext, useContext } from 'react'
import { Suspenses } from '../../shared/useSuspense'

const ctxSuspenses = createContext<Suspenses>(undefined as never)

function SuspenseData({ children }: { children: React.ReactNode }) {
  const suspenses: Suspenses = {}
  return React.createElement(ctxSuspenses.Provider, { value: suspenses }, children)
}

function useSuspenseData() {
  const suspenses = useContext(ctxSuspenses)
  return suspenses
}
