# Changelog

## [0.3.0](https://github.com/brillout/react-streaming/compare/v0.2.22...v0.3.0) (2022-08-31)


### ⚠ BREAKING CHANGES

* hooks `useAsync()` and `useSsrData()` consolidated into a single new hook `useAsync()` with a new interface. See `README.md`.

### Features

* add `deps` options to hooks ([#10](https://github.com/brillout/react-streaming/issues/10)) ([b2d20e1](https://github.com/brillout/react-streaming/commit/b2d20e109de09e6c7a163cbbd0799a868260db27))
* improve hooks DX ([0fcee0e](https://github.com/brillout/react-streaming/commit/0fcee0ec99929eb9fb3b2b1c45552450d82a31d9))


### Bug Fixes

* improve error handling upon wrong installation ([8802e67](https://github.com/brillout/react-streaming/commit/8802e67df73f2f33618fe82e82e9554f6aa0f8fd))
* tolerate earlier injectStream call ([47b35b0](https://github.com/brillout/react-streaming/commit/47b35b0e759885c3216e1719f2c04c3cf4b60fab))
* workaround React swallowing errors ([ba4245f](https://github.com/brillout/react-streaming/commit/ba4245f4421714758046712f4256e094a31a76f4))
