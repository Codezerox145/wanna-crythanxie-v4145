// commands/botControl.js
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');
const { brandedReply, usageGuide, BOT_NAME, CHANNEL_LINK } = require('../lib/brand');
const { isOwner, isGroupAdmin, addSudo, delSudo, listOwners } = require('../lib/permissions');
const { BroadcastQueue } = require('../lib/antiban');

const bq = new BroadcastQueue();
const START_TIME = Date.now();

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function requireOwner(ctx) {
  return ctx.isOwner ? null : 'This command is restricted to the bot owner.';
}

const commands = {
  ping: {
    category: 'botctl', usage: '.ping', example: '.ping',
    async run(ctx) {
      const start = Date.now();
      return brandedReply('PONG', [`Latency check complete.`, `Response time: ${Date.now() - start + 1}ms`]);
    }
  },
  alive: {
    category: 'botctl', usage: '.alive', example: '.alive',
    async run() {
      return brandedReply('I AM ALIVE', [`${BOT_NAME} is online and running.`, `Uptime: ${fmtUptime(Date.now() - START_TIME)}`]);
    }
  },
  uptime: {
    category: 'botctl', usage: '.uptime', example: '.uptime',
    async run() { return brandedReply('UPTIME', [fmtUptime(Date.now() - START_TIME)]); }
  },
  runtime: {
    category: 'botctl', usage: '.runtime', example: '.runtime',
    async run() { return brandedReply('RUNTIME', [fmtUptime(Date.now() - START_TIME)]); }
  },
  owner: {
    category: 'botctl', usage: '.owner', example: '.owner',
    async run() {
      return brandedReply('OWNER CONTACT', [
        `Owner   : ${process.env.OWNER_NAME || 'THANXIE DEV'}`,
        `Contact : ${process.env.OWNER_CONTACT || 'set OWNER_CONTACT in .env'}`
      ]);
    }
  },
  channel: {
    category: 'channel', usage: '.channel', example: '.channel',
    async run() { return brandedReply('OFFICIAL CHANNEL', [CHANNEL_LINK]); }
  },
  setprefix: {
    category: 'botctl', usage: '.setprefix <symbol>', example: '.setprefix !',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const p = ctx.args[0];
      if (!p) return usageGuide('setprefix', '.setprefix <symbol>', '.setprefix !');
      db.set('settings', 'prefix', p);
      return brandedReply('PREFIX UPDATED', [`New prefix: ${p}`]);
    }
  },
  mode: {
    category: 'botctl', usage: '.mode public|private', example: '.mode private',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const m = (ctx.args[0] || '').toLowerCase();
      if (!['public', 'private'].includes(m)) return usageGuide('mode', '.mode public|private', '.mode private');
      db.set('settings', 'mode', m);
      return brandedReply('MODE UPDATED', [`Bot is now in ${m.toUpperCase()} mode.`]);
    }
  },
  self: {
    category: 'botctl', usage: '.self', example: '.self',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      db.set('settings', 'mode', 'private');
      return brandedReply('MODE UPDATED', ['Bot now only responds to the owner/sudo list.']);
    }
  },
  public: {
    category: 'botctl', usage: '.public', example: '.public',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      db.set('settings', 'mode', 'public');
      return brandedReply('MODE UPDATED', ['Bot now responds to everyone.']);
    }
  },
  broadcast: {
    category: 'botctl', usage: '.broadcast <message>', example: '.broadcast Maintenance at 10pm',
    async run(ctx) {
      if (ctx.isGroup && (ctx.args[0] || '').toLowerCase() === 'optin') {
        const choice = (ctx.args[1] || '').toLowerCase();
        if (!['on', 'off'].includes(choice)) return usageGuide('broadcast', '.broadcast optin on|off', '.broadcast optin on');
        const metadata = ctx.groupMetadata || await ctx.sock.groupMetadata(ctx.chatJid);
        if (!isGroupAdmin(metadata.participants || [], ctx.sender)) return brandedReply('ACCESS DENIED', ['Only a group admin can change this group broadcast preference.']);
        db.set('groups', `${ctx.chatJid}:broadcastOptIn`, choice === 'on');
        return brandedReply('BROADCAST PREFERENCE UPDATED', [`Group opt-in: ${choice.toUpperCase()}`, 'Only opted-in groups receive owner broadcasts.']);
      }
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const text = ctx.args.join(' ');
      if (!text) return usageGuide('broadcast', '.broadcast <message>', '.broadcast Maintenance at 10pm');
      const groups = db.get('settings', 'joinedGroups', []);
      if (!groups.length) return brandedReply('BROADCAST', ['No tracked groups yet — the bot populates this list as it joins groups.']);
      const optedIn = groups.filter((g) => db.get('groups', `${g}:broadcastOptIn`, false));
      if (!optedIn.length) return brandedReply('BROADCAST BLOCKED', ['No groups have opted in to owner broadcasts.', 'A group admin can opt in with .broadcast optin on.']);
      const jobs = optedIn.map((g) => async () => {
        await ctx.sock.sendMessage(g, { text: brandedReply('BROADCAST', [text]) });
      });
      const { sent, skippedCap } = await bq.run(jobs);
      return brandedReply('BROADCAST SENT', [`Delivered to ${sent} group(s), spaced out to protect the account.`, skippedCap ? `${skippedCap} skipped (daily cap reached).` : null].filter(Boolean));
    }
  },
  botstats: {
    category: 'botctl', usage: '.botstats', example: '.botstats',
    async run(ctx) {
      const groups = db.get('settings', 'joinedGroups', []);
      return brandedReply('BOT STATS', [`Groups   : ${groups.length}`, `Uptime   : ${fmtUptime(Date.now() - START_TIME)}`, `Mode     : ${db.get('settings', 'mode', 'public')}`]);
    }
  },
  setbotimage: {
    category: 'botctl', usage: '.setbotimage (reply to an image)', example: '.setbotimage',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      if (!ctx.quotedImageBuffer) return usageGuide('setbotimage', 'Reply to an image with .setbotimage, or send an image with .setbotimage as its caption.', '.setbotimage');
      try {
        await ctx.sock.updateProfilePicture(ctx.sock.user.id, ctx.quotedImageBuffer);
        return brandedReply('BOT PROFILE IMAGE UPDATED', ['Done. It may take a minute to show on all devices.']);
      } catch (e) {
        return brandedReply('UPDATE FAILED', [`Could not update profile image: ${e.message}`, 'Check that the image is valid and the WhatsApp account is connected.']);
      }
    }
  },
  setbotname: {
    category: 'botctl', usage: '.setbotname <name>', example: '.setbotname WANNA-CRY THANXIEE',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const name = ctx.args.join(' ');
      if (!name) return usageGuide('setbotname', '.setbotname <name>', '.setbotname My Bot');
      await ctx.sock.updateProfileName(name);
      return brandedReply('BOT NAME UPDATED', [name]);
    }
  },
  setbotbio: {
    category: 'botctl', usage: '.setbotbio <text>', example: '.setbotbio Online 24/7',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const text = ctx.args.join(' ');
      if (!text) return usageGuide('setbotbio', '.setbotbio <text>', '.setbotbio Online 24/7');
      await ctx.sock.updateProfileStatus(text);
      return brandedReply('BOT BIO UPDATED', [text]);
    }
  },
  addowner: {
    category: 'botctl', usage: '.addowner (reply/mention)', example: '.addowner @user',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('addowner', '.addowner (reply/mention)', '.addowner @user');
      addSudo(target);
      return brandedReply('SUDO ADDED', [`@${target.split('@')[0]} now has owner-level access.`]);
    }
  },
  delowner: {
    category: 'botctl', usage: '.delowner (reply/mention)', example: '.delowner @user',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('delowner', '.delowner (reply/mention)', '.delowner @user');
      delSudo(target);
      return brandedReply('SUDO REMOVED', [`@${target.split('@')[0]} no longer has owner-level access.`]);
    }
  },
  listowner: {
    category: 'botctl', usage: '.listowner', example: '.listowner',
    async run(ctx) {
      const { envOwners, sudo } = listOwners();
      return brandedReply('OWNERS', [...envOwners.map((o) => `(.env) ${o}`), ...sudo.map((o) => `(sudo) ${o}`)]);
    }
  },
  groups: {
    category: 'botctl', usage: '.groups', example: '.groups',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const groups = db.get('settings', 'joinedGroups', []);
      return brandedReply('JOINED GROUPS', [`Total: ${groups.length}`]);
    }
  },
  maintenance: {
    category: 'botctl', usage: '.maintenance on|off', example: '.maintenance on',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const on = (ctx.args[0] || '').toLowerCase() === 'on';
      db.set('settings', 'maintenance', on);
      return brandedReply('MAINTENANCE MODE', [`Maintenance mode is now ${on ? 'ON (only owner can use commands)' : 'OFF'}.`]);
    }
  }
};

module.exports = commands;
