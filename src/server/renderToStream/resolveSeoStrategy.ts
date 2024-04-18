export { resolveSeoStrategy }
export type { SeoStrategy }

// https://github.com/omrilotan/isbot
// https://github.com/mahovich/isbot-fast
// https://stackoverflow.com/questions/34647657/how-to-detect-web-crawlers-for-seo-using-express/68869738#68869738
import isBot from 'isbot-fast'
import pc from '@brillout/picocolors'
import { assertWarning, isVikeReactApp } from '../utils'

type SeoStrategy = 'conservative' | 'google-speed'
function resolveSeoStrategy(options: { seoStrategy?: SeoStrategy; userAgent?: string } = {}): {
  disableStream: boolean
} {
  const seoStrategy: SeoStrategy = options.seoStrategy || 'conservative'

  if (!options.userAgent) {
    showWarning()
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

function showWarning() {
  const isVike = isVikeReactApp()
  const link = isVike ? 'https://vike.dev/streaming' : 'https://github.com/brillout/react-streaming'
  const help = isVike
    ? [
        pc.code('pageContext.userAgent'),
        ' (typically with ',
        pc.code("renderPage({ userAgent: req.headers['user-agent'] })"),
        ', see https://vike.dev/renderPage)',
      ].join('')
    : pc.code('options.userAgent')
  const errMsg = [
    `HTML streaming (${link}) disabled because User Agent is unknown: make sure to provide`,
    help,
    '(so that HTML streaming can be disabled for bots such as Google Bot).',
  ]
  if (!isVike) {
    errMsg.push(`Or set ${pc.code('options.disable')} to ${pc.code('true')} to suppress this warning.`)
  }
  assertWarning(false, errMsg.join(' '), { onlyOnce: true })
}
