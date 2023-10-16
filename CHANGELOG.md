## [0.3.15](https://github.com/brillout/react-streaming/compare/v0.3.14...v0.3.15) (2023-10-16)


### Bug Fixes

* make react-streaming/server browser entry a poison pill ([854011b](https://github.com/brillout/react-streaming/commit/854011bacc80e1d5aefca3e62b22a1ca435b8b75))



## [0.3.14](https://github.com/brillout/react-streaming/compare/v0.3.13...v0.3.14) (2023-06-04)


### Bug Fixes

* avoid 'react-dom/server.node' to be bundled ([02449a7](https://github.com/brillout/react-streaming/commit/02449a76343ce3318622a5578b4a7a97e8039b68))
* improve error message ([4eed291](https://github.com/brillout/react-streaming/commit/4eed291caf45a781a5a095906aecec67dcbcdb75))



## [0.3.13](https://github.com/brillout/react-streaming/compare/v0.3.12...v0.3.13) (2023-06-03)


### Bug Fixes

* improve assertUsage message ([5e94949](https://github.com/brillout/react-streaming/commit/5e94949351857c3141fa4d69d40d03aa5e7055de))
* improve import renderToReadableStream() in Node.js ([22494a1](https://github.com/brillout/react-streaming/commit/22494a17177c6f3a35eb7bbd25d791bba18f74c0))



## [0.3.12](https://github.com/brillout/react-streaming/compare/v0.3.11...v0.3.12) (2023-06-02)


### Bug Fixes

* improve assertion that server files aren't loaded in browser (fix [#22](https://github.com/brillout/react-streaming/issues/22)) ([794dd95](https://github.com/brillout/react-streaming/commit/794dd95fa7332d30deba03e1bc66b1c7a40d8a38))



## [0.3.11](https://github.com/brillout/react-streaming/compare/v0.3.10...v0.3.11) (2023-05-19)


### Bug Fixes

* disable write after stream destoryed ([660d252](https://github.com/brillout/react-streaming/commit/660d2524400830ec0512a23d7ca360909075f7a7))
* writableForReact destory if writableFromUser not available ([68a4d65](https://github.com/brillout/react-streaming/commit/68a4d656df4d9202a28070848708fd8cdddeb74d))



## [0.3.10](https://github.com/brillout/react-streaming/compare/v0.3.9...v0.3.10) (2023-05-05)


### Bug Fixes

* re-export useStream() for the client-side as well ([c754a78](https://github.com/brillout/react-streaming/commit/c754a780c4b5e6d3e8724eda352ed377f3f1b28c))



## [0.3.9](https://github.com/brillout/react-streaming/compare/v0.3.8...v0.3.9) (2023-04-20)


### Bug Fixes

* ensure wrangler doesn't resolve browser entry ([a175d56](https://github.com/brillout/react-streaming/commit/a175d566eb233e0d90c1a891c913fb7fec70d4a6))



## [0.3.8](https://github.com/brillout/react-streaming/compare/v0.3.7...v0.3.8) (2023-04-20)


### Bug Fixes

* fix export for worker and deno ([8534637](https://github.com/brillout/react-streaming/commit/85346375cceb07d26de3a9cfcb424e2f52e4de6c))



## [0.3.7](https://github.com/brillout/react-streaming/compare/v0.3.6...v0.3.7) (2023-03-21)


### Bug Fixes

* fix exports ([#17](https://github.com/brillout/react-streaming/issues/17)) ([b2cce88](https://github.com/brillout/react-streaming/commit/b2cce88e6a35c928fc2595cf07a806caf67f07f3))



## [0.3.6](https://github.com/brillout/react-streaming/compare/v0.3.5...v0.3.6) (2023-03-21)


### Bug Fixes

* add `default` in exports field ([50f2edb](https://github.com/brillout/react-streaming/commit/50f2edb32283193d8829c073835c62db237dc3ca))
* simplify exports ([8fbde9c](https://github.com/brillout/react-streaming/commit/8fbde9c3f417535673e2931e50506feb46d1dfad))



## [0.3.5](https://github.com/brillout/react-streaming/compare/v0.3.4...v0.3.5) (2022-10-07)


### Bug Fixes

* align chunk TypeScript type ([0ef0c37](https://github.com/brillout/react-streaming/commit/0ef0c37219e06f0d38cf4b54454fd1d93642c0e7))
* improve DX upon wrong `useAsync()` usage ([0afba57](https://github.com/brillout/react-streaming/commit/0afba5768090783271ee725f94c801f78992450a))



## [0.3.4](https://github.com/brillout/react-streaming/compare/v0.3.3...v0.3.4) (2022-10-06)


### Features

* add flush option to `injectToStream()` ([e677039](https://github.com/brillout/react-streaming/commit/e677039b6831fa742b1915e791e4d22680684e6a))



## [0.3.3](https://github.com/brillout/react-streaming/compare/v0.3.2...v0.3.3) (2022-09-14)


### Bug Fixes

* also handle promise rejections ([228013e](https://github.com/brillout/react-streaming/commit/228013e41d3a4431c7d79ae88b296fba8bcfb152))



## [0.3.2](https://github.com/brillout/react-streaming/compare/v0.3.1...v0.3.2) (2022-09-07)


### Bug Fixes

* ensure suspense state is updated before promise resolves ([9d7c554](https://github.com/brillout/react-streaming/commit/9d7c55402a2d56b3c5f780f835b5f272ab805f7d))
* gracefully handle infinite loops ([52f997e](https://github.com/brillout/react-streaming/commit/52f997e532ac8504249d4c4bbc84e35dae490072))



## [0.3.1](https://github.com/brillout/react-streaming/compare/v0.3.0...v0.3.1) (2022-09-07)


### Bug Fixes

* `useAsync()`: tolerate functions that don't return a promise ([70b2e86](https://github.com/brillout/react-streaming/commit/70b2e869d634b9bd2bf417db746e2a7f13dd495a))
* add version to assertion messages ([7e020c1](https://github.com/brillout/react-streaming/commit/7e020c11e080d89c17008d6baf73e4d333f8dcb3))



# [0.3.0](https://github.com/brillout/react-streaming/compare/v0.2.22...v0.3.0) (2022-09-06)


### Bug Fixes

* improve error handling upon wrong installation ([8802e67](https://github.com/brillout/react-streaming/commit/8802e67df73f2f33618fe82e82e9554f6aa0f8fd))
* tolerate earlier injectStream call ([47b35b0](https://github.com/brillout/react-streaming/commit/47b35b0e759885c3216e1719f2c04c3cf4b60fab))
* workaround React swallowing errors ([ba4245f](https://github.com/brillout/react-streaming/commit/ba4245f4421714758046712f4256e094a31a76f4))


### Features

* improve hooks DX ([21a9814](https://github.com/brillout/react-streaming/commit/21a9814b97d93548884475f0a50222954024c3b9))


### BREAKING CHANGES

* hooks `useAsync()` and `useSsrData()` consolidated into
a single new hook `useAsync()` with a new interface. See `README.md`.
