import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = process.env.TEST_URL ?? 'http://localhost:5801'
const SHOTS = 'c:/Dev/buildtrack/verify-screenshots'
mkdirSync(SHOTS, { recursive: true })

let passed = 0, failed = 0, findings = []
const consoleErrors = []

const p = (l, d = '') => { passed++; console.log(`✅ ${l}${d ? '  →  ' + d : ''}`) }
const f = (l, d = '') => { failed++; console.log(`❌ ${l}${d ? '  →  ' + d : ''}`) }
const pr = (l, d = '') => console.log(`🔍 ${l}${d ? '  →  ' + d : ''}`)
const w = (l, d = '') => { findings.push(`⚠️  ${l}${d ? ': ' + d : ''}`); console.log(`⚠️  ${l}${d ? '  →  ' + d : ''}`) }

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()

page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', err => consoleErrors.push(err.message))

const shot = name => page.screenshot({ path: `${SHOTS}/${name}.png` })

// Wait for React app to mount and settle
async function waitForApp(ms = 800) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('#root > *', { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(ms)
}

// Wait for SPA navigation — polls window.location.pathname
async function waitForPath(pred, timeout = 6000) {
  const fn = pred instanceof RegExp
    ? `() => ${pred}.test(window.location.pathname)`
    : typeof pred === 'string'
      ? `() => window.location.pathname === '${pred}'`
      : `() => (${pred.toString()})(window.location.pathname)`
  await page.waitForFunction(fn, { timeout })
}

// ─── 1. Unauthenticated / → /login ────────────────────────────────────────
await page.goto(BASE + '/')
await waitForApp()
try {
  await waitForPath('/login')
  p('Unauthenticated / → redirected to /login', page.url())
} catch {
  f('Unauthenticated / → did not redirect to /login', page.url())
}

// ─── 2. Login page ─────────────────────────────────────────────────────────
await page.goto(BASE + '/login')
await waitForApp()
await shot('01-login-page')

const brand   = await page.locator('text=TerraConstruct').first().isVisible().catch(() => false)
const emailIn = await page.locator('input[type="email"]').isVisible().catch(() => false)
const passIn  = await page.locator('input[type="password"]').isVisible().catch(() => false)
const subBtn  = await page.locator('button[type="submit"]').isVisible().catch(() => false)

brand  ? p('Login — TerraConstruct brand visible')    : f('Login — brand missing')
emailIn ? p('Login — email input visible')            : f('Login — email input missing')
passIn  ? p('Login — password input visible')         : f('Login — password input missing')
subBtn  ? p('Login — submit button visible')          : f('Login — submit button missing')

if (consoleErrors.length) console.log('  [console errors]', consoleErrors.join('\n  '))
if (!subBtn) {
  console.log('  [page html]', (await page.locator('#root').innerHTML().catch(() => '')).slice(0, 500))
  await browser.close(); process.exit(1)
}

// ─── 3. Validation — empty submit ─────────────────────────────────────────
pr('Validation — click submit with empty fields')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(400)
await page.locator('text=valid email').first().isVisible().catch(() => false)
  ? p('Validation — empty email error shown')
  : f('Validation — no error on empty submit')

// ─── 4. Validation — bad email format ─────────────────────────────────────
pr('Validation — type bad email then submit')
await page.locator('input[type="email"]').fill('notanemail')
await page.locator('input[type="password"]').fill('x')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(400)
await page.locator('text=valid email').first().isVisible().catch(() => false)
  ? p('Validation — invalid email format caught')
  : f('Validation — bad email not caught')

// ─── 5. Demo login ─────────────────────────────────────────────────────────
await page.locator('input[type="email"]').fill('test@buildtrack.co.za')
await page.locator('input[type="password"]').fill('password123')
await page.locator('button[type="submit"]').click()
try {
  await waitForPath(path => path === '/', 8000)
  await waitForApp()
  await shot('02-dashboard-after-login')
  p('Demo login → dashboard', page.url())
} catch {
  await shot('ERR-login-failed')
  f('Demo login → URL did not reach /', page.url())
}

// ─── 6. Dashboard content ─────────────────────────────────────────────────
await page.locator('text=Executive Overview').isVisible().catch(() => false)
  ? p('Dashboard — "Executive Overview" heading visible')
  : f('Dashboard — heading missing')
await page.locator('aside').isVisible().catch(() => false)
  ? p('Dashboard — sidebar visible')
  : f('Dashboard — sidebar missing')

// ─── 7. User in sidebar ───────────────────────────────────────────────────
pr('SideNav — check for user name')
await page.locator('aside').locator('text=Thabo').isVisible().catch(() => false)
  ? p('SideNav — authenticated user name visible')
  : w('SideNav — user name not found in sidebar')

// ─── 8. Site Feed navigation ──────────────────────────────────────────────
await page.locator('aside').locator('text=Project Site Feed').click()
try {
  await waitForPath('/site-feed', 5000)
  await waitForApp(500)
  await shot('03-site-feed')
  await page.locator('text=Daily Activity Stream').isVisible().catch(() => false)
    ? p('Site Feed — "Daily Activity Stream" heading visible')
    : f('Site Feed — heading missing')
} catch {
  f('Site Feed — navigation failed', page.url())
}

// ─── 9. Back to Dashboard ─────────────────────────────────────────────────
await page.locator('aside').locator('text=Executive Dashboard').click()
await waitForPath('/', 5000).catch(() => {})
await waitForApp(400)
await page.locator('text=Executive Overview').isVisible().catch(() => false)
  ? p('Navigation — back to Dashboard works')
  : f('Navigation — Dashboard heading missing')

// ─── 10. Logout via profile dropdown ──────────────────────────────────────
pr('Open profile dropdown in sidebar')
const profileBtn = page.locator('aside button').last()
await profileBtn.click().catch(e => w('Profile btn click failed', e.message))
await page.waitForTimeout(400)
await shot('04-profile-dropdown')
const logoutItem = page.locator('[role="menuitem"]', { hasText: /log out/i })
if (await logoutItem.isVisible().catch(() => false)) {
  p('Profile dropdown — "Log out" item visible')
  await logoutItem.click()
  try {
    await waitForPath('/login', 5000)
    p('Logout → redirected to /login', page.url())
    await shot('05-after-logout')
  } catch {
    f('Logout → did not reach /login', page.url())
  }
} else {
  w('Dropdown opened but no "Log out" item found')
}

// ─── 11. Protected route after logout ─────────────────────────────────────
pr('Hit protected / after logout')
await page.goto(BASE + '/')
await waitForApp()
try {
  await waitForPath('/login', 5000)
  p('Post-logout — / redirects to /login')
} catch {
  f('Post-logout — / did not redirect', page.url())
}

// ─── 12. Register page ────────────────────────────────────────────────────
await page.goto(BASE + '/register')
await waitForApp()
await shot('06-register')
await page.locator('text=Create your account').isVisible().catch(() => false)
  ? p('Register — heading visible')
  : f('Register — heading missing')
pr('Register — empty submit triggers validation')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(400)
await page.locator('text=at least 2').first().isVisible().catch(() => false)
  ? p('Register validation — min-length error shown')
  : f('Register validation — no error on empty submit')

// ─── 13. Forgot password ──────────────────────────────────────────────────
await page.goto(BASE + '/forgot-password')
await waitForApp()
await shot('07-forgot-password')
await page.locator('text=Reset your password').isVisible().catch(() => false)
  ? p('Forgot Password — heading visible')
  : f('Forgot Password — heading missing')
pr('Forgot password — submit valid email → success state')
await page.locator('input[type="email"]').fill('test@buildtrack.co.za')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(1200)
await shot('08-forgot-password-sent')
await page.locator('text=Check your inbox').isVisible().catch(() => false)
  ? p('Forgot Password — "Check your inbox" success state shown')
  : f('Forgot Password — success state missing')

// ─── Console errors ────────────────────────────────────────────────────────
if (consoleErrors.length) {
  findings.push(`⚠️  ${consoleErrors.length} JS console error(s)`)
  consoleErrors.slice(0, 5).forEach(e => findings.push(`   • ${e.slice(0, 120)}`))
}

// ─── Summary ───────────────────────────────────────────────────────────────
await browser.close()
console.log('\n' + '─'.repeat(55))
console.log(`Passed: ${passed}   Failed: ${failed}`)
if (findings.length) { console.log('\nFindings:'); findings.forEach(f => console.log(f)) }
console.log(`\nScreenshots → ${SHOTS}`)
console.log(failed === 0 ? '\n✅ PASS' : `\n❌ FAIL — ${failed} check(s) failed`)
process.exit(failed > 0 ? 1 : 0)
