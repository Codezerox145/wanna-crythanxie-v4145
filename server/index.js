'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const whatsapp = require('./whatsapp');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.PLATFORM_DATA_DIR || './platform_data');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE = 'wanna-cry-thanxiee-api';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value of at least 32 characters.');
  process.exit(1);
}
fs.mkdirSync(SESSION_DIR, { recursive: true });

function messageEncryptionKey() {
  return crypto.createHash('sha256').update(JWT_SECRET).digest();
}
function readStore(name, fallback) {
  const file = path.join(DATA_DIR, name + '.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (name !== 'messages' || !parsed || parsed.$encrypted !== 'aes-256-gcm') return parsed;
    const decipher = crypto.createDecipheriv('aes-256-gcm', messageEncryptionKey(), Buffer.from(parsed.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
    const clear = Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8');
    return JSON.parse(clear);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Store read failed:', name, error.message);
    return fallback;
  }
}
function writeStore(name, value) {
  const file = path.join(DATA_DIR, name + '.json');
  const temp = file + '.' + process.pid + '.tmp';
  let serialized = JSON.stringify(value, null, 2);
  if (name === 'messages') {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', messageEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
    serialized = JSON.stringify({ $encrypted: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') });
  }
  fs.writeFileSync(temp, serialized, { mode: 0o600 });
  fs.renameSync(temp, file);
}
function isOwnerEmail(email) {
  const owners = (process.env.OWNER_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  return owners.includes(String(email || '').trim().toLowerCase());
}
function safeUser(user) {
  return { id: user.id, email: user.email, role: isOwnerEmail(user.email) ? 'owner' : 'user', is_owner: isOwnerEmail(user.email), created_at: user.created_at };
}
function ownerOnly(req, res, next) {
  if (!isOwnerEmail(req.user?.email)) return res.status(403).json({ error: 'Owner access is restricted to the configured OWNER_EMAILS account.' });
  next();
}
function serverRegistry() {
  try {
    const value = JSON.parse(process.env.SERVER_REGISTRY_JSON || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string').slice(0, 243);
  } catch (_) { return []; }
}
function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d', issuer: SERVICE, audience: 'dashboard'
  });
}
function publicSession(session) {
  const { user_id, auth_dir, data_dir, ...safe } = session;
  return safe;
}
function updateSession(id, patch) {
  const sessions = readStore('sessions', []);
  const index = sessions.findIndex(item => item.id === id);
  if (index < 0) return null;
  sessions[index] = { ...sessions[index], ...patch, updated_at: new Date().toISOString() };
  writeStore('sessions', sessions);
  return sessions[index];
}
function recordMessage(message) {
  const messages = readStore('messages', []);
  messages.push(message);
  writeStore('messages', messages.slice(-10000));
}
function sessionPaths(id) {
  const base = path.join(SESSION_DIR, id);
  return { authDir: path.join(base, 'auth'), dataDir: path.join(base, 'bot-data') };
}

const allowedOrigins = (process.env.DASHBOARD_ORIGIN || '')
  .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({
  ok: true, status: 'ok', service: SERVICE, version: require('../package.json').version,
  worker_connected: whatsapp.runningCount() > 0,
  active_workers: whatsapp.runningCount(),
  timestamp: new Date().toISOString()
}));

function auth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: SERVICE, audience: 'dashboard' });
    const users = readStore('users', []);
    const user = users.find(item => item.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'Account not found. Please sign in again.' });
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

app.post('/auth/signup', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  const users = readStore('users', []);
  if (users.some(user => user.email === email)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: crypto.randomUUID(), email, password_hash: await bcrypt.hash(password, 12), created_at: new Date().toISOString() };
  users.push(user);
  writeStore('users', users);
  return res.status(201).json({ token: issueToken(user), user: safeUser(user) });
});

app.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const users = readStore('users', []);
  const user = users.find(item => item.email === email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  return res.json({ token: issueToken(user), user: safeUser(user) });
});

app.get('/sessions', auth, (req, res) => {
  const sessions = readStore('sessions', []).filter(item => item.user_id === req.user.id);
  res.json({ sessions: sessions.map(publicSession) });
});

app.get('/sessions/:id', auth, (req, res) => {
  const session = readStore('sessions', []).find(item => item.id === req.params.id && item.user_id === req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  return res.json(publicSession(session));
});

app.post('/sessions', auth, async (req, res) => {
  const phoneNumber = String(req.body?.phoneNumber || '').replace(/\D/g, '');
  const region = String(req.body?.region || 'auto').toLowerCase();
  const label = String(req.body?.label || '').trim().slice(0, 60);
  if (phoneNumber.length < 8 || phoneNumber.length > 15) return res.status(400).json({ error: 'Enter a valid international WhatsApp number including its country calling code (8–15 digits).' });
  if (!['auto', 'africa', 'europe', 'north_america', 'south_america', 'asia_pacific', 'middle_east', 'backup'].includes(region)) return res.status(400).json({ error: 'Choose a supported server region.' });
  if (req.body?.communitySupportConfirmed !== true) return res.status(400).json({ error: 'Confirm the project support step before requesting pairing.' });

  const sessions = readStore('sessions', []);
  const owned = sessions.filter(item => item.user_id === req.user.id);
  const max = Math.max(1, Math.min(10, Number(process.env.MAX_SESSIONS_PER_USER || 3)));
  if (owned.length >= max) return res.status(409).json({ error: 'You have reached the maximum of ' + max + ' WhatsApp sessions for this account.' });
  if (sessions.some(item => item.phone_number === phoneNumber && item.status !== 'deleted')) return res.status(409).json({ error: 'This WhatsApp number is already registered to a session on this platform.' });

  const id = crypto.randomUUID();
  const paths = sessionPaths(id);
  const session = {
    id, user_id: req.user.id, phone_number: phoneNumber, region, label,
    status: 'starting', pairing_code: null, error: null,
    created_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
    auth_dir: paths.authDir, data_dir: paths.dataDir
  };
  sessions.push(session);
  writeStore('sessions', sessions);
  try {
    const result = await whatsapp.startSession({
      id, phoneNumber, ...paths,
      onUpdate: patch => updateSession(id, patch),
      onMessage: message => recordMessage(message)
    });
    const latest = readStore('sessions', []).find(item => item.id === id) || session;
    return res.status(201).json({ sessionId: id, ...publicSession({ ...latest, ...result }) });
  } catch (error) {
    updateSession(id, { status: 'error', error: String(error.message || 'Unable to start WhatsApp pairing.').slice(0, 240) });
    return res.status(502).json({ error: 'Could not start WhatsApp pairing: ' + String(error.message || 'connection failed').slice(0, 180), sessionId: id });
  }
});

app.delete('/sessions/:id', auth, async (req, res) => {
  const sessions = readStore('sessions', []);
  const index = sessions.findIndex(item => item.id === req.params.id && item.user_id === req.user.id);
  if (index < 0) return res.status(404).json({ error: 'Session not found.' });
  const session = sessions[index];
  await whatsapp.logoutSession(session.id);
  sessions.splice(index, 1);
  writeStore('sessions', sessions);
  fs.rmSync(path.join(SESSION_DIR, session.id), { recursive: true, force: true });
  return res.json({ ok: true });
});

app.post('/sessions/:id/restart', auth, async (req, res) => {
  const session = readStore('sessions', []).find(item => item.id === req.params.id && item.user_id === req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  const paths = sessionPaths(session.id);
  try {
    updateSession(session.id, { status: 'restarting', error: null });
    const result = await whatsapp.restartSession({
      id: session.id, phoneNumber: session.phone_number, ...paths,
      onUpdate: patch => updateSession(session.id, patch),
      onMessage: message => recordMessage(message)
    });
    return res.json({ ok: true, ...result, session: publicSession(updateSession(session.id, { status: result.status || 'connecting', pairing_code: result.pairing_code || null }) || session) });
  } catch (error) {
    updateSession(session.id, { status: 'error', error: String(error.message || 'Restart failed.').slice(0, 240) });
    return res.status(502).json({ error: 'Could not restart this WhatsApp session.' });
  }
});

app.get('/runtime', auth, (_req, res) => {
  const memory = process.memoryUsage();
  res.json({
    platform: process.env.RENDER ? 'Render' : process.platform,
    provider: process.env.RENDER ? 'Render' : 'Unknown',
    region: process.env.RENDER_REGION || null,
    location: process.env.RENDER_REGION || null,
    node: process.version,
    operating_system: os.type() + ' ' + os.release(),
    architecture: os.arch(),
    cpu_cores: os.cpus().length,
    load_average: os.loadavg(),
    uptime_seconds: Math.floor(process.uptime()),
    memory: { rss: memory.rss, heapTotal: memory.heapTotal, heapUsed: memory.heapUsed, external: memory.external },
    total_memory_bytes: os.totalmem(),
    free_memory_bytes: os.freemem(),
    max_sessions_per_account: Math.max(1, Number(process.env.MAX_SESSIONS_PER_USER || 3)),
    bot_name: process.env.BOT_NAME || 'WANNA-CRY THANXIEE',
    prefix: process.env.BOT_PREFIX || '.',
    worker_connected: whatsapp.runningCount() > 0,
    active_workers: whatsapp.runningCount(),
    active_bot_processes: whatsapp.runningCount(),
    configured_server_count: serverRegistry().length + 1
  });
});
app.get('/analytics', auth, (req, res) => {
  const sessions = readStore('sessions', []).filter(item => item.user_id === req.user.id);
  res.json({ sessions_total: sessions.length, sessions_connected: sessions.filter(s => s.status === 'online').length });
});
app.get('/servers', auth, (_req, res) => {
  const configured = serverRegistry().map(item => ({ ...item, status: item.status || 'unverified', verified: false }));
  const current = {
    id: 'current-api', name: 'WhatsApp API + Baileys worker', provider: 'Render',
    region: process.env.RENDER_REGION || 'Not exposed', country: 'Not exposed', location: process.env.RENDER_REGION || 'Not exposed',
    cpu: os.cpus().length + ' visible logical core(s)', ram: Math.round(os.totalmem() / 1024 / 1024) + ' MiB visible host memory', storage: 'Not exposed by runtime',
    operating_system: os.type() + ' ' + os.release(), status: 'online', verified: true,
    note: whatsapp.runningCount() + ' Baileys worker(s) active in this API instance.'
  };
  const servers = [current, ...configured.filter(item => item.id !== current.id)];
  res.json({ total: servers.length, verified: 1, servers });
});

// WhatsApp group discovery and native poll creation.
app.get('/groups', auth, async (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  const owned = readStore('sessions', []).some(item => item.id === sessionId && item.user_id === req.user.id);
  if (!owned) return res.status(404).json({ error: 'WhatsApp session not found.' });
  try { return res.json({ groups: await whatsapp.listGroups(sessionId) }); }
  catch (error) { return res.status(409).json({ error: String(error.message || 'Could not load groups.') }); }
});
app.post('/polls/create', auth, async (req, res) => {
  const sessionId = String(req.body?.sessionId || '');
  const groupJid = String(req.body?.groupJid || '');
  const question = String(req.body?.question || '').trim();
  const options = Array.isArray(req.body?.options) ? req.body.options : [];
  const owned = readStore('sessions', []).some(item => item.id === sessionId && item.user_id === req.user.id);
  if (!owned) return res.status(404).json({ error: 'WhatsApp session not found.' });
  if (!/^[0-9]+(?:-[0-9]+)?@g\.us$/.test(groupJid)) return res.status(400).json({ error: 'Select a valid WhatsApp group.' });
  try {
    const result = await whatsapp.sendPoll(sessionId, groupJid, question, options, req.body?.selectableCount);
    return res.status(201).json({ ok: true, message: 'WhatsApp poll sent to the selected group.', messageId: result?.key?.id || null });
  } catch (error) { return res.status(409).json({ error: String(error.message || 'Could not send poll.') }); }
});

// Dashboard Chat Centre: messages are persisted per WhatsApp session owner.
app.get('/chat/conversations', auth, (req, res) => {
  const sessions = readStore('sessions', []).filter(item => item.user_id === req.user.id);
  const allowed = new Set(sessions.map(item => item.id));
  const messages = readStore('messages', []).filter(item => allowed.has(item.session_id));
  const map = new Map();
  for (const item of messages) {
    const key = item.session_id + ':' + item.chat_jid;
    const prev = map.get(key);
    if (!prev || prev.timestamp < item.timestamp) map.set(key, { session_id: item.session_id, chat_jid: item.chat_jid, last_message: item.text, timestamp: item.timestamp, direction: item.direction });
  }
  res.json({ conversations: [...map.values()].sort((a,b) => b.timestamp-a.timestamp) });
});
app.get('/chat/messages', auth, (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  const chatJid = String(req.query.chatJid || '');
  const owned = readStore('sessions', []).some(item => item.id === sessionId && item.user_id === req.user.id);
  if (!owned || !chatJid) return res.status(404).json({ error: 'Conversation not found.' });
  const messages = readStore('messages', []).filter(item => item.session_id === sessionId && item.chat_jid === chatJid).slice(-200);
  res.json({ messages });
});
app.post('/chat/send', auth, async (req, res) => {
  const sessionId = String(req.body?.sessionId || '');
  const chatJid = String(req.body?.chatJid || '');
  const message = String(req.body?.message || '').trim().slice(0, 4000);
  const owned = readStore('sessions', []).some(item => item.id === sessionId && item.user_id === req.user.id);
  if (!owned || !chatJid || !/^[0-9]+(?:-[0-9]+)?@(s\.whatsapp\.net|g\.us)$/.test(chatJid)) return res.status(400).json({ error: 'Choose a valid conversation.' });
  if (!message) return res.status(400).json({ error: 'Enter a message before sending.' });
  try {
    await whatsapp.sendText(sessionId, chatJid, message);
    const messages = readStore('messages', []);
    messages.push({ id: crypto.randomUUID(), session_id: sessionId, chat_jid: chatJid, text: message, direction: 'outbound', timestamp: Date.now() });
    writeStore('messages', messages.slice(-10000));
    res.json({ ok: true });
  } catch (error) { res.status(503).json({ error: error.message || 'WhatsApp session is not connected.' }); }
});
app.post('/supporter/verify', auth, async (req, res) => {
  const username = String(req.body?.githubUsername || '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(username)) return res.status(400).json({ error: 'Enter a valid GitHub username.' });
  const owner = 'Codezerox145';
  const repo = 'wanna-crythanxie-v4145';
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'WANNA-CRY-THANXIEE' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  try {
    const [starredRepos, ownedRepos] = await Promise.all([
      (async () => {
        const all = [];
        for (let page = 1; page <= 10; page++) {
          const response = await fetch('https://api.github.com/users/' + encodeURIComponent(username) + '/starred?per_page=100&page=' + page, { headers });
          if (response.status === 403 || response.status === 429) throw Object.assign(new Error('GitHub rate limited'), { rateLimited: true });
          if (!response.ok) throw new Error('GitHub star lookup failed');
          const batch = await response.json(); all.push(...batch);
          if (!Array.isArray(batch) || batch.length < 100) break;
        }
        return all;
      })(),
      (async () => {
        const all = [];
        for (let page = 1; page <= 10; page++) {
          const response = await fetch('https://api.github.com/users/' + encodeURIComponent(username) + '/repos?type=owner&per_page=100&page=' + page, { headers });
          if (response.status === 403 || response.status === 429) throw Object.assign(new Error('GitHub rate limited'), { rateLimited: true });
          if (!response.ok) throw new Error('GitHub fork lookup failed');
          const batch = await response.json(); all.push(...batch);
          if (!Array.isArray(batch) || batch.length < 100) break;
        }
        return all;
      })()
    ]);
    const targetRepo = (owner + '/' + repo).toLowerCase();
    const isStarred = starredRepos.some(item => String(item.full_name || '').toLowerCase() === targetRepo);
    const isForked = ownedRepos.some(item => item.fork && String(item.parent?.full_name || '').toLowerCase() === targetRepo);
    if (!isStarred || !isForked) return res.status(403).json({ error: 'Support verification incomplete. Your GitHub account must both STAR and FORK the official repository before an OTP is issued.', starred: isStarred, forked: isForked, repository: 'https://github.com/' + owner + '/' + repo });
        const code = String(crypto.randomInt(100000, 1000000));
    const records = readStore('supporter_otps', []).filter(item => item.user_id !== req.user.id || item.used || item.expires_at > Date.now());
    records.push({ user_id: req.user.id, github_username: username, code_hash: crypto.createHash('sha256').update(code).digest('hex'), expires_at: Date.now() + 10 * 60 * 1000, used: false });
    writeStore('supporter_otps', records.slice(-5000));
    return res.json({ ok: true, otp: code, expires_in_seconds: 600, message: 'GitHub star and fork verified. This one-time code expires in 10 minutes. Send it to the owner to request a VIP unlock key.' });
  } catch (error) { if (error.rateLimited) return res.status(503).json({ error: 'GitHub verification is rate limited. Please try again later.' }); return res.status(502).json({ error: 'Could not verify your GitHub activity right now. Please retry later.' }); }
});
app.post('/supporter/redeem-otp', auth, (req, res) => {
  const code = String(req.body?.otp || '').trim();
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the six-digit OTP.' });
  const records = readStore('supporter_otps', []);
  const record = [...records].reverse().find(item => item.user_id === req.user.id && !item.used && item.expires_at > Date.now());
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  if (!record || record.code_hash !== hash) return res.status(400).json({ error: 'OTP is invalid, expired or already used. Verify your GitHub star and fork again.' });
  record.used = true; record.used_at = Date.now(); writeStore('supporter_otps', records);
  return res.json({ ok: true, message: 'Supporter OTP accepted. Contact the owner with your GitHub username to request a VIP unlock key.' });
});
app.get('/owner/overview', auth, ownerOnly, (_req, res) => {
  const users = readStore('users', []);
  const sessions = readStore('sessions', []);
  const otp = readStore('supporter_otps', []);
  res.json({
    users_total: users.length,
    owner_accounts: users.filter(user => isOwnerEmail(user.email)).length,
    sessions_total: sessions.length,
    sessions_online: sessions.filter(item => item.status === 'online').length,
    supporter_verifications: otp.filter(item => item.used).length,
    pending_otps: otp.filter(item => !item.used && item.expires_at > Date.now()).length,
    worker_count: whatsapp.runningCount(),
    api_uptime_seconds: Math.floor(process.uptime()),
    environment: { server_registry_configured: serverRegistry().length > 0, owner_emails_configured: (process.env.OWNER_EMAILS || '').split(',').filter(Boolean).length > 0, github_verification: true, email_delivery_configured: Boolean(process.env.RESEND_API_KEY && process.env.OWNER_EMAILS) }
  });
});
app.get('/owner/users', auth, ownerOnly, (_req, res) => {
  const users = readStore('users', []).map(user => ({ id: user.id, email: user.email, role: isOwnerEmail(user.email) ? 'owner' : 'user', created_at: user.created_at }));
  res.json({ users });
});
app.use((error, _req, res, _next) => {
  console.error('API request error:', error.message);
  res.status(500).json({ error: 'An unexpected API error occurred.' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(SERVICE + ' listening on port ' + PORT);
  const saved = readStore('sessions', []);
  for (const session of saved) {
    if (!['online', 'reconnecting', 'connecting'].includes(session.status)) continue;
    const paths = sessionPaths(session.id);
    if (!fs.existsSync(path.join(paths.authDir, 'creds.json'))) continue;
    whatsapp.startSession({
      id: session.id, phoneNumber: session.phone_number, ...paths,
      onUpdate: patch => updateSession(session.id, patch),
      onMessage: message => recordMessage(message)
    }).catch(error => updateSession(session.id, { status: 'error', error: String(error.message || 'Reconnect failed.').slice(0, 200) }));
  }
});

function shutdown(signal) {
  console.log('Received ' + signal + ', closing WhatsApp sessions.');
  const sessions = readStore('sessions', []);
  Promise.all(sessions.map(session => whatsapp.stopSession(session.id))).finally(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
