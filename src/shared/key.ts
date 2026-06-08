export { stringifyKey }
export { assertKey }

import { stringify } from '@brillout/json-serializer/stringify'
import { isCallable } from '../utils/isCallable.js'
import { assertUsage } from './utils.js'

function stringifyKey(key: unknown): string {
  const keyString = stringify(key, {
    sortObjectKeys: true,
    htmlScriptSafe: {
      // Could be set to `false` but we always use `htmlScriptSafe.escapeScripts` to be extra safe
      escapeScripts: true,
      escapeURLs: false,
    },
  })
  return keyString
}

function assertKey(keyValue: unknown) {
  assertUsage(
    keyValue,
    `[useAsync(key, asyncFn)] You provided a \`key\` with the value \`${keyValue}\` which is forbidden.`,
  )
  assertUsage(
    !isCallable(keyValue),
    `[useAsync(key, asyncFn)] You provided a \`key\` that is a function which is forbidden.`,
  )
}
