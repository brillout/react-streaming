import { assertUsage } from './utils'

assertUsage(
  false,
  "`import { something } from 'react-streaming/server'` in client-side code is forbidden: the module react-streaming/server should never be loaded on the client-side",
)
