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
