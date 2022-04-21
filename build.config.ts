import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/server', 'src/client'],
  rollup: {
    emitCJS: true
  }
})
