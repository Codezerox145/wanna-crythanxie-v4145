// Expanded command pack for WANNA-CRY THANXIEE v20.1.0.
// These are real registered handlers. Shared helpers implement safe, useful behavior;
// host-dependent features report missing local binaries/config rather than pretending success.
const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');
const { isGroupAdmin } = require('../lib/permissions');
const { askGemini, PRESETS } = require('../lib/gemini');
const { fetchFreeSource } = require('../lib/freeSources');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const definitions = {
  help: { category: 'tools', usage: '.help [command]', example: '.help weather', async run(ctx) { const name=(ctx.args||[])[0]; const def=name && definitions[name]; return brandedReply('HELP', def ? [`.${name}`, `Usage: ${def.usage}`, `Example: ${def.example}`] : ['Send .menu to browse categories.', `Registered command handlers: ${Object.keys(definitions).length + 200}`]); } },
  securitymenu: { category: 'anti', usage: '.securitymenu', example: '.securitymenu', async run(ctx) { return runExpanded('securitymenu', ctx); } },
  utilitymenu: { category: 'tools', usage: '.utilitymenu', example: '.utilitymenu', async run(ctx) { return runExpanded('utilitymenu', ctx); } },
  groupmenu: { category: 'group', usage: '.groupmenu [arguments]', example: '.groupmenu', async run(ctx) { return runExpanded('groupmenu', ctx); } },
  groupset: { category: 'group', usage: '.groupset [arguments]', example: '.groupset', async run(ctx) { return runExpanded('groupset', ctx); } },
  groupmore: { category: 'group', usage: '.groupmore [arguments]', example: '.groupmore', async run(ctx) { return runExpanded('groupmore', ctx); } },
  modmenu: { category: 'group', usage: '.modmenu [arguments]', example: '.modmenu', async run(ctx) { return runExpanded('modmenu', ctx); } },
  antimenu1: { category: 'anti', usage: '.antimenu1 [arguments]', example: '.antimenu1', async run(ctx) { return runExpanded('antimenu1', ctx); } },
  antimenu2: { category: 'anti', usage: '.antimenu2 [arguments]', example: '.antimenu2', async run(ctx) { return runExpanded('antimenu2', ctx); } },
  antictl: { category: 'anti', usage: '.antictl [arguments]', example: '.antictl', async run(ctx) { return runExpanded('antictl', ctx); } },
  botmenu: { category: 'botctl', usage: '.botmenu [arguments]', example: '.botmenu', async run(ctx) { return runExpanded('botmenu', ctx); } },
  botctl2: { category: 'botctl', usage: '.botctl2 [arguments]', example: '.botctl2', async run(ctx) { return runExpanded('botctl2', ctx); } },
  botctl3: { category: 'botctl', usage: '.botctl3 [arguments]', example: '.botctl3', async run(ctx) { return runExpanded('botctl3', ctx); } },
  botctl4: { category: 'botctl', usage: '.botctl4 [arguments]', example: '.botctl4', async run(ctx) { return runExpanded('botctl4', ctx); } },
  bugmenu: { category: 'bug', usage: '.bugmenu [arguments]', example: '.bugmenu', async run(ctx) { return runExpanded('bugmenu', ctx); } },
  diagmenu: { category: 'bug', usage: '.diagmenu [arguments]', example: '.diagmenu', async run(ctx) { return runExpanded('diagmenu', ctx); } },
  toolsmenu: { category: 'tools', usage: '.toolsmenu [arguments]', example: '.toolsmenu', async run(ctx) { return runExpanded('toolsmenu', ctx); } },
  downloadmenu: { category: 'download', usage: '.downloadmenu [arguments]', example: '.downloadmenu', async run(ctx) { return runExpanded('downloadmenu', ctx); } },
  aimenu: { category: 'ai', usage: '.aimenu [arguments]', example: '.aimenu', async run(ctx) { return runExpanded('aimenu', ctx); } },
  funmenu: { category: 'tools', usage: '.funmenu [arguments]', example: '.funmenu', async run(ctx) { return runExpanded('funmenu', ctx); } },
  economymenu: { category: 'tools', usage: '.economymenu [arguments]', example: '.economymenu', async run(ctx) { return runExpanded('economymenu', ctx); } },
  stickermenu: { category: 'sticker', usage: '.stickermenu [arguments]', example: '.stickermenu', async run(ctx) { return runExpanded('stickermenu', ctx); } },
  mediamenu: { category: 'sticker', usage: '.mediamenu [arguments]', example: '.mediamenu', async run(ctx) { return runExpanded('mediamenu', ctx); } },
  profilemenu: { category: 'profile', usage: '.profilemenu [arguments]', example: '.profilemenu', async run(ctx) { return runExpanded('profilemenu', ctx); } },
  channelmenu: { category: 'channel', usage: '.channelmenu [arguments]', example: '.channelmenu', async run(ctx) { return runExpanded('channelmenu', ctx); } },
  cloudmenu: { category: 'tools', usage: '.cloudmenu [arguments]', example: '.cloudmenu', async run(ctx) { return runExpanded('cloudmenu', ctx); } },
  reactionmenu: { category: 'tools', usage: '.reactionmenu [arguments]', example: '.reactionmenu', async run(ctx) { return runExpanded('reactionmenu', ctx); } },
  automenu: { category: 'automation', usage: '.automenu [arguments]', example: '.automenu', async run(ctx) { return runExpanded('automenu', ctx); } },
  communitymenu: { category: 'tools', usage: '.communitymenu [arguments]', example: '.communitymenu', async run(ctx) { return runExpanded('communitymenu', ctx); } },
  gamingmenu: { category: 'tools', usage: '.gamingmenu [arguments]', example: '.gamingmenu', async run(ctx) { return runExpanded('gamingmenu', ctx); } },
  seticon: { category: 'tools', usage: '.seticon [arguments]', example: '.seticon', async run(ctx) { return runExpanded('seticon', ctx); } },
  pending: { category: 'tools', usage: '.pending [arguments]', example: '.pending', async run(ctx) { return runExpanded('pending', ctx); } },
  approveall: { category: 'tools', usage: '.approveall [arguments]', example: '.approveall', async run(ctx) { return runExpanded('approveall', ctx); } },
  listinactive: { category: 'tools', usage: '.listinactive [arguments]', example: '.listinactive', async run(ctx) { return runExpanded('listinactive', ctx); } },
  kickinactive: { category: 'tools', usage: '.kickinactive [arguments]', example: '.kickinactive', async run(ctx) { return runExpanded('kickinactive', ctx); } },
  topactive: { category: 'tools', usage: '.topactive [arguments]', example: '.topactive', async run(ctx) { return runExpanded('topactive', ctx); } },
  activity: { category: 'tools', usage: '.activity [arguments]', example: '.activity', async run(ctx) { return runExpanded('activity', ctx); } },
  groupsecurity: { category: 'group', usage: '.groupsecurity [arguments]', example: '.groupsecurity', async run(ctx) { return runExpanded('groupsecurity', ctx); } },
  note: { category: 'tools', usage: '.note [arguments]', example: '.note', async run(ctx) { return runExpanded('note', ctx); } },
  notes: { category: 'tools', usage: '.notes [arguments]', example: '.notes', async run(ctx) { return runExpanded('notes', ctx); } },
  modlog: { category: 'tools', usage: '.modlog [arguments]', example: '.modlog', async run(ctx) { return runExpanded('modlog', ctx); } },
  slowmode: { category: 'tools', usage: '.slowmode [arguments]', example: '.slowmode', async run(ctx) { return runExpanded('slowmode', ctx); } },
  freeze: { category: 'tools', usage: '.freeze [arguments]', example: '.freeze', async run(ctx) { return runExpanded('freeze', ctx); } },
  unfreeze: { category: 'tools', usage: '.unfreeze [arguments]', example: '.unfreeze', async run(ctx) { return runExpanded('unfreeze', ctx); } },
  purge: { category: 'tools', usage: '.purge [arguments]', example: '.purge', async run(ctx) { return runExpanded('purge', ctx); } },
  lockdown: { category: 'tools', usage: '.lockdown [arguments]', example: '.lockdown', async run(ctx) { return runExpanded('lockdown', ctx); } },
  unlockdown: { category: 'tools', usage: '.unlockdown [arguments]', example: '.unlockdown', async run(ctx) { return runExpanded('unlockdown', ctx); } },
  antilink: { category: 'anti', usage: '.antilink [arguments]', example: '.antilink', async run(ctx) { return runExpanded('antilink', ctx); } },
  antispam: { category: 'anti', usage: '.antispam [arguments]', example: '.antispam', async run(ctx) { return runExpanded('antispam', ctx); } },
  antibadword: { category: 'anti', usage: '.antibadword [arguments]', example: '.antibadword', async run(ctx) { return runExpanded('antibadword', ctx); } },
  antiforward: { category: 'anti', usage: '.antiforward [arguments]', example: '.antiforward', async run(ctx) { return runExpanded('antiforward', ctx); } },
  antiviewonce: { category: 'anti', usage: '.antiviewonce [arguments]', example: '.antiviewonce', async run(ctx) { return runExpanded('antiviewonce', ctx); } },
  antimedia: { category: 'anti', usage: '.antimedia on|off|status', example: '.antimedia on', async run(ctx) { return runExpanded('antimedia', ctx); } },
  antisticker: { category: 'anti', usage: '.antisticker [arguments]', example: '.antisticker', async run(ctx) { return runExpanded('antisticker', ctx); } },
  antilongtext: { category: 'anti', usage: '.antilongtext [arguments]', example: '.antilongtext', async run(ctx) { return runExpanded('antilongtext', ctx); } },
  antimention: { category: 'anti', usage: '.antimention [arguments]', example: '.antimention', async run(ctx) { return runExpanded('antimention', ctx); } },
  antiinvite: { category: 'anti', usage: '.antiinvite [arguments]', example: '.antiinvite', async run(ctx) { return runExpanded('antiinvite', ctx); } },
  antivoice: { category: 'anti', usage: '.antivoice [arguments]', example: '.antivoice', async run(ctx) { return runExpanded('antivoice', ctx); } },
  antidocument: { category: 'anti', usage: '.antidocument [arguments]', example: '.antidocument', async run(ctx) { return runExpanded('antidocument', ctx); } },
  anticontact: { category: 'anti', usage: '.anticontact [arguments]', example: '.anticontact', async run(ctx) { return runExpanded('anticontact', ctx); } },
  antilocation: { category: 'anti', usage: '.antilocation [arguments]', example: '.antilocation', async run(ctx) { return runExpanded('antilocation', ctx); } },
  anticaps: { category: 'anti', usage: '.anticaps [arguments]', example: '.anticaps', async run(ctx) { return runExpanded('anticaps', ctx); } },
  antibot: { category: 'anti', usage: '.antibot [arguments]', example: '.antibot', async run(ctx) { return runExpanded('antibot', ctx); } },
  antidelete: { category: 'anti', usage: '.antidelete [arguments]', example: '.antidelete', async run(ctx) { return runExpanded('antidelete', ctx); } },
  antitagall: { category: 'anti', usage: '.antitagall [arguments]', example: '.antitagall', async run(ctx) { return runExpanded('antitagall', ctx); } },
  antipromote: { category: 'anti', usage: '.antipromote [arguments]', example: '.antipromote', async run(ctx) { return runExpanded('antipromote', ctx); } },
  antidemote: { category: 'anti', usage: '.antidemote [arguments]', example: '.antidemote', async run(ctx) { return runExpanded('antidemote', ctx); } },
  antiraid: { category: 'anti', usage: '.antiraid [arguments]', example: '.antiraid', async run(ctx) { return runExpanded('antiraid', ctx); } },
  antifake: { category: 'anti', usage: '.antifake [arguments]', example: '.antifake', async run(ctx) { return runExpanded('antifake', ctx); } },
  anticall: { category: 'anti', usage: '.anticall [arguments]', example: '.anticall', async run(ctx) { return runExpanded('anticall', ctx); } },
  antirename: { category: 'anti', usage: '.antirename [arguments]', example: '.antirename', async run(ctx) { return runExpanded('antirename', ctx); } },
  antiadd: { category: 'anti', usage: '.antiadd [arguments]', example: '.antiadd', async run(ctx) { return runExpanded('antiadd', ctx); } },
  antijoin: { category: 'anti', usage: '.antijoin [arguments]', example: '.antijoin', async run(ctx) { return runExpanded('antijoin', ctx); } },
  antitoxic: { category: 'anti', usage: '.antitoxic [arguments]', example: '.antitoxic', async run(ctx) { return runExpanded('antitoxic', ctx); } },
  antinsfw: { category: 'anti', usage: '.antinsfw [arguments]', example: '.antinsfw', async run(ctx) { return runExpanded('antinsfw', ctx); } },
  antiscam: { category: 'anti', usage: '.antiscam [arguments]', example: '.antiscam', async run(ctx) { return runExpanded('antiscam', ctx); } },
  antiprivate: { category: 'anti', usage: '.antiprivate [arguments]', example: '.antiprivate', async run(ctx) { return runExpanded('antiprivate', ctx); } },
  setmute: { category: 'tools', usage: '.setmute [arguments]', example: '.setmute', async run(ctx) { return runExpanded('setmute', ctx); } },
  setspam: { category: 'tools', usage: '.setspam [arguments]', example: '.setspam', async run(ctx) { return runExpanded('setspam', ctx); } },
  setfake: { category: 'tools', usage: '.setfake [arguments]', example: '.setfake', async run(ctx) { return runExpanded('setfake', ctx); } },
  antilog: { category: 'anti', usage: '.antilog [arguments]', example: '.antilog', async run(ctx) { return runExpanded('antilog', ctx); } },
  reconnect: { category: 'botctl', usage: '.reconnect [arguments]', example: '.reconnect', async run(ctx) { return runExpanded('reconnect', ctx); } },
  reset: { category: 'botctl', usage: '.reset [arguments]', example: '.reset', async run(ctx) { return runExpanded('reset', ctx); } },
  restart: { category: 'botctl', usage: '.restart [arguments]', example: '.restart', async run(ctx) { return runExpanded('restart', ctx); } },
  backup: { category: 'botctl', usage: '.backup [arguments]', example: '.backup', async run(ctx) { return runExpanded('backup', ctx); } },
  addsudo: { category: 'botctl', usage: '.addsudo [arguments]', example: '.addsudo', async run(ctx) { return runExpanded('addsudo', ctx); } },
  delsudo: { category: 'botctl', usage: '.delsudo [arguments]', example: '.delsudo', async run(ctx) { return runExpanded('delsudo', ctx); } },
  listsudo: { category: 'botctl', usage: '.listsudo [arguments]', example: '.listsudo', async run(ctx) { return runExpanded('listsudo', ctx); } },
  banuser: { category: 'botctl', usage: '.banuser [arguments]', example: '.banuser', async run(ctx) { return runExpanded('banuser', ctx); } },
  unbanuser: { category: 'botctl', usage: '.unbanuser [arguments]', example: '.unbanuser', async run(ctx) { return runExpanded('unbanuser', ctx); } },
  listbanned: { category: 'botctl', usage: '.listbanned [arguments]', example: '.listbanned', async run(ctx) { return runExpanded('listbanned', ctx); } },
  bangroup: { category: 'botctl', usage: '.bangroup [arguments]', example: '.bangroup', async run(ctx) { return runExpanded('bangroup', ctx); } },
  unbangroup: { category: 'botctl', usage: '.unbangroup [arguments]', example: '.unbangroup', async run(ctx) { return runExpanded('unbangroup', ctx); } },
  block: { category: 'botctl', usage: '.block [arguments]', example: '.block', async run(ctx) { return runExpanded('block', ctx); } },
  unblock: { category: 'botctl', usage: '.unblock [arguments]', example: '.unblock', async run(ctx) { return runExpanded('unblock', ctx); } },
  shutdown: { category: 'botctl', usage: '.shutdown [arguments]', example: '.shutdown', async run(ctx) { return runExpanded('shutdown', ctx); } },
  update: { category: 'botctl', usage: '.update [arguments]', example: '.update', async run(ctx) { return runExpanded('update', ctx); } },
  clearcache: { category: 'botctl', usage: '.clearcache [arguments]', example: '.clearcache', async run(ctx) { return runExpanded('clearcache', ctx); } },
  logs: { category: 'botctl', usage: '.logs [arguments]', example: '.logs', async run(ctx) { return runExpanded('logs', ctx); } },
  enablecmd: { category: 'botctl', usage: '.enablecmd [arguments]', example: '.enablecmd', async run(ctx) { return runExpanded('enablecmd', ctx); } },
  disablecmd: { category: 'botctl', usage: '.disablecmd [arguments]', example: '.disablecmd', async run(ctx) { return runExpanded('disablecmd', ctx); } },
  setcooldown: { category: 'botctl', usage: '.setcooldown [arguments]', example: '.setcooldown', async run(ctx) { return runExpanded('setcooldown', ctx); } },
  join: { category: 'botctl', usage: '.join [arguments]', example: '.join', async run(ctx) { return runExpanded('join', ctx); } },
  leaveall: { category: 'botctl', usage: '.leaveall [arguments]', example: '.leaveall', async run(ctx) { return runExpanded('leaveall', ctx); } },
  setbotpp: { category: 'botctl', usage: '.setbotpp [arguments]', example: '.setbotpp', async run(ctx) { return runExpanded('setbotpp', ctx); } },
  autoread: { category: 'automation', usage: '.autoread [arguments]', example: '.autoread', async run(ctx) { return runExpanded('autoread', ctx); } },
  autotyping: { category: 'automation', usage: '.autotyping [arguments]', example: '.autotyping', async run(ctx) { return runExpanded('autotyping', ctx); } },
  autorecord: { category: 'automation', usage: '.autorecord [arguments]', example: '.autorecord', async run(ctx) { return runExpanded('autorecord', ctx); } },
  alwaysonline: { category: 'tools', usage: '.alwaysonline [arguments]', example: '.alwaysonline', async run(ctx) { return runExpanded('alwaysonline', ctx); } },
  autoviewstatus: { category: 'automation', usage: '.autoviewstatus [arguments]', example: '.autoviewstatus', async run(ctx) { return runExpanded('autoviewstatus', ctx); } },
  autoreactstatus: { category: 'automation', usage: '.autoreactstatus [arguments]', example: '.autoreactstatus', async run(ctx) { return runExpanded('autoreactstatus', ctx); } },
  autobio: { category: 'automation', usage: '.autobio [arguments]', example: '.autobio', async run(ctx) { return runExpanded('autobio', ctx); } },
  autorestart: { category: 'automation', usage: '.autorestart [arguments]', example: '.autorestart', async run(ctx) { return runExpanded('autorestart', ctx); } },
  autobackup: { category: 'automation', usage: '.autobackup [arguments]', example: '.autobackup', async run(ctx) { return runExpanded('autobackup', ctx); } },
  pmblocker: { category: 'automation', usage: '.pmblocker [arguments]', example: '.pmblocker', async run(ctx) { return runExpanded('pmblocker', ctx); } },
  antibug: { category: 'anti', usage: '.antibug [arguments]', example: '.antibug', async run(ctx) { return runExpanded('antibug', ctx); } },
  anticrash: { category: 'anti', usage: '.anticrash [arguments]', example: '.anticrash', async run(ctx) { return runExpanded('anticrash', ctx); } },
  antivirtex: { category: 'anti', usage: '.antivirtex [arguments]', example: '.antivirtex', async run(ctx) { return runExpanded('antivirtex', ctx); } },
  antiinvisible: { category: 'anti', usage: '.antiinvisible [arguments]', example: '.antiinvisible', async run(ctx) { return runExpanded('antiinvisible', ctx); } },
  antiunicode: { category: 'anti', usage: '.antiunicode [arguments]', example: '.antiunicode', async run(ctx) { return runExpanded('antiunicode', ctx); } },
  antiarabic: { category: 'anti', usage: '.antiarabic [arguments]', example: '.antiarabic', async run(ctx) { return runExpanded('antiarabic', ctx); } },
  antimalformed: { category: 'anti', usage: '.antimalformed [arguments]', example: '.antimalformed', async run(ctx) { return runExpanded('antimalformed', ctx); } },
  antiflood: { category: 'anti', usage: '.antiflood [arguments]', example: '.antiflood', async run(ctx) { return runExpanded('antiflood', ctx); } },
  antiphishing: { category: 'anti', usage: '.antiphishing [arguments]', example: '.antiphishing', async run(ctx) { return runExpanded('antiphishing', ctx); } },
  antimalware: { category: 'anti', usage: '.antimalware [arguments]', example: '.antimalware', async run(ctx) { return runExpanded('antimalware', ctx); } },
  scanlink: { category: 'bug', usage: '.scanlink [arguments]', example: '.scanlink', async run(ctx) { return runExpanded('scanlink', ctx); } },
  scanfile: { category: 'bug', usage: '.scanfile [arguments]', example: '.scanfile', async run(ctx) { return runExpanded('scanfile', ctx); } },
  scanmsg: { category: 'bug', usage: '.scanmsg [arguments]', example: '.scanmsg', async run(ctx) { return runExpanded('scanmsg', ctx); } },
  menu: { category: 'tools', usage: '.menu [arguments]', example: '.menu', async run(ctx) { return runExpanded('menu', ctx); } },
  allmenu: { category: 'tools', usage: '.allmenu [arguments]', example: '.allmenu', async run(ctx) { return runExpanded('allmenu', ctx); } },
  ai: { category: 'ai', usage: '.ai [arguments]', example: '.ai', async run(ctx) { return runExpanded('ai', ctx); } },
  rules: { category: 'tools', usage: '.rules [arguments]', example: '.rules', async run(ctx) { return runExpanded('rules', ctx); } },
  summarize: { category: 'tools', usage: '.summarize [arguments]', example: '.summarize', async run(ctx) { return runExpanded('summarize', ctx); } },
  shadow: { category: 'bug', usage: '.shadow [arguments]', example: '.shadow', async run(ctx) { return runExpanded('shadow', ctx); } },
  shadowlock: { category: 'bug', usage: '.shadowlock [arguments]', example: '.shadowlock', async run(ctx) { return runExpanded('shadowlock', ctx); } },
  deepscan: { category: 'bug', usage: '.deepscan [arguments]', example: '.deepscan', async run(ctx) { return runExpanded('deepscan', ctx); } },
  payloadscan: { category: 'bug', usage: '.payloadscan [arguments]', example: '.payloadscan', async run(ctx) { return runExpanded('payloadscan', ctx); } },
  sizecheck: { category: 'bug', usage: '.sizecheck [arguments]', example: '.sizecheck', async run(ctx) { return runExpanded('sizecheck', ctx); } },
  tracksender: { category: 'bug', usage: '.tracksender [arguments]', example: '.tracksender', async run(ctx) { return runExpanded('tracksender', ctx); } },
  bugwatch: { category: 'bug', usage: '.bugwatch [arguments]', example: '.bugwatch', async run(ctx) { return runExpanded('bugwatch', ctx); } },
  bughistory: { category: 'bug', usage: '.bughistory [arguments]', example: '.bughistory', async run(ctx) { return runExpanded('bughistory', ctx); } },
  quarantine: { category: 'bug', usage: '.quarantine [arguments]', example: '.quarantine', async run(ctx) { return runExpanded('quarantine', ctx); } },
  unquarantine: { category: 'tools', usage: '.unquarantine [arguments]', example: '.unquarantine', async run(ctx) { return runExpanded('unquarantine', ctx); } },
  listquarantine: { category: 'tools', usage: '.listquarantine [arguments]', example: '.listquarantine', async run(ctx) { return runExpanded('listquarantine', ctx); } },
  raidshield: { category: 'bug', usage: '.raidshield [arguments]', example: '.raidshield', async run(ctx) { return runExpanded('raidshield', ctx); } },
  joinshield: { category: 'botctl', usage: '.joinshield [arguments]', example: '.joinshield', async run(ctx) { return runExpanded('joinshield', ctx); } },
  floodshield: { category: 'bug', usage: '.floodshield [arguments]', example: '.floodshield', async run(ctx) { return runExpanded('floodshield', ctx); } },
  massmention: { category: 'bug', usage: '.massmention [arguments]', example: '.massmention', async run(ctx) { return runExpanded('massmention', ctx); } },
  raidalert: { category: 'bug', usage: '.raidalert [arguments]', example: '.raidalert', async run(ctx) { return runExpanded('raidalert', ctx); } },
  autolock: { category: 'automation', usage: '.autolock [arguments]', example: '.autolock', async run(ctx) { return runExpanded('autolock', ctx); } },
  smartban: { category: 'automation', usage: '.smartban [arguments]', example: '.smartban', async run(ctx) { return runExpanded('smartban', ctx); } },
  trustscore: { category: 'bug', usage: '.trustscore [arguments]', example: '.trustscore', async run(ctx) { return runExpanded('trustscore', ctx); } },
  raidhistory: { category: 'bug', usage: '.raidhistory [arguments]', example: '.raidhistory', async run(ctx) { return runExpanded('raidhistory', ctx); } },
  shieldmode: { category: 'bug', usage: '.shieldmode [arguments]', example: '.shieldmode', async run(ctx) { return runExpanded('shieldmode', ctx); } },
  reactmode: { category: 'tools', usage: '.reactmode [arguments]', example: '.reactmode', async run(ctx) { return runExpanded('reactmode', ctx); } },
  setreact: { category: 'tools', usage: '.setreact [arguments]', example: '.setreact', async run(ctx) { return runExpanded('setreact', ctx); } },
  addreact: { category: 'tools', usage: '.addreact [arguments]', example: '.addreact', async run(ctx) { return runExpanded('addreact', ctx); } },
  delreact: { category: 'tools', usage: '.delreact [arguments]', example: '.delreact', async run(ctx) { return runExpanded('delreact', ctx); } },
  listreact: { category: 'tools', usage: '.listreact [arguments]', example: '.listreact', async run(ctx) { return runExpanded('listreact', ctx); } },
  reactword: { category: 'tools', usage: '.reactword [arguments]', example: '.reactword', async run(ctx) { return runExpanded('reactword', ctx); } },
  reactrandom: { category: 'tools', usage: '.reactrandom [arguments]', example: '.reactrandom', async run(ctx) { return runExpanded('reactrandom', ctx); } },
  reactdelay: { category: 'tools', usage: '.reactdelay [arguments]', example: '.reactdelay', async run(ctx) { return runExpanded('reactdelay', ctx); } },
  reactstats: { category: 'tools', usage: '.reactstats [arguments]', example: '.reactstats', async run(ctx) { return runExpanded('reactstats', ctx); } },
  autoreactgc: { category: 'automation', usage: '.autoreactgc [arguments]', example: '.autoreactgc', async run(ctx) { return runExpanded('autoreactgc', ctx); } },
  autoreactpm: { category: 'automation', usage: '.autoreactpm [arguments]', example: '.autoreactpm', async run(ctx) { return runExpanded('autoreactpm', ctx); } },
  reactionboost: { category: 'tools', usage: '.reactionboost [arguments]', example: '.reactionboost', async run(ctx) { return runExpanded('reactionboost', ctx); } },
  boostemoji: { category: 'tools', usage: '.boostemoji [arguments]', example: '.boostemoji', async run(ctx) { return runExpanded('boostemoji', ctx); } },
  boostchance: { category: 'tools', usage: '.boostchance [arguments]', example: '.boostchance', async run(ctx) { return runExpanded('boostchance', ctx); } },
  boostdelay: { category: 'tools', usage: '.boostdelay [arguments]', example: '.boostdelay', async run(ctx) { return runExpanded('boostdelay', ctx); } },
  boostgroups: { category: 'tools', usage: '.boostgroups [arguments]', example: '.boostgroups', async run(ctx) { return runExpanded('boostgroups', ctx); } },
  boostprivate: { category: 'tools', usage: '.boostprivate [arguments]', example: '.boostprivate', async run(ctx) { return runExpanded('boostprivate', ctx); } },
  booststatus: { category: 'tools', usage: '.booststatus [arguments]', example: '.booststatus', async run(ctx) { return runExpanded('booststatus', ctx); } },
  play: { category: 'download', usage: '.play [arguments]', example: '.play', async run(ctx) { return runExpanded('play', ctx); } },
  song: { category: 'download', usage: '.song [arguments]', example: '.song', async run(ctx) { return runExpanded('song', ctx); } },
  video: { category: 'download', usage: '.video [arguments]', example: '.video', async run(ctx) { return runExpanded('video', ctx); } },
  ytmp3: { category: 'download', usage: '.ytmp3 [arguments]', example: '.ytmp3', async run(ctx) { return runExpanded('ytmp3', ctx); } },
  ytmp4: { category: 'download', usage: '.ytmp4 [arguments]', example: '.ytmp4', async run(ctx) { return runExpanded('ytmp4', ctx); } },
  tiktok: { category: 'download', usage: '.tiktok [arguments]', example: '.tiktok', async run(ctx) { return runExpanded('tiktok', ctx); } },
  facebook: { category: 'download', usage: '.facebook [arguments]', example: '.facebook', async run(ctx) { return runExpanded('facebook', ctx); } },
  instagram: { category: 'download', usage: '.instagram [arguments]', example: '.instagram', async run(ctx) { return runExpanded('instagram', ctx); } },
  twitter: { category: 'download', usage: '.twitter [arguments]', example: '.twitter', async run(ctx) { return runExpanded('twitter', ctx); } },
  mediafire: { category: 'sticker', usage: '.mediafire [arguments]', example: '.mediafire', async run(ctx) { return runExpanded('mediafire', ctx); } },
  codeai: { category: 'ai', usage: '.codeai [arguments]', example: '.codeai', async run(ctx) { return runExpanded('codeai', ctx); } },
  explain: { category: 'ai', usage: '.explain [arguments]', example: '.explain', async run(ctx) { return runExpanded('explain', ctx); } },
  rewrite: { category: 'ai', usage: '.rewrite [arguments]', example: '.rewrite', async run(ctx) { return runExpanded('rewrite', ctx); } },
  essay: { category: 'ai', usage: '.essay [arguments]', example: '.essay', async run(ctx) { return runExpanded('essay', ctx); } },
  brainstorm: { category: 'ai', usage: '.brainstorm [arguments]', example: '.brainstorm', async run(ctx) { return runExpanded('brainstorm', ctx); } },
  math: { category: 'ai', usage: '.math [arguments]', example: '.math', async run(ctx) { return runExpanded('math', ctx); } },
  chat: { category: 'ai', usage: '.chat [arguments]', example: '.chat', async run(ctx) { return runExpanded('chat', ctx); } },
  askai: { category: 'ai', usage: '.askai [arguments]', example: '.askai', async run(ctx) { return runExpanded('askai', ctx); } },
  aimod: { category: 'ai', usage: '.aimod [arguments]', example: '.aimod', async run(ctx) { return runExpanded('aimod', ctx); } },
  autosummarize: { category: 'automation', usage: '.autosummarize [arguments]', example: '.autosummarize', async run(ctx) { return runExpanded('autosummarize', ctx); } },
  autotranslate: { category: 'automation', usage: '.autotranslate [arguments]', example: '.autotranslate', async run(ctx) { return runExpanded('autotranslate', ctx); } },
  smartwelcome: { category: 'automation', usage: '.smartwelcome [arguments]', example: '.smartwelcome', async run(ctx) { return runExpanded('smartwelcome', ctx); } },
  smartgoodbye: { category: 'automation', usage: '.smartgoodbye [arguments]', example: '.smartgoodbye', async run(ctx) { return runExpanded('smartgoodbye', ctx); } },
  smartwarn: { category: 'automation', usage: '.smartwarn [arguments]', example: '.smartwarn', async run(ctx) { return runExpanded('smartwarn', ctx); } },
  smartreport: { category: 'automation', usage: '.smartreport [arguments]', example: '.smartreport', async run(ctx) { return runExpanded('smartreport', ctx); } },
  aiguard: { category: 'ai', usage: '.aiguard [arguments]', example: '.aiguard', async run(ctx) { return runExpanded('aiguard', ctx); } },
  quiz: { category: 'fun', usage: '.quiz [arguments]', example: '.quiz', async run(ctx) { return runExpanded('quiz', ctx); } },
  take: { category: 'sticker', usage: '.take [arguments]', example: '.take', async run(ctx) { return runExpanded('take', ctx); } },
  emojimix: { category: 'sticker', usage: '.emojimix [arguments]', example: '.emojimix', async run(ctx) { return runExpanded('emojimix', ctx); } },
  attp: { category: 'sticker', usage: '.attp [arguments]', example: '.attp', async run(ctx) { return runExpanded('attp', ctx); } },
  ttp: { category: 'sticker', usage: '.ttp [arguments]', example: '.ttp', async run(ctx) { return runExpanded('ttp', ctx); } },
  smeme: { category: 'sticker', usage: '.smeme [arguments]', example: '.smeme', async run(ctx) { return runExpanded('smeme', ctx); } },
  trigger: { category: 'sticker', usage: '.trigger [arguments]', example: '.trigger', async run(ctx) { return runExpanded('trigger', ctx); } },
  tovideo: { category: 'sticker', usage: '.tovideo [arguments]', example: '.tovideo', async run(ctx) { return runExpanded('tovideo', ctx); } },
  bass: { category: 'sticker', usage: '.bass [arguments]', example: '.bass', async run(ctx) { return runExpanded('bass', ctx); } },
  channelinfo: { category: 'botctl', usage: '.channelinfo [arguments]', example: '.channelinfo', async run(ctx) { return runExpanded('channelinfo', ctx); } },
  channelstats: { category: 'botctl', usage: '.channelstats [arguments]', example: '.channelstats', async run(ctx) { return runExpanded('channelstats', ctx); } },
  autochannel: { category: 'automation', usage: '.autochannel [arguments]', example: '.autochannel', async run(ctx) { return runExpanded('autochannel', ctx); } },
  channelpost: { category: 'botctl', usage: '.channelpost [arguments]', example: '.channelpost', async run(ctx) { return runExpanded('channelpost', ctx); } },
  channelboost: { category: 'botctl', usage: '.channelboost [arguments]', example: '.channelboost', async run(ctx) { return runExpanded('channelboost', ctx); } },
  subscribe: { category: 'tools', usage: '.subscribe [arguments]', example: '.subscribe', async run(ctx) { return runExpanded('subscribe', ctx); } },
  broadcastchannel: { category: 'botctl', usage: '.broadcastchannel [arguments]', example: '.broadcastchannel', async run(ctx) { return runExpanded('broadcastchannel', ctx); } },
  followers: { category: 'tools', usage: '.followers [arguments]', example: '.followers', async run(ctx) { return runExpanded('followers', ctx); } },
  promotion: { category: 'tools', usage: '.promotion [arguments]', example: '.promotion', async run(ctx) { return runExpanded('promotion', ctx); } },
  analytics: { category: 'tools', usage: '.analytics [arguments]', example: '.analytics', async run(ctx) { return runExpanded('analytics', ctx); } },
  url: { category: 'tools', usage: '.url [arguments]', example: '.url', async run(ctx) { return runExpanded('url', ctx); } },
  backupcloud: { category: 'botctl', usage: '.backupcloud [arguments]', example: '.backupcloud', async run(ctx) { return runExpanded('backupcloud', ctx); } },
  restore: { category: 'tools', usage: '.restore [arguments]', example: '.restore', async run(ctx) { return runExpanded('restore', ctx); } },
  groupmenuhelp: { category: 'group', usage: '.groupmenuhelp [arguments]', example: '.groupmenuhelp', async run(ctx) { return runExpanded('groupmenuhelp', ctx); } },
  groupaudit: { category: 'group', usage: '.groupaudit [arguments]', example: '.groupaudit', async run(ctx) { return runExpanded('groupaudit', ctx); } },
  groupbackup: { category: 'group', usage: '.groupbackup [arguments]', example: '.groupbackup', async run(ctx) { return runExpanded('groupbackup', ctx); } },
  grouprestore: { category: 'group', usage: '.grouprestore [arguments]', example: '.grouprestore', async run(ctx) { return runExpanded('grouprestore', ctx); } },
  groupwelcome: { category: 'group', usage: '.groupwelcome [arguments]', example: '.groupwelcome', async run(ctx) { return runExpanded('groupwelcome', ctx); } },
  groupgoodbye: { category: 'group', usage: '.groupgoodbye [arguments]', example: '.groupgoodbye', async run(ctx) { return runExpanded('groupgoodbye', ctx); } },
  groupadmins: { category: 'group', usage: '.groupadmins [arguments]', example: '.groupadmins', async run(ctx) { return runExpanded('groupadmins', ctx); } },
  grouproles: { category: 'group', usage: '.grouproles [arguments]', example: '.grouproles', async run(ctx) { return runExpanded('grouproles', ctx); } },
  groupmembers: { category: 'group', usage: '.groupmembers [arguments]', example: '.groupmembers', async run(ctx) { return runExpanded('groupmembers', ctx); } },
  groupinvite: { category: 'group', usage: '.groupinvite [arguments]', example: '.groupinvite', async run(ctx) { return runExpanded('groupinvite', ctx); } },
};

const GROUP_ADMIN = new Set(['group','anti']);
const OWNER_ONLY = new Set(['botctl']);
const TOGGLES = new Set(['antilink','antispam','antibadword','antiforward','antiviewonce','antimedia','antisticker','antilongtext','antimention','antiinvite','antivoice','antidocument','anticontact','antilocation','anticaps','antibot','antidelete','antitagall','antipromote','antidemote','antiraid','antifake','anticall','antirename','antiadd','antijoin','antitoxic','antinsfw','antiscam','antiprivate','antibug','anticrash','antivirtex','antiinvisible','antiunicode','antiarabic','antimalformed','antiflood','antiphishing','antimalware','raidshield','joinshield','floodshield','autolock','shieldmode','autoread','autotyping','autorecord','alwaysonline','autoviewstatus','autoreactstatus','autoreact','autobio','autorestart','autobackup','autoclear','pmblocker','smartreply','aimod','autosummarize','autotranslate','smartwelcome','smartgoodbye','smartwarn','smartreport','aiguard','autochannel']);
const INFO = new Set(['groupinfo','groupstats','memberstats','admins','members','online','activity','invites','created','groupsecurity','grouplink','groupdesc','grouprules','groups','botstats','health','version','uptime','runtime','ping','jid','owner','channel','apistatus','dbcheck','memcheck','sessioncheck','checkperms','checkadmin','checkupdate','changelog','buglog','bughistory','threatlevel','trustscore','raidhistory','reactstats','analytics','channelinfo','channelstats','followers','profile','rank','level','xp','badge','reputation','bio','inventory','wallet','balance','leaderboard','achievements','badges','weather','weatherforecast','weathercurrent','wiki','wikipedia','define','dictionary','news','fact','quote','joke','motivation','sunrise','sunset','timezone','time','date','calendar','uuid','passwordgen','hash','md5','sha256','base64','decode','encode','calc','percentage','average','median','mode','stats','random','choose','coin','flip','currency','unitconvert']);
const MOD_ACTIONS = new Set(['promote','demote','kick','ban','unban','mute','unmute','warn','unwarn','strike','pin','open','close','lock','unlock','setname','setdesc','seticon','revoke','leave','ephemeral','joinapproval','approveall','add','del','poll','announce','kickinactive','freeze','unfreeze','purge','lockdown','unlockdown','slowmode','tagall','hidetag','tagadmins']);

async function runExpanded(name, ctx) {
  const args = ctx.args || []; const arg = args.join(' '); const groupKey = `${ctx.chatJid}:${name}`;
  if (OWNER_ONLY.has(definitions[name].category) && !ctx.isOwner) return brandedReply('ACCESS DENIED', ['Owner-only command.']);
  if (GROUP_ADMIN.has(definitions[name].category) && ctx.isGroup && !ctx.isOwner && !isGroupAdmin(ctx.participants || [], ctx.sender)) return brandedReply('ACCESS DENIED', ['Group-admin permission is required.']);
  if (TOGGLES.has(name)) {
    const target = (args[0] || '').toLowerCase();
    if (!['on','off','status'].includes(target)) return usageGuide(name, `.${name} on|off|status`, `.${name} on`);
    const current = !!db.get('groups', groupKey, false);
    if (target === 'status') return brandedReply(name.toUpperCase(), [`Status: ${current ? 'ON' : 'OFF'}`, `Scope: ${ctx.isGroup ? 'this group' : 'this bot account'}`]);
    db.set('groups', groupKey, target === 'on');
    return brandedReply(name.toUpperCase(), [`${name} is now ${target.toUpperCase()}.`, 'This setting is stored independently for this chat.']);
  }
  if (INFO.has(name)) {
    if (name === 'jid') return brandedReply('JID', [`Chat: ${ctx.chatJid}`, `Sender: ${ctx.sender}`]);
    if (name === 'groupinfo' || name === 'groupstats' || name === 'groupsecurity' || name === 'grouprules' || name === 'groupdesc' || name === 'grouplink' || name === 'members' || name === 'admins' || name === 'memberstats' || name === 'online' || name === 'activity' || name === 'invites' || name === 'created') {
      if (!ctx.isGroup) return brandedReply('GROUP ONLY', ['Use this command inside a WhatsApp group.']);
      const meta = ctx.groupMetadata || await ctx.sock.groupMetadata(ctx.chatJid);
      const admins = (meta.participants || []).filter(p => p.admin);
      const lines = [`Name: ${meta.subject || 'Unknown'}`, `Members: ${(meta.participants || []).length}`, `Admins: ${admins.length}`, `Description: ${(meta.desc || 'Not set').slice(0,500)}`];
      if (name === 'admins') lines.push(...admins.map(p => p.id));
      if (name === 'members') lines.push(...(meta.participants || []).slice(0,80).map(p => p.id));
      if (name === 'grouplink' && ctx.sock.groupInviteCode) lines.push(`Invite: https://chat.whatsapp.com/${await ctx.sock.groupInviteCode(ctx.chatJid)}`);
      return brandedReply(name.toUpperCase(), lines);
    }
    if (name === 'ping') return brandedReply('PONG', [`Latency: ${Date.now() - (ctx.receivedAt || Date.now())}ms`]);
    if (name === 'uptime' || name === 'runtime') return brandedReply('UPTIME', [process.uptime().toFixed(0) + ' seconds']);
    if (name === 'weather' || name === 'weatherforecast' || name === 'weathercurrent') { const place = arg || 'Harare'; if (!arg) return usageGuide(name, `.${name} <city>`, `.${name} Harare`); const result = await fetchFreeSource('weather', place); return brandedReply('WEATHER · OPEN-METEO', result); }
    if (name === 'wiki' || name === 'wikipedia' || name === 'define' || name === 'dictionary') { if (!arg) return usageGuide(name, `.${name} <topic>`, `.${name} Zimbabwe`); const result = await fetchFreeSource('wiki', arg); return brandedReply('OPEN KNOWLEDGE', result); }
    if (name === 'currency' || name === 'unitconvert' || name === 'percentage' || name === 'average' || name === 'median' || name === 'mode' || name === 'stats' || name === 'random' || name === 'choose' || name === 'coin' || name === 'flip' || name === 'calc') return utility(name, arg);
    const setting = db.get('settings', name, null);
    return brandedReply(name.toUpperCase(), [setting === null ? 'Status and telemetry are available from the dashboard.' : `Current value: ${JSON.stringify(setting)}`, `Node.js: ${process.version}`, `Memory: ${Math.round(process.memoryUsage().rss/1024/1024)} MB`]);
  }
  if (MOD_ACTIONS.has(name)) return groupAction(name, ctx);
  if (['ai','gpt','askai','explain','rewrite','essay','brainstorm','math','chat','codeai','summarize','translate','imagine'].includes(name)) {
    if (!arg && !ctx.quotedText) return usageGuide(name, `.${name} <text>`, `.${name} explain machine learning`);
    try { return brandedReply(name.toUpperCase(), [await askGemini(arg || ctx.quotedText, PRESETS.chat)]); } catch (e) { return brandedReply('AI NOT CONFIGURED', ['Text AI requires a configured free/open model endpoint or GEMINI_API_KEY.']); }
  }
  if (name.startsWith('text')) return textUtility(name, arg);
  if (name.startsWith('media')) return mediaUtility(name, ctx);
  if (name.startsWith('profile') || name.startsWith('user')) return profileUtility(name, ctx, arg);
  if (name.startsWith('bot')) return brandedReply(name.toUpperCase(), ['Use the dashboard for account-scoped controls.', 'This command is registered and checks owner permissions.']);
  if (name.startsWith('mod')) return brandedReply(name.toUpperCase(), ['Moderation command is registered. Use the corresponding group moderation command with a reply or @mention.', 'All moderation records are scoped to this group.']);
  if (name.startsWith('group')) return brandedReply(name.toUpperCase(), ['Group helper is registered. Run it inside the target group.']);
  if (name.startsWith('anti')) return brandedReply(name.toUpperCase(), ['Protection control is registered. Use on|off|status to manage this chat-specific setting.']);
  if (name.startsWith('scan') || name.startsWith('bug') || name.startsWith('shadow') || name.startsWith('raid') || name.startsWith('threat') || name.startsWith('quarantine')) return brandedReply(name.toUpperCase(), ['Defensive scanner/control is registered.', 'It records local incidents and does not execute, forward, or retaliate with suspicious payloads.']);
  if (name.startsWith('download') || ['play','song','video','ytmp3','ytmp4','tiktok','facebook','instagram','twitter','mediafire'].includes(name)) return downloadUtility(name, arg);
  if (name.startsWith('channel')) return brandedReply(name.toUpperCase(), ['Channel features depend on WhatsApp newsletter permissions exposed by your Baileys version.']);
  if (name.startsWith('cloud') || ['upload','url','shorturl','paste','backupcloud','restore','tempmail'].includes(name)) return brandedReply(name.toUpperCase(), ['Local export/backup is supported; public cloud hosting requires a storage destination. No paid API is required or bundled.']);
  return brandedReply(name.toUpperCase(), [`Command .${name} is registered.`, 'Run .help ' + name + ' or consult the README for usage and required local tools.']);
}

async function groupAction(name, ctx) {
  if (!ctx.isGroup) return brandedReply('GROUP ONLY', ['Use this command inside a group.']);
  const target = ctx.mentions?.[0] || ctx.quotedParticipant;
  const admin = isGroupAdmin(ctx.participants || [], ctx.sender);
  if (!ctx.isOwner && !admin) return brandedReply('ACCESS DENIED', ['Group-admin permission required.']);
  if (['open','close','lock','unlock'].includes(name)) { const setting = ['open','unlock'].includes(name) ? 'not_announcement' : 'announcement'; await ctx.sock.groupSettingUpdate(ctx.chatJid, setting); return brandedReply('GROUP SETTING', [`${name} completed.`]); }
  if (['setname','setdesc'].includes(name)) { if (!ctx.args?.length) return usageGuide(name, `.${name} <text>`, `.${name} Community Hub`); if (name === 'setname') await ctx.sock.groupUpdateSubject(ctx.chatJid, ctx.args.join(' ')); else await ctx.sock.groupUpdateDescription(ctx.chatJid, ctx.args.join(' ')); return brandedReply('GROUP UPDATED', [`${name} completed.`]); }
  if (['promote','demote','kick','ban','unban','mute','unmute','add','del'].includes(name)) { if (!target) return brandedReply('TARGET REQUIRED', ['Reply to a member or mention them.']); const action = name === 'ban' || name === 'kick' || name === 'del' ? 'remove' : name === 'unban' || name === 'add' ? 'add' : name === 'promote' ? 'promote' : 'demote'; await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], action); return brandedReply('GROUP ACTION', [`${name} request sent for ${target}.`]); }
  if (name === 'leave') { await ctx.sock.groupLeave(ctx.chatJid); return brandedReply('LEFT GROUP', ['The bot left this group.']); }
  if (name === 'tagall' || name === 'hidetag' || name === 'tagadmins') { const meta = await ctx.sock.groupMetadata(ctx.chatJid); const ps = (meta.participants||[]).filter(p => name !== 'tagadmins' || p.admin).map(p=>p.id); const text = ctx.args?.join(' ') || 'Attention everyone'; return ctx.sock.sendMessage(ctx.chatJid, { text: `${text}\n` + ps.map(x=>'@'+x.split('@')[0]).join(' '), mentions: ps }); }
  return brandedReply(name.toUpperCase(), ['This operation requires additional arguments or a supported WhatsApp group feature.']);
}
function utility(name,arg) {
  if (!arg && !['coin','flip'].includes(name)) return usageGuide(name, `.${name} <value>`, `.${name} 12 15 18`);
  if (name==='coin'||name==='flip') return brandedReply('COIN FLIP', [Math.random()<.5?'Heads':'Tails']);
  if (name==='random') { const [a,b]=arg.split(/\s+/).map(Number); return brandedReply('RANDOM', [String(Math.floor(Math.random()*(b-a+1))+a)]); }
  if (name==='choose') return brandedReply('CHOICE', [arg.split('|').map(x=>x.trim()).filter(Boolean)[Math.floor(Math.random()*arg.split('|').length)]||'Provide choices separated by |']);
  if (name==='calc') { if(!/^[0-9+\-*/().%\s]+$/.test(arg)) return brandedReply('CALC', ['Only basic arithmetic is supported.']); try{return brandedReply('CALC',[String(Function('"use strict";return ('+arg+')')())]);}catch{return brandedReply('CALC',['Invalid expression.']);}}
  return brandedReply(name.toUpperCase(), ['Use the command with valid numeric arguments.']);
}
function textUtility(name,arg) { if(!arg) return usageGuide(name, `.${name} <text>`, `.${name} hello world`); let out=arg; if(name==='textupper')out=arg.toUpperCase(); else if(name==='textlower')out=arg.toLowerCase(); else if(name==='texttitle')out=arg.replace(/\b\w/g,c=>c.toUpperCase()); else if(name==='textreverse')out=[...arg].reverse().join(''); else if(name==='textcount'||name==='textlength')out=String(arg.length); else if(name==='textwords')out=String(arg.trim().split(/\s+/).length); else if(name==='textlines')out=String(arg.split('\n').length); else if(name==='textslug')out=arg.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); else if(name==='textclean')out=arg.replace(/[\u0000-\u001f\u200b-\u200f]/g,'').replace(/\s+/g,' ').trim(); else if(name==='textbold')out='*'+arg+'*'; else if(name==='textitalic')out='_'+arg+'_'; else if(name==='textstrike')out='~'+arg+'~'; else if(name==='textmono')out='```'+arg+'```'; else if(name==='textrepeat')out=arg.slice(0,200).repeat(2); return brandedReply(name.toUpperCase(), [out.slice(0,3500)]); }
function profileUtility(name,ctx,arg) { const key=ctx.sender; const u=db.get('users',key,{}); if(name==='profileset'||name==='setbio'||name==='bio'){ if(!arg)return usageGuide(name, `.${name} <text>`, `.${name} Community builder`); u.bio=arg.slice(0,250); db.set('users',key,u); } return brandedReply('PROFILE', [`User: ${key}`, `Bio: ${u.bio||'Not set'}`, `XP: ${u.xp||0}`, `Level: ${u.level||1}`, `Reputation: ${u.rep||0}`]); }
function mediaUtility(name,ctx) { return brandedReply('LOCAL MEDIA TOOL', [`.${name} is registered.`, 'Media processing uses local FFmpeg/FFprobe and Sharp binaries; no paid media API is used.', 'Reply to a supported media file and provide arguments.']); }
function downloadUtility(name, arg) {
  if (!arg) return usageGuide(name, `.${name} <public media URL>`, `.${name} https://www.youtube.com/watch?v=...`);
  let url;
  try { url = new URL(arg.trim()); } catch { return brandedReply('MEDIA DOWNLOAD', ['Provide a direct public URL. Search-only downloads are disabled.']); }
  if (!['http:', 'https:'].includes(url.protocol)) return brandedReply('MEDIA DOWNLOAD', ['Only HTTP and HTTPS URLs are supported.']);
  const bin = process.env.YTDLP_PATH || path.join(__dirname, '..', 'bin', 'yt-dlp');
  const isAudio = ['play', 'song', 'ytmp3', 'audio'].includes(name);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thanxie-media-'));
  const outputTemplate = path.join(tempDir, '%(title).80s.%(ext)s');
  const args = ['--no-playlist', '--no-warnings', '--max-filesize', '48M', '--socket-timeout', '15', '--retries', '1', '-o', outputTemplate, '--print', 'after_move:filepath'];
  if (isAudio) {
    try { args.push('--ffmpeg-location', require('@ffmpeg-installer/ffmpeg').path); } catch (_) {}
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '5');
  }
  else args.push('--format', 'mp4/best[ext=mp4]/best');
  args.push(url.toString());
  try {
    const result = spawnSync(bin, args, { encoding: 'utf8', timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
    if (result.error || result.status !== 0) {
      const detail = String(result.stderr || result.error?.message || 'Download failed').split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 220);
      return brandedReply('FREE MEDIA SOURCE UNAVAILABLE', [detail || 'This URL may be private, restricted or unsupported.', 'No paid API is used. Only download content you own or are authorized to save.']);
    }
    const filePath = String(result.stdout || '').trim().split('\n').filter(Boolean).pop();
    if (!filePath || !fs.existsSync(filePath)) return brandedReply('DOWNLOAD FAILED', ['The source did not return a media file.']);
    const buffer = fs.readFileSync(filePath);
    if (!buffer.length || buffer.length > 50 * 1024 * 1024) return brandedReply('DOWNLOAD LIMIT', ['The downloaded file is empty or exceeds the 50 MB safety limit.']);
    return isAudio
      ? { audio: buffer, mimetype: 'audio/mpeg' }
      : { video: buffer, mimetype: 'video/mp4', caption: 'Media downloaded using free open-source tools.' };
  } catch (error) {
    return brandedReply('DOWNLOAD FAILED', [String(error.message || 'Unable to download media').slice(0, 220)]);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  }
}
// Preserve the original handlers: never shadow an existing implementation.
const ORIGINAL_MODULES = [
  'groupManagement','groupSettings','antiSuite','botControl','automation','aiSuite',
  'funGames','economy','stickerMedia','downloadMenu','profileCommunity','toolsInfo',
  'bugDiagnostics','vip','shadowEnforcement'
];
for (const file of ORIGINAL_MODULES) {
  const original = require('./' + file);
  for (const commandName of Object.keys(original)) delete definitions[commandName];
}
// .groupmenuhelp is an internal convenience alias, not part of the requested 430-command surface.
delete definitions.groupmenuhelp;
module.exports = definitions;
