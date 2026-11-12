// Central premium response-card styling and official project links.
require('dotenv').config();
const BOT_NAME = process.env.BOT_NAME || 'WANNA-CRY THANXIEE';
const CHANNEL_LINK = process.env.BOT_CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z';
const GITHUB_LINK = process.env.BOT_GITHUB_LINK || 'https://github.com/Codezerox145/wanna-crythanxie-v4145';
const BOT_ID = process.env.BOT_ID || '';
const DIVIDER = '━━━━━━━━━━━━━━━━━━━━';
function brandedReply(title, lines = [], opts = {}) {
  const clean = lines.filter(v => v !== null && v !== undefined).map(v => String(v));
  const marker = opts.marker || '✧';
  return [
    `┆𖤍╭───────${marker}`,
    `┃𖤍│➣ ${BOT_NAME}`,
    `┃𖤍│➣ ${String(title).toUpperCase()}`,
    ...clean.map(line => `┃𖤍│ ${line}`),
    opts.footerExtra ? `┃𖤍│ ${opts.footerExtra}` : null,
    `┃𖤍│ Powered by THANXIEE DEV`,
    `┃𖤍│ Channel: ${CHANNEL_LINK}`,
    `┃𖤍│ GitHub: ${GITHUB_LINK}`,
    `┗𖤍╰────────${marker}`
  ].filter(Boolean).join('\n');
}
function brandedMenu(title, entries = []) {
  return brandedReply(title, entries, {});
}
function usageGuide(cmdName, usage, example) {
  return brandedReply(`HELP · .${cmdName}`, [`Usage: ${usage}`, `Example: ${example}`]);
}
function unknownCommandGuide(prefix, attempted) {
  return brandedReply('COMMAND NOT FOUND', [`Unknown command: ${prefix}${attempted}`, `Use ${prefix}menu to browse commands.`, `Use ${prefix}help <command> for instructions.`]);
}
module.exports = { brandedReply, brandedMenu, usageGuide, unknownCommandGuide, BOT_NAME, CHANNEL_LINK, GITHUB_LINK, BOT_ID };
