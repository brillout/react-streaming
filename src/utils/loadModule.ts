export { loadModule }

/** Dynamically load module, without the module being bundled. */
function loadModule(id: string) {
  // - For TypeScript to not transpile `import()` to `require()` for CJS builds, it needs to be configured with `"moduleResolution": "nodenext"`, see https://github.com/microsoft/TypeScript/issues/43329#issuecomment-1079559627
  // - I believe bundlers skip bundling `id`, since `id` is unknown while statically analyzing code.
  // - Skip webpack from forcefully bunlding dynamic imports with unknown IDs: https://github.com/webpack/webpack/issues/7644#issuecomment-402123392
  return import(/*webpackIgnore: true*/ id)
}
