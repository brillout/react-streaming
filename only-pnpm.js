const { readFileSync } = require('fs')
const { join } = require('path')

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

// require pnpm package manager if the current root project is react-streaming
if (packageJson.name === 'react-streaming') {
  if (/pnpm/.test(process.env.npm_execpath) === false) {
    console.log('[only-pnpm.js] react-streaming development requires pnpm to be used as the package manager')
    process.exit(-1);
  }
}
