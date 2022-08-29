export { isServerSide }

import { isClientSide } from './isClientSide'

function isServerSide() {
  return !isClientSide()
}
