export function isVikeReactApp(): boolean {
  const g = globalThis as Record<string, unknown>
  // Set by vike-react https://github.com/vikejs/vike-react/blob/ca46452992a7ea94e8f58e40f5062ba56a0b56eb/packages/vike-react/src/renderer/onRenderHtml.tsx#L75
  return !!g._isVikeReactApp
}
