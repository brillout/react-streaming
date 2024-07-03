## [0.3.37](https://github.com/brillout/react-streaming/compare/v0.3.36...v0.3.37) (2024-07-03)


### Bug Fixes

* further avoid inject between two React synchronous writes ([c14483f](https://github.com/brillout/react-streaming/commit/c14483f8ab8b06290465cc13c1009796cf33ef80))



## [0.3.36](https://github.com/brillout/react-streaming/compare/v0.3.35...v0.3.36) (2024-07-03)


### Features

* stream.doNotClose() ([#40](https://github.com/brillout/react-streaming/issues/40)) ([#43](https://github.com/brillout/react-streaming/issues/43)) ([375b9d3](https://github.com/brillout/react-streaming/commit/375b9d3dcf3815d3e72d0f30b10e3f1153b6aa59))



## [0.3.35](https://github.com/brillout/react-streaming/compare/v0.3.34...v0.3.35) (2024-07-03)


### Features

* support chunk promises for injectToStream() (closes [#40](https://github.com/brillout/react-streaming/issues/40)) ([#42](https://github.com/brillout/react-streaming/issues/42)) ([300308e](https://github.com/brillout/react-streaming/commit/300308e94077e661771c43af91e931ae0ed74ec6))



## [0.3.34](https://github.com/brillout/react-streaming/compare/v0.3.33...v0.3.34) (2024-07-03)


### Bug Fixes

* also expose hasStreamEnded() to useStream() hook ([9add5f6](https://github.com/brillout/react-streaming/commit/9add5f6c4b6ba685910652554843a74a90fed125))
* assume chunk to be a string for now ([1853660](https://github.com/brillout/react-streaming/commit/1853660fea079916bf468a784483493c9d4fbd9e))
* fix injectToStream before stream start ([d7ba375](https://github.com/brillout/react-streaming/commit/d7ba37562b3e7c7b2b5e75e808f8c37dea0d0b94))
* fix wrong usage error upon inject after stream ended ([460581c](https://github.com/brillout/react-streaming/commit/460581c1a2af2e4493108c0b3daa213dafb5f62c))
* prevent debug flags to crash cloudflare workers ([7a28e94](https://github.com/brillout/react-streaming/commit/7a28e948e26a632a7250d9c14beec329ebf38dd0))
* re-apply workaround for injectToStream() at stream end race condition ([#40](https://github.com/brillout/react-streaming/issues/40)) ([f43bd9b](https://github.com/brillout/react-streaming/commit/f43bd9b79a4081b6b1085d9ff7727a4cf8099105))
* refactor writePermission logic ([485ed46](https://github.com/brillout/react-streaming/commit/485ed46c87f7a0fcbb1c6e3e2d1b43767b851beb))
* remove unused tolerateStreamEnded option ([2f5bf27](https://github.com/brillout/react-streaming/commit/2f5bf270832a8a45f04af6821d709f590cc9cb7f))



## [0.3.33](https://github.com/brillout/react-streaming/compare/v0.3.32...v0.3.33) (2024-06-28)


### Bug Fixes

* improve error message ([91eaf97](https://github.com/brillout/react-streaming/commit/91eaf9778aca8302f934985a05ee1488c9a231d8))
* remove hack ([19aec51](https://github.com/brillout/react-streaming/commit/19aec51072506eabe5e7cdd3ee57b5af96cab270))



## [0.3.32](https://github.com/brillout/react-streaming/compare/v0.3.31...v0.3.32) (2024-06-28)


### Bug Fixes

* rename expectStreamEnd => tolerateStreamEnded ([74e93df](https://github.com/brillout/react-streaming/commit/74e93df45fcd6417381e4b7370e7bc4a47dcadb6))


### Features

* hasStreamEnded() ([218917a](https://github.com/brillout/react-streaming/commit/218917ac5d0d232aba62a02392b1cfb58006a4f7))



## [0.3.31](https://github.com/brillout/react-streaming/compare/v0.3.30...v0.3.31) (2024-06-27)


### Bug Fixes

* fix result type ([f33ed72](https://github.com/brillout/react-streaming/commit/f33ed72a043f38df90093288ceea687e5ecc9657))
* improve error message ([71fee05](https://github.com/brillout/react-streaming/commit/71fee05592163c7648c09779551b0dd59629512a))



## [0.3.30](https://github.com/brillout/react-streaming/compare/v0.3.29...v0.3.30) (2024-06-27)


### Bug Fixes

* improve debug logs ([d6a973c](https://github.com/brillout/react-streaming/commit/d6a973c07ec99b0bd3253c160718ac1280465293))


### Features

* expectStreamEnd option ([7612e65](https://github.com/brillout/react-streaming/commit/7612e653a6c6d9921bee7049f17cff5894c2bfef))



## [0.3.29](https://github.com/brillout/react-streaming/compare/v0.3.28...v0.3.29) (2024-06-27)


### Bug Fixes

* update vike-react error message ([12b4001](https://github.com/brillout/react-streaming/commit/12b4001cd8db2651a521244089477192aeda4e09))



## [0.3.28](https://github.com/brillout/react-streaming/compare/v0.3.27...v0.3.28) (2024-04-19)


### Bug Fixes

* remove pnpm check ([#38](https://github.com/brillout/react-streaming/issues/38), fix [#37](https://github.com/brillout/react-streaming/issues/37)) ([489b599](https://github.com/brillout/react-streaming/commit/489b599c4437d7005650c2eb0f3f8166a5677fc8))



## [0.3.27](https://github.com/brillout/react-streaming/compare/v0.3.26...v0.3.27) (2024-04-18)


### Bug Fixes

* further improve error messages ([5234427](https://github.com/brillout/react-streaming/commit/52344279b6cf48672e8b2046713244f7f59b5104))



## [0.3.26](https://github.com/brillout/react-streaming/compare/v0.3.25...v0.3.26) (2024-04-17)


### Bug Fixes

* err msg typo ([ebfa737](https://github.com/brillout/react-streaming/commit/ebfa737faf2efa30e9a66c7b2743a33e87de071a))
* let user decide stack trace size ([aa1cd2b](https://github.com/brillout/react-streaming/commit/aa1cd2b736acf82e84846b37ab696db58d97dd65))



## [0.3.25](https://github.com/brillout/react-streaming/compare/v0.3.24...v0.3.25) (2024-04-16)


### Bug Fixes

* improve error messages for vike-react users ([70c168d](https://github.com/brillout/react-streaming/commit/70c168de1e97b9c4385a4c3002b5013f1e406341))



## [0.3.24](https://github.com/brillout/react-streaming/compare/v0.3.23...v0.3.24) (2024-03-08)


### Bug Fixes

* add timeout handling ([#35](https://github.com/brillout/react-streaming/issues/35)) ([6cdfaee](https://github.com/brillout/react-streaming/commit/6cdfaeee8080f14615c1d4ea6c5b48800a6a1fad))



## [0.3.23](https://github.com/brillout/react-streaming/compare/v0.3.22...v0.3.23) (2024-02-24)


### Bug Fixes

* improve error message ([63bd311](https://github.com/brillout/react-streaming/commit/63bd3118f57182a6e03358c9081ece22394494dd))


### Features

* streamOptions ([7464875](https://github.com/brillout/react-streaming/commit/7464875330644cad2214f27480f3ff16aa7c2ada))



## [0.3.22](https://github.com/brillout/react-streaming/compare/v0.3.21...v0.3.22) (2024-02-10)


### Bug Fixes

* deprecated outdated options ([9b15c37](https://github.com/brillout/react-streaming/commit/9b15c371a07b3c6d2089ef895d40ba341ef605ca))
* improve export strategy ([#32](https://github.com/brillout/react-streaming/issues/32)) ([fbcaf92](https://github.com/brillout/react-streaming/commit/fbcaf92aba5ecffca77df327309f2d97f37b8d3e))



## [0.3.21](https://github.com/brillout/react-streaming/compare/v0.3.20...v0.3.21) (2024-02-10)


### Bug Fixes

* assertion ([58cf5b7](https://github.com/brillout/react-streaming/commit/58cf5b7e87fccad3e5a5f3d058643707bc708466))
* remove last dynamic import (fix [#32](https://github.com/brillout/react-streaming/issues/32)) ([605566a](https://github.com/brillout/react-streaming/commit/605566a6a3409737b2704d84e73af4d80bf08cdc))



## [0.3.20](https://github.com/brillout/react-streaming/compare/v0.3.19...v0.3.20) (2024-02-01)


### Bug Fixes

* use package.json exports instead of dynamic import() ([f4da7fc](https://github.com/brillout/react-streaming/commit/f4da7fc6a002afcf4adae7bdd924bfb4d523de32))



## [0.3.19](https://github.com/brillout/react-streaming/compare/v0.3.18...v0.3.19) (2024-01-06)


### Bug Fixes

* ensure single version ([d4293c7](https://github.com/brillout/react-streaming/commit/d4293c7f295673f55da0d25f921775b17e165c5f))
* improve error message (fix [#31](https://github.com/brillout/react-streaming/issues/31)) ([27cd8fb](https://github.com/brillout/react-streaming/commit/27cd8fb5e30fe98ec2ab0b487ad7632288825555))



## [0.3.18](https://github.com/brillout/react-streaming/compare/v0.3.17...v0.3.18) (2023-12-11)


### Bug Fixes

* add types exports ([ecb6810](https://github.com/brillout/react-streaming/commit/ecb68105c08cad04b15bb6b652d0fbfaa275b20e))



## [0.3.17](https://github.com/brillout/react-streaming/compare/v0.3.16...v0.3.17) (2023-12-07)


### Bug Fixes

* ensure StreamContext is a singltone ([b2172d7](https://github.com/brillout/react-streaming/commit/b2172d7ded196d6494ba54b34270f05b999cd89c))



## [0.3.16](https://github.com/brillout/react-streaming/compare/v0.3.15...v0.3.16) (2023-11-15)


### Bug Fixes

* remove Discord links ([117df16](https://github.com/brillout/react-streaming/commit/117df16d33c773aa56782db980453bda80440ea9))



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
