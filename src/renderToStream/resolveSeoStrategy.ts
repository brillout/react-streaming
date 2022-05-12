export { resolveSeoStrategy }
export type { SeoStrategy }

// https://github.com/omrilotan/isbot
// https://github.com/mahovich/isbot-fast
// https://stackoverflow.com/questions/34647657/how-to-detect-web-crawlers-for-seo-using-express/68869738#68869738
import isBot from 'isbot-fast'
import { assertWarning } from '../utils'

type SeoStrategy = 'conservative' | 'google-speed'
function resolveSeoStrategy(options: { seoStrategy?: SeoStrategy; userAgent?: string } = {}): {
  disableStream: boolean
} {
  const seoStrategy: SeoStrategy = options.seoStrategy || 'conservative'

  if (!options.userAgent) {
    assertWarning(
      false,
      'Streaming disabled. Provide `options.userAgent` to enable streaming. (react-streaming needs the User Agent string in order to be able to disable streaming for bots, e.g. for Google Bot.) Or set `options.disable` to `true` to get rid of this warning.'
    )
    return { disableStream: true }
  }
  if (!isBot(options.userAgent)) {
    return { disableStream: false }
  }
  const isGoogleBot = options.userAgent.toLowerCase().includes('googlebot')
  if (seoStrategy === 'google-speed' && isGoogleBot) {
    return { disableStream: false }
  }
  return { disableStream: true }
}
