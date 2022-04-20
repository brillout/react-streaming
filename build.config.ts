import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/server',
    'src/client',
    'src/useSsrData',
    'src/useAsync',
  ],
  rollup: {
    emitCJS: true,
  },
})
