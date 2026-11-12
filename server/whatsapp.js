'use strict';

const fs = require('node:fs');
const path = require('node:path');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  downloadMediaMessage,
  getContentType,
  normalizeMessageContent
} = require('@whiskeysockets/baileys');

const active = new Map();
const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' });
const root = path.resolve(__dirname, '..');
const avatarPath = path.join(root, 'bot-avatar.jpg');

function textFromMessage(message) {
  const normalized = normalizeMessageContent(message) || message || {};
  const type = getContentType(normalized);
  if (!type) return '';
  const value = normalized[type] || {};
  if (type === 'conversation') return String(normalized.conversation || '');
  if (type === 'extendedTextMessage') return String(value.text || '');
  if (['imageMessage', 'videoMessage', 'documentMessage'].includes(type)) return String(value.caption || '');
  if (type === 'buttonsResponseMessage') return String(value.selectedButtonId || value.selectedDisplayText || '');
  if (type === 'listResponseMessage') return String(value.singleSelectReply?.selectedRowId || '');
  if (type === 'templateButtonReplyMessage') return String(value.selectedId || '');
  return '';
}

function getAvatar(db) {
  try {
    const encoded = db.get('settings', 'botAvatarBase64', '');
    if (encoded) return Buffer.from(encoded, 'base64');
  } catch (_) {}
  try { return fs.readFileSync(avatarPath); } catch (_) { return null; }
}

async function sendCommandResult(sock, jid, result, db) {
  if (result == null) return;
  const avatar = getAvatar(db);
  if (result.menuCard) {
    const caption = String(result.caption || result.title || 'WANNA-CRY THANXIEE');
    if (avatar) await sock.sendMessage(jid, { image: avatar, caption: caption.slice(0, 1024) });
    else await sock.sendMessage(jid, { text: caption });
    for (const section of (Array.isArray(result.body) ? result.body : [])) {
      const body = String(section || '');
      if (!body) continue;
      if (avatar) await sock.sendMessage(jid, { image: avatar, caption: body.slice(0, 1024) });
      else await sock.sendMessage(jid, { text: body });
    }
    return;
  }
  if (typeof result === 'string') return sock.sendMessage(jid, { text: result });
  if (result.plainText) return sock.sendMessage(jid, { text: String(result.plainText) });
  if (result.text) {
    const payload = { text: String(result.text) };
    if (Array.isArray(result.mentions)) payload.mentions = result.mentions;
    return sock.sendMessage(jid, payload);
  }
  if (result.image) return sock.sendMessage(jid, { image: result.image, caption: result.caption || '' });
  if (result.video) return sock.sendMessage(jid, { video: result.video, caption: result.caption || '' });
  if (result.document) return sock.sendMessage(jid, { document: result.document, mimetype: result.mimetype || 'application/octet-stream', fileName: result.fileName || 'file' });
}

async function processIncoming(sock, session, message) {
  const msg = message;
  const remoteJid = msg.key?.remoteJid;
  if (!remoteJid || remoteJid === 'status@broadcast' || msg.key?.fromMe) return;
  const normalized = normalizeMessageContent(msg.message) || msg.message || {};
  const rawText = textFromMessage(normalized);
  if (!rawText.trim()) return;

  const db = require('../lib/db');
  const { handleCommand } = require('../lib/commandHandler');
  const sender = msg.key?.participant || remoteJid;
  const isGroup = remoteJid.endsWith('@g.us');
  await db.runWithDataDir(session.dataDir, async () => {
    let groupMetadata = null;
    if (isGroup) {
      try { groupMetadata = await sock.groupMetadata(remoteJid); } catch (_) {}
    }
    const participants = groupMetadata?.participants || [];
    const baseJid = value => String(value || '').split(':')[0];
    const senderEntry = participants.find(p => baseJid(p.id || p.jid) === baseJid(sender));
    const botEntry = participants.find(p => baseJid(p.id || p.jid) === baseJid(sock.user?.id));
    const contextInfo = normalized[getContentType(normalized)]?.contextInfo || {};
    const quotedMessage = contextInfo.quotedMessage || null;
    const quotedText = quotedMessage ? textFromMessage(quotedMessage) : null;
    const ctx = {
      sock, msg, chatJid: remoteJid, isGroup, sender,
      botJid: sock.user?.id || '', rawText,
      args: [], mentions: contextInfo.mentionedJid || [],
      quotedParticipant: contextInfo.participant || null,
      quotedKey: contextInfo.stanzaId ? { id: contextInfo.stanzaId, remoteJid, participant: contextInfo.participant } : null,
      quotedText, quotedMsgFull: quotedMessage ? { key: ctxQuotedKey(contextInfo, remoteJid), message: quotedMessage } : null,
      quotedImageBuffer: null, participants, groupMetadata,
      isAdmin: Boolean(senderEntry?.admin), isBotAdmin: Boolean(botEntry?.admin),
      isOwner: false, isPrimaryOwner: false
    };
    try {
      const result = await handleCommand(ctx);
      await sendCommandResult(sock, remoteJid, result, db);
    } catch (error) {
      logger.error({ err: error, sessionId: session.id }, 'Message handler failed');
    }
  });
}

function ctxQuotedKey(info, remoteJid) {
  return { remoteJid, id: info.stanzaId, participant: info.participant };
}

async function startSession(options) {
  const { id, phoneNumber, authDir, dataDir, onUpdate } = options;
  if (active.has(id)) return active.get(id).ready;
  fs.mkdirSync(authDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const state = await useMultiFileAuthState(authDir);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch (_) {}
  const sock = makeWASocket({
    auth: state.state,
    version,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  });
  const entry = { id, sock, authDir, dataDir, phoneNumber, onUpdate, reconnectTimer: null, schedulerTimer: null, closing: false, ready: null };
  active.set(id, entry);
  sock.ev.on('creds.update', state.saveCreds);
  const dbForSchedules = require('../lib/db');
  const { brandedReply } = require('../lib/brand');
  const scheduler = require('../lib/scheduler');
  entry.schedulerTimer = setInterval(() => {
    dbForSchedules.runWithDataDir(dataDir, () => scheduler.tick(sock, brandedReply)).catch(error => logger.warn({ err: error }, 'Scheduled message tick failed'));
  }, 15000);
  entry.schedulerTimer.unref?.();
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const message of messages || []) await processIncoming(sock, entry, message);
  });
  sock.ev.on('group-participants.update', async update => {
    if (!['add', 'remove'].includes(update.action)) return;
    const db = require('../lib/db');
    const welcome = require('../lib/welcome');
    await db.runWithDataDir(dataDir, async () => {
      let groupName = 'the group';
      try { groupName = (await sock.groupMetadata(update.id)).subject || groupName; } catch (_) {}
      const settings = welcome.getGroupSettings(update.id);\n      if (update.action === 'add' && !settings.welcomeOn) return;\n      if (update.action === 'remove' && !settings.goodbyeOn) return;\n      for (const participant of update.participants || []) {\n        const payload = update.action === 'add'\n          ? welcome.renderWelcome(update.id, groupName, participant)\n          : welcome.renderGoodbye(update.id, groupName, participant);
        try { await sock.sendMessage(update.id, payload); } catch (error) { logger.warn({ err: error }, 'Welcome/goodbye send failed'); }
      }
    });
  });
  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      const number = String(sock.user?.id || '').split(':')[0].split('@')[0];
      entry.onUpdate?.({ status: 'online', phone_number: number || phoneNumber, connected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), pairing_code: null, error: null });
    }
    if (connection === 'close' && !entry.closing) {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      entry.onUpdate?.({ status: loggedOut ? 'logged_out' : 'reconnecting', last_seen_at: new Date().toISOString(), error: loggedOut ? 'WhatsApp logged this device out. Pair it again.' : null });
      if (!loggedOut) {
        clearTimeout(entry.reconnectTimer);
        entry.reconnectTimer = setTimeout(() => {
          active.delete(id);
          startSession(options).catch(error => onUpdate?.({ status: 'error', error: error.message }));
        }, 2500);
        entry.reconnectTimer.unref?.();
      }
    }
  });

  entry.ready = (async () => {
    if (!state.state.creds.registered && phoneNumber) {
      const code = await sock.requestPairingCode(phoneNumber);
      onUpdate?.({ status: 'pairing', pairing_code: code, last_seen_at: new Date().toISOString(), error: null });
      return { pairing_code: code, status: 'pairing' };
    }
    return { status: state.state.creds.registered ? 'connecting' : 'waiting' };
  })();
  try { return await entry.ready; }
  catch (error) {
    entry.closing = true;
    active.delete(id);
    try { sock.end(error); } catch (_) {}
    throw error;
  }
}

async function stopSession(id) {
  const entry = active.get(id);
  if (!entry) return false;
  entry.closing = true;
  clearTimeout(entry.reconnectTimer);
  active.delete(id);
  try { entry.sock.end(new Error('Session stopped by account owner')); } catch (_) {}
  return true;
}

async function logoutSession(id) {
  const entry = active.get(id);
  if (!entry) return false;
  entry.closing = true;
  clearTimeout(entry.reconnectTimer);
  clearInterval(entry.schedulerTimer);
  active.delete(id);
  try { await entry.sock.logout(); }
  catch (_) { try { entry.sock.end(new Error('Session unlinked by account owner')); } catch (_) {} }
  return true;
}

async function removeSession(id) {
  return logoutSession(id);
}

async function restartSession(options) {
  await stopSession(options.id);
  return startSession(options);
}

function isRunning(id) { return active.has(id); }
function runningCount() { return active.size; }

module.exports = { startSession, stopSession, logoutSession, removeSession, restartSession, isRunning, runningCount };
