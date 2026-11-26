// WANNA-CRY THANXIEE v20.2.2 — paginated, branded command directory.
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

const VERSION = 'v20.2.2';
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
  const owner = process.env.OWNER_NICKNAME || 'THANXIEE DEV';
  const contact = process.env.OWNER_NUMBERS || '+263780706629';
  const botName = process.env.BOT_DISPLAY_NAME || process.env.BOT_NAME || 'WANNA-CRY THANXIEE';
  const prefix = process.env.BOT_PREFIX || '.';
  return [
    HEADER, FRAME_TOP,
    line('Owner', owner), line('Contact', contact), line('Bot', botName),
    line('Version', VERSION), line('Status', ctx.sock?.user ? 'Online' : 'Ready'),
    line('Active', ctx.sock?.user ? 'Connected' : 'Available'),
    line('Prefix', `[ ${prefix} ]`), line('Mode', getMode()),
    line('Uptime', uptime), line('User', '@' + sender),
    line('Date', date), line('Time', time), line('Cmds', `${commandCount(commandMap)} public`),
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
  const prefix = process.env.BOT_PREFIX || '.';
  const quickCommands = [...CATEGORIES.map(category => category.cmd.slice(1)), 'allmenu'];
  const caption = [
    ...menuHeader(ctx, commandMap, { vip: ownerPrivate }),
    '〔 MAIN MENU 〕', FRAME_TOP,
    ...quickCommands.map(name => line('', `${prefix}${name}`).replace('➣ :', '➣')),
    ...(ownerPrivate ? [line('VIP Console', `${prefix}vipmenu`)] : []),
    FRAME_BOTTOM,
    '┃𖤍│➣ Send any menu command to open its section.',
    '┃𖤍│➣ .setmenuimage — Set your personal menu image',
    '┃𖤍│➣ .resetmenuimage — Restore the default image',
    `┃𖤍│➣ ${prefix}pair — Pair a device / open dashboard`,
    `┃𖤍│➣ ${prefix}help <command> — Command instructions`,
    '┃𖤍│Powered by THANXIEE DEV'
  ].join('\n');
  return menuCard('MAIN MENU', caption);
}
// MIN MENU and MAIN MENU intentionally share one renderer and identical output.
function minMenu(ctx = {}, commandMap = {}) {
  return mainMenu(ctx, commandMap);
}
function categoryByNumberOrKey(input) {
  const value = String(input).trim().toLowerCase().replace(/^\./, '');
  return CATEGORIES.find(c => c.id === value || c.key === value || c.cmd.slice(1) === value);
}
function romanNumeral(value) {
  const numerals = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let number = value;
  let result = '';
  for (const [amount, symbol] of numerals) {
    while (number >= amount) { result += symbol; number -= amount; }
  }
  return result;
}
function chunkCommands(names, size = 10) {
  const pages = [];
  for (let offset = 0; offset < names.length; offset += size) pages.push(names.slice(offset, offset + size));
  return pages;
}
function renderCategory(category, commandMap = {}, ctx = {}) {
  if (!category) return mainMenu(ctx, commandMap);
  const names = publicCommands(commandMap).filter(name => category.keys.includes(commandMap[name]?.category));
  if (!names.length) {
    const caption = [
      '𖤍〔 ' + category.icon + ' ' + category.title + ' 〕', FRAME_TOP,
      '┃𖤍│No public commands are registered in this category yet.',
      FRAME_BOTTOM, '┃𖤍│Use .menu to return to the main menu.'
    ].join('\n');
    return menuCard(category.title, caption);
  }

  const pages = chunkCommands(names, 10);
  const body = pages.map((page, pageIndex) => {
    const sectionTitle = pages.length > 1 ? category.title + ' ' + romanNumeral(pageIndex + 1) : category.title;
    return [
      '𖤍〔 ' + category.icon + ' ' + sectionTitle + ' 〕', FRAME_TOP,
      ...page.map((name, index) => '┃𖤍│ ' + String(pageIndex * 10 + index + 1).padStart(2, '0') + '. .' + name),
      FRAME_BOTTOM,
      '┃𖤍│Commands: ' + page.length + ' / ' + names.length,
      '┃𖤍│Use .help <command> for usage and examples.',
      '┃𖤍│Use .menu to return to the main menu.',
      '┃𖤍│Powered by THANXIEE DEV'
    ].join('\n');
  });
  const caption = [
    '𖤍〔 ' + category.icon + ' ' + category.title + ' · COMMAND DIRECTORY 〕',
    '┃𖤍│Total commands: ' + names.length,
    '┃𖤍│Sections: ' + pages.length + ' · Maximum 10 commands per section',
    '┃𖤍│Each section is sent as its own menu card.',
    '┃𖤍│Powered by THANXIEE DEV'
  ].join('\n');
  return menuCard(category.title, caption, body);
}
function renderAllMenu(commandMap = {}, ctx = {}) {
  const ownerPrivate = !ctx.isGroup && isPrimaryOwner(ctx.sender);
  const body = [];
  const printed = new Set();
  const pageSize = 10; // Keep every public menu section to ten commands.
  let sectionNumber = 0;

  for (const category of CATEGORIES) {
    const names = publicCommands(commandMap).filter(name =>
      category.keys.includes(commandMap[name]?.category) && !printed.has(name)
    );
    names.forEach(name => printed.add(name));
    if (!names.length) continue;

    const pages = [];
    for (let offset = 0; offset < names.length; offset += pageSize) {
      pages.push(names.slice(offset, offset + pageSize));
    }

    pages.forEach((page, pageIndex) => {
      sectionNumber += 1;
      const suffix = pages.length > 1 ? ` ${romanNumeral(pageIndex + 1)}` : '';
      const heading = `${String(sectionNumber).padStart(2, '0')} · ${category.title}${suffix}`;
      body.push([
        `〔 ${category.icon} ${heading} 〕`, FRAME_TOP,
        ...page.map(name => `┃𖤍│➣ .${name}`),
        FRAME_BOTTOM,
        `┃𖤍│Commands: ${page.length} / ${names.length} in this category`,
        '┃𖤍│Use .help <command> for usage and examples.'
      ].join('\n'));
    });
  }

  const remaining = publicCommands(commandMap).filter(name => !printed.has(name));
  if (remaining.length) {
    for (let offset = 0; offset < remaining.length; offset += pageSize) {
      sectionNumber += 1;
      const page = remaining.slice(offset, offset + pageSize);
      const otherPages = Math.ceil(remaining.length / pageSize);\n      const suffix = otherPages > 1 ? ` ${romanNumeral(Math.floor(offset / pageSize) + 1)}` : '';
      body.push([
        `〔 ${String(sectionNumber).padStart(2, '0')} · OTHER PUBLIC COMMANDS${suffix} 〕`, FRAME_TOP,
        ...page.map(name => `┃𖤍│➣ .${name}`),
        FRAME_BOTTOM,
        `┃𖤍│Commands: ${page.length}`
      ].join('\n'));
    }
  }

  body.push(['〔 QUICK ACCESS 〕', FRAME_TOP,
    '┃𖤍│➣ .menu — Main menu', '┃𖤍│➣ .allmenu — Full command directory',
    '┃𖤍│➣ .help <command> — Command instructions',
    '┃𖤍│➣ .pair — Pairing website', FRAME_BOTTOM].join('\n'));
  if (ownerPrivate) body.push(['〔 OWNER CONSOLE 🔒 〕', FRAME_TOP,
    '┃𖤍│➣ .vipmenu', '┃𖤍│➣ Verified owner identity and passlock required', FRAME_BOTTOM].join('\n'));

  const caption = [
    '𖤍━━━━━━━━━━━━━━━━━━━━𖤍', 'WANNA-CRY THANXIEE · COMPLETE DIRECTORY',
    ...menuHeader(ctx, commandMap, { vip: ownerPrivate }),
    `┃𖤍│Public commands: ${publicCommands(commandMap).length}`,
    `┃𖤍│Sections: ${sectionNumber}`,
    `┃𖤍│Each numbered section is sent as a separate menu card.`,
    '┃𖤍│Powered by THANXIEE DEV'
  ].join('\n');
  return menuCard('ALL COMMANDS', caption, body);
}
module.exports = { VERSION, CATEGORIES, mainMenu, minMenu, categoryByNumberOrKey, renderCategory, renderAllMenu, publicCommands };
