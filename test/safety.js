// Account Safety controller tests. No live WhatsApp connection is used.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thanxie-safety-test-'))
process.env.PLATFORM_DATA_DIR = dataDir
const safety = require('../server/safety')

async function main() {
  const sent = []
  const sock = { async sendMessage(jid, content) { sent.push({ jid, content }); return { key: { id: String(sent.length) } } } }
  safety.attachSocket(sock, { sessionId: 'session-a', accountId: 'account-a', accountRole: 'user' })

  const first = await sock.sendMessage('123@s.whatsapp.net', { text: 'hello' })
  assert.equal(first.key.id, '1')
  await assert.rejects(
    sock.sendMessage('123@s.whatsapp.net', { text: 'hello' }),
    /duplicate message/
  )
  assert.equal(sent.length, 1)

  safety.setAccountPaused('account-a', true)
  await assert.rejects(sock.sendMessage('123@s.whatsapp.net', { text: 'paused' }), /paused/)
  assert.equal(sent.length, 1)
  safety.setAccountPaused('account-a', false)

  // Another account remains independent from account-a's pause state.
  const otherSock = { async sendMessage(jid, content) { sent.push({ jid, content }); return { key: { id: 'other' } } } }
  safety.attachSocket(otherSock, { sessionId: 'session-b', accountId: 'account-b', accountRole: 'user' })
  const otherResult = await otherSock.sendMessage('456@s.whatsapp.net', { text: 'other account' })
  assert.equal(otherResult.key.id, 'other')

  const bounded = safety.updateAccountSettings('account-a', {
    minIntervalMs: 1,
    maxPerMinute: 500,
    duplicateWindowMs: 1,
    maxQueue: 500,
    pauseOnRepeatedErrors: false
  })
  assert.equal(bounded.minIntervalMs, 2000)
  assert.equal(bounded.maxPerMinute, 20)
  assert.equal(bounded.duplicateWindowMs, 10000)
  assert.equal(bounded.maxQueue, 50)
  assert.equal(bounded.pauseOnRepeatedErrors, false)

  safety.setGlobalPaused(true, 'owner-test')
  await assert.rejects(otherSock.sendMessage('456@s.whatsapp.net', { text: 'global pause' }), /paused/)
  safety.setGlobalPaused(false, 'owner-test')
  const snapshot = safety.accountSnapshot('account-a')
  assert.equal(snapshot.account_paused, false)
  assert.equal(snapshot.global_paused, false)
  assert.equal(snapshot.stats.sent, 1)
  assert.ok(snapshot.stats.duplicates >= 1)
  assert.ok(snapshot.stats.failed === 0)
  assert.ok(safety.globalEvents(20).some(item => item.type === 'global_paused'))

  safety.detachSocket('session-a')
  safety.detachSocket('session-b')
  console.log('Account Safety tests passed: per-account isolation, duplicate suppression, pause controls, bounded settings and global emergency pause.')
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => fs.rmSync(dataDir, { recursive: true, force: true }))
