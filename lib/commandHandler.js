// lib/commandHandler.js
require('dotenv').config();
const db = require('./db');
const { brandedReply, unknownCommandGuide } = require('./brand');
const { isOwner, isPrimaryOwner } = require('./permissions');
const { humanDelay, RateLimiter } = require('./antiban');
const vip = require('./vip');
const menu = require('./menu');
const COMMAND_FILES = [
 '../commands/groupManagement','../commands/groupSettings','../commands/antiSuite','../commands/antiDM','../commands/botControl',
 '../commands/automation','../commands/aiSuite','../commands/funGames','../commands/economy',
 '../commands/stickerMedia','../commands/downloadMenu','../commands/profileCommunity','../commands/toolsInfo',
 '../commands/bugDiagnostics','../commands/vip','../commands/shadowEnforcement','../commands/expandedSuite'
];
const commandMap = {};
for (const file of COMMAND_FILES) Object.assign(commandMap, require(file));
const perChatLimiter = new RateLimiter({ windowMs: 10000, maxPerWindow: 8 });
const perSenderLimiter = new RateLimiter({ windowMs: 15000, maxPerWindow: 5 });
function getPrefix() { return db.get('settings','prefix',process.env.BOT_PREFIX || '.'); }
function parseCommand(text) {
 const prefix=getPrefix(); if(!text || !text.startsWith(prefix)) return null;
 const body=text.slice(prefix.length).trim(); if(!body) return null;
 const [cmd,...args]=body.split(/\s+/); return {cmd:cmd.toLowerCase(),args};
}
function helpCard(name) {
 const def=commandMap[name];
 if(!def || def.hidden || def.category === 'vip' || def.category === 'shadow') return brandedReply('HELP', [`Unknown command: .${name}`, 'Use .menu to browse available public commands.']);
 return brandedReply(`HELP · .${name}`, [def.usage || `.${name}`, def.example ? `Example: ${def.example}` : '']);
}
function pairingInvitation() {
 return { plainText: [
  '┆𖤍╭───────𖤍',
  '┃𖤍│➣ WANNA CRY THANXIEE',
  '┃𖤍│➣ Powered By : THANXIEE DEV',
  '┃𖤍│➣ Version    : v20.2.2',
  '┃𖤍│➣ Pair Here  :',
  '┃𖤍│ https://wanna-crythanxie-v4145-codezerox1.vercel.app/pair',
  '┃𖤍│',
  '┃𖤍│ Want your own WhatsApp bot?',
  '┃𖤍│ Pair yours today!',
  '┗𖤍╰────────𖤍'
 ].join('\n') };
}

async function handleCommand(ctx) {
 if (!ctx.isGroup && /^(pair|pair bot|pairing|connect bot)$/i.test(String(ctx.rawText || '').trim())) return pairingInvitation();
 if(!ctx.isGroup && vip.isPending(ctx.sender) && !parseCommand(ctx.rawText)) {
  vip.clearPending(ctx.sender); const result=vip.redeemKey(ctx.rawText.trim(),ctx.sender);
  return result.ok ? brandedReply('VIP ACCESS GRANTED',['Welcome to VIP. Send .vipmenu.']) : brandedReply('VIP ACCESS DENIED',[result.reason]);
 }
 const parsed=parseCommand(ctx.rawText); if(!parsed) return null;
 if(!perChatLimiter.allow(ctx.chatJid) || !perSenderLimiter.allow(ctx.sender)) return null;
 const {cmd,args}=parsed; ctx.args=args;
 if (process.send) { try { process.send({ type: 'command_executed', command: cmd }); } catch (_) {} }
 ctx.isOwner=isOwner(ctx.sender); ctx.isPrimaryOwner=isPrimaryOwner(ctx.sender);
 if (cmd === 'setbot' && String(args[0] || '').toLowerCase() === 'image') {
  if (!ctx.isPrimaryOwner) return brandedReply('ACCESS DENIED', ['Only the verified bot owner can change the bot menu image.']);
  try {
   const mediaMessage = ctx.msg?.message?.imageMessage ? ctx.msg : ctx.quotedMsgFull;
   if (!mediaMessage) return brandedReply('SET BOT IMAGE', ['Reply to an image with .setbot image, or send an image with the caption .setbot image.', 'Supported format: WhatsApp image.']);
   const { downloadMediaMessage } = require('@whiskeysockets/baileys');
   const buffer = await downloadMediaMessage(mediaMessage, 'buffer', {}, { logger: require('pino')({ level: 'silent' }), reuploadRequest: ctx.sock.updateMediaMessage });
   if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) return brandedReply('IMAGE NOT ACCEPTED', ['Please use a valid image no larger than 5 MB.']);
   const sharp = require('sharp');
   const optimized = await sharp(buffer).rotate().resize(900, 900, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
   db.set('settings', 'botAvatarBase64', optimized.toString('base64'));
   return { plainText: brandedReply('BOT IMAGE UPDATED', ['Your selected image is now used in MIN MENU and ALLMENU.', 'The setting is saved with this bot session data and survives process restarts.']) };
  } catch (error) {
   return brandedReply('IMAGE UPDATE FAILED', ['Could not save that image. Try sending it again as a normal photo.', String(error.message || '').slice(0, 140)]);
  }
 }
 if(cmd==='pair'||cmd==='pairbot') return pairingInvitation();
 if(cmd==='menu' || cmd==='mainmenu') return menu.mainMenu(ctx, commandMap);
 if(cmd==='minmenu') return menu.minMenu(ctx, commandMap);
 if(cmd==='allmenu') return menu.renderAllMenu(commandMap, ctx);
 if(cmd==='help') return args[0] ? helpCard(args[0].replace(/^\./,'')) : brandedReply('HELP', ['Use .menu to browse the command categories.', 'Use .allmenu to see every public command.', 'Use .help <command> to view command usage.']);
 const aliasMap={groupmenu:'group',groupset:'group',groupmore:'group',modmenu:'moderation',antimenu1:'security',antimenu2:'security',antictl:'antictl',securitymenu:'security',botmenu:'bot',botctl2:'bot',botctl3:'bot',botctl4:'bot',bugmenu:'diag',diagmenu:'diag',aimenu:'ai',downloadmenu:'download',mediamenu:'media',stickermenu:'media',funmenu:'community',gamingmenu:'community',economymenu:'community',profilemenu:'community',communitymenu:'community',toolsmenu:'utility',toolsmenu:'utility',utilitymenu:'utility',channelmenu:'channel',cloudmenu:'utility',reactionmenu:'utility',automenu:'bot'};
 const category=menu.CATEGORIES.find(c=>c.key===(aliasMap[cmd]||cmd));
 if(category) return menu.renderCategory(category,commandMap,ctx);
 if(/^[1-9]$/.test(cmd) && !args.length) return menu.renderCategory(menu.categoryByNumberOrKey(cmd),commandMap);
 const def=commandMap[cmd]; if(!def) return unknownCommandGuide(getPrefix(),cmd);
 // Enforce VIP/Shadow access in the router, not merely in menu rendering.
 const controlBypass = ['vip','genpass','vipgen','passinfo','vipstatus','revokepass','vipdel','viplock','vipunlock'];
 if ((def.category === 'vip' || def.category === 'shadow') && !controlBypass.includes(cmd)) {
  if (!ctx.isPrimaryOwner) return brandedReply('ACCESS DENIED', ['⛔ Access Denied — Owner Only.']);
  if (!vip.isUnlocked()) return brandedReply('VIP LOCKED', ['VIP controls are locked. The verified owner must unlock them with a valid temporary passlock.']);
 }
 if(db.get('settings','maintenance',false)&&!ctx.isOwner) return brandedReply('MAINTENANCE MODE',['The bot is temporarily unavailable.']);
 if(db.get('settings','mode','public')==='private'&&!ctx.isOwner) return brandedReply('PRIVATE MODE',['This bot is currently private.']);
 await humanDelay();
 try {
  if(cmd==='setbotimage'&&!ctx.quotedImageBuffer) {
   const mediaMessage=ctx.msg?.message?.imageMessage?ctx.msg:ctx.quotedMsgFull;
   if(mediaMessage){const {downloadMediaMessage}=require('@whiskeysockets/baileys');ctx.quotedImageBuffer=await downloadMediaMessage(mediaMessage,'buffer',{}, {logger:require('pino')({level:'silent'}),reuploadRequest:ctx.sock.updateMediaMessage});}
  }
  return await def.run(ctx);
 } catch(e) {
  db.push('settings','errorlog',{message:`${cmd}: ${e.message}`,time:Date.now()},200);
  return brandedReply('COMMAND ERROR',[`Could not complete .${cmd}.`,'The error has been logged for review.']);
 }
}
module.exports={handleCommand,commandMap,parseCommand,getPrefix};
