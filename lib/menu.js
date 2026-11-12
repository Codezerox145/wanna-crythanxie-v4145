// WANNA-CRY THANXIEE v20.2.1 — branded image-card menu system.
// Public menus never disclose VIP or Shadow Enforcement commands.
const { isPrimaryOwner } = require('./permissions');

const CATEGORIES = [
  { id: '1', key: 'group', title: 'GROUP MANAGEMENT', cmd: '.groupmenu', keys: ['group', 'groupset'], icon: '👥' },
  { id: '2', key: 'security', title: 'SECURITY & MODERATION', cmd: '.securitymenu', keys: ['anti', 'moderation'], icon: '🛡️' },
  { id: '3', key: 'bot', title: 'BOT CONTROL & AUTOMATION', cmd: '.botmenu', keys: ['botctl', 'automation'], icon: '⚙️' },
  { id: '4', key: 'ai', title: 'AI INTELLIGENCE', cmd: '.aimenu', keys: ['ai'], icon: '🧠' },
  { id: '5', key: 'download', title: 'DOWNLOAD CENTRE', cmd: '.downloadmenu', keys: ['download'], icon: '📥' },
  { id: '6', key: 'media', title: 'MEDIA & STICKER TOOLS', cmd: '.mediamenu', keys: ['sticker'], icon: '🎬' },
  { id: '7', key: 'utility', title: 'UTILITIES & TOOLS', cmd: '.utilitymenu', keys: ['tools'], icon: '🧰' },
  { id: '8', key: 'community', title: 'COMMUNITY & ENTERTAINMENT', cmd: '.communitymenu', keys: ['profile', 'fun', 'economy'], icon: '🎮' },
  { id: '9', key: 'channel', title: 'CHANNEL & NEWS', cmd: '.channelmenu', keys: ['channel'], icon: '📡' },
  { id: '10', key: 'diag', title: 'DIAGNOSTICS & MAINTENANCE', cmd: '.diagmenu', keys: ['bug'], icon: '🔧' }
];

const VERSION = 'v20.2.1';
const HEADER = `〔 WANNA-CRY THANXIEE · ${VERSION} 〕`;
const FRAME_TOP = '┆𖤍╭───────𖤍';
const FRAME_BOTTOM = '┆𖤍╰────────𖤍';
const line = (label, value) => `┃𖤍│➣ ${label}: ${value}`;

function publicCommands(commandMap = {}) {
  return Object.entries(commandMap).filter(([, def]) =>
    def && !def.hidden && def.category !== 'vip' && def.category !== 'shadow' && typeof def.run === 'function'
  ).map(([name]) => name).sort();
}
function commandCount(commandMap) { return publicCommands(commandMap).length; }
function getMode() {
  try { return String(require('./db').get('settings', 'mode', 'public')).toUpperCase(); }
  catch (_) { return 'PUBLIC'; }
}
function menuHeader(ctx = {}, commandMap = {}, opts = {}) {
  const now = new Date();
  const sender = String(ctx.sender || '').split('@')[0].split(':')[0] || 'user';
  const seconds = Math.floor(process.uptime());
  const uptime = `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(now);
  return [
    HEADER, FRAME_TOP,
    line('Status', 'ONLINE ✅'), line('Active', 'YES'), line('Owner', 'THANXIEE DEV'),
    line('Version', VERSION), line('Prefix', '[ . ]'), line('Mode', getMode()),
    line('Uptime', uptime), line('User', '@' + sender),
    line('Date', date), line('Time', time), line('Cmds', `${commandCount(commandMap)} public`), line('Commands', `${commandCount(commandMap)} public`),
    ...(opts.vip ? [line('VIP Console', 'OWNER ACCESS 🔒')] : []), FRAME_BOTTOM
  ];
}
function menuCard(title, caption, body = []) {
  const sections = Array.isArray(body) ? body : [body];
  const searchable = [String(caption || ''), ...sections.map(String)].join('\n');
  return {
    menuCard: true, title, caption, body: sections,
    includes(value) { return searchable.includes(String(value)); },
    indexOf(value) { return searchable.indexOf(String(value)); },
    toString() { return searchable; }
  };
}
function mainMenu(ctx = {}, commandMap = {}) {
  const ownerPrivate = !ctx.isGroup && isPrimaryOwner(ctx.sender);
  const nav = CATEGORIES.map(c => line(`${c.id}. ${c.icon} ${c.title}`, c.cmd));
  const caption = [
    '𖤍━━━━━━━━━━━━━━━━━━━━𖤍',
    '        WANNA CRY THANXIEE',
    '       THE NEXT-GEN WHATSAPP BOT',
    '𖤍━━━━━━━━━━━━━━━━━━━━𖤍',
    ...menuHeader(ctx, commandMap, { vip: ownerPrivate }),
    '〔 MAIN MENU · QUICK NAVIGATION 〕', FRAME_TOP,
    ...nav,
    ...(ownerPrivate ? [line('VIP Console', '.vipmenu')] : []),
    line('All Commands', '.allmenu'), line('Pair Bot', '.pair'),
    line('Command Help', '.help <command>'), FRAME_BOTTOM,
    '┃𖤍│Tip: send a category command to open its command list.',
    '┃𖤍│Example: .aimenu  |  .downloadmenu',
    '┃𖤍│Powered by THANXIEE DEV'
  ].join('\n');
  return menuCard('MAIN MENU', caption);
}
function categoryByNumberOrKey(input) {
  const value = String(input).trim().toLowerCase().replace(/^\./, '');
  return CATEGORIES.find(c => c.id === value || c.key === value || c.cmd.slice(1) === value);
}
function renderCategory(category, commandMap = {}, ctx = {}) {
  if (!category) return mainMenu(ctx, commandMap);
  const names = publicCommands(commandMap).filter(name => category.keys.includes(commandMap[name]?.category));
  const entries = names.length
    ? names.map((name, i) => `┃𖤍│ ${String(i + 1).padStart(2, '0')}. .${name}`)
    : ['┃𖤍│No public commands are registered in this category yet.'];
  const caption = [
    `𖤍〔 ${category.icon} ${category.title} 〕`, FRAME_TOP,
    ...entries, FRAME_BOTTOM,
    `┃𖤍│Commands listed: ${names.length}`,
    '┃𖤍│Use .help <command> for usage and examples.',
    '┃𖤍│Use .menu to return to the main menu.',
    '┃𖤍│Powered by THANXIEE DEV'
  ].join('\n');
  return menuCard(category.title, caption);
}
function renderAllMenu(commandMap = {}, ctx = {}) {
  const ownerPrivate = !ctx.isGroup && isPrimaryOwner(ctx.sender);
  const body = [];
  const printed = new Set();
  for (const category of CATEGORIES) {
    const names = publicCommands(commandMap).filter(name =>
      category.keys.includes(commandMap[name]?.category) && !printed.has(name)
    );
    names.forEach(name => printed.add(name));
    if (names.length) body.push([
      `〔 ${category.icon} ${category.title} 〕`, FRAME_TOP,
      ...names.map((name, i) => `┃𖤍│ ${String(i + 1).padStart(2, '0')}. .${name}`),
      FRAME_BOTTOM,
      '┃𖤍│Use .help <command> for usage.'
    ].join('\n'));
  }
  const remaining = publicCommands(commandMap).filter(name => !printed.has(name));
  if (remaining.length) body.push(['〔 OTHER PUBLIC COMMANDS 〕', FRAME_TOP,
    ...remaining.map(name => `┃𖤍│➣ .${name}`), FRAME_BOTTOM].join('\n'));
  body.push(['〔 QUICK ACCESS 〕', FRAME_TOP,
    '┃𖤍│➣ .menu — Main menu', '┃𖤍│➣ .allmenu — Full command directory',
    '┃𖤍│➣ .help <command> — Command instructions',
    '┃𖤍│➣ .pair — Pairing website', FRAME_BOTTOM].join('\n'));
  if (ownerPrivate) body.push(['〔 OWNER CONSOLE 🔒 〕', FRAME_TOP,
    '┃𖤍│➣ .vipmenu', '┃𖤍│➣ Verified owner identity and passlock required', FRAME_BOTTOM].join('\n'));
  const caption = [
    '𖤍━━━━━━━━━━━━━━━━━━━━𖤍', 'WANNA CRY THANXIEE · COMPLETE DIRECTORY',
    ...menuHeader(ctx, commandMap, { vip: ownerPrivate }),
    `┃𖤍│Public commands: ${publicCommands(commandMap).length}`,
    '┃𖤍│Each category is sent as a separate branded image card.',
    '┃𖤍│Powered by THANXIEE DEV'
  ].join('\n');
  return menuCard('ALL COMMANDS', caption, body);
}
module.exports = { VERSION, CATEGORIES, mainMenu, categoryByNumberOrKey, renderCategory, renderAllMenu, publicCommands };
