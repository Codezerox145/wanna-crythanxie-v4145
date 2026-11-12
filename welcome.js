// lib/welcome.js
// Automatic welcome/goodbye bundle. Custom templates override randomized defaults.
// Both features are enabled for new groups; admins can explicitly opt out with
// .welcome off or .goodbye off. Templates support {user} and {group}.

const db = require('./db');
const { brandedReply } = require('./brand');

const RANDOM_WELCOMES = [
  'Welcome aboard, {user}! Grab a seat, read the group rules and make yourself at home in {group}.',
  'A new face has arrived! Everyone say hello to {user} and help them feel welcome in {group}.',
  'Good vibes only! {user} just joined {group}. Tell us a little about yourself!',
  'Fresh member alert: welcome to {group}, {user}. We are glad you are here!',
  'The community is growing! Welcome {user} to {group}. Please check the group description and rules.'
];

const RANDOM_GOODBYES = [
  '{user} has left {group}. Wishing you all the best!',
  'One chapter closes: {user} has left {group}. Take care!',
  '{user} has departed from {group}. Thanks for being part of the community.',
  'Safe travels, {user}. You will be missed in {group}!',
  '{user} has left the group. The door is always open if you return to {group}.'
];

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getGroupSettings(groupJid) {
  return {
    welcomeOn: true,
    goodbyeOn: true,
    welcomeText: null,
    goodbyeText: null,
    ...db.get('groups', groupJid, {})
  };
}

function setGroupSetting(groupJid, patch) {
  const current = getGroupSettings(groupJid);
  const next = { ...current, ...patch };
  db.set('groups', groupJid, next);
  return next;
}

function interpolate(template, groupName, userJid) {
  const safeGroup = String(groupName || 'the group').replace(/[\r\n]/g, ' ').slice(0, 100);
  const mention = '@' + String(userJid || '').split('@')[0];
  return String(template).replace(/{user}/g, mention).replace(/{group}/g, safeGroup);
}

function renderWelcome(groupJid, groupName, userJid) {
  const settings = getGroupSettings(groupJid);
  const custom = typeof settings.welcomeText === 'string' && settings.welcomeText.trim();
  const text = interpolate(custom || pick(RANDOM_WELCOMES), groupName, userJid);
  return {
    text: brandedReply('WELCOME', [text], {
      footerExtra: custom ? undefined : 'Random welcome selected automatically. Use .setwelcome to customize.'
    }),
    mentions: [userJid]
  };
}

function renderGoodbye(groupJid, groupName, userJid) {
  const settings = getGroupSettings(groupJid);
  const custom = typeof settings.goodbyeText === 'string' && settings.goodbyeText.trim();
  const text = interpolate(custom || pick(RANDOM_GOODBYES), groupName, userJid);
  return {
    text: brandedReply('GOODBYE', [text], {
      footerExtra: custom ? undefined : 'Random farewell selected automatically. Use .setgoodbye to customize.'
    }),
    mentions: [userJid]
  };
}

module.exports = { getGroupSettings, setGroupSetting, renderWelcome, renderGoodbye, RANDOM_WELCOMES, RANDOM_GOODBYES };
