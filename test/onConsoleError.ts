export { onConsoleError }

import { vi } from 'vitest'

type Listener = (errMsg: string) => undefined | { suppress?: true; removeListener?: true }
let listeners: Listener[] = []
function onConsoleError(listener: Listener) {
  listeners.push(listener)
}

const consoleErrorOriginal = console.error
vi.spyOn(console, 'error').mockImplementation((...args: string[]) => {
  const [errMsg] = args
  listeners.forEach((listener) => {
    const ret = listener(errMsg)
    if (ret?.removeListener) {
      listeners = listeners.filter((l) => l !== listener)
    }
    if (!ret?.suppress) {
      consoleErrorOriginal.apply(console, args)
    }
  })
})
