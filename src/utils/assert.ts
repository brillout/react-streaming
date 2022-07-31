export { assert }
export { assertUsage }
export { assertWarning }

function assert(condition: unknown, debugInfo?: unknown): asserts condition {
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

function assertUsage(condition: unknown, msg: string): asserts condition {
  if (condition) return
  throw new Error('[react-streaming][Wrong Usage] ' + msg)
}

function assertWarning(condition: unknown, msg: string) {
  if (condition) return
  console.warn('[react-streaming][Warning] ' + msg)
}
