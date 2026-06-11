import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:5601'
const SHOTS = 'c:/Dev/buildtrack/verify-screenshots'
mkdirSync(SHOTS, { recursive: true })

let passed = 0, failed = 0, findings = []
const consoleErrors = []

function log(icon, label, detail = '') {
  console.log(`${icon} ${label}${detail ? '  →  ' + detail : ''}`)
}
function pass(label, detail = '') { passed++; log('✅', label, detail) }
function fail(label, detail = '') { failed++; log('❌', label, detail) }
function probe(label, detail = '') { log('🔍', label, detail) }
function warn(label, detail = '') { findings.push(`⚠️  ${label}${detail ? ': ' + detail : ''}`); log('⚠️ ', label, detail) }

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()

// Capture browser console errors
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', err => consoleErrors.push(err.message))

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}

async function waitForReact(timeout = 8000) {
  await page.waitForLoadState('domcontentloaded')
  // Wait for React root to have content
  await page.waitForSelector('#root > *', { timeout })
}

// ─── 1. Unauthenticated / → /login ────────────────────────────────────────
await page.goto(BASE + '/')
try {
  await page.waitForURL('**/login', { timeout: 8000 })
  pass('Unauthenticated / → redirected to /login', page.url())
} catch {
  await shot('ERR-01-no-redirect')
  fail('Unauthenticated / → should redirect to /login', page.url())
}

// ─── 2. Login page renders ─────────────────────────────────────────────────
await page.goto(BASE + '/login')
await waitForReact()
await shot('01-login-page')

const brand   = await page.locator('text=TerraConstruct').first().isVisible().catch(() => false)
const emailIn = await page.locator('input[type="email"]').isVisible().catch(() => false)
const passIn  = await page.locator('input[type="password"]').isVisible().catch(() => false)
const submitBtn = await page.locator('button[type="submit"]').isVisible().catch(() => false)

brand   ? pass('Login — brand name visible') : fail('Login — brand name missing')
emailIn ? pass('Login — email input visible') : fail('Login — email input missing')
passIn  ? pass('Login — password input visible') : fail('Login — password input missing')
submitBtn ? pass('Login — submit button visible') : fail('Login — submit button missing')

if (!emailIn) {
  console.log('\nPage HTML snippet:')
  console.log(await page.locator('#root').innerHTML().catch(() => 'could not read'))
  await browser.close()
  process.exit(1)
}

// ─── 3. Validation — empty submit ─────────────────────────────────────────
probe('Validation — click submit with empty fields')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(400)
const emptyErr = await page.locator('text=valid email').first().isVisible().catch(() => false)
emptyErr
  ? pass('Validation — empty email error shown')
  : fail('Validation — no error on empty submit')

// ─── 4. Validation — bad email format ─────────────────────────────────────
probe('Validation — fill bad email, click submit')
await page.locator('input[type="email"]').fill('notanemail')
await page.locator('input[type="password"]').fill('x')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(400)
const badEmailErr = await page.locator('text=valid email').first().isVisible().catch(() => false)
badEmailErr
  ? pass('Validation — invalid email format caught')
  : fail('Validation — invalid email not caught')

// ─── 5. Demo login → dashboard ────────────────────────────────────────────
await page.locator('input[type="email"]').fill('test@buildtrack.co.za')
await page.locator('input[type="password"]').fill('password123')
await page.locator('button[type="submit"]').click()
try {
  await page.waitForURL(u => !u.includes('/login'), { timeout: 8000 })
  await waitForReact()
  await shot('02-dashboard-after-login')
  pass('Demo login → dashboard', page.url())
} catch {
  await shot('ERR-05-login-failed')
  fail('Demo login → did not navigate away from /login', page.url())
}

// ─── 6. Dashboard content ─────────────────────────────────────────────────
const dashHeading = await page.locator('text=Executive Overview').isVisible().catch(() => false)
const sideNav     = await page.locator('aside').isVisible().catch(() => false)
dashHeading ? pass('Dashboard — "Executive Overview" heading visible') : fail('Dashboard — heading missing')
sideNav     ? pass('Dashboard — sidebar visible') : fail('Dashboard — sidebar missing')

// ─── 7. User name in sidebar ──────────────────────────────────────────────
probe('Check sidebar for user name')
const userInSidebar = await page.locator('aside').locator('text=Thabo').isVisible().catch(() => false)
userInSidebar
  ? pass('SideNav — shows authenticated user name (Thabo)')
  : warn('SideNav — user name not found in sidebar')

// ─── 8. Navigate to Site Feed ─────────────────────────────────────────────
await page.locator('aside').locator('text=Project Site Feed').click()
try {
  await page.waitForURL('**/site-feed', { timeout: 5000 })
  await waitForReact()
  await shot('03-site-feed')
  const feedH = await page.locator('text=Daily Activity Stream').isVisible().catch(() => false)
  feedH ? pass('Site Feed — "Daily Activity Stream" heading visible') : fail('Site Feed — heading missing')
} catch {
  fail('Site Feed — navigation failed or URL wrong', page.url())
}

// ─── 9. Back to Dashboard ─────────────────────────────────────────────────
await page.locator('aside').locator('text=Executive Dashboard').click()
await page.waitForURL(u => !u.includes('site-feed'), { timeout: 5000 }).catch(() => {})
await waitForReact()
const backDash = await page.locator('text=Executive Overview').isVisible().catch(() => false)
backDash ? pass('Navigation — return to Dashboard works') : fail('Navigation — Dashboard heading missing')

// ─── 10. Profile dropdown + Logout ────────────────────────────────────────
probe('Open profile dropdown in sidebar')
// Try clicking the bottom profile button in aside
const profileBtn = page.locator('aside button').last()
const profileVisible = await profileBtn.isVisible().catch(() => false)
if (profileVisible) {
  await profileBtn.click()
  await page.waitForTimeout(400)
  await shot('04-profile-dropdown')
  const logoutItem = page.locator('[role="menuitem"]', { hasText: /log out/i })
  const hasLogout = await logoutItem.isVisible().catch(() => false)
  if (hasLogout) {
    pass('Profile dropdown — "Log out" item visible')
    await logoutItem.click()
    try {
      await page.waitForURL('**/login', { timeout: 5000 })
      pass('Logout → redirected to /login', page.url())
    } catch {
      fail('Logout → did not redirect to /login', page.url())
    }
    await shot('05-after-logout')
  } else {
    warn('Profile dropdown opened but no "Log out" menuitem found')
  }
} else {
  warn('Could not find profile button in sidebar')
}

// ─── 11. Protected route after logout ─────────────────────────────────────
probe('Hit protected route after logout')
await page.goto(BASE + '/')
try {
  await page.waitForURL('**/login', { timeout: 5000 })
  pass('Post-logout — / correctly redirects to /login')
} catch {
  fail('Post-logout — / did not redirect to /login', page.url())
}

// ─── 12. Register page ────────────────────────────────────────────────────
await page.goto(BASE + '/register')
await waitForReact()
await shot('06-register')
const regH   = await page.locator('text=Create your account').isVisible().catch(() => false)
const compIn = await page.locator('input').first().isVisible().catch(() => false)
regH  ? pass('Register — heading visible') : fail('Register — heading missing')
compIn ? pass('Register — first input (company name) visible') : fail('Register — inputs missing')

probe('Register — empty submit triggers validation')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(400)
const regErr = await page.locator('text=at least 2').first().isVisible().catch(() => false)
regErr ? pass('Register validation — min-length error shown') : fail('Register validation — error not shown')

// ─── 13. Forgot password ──────────────────────────────────────────────────
await page.goto(BASE + '/forgot-password')
await waitForReact()
await shot('07-forgot-password')
const fpH = await page.locator('text=Reset your password').isVisible().catch(() => false)
fpH ? pass('Forgot Password — heading visible') : fail('Forgot Password — heading missing')

probe('Forgot password — submit valid email → success state')
await page.locator('input[type="email"]').fill('test@buildtrack.co.za')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(1000)
await shot('08-forgot-password-sent')
const sentMsg = await page.locator('text=Check your inbox').isVisible().catch(() => false)
sentMsg ? pass('Forgot Password — success/sent state shown') : fail('Forgot Password — success state missing')

// ─── Console errors report ─────────────────────────────────────────────────
if (consoleErrors.length) {
  findings.push(`⚠️  ${consoleErrors.length} browser console error(s) detected`)
  consoleErrors.slice(0, 5).forEach(e => findings.push(`   • ${e.slice(0, 120)}`))
}

// ─── Summary ───────────────────────────────────────────────────────────────
await browser.close()
console.log('\n' + '─'.repeat(55))
console.log(`Passed: ${passed}   Failed: ${failed}`)
if (findings.length) {
  console.log('\nFindings:')
  findings.forEach(f => console.log(f))
}
console.log(`\nScreenshots → ${SHOTS}`)
console.log(failed === 0 ? '\n✅ PASS' : `\n❌ FAIL — ${failed} check(s) failed`)
process.exit(failed > 0 ? 1 : 0)
