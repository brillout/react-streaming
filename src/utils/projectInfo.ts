export { projectInfo }

import { PROJECT_VERSION } from './PROJECT_VERSION.js'

const projectInfo = {
  projectName: 'react-streaming' as const,
  projectVersion: PROJECT_VERSION,
  npmPackageName: 'react-streaming' as const,
  githubRepository: 'https://github.com/brillout/react-streaming' as const,
}
