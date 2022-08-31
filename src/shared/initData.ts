export type { InitData }
export { initDataHtmlClass }

import type { Deps } from './deps'
type InitData = { key: string; value: unknown; deps: Deps }
const initDataHtmlClass = 'react-streaming_ssr-data'
