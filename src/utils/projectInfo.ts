export { projectInfo }

import { getGlobalObject } from './getGlobalObject'

const PROJECT_VERSION = '0.3.21'

const projectInfo = {
  projectName: 'react-streaming' as const,
  projectVersion: PROJECT_VERSION,
  npmPackageName: 'react-streaming' as const,
  githubRepository: 'https://github.com/brillout/react-streaming' as const
}

const { versions } = getGlobalObject('projectInfo.ts', {
  versions: new Set<string>()
})
versions.add(projectInfo.projectVersion)
if (versions.size >= 2) {
  const versionsStr = Array.from(versions)
    .map((v) => `${projectInfo.projectName}@${v}`)
    .join('and')
  throw new Error(
    `Using different versions is forbidden, but ${versionsStr} are loaded. Make sure only one version is loaded.`
  )
}
