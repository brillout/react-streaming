export { SsrDataProvider }
export { useSsrData }

import React, { useContext } from 'react'
import { useStream } from './useStream'
import { assert, isClientSide, isServerSide } from './utils'
import { parse, stringify } from '@brillout/json-s'
import type { DependencyList } from './types'

const Ctx = React.createContext<Data>(undefined as any)

type Data = Record<string, Entry>
type Entry =
  | { state: 'pending'; promise: Promise<unknown>; deps?: DependencyList }
  | { state: 'error'; error: unknown }
  | { state: 'done'; value: unknown; deps?: DependencyList }

function SsrDataProvider({ children }: { children: React.ReactNode }) {
  const data = {}
  return React.createElement(Ctx.Provider, { value: data }, children)
}

type SsrData = { key: string; value: unknown; deps?: DependencyList }
const className = 'react-streaming_ssr-data'
function getHtmlChunk(entry: SsrData): string {
  const ssrData = [entry]
  return `<script class="${className}" type="application/json">${stringify(ssrData)}</script>`
}

function getJsonScriptElement(key: string): { el: Element; entry: SsrData } | undefined {
  const els = Array.from(window.document.querySelectorAll(`.${className}`))
  for (const el of els) {
    assert(el.textContent)
    const data = parse(el.textContent) as SsrData[]
    for (const entry of data) {
      assert(typeof entry.key === 'string')
      if (entry.key === key) {
        return { el, entry }
      }
    }
  }
  return
}

function getSsrData(
  key: string
): { isAvailable: true; value: unknown; el: Element; deps?: DependencyList } | { isAvailable: false } {
  const { el, entry } = getJsonScriptElement(key) || {}

  if (el && entry) {
    const { value, deps } = entry
    return { isAvailable: true, value, deps, el }
  }
  return { isAvailable: false }
}

function useSsrData<T>(key: string, asyncFn: () => Promise<T>, deps?: DependencyList): T {
  const data = useContext(Ctx)
  let hasChanged = false
  if (isClientSide()) {
    const ssrData = getSsrData(key)
    if (ssrData.isAvailable) {
      if (deps || ssrData.deps) {
        hasChanged = true
        if (deps && ssrData.deps) {
          hasChanged = ssrData?.deps.some((d, index) => !Object.is(d, deps[index]))
        }
      }
      if (!hasChanged) return ssrData.value as T
    }
  }
  let entry = data[key]
  if (!entry || hasChanged) {
    const streamUtils = useStream()
    const promise = (async () => {
      let value: unknown
      try {
        value = await asyncFn()
      } catch (error) {
        // React seems buggy around error handling; we handle errors ourselves
        entry = data[key] = { state: 'error', error }
        return
      }
      entry = data[key] = { state: 'done', value }
      if (isServerSide()) {
        assert(streamUtils)
        streamUtils.injectToStream(getHtmlChunk({ key, value }))
      } else {
        const { el } = getJsonScriptElement(key) || {}
        if (el) {
          el.textContent = stringify([{ key, value: entry.value, deps }])
        }
      }
    })()
    entry = data[key] = { state: 'pending', promise }
  }
  if (entry.state === 'pending') {
    throw entry.promise
  }
  if (entry.state === 'error') {
    throw entry.error
  }
  if (entry.state === 'done') {
    return entry.value as T
  }
  assert(false)
}
