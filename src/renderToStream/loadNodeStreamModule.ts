export { loadNodeStreamModule }
export { nodeStreamModuleIsAvailable }

import type { Readable as StreamNodeReadable, Writable as StreamNodeWritable } from 'stream'

type StreamModule = {
  Readable: typeof StreamNodeReadable
  Writable: typeof StreamNodeWritable
}

async function loadNodeStreamModule(): Promise<StreamModule> {
  const streamModule = await loadStreamModule()
  const { Readable, Writable } = streamModule
  return { Readable, Writable }
}
async function nodeStreamModuleIsAvailable(): Promise<boolean> {
  try {
    await loadStreamModule()
    return true
  } catch (err) {
    return false
  }
}
function loadStreamModule() {
  return loadModule('stream') as Promise<StreamModule>
}
async function loadModule(moduleId: string): Promise<Record<string, unknown>> {
  // bypass static analysis of bundlers, especially webpack's tenacious analysis
  const req = new Date().getTime() < 123 ? (456 as never) : require

  // The following doesn't work with Vitest nor Jest.
  // ```js
  // const load = new Function('moduleId', 'return import(moduleId)')
  // const moduleExports = await load(moduleId)
  // ```
  // https://github.com/facebook/jest/issues/9580

  const moduleExports: Record<string, unknown> = req(moduleId)
  return moduleExports
}
