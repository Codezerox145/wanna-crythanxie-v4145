// lib/antibug.js
//
// DEFENSIVE ONLY. This module's job is to stop a malicious message from ever
// being processed, rendered, or forwarded further — not to construct or
// relay anything resembling the attack back at anyone. That's the "sequence
// for preventing the chaos before it troubles us": this scan must run FIRST,
// before any other handler touches the message, so a bad payload never
// reaches .ai, sticker makers, loggers-that-echo-text, or another group.
//
// Call order contract (see index.js): scanMessage() runs before ANY other
// message handling. If it matches, handleIncoming() takes over completely
// and no other code sees the raw text/mentions again.

const db = require('./db');
const { brandedReply } = require('./brand');

// Known attack signatures — detection patterns only, not exploit payloads.
const BUG_SIGNATURES = [
  { name: 'zero-width-flood', test: (text) => (text.match(/[\u200B-\u200F\uFEFF]/g) || []).length > 500 },
  { name: 'oversized-unicode', test: (text) => text.length > 8000 },
  { name: 'rtl-override-bomb', test: (text) => (text.match(/[\u202A-\u202E]/g) || []).length > 20 },
  { name: 'malformed-vcard', test: (text) => /BEGIN:VCARD/i.test(text) && text.length > 5000 },
  { name: 'excessive-mentions', test: (_text, mentions) => Array.isArray(mentions) && mentions.length > 100 }
];

function scanMessage(text = '', mentions = []) {
  for (const sig of BUG_SIGNATURES) {
    try {
      if (sig.test(text, mentions)) return sig.name;
    } catch (_) {
      /* a malformed input throwing during its own scan is itself suspicious */
      return 'scan-exception';
    }
  }
  return null;
}

function extractText(msg) {
  const m = msg.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  );
}

function logThreat(entry) {
  db.push('threatlog', 'entries', entry, 5000);
}

/**
 * Runs BEFORE anything else. Returns true if the message was a threat and
 * was fully handled (caller must stop processing). Returns false for clean
 * messages, letting normal command routing continue.
 */
async function handleIncoming(sock, msg, groupJid, applyPenalty) {
  const text = extractText(msg);
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  const matched = scanMessage(text, mentions);
  if (!matched) return false; // clean — safe to let the rest of the bot see it

  const sender = msg.key.participant || msg.key.remoteJid;

  // 1. Stop it from going anywhere else: delete immediately, never pass the
  //    raw text/mentions to any other handler (ai, stickers, logs, relays).
  try {
    await sock.sendMessage(groupJid, { delete: msg.key });
  } catch (_) {
    /* deletion can fail if the bot isn't admin — still continue to log + warn */
  }

  // 2. Penalize the sender per the group's configured antibug action.
  if (typeof applyPenalty === 'function') {
    await applyPenalty(groupJid, sender, 'antibug', matched);
  }

  // 3. Log metadata ONLY — never store or re-send the payload content itself.
  logThreat({ group: groupJid, sender, signature: matched, time: Date.now() });

  // 4. Branded alert — names the signature, never echoes the payload.
  await sock.sendMessage(groupJid, {
    text: brandedReply('THREAT BLOCKED', [
      `Signature : ${matched}`,
      `Sender    : @${sender.split('@')[0]}`,
      `Action    : message deleted + penalty applied`
    ]),
    mentions: [sender]
  });

  return true;
}

module.exports = { handleIncoming, scanMessage, BUG_SIGNATURES };
