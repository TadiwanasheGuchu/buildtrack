// Verify /help renders, FAQ expands, search filters (demo mode, headless).
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

  // Sidebar link → /help
  await page.locator('aside').locator('text=Help Center').click()
  await page.waitForTimeout(800)
  check('sidebar link navigates to /help', page.url().endsWith('/help'), page.url())
  check('heading renders', await page.locator('h1', { hasText: 'Help Center' }).isVisible().catch(() => false))

  // Expand an FAQ
  const faq = page.locator('text=How does project progress work?')
  check('FAQ question visible', await faq.isVisible().catch(() => false))
  await faq.click()
  await page.waitForTimeout(300)
  check('FAQ answer expands', await page.locator('text=percentage of milestones marked complete').isVisible().catch(() => false))

  // Search filter
  await page.fill('input[placeholder="Search help topics…"]', 'over budget')
  await page.waitForTimeout(400)
  check('search filters to budget topic', await page.locator('text=What happens when a project goes over budget?').isVisible().catch(() => false))
  check('unrelated section hidden', !(await page.locator('text=How do I invite someone').isVisible().catch(() => false)))

  await page.fill('input[placeholder="Search help topics…"]', 'zzz-nothing')
  await page.waitForTimeout(400)
  check('no-match state shown', await page.locator('text=No help topics match').isVisible().catch(() => false))

  await page.screenshot({ path: 'c:/Dev/buildtrack/verify-screenshots/help-center.png' })
} catch (e) {
  failed++
  console.log('SCRIPT ERROR:', e.message)
}

check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200))
console.log(`\n${passed} passed, ${failed} failed`)
await browser.close()
vite.kill('SIGTERM')
process.exit(failed > 0 ? 1 : 0)
