// lib/filters.js
// Reads the toggles set by commands/antiSuite.js and actually enforces them
// against incoming group messages. Runs AFTER antibug.js (security first)
// and BEFORE normal command routing.

const db = require('../lib/db');
const { brandedReply } = require('./brand');
const { RateLimiter } = require('./antiban');

const LINK_RE = /(https?:\/\/|chat\.whatsapp\.com|wa\.me\/)/i;
const INVITE_RE = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

const spamLimiter = new RateLimiter({ windowMs: 10_000, maxPerWindow: 6 });

function getFlag(groupJid, flag) {
  return db.get('groups', `${groupJid}:${flag}`, false);
}

function isWhitelisted(groupJid, sender) {
  return db.get('groups', `${groupJid}:whitelist`, []).includes(sender);
}

function extractText(msg) {
  const m = msg.message || {};
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '';
}

/**
 * Returns a violation reason string, or null if the message is clean.
 * Does NOT apply any penalty itself — index.js decides what to do with it
 * (delete + warn/kick/mute per .antiaction) so logic lives in one place.
 */
function checkViolations(groupJid, msg, sender, isSenderAdmin) {
  if (isSenderAdmin) return null; // admins are exempt by default
  if (isWhitelisted(groupJid, sender)) return null;

  const text = extractText(msg);
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (getFlag(groupJid, 'antiinvite') && INVITE_RE.test(text)) return 'antiinvite: group invite link posted';
  if (getFlag(groupJid, 'antilink') && LINK_RE.test(text)) return 'antilink: link posted';

  if (getFlag(groupJid, 'antibadword')) {
    const badwords = db.get('groups', `${groupJid}:badwords`, []);
    const lower = text.toLowerCase();
    if (badwords.some((w) => w && lower.includes(w))) return 'antibadword: banned word used';
  }

  if (getFlag(groupJid, 'antimention') && mentions.length > 10) return 'antimention: excessive mentions';
  if (getFlag(groupJid, 'anticaps') && text.length > 10) {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    const upper = text.replace(/[^A-Z]/g, '');
    if (letters.length > 10 && upper.length / letters.length > 0.8) return 'anticaps: excessive caps';
  }
  if (getFlag(groupJid, 'antilongtext') && text.length > 2000) return 'antilongtext: message too long';

  if (getFlag(groupJid, 'antimedia') && (msg.message?.imageMessage || msg.message?.videoMessage)) return 'antimedia: media not allowed';
  if (getFlag(groupJid, 'antisticker') && msg.message?.stickerMessage) return 'antisticker: stickers not allowed';
  if (getFlag(groupJid, 'antivoice') && msg.message?.audioMessage?.ptt) return 'antivoice: voice notes not allowed';
  if (getFlag(groupJid, 'antidocument') && msg.message?.documentMessage) return 'antidocument: documents not allowed';
  if (getFlag(groupJid, 'anticontact') && msg.message?.contactMessage) return 'anticontact: contact cards not allowed';
  if (getFlag(groupJid, 'antilocation') && msg.message?.locationMessage) return 'antilocation: location sharing not allowed';
  if (getFlag(groupJid, 'antiviewonce') && msg.message?.viewOnceMessage) return 'antiviewonce: view-once media not allowed';

  if (getFlag(groupJid, 'antispam') && !spamLimiter.allow(`${groupJid}:${sender}`)) return 'antispam: sending too fast';

  return null;
}

async function enforce(sock, groupJid, msg, sender, violation) {
  try {
    await sock.sendMessage(groupJid, { delete: msg.key });
  } catch (_) { /* needs bot-admin to delete; ignore if not */ }

  const action = db.get('groups', `${groupJid}:antiaction`, 'warn');
  const parts = [`Reason : ${violation}`, `Action : ${action}`];

  if (action === 'kick') {
    try { await sock.groupParticipantsUpdate(groupJid, [sender], 'remove'); } catch (_) {}
  } else if (action === 'mute') {
    const key = `${groupJid}:muted`;
    const muted = db.get('groups', key, []);
    if (!muted.includes(sender)) muted.push(sender);
    db.set('groups', key, muted);
  } else {
    const wKey = `modlog`;
    const subkey = `${groupJid}:${sender}`;
    const warns = db.get(wKey, subkey, []);
    warns.push({ by: 'auto-filter', reason: violation, time: Date.now() });
    db.set(wKey, subkey, warns);
  }

  await sock.sendMessage(groupJid, {
    text: brandedReply('FILTER TRIGGERED', [`@${sender.split('@')[0]} violated a group filter.`, ...parts]),
    mentions: [sender]
  });
}

module.exports = { checkViolations, enforce };
