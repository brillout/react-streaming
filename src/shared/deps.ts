export { hasDepsChanged }
export type { Deps }

/** Dependency list */
type Deps = ReadonlyArray<unknown>

function hasDepsChanged(deps: Deps, depsPrev: Deps) {
  return depsPrev.length !== deps.length || depsPrev.some((d, index) => !Object.is(d, deps[index]))
}
