// Session-scoped synchronous JSON store.
// AsyncLocalStorage keeps each WhatsApp account's settings/data isolated even
// when multiple Baileys sockets share this API process.
const fs = require('node:fs');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');

const context = new AsyncLocalStorage();
const DEFAULT_DIR = process.env.BOT_DATA_DIR || path.join(__dirname, '..', 'data');
const FILES = {
  groups: 'groups.json', users: 'users.json', vip: 'vip.json',
  owners: 'owners.json', banned: 'banned.json', threatlog: 'threatlog.json',
  modlog: 'modlog.json', schedules: 'schedules.json', settings: 'settings.json'
};
const caches = new Map();

function activeDir() {
  return path.resolve(context.getStore() || DEFAULT_DIR);
}
function cacheFor(dir = activeDir()) {
  if (!caches.has(dir)) caches.set(dir, {});
  return caches.get(dir);
}
function filePath(name, dir = activeDir()) {
  if (!FILES[name]) throw new Error('Unknown data store: ' + name);
  return path.join(dir, FILES[name]);
}
function load(name) {
  const dir = activeDir();
  const cache = cacheFor(dir);
  if (Object.prototype.hasOwnProperty.call(cache, name)) return cache[name];
  fs.mkdirSync(dir, { recursive: true });
  const fp = filePath(name, dir);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, '{}', { mode: 0o600 });
  try { cache[name] = JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch (_) { cache[name] = {}; }
  return cache[name];
}
function save(name) {
  const dir = activeDir();
  fs.mkdirSync(dir, { recursive: true });
  const fp = filePath(name, dir);
  const temp = fp + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(cacheFor(dir)[name] || {}, null, 2), { mode: 0o600 });
  fs.renameSync(temp, fp);
}
function get(name, key, fallback) {
  const data = load(name);
  if (key === undefined) return data;
  return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : fallback;
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
function runWithDataDir(dir, callback) {
  return context.run(path.resolve(dir), callback);
}
function getDataDir() { return activeDir(); }
module.exports = { get, set, del, push, load, save, FILES, runWithDataDir, getDataDir };
