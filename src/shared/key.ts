export { stringifyKey }
export { assertKey }

import { stringify } from '@brillout/json-serializer/stringify'
import { assertUsage } from './utils'

function stringifyKey(key: unknown): string {
  const keyString = stringify(key, { sortObjectKeys: true })
  return keyString
}

function assertKey(keyValue: unknown) {
  assertUsage(
    keyValue,
    `[useAsync(key, asyncFc)] You provided a \`key\` with the value \`${keyValue}\` which is forbidden.`
  )
}
