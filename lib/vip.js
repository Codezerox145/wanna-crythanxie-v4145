const crypto = require('node:crypto');
const db = require('./db');
function state() { return db.get('vip', 'runtime', { passlock: null, unlockedUntil: 0, audit: [] }); }
function save(s) { db.set('vip', 'runtime', s); return s; }
function audit(s, event, actor) {
  s.audit = Array.isArray(s.audit) ? s.audit : [];
  s.audit.push({ event, actor: String(actor || '').slice(0, 80), at: Date.now() });
  if (s.audit.length > 200) s.audit = s.audit.slice(-200);
}
function durationMs(value) {
  const match = /^(\d{1,4})(m|h|d)$/i.exec(String(value || ''));
  if (!match) throw new Error('Use 1h, 24h or 7d.');
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms = n * (unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000);
  if (!Number.isSafeInteger(ms) || ms < 60000 || ms > 365 * 86400000) throw new Error('Duration must be between one minute and 365 days.');
  return ms;
}
function createPasslock(owner, duration) {
  const ms = durationMs(duration);
  const code = crypto.randomBytes(5).toString('hex').toUpperCase();
  const s = state();
  s.passlock = { hash: crypto.createHash('sha256').update(code).digest('hex'), expiresAt: Date.now() + ms, durationMs: ms, used: false, revoked: false, owner: String(owner || '') };
  audit(s, 'passlock_created', owner); save(s);
  return { passlock: code, expiresAt: s.passlock.expiresAt };
}
function unlock(actor, code) {
  const s = state();
  const p = s.passlock;
  const hash = crypto.createHash('sha256').update(String(code || '')).digest('hex');
  if (!p || String(actor || '') !== String(p.owner || '') || p.revoked || p.used || p.expiresAt < Date.now() || hash !== p.hash) return { ok: false, reason: 'The passlock is invalid, expired, revoked or already used.' };
  p.used = true;
  s.unlockedUntil = Date.now() + p.durationMs;
  audit(s, 'vip_unlocked', actor); save(s);
  return { ok: true, expiresAt: s.unlockedUntil };
}
function isUnlocked() { return Number(state().unlockedUntil || 0) > Date.now(); }
function info() {
  const s = state();
  return { unlocked: Number(s.unlockedUntil || 0) > Date.now(), unlockedUntil: s.unlockedUntil || 0, passlock: s.passlock ? { expiresAt: s.passlock.expiresAt, revoked: !!s.passlock.revoked, used: !!s.passlock.used } : null };
}
function lock(actor) { const s = state(); s.unlockedUntil = 0; audit(s, 'vip_locked', actor); save(s); }
function revoke(actor) { const s = state(); if (s.passlock) s.passlock.revoked = true; s.unlockedUntil = 0; audit(s, 'passlock_revoked', actor); save(s); }
function auditLog() { return state().audit || []; }
function isPending() { return false; }
function clearPending() {}
function redeemKey() { return { ok: false, reason: 'Key redemption is not enabled in this deployment.' }; }
module.exports = { createPasslock, unlock, isUnlocked, info, lock, revoke, auditLog, isPending, clearPending, redeemKey };
