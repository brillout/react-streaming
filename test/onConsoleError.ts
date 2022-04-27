export { onConsoleError }

import { afterEach, expect, vi } from 'vitest'

afterEach(() => {
  expect(loggedErrMsgs).toEqual([])
})

type Listener = (errMsg: string) => undefined | { suppress?: true; removeListener?: true }
let listeners: Listener[] = []
function onConsoleError(listener: Listener) {
  listeners.push(listener)
}

const loggedErrMsgs: string[] = []
const consoleErrorOriginal = console.error
vi.spyOn(console, 'error').mockImplementation((...args: string[]) => {
  const [errMsg] = args
  let supress = false
  listeners.forEach((listener) => {
    const ret = listener(errMsg)
    if (ret?.removeListener) {
      listeners = listeners.filter((l) => l !== listener)
    }
    if (ret?.suppress) {
      supress = true
    }
  })
  if (!supress) {
    loggedErrMsgs.push(errMsg)
    consoleErrorOriginal.apply(console, args)
  }
})
