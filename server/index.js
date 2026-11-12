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

function readStore(name, fallback) {
  const file = path.join(DATA_DIR, name + '.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') console.error('Store read failed:', name, error.message);
    return fallback;
  }
}
function writeStore(name, value) {
  const file = path.join(DATA_DIR, name + '.json');
  const temp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}
function safeUser(user) {
  return { id: user.id, email: user.email, created_at: user.created_at };
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
      onUpdate: patch => updateSession(id, patch)
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
  await whatsapp.stopSession(session.id);
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
      onUpdate: patch => updateSession(session.id, patch)
    });
    return res.json({ ok: true, ...result, session: publicSession(updateSession(session.id, { status: result.status || 'connecting', pairing_code: result.pairing_code || null }) || session) });
  } catch (error) {
    updateSession(session.id, { status: 'error', error: String(error.message || 'Restart failed.').slice(0, 240) });
    return res.status(502).json({ error: 'Could not restart this WhatsApp session.' });
  }
});

app.get('/runtime', auth, (_req, res) => res.json({
  max_sessions_per_account: Math.max(1, Number(process.env.MAX_SESSIONS_PER_USER || 3)),
  bot_name: process.env.BOT_NAME || 'WANNA-CRY THANXIEE',
  prefix: process.env.BOT_PREFIX || '.',
  uptime_seconds: Math.floor(process.uptime()),
  worker_connected: whatsapp.runningCount() > 0,
  active_workers: whatsapp.runningCount()
}));
app.get('/analytics', auth, (req, res) => {
  const sessions = readStore('sessions', []).filter(item => item.user_id === req.user.id);
  res.json({ sessions_total: sessions.length, sessions_connected: sessions.filter(s => s.status === 'online').length });
});
app.get('/servers', auth, (_req, res) => res.json({ total: 1, verified: 1, servers: [{
  id: 'current-api', name: 'WhatsApp API + Baileys worker', provider: 'Render',
  region: process.env.RENDER_REGION || 'unknown', country: 'Unknown', location: 'Render',
  cpu: 'Shared', ram: 'Plan dependent', storage: 'Persistent disk recommended',
  operating_system: 'Linux', status: 'online',
  note: whatsapp.runningCount() + ' Baileys worker(s) active in this API instance.'
}]}));

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
      onUpdate: patch => updateSession(session.id, patch)
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
