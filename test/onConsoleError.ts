export { onConsoleError }

import { afterEach, expect, vi } from 'vitest'

afterEach(() => {
  try {
    expect(loggedErrMsgs).toEqual([])
  } finally {
    loggedErrMsgs.length = 0
  }
})

type Listener = (...args: unknown[]) => undefined | { suppress?: true; removeListener?: true }
let listeners: Listener[] = []
function onConsoleError(listener: Listener) {
  listeners.push(listener)
}

const loggedErrMsgs: unknown[] = []
const consoleErrorOriginal = console.error
vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  let supress = false
  listeners.forEach((listener) => {
    const ret = listener(...args)
    if (ret?.removeListener) {
      listeners = listeners.filter((l) => l !== listener)
    }
    if (ret?.suppress) {
      supress = true
    }
  })
  if (!supress) {
    loggedErrMsgs.push(...args)
    consoleErrorOriginal.apply(console, args)
  }
})
