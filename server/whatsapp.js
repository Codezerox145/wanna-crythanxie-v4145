'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  DisconnectReason,
  Browsers,
  downloadMediaMessage,
  getContentType,
  normalizeMessageContent
} = require('@whiskeysockets/baileys');

const active = new Map();
const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' });
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

function ensureBrandedText(value) {
  const text = String(value || '');
  if (!text.trim() || text.includes('┆𖤍╭')) return text;
  const { brandedReply } = require('../lib/brand');
  return brandedReply('BOT RESPONSE', text.split(String.fromCharCode(10)), { marker: '✧' });
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
  if (typeof result === 'string') return sock.sendMessage(jid, { text: ensureBrandedText(result) });
  if (result.plainText) return sock.sendMessage(jid, { text: ensureBrandedText(result.plainText) });
  if (result.text) {
    const payload = { text: ensureBrandedText(result.text) };
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
  if (!remoteJid || remoteJid === 'status@broadcast') return;

  // Ignore messages sent by this bot to other chats, but allow commands typed
  // by the owner in their own WhatsApp "Message yourself" conversation.
  // Baileys IDs can include a device suffix (number:device@s.whatsapp.net),
  // so compare the normalized user part rather than the full JID.
  const jidUser = value => String(value || '').split('@')[0].split(':')[0];
  const isOwnChat = Boolean(sock.user?.id && jidUser(remoteJid) === jidUser(sock.user.id));
  if (msg.key?.fromMe && !isOwnChat) return;
  if (msg.key?.fromMe && remoteJid.endsWith('@g.us')) return;

  const normalized = normalizeMessageContent(msg.message) || msg.message || {};
  const rawText = textFromMessage(normalized);
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
    const senderIsAdmin = Boolean(senderEntry?.admin);

    // Security pipeline: scan hostile payloads first, then enforce group filters,
    // then let ordinary commands see only messages that passed both checks.
    if (isGroup) {
      const antibug = require('../lib/antibug');
      const filters = require('../lib/filters');
      const threatHandled = await antibug.handleIncoming(sock, msg, remoteJid, async (groupJid, threatSender, reason, signature) => {
        const action = db.get('groups', `${groupJid}:antiaction`, 'warn');
        if (action === 'kick') {
          try { await sock.groupParticipantsUpdate(groupJid, [threatSender], 'remove'); } catch (_) {}
        } else if (action === 'mute') {
          const key = `${groupJid}:muted`;
          const muted = db.get('groups', key, []);
          if (!muted.some(value => baseJid(value) === baseJid(threatSender))) muted.push(threatSender);
          db.set('groups', key, muted);
        } else {
          db.push('modlog', `${groupJid}:${threatSender}`, { by: 'antibug', reason: signature || reason, time: Date.now() }, 200);
        }
      });
      if (threatHandled) return;

      const muted = db.get('groups', `${remoteJid}:muted`, []);
      if (!senderIsAdmin && muted.some(value => baseJid(value) === baseJid(sender))) return;

      const violation = filters.checkViolations(remoteJid, msg, sender, senderIsAdmin);
      if (violation) {
        await filters.enforce(sock, remoteJid, msg, sender, violation);
        return;
      }
    }
    const messageType = getContentType(normalized);
    const mediaLabels = { imageMessage: '[Image]', videoMessage: '[Video]', documentMessage: '[Document]', audioMessage: '[Audio]', stickerMessage: '[Sticker]', locationMessage: '[Location]', contactMessage: '[Contact]' };
    const inboxText = rawText.trim() || mediaLabels[messageType] || '';
    if (!inboxText) return;

    // Feed the authenticated dashboard inbox. WhatsApp transport encryption remains
    // provided by WhatsApp; this platform cache is encrypted at rest, not an independent E2E vault.
    session.onMessage?.({
      id: String(msg.key?.id || crypto.randomUUID()),
      session_id: session.id,
      chat_jid: remoteJid,
      sender_jid: sender,
      text: inboxText.slice(0, 4000),
      direction: 'inbound',
      timestamp: Number(msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000
    });
    if (!rawText.trim()) return;

    const contextInfo = normalized[messageType]?.contextInfo || {};
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
      isAdmin: senderIsAdmin, isBotAdmin: Boolean(botEntry?.admin),
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
  const { id, phoneNumber, authDir, dataDir, onUpdate, onMessage } = options;
  if (active.has(id)) return active.get(id).ready;
  fs.mkdirSync(authDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  const state = await useMultiFileAuthState(authDir);
  // Resolve the WhatsApp Web revision without making a temporary
  // version-endpoint failure block all pairing attempts. Operators may pin a
  // known-good revision with WA_WEB_VERSION="2,3000,123456789".
  let version;
  let versionSource = 'baileys-default';
  const configuredVersion = String(process.env.WA_WEB_VERSION || '').trim();
  if (configuredVersion) {
    const parsed = configuredVersion.split(/[.,\s]+/).map(Number);
    if (parsed.length === 3 && parsed.every(value => Number.isInteger(value) && value > 0)) {
      version = parsed;
      versionSource = 'environment';
    } else {
      logger.warn({ configuredVersion }, 'Ignoring invalid WA_WEB_VERSION; expected three comma-separated integers');
    }
  }

  if (!version) {
    try {
      const latest = await Promise.race([
        fetchLatestWaWebVersion(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp Web version lookup timed out')), 9000))
      ]);
      const validVersion = Array.isArray(latest?.version) &&
        latest.version.length === 3 &&
        latest.version.every(value => Number.isInteger(value) && value > 0);
      if (validVersion && latest.isLatest === true) {
        version = latest.version;
        versionSource = 'live-whatsapp-web';
      } else {
        logger.warn({
          isLatest: Boolean(latest?.isLatest),
          hasValidVersion: validVersion,
          error: latest?.error?.message || null
        }, 'Live WhatsApp Web version could not be confirmed; using the Baileys bundled default');
      }
    } catch (error) {
      logger.warn({ err: error }, 'WhatsApp Web version lookup failed; using the Baileys bundled default');
    }
  }

  logger.info({ version: version || 'bundled-default', versionSource }, 'Starting WhatsApp pairing socket');

  const sock = makeWASocket({
    auth: state.state,
    ...(version ? { version } : {}),
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000
  });

  const entry = {
    id, sock, authDir, dataDir, phoneNumber: String(phoneNumber || '').replace(/\D/g, ''),
    onUpdate, onMessage, reconnectTimer: null, schedulerTimer: null,
    closing: false, ready: null, pairingRequested: false,
    resolveReady: null, rejectReady: null
  };
  active.set(id, entry);

  entry.ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WhatsApp did not become ready in time. Check the API connection and try again.')), 35000);
    entry.resolveReady = value => { clearTimeout(timeout); resolve(value); };
    entry.rejectReady = error => { clearTimeout(timeout); reject(error); };
  });

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
      const settings = welcome.getGroupSettings(update.id);
      if (update.action === 'add' && !settings.welcomeOn) return;
      if (update.action === 'remove' && !settings.goodbyeOn) return;
      for (const participant of update.participants || []) {
        const payload = update.action === 'add'
          ? welcome.renderWelcome(update.id, groupName, participant)
          : welcome.renderGoodbye(update.id, groupName, participant);
        try { await sock.sendMessage(update.id, payload); } catch (error) { logger.warn({ err: error }, 'Welcome/goodbye send failed'); }
      }
    });
  });

  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect, qr } = update;

    // Baileys emits "connecting" / a QR event when its socket is ready for
    // requestPairingCode. Calling it on a fixed delay after construction can
    // race the websocket handshake and produce invalid/expired codes.
    if (!state.state.creds.registered && entry.phoneNumber && !entry.pairingRequested && Boolean(qr)) {
      entry.pairingRequested = true;
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(entry.phoneNumber);
          onUpdate?.({ status: 'pairing', pairing_code: code, last_seen_at: new Date().toISOString(), error: null });
          entry.resolveReady?.({ pairing_code: code, status: 'pairing' });
        } catch (error) {
          logger.error({ err: error, sessionId: id }, 'WhatsApp pairing-code request failed');
          onUpdate?.({ status: 'error', pairing_code: null, error: String(error.message || 'WhatsApp rejected the pairing-code request.').slice(0, 240) });
          entry.rejectReady?.(error);
        }
      }, 1500);
    }

    if (connection === 'open') {
      const number = String(sock.user?.id || '').split(':')[0].split('@')[0];
      onUpdate?.({ status: 'online', phone_number: number || entry.phoneNumber, connected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), pairing_code: null, error: null });
      entry.resolveReady?.({ status: 'online' });
    }

    if (connection === 'close' && !entry.closing) {
      const disconnectError = lastDisconnect?.error;
      const statusCode = disconnectError?.output?.statusCode || disconnectError?.statusCode || null;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({
        sessionId: id,
        statusCode,
        disconnectMessage: String(disconnectError?.message || 'Unknown disconnect').slice(0, 240),
        disconnectData: disconnectError?.data || disconnectError?.output?.payload || null
      }, 'WhatsApp connection closed');
      onUpdate?.({
        status: loggedOut ? 'logged_out' : 'reconnecting',
        last_seen_at: new Date().toISOString(),
        error: loggedOut ? 'WhatsApp logged this device out. Start a new pairing session.' : null
      });
      if (loggedOut) {
        entry.rejectReady?.(new Error('WhatsApp logged this device out. Start a new pairing session.'));
      } else {
        clearTimeout(entry.reconnectTimer);
        entry.reconnectTimer = setTimeout(() => {
          active.delete(id);
          startSession(options).catch(error => onUpdate?.({ status: 'error', pairing_code: null, error: String(error.message || 'WhatsApp reconnect failed.').slice(0, 240) }));
        }, 2500);
        entry.reconnectTimer.unref?.();
      }
    }
  });

  try {
    return await entry.ready;
  } catch (error) {
    entry.closing = true;
    clearTimeout(entry.reconnectTimer);
    clearInterval(entry.schedulerTimer);
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

async function sendText(id, jid, text) {
  const entry = active.get(id);
  if (!entry || !entry.sock?.user) throw new Error('WhatsApp session is not connected. Reconnect the device and try again.');
  return entry.sock.sendMessage(jid, { text: String(text || '').slice(0, 4000) });
}
async function listGroups(id) {
  const entry = active.get(id);
  if (!entry || !entry.sock?.user) throw new Error('WhatsApp session is not connected.');
  const groups = await entry.sock.groupFetchAllParticipating();
  return Object.values(groups || {}).map(group => ({ id: group.id, subject: group.subject || 'Unnamed group', participants: (group.participants || []).length })).sort((a,b) => a.subject.localeCompare(b.subject));
}
async function groupInviteCode(id, jid) {
  const entry = active.get(id);
  if (!entry || !entry.sock?.user) throw new Error('WhatsApp session is not connected.');
  if (!String(jid).endsWith('@g.us')) throw new Error('Choose a WhatsApp group to create an invite link.');
  return entry.sock.groupInviteCode(jid);
}
async function sendPoll(id, jid, question, options, selectableCount = 1) {
  const entry = active.get(id);
  if (!entry || !entry.sock?.user) throw new Error('WhatsApp session is not connected.');
  if (!String(jid).endsWith('@g.us')) throw new Error('WhatsApp polls can only be sent to groups.');
  const cleanOptions = [...new Set((options || []).map(value => String(value).trim()).filter(Boolean))];
  if (cleanOptions.length < 2 || cleanOptions.length > 12) throw new Error('Provide between 2 and 12 distinct poll options.');
  const title = String(question || '').trim().slice(0, 255);
  if (!title) throw new Error('Enter a poll question.');
  await entry.sock.groupMetadata(jid);
  return entry.sock.sendMessage(jid, { poll: { name: title, values: cleanOptions, selectableCount: Math.max(1, Math.min(cleanOptions.length, Number(selectableCount) || 1)) } });
}

async function refreshPairingCode(id) {
  const entry = active.get(id);
  if (!entry) throw new Error('WhatsApp connection is still starting. Wait a few seconds and retry.');
  if (entry.sock?.user?.id) throw new Error('This WhatsApp device is already connected.');
  if (!entry.phoneNumber) throw new Error('The WhatsApp phone number is missing. Start a new pairing session.');
  const code = await entry.sock.requestPairingCode(entry.phoneNumber);
  entry.onUpdate?.({ status: 'pairing', pairing_code: code, last_seen_at: new Date().toISOString(), error: null });
  return code;
}

function isRunning(id) { return active.has(id); }
function runningCount() { return active.size; }

module.exports = { startSession, refreshPairingCode, stopSession, logoutSession, removeSession, restartSession, sendText, listGroups, groupInviteCode, sendPoll, isRunning, runningCount, ensureBrandedText };
