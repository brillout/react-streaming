export { loadNodeStreamModule }
export { nodeStreamModuleIsAvailable }

import type { Readable as StreamNodeReadable, Writable as StreamNodeWritable } from 'stream'
import loadModule from '@brillout/load-module'

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
