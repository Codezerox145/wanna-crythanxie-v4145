// lib/permissions.js
// Owner numbers are stored as digits in deployment env vars and may arrive
// from Baileys as full JIDs (or device-qualified JIDs). Normalize both forms.
const db = require('./db');

function normalizeNumber(value) {
  return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}
function envOwners() {
  return (process.env.OWNER_NUMBERS || '').split(',').map(normalizeNumber).filter(Boolean);
}
function runtimeOwners() {
  return db.get('owners', 'sudo', []).map(normalizeNumber).filter(Boolean);
}
function isPrimaryOwner(jid) {
  const number = normalizeNumber(jid);
  return Boolean(number) && envOwners().includes(number);
}
function isOwner(jid) {
  const number = normalizeNumber(jid);
  return Boolean(number) && [...envOwners(), ...runtimeOwners()].includes(number);
}
function addSudo(jid) {
  const number = normalizeNumber(jid);
  if (!number) return runtimeOwners();
  const list = runtimeOwners();
  if (!list.includes(number)) list.push(number);
  db.set('owners', 'sudo', list);
  return list;
}
function delSudo(jid) {
  const number = normalizeNumber(jid);
  const list = runtimeOwners().filter(value => value !== number);
  db.set('owners', 'sudo', list);
  return list;
}
function listOwners() {
  return { envOwners: envOwners(), sudo: runtimeOwners() };
}
function isGroupAdmin(participants, jid) {
  const target = String(jid || '').split(':')[0];
  const participant = participants.find(item => String(item.id || item.jid || '').split(':')[0] === target);
  return Boolean(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
}
function isBotAdmin(participants, botJid) {
  return isGroupAdmin(participants, botJid);
}
module.exports = { isOwner, isPrimaryOwner, addSudo, delSudo, listOwners, isGroupAdmin, isBotAdmin, normalizeNumber };
