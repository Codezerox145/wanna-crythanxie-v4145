'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.PLATFORM_DATA_DIR || './platform_data');
const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE = 'wanna-cry-thanxiee-api';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value of at least 32 characters.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });

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
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d', issuer: SERVICE, audience: 'dashboard' });
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
  } catch (_error) {
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
  const user = {
    id: crypto.randomUUID(), email,
    password_hash: await bcrypt.hash(password, 12),
    created_at: new Date().toISOString()
  };
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
  res.json({ sessions });
});
app.get('/sessions/:id', auth, (req, res) => {
  const session = readStore('sessions', []).find(item => item.id === req.params.id && item.user_id === req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  return res.json({ session });
});
app.post('/sessions', auth, (_req, res) => {
  return res.status(503).json({
    error: 'WhatsApp pairing is temporarily unavailable because the Baileys worker is not yet connected to this API deployment. Your account is active; please try pairing after the worker integration is deployed.'
  });
});
app.delete('/sessions/:id', auth, (req, res) => {
  const sessions = readStore('sessions', []);
  const index = sessions.findIndex(item => item.id === req.params.id && item.user_id === req.user.id);
  if (index < 0) return res.status(404).json({ error: 'Session not found.' });
  if (sessions[index].status === 'connected') return res.status(409).json({ error: 'Disconnect the WhatsApp worker before deleting this session.' });
  sessions.splice(index, 1);
  writeStore('sessions', sessions);
  return res.json({ ok: true });
});
app.post('/sessions/:id/restart', auth, (_req, res) => res.status(503).json({ error: 'The Baileys worker is not connected to this deployment yet.' }));

app.get('/runtime', auth, (_req, res) => res.json({
  max_sessions_per_account: Math.max(1, Number(process.env.MAX_SESSIONS_PER_USER || 3)),
  bot_name: process.env.BOT_NAME || 'WANNA-CRY THANXIEE',
  prefix: process.env.BOT_PREFIX || '.',
  uptime_seconds: Math.floor(process.uptime()),
  worker_connected: false
}));
app.get('/analytics', auth, (req, res) => {
  const sessions = readStore('sessions', []).filter(item => item.user_id === req.user.id);
  res.json({ sessions_total: sessions.length, sessions_connected: sessions.filter(s => s.status === 'connected').length });
});
app.get('/servers', auth, (_req, res) => res.json({ total: 1, verified: 1, servers: [{
  id: 'current-api', name: 'Current API host', provider: 'Render', region: process.env.RENDER_REGION || 'unknown',
  country: 'Unknown', location: 'Render', cpu: 'Shared', ram: 'Plan dependent', storage: 'Configured disk dependent',
  operating_system: 'Linux', status: 'online', note: 'This API process is live. A separate WhatsApp worker has not yet been connected.'
}]}));

app.use((error, _req, res, _next) => {
  console.error('API request error:', error.message);
  res.status(500).json({ error: 'An unexpected API error occurred.' });
});
app.listen(PORT, '0.0.0.0', () => console.log(SERVICE + ' listening on port ' + PORT));
