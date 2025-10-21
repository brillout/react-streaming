export { isServerSide }

import { isClientSide } from './isClientSide.js'

function isServerSide() {
  return !isClientSide()
}
