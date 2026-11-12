// commands/groupSettings.js
const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');
const { isGroupAdmin } = require('../lib/permissions');

async function requireAdmin(ctx) {
  if (!ctx.isGroup) return 'This command only works inside a group.';
  if (!isGroupAdmin(ctx.participants, ctx.sender) && !ctx.isOwner) return 'Only group admins can use this.';
  return null;
}
async function requireBotAdmin(ctx) {
  if (!isGroupAdmin(ctx.participants, ctx.botJid)) return 'I need to be a group admin to do that.';
  return null;
}

const commands = {
  open: {
    category: 'groupset', usage: '.open', example: '.open',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.groupSettingUpdate(ctx.chatJid, 'not_announcement');
      return brandedReply('GROUP OPENED', ['All members can now send messages.']);
    }
  },
  close: {
    category: 'groupset', usage: '.close', example: '.close',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.groupSettingUpdate(ctx.chatJid, 'announcement');
      return brandedReply('GROUP CLOSED', ['Only admins can now send messages.']);
    }
  },
  lock: {
    category: 'groupset', usage: '.lock', example: '.lock',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.groupSettingUpdate(ctx.chatJid, 'locked');
      return brandedReply('GROUP LOCKED', ['Only admins can edit group info now.']);
    }
  },
  unlock: {
    category: 'groupset', usage: '.unlock', example: '.unlock',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.groupSettingUpdate(ctx.chatJid, 'unlocked');
      return brandedReply('GROUP UNLOCKED', ['All members can edit group info now.']);
    }
  },
  setname: {
    category: 'groupset', usage: '.setname <new name>', example: '.setname Family Chat',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const name = ctx.args.join(' ');
      if (!name) return usageGuide('setname', '.setname <new name>', '.setname Family Chat');
      await ctx.sock.groupUpdateSubject(ctx.chatJid, name);
      return brandedReply('GROUP NAME UPDATED', [`New name: ${name}`]);
    }
  },
  setdesc: {
    category: 'groupset', usage: '.setdesc <new description>', example: '.setdesc Keep it friendly!',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const desc = ctx.args.join(' ');
      if (!desc) return usageGuide('setdesc', '.setdesc <new description>', '.setdesc Keep it friendly!');
      await ctx.sock.groupUpdateDescription(ctx.chatJid, desc);
      return brandedReply('GROUP DESCRIPTION UPDATED', [desc]);
    }
  },
  groupdesc: {
    category: 'groupset', usage: '.groupdesc', example: '.groupdesc',
    async run(ctx) {
      const meta = ctx.groupMetadata;
      return brandedReply('GROUP DESCRIPTION', [meta.desc || 'No description set.']);
    }
  },
  grouprules: {
    category: 'groupset', usage: '.grouprules [set <text>]', example: '.grouprules set No spam, be respectful.',
    async run(ctx) {
      if (ctx.args[0] === 'set') {
        const err = await requireAdmin(ctx);
        if (err) return brandedReply('ACCESS DENIED', [err]);
        const rules = ctx.args.slice(1).join(' ');
        if (!rules) return usageGuide('grouprules', '.grouprules set <text>', '.grouprules set No spam, be respectful.');
        db.set('groups', `${ctx.chatJid}:rules`, rules);
        return brandedReply('GROUP RULES SET', [rules]);
      }
      const rules = db.get('groups', `${ctx.chatJid}:rules`, null);
      return brandedReply('GROUP RULES', [rules || 'No rules set yet. Admin: .grouprules set <text>']);
    }
  },
  grouplink: {
    category: 'groupset', usage: '.grouplink', example: '.grouplink',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const code = await ctx.sock.groupInviteCode(ctx.chatJid);
      return brandedReply('GROUP INVITE LINK', [`https://chat.whatsapp.com/${code}`]);
    }
  },
  link: {
    category: 'groupset', usage: '.link', example: '.link',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const code = await ctx.sock.groupInviteCode(ctx.chatJid);
      return brandedReply('GROUP INVITE LINK', [`https://chat.whatsapp.com/${code}`]);
    }
  },
  revoke: {
    category: 'groupset', usage: '.revoke', example: '.revoke',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.groupRevokeInvite(ctx.chatJid);
      return brandedReply('INVITE LINK RESET', ['The old invite link is no longer valid.']);
    }
  },
  leave: {
    category: 'groupset', usage: '.leave', example: '.leave',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      await ctx.sock.sendMessage(ctx.chatJid, { text: brandedReply('GOODBYE', ['Bot is leaving this group. Thanks for having me!']) });
      await ctx.sock.groupLeave(ctx.chatJid);
      return null;
    }
  },
  ephemeral: {
    category: 'groupset', usage: '.ephemeral on|off', example: '.ephemeral on',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const on = (ctx.args[0] || '').toLowerCase() === 'on';
      await ctx.sock.groupToggleEphemeral(ctx.chatJid, on ? 604800 : 0);
      return brandedReply('DISAPPEARING MESSAGES', [`Disappearing messages are now ${on ? 'ON (7 days)' : 'OFF'}.`]);
    }
  },
  groupinfo: {
    category: 'groupset', usage: '.groupinfo', example: '.groupinfo',
    async run(ctx) {
      const meta = ctx.groupMetadata;
      return brandedReply('GROUP INFO', [
        `Name    : ${meta.subject}`,
        `Members : ${meta.participants.length}`,
        `Created : ${new Date(meta.creation * 1000).toLocaleString()}`,
        `ID      : ${meta.id}`
      ]);
    }
  },
  groupstats: {
    category: 'groupset', usage: '.groupstats', example: '.groupstats',
    async run(ctx) {
      const meta = ctx.groupMetadata;
      const admins = meta.participants.filter((p) => p.admin).length;
      const bar = (pct) => '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      const adminPct = Math.round((admins / meta.participants.length) * 100);
      return brandedReply('GROUP STATISTICS', [
        `Total members : ${meta.participants.length}`,
        `Admins        : ${admins} (${adminPct}%)`,
        `Admin ratio   : ${bar(adminPct)} ${adminPct}%`,
        `Regular users : ${meta.participants.length - admins}`
      ]);
    }
  },
  memberstats: {
    category: 'groupset', usage: '.memberstats', example: '.memberstats',
    async run(ctx) {
      return brandedReply('MEMBER STATS', [`Total: ${ctx.participants.length} members, ${ctx.participants.filter(p=>p.admin).length} admins.`]);
    }
  },
  online: {
    category: 'groupset', usage: '.online', example: '.online',
    async run(ctx) {
      return brandedReply('ONLINE MEMBERS', [
        'Live presence for every member isn\'t exposed by WhatsApp\'s protocol for privacy reasons.',
        'This command can only reliably report members active in this chat recently — wire presence events in index.js to populate real data here.'
      ]);
    }
  },
  invites: {
    category: 'groupset', usage: '.invites', example: '.invites',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const code = await ctx.sock.groupInviteCode(ctx.chatJid);
      return brandedReply('ACTIVE INVITE', [`https://chat.whatsapp.com/${code}`]);
    }
  },
  created: {
    category: 'groupset', usage: '.created', example: '.created',
    async run(ctx) {
      const meta = ctx.groupMetadata;
      return brandedReply('GROUP CREATED', [new Date(meta.creation * 1000).toString()]);
    }
  },
  joinapproval: {
    category: 'groupset', usage: '.joinapproval on|off', example: '.joinapproval on',
    async run(ctx) {
      const err = (await requireAdmin(ctx)) || (await requireBotAdmin(ctx));
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const on = (ctx.args[0] || '').toLowerCase() === 'on';
      try {
        await ctx.sock.groupJoinApprovalMode(ctx.chatJid, on ? 'on' : 'off');
        return brandedReply('JOIN APPROVAL', [`Join approval is now ${on ? 'ON' : 'OFF'}.`]);
      } catch (e) {
        return brandedReply('NOT SUPPORTED', ['Your Baileys version may not support join-approval mode yet.']);
      }
    }
  }
};

module.exports = commands;
