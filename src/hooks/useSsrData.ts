export { SsrDataProvider }
export { useSsrData }
export type { DependencyList }

import React, { useContext } from 'react'
import { useStream } from './useStream'
import { assert, assertUsage, isClientSide, isServerSide, isPromise } from './utils'
import { parse, stringify } from '@brillout/json-s'

const ctxSuspenses = React.createContext<Suspenses>(undefined as any)
type Suspenses = Record<string, Suspense>
type Suspense =
  | { state: 'pending'; promise: Promise<unknown>; deps: DependencyList }
  | { state: 'error'; error: unknown; deps: DependencyList }
  | { state: 'done'; value: unknown; deps: DependencyList }
type DependencyList = ReadonlyArray<unknown>

function SsrDataProvider({ children }: { children: React.ReactNode }) {
  const suspenses = {}
  return React.createElement(ctxSuspenses.Provider, { value: suspenses }, children)
}

type SsrData = { key: string; value: unknown; deps: DependencyList }
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

function useSsrData<T>(key: string, asyncFn: () => Promise<T>, deps: DependencyList = []): T {
  assert(deps)

  return handleHookError(() => {
    const suspenses = useContext(ctxSuspenses)
    assertUsage(
      suspenses,
      `react-streaming isn't properly installed: wrapper <ReactStreaming> is missing, see react-streaming's "Get Started" documentation.`
    )

    let suspense = suspenses[key]

    if (!suspense && isClientSide()) {
      const { data } = findSsrData(key) || {}
      if (data) {
        const { deps, value } = data
        suspense = suspenses[key] = { state: 'done', value, deps }
      }
    }

    let hasChanged: boolean | null = null
    if (suspense) {
      const depsPrev = suspense.deps
      hasChanged = depsPrev.length !== deps.length || depsPrev.some((d, index) => !Object.is(d, deps[index]))
    }

    if (!suspense || hasChanged) {
      const streamUtils = useStream()
      const promise = (async () => {
        let value: unknown
        try {
          value = await asyncFn()
        } catch (error) {
          // React seems buggy around error handling; we handle errors ourselves
          suspense = suspenses[key] = { state: 'error', error, deps }
          return
        }
        suspense = suspenses[key] = { state: 'done', value, deps }
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
      suspense = suspenses[key] = { state: 'pending', promise, deps }
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
  })
}

/** Handle server-side suspense error. (Workaround for React swallowing errors upon suspense boundary errors.) */
function handleHookError<T>(fn: () => T): T {
  if (isClientSide()) {
    return fn()
  }
  let ret: T
  try {
    ret = fn()
  } catch (err) {
    if (isPromise(err)) {
      err = err.catch((err) => {
        console.error(err)
        throw err
      })
    }
    throw err
  }
  return ret
}
