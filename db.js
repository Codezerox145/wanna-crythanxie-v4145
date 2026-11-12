// lib/db.js
// Minimal dependency-free JSON file store. Good enough for a single-instance
// bot. Swap for Mongo/Postgres later without touching call sites much —
// everything goes through get/set/push below.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.BOT_DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  groups: 'groups.json',       // per-group settings (welcome, antilink, warns...)
  users: 'users.json',         // per-user profile/economy/xp
  vip: 'vip.json',             // vip keys + active vip users
  owners: 'owners.json',       // runtime-addable sudo/owners (besides .env)
  banned: 'banned.json',       // globally banned users (owner-only, local scope)
  threatlog: 'threatlog.json', // antibug/antispam incident log
  modlog: 'modlog.json',       // warn/strike/kick/ban history per group
  schedules: 'schedules.json', // scheduled broadcasts/announcements
  settings: 'settings.json'    // bot-wide toggles (mode, autoread, etc.)
};

const cache = {};

function filePath(name) {
  return path.join(DATA_DIR, FILES[name]);
}

function load(name) {
  if (cache[name]) return cache[name];
  const fp = filePath(name);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify({}, null, 2));
  }
  try {
    cache[name] = JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    cache[name] = {};
  }
  return cache[name];
}

function save(name) {
  fs.writeFileSync(filePath(name), JSON.stringify(cache[name] || {}, null, 2));
}

function get(name, key, fallback) {
  const data = load(name);
  if (key === undefined) return data;
  return key in data ? data[key] : fallback;
}

function set(name, key, value) {
  const data = load(name);
  data[key] = value;
  save(name);
  return value;
}

function del(name, key) {
  const data = load(name);
  delete data[key];
  save(name);
}

function push(name, key, item, max) {
  const data = load(name);
  if (!Array.isArray(data[key])) data[key] = [];
  data[key].push(item);
  if (max && data[key].length > max) data[key] = data[key].slice(-max);
  save(name);
  return data[key];
}

module.exports = { get, set, del, push, load, save, FILES };
