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
      '[vite-plugin-dist-importer][Bug] You stumbled upon a bug in the source code of vite-plugin-import-build.',
      'Reach out at https://github.com/brillout/vite-plugin-dist-importer/issues/new and include this error stack',
      '(the error stack is usually enough to fix the problem).',
      debugStr && `(Debug info for the maintainers: ${debugStr})`
    ]
      .filter(Boolean)
      .join(' ')
  )
}
