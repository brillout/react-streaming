export { toPosixPath }

import { assert } from './assert.js'
import { assertIsNotBrowser } from './assertIsNotBrowser.js'
// While this path shim also works on the client-side, let's try to not use it on the client-side in order to minimize KBs sent to the browser.
assertIsNotBrowser()

function toPosixPath(path: string): string {
  const pathPosix = path.split('\\').join('/')
  assertPosixPath(pathPosix)
  return pathPosix
}

function assertPosixPath(path: string): void {
  const errMsg = (msg: string) => `Not a posix path: ${msg}`
  assert(path !== null, errMsg('null'))
  assert(typeof path === 'string', errMsg(`typeof path === ${JSON.stringify(typeof path)}`))
  assert(path !== '', errMsg('(empty string)'))
  assert(path)
  assert(!path.includes('\\'), errMsg(path))
}
