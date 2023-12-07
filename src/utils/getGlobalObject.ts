export function getGlobalObject<T extends Record<string, unknown> = never>(
  // We use the filename as key; each `getGlobalObject()` call should live in a unique filename.
  key: `${string}.ts`,
  defaultValue: T
): T {
  const allGlobalObjects = (globalThis.__react_streaming = globalThis.__react_streaming || {})
  const globalObject = (allGlobalObjects[key] = (allGlobalObjects[key] as T) || defaultValue)
  return globalObject
}
declare global {
  var __react_streaming: undefined | Record<string, Record<string, unknown>>
}
