export { assert }
export { assertUsage }
export { assertWarning }
export { assertInfo }
export { getProjectError }

import { createErrorWithCleanStackTrace } from './createErrorWithCleanStackTrace.js'
import { getGlobalObject } from './getGlobalObject.js'
import { projectInfo } from './projectInfo.js'
import pc from '@brillout/picocolors'
const errorPrefix = `[${projectInfo.npmPackageName}@${projectInfo.projectVersion}]`
const internalErrorPrefix = `${errorPrefix}[Bug]`
const usageErrorPrefix = `${errorPrefix}[Wrong Usage]`
const warningPrefix = `${errorPrefix}[Warning]`
const infoPrefix = `${errorPrefix}[Info]`
const numberOfStackTraceLinesToRemove = 2
const globalObject = getGlobalObject('assert.ts', {
  versions: new Set<string>(),
  alreadyLogged: new Set<string>(),
})
const { versions } = globalObject
const alreadyLogged =
  globalObject.alreadyLogged ??
  // TO-DO/eventually: remove
  // We need to set the same default again because older react-streaming versions (published before 11.03.2025) don't set any default in their getGlobalObject() call
  new Set()
assertSingleVersion()

function assert(condition: unknown, debugInfo?: unknown): asserts condition {
  if (condition) {
    return
  }

  const debugStr = (() => {
    if (!debugInfo) {
      return ''
    }
    const debugInfoSerialized = typeof debugInfo === 'string' ? debugInfo : '`' + JSON.stringify(debugInfo) + '`'
    return `Debug info (this is for the ${projectInfo.projectName} maintainers; you can ignore this): ${debugInfoSerialized}.`
  })()

  const internalError = createErrorWithCleanStackTrace(
    [
      `${internalErrorPrefix} You stumbled upon a bug in ${projectInfo.projectName}'s source code.`,
      `Reach out at ${projectInfo.githubRepository}/issues/new and include this error stack (the error stack is usually enough to fix the problem).`,
      'A maintainer will fix the bug (usually under 24 hours).',
      `Do not hesitate to reach out as it makes ${projectInfo.projectName} more robust.`,
      debugStr,
    ].join(' '),
    numberOfStackTraceLinesToRemove,
  )

  throw internalError
}

function assertUsage(condition: unknown, errorMessage: string): asserts condition {
  if (condition) {
    return
  }
  const whiteSpace = errorMessage.startsWith('[') ? '' : ' '
  const usageError = createErrorWithCleanStackTrace(
    `${usageErrorPrefix}${whiteSpace}${errorMessage}`,
    numberOfStackTraceLinesToRemove,
  )
  throw usageError
}

function getProjectError(errorMessage: string) {
  const pluginError = createErrorWithCleanStackTrace(`${errorPrefix} ${errorMessage}`, numberOfStackTraceLinesToRemove)
  return pluginError
}

function assertWarning(
  condition: unknown,
  errorMessage: string,
  { onlyOnce, showStackTrace }: { onlyOnce: boolean | string; showStackTrace?: true },
): void {
  if (condition) {
    return
  }
  const msg = `${warningPrefix} ${errorMessage}`
  if (onlyOnce) {
    const key = onlyOnce === true ? msg : onlyOnce
    if (alreadyLogged.has(key)) {
      return
    } else {
      alreadyLogged.add(key)
    }
  }
  if (showStackTrace) {
    console.warn(new Error(msg))
  } else {
    console.warn(msg)
  }
}

function assertInfo(condition: unknown, errorMessage: string, { onlyOnce }: { onlyOnce: boolean }): void {
  if (condition) {
    return
  }
  const msg = `${infoPrefix} ${errorMessage}`
  if (onlyOnce) {
    const key = msg
    if (alreadyLogged.has(key)) {
      return
    } else {
      alreadyLogged.add(key)
    }
  }
  console.log(msg)
}

function assertSingleVersion() {
  versions.add(projectInfo.projectVersion)
  if (versions.size >= 2) {
    const versionsStr = Array.from(versions)
      .map((v) => `${projectInfo.projectName}@${v}`)
      .join(' and ')
    assertWarning(
      false,
      `${versionsStr} loaded which is highly discouraged, see ${pc.underline(
        'https://vike.dev/warning/version-mismatch',
      )}`,
      { onlyOnce: true },
    )
  }
}
