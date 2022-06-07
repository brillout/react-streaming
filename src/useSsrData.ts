export { SsrDataProvider }
export { useSsrData }

import React, { useContext } from 'react'
import { useStream } from './useStream'
import { assert, isClientSide, isServerSide } from './utils'
import { parse, stringify } from '@brillout/json-s'
import type { DependencyList } from './types'

const ctxSuspenses = React.createContext<Suspenses>(undefined as any)
type Suspenses = Record<string, Suspense>
type Suspense =
  | { state: 'pending'; promise: Promise<unknown>; deps?: DependencyList }
  | { state: 'error'; error: unknown }
  | { state: 'done'; value: unknown; deps?: DependencyList }

function SsrDataProvider({ children }: { children: React.ReactNode }) {
  const suspenses = {}
  return React.createElement(ctxSuspenses.Provider, { value: suspenses }, children)
}

type SsrData = { key: string; value: unknown; deps?: DependencyList }
const className = 'react-streaming_ssr-data'
function getHtmlChunk(data: SsrData): string {
  return `<script class="${className}" type="application/json">${stringify(data)}</script>`
}

function findSsrData(key: string): { elem: Element; data: SsrData } | null {
  const elements = Array.from(window.document.querySelectorAll(`.${className}`))
  for (const elem of elements) {
    assert(elem.textContent)
    const data = parse(elem.textContent) as SsrData
    assert(typeof data.key === 'string')
    if (data.key === key) {
      return { elem, data }
    }
  }
  return null
}

function useSsrData<T>(key: string, asyncFn: () => Promise<T>, deps?: DependencyList): T {
  const suspenses = useContext(ctxSuspenses)

  let hasChanged = false
  if (isClientSide()) {
    const { data } = findSsrData(key) || {}
    if (data) {
      if (deps || data.deps) {
        if (deps && data.deps) {
          hasChanged = data.deps.some((d, index) => !Object.is(d, deps[index]))
        } else {
          hasChanged = true
        }
      }
      if (!hasChanged) return data.value as T
    }
  }

  let suspense = suspenses[key]
  if (!suspense || hasChanged) {
    const streamUtils = useStream()
    const promise = (async () => {
      let value: unknown
      try {
        value = await asyncFn()
      } catch (error) {
        // React seems buggy around error handling; we handle errors ourselves
        suspense = suspenses[key] = { state: 'error', error }
        return
      }
      suspense = suspenses[key] = { state: 'done', value }
      if (isServerSide()) {
        assert(streamUtils)
        streamUtils.injectToStream(getHtmlChunk({ key, value, deps }))
      } else {
        const { elem } = findSsrData(key) || {}
        if (elem) {
          elem.textContent = stringify([{ key, value: suspense.value, deps }])
        }
      }
    })()
    suspense = suspenses[key] = { state: 'pending', promise }
  }
  if (suspense.state === 'pending') {
    throw suspense.promise
  }
  if (suspense.state === 'error') {
    throw suspense.error
  }
  if (suspense.state === 'done') {
    return suspense.value as T
  }
  assert(false)
}
