// Verify TopNav project search + tab links work (demo mode, headless).
import { spawn } from 'child_process'
import { chromium } from 'playwright'

const PORT = 5601
const BASE = `http://localhost:${PORT}`
let passed = 0, failed = 0
const check = (label, ok, detail = '') => {
  ok ? passed++ : failed++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  → ' + detail : ''}`)
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: 'c:/Dev/buildtrack',
  env: { ...process.env, VITE_DEMO_MODE: 'true' },
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
for (let i = 0; i < 60; i++) {
  try { await fetch(BASE); break } catch { await new Promise(r => setTimeout(r, 500)) }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))

try {
  await page.goto(BASE + '/login', { timeout: 120000, waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]', { timeout: 60000 })
  await page.fill('input[type="email"]', 'test@buildtrack.co.za')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 })
  console.log('== logged in (dashboard) ==')

  // 1. Search: type a demo project name fragment
  const search = page.locator('input[placeholder="Search projects..."]')
  await search.fill('harare')
  await page.waitForTimeout(800)
  const result = page.locator('text=Harare High-Rise Extension').first()
  check('search dropdown shows match', await result.isVisible().catch(() => false))
  await result.click()
  await page.waitForTimeout(800)
  check('clicking result navigates to project', page.url().includes('/projects/'), page.url())
  await page.screenshot({ path: 'c:/Dev/buildtrack/verify-screenshots/search-result-nav.png' })

  // 2. Tabs: back to dashboard, click Analytics → /reports
  await page.goto(BASE + '/')
  await page.waitForSelector('header', { timeout: 15000 })
  await page.locator('header').locator('text=Analytics').first().click()
  await page.waitForTimeout(600)
  check('Analytics tab → /reports', page.url().endsWith('/reports'), page.url())

  // 3. Fleet tab → /resources?tab=fleet with Fleet tab active
  await page.goto(BASE + '/')
  await page.waitForSelector('header', { timeout: 15000 })
  await page.locator('header').locator('text=Fleet').first().click()
  await page.waitForTimeout(800)
  check('Fleet tab → /resources?tab=fleet', page.url().includes('/resources?tab=fleet'), page.url())
  const fleetActive = await page.locator('[role="tab"][data-state="active"]', { hasText: 'Fleet' }).isVisible().catch(() => false)
  check('Fleet tab is the active resources tab', fleetActive)
  await page.screenshot({ path: 'c:/Dev/buildtrack/verify-screenshots/fleet-tab-active.png' })

  // 4. Search no-match state
  await page.goto(BASE + '/')
  await page.waitForSelector('header', { timeout: 15000 })
  await page.locator('input[placeholder="Search projects..."]').fill('zzzz-nothing')
  await page.waitForTimeout(800)
  check('no-match message shown', await page.locator('text=No projects match').isVisible().catch(() => false))

  // 5. Enter key navigates to first match
  await page.locator('input[placeholder="Search projects..."]').fill('cape')
  await page.waitForTimeout(600)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  check('Enter navigates to first match', page.url().includes('/projects/'), page.url())
} catch (e) {
  failed++
  console.log('SCRIPT ERROR:', e.message)
}

check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200))
console.log(`\n${passed} passed, ${failed} failed`)
await browser.close()
vite.kill('SIGTERM')
process.exit(failed > 0 ? 1 : 0)
