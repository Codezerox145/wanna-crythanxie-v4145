// commands/groupManagement.js
const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');
const { isGroupAdmin } = require('../lib/permissions');
const { getGroupSettings, setGroupSetting, renderWelcome, renderGoodbye } = require('../lib/welcome');
const scheduler = require('../lib/scheduler');

function targetFromCtx(ctx) {
  // target = quoted message author, or first mentioned JID, or arg[0] as number
  if (ctx.quotedParticipant) return ctx.quotedParticipant;
  if (ctx.mentions && ctx.mentions.length) return ctx.mentions[0];
  if (ctx.args[0]) {
    const num = ctx.args[0].replace(/[^0-9]/g, '');
    if (num) return `${num}@s.whatsapp.net`;
  }
  return null;
}

async function requireGroupAdminCaller(ctx) {
  if (!ctx.isGroup) return 'This command only works inside a group.';
  if (!isGroupAdmin(ctx.participants, ctx.sender) && !ctx.isOwner) return 'Only group admins (or the bot owner) can use this.';
  return null;
}

async function requireBotAdmin(ctx) {
  if (!isGroupAdmin(ctx.participants, ctx.botJid)) return 'I need to be a group admin to do that. Please promote me first.';
  return null;
}

const commands = {
  promote: {
    category: 'group', usage: '.promote (reply/mention user)', example: '.promote @user',
    async run(ctx) {
      const err = (await requireGroupAdminCaller(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = targetFromCtx(ctx);
      if (!target) return usageGuide('promote', '.promote (reply to user or @mention)', '.promote @263771234567');
      await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'promote');
      return brandedReply('PROMOTED', [`@${target.split('@')[0]} is now a group admin.`]);
    }
  },
  demote: {
    category: 'group', usage: '.demote (reply/mention user)', example: '.demote @user',
    async run(ctx) {
      const err = (await requireGroupAdminCaller(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = targetFromCtx(ctx);
      if (!target) return usageGuide('demote', '.demote (reply to user or @mention)', '.demote @263771234567');
      await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'demote');
      return brandedReply('DEMOTED', [`@${target.split('@')[0]} is no longer a group admin.`]);
    }
  },
  kick: {
    category: 'group', usage: '.kick (reply/mention user)', example: '.kick @user',
    async run(ctx) {
      const err = (await requireGroupAdminCaller(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = targetFromCtx(ctx);
      if (!target) return usageGuide('kick', '.kick (reply to user or @mention)', '.kick @263771234567');
      await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'remove');
      return brandedReply('REMOVED', [`@${target.split('@')[0]} has been removed from the group.`]);
    }
  },
  add: {
    category: 'group', usage: '.add 263771234567', example: '.add 263771234567',
    async run(ctx) {
      const err = (await requireGroupAdminCaller(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const num = (ctx.args[0] || '').replace(/[^0-9]/g, '');
      if (!num) return usageGuide('add', '.add <number>', '.add 263771234567');
      await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [`${num}@s.whatsapp.net`], 'add');
      return brandedReply('ADD REQUEST SENT', [`Tried to add ${num}. If privacy settings block it, they'll get an invite link instead.`]);
    }
  },
  warn: {
    category: 'group', usage: '.warn (reply/mention) [reason]', example: '.warn @user spamming links',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = targetFromCtx(ctx);
      if (!target) return usageGuide('warn', '.warn (reply/mention) [reason]', '.warn @user spamming');
      const reason = ctx.args.slice(ctx.mentions.length ? 1 : 1).join(' ') || 'No reason given';
      const key = `${ctx.chatJid}:${target}`;
      const warns = db.get('modlog', key, []);
      warns.push({ by: ctx.sender, reason, time: Date.now() });
      db.set('modlog', key, warns);
      const limit = db.get('settings', `warnlimit:${ctx.chatJid}`, 3);
      const msg = [`@${target.split('@')[0]} warned (${warns.length}/${limit}).`, `Reason: ${reason}`];
      if (warns.length >= limit && isGroupAdmin(ctx.participants, ctx.botJid)) {
        await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'remove');
        msg.push('Warn limit reached — user has been removed.');
      }
      return { text: brandedReply('WARNING ISSUED', msg), mentions: [target] };
    }
  },
  unwarn: {
    category: 'group', usage: '.unwarn (reply/mention)', example: '.unwarn @user',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = targetFromCtx(ctx);
      if (!target) return usageGuide('unwarn', '.unwarn (reply/mention)', '.unwarn @user');
      const key = `${ctx.chatJid}:${target}`;
      const warns = db.get('modlog', key, []);
      warns.pop();
      db.set('modlog', key, warns);
      return brandedReply('WARN REMOVED', [`@${target.split('@')[0]} now has ${warns.length} warning(s).`]);
    }
  },
  listwarn: {
    category: 'group', usage: '.listwarn (reply/mention)', example: '.listwarn @user',
    async run(ctx) {
      const target = targetFromCtx(ctx) || ctx.sender;
      const key = `${ctx.chatJid}:${target}`;
      const warns = db.get('modlog', key, []);
      if (!warns.length) return brandedReply('WARN HISTORY', [`@${target.split('@')[0]} has no warnings.`]);
      const lines = warns.map((w, i) => `${i + 1}. ${w.reason}`);
      return { text: brandedReply('WARN HISTORY', lines), mentions: [target] };
    }
  },
  hidetag: {
    category: 'group', usage: '.hidetag <message>', example: '.hidetag meeting in 10 mins',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const text = ctx.args.join(' ') || '. . .';
      return { text: brandedReply('ANNOUNCEMENT', [text]), mentions: ctx.participants.map((p) => p.id) };
    }
  },
  tagall: {
    category: 'group', usage: '.tagall [message]', example: '.tagall standup in 5 mins',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const text = ctx.args.join(' ') || 'Attention everyone!';
      const tags = ctx.participants.map((p) => `@${p.id.split('@')[0]}`).join(' ');
      return { text: brandedReply('TAG ALL', [text, '', tags]), mentions: ctx.participants.map((p) => p.id) };
    }
  },
  tagadmins: {
    category: 'group', usage: '.tagadmins [message]', example: '.tagadmins please check this',
    async run(ctx) {
      const admins = ctx.participants.filter((p) => p.admin);
      const tags = admins.map((p) => `@${p.id.split('@')[0]}`).join(' ');
      const text = ctx.args.join(' ') || 'Attention admins!';
      return { text: brandedReply('TAG ADMINS', [text, '', tags]), mentions: admins.map((p) => p.id) };
    }
  },
  admins: {
    category: 'group', usage: '.admins', example: '.admins',
    async run(ctx) {
      const admins = ctx.participants.filter((p) => p.admin);
      const lines = admins.map((p) => `@${p.id.split('@')[0]} (${p.admin})`);
      return { text: brandedReply('GROUP ADMINS', lines), mentions: admins.map((p) => p.id) };
    }
  },
  members: {
    category: 'group', usage: '.members', example: '.members',
    async run(ctx) {
      return brandedReply('MEMBER COUNT', [`This group has ${ctx.participants.length} members.`]);
    }
  },
  setwelcome: {
    category: 'group', usage: '.setwelcome <text with {user} {group}>', example: '.setwelcome Hey {user}, welcome to {group}!',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const text = ctx.args.join(' ');
      if (!text) return usageGuide('setwelcome', '.setwelcome <text>', '.setwelcome Hey {user}, welcome to {group}!');
      setGroupSetting(ctx.chatJid, { welcomeOn: true, welcomeText: text });
      return brandedReply('WELCOME MESSAGE SET', ['Welcome is now ON with your custom message.']);
    }
  },
  setgoodbye: {
    category: 'group', usage: '.setgoodbye <text with {user} {group}>', example: '.setgoodbye {user} left {group}, farewell!',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const text = ctx.args.join(' ');
      if (!text) return usageGuide('setgoodbye', '.setgoodbye <text>', '.setgoodbye {user} left {group}, farewell!');
      setGroupSetting(ctx.chatJid, { goodbyeOn: true, goodbyeText: text });
      return brandedReply('GOODBYE MESSAGE SET', ['Goodbye is now ON with your custom message.']);
    }
  },
  welcome: {
    category: 'group', usage: '.welcome on|off', example: '.welcome on',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const on = (ctx.args[0] || '').toLowerCase() === 'on';
      setGroupSetting(ctx.chatJid, { welcomeOn: on });
      return brandedReply('WELCOME TOGGLED', [`Welcome messages are now ${on ? 'ON' : 'OFF'}.`,
        on && !getGroupSettings(ctx.chatJid).welcomeText ? 'No custom message set — randomized branded welcomes will be used (.setwelcome to customize).' : null
      ].filter(Boolean));
    }
  },
  goodbye: {
    category: 'group', usage: '.goodbye on|off', example: '.goodbye on',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const on = (ctx.args[0] || '').toLowerCase() === 'on';
      setGroupSetting(ctx.chatJid, { goodbyeOn: on });
      return brandedReply('GOODBYE TOGGLED', [`Goodbye messages are now ${on ? 'ON' : 'OFF'}.`]);
    }
  },
  mute: {
    category: 'group', usage: '.mute', example: '.mute',
    async run(ctx) {
      const err = (await requireGroupAdminCaller(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.groupSettingUpdate(ctx.chatJid, 'announcement');
      return brandedReply('GROUP MUTED', ['Only admins can send messages now.']);
    }
  },
  unmute: {
    category: 'group', usage: '.unmute', example: '.unmute',
    async run(ctx) {
      const err = (await requireGroupAdminCaller(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.groupSettingUpdate(ctx.chatJid, 'not_announcement');
      return brandedReply('GROUP UNMUTED', ['Everyone can send messages again.']);
    }
  },
  pin: {
    category: 'group', usage: '.pin (reply to a message)', example: '.pin',
    async run(ctx) {
      if (!ctx.quotedKey) return usageGuide('pin', '.pin (reply to the message you want pinned)', '.pin');
      try {
        await ctx.sock.sendMessage(ctx.chatJid, { pin: ctx.quotedKey, type: 1, time: 86400 });
        return brandedReply('MESSAGE PINNED', ['Pinned for 24 hours.']);
      } catch (e) {
        return brandedReply('PIN FAILED', ['This WhatsApp account/client may not support pin via Baileys yet.']);
      }
    }
  },
  del: {
    category: 'group', usage: '.del (reply to a message)', example: '.del',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      if (!ctx.quotedKey) return usageGuide('del', '.del (reply to the message to delete)', '.del');
      await ctx.sock.sendMessage(ctx.chatJid, { delete: ctx.quotedKey });
      return null; // no need for a card, the deletion itself is the feedback
    }
  },
  poll: {
    category: 'group', usage: '.poll Question | option1 | option2 | ...', example: '.poll Pizza or sushi? | Pizza | Sushi',
    async run(ctx) {
      const parts = ctx.args.join(' ').split('|').map((s) => s.trim()).filter(Boolean);
      if (parts.length < 3) return usageGuide('poll', '.poll Question | option1 | option2', '.poll Pizza or sushi? | Pizza | Sushi');
      const [question, ...options] = parts;
      await ctx.sock.sendMessage(ctx.chatJid, { poll: { name: question, values: options, selectableCount: 1 } });
      return null;
    }
  },
  announce: {
    category: 'group', usage: '.announce <text>', example: '.announce Meeting moved to 5pm',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const text = ctx.args.join(' ');
      if (!text) return usageGuide('announce', '.announce <text>', '.announce Meeting moved to 5pm');
      return brandedReply('ANNOUNCEMENT', [text]);
    }
  },
  schedule: {
    category: 'group', usage: '.schedule <+30m|+2h|+1d|YYYY-MM-DD HH:mm> | <text>', example: '.schedule +2h | Reminder: meeting starts soon',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const full = ctx.args.join(' ');
      const [whenRaw, ...rest] = full.split('|');
      const text = rest.join('|').trim();
      const when = scheduler.parseWhen((whenRaw || '').trim());
      if (!when || !text) return usageGuide('schedule', '.schedule <+2h|date> | <text>', '.schedule +2h | Reminder: meeting starts soon');
      const id = scheduler.addSchedule(ctx.chatJid, text, when);
      return brandedReply('SCHEDULED', [`ID: ${id}`, `Sends at: ${new Date(when).toLocaleString()}`, 'Spreading sends over time like this also protects the account from ban-triggering bursts.']);
    }
  },
  listschedule: {
    category: 'group', usage: '.listschedule', example: '.listschedule',
    async run(ctx) {
      const list = scheduler.listSchedules(ctx.chatJid).filter((s) => !s.sent);
      if (!list.length) return brandedReply('SCHEDULED MESSAGES', ['None pending.']);
      return brandedReply('SCHEDULED MESSAGES', list.map((s) => `[${s.id}] ${new Date(s.at).toLocaleString()} — ${s.text.slice(0, 40)}`));
    }
  },
  cancelschedule: {
    category: 'group', usage: '.cancelschedule <id>', example: '.cancelschedule a1b2c3',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const id = ctx.args[0];
      if (!id) return usageGuide('cancelschedule', '.cancelschedule <id>', '.cancelschedule a1b2c3');
      scheduler.cancelSchedule(ctx.chatJid, id);
      return brandedReply('SCHEDULE CANCELLED', [`${id} removed.`]);
    }
  },
  giveaway: {
    category: 'group', usage: '.giveaway <prize> | <duration e.g. 1h>', example: '.giveaway $10 airtime | 1h',
    async run(ctx) {
      const err = await requireGroupAdminCaller(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const [prize, duration] = ctx.args.join(' ').split('|').map((s) => s.trim());
      if (!prize) return usageGuide('giveaway', '.giveaway <prize> | <duration>', '.giveaway $10 airtime | 1h');
      return brandedReply('GIVEAWAY STARTED', [`Prize: ${prize}`, `Ends in: ${duration || '1h'}`, 'React with 🎉 to enter! (winner picked manually by admin in this build)']);
    }
  }
};

module.exports = commands;
