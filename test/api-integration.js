// API integration smoke tests. Uses isolated temporary storage and never
// creates or starts a WhatsApp session.
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const bcrypt = require('bcryptjs')
const net = require('node:net')

const root = path.join(__dirname, '..')
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thanxie-api-test-'))
const secret = 'test-only-secret-with-at-least-32-characters'
let child

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port
      probe.close(error => error ? reject(error) : resolve(port))
    })
  })
}

async function waitForApi(url) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error('API process exited before becoming healthy')
    try {
      const response = await fetch(url + '/health')
      if (response.ok) return response
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('API did not become healthy within 10 seconds')
}

async function main() {
  const port = await freePort()
  const base = 'http://127.0.0.1:' + port
  const ownerPassword = 'owner-test-password'
  const ownerHash = await bcrypt.hash(ownerPassword, 4)
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([{
    id: 'owner-test-id', email: 'owner@example.com', password_hash: ownerHash,
    created_at: new Date().toISOString()
  }]))
  child = spawn(process.execPath, [path.join(root, 'server', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      JWT_SECRET: secret,
      PLATFORM_DATA_DIR: dataDir,
      DASHBOARD_ORIGIN: 'https://dashboard.example',
      OWNER_EMAILS: 'owner@example.com',
      SERVER_REGISTRY_JSON: JSON.stringify([{ id: 'current-api', name: 'Primary API' }])
    },
    stdio: 'ignore'
  })

  const healthResponse = await waitForApi(base)
  const health = await healthResponse.json()
  assert.equal(health.ok, true)
  assert.equal(health.status, 'ok')
  assert.equal(health.service, 'wanna-cry-thanxiee-api')

  const preflight = await fetch(base + '/sessions', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://dashboard.example',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization'
    }
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://dashboard.example')
  assert.equal(preflight.headers.get('access-control-allow-methods').includes('GET'), true)

  const deniedOrigin = await fetch(base + '/health', { headers: { Origin: 'https://untrusted.example' } })
  assert.equal(deniedOrigin.headers.get('access-control-allow-origin'), null)

  const disabledSignup = await fetch(base + '/auth/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'first@example.com', password: 'strong-password-123' })
  })
  assert.equal(disabledSignup.status, 410)

  const guest = await fetch(base + '/auth/guest', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
  })
  assert.equal(guest.status, 201)
  const loggedIn = await guest.json()
  assert.ok(loggedIn.token)
  assert.match(loggedIn.user.email, /@guest\.local$/)
  assert.equal(loggedIn.user.is_owner, false)
  assert.equal(Object.hasOwn(loggedIn.user, 'password_hash'), false)

  const invalidSession = await fetch(base + '/sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + loggedIn.token },
    body: JSON.stringify({ phoneNumber: '123', region: 'auto', communitySupportConfirmed: true })
  })
  assert.equal(invalidSession.status, 400)

  const normalOwnerPanel = await fetch(base + '/owner/overview', {
    headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(normalOwnerPanel.status, 403)

  const registry = await fetch(base + '/servers', {
    headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(registry.status, 200)
  assert.equal((await registry.json()).total, 1)

  const unauthorized = await fetch(base + '/sessions')
  assert.equal(unauthorized.status, 401)

  const chatUnauthorized = await fetch(base + '/chat/conversations')
  assert.equal(chatUnauthorized.status, 401)

  const chatMessagesUnauthorized = await fetch(base + '/chat/messages?sessionId=missing&chatJid=263780706629@s.whatsapp.net')
  assert.equal(chatMessagesUnauthorized.status, 401)

  const sessions = await fetch(base + '/sessions', {
    headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(sessions.status, 200)
  assert.deepEqual((await sessions.json()).sessions, [])

  const runtime = await fetch(base + '/runtime', {
    headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(runtime.status, 200)
  assert.equal((await runtime.json()).max_sessions_per_account, 3)

  const safetyMe = await fetch(base + '/safety/me', {
    headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(safetyMe.status, 200)
  const safetyData = await safetyMe.json()
  assert.equal(safetyData.role, 'user')
  assert.equal(safetyData.account.account_paused, false)
  assert.equal(safetyData.account.settings.min_interval_ms, 2500)

  const savedSafety = await fetch(base + '/safety/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + loggedIn.token },
    body: JSON.stringify({ minIntervalMs: 1, maxPerMinute: 999, duplicateWindowMs: 1, maxQueue: 999 })
  })
  assert.equal(savedSafety.status, 200)
  const savedSafetyData = await savedSafety.json()
  assert.equal(savedSafetyData.account.settings.min_interval_ms, 2000)
  assert.equal(savedSafetyData.account.settings.max_per_minute, 20)
  assert.equal(savedSafetyData.account.settings.duplicate_window_ms, 10000)
  assert.equal(savedSafetyData.account.settings.max_queue, 50)

  const safetyPause = await fetch(base + '/safety/pause', {
    method: 'POST', headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(safetyPause.status, 200)
  assert.equal((await safetyPause.json()).account.account_paused, true)
  const safetyResume = await fetch(base + '/safety/resume', {
    method: 'POST', headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(safetyResume.status, 200)
  assert.equal((await safetyResume.json()).account.account_paused, false)

  const guestCannotSeeOwnerSafety = await fetch(base + '/owner/safety', {
    headers: { Authorization: 'Bearer ' + loggedIn.token }
  })
  assert.equal(guestCannotSeeOwnerSafety.status, 403)

  const ownerLogin = await fetch(base + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', password: ownerPassword })
  })
  assert.equal(ownerLogin.status, 200)
  const owner = await ownerLogin.json()
  assert.equal(owner.user.is_owner, true)

  const ownerSafety = await fetch(base + '/owner/safety', {
    headers: { Authorization: 'Bearer ' + owner.token }
  })
  assert.equal(ownerSafety.status, 200)
  const ownerSafetyData = await ownerSafety.json()
  assert.ok(ownerSafetyData.accounts.some(item => item.id === loggedIn.user.id))

  const ownerPausesGuest = await fetch(base + '/owner/safety/accounts/' + encodeURIComponent(loggedIn.user.id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + owner.token },
    body: JSON.stringify({ paused: true })
  })
  assert.equal(ownerPausesGuest.status, 200)
  assert.equal((await ownerPausesGuest.json()).account.account_paused, true)

  const ownerResumesGuest = await fetch(base + '/owner/safety/accounts/' + encodeURIComponent(loggedIn.user.id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + owner.token },
    body: JSON.stringify({ paused: false })
  })
  assert.equal(ownerResumesGuest.status, 200)
  assert.equal((await ownerResumesGuest.json()).account.account_paused, false)

  const globalPause = await fetch(base + '/owner/safety/global', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + owner.token },
    body: JSON.stringify({ paused: true })
  })
  assert.equal(globalPause.status, 200)
  assert.equal((await globalPause.json()).global.paused, true)

  const globalResume = await fetch(base + '/owner/safety/global', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + owner.token },
    body: JSON.stringify({ paused: false })
  })
  assert.equal(globalResume.status, 200)
  assert.equal((await globalResume.json()).global.paused, false)

  console.log('API integration checks passed: health, CORS, guest access, disabled registration, owner-role gating, server registry, sessions and runtime.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    if (child && child.exitCode === null) child.kill('SIGTERM')
    fs.rmSync(dataDir, { recursive: true, force: true })
  })
