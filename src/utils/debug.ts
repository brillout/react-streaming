export { createDebugger }
export { isDebugEnabled }
export type { Debug }

import { isBrowser } from './isBrowser'
import { isCallable } from './isCallable'
import { objectAssign } from './objectAssign'
import { assert } from './assert'

assert(!isBrowser(), 'utils/debug.js loaded in browser')

type Debug = ReturnType<typeof createDebugger>

type Options = {
  serialization?: {
    emptyArray?: string
  }
}

type Namespace =
  | 'react-streaming:createPipeWrapper'
  | 'react-streaming:chunks'
  //
  | 'react-streaming:flow'

function createDebugger(namespace: Namespace, optionsGlobal?: Options) {
  const debugWithOptions = (options: Options) => {
    return (msg: string, info?: unknown) => {
      if (!isDebugEnabled(namespace)) return
      if (info !== undefined) {
        msg += strInfo(info, { ...optionsGlobal, ...options })
      }
      console.log('\x1b[1m%s\x1b[0m', namespace, msg)
    }
  }
  const debug = (msg: string, info?: unknown) => debugWithOptions({})(msg, info)
  objectAssign(debug, { options: debugWithOptions, isEnabled: isDebugEnabled(namespace) })
  return debug
}

function isDebugEnabled(namespace: string): boolean {
  let DEBUG: undefined | string
  // - `process` can be undefined in edge workers
  // - We want bundlers to be able to statically replace `process.env.*`
  try {
    DEBUG = process.env.DEBUG
  } catch {}
  return DEBUG?.includes(namespace) ?? false
}

function strInfo(info: unknown, options: Options): string | undefined {
  if (info === undefined) {
    return undefined
  }

  let str = '\n'

  if (typeof info === 'string') {
    str += info
  } else if (Array.isArray(info)) {
    if (info.length === 0) {
      str += options.serialization?.emptyArray ?? '[]'
    } else {
      str += info.map(strUnknown).join('\n')
    }
  } else {
    str += strUnknown(info)
  }

  str = pad(str)

  return str
}

function pad(str: string): string {
  const PADDING = '     '
  const terminalWidth = getTerminalWidth()
  const lines: string[] = []
  str.split('\n').forEach((line) => {
    if (!terminalWidth) {
      lines.push(line)
    } else {
      chunk(line, terminalWidth - PADDING.length).forEach((chunk) => {
        lines.push(chunk)
      })
    }
  })
  return lines.join('\n' + PADDING)
}
function chunk(str: string, size: number): string[] {
  if (str.length <= size) {
    return [str]
  }
  const chunks = str.match(new RegExp('.{1,' + size + '}', 'g'))
  assert(chunks)
  return chunks
}

function strUnknown(thing: unknown) {
  return typeof thing === 'string' ? thing : strObj(thing)
}
function strObj(obj: unknown, newLines = false) {
  return JSON.stringify(obj, replaceFunctionSerializer, newLines ? 2 : undefined)
}
function replaceFunctionSerializer(this: Record<string, unknown>, _key: string, value: unknown) {
  if (isCallable(value)) {
    return value.toString().split(/\s+/).join(' ')
  }
  return value
}

function getTerminalWidth(): number | undefined {
  // https://stackoverflow.com/questions/30335637/get-width-of-terminal-in-node-js/30335724#30335724
  return (
    (typeof process !== 'undefined' && typeof process.stdout !== 'undefined' && process.stdout.columns) || undefined
  )
}
