import { chromium } from 'playwright-core'
const OUT = process.argv[2] || 'e2e/shots'
import { mkdirSync } from 'fs'; mkdirSync(OUT, { recursive: true })
const URL = process.env.APP_URL || 'http://localhost:4173'
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
const errors = []
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
p.on('pageerror', (e) => errors.push(String(e)))
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true })

await p.goto(URL + '/')
await p.getByRole('button', { name: 'Get started' }).waitFor()
await p.waitForTimeout(900); await shot('01-welcome')
await p.getByRole('button', { name: 'Get started' }).click()
await p.getByRole('button', { name: 'Continue' }).click() // empty form → errors
await shot('02-details-errors')
await p.fill('#name', 'Maya Okafor'); await p.fill('#age', '34'); await p.fill('#height', '168'); await p.fill('#weight', '72')
await p.getByRole('button', { name: 'Continue' }).click()
await shot('03-goal')
await p.getByRole('button', { name: 'Continue' }).click()
await p.getByRole('button', { name: 'Continue' }).click()
await shot('04-equipment')
await p.getByRole('button', { name: 'Continue' }).click()
await shot('05-final')
await p.getByRole('button', { name: 'Enter my fitness space' }).click()
await p.waitForURL((u) => u.pathname.replace(/\/$/, '') === new globalThis.URL(URL).pathname.replace(/\/$/, ''))
await p.waitForTimeout(500)
await shot('06-dashboard')

// Log today's workout the way a user does: do it at home, then tick it off
await p.goto(URL + '/workouts/full-body')
await p.waitForTimeout(400)
await shot('07-detail')
await p.goto(URL + '/')
await p.getByRole('button', { name: 'All done' }).click()
await p.getByRole('button', { name: 'Continue' }).waitFor()
await p.waitForTimeout(1500)
await shot('08-celebration')
await p.getByRole('button', { name: 'Continue' }).click()
await p.getByRole('radio', { name: '20 min' }).click()
// Untick and re-tick one exercise: must still be a single record
await p.locator('button[aria-pressed]').first().click()
await p.locator('button[aria-pressed]').first().click()
// Beginners: the ? next to an exercise opens an animated demo
await p.getByRole('button', { name: /^How to do / }).first().click()
await p.getByRole('img', { name: /Animated demonstration of/ }).waitFor()
await p.waitForTimeout(900)
await shot('08b-how-to')
await p.keyboard.press('Escape')
// The planned daily walk: one tap, optional distance
await p.getByRole('button', { name: 'Tick off daily walk' }).click()
await p.getByRole('radio', { name: '2 km' }).click()
await p.getByText('Done, 2 km.', { exact: false }).waitFor()
// Log a 10 km walk
await p.getByRole('button', { name: 'Add', exact: true }).click()
await p.getByRole('radio', { name: '10 km' }).click()
await shot('09-add-activity')
await p.getByRole('button', { name: 'Save walk, 10 km' }).click()
await p.getByText('Walk 10 km').waitFor()
await p.waitForTimeout(400)
await shot('11-dashboard-done')

await p.goto(URL + '/progress')
await p.getByRole('button', { name: 'Add a weight entry' }).click()
await p.getByRole('button', { name: 'Add entry' }).waitFor()
await p.locator('dialog[open] input[type=date]').fill('2026-11-01')
await p.locator('dialog[open] input[inputmode=decimal]').fill('73.4')
await p.getByRole('button', { name: 'Add entry' }).click()
await p.waitForTimeout(500)
await shot('12-progress')

await p.goto(URL + '/history'); await p.waitForTimeout(300); await shot('13-history')
await p.getByRole('radio', { name: 'List' }).click(); await shot('14-history-list')
await p.goto(URL + '/workouts'); await p.waitForTimeout(300); await shot('15-workouts')
await p.goto(URL + '/workouts/new'); await p.fill('input[placeholder="Morning wake-up"]', 'Desk break')
await p.getByRole('button', { name: 'Add exercise' }).click()
await p.getByRole('button', { name: /Shoulder rolls/ }).click()
await p.getByRole('button', { name: 'Add exercise' }).click()
await p.getByRole('button', { name: /Bodyweight squat/ }).click()
await shot('16-builder')
await p.getByRole('button', { name: 'Save workout' }).click()
await p.waitForURL(/custom-/); await shot('17-custom-detail')
await p.goto(URL + '/profile'); await p.waitForTimeout(300); await shot('18-profile')

// error paths: friendly not-found screens and a rejected import
for (const path of ['/workouts/does-not-exist']) {
  await p.goto(URL + path)
  await p.getByText(/isn’t here any more/).waitFor()
}
await p.goto(URL + '/profile')
await p.locator('input[type=file][accept*=json]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"other"}') })
await p.getByText('Nothing on this device was changed.').waitFor()
await shot('20-import-error')
console.log('error paths: ok')

// persistence across reload
await p.reload(); await p.goto(URL + '/'); await p.waitForTimeout(500)
const greeting = await p.locator('h1').first().textContent()
const sessionsCount = await p.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('groundwork'); r.onsuccess = () => { const t = r.result.transaction('sessions').objectStore('sessions').count(); t.onsuccess = () => res(t.result) }
}))
console.log('after reload h1:', greeting, '| sessions:', sessionsCount, sessionsCount === 3 ? '(workout + daily walk + extra walk, no duplicates)' : '(UNEXPECTED)')

for (const [w, h] of [[375, 812], [390, 844], [768, 1024]]) {
  await p.setViewportSize({ width: w, height: h })
  for (const path of ['/', '/history', '/progress', '/workouts']) {
    await p.goto(URL + path); await p.waitForTimeout(400)
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (overflow > 0) console.log(`OVERFLOW ${w}px ${path}: ${overflow}px`)
    await shot(`m${w}${path.replace(/\//g, '_') || '_home'}`)
  }
}
// dark mode check
await p.setViewportSize({ width: 1440, height: 900 })
await p.evaluate(() => { localStorage.setItem('gw.prefs', JSON.stringify({ theme: 'dark' })) })
await p.goto(URL + '/'); await p.waitForTimeout(400); await shot('19-dark')
console.log('console errors:', errors.length ? errors : 'none')
await b.close()
if (errors.length) process.exit(1)
