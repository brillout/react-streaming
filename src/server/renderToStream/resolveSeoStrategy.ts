export { resolveSeoStrategy }
export type { SeoStrategy }

// https://github.com/omrilotan/isbot
// https://github.com/mahovich/isbot-fast
// https://stackoverflow.com/questions/34647657/how-to-detect-web-crawlers-for-seo-using-express/68869738#68869738
import isBot from 'isbot-fast'
import { assertWarning, isVikeReactApp } from '../utils'

type SeoStrategy = 'conservative' | 'google-speed'
function resolveSeoStrategy(options: { seoStrategy?: SeoStrategy; userAgent?: string } = {}): {
  disableStream: boolean
} {
  const seoStrategy: SeoStrategy = options.seoStrategy || 'conservative'

  if (!options.userAgent) {
    assertWarning(
      false,
      [
        'HTML Streaming disabled because User Agent is unknown: make sure to provide',
        isVikeReactApp()
          ? 'pageContext.userAgent (typically with `renderPage({ userAgent: req.userAgent })`, see https://vike.dev/renderPage)'
          : 'options.userAgent',
        '(so that react-streaming is able to disable HTML streaming for bots such as Google Bot). Or set options.disable to `true` to suppress this warning.'
      ].join(' '),
      { onlyOnce: true }
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
