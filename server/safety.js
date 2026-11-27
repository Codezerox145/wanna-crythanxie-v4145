'use strict';

// Conservative outbound safeguards for each independently paired WhatsApp account.
// These controls reduce accidental automation bursts; they cannot guarantee that
// WhatsApp will never restrict an account.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_DIR = path.resolve(process.env.PLATFORM_DATA_DIR || './platform_data');
const STATE_FILE = path.join(DATA_DIR, 'safety.json');
const runtimes = new Map();
const DEFAULTS = Object.freeze({
  minIntervalMs: 2500,
  maxPerMinute: 20,
  duplicateWindowMs: 30000,
  maxQueue: 30,
  pauseOnRepeatedErrors: true
});

function freshState() {
  return { globalPaused: false, accounts: {}, stats: {}, events: [] };
}
function readState() {
  try {
    const value = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!value || typeof value !== 'object') return freshState();
    return {
      globalPaused: Boolean(value.globalPaused),
      accounts: value.accounts && typeof value.accounts === 'object' ? value.accounts : {},
      stats: value.stats && typeof value.stats === 'object' ? value.stats : {},
      events: Array.isArray(value.events) ? value.events.slice(-1000) : []
    };
  } catch (_) { return freshState(); }
}
function writeState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = STATE_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(temp, STATE_FILE);
}
function cleanAccountId(value) {
  return String(value || '').trim().slice(0, 128);
}
function accountSettings(accountId, state = readState()) {
  const saved = state.accounts[cleanAccountId(accountId)] || {};
  return { ...DEFAULTS, ...saved };
}
function statsFor(accountId, state) {
  const id = cleanAccountId(accountId);
  if (!state.stats[id]) state.stats[id] = { sent: 0, blocked: 0, failed: 0, duplicates: 0, auto_pauses: 0 };
  return state.stats[id];
}
function event(accountId, sessionId, type, detail = '') {
  const state = readState();
  const stats = statsFor(accountId, state);
  if (type === 'sent') stats.sent++;
  if (type === 'blocked' || type === 'duplicate') stats.blocked++;
  if (type === 'failed') stats.failed++;
  if (type === 'duplicate') stats.duplicates++;
  if (type === 'auto_pause') stats.auto_pauses++;
  const row = {
    id: crypto.randomUUID(),
    account_id: cleanAccountId(accountId),
    session_id: String(sessionId || '').slice(0, 128),
    type: String(type).slice(0, 40),
    detail: String(detail || '').slice(0, 180),
    created_at: new Date().toISOString()
  };
  state.events.push(row);
  state.events = state.events.slice(-1000);
  stats.updated_at = row.created_at;
  writeState(state);
  return row;
}
function updateAccountSettings(accountId, patch = {}) {
  const id = cleanAccountId(accountId);
  if (!id) throw new Error('Account identity is required.');
  const state = readState();
  const previous = accountSettings(id, state);
  const next = { ...previous };
  if (Number.isFinite(Number(patch.minIntervalMs))) next.minIntervalMs = Math.max(2000, Math.min(15000, Math.round(Number(patch.minIntervalMs))));
  if (Number.isFinite(Number(patch.maxPerMinute))) next.maxPerMinute = Math.max(4, Math.min(20, Math.round(Number(patch.maxPerMinute))));
  if (Number.isFinite(Number(patch.duplicateWindowMs))) next.duplicateWindowMs = Math.max(10000, Math.min(120000, Math.round(Number(patch.duplicateWindowMs))));
  if (Number.isFinite(Number(patch.maxQueue))) next.maxQueue = Math.max(5, Math.min(50, Math.round(Number(patch.maxQueue))));
  if (typeof patch.pauseOnRepeatedErrors === 'boolean') next.pauseOnRepeatedErrors = patch.pauseOnRepeatedErrors;
  // Safeguards remain enabled. Pausing is explicit and separately audited.
  state.accounts[id] = { ...next, paused: Boolean(previous.paused) };
  writeState(state);
  event(id, '', 'settings_updated', 'Account safety settings updated');
  return accountSettings(id);
}
function setAccountPaused(accountId, paused, actorId = '') {
  const id = cleanAccountId(accountId);
  if (!id) throw new Error('Account identity is required.');
  const state = readState();
  const current = accountSettings(id, state);
  state.accounts[id] = { ...current, paused: Boolean(paused) };
  writeState(state);
  event(id, '', paused ? 'account_paused' : 'account_resumed', actorId ? 'Changed by an authorized owner' : 'Changed by account owner');
  for (const runtime of runtimes.values()) {
    if (runtime.accountId === id && paused) flushQueue(runtime, new Error('Outbound automation is paused for this account.'));
  }
  return accountSettings(id);
}
function setGlobalPaused(paused, actorId = '') {
  const state = readState();
  state.globalPaused = Boolean(paused);
  writeState(state);
  event('global', '', paused ? 'global_paused' : 'global_resumed', actorId ? 'Changed by owner' : 'Changed by owner');
  if (paused) {
    for (const runtime of runtimes.values()) flushQueue(runtime, new Error('Outbound automation is globally paused by the owner.'));
  }
  return state.globalPaused;
}
function accountSnapshot(accountId) {
  const state = readState();
  const id = cleanAccountId(accountId);
  const settings = accountSettings(id, state);
  const stats = state.stats[id] || { sent: 0, blocked: 0, failed: 0, duplicates: 0, auto_pauses: 0 };
  const sessions = [...runtimes.values()].filter(item => item.accountId === id);
  return {
    global_paused: state.globalPaused,
    account_paused: Boolean(settings.paused),
    settings: {
      min_interval_ms: settings.minIntervalMs,
      max_per_minute: settings.maxPerMinute,
      duplicate_window_ms: settings.duplicateWindowMs,
      max_queue: settings.maxQueue,
      pause_on_repeated_errors: settings.pauseOnRepeatedErrors
    },
    stats: { ...stats },
    active_sessions: sessions.length,
    automatic_pauses: sessions.filter(item => item.pausedUntil > Date.now()).map(item => ({ session_id: item.sessionId, until: new Date(item.pausedUntil).toISOString() }))
  };
}
function globalSnapshot() {
  const state = readState();
  return {
    paused: state.globalPaused,
    monitored_sessions: runtimes.size,
    accounts_with_settings: Object.keys(state.accounts).length,
    recent_events: state.events.slice(-100).reverse()
  };
}
function accountEvents(accountId, limit = 100) {
  const id = cleanAccountId(accountId);
  return readState().events.filter(item => item.account_id === id).slice(-Math.max(1, Math.min(200, Number(limit) || 100))).reverse();
}
function globalEvents(limit = 200) {
  return readState().events.slice(-Math.max(1, Math.min(300, Number(limit) || 200))).reverse();
}
function messageSignature(jid, content) {
  if (!content || typeof content !== 'object') return null;
  const marker = content.text || content.caption || content.poll?.name || content.templateMessage?.hydratedTemplate?.hydratedContentText;
  if (!marker) return null;
  return crypto.createHash('sha256').update(String(jid) + '|' + String(marker).trim().replace(/\\s+/g, ' ').slice(0, 1200)).digest('hex');
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
}
function flushQueue(runtime, error) {
  for (const item of runtime.queue.splice(0)) item.reject(error);
}
function attachSocket(sock, { sessionId, accountId, accountRole = 'user' }) {
  if (!sock || typeof sock.sendMessage !== 'function') return;
  const id = String(sessionId || '');
  const owner = cleanAccountId(accountId);
  const originalSend = sock.sendMessage.bind(sock);
  const runtime = {
    sessionId: id, accountId: owner, accountRole, queue: [], pumping: false,
    lastSentAt: 0, sentAt: [], recent: new Map(), consecutiveFailures: 0,
    pausedUntil: 0, originalSend
  };
  runtimes.set(id, runtime);

  sock.sendMessage = (jid, content, options) => new Promise((resolve, reject) => {
    const state = readState();
    const config = accountSettings(owner, state);
    const now = Date.now();
    if (state.globalPaused || config.paused || runtime.pausedUntil > now) {
      event(owner, id, 'blocked', state.globalPaused ? 'Global safety pause' : config.paused ? 'Account safety pause' : 'Temporary automatic pause');
      reject(new Error('Outbound automation is paused by Account Safety.'));
      return;
    }
    if (runtime.queue.length >= config.maxQueue) {
      event(owner, id, 'blocked', 'Outbound queue capacity reached');
      reject(new Error('Account Safety queue is full. Wait for pending messages to finish.'));
      return;
    }
    const signature = messageSignature(jid, content);
    if (signature) {
      const previous = runtime.recent.get(signature);
      if (previous && now - previous < config.duplicateWindowMs) {
        event(owner, id, 'duplicate', 'Duplicate message suppressed');
        reject(new Error('Account Safety blocked a duplicate message.'));
        return;
      }
      runtime.recent.set(signature, now);
    }
    runtime.queue.push({ jid, content, options, signature, resolve, reject });
    pump(runtime).catch(error => {
      // pump handles individual failures; this catch prevents an unhandled rejection.
      event(owner, id, 'queue_error', String(error.message || 'Queue processing error'));
    });
  });

  return runtime;
}
async function pump(runtime) {
  if (runtime.pumping) return;
  runtime.pumping = true;
  try {
    while (runtime.queue.length) {
      const state = readState();
      const config = accountSettings(runtime.accountId, state);
      if (state.globalPaused || config.paused || runtime.pausedUntil > Date.now()) {
        flushQueue(runtime, new Error('Outbound automation is paused by Account Safety.'));
        break;
      }
      const item = runtime.queue[0];
      const now = Date.now();
      runtime.sentAt = runtime.sentAt.filter(time => now - time < 60000);
      const intervalWait = Math.max(0, runtime.lastSentAt + config.minIntervalMs - now);
      const minuteWait = runtime.sentAt.length >= config.maxPerMinute ? Math.max(0, runtime.sentAt[0] + 60000 - now) : 0;
      await delay(Math.max(intervalWait, minuteWait));
      if (runtime.queue[0] !== item) continue;
      const latest = readState();
      const latestConfig = accountSettings(runtime.accountId, latest);
      if (latest.globalPaused || latestConfig.paused || runtime.pausedUntil > Date.now()) {
        flushQueue(runtime, new Error('Outbound automation is paused by Account Safety.'));
        break;
      }
      runtime.queue.shift();
      try {
        const result = await runtime.originalSend(item.jid, item.content, item.options);
        const sentAt = Date.now();
        runtime.lastSentAt = sentAt;
        runtime.sentAt.push(sentAt);
        runtime.consecutiveFailures = 0;
        if (item.signature) runtime.recent.set(item.signature, sentAt);
        event(runtime.accountId, runtime.sessionId, 'sent', 'WhatsApp accepted an outbound message');
        item.resolve(result);
      } catch (error) {
        runtime.consecutiveFailures++;
        if (item.signature) runtime.recent.delete(item.signature);
        event(runtime.accountId, runtime.sessionId, 'failed', String(error.message || 'WhatsApp send failed'));
        item.reject(error);
        if (latestConfig.pauseOnRepeatedErrors && runtime.consecutiveFailures >= 3) {
          runtime.pausedUntil = Date.now() + 120000;
          event(runtime.accountId, runtime.sessionId, 'auto_pause', 'Three consecutive send failures; paused for two minutes');
          flushQueue(runtime, new Error('Account Safety paused this session after repeated send failures.'));
          runtime.consecutiveFailures = 0;
        }
      }
    }
  } finally {
    runtime.pumping = false;
    if (runtime.queue.length) pump(runtime).catch(() => {});
  }
}
function detachSocket(sessionId) {
  const runtime = runtimes.get(String(sessionId || ''));
  if (!runtime) return false;
  flushQueue(runtime, new Error('WhatsApp session is reconnecting.'));
  runtimes.delete(String(sessionId || ''));
  return true;
}
function listAccountRuntime() {
  return [...runtimes.values()].map(item => ({
    session_id: item.sessionId, account_id: item.accountId, account_role: item.accountRole,
    queued_messages: item.queue.length, automatic_pause_until: item.pausedUntil ? new Date(item.pausedUntil).toISOString() : null
  }));
}

module.exports = {
  DEFAULTS, updateAccountSettings, setAccountPaused, setGlobalPaused,
  accountSnapshot, globalSnapshot, accountEvents, globalEvents,
  attachSocket, detachSocket, listAccountRuntime
};
