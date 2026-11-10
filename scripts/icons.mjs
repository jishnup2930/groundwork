// Builds the app icons from one SVG walking figure. Run: node scripts/icons.mjs (needs Chrome at /usr/bin/google-chrome)
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const figure = `<g fill="none" stroke="#fff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round">
  <path d="M262 186 L240 296"/>
  <path d="M240 296 L292 352 L318 428"/>
  <path d="M240 296 L214 364 L166 412"/>
  <path d="M258 206 L306 254 L346 240"/>
  <path d="M258 206 L216 252 L200 300"/>
</g><circle cx="276" cy="124" r="40" fill="#fff"/>`

// rx for the tab/home icons; maskable is full-bleed and shrunk into the 80% safe zone
const svg = (rounded, scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512"${rounded ? ' rx="112"' : ''} fill="#000"/><g transform="translate(256 270) scale(${scale}) translate(-256 -270)">${figure}</g></svg>`

writeFileSync('public/icon.svg', svg(true))
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const page = await browser.newPage()
for (const [file, size, s] of [['icon-192.png', 192, svg(true)], ['icon-512.png', 512, svg(true)], ['icon-512-maskable.png', 512, svg(false, 0.72)], ['apple-touch-icon.png', 180, svg(false)]]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>*{margin:0}body{background:transparent}</style><img src="data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}" width="${size}" height="${size}">`)
  await page.screenshot({ path: `public/${file}`, omitBackground: true })
}
await browser.close()
