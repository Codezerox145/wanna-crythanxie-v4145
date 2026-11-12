// VIP / SHADOW SECURITY CONSOLE — verified primary owner + expiring second factor.
const { brandedReply, brandedMenu, usageGuide, CHANNEL_LINK, GITHUB_LINK } = require('../lib/brand');
const vip = require('../lib/vip');
const { isPrimaryOwner } = require('../lib/permissions');
function owner(ctx) { return isPrimaryOwner(ctx.sender); }
function denied() { return brandedReply('ACCESS DENIED', ['⛔ Access Denied — Owner Only.']); }
const shadowCommands = Object.keys(require('./shadowEnforcement'))
  .filter(name => name !== 'shadowmenu')
  .sort();

function vipMenuLines(ctx, state) {
  const now = new Date();
  const uptimeSeconds = Math.floor(process.uptime());
  const uptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`;
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium' }).format(now);
  const user = String(ctx.sender || '').split('@')[0];
  return [
    '〔 WANNA-CRY THANXIEE · v20.1.0 〕',
    '┆𖤍╭────↯',
    '┃𖤍│➣ Owner   : THANXIE DEV',
    '┃𖤍│➣ Contact : +263780706629',
    '┃𖤍│➣ Link    : wa.me/263780706629',
    '┃𖤍│➣ Bot     : WANNA-CRY THANXIEE',
    '┃𖤍│➣ Version : v20.1.0',
    '┃𖤍│➣ Prefix  : [ . ]',
    '┃𖤍│➣ Mode    : Public',
    '┃𖤍│➣ Uptime  : ' + uptime,
    '┃𖤍│➣ User    : @' + user,
    '┃𖤍│➣ Date    : ' + date,
    '┃𖤍│➣ Time    : ' + time,
    '┃𖤍│➣ Cmds    : ' + shadowCommands.length + ' registered Shadow Enforcement commands',
    '┃𖤍│➣ VIP     : ' + (state.unlocked ? 'UNLOCKED' : 'LOCKED'),
    '┃𖤍╰────↯',
    '',
    '〔 SHADOW ENFORCEMENT · OWNER ONLY 🔒 〕',
    '┆𖤍╭────↯',
    ...shadowCommands.map(name => '┃𖤍│➣ .' + name),
    '┆𖤍╰────↯',
    '',
    '〔 VIP SECURITY CONTROLS 〕',
    '┆𖤍╭────↯',
    '┃𖤍│➣ .vip',
    '┃𖤍│➣ .genpass 1h | 24h | 7d',
    '┃𖤍│➣ .vipunlock <passlock>',
    '┃𖤍│➣ .passinfo',
    '┃𖤍│➣ .revokepass',
    '┃𖤍│➣ .viplock',
    '┃𖤍│➣ .vipaudit',
    '┆𖤍╰────↯',
    '',
    '┆𖤍╭────↯',
    '┃𖤍│➣ Powered by : WANNA-CRY THANXIEE',
    '┃𖤍│➣ Owner      : THANXIE DEV',
    '┃𖤍│➣ Contact    : +263780706629',
    '┃𖤍│➣ Version    : v20.1.0',
    '┃𖤍│➣ Channel    : ' + CHANNEL_LINK,
    '┃𖤍│➣ GitHub     : ' + GITHUB_LINK,
    '┃𖤍│➣ Stay Smart. WANNA-CRY THANXIEE',
    '┆𖤍╰────↯',
    '╰┄┄┄┄┄┄┄┄┄┄┄┄┄〩'
  ];
}

const commands = {
  vip: { category: 'vip', hidden: true, usage: '.vip', example: '.vip', async run(ctx) {
    if (!owner(ctx)) return denied();
    if (ctx.isGroup) return brandedReply('PRIVATE CHAT REQUIRED', ['Open the bot private chat for owner controls.']);
    const state = vip.info();
    return brandedReply('OWNER VIP CONTROL PANEL', [
      'Status : ' + (state.unlocked ? 'UNLOCKED' : 'LOCKED'),
      'Expiry : ' + (state.unlockedUntil ? new Date(state.unlockedUntil).toLocaleString() : '—'),
      'Generate: .genpass 1h, .genpass 24h, or .genpass 7d',
      'Unlock: .vipunlock <passlock>',
      'Menu: .vipmenu (available after unlocking)',
      'Passlocks are single-use. Owner identity is checked for every protected command.'
    ]);
  }},
  genpass: { category: 'vip', hidden: true, usage: '.genpass 1h|24h|7d', example: '.genpass 1h', async run(ctx) {
    if (!owner(ctx)) return denied();
    if (ctx.isGroup) return brandedReply('PRIVATE CHAT REQUIRED', ['Generate passlocks only in the bot private chat.']);
    try { const result = vip.createPasslock(ctx.sender, ctx.args[0] || '1h'); return brandedReply('TEMPORARY PASSLOCK GENERATED', ['Passlock : ' + result.passlock, 'Expires : ' + new Date(result.expiresAt).toLocaleString(), 'Shown once only. Never forward or post in groups.']); }
    catch (_) { return usageGuide('genpass', '.genpass 1h|24h|7d', '.genpass 1h'); }
  }},
  vipgen: { category: 'vip', hidden: true, usage: '.vipgen 1h|24h|7d', example: '.vipgen 1h', async run(ctx) { return commands.genpass.run(ctx); }},
  vipunlock: { category: 'vip', hidden: true, usage: '.vipunlock <passlock>', example: '.vipunlock <passlock>', async run(ctx) {
    if (!owner(ctx)) return denied();
    if (ctx.isGroup) return brandedReply('PRIVATE CHAT REQUIRED', ['Unlock VIP only in the bot private chat.']);
    const result = vip.unlock(ctx.sender, ctx.args[0]);
    return result.ok ? brandedReply('VIP UNLOCKED', ['Expires : ' + new Date(result.expiresAt).toLocaleString(), 'Owner verification remains mandatory.']) : brandedReply('UNLOCK FAILED', [result.reason]);
  }},
  passinfo: { category: 'vip', hidden: true, usage: '.passinfo', example: '.passinfo', async run(ctx) {
    if (!owner(ctx)) return denied();
    const state = vip.info();
    return brandedReply('PASSLOCK STATUS', ['VIP : ' + (state.unlocked ? 'UNLOCKED' : 'LOCKED'), 'Access expiry : ' + (state.unlockedUntil ? new Date(state.unlockedUntil).toLocaleString() : '—'), 'Last passlock expiry : ' + (state.passlock ? new Date(state.passlock.expiresAt).toLocaleString() : 'None'), 'Revoked : ' + (state.passlock && state.passlock.revoked ? 'Yes' : 'No')]);
  }},
  vipstatus: { category: 'vip', hidden: true, usage: '.vipstatus', example: '.vipstatus', async run(ctx) { return commands.passinfo.run(ctx); }},
  revokepass: { category: 'vip', hidden: true, usage: '.revokepass', example: '.revokepass', async run(ctx) { if (!owner(ctx)) return denied(); vip.revoke(ctx.sender); return brandedReply('PASSLOCK REVOKED', ['VIP access has been locked immediately.']); }},
  viplock: { category: 'vip', hidden: true, usage: '.viplock', example: '.viplock', async run(ctx) { if (!owner(ctx)) return denied(); vip.lock(ctx.sender); return brandedReply('VIP LOCKED', ['VIP and Shadow Enforcement commands are locked.']); }},
  vipaudit: { category: 'vip', hidden: true, usage: '.vipaudit', example: '.vipaudit', async run(ctx) {
    if (!owner(ctx)) return denied();
    if (ctx.isGroup) return brandedReply('PRIVATE CHAT REQUIRED', ['Open the bot private chat to view security logs.']);
    const events = vip.auditLog();
    return brandedReply('VIP SECURITY AUDIT', events.length ? events.map(e => `${e.event} · ${new Date(e.at).toISOString()}`) : ['No VIP security events recorded yet.']);
  }},
  vipmenu: { category: 'vip', hidden: true, usage: '.vipmenu', example: '.vipmenu', async run(ctx) {
    if (!owner(ctx)) return denied();
    if (ctx.isGroup) return brandedReply('PRIVATE CHAT REQUIRED', ['Open the bot private chat to use the VIP console.']);
    const state = vip.info();
    if (!state.unlocked) return brandedReply('VIP LOCKED', ['Generate a temporary passlock with .genpass 1h, then unlock using .vipunlock <passlock>.']);
    return brandedMenu('VIP MENU · SHADOW DEFENSE X', vipMenuLines(ctx, state));
  }}
};
module.exports = commands;
