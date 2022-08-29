export { useAsync }

import { useId } from 'react'
import { useSsrData, DependencyList } from './useSsrData'

function useAsync<T>(asyncFn: () => Promise<T>, deps?: DependencyList): T {
  const id: string = useId()
  // TODO: throw new Error('Only one `useAsync()` hook can be used per component')
  return useSsrData(id, asyncFn, deps)
}
