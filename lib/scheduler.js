// lib/scheduler.js
// Real message scheduling: queue a message for a future time, persisted to
// disk so a restart doesn't lose it. index.js calls tick() on an interval.
// This also doubles as an anti-ban technique: instead of the bot firing off
// a burst of messages the moment someone asks, sends are naturally spread
// across time windows the admin chose.

const crypto = require('crypto');
const db = require('../lib/db');

function listSchedules(groupJid) {
  return db.get('schedules', groupJid, []);
}

function addSchedule(groupJid, text, atTimestampMs, options = {}) {
  const list = listSchedules(groupJid);
  const id = crypto.randomBytes(3).toString('hex');
  list.push({
    id, text: String(text), at: Number(atTimestampMs), sent: false,
    title: String(options.title || 'SCHEDULED ANNOUNCEMENT'),
    mentions: Array.isArray(options.mentions) ? options.mentions.filter(Boolean) : [],
    kind: String(options.kind || 'announcement'), attempts: 0
  });
  db.set('schedules', groupJid, list);
  return id;
}

function cancelSchedule(groupJid, id) {
  const list = listSchedules(groupJid).filter((s) => s.id !== id);
  db.set('schedules', groupJid, list);
}

/** Called periodically from index.js; sends anything due and marks it sent. */
const runningScopes = new Set();
async function tick(sock, brandedReply) {
  const scope = db.getDataDir();
  if (runningScopes.has(scope)) return;
  runningScopes.add(scope);
  try {
    const all = db.load('schedules');
    const now = Date.now();
    for (const groupJid of Object.keys(all)) {
      const list = all[groupJid];
      let changed = false;
      for (const s of list) {
        if (!s.sent && s.at <= now) {
          try {
            await sock.sendMessage(groupJid, {
              text: brandedReply(s.title || 'SCHEDULED ANNOUNCEMENT', [s.text]),
              mentions: Array.isArray(s.mentions) ? s.mentions : []
            });
            s.sent = true;
            s.sentAt = Date.now();
            changed = true;
          } catch (error) {
            s.attempts = (s.attempts || 0) + 1;
            s.lastError = String(error.message || error).slice(0, 180);
            s.at = now + Math.min(15000 * (2 ** Math.min(s.attempts - 1, 5)), 15 * 60 * 1000);
            changed = true;
          }
        }
      }
      if (changed) db.set('schedules', groupJid, list.filter((s) => !s.sent || now - (s.sentAt || s.at) < 86400000));
    }
  } finally {
    runningScopes.delete(scope);
  }
}

function parseWhen(input) {
  // Accept "YYYY-MM-DD HH:mm" or relative "+30m" / "+2h" / "+1d"
  const rel = /^\+(\d+)(m|h|d)$/i.exec(input.trim());
  if (rel) {
    const n = parseInt(rel[1], 10);
    const mult = rel[2] === 'm' ? 60000 : rel[2] === 'h' ? 3600000 : 86400000;
    return Date.now() + n * mult;
  }
  const parsed = Date.parse(input);
  return Number.isNaN(parsed) ? null : parsed;
}

module.exports = { listSchedules, addSchedule, cancelSchedule, tick, parseWhen };
