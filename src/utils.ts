export function isServerSide() {
  return !isClientSide()
}

export function isClientSide() {
  return typeof window !== 'undefined' && typeof window?.getComputedStyle === 'function'
}

export function assert(condition: unknown, debugInfo?: unknown): asserts condition {
  if (condition) return

  const debugStr = debugInfo && (typeof debugInfo === 'string' ? debugInfo : '`' + JSON.stringify(debugInfo) + '`')

  throw new Error(
    [
      '[react-streaming][Bug] You stumbled upon a bug in the source code of `react-streaming`.',
      'Reach out at https://github.com/brillout/react-streaming/issues/new and include this error stack',
      '(the error stack is usually enough to fix the problem).',
      debugStr && `(Debug info for the maintainers: ${debugStr})`
    ]
      .filter(Boolean)
      .join(' ')
  )
}

export function assertUsage(condition: unknown, msg: string): asserts condition {
  if (condition) return
  throw new Error('[react-streaming][Wrong Usage] ' + msg)
}

export function assertWarning(condition: unknown, msg: string) {
  if (condition) return
  console.warn('[react-streaming][Warning] ' + msg)
}

import debug from 'debug'
export function createDebugger(
  namespace: `react-streaming:${string}`,
  options: { onlyWhenFocused?: true | string } = {}
): debug.Debugger['log'] {
  let DEBUG: undefined | string
  let DEBUG_FILTER: undefined | string
  // - `process` can be undefined in edge workers
  // - We want bundlers to be able to statically replace `process.env.*`
  try {
    DEBUG = process.env.DEBUG
  } catch {}
  try {
    DEBUG_FILTER = process.env.DEBUG_FILTER_REACT_STREAMING
  } catch {}
  try {
    DEBUG_FILTER ||= process.env.DEBUG_FILTER
  } catch {}

  const log = debug(namespace)

  const { onlyWhenFocused } = options
  const focus = typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace

  return (msg: string, ...args: any[]) => {
    if (DEBUG_FILTER && !msg.includes(DEBUG_FILTER)) {
      return
    }
    if (onlyWhenFocused && !DEBUG?.includes(focus)) {
      return
    }
    log(msg, ...args)
  }
}

export function loadModule(moduleId: string): Promise<Record<string, unknown>> {
  // - `eval()` triggers a esbuild warning
  // - `new Function()` chokes Vitest/Jest (https://github.com/facebook/jest/issues/9580)
  // - Webpack 5 seems to replace any occurence of `require` (e.g. this doesn't work: `const req = new Date().getTime() < 0 ? (0 as never) : require`)
  // - Webpack 5 reproduction: https://github.com/brillout/vps-webpack-5-reproduction

  // === For `dist/cjs/` ===
  // https://github.com/webpack/webpack/issues/8826#issuecomment-660594260
  if (typeof __non_webpack_require__ === 'function') {
    return __non_webpack_require__(moduleId)
  }

  // === For `dist/esm/` ===
  // - https://github.com/webpack/webpack/issues/7644#issuecomment-402123392
  // - This doesn't work for `dist/cjs` because TS transpiles `import()` to `require()` (https://github.com/microsoft/TypeScript/issues/43329)
  return import(/*webpackIgnore: true*/ moduleId)
}
declare global {
  var __non_webpack_require__: typeof require | undefined
}
