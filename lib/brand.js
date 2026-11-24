// Shared official response-card frame for WANNA-CRY THANXIEE.
require('dotenv').config();
const BOT_NAME = process.env.BOT_NAME || 'WANNA-CRY THANXIEE';
const CHANNEL_LINK = process.env.BOT_CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z';
const GITHUB_LINK = process.env.BOT_GITHUB_LINK || 'https://github.com/Codezerox145/wanna-crythanxie-v4145';
const BOT_ID = process.env.BOT_ID || '';

const SYMBOLS = [
  [/success|complete|saved|enabled|updated|restored|unbanned|promotion|connected|online|verified|granted/i, '✓'],
  [/fail|error|denied|unknown|invalid|expired|cancel|unavailable|disconnected/i, '✘'],
  [/warning|missing|limit|cooldown|maintenance|large|spam|flood|toxic/i, '⚠'],
  [/anti|security|protect|threat|link violation|bot protection/i, '⛨'],
  [/owner|admin|administrator|moderator|demot|promot/i, '♜'],
  [/vip|premium|passlock|supporter/i, '♕'],
  [/lock|access|permission|private|restricted/i, '🔒'],
  [/unlock|open|public|invitation|invite/i, '🔓'],
  [/pair|connection|reconnect|restart|processing|pending|request/i, '⏳'],
  [/menu|help|command|directory|category/i, '𖤍'],
  [/poll|statistics|database|backup|log|leaderboard/i, '▤'],
  [/ai|analysis|image|chat|session/i, '✧'],
  [/download|media|sticker|file/i, '⬇']
];

function symbolFor(title, explicit) {
  if (explicit) return explicit;
  const found = SYMBOLS.find(([pattern]) => pattern.test(String(title || '')));
  return found ? found[1] : '𖤍';
}

// Keep multiline AI, help and diagnostic output readable: every physical line
// receives the same branded frame instead of allowing unformatted spillover.
function responseLines(values) {
  const source = Array.isArray(values) ? values : [values];
  const lines = [];
  for (const value of source) {
    if (value === null || value === undefined) continue;
    const text = String(value).replace(/\r\n?/g, '\n');
    for (const line of text.split('\n')) {
      const clean = line.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trimEnd();
      if (clean.trim()) lines.push(clean.slice(0, 3500));
    }
  }
  const maxLines = 100;
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines.push('…Output shortened. Ask for a specific section to see more.');
  }
  return lines;
}

function brandedReply(title, lines = [], opts = {}) {
  const clean = responseLines(lines);
  const marker = '𖤍';
  const heading = String(title || 'NOTICE').toUpperCase().slice(0, 100);
  const extras = [];
  if (opts.message) extras.push(...responseLines(opts.message));
  if (opts.footerExtra) extras.push(...responseLines(opts.footerExtra));
  return [
    `┆𖤍╭───────${marker}`,
    `┃𖤍│➣ ${heading}`,
    ...clean.map(line => `┃𖤍│➣ ${line}`),
    ...extras.map(line => `┃𖤍│ ${line}`),
    '┆𖤍│ WANNA CRY THANXIEE',
    '┆𖤍│ Powered by THANXIEE DEV',
    `┗𖤍╰────────${marker}`
  ].join('\n');
}
function brandedMenu(title, entries = []) {
  return brandedReply(title, entries, { marker: '𖤍' });
}
function usageGuide(cmdName, usage, example) {
  return brandedReply(`COMMAND HELP · .${cmdName}`, [`Usage: ${usage}`, `Example: ${example}`], { marker: 'ℹ' });
}
function unknownCommandGuide(prefix, attempted) {
  return brandedReply('UNKNOWN COMMAND', [`Command: ${prefix}${attempted}`, `Prefix: ${prefix}`, `Hint: Use ${prefix}menu`, `Help: Use ${prefix}help ${attempted}`], { marker: '❔' });
}
module.exports = { brandedReply, brandedMenu, usageGuide, unknownCommandGuide, BOT_NAME, CHANNEL_LINK, GITHUB_LINK, BOT_ID, symbolFor, responseLines };
