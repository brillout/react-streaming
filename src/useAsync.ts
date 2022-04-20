export { useAsync }

import { useId } from 'react'
import { useSsrData } from './useSsrData'

function useAsync(asyncFn: () => Promise<unknown>) {
  const id: string = useId()
  // TODO: throw new Error('Only one `useAsync()` hook can be used per component')
  return useSsrData(id, async () => {
    const value = await asyncFn()
    return value
  })
}
