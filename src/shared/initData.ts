export type { InitData }
export { initDataHtmlClass }

type InitData = { value: unknown; asyncKey: string; elementId: string }
const initDataHtmlClass = 'react-streaming_initData'
