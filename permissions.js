// lib/permissions.js
// Every privileged check in the bot routes through here. Ownership is
// defined by WHO DEPLOYS THE BOT (their .env + runtime-added sudo list),
// never by a hardcoded string baked into source. Whoever controls the
// server's .env and data/owners.json controls the bot — as it should be.

const db = require('./db');

function envOwners() {
  return (process.env.OWNER_NUMBERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function runtimeOwners() {
  return db.get('owners', 'sudo', []);
}

function isPrimaryOwner(jid) {
  if (!jid) return false;
  return envOwners().includes(jid);
}

function isOwner(jid) {
  if (!jid) return false;
  const all = [...envOwners(), ...runtimeOwners()];
  return all.includes(jid);
}

function addSudo(jid) {
  const list = runtimeOwners();
  if (!list.includes(jid)) list.push(jid);
  db.set('owners', 'sudo', list);
  return list;
}

function delSudo(jid) {
  const list = runtimeOwners().filter((j) => j !== jid);
  db.set('owners', 'sudo', list);
  return list;
}

function listOwners() {
  return { envOwners: envOwners(), sudo: runtimeOwners() };
}

/** Group-admin check against a fetched participants list from Baileys. */
function isGroupAdmin(participants, jid) {
  const p = participants.find((x) => x.id === jid);
  return !!p && (p.admin === 'admin' || p.admin === 'superadmin');
}

function isBotAdmin(participants, botJid) {
  return isGroupAdmin(participants, botJid);
}

module.exports = { isOwner, isPrimaryOwner, addSudo, delSudo, listOwners, isGroupAdmin, isBotAdmin };
