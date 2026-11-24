// commands/shadowEnforcement.js
//
// SHADOW ENFORCEMENT CENTRE — hidden from .menu, .allmenu and .groupmenu.
// Every command here is owner-only (checked against lib/permissions.js,
// which reads the DEPLOYING OWNER's own .env + runtime sudo list — there is
// no fixed master key anywhere in this codebase). Reachable only by typing
// the exact command, which is intentionally undocumented in any public menu.
//
// Scope note: this implements real per-GROUP moderation record-keeping
// (reports, strikes, bans, blacklist, watchlist) exactly as a group's own
// owner/admin team would use it. It deliberately does NOT implement
// cross-group global tracking (globalban, investigate, casefile, riskscore,
// massban/massunban, autoban/autosuspend) — that class of feature is
// surveillance infrastructure that tracks people across groups they didn't
// report to, and it was left out by design, not by oversight.

const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');
const vip = require('../lib/vip');
const { isPrimaryOwner } = require('../lib/permissions');

function ownerGateOrReply(ctx) {
  if (!isPrimaryOwner(ctx.sender)) return brandedReply('ACCESS DENIED', ['⛔ Access Denied — Owner Only.']);
  if (!ctx.isGroup) return brandedReply('GROUP ONLY', ['Run Shadow Enforcement commands inside the group you want to manage.']);
  if (!ctx.isAdmin && !ctx.isOwner) return brandedReply('ADMIN ONLY', ['Only a group admin or the configured bot owner can use this centre.']);
  if (!vip.isUnlocked()) return brandedReply('VIP LOCKED', ['Shadow Enforcement is locked. Use .vipunlock with a valid owner passlock.']);
  return null;
}

function normaliseJid(value) {
  return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}
function groupActionGate(ctx, target) {
  if (!ctx.isGroup) return brandedReply('GROUP ONLY', ['This action must be run inside the target group.']);
  if (!ctx.isAdmin && !ctx.isOwner) return brandedReply('ADMIN ONLY', ['You must be a group admin to remove or blacklist members.']);
  if (!ctx.isBotAdmin) return brandedReply('BOT ADMIN REQUIRED', ['Make WANNA-CRY THANXIEE a group admin before using member-removal actions.']);
  const member = (ctx.participants || []).find(item => normaliseJid(item.id || item.jid) === normaliseJid(target));
  if (!member) return brandedReply('MEMBER NOT FOUND', ['That user is not currently a member of this group.']);
  if (member.admin) return brandedReply('PROTECTED MEMBER', ['The bot will not remove a group admin.']);
  if (normaliseJid(target) === normaliseJid(ctx.botJid)) return brandedReply('PROTECTED MEMBER', ['The bot cannot remove itself.']);
  return null;
}

function key(groupJid, suffix) { return `${groupJid}:${suffix}`; }

const commands = {
  report: {
    category: 'shadow', hidden: true, usage: '.report (reply/mention) <reason>', example: '.report @user spamming links',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const reason = ctx.args.slice(ctx.mentions.length ? 1 : 0).join(' ') || 'No reason given';
      if (!target) return usageGuide('report', '.report (reply/mention) <reason>', '.report @user spamming');
      db.push('modlog', key(ctx.chatJid, `reports:${target}`), { by: ctx.sender, reason, time: Date.now() }, 500);
      return { text: brandedReply('REPORT LOGGED', [`@${target.split('@')[0]} reported: ${reason}`]), mentions: [target] };
    }
  },
  reports: {
    category: 'shadow', hidden: true, usage: '.reports (reply/mention)', example: '.reports @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant || ctx.sender;
      const list = db.get('modlog', key(ctx.chatJid, `reports:${target}`), []);
      if (!list.length) return brandedReply('REPORTS', ['No reports on file for that user in this group.']);
      return brandedReply('REPORTS', list.map((r, i) => `${i + 1}. ${r.reason}`));
    }
  },
  viewreport: {
    category: 'shadow', hidden: true, usage: '.viewreport (reply/mention) <index>', example: '.viewreport @user 1',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const idx = parseInt(ctx.args[ctx.mentions.length ? 1 : 0], 10) - 1;
      const list = db.get('modlog', key(ctx.chatJid, `reports:${target}`), []);
      if (!list[idx]) return brandedReply('REPORT', ['Not found.']);
      const r = list[idx];
      return brandedReply('REPORT DETAIL', [`Reason : ${r.reason}`, `By     : ${r.by}`, `Time   : ${new Date(r.time).toLocaleString()}`]);
    }
  },
  reportstats: {
    category: 'shadow', hidden: true, usage: '.reportstats', example: '.reportstats',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const all = db.load('modlog');
      const groupReports = Object.keys(all).filter(name => name.startsWith(`${ctx.chatJid}:reports:`));
      const total = groupReports.reduce((sum, name) => sum + (Array.isArray(all[name]) ? all[name].length : 0), 0);
      return brandedReply('REPORT STATS', [`${total} report(s) across ${groupReports.length} member(s) in this group.`]);
    }
  },
  reportlog: {
    category: 'shadow', hidden: true, usage: '.reportlog', example: '.reportlog',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const all = db.load('modlog');
      const groupKeys = Object.keys(all).filter((k) => k.startsWith(`${ctx.chatJid}:reports:`));
      const lines = groupKeys.slice(-10).map((k) => `@${k.split(':').pop().split('@')[0]} — ${all[k].length} report(s)`);
      return brandedReply('REPORT LOG', lines.length ? lines : ['Empty.']);
    }
  },
  clearreports: {
    category: 'shadow', hidden: true, usage: '.clearreports (reply/mention)', example: '.clearreports @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('clearreports', '.clearreports (reply/mention)', '.clearreports @user');
      db.set('modlog', key(ctx.chatJid, `reports:${target}`), []);
      return brandedReply('REPORTS CLEARED', [`Reports for @${target.split('@')[0]} cleared.`]);
    }
  },

  strike: {
    category: 'shadow', hidden: true, usage: '.strike (reply/mention) <reason>', example: '.strike @user rule violation',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const reason = ctx.args.slice(ctx.mentions.length ? 1 : 0).join(' ') || 'No reason given';
      if (!target) return usageGuide('strike', '.strike (reply/mention) <reason>', '.strike @user rule violation');
      const strikes = db.push('modlog', key(ctx.chatJid, `strikes:${target}`), { reason, by: ctx.sender, time: Date.now() }, 50);
      return { text: brandedReply('STRIKE ISSUED', [`@${target.split('@')[0]} now has ${strikes.length} strike(s).`, `Reason: ${reason}`]), mentions: [target] };
    }
  },
  strikes: {
    category: 'shadow', hidden: true, usage: '.strikes (reply/mention)', example: '.strikes @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant || ctx.sender;
      const list = db.get('modlog', key(ctx.chatJid, `strikes:${target}`), []);
      return brandedReply('STRIKES', [`${list.length} strike(s) on file.`]);
    }
  },
  liststrikes: {
    category: 'shadow', hidden: true, usage: '.liststrikes (reply/mention)', example: '.liststrikes @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant || ctx.sender;
      const list = db.get('modlog', key(ctx.chatJid, `strikes:${target}`), []);
      return brandedReply('STRIKE LIST', list.length ? list.map((s, i) => `${i + 1}. ${s.reason}`) : ['None.']);
    }
  },
  clearstrikes: {
    category: 'shadow', hidden: true, usage: '.clearstrikes (reply/mention)', example: '.clearstrikes @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('clearstrikes', '.clearstrikes (reply/mention)', '.clearstrikes @user');
      db.set('modlog', key(ctx.chatJid, `strikes:${target}`), []);
      return brandedReply('STRIKES CLEARED', [`Strikes for @${target.split('@')[0]} cleared.`]);
    }
  },

  ban: {
    category: 'shadow', hidden: true, usage: '.ban (reply/mention) <reason>', example: '.ban @user repeated violations',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const reason = ctx.args.slice(ctx.mentions.length ? 1 : 0).join(' ') || 'No reason given';
      if (!target) return usageGuide('ban', '.ban (reply/mention) <reason>', '.ban @user repeated violations');
      const actionGate = groupActionGate(ctx, target); if (actionGate) return actionGate;
      const banned = db.get('banned', ctx.chatJid, []);
      if (banned.some(item => normaliseJid(item.jid || item) === normaliseJid(target) && (!item.expiresAt || Number(item.expiresAt) > Date.now()))) {
        return brandedReply('ALREADY BANNED', ['That member already has an active ban in this group.']);
      }
      try { await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'remove'); }
      catch (_) { return brandedReply('BAN FAILED', ['WhatsApp could not remove this member. Check bot admin permissions and try again.']); }
      banned.push({ jid: target, reason, time: Date.now(), by: ctx.sender });
      db.set('banned', ctx.chatJid, banned);
      return { text: brandedReply('USER BANNED', [`@${target.split('@')[0]} was removed and added to this group’s ban list.`, `Reason: ${reason}`]), mentions: [target] };
    }
  },
  unban: {
    category: 'shadow', hidden: true, usage: '.unban (reply/mention)', example: '.unban @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('unban', '.unban (reply/mention)', '.unban @user');
      const banned = db.get('banned', ctx.chatJid, []).filter(item => normaliseJid(item.jid || item) !== normaliseJid(target));
      db.set('banned', ctx.chatJid, banned);
      return brandedReply('BAN RECORD CLEARED', [`@${target.split('@')[0]} is no longer blocked by this group’s ban list.`, 'They can rejoin using a valid group invite.']);
    }
  },
  tempban: {
    category: 'shadow', hidden: true, usage: '.tempban (reply/mention) <duration e.g. 24h>', example: '.tempban @user 24h',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const dur = ctx.args[ctx.mentions.length ? 1 : 0] || '';
      if (!target || !dur) return usageGuide('tempban', '.tempban (reply/mention) <duration: 1m–30d>', '.tempban @user 24h');
      const match = /^([1-9]\d{0,3})(m|h|d)$/i.exec(dur);
      if (!match) return brandedReply('INVALID DURATION', ['Use a duration such as 30m, 12h or 7d (maximum 30d).']);
      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();
      const ms = amount * (unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000);
      if (ms > 30 * 86400000) return brandedReply('INVALID DURATION', ['Temporary bans cannot exceed 30 days.']);
      const actionGate = groupActionGate(ctx, target); if (actionGate) return actionGate;
      try { await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'remove'); }
      catch (_) { return brandedReply('TEMP-BAN FAILED', ['WhatsApp could not remove this member. Check bot admin permissions and try again.']); }
      const banned = db.get('banned', ctx.chatJid, []).filter(item => normaliseJid(item.jid || item) !== normaliseJid(target));
      banned.push({ jid: target, reason: 'temp-ban', time: Date.now(), expiresAt: Date.now() + ms, by: ctx.sender });
      db.set('banned', ctx.chatJid, banned);
      return { text: brandedReply('TEMP-BANNED', [`@${target.split('@')[0]} was removed for ${dur}.`, 'The ban expires automatically; they will still need a group invite to rejoin.']), mentions: [target] };
    }
  },
  banhistory: {
    category: 'shadow', hidden: true, usage: '.banhistory', example: '.banhistory',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const banned = db.get('banned', ctx.chatJid, []);
      return brandedReply('BAN HISTORY', banned.length ? banned.map((b) => `@${b.jid.split('@')[0]} — ${b.reason}`) : ['No bans on record for this group.']);
    }
  },
  baninfo: {
    category: 'shadow', hidden: true, usage: '.baninfo (reply/mention)', example: '.baninfo @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const entry = db.get('banned', ctx.chatJid, []).find((b) => b.jid === target);
      if (!entry) return brandedReply('BAN INFO', ['Not banned in this group.']);
      return brandedReply('BAN INFO', [`Reason: ${entry.reason}`, `By: ${entry.by}`, `Time: ${new Date(entry.time).toLocaleString()}`]);
    }
  },
  reason: {
    category: 'shadow', hidden: true, usage: '.reason (reply/mention)', example: '.reason @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const entry = db.get('banned', ctx.chatJid, []).find((b) => b.jid === target);
      return brandedReply('BAN REASON', [entry ? entry.reason : 'No ban record found.']);
    }
  },
  evidence: {
    category: 'shadow', hidden: true, usage: '.evidence <note>', example: '.evidence screenshot reviewed; note the timestamp',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const note = ctx.args.join(' ') || 'No note';
      db.push('modlog', key(ctx.chatJid, 'evidence'), { note, by: ctx.sender, time: Date.now() }, 500);
      return brandedReply('EVIDENCE LOGGED', ['Saved for this group\'s moderation record.']);
    }
  },

  blacklist: {
    category: 'shadow', hidden: true, usage: '.blacklist (reply/mention) <reason>', example: '.blacklist @user known scammer',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const reason = ctx.args.slice(ctx.mentions.length ? 1 : 0).join(' ') || 'No reason given';
      if (!target) return usageGuide('blacklist', '.blacklist (reply/mention) <reason>', '.blacklist @user known scammer');
      if (!ctx.isBotAdmin) return brandedReply('BOT ADMIN REQUIRED', ['Make WANNA-CRY THANXIEE a group admin so blacklist entries can be enforced when users join.']);
      const member = (ctx.participants || []).some(item => normaliseJid(item.id || item.jid) === normaliseJid(target));
      if (member) {
        const actionGate = groupActionGate(ctx, target); if (actionGate) return actionGate;
        try { await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'remove'); }
        catch (_) { return brandedReply('BLACKLIST FAILED', ['WhatsApp could not remove this member. The blacklist was not changed.']); }
      }
      const list = db.get('groups', key(ctx.chatJid, 'blacklist'), []);
      if (!list.some(item => normaliseJid(item.jid || item) === normaliseJid(target))) list.push({ jid: target, reason, time: Date.now() });
      db.set('groups', key(ctx.chatJid, 'blacklist'), list);
      return { text: brandedReply('BLACKLISTED', [member ? `@${target.split('@')[0]} was removed and blacklisted.` : `@${target.split('@')[0]} added to the join blacklist.`]), mentions: [target] };
    }
  },
  unblacklist: {
    category: 'shadow', hidden: true, usage: '.unblacklist (reply/mention)', example: '.unblacklist @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('unblacklist', '.unblacklist (reply/mention)', '.unblacklist @user');
      const list = db.get('groups', key(ctx.chatJid, 'blacklist'), []).filter(item => normaliseJid(item.jid || item) !== normaliseJid(target));
      db.set('groups', key(ctx.chatJid, 'blacklist'), list);
      return brandedReply('REMOVED FROM BLACKLIST', [`@${target.split('@')[0]} can now join if they have a valid invite.`]);
    }
  },
  listblacklist: {
    category: 'shadow', hidden: true, usage: '.listblacklist', example: '.listblacklist',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const list = db.get('groups', key(ctx.chatJid, 'blacklist'), []);
      return brandedReply('BLACKLIST', list.length ? list.map((b) => `@${b.jid.split('@')[0]} — ${b.reason}`) : ['Empty.']);
    }
  },

  watchlist: {
    category: 'shadow', hidden: true, usage: '.watchlist (reply/mention) <note>', example: '.watchlist @user keep an eye, borderline behavior',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const note = ctx.args.slice(ctx.mentions.length ? 1 : 0).join(' ') || 'No note';
      if (!target) return usageGuide('watchlist', '.watchlist (reply/mention) <note>', '.watchlist @user borderline behavior');
      const list = db.get('groups', key(ctx.chatJid, 'watchlist'), []);
      if (!list.find((w) => w.jid === target)) list.push({ jid: target, note, time: Date.now() });
      db.set('groups', key(ctx.chatJid, 'watchlist'), list);
      return { text: brandedReply('ADDED TO WATCHLIST', [`@${target.split('@')[0]} is now being watched in this group.`]), mentions: [target] };
    }
  },
  unwatchlist: {
    category: 'shadow', hidden: true, usage: '.unwatchlist (reply/mention)', example: '.unwatchlist @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('unwatchlist', '.unwatchlist (reply/mention)', '.unwatchlist @user');
      const list = db.get('groups', key(ctx.chatJid, 'watchlist'), []).filter(item => normaliseJid(item.jid || item) !== normaliseJid(target));
      db.set('groups', key(ctx.chatJid, 'watchlist'), list);
      return brandedReply('REMOVED FROM WATCHLIST', [`@${target.split('@')[0]} removed from this group’s watchlist.`]);
    }
  },
  listwatchlist: {
    category: 'shadow', hidden: true, usage: '.listwatchlist', example: '.listwatchlist',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const list = db.get('groups', key(ctx.chatJid, 'watchlist'), []);
      return brandedReply('WATCHLIST', list.length ? list.map((w) => `@${w.jid.split('@')[0]} — ${w.note}`) : ['Empty.']);
    }
  },

  threatlevel: {
    category: 'shadow', hidden: true, usage: '.threatlevel (reply/mention)', example: '.threatlevel @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant || ctx.sender;
      const strikes = db.get('modlog', key(ctx.chatJid, `strikes:${target}`), []).length;
      const reports = db.get('modlog', key(ctx.chatJid, `reports:${target}`), []).length;
      const score = strikes * 2 + reports;
      const level = score === 0 ? 'NONE' : score < 3 ? 'LOW' : score < 6 ? 'MEDIUM' : 'HIGH';
      return brandedReply('THREAT LEVEL (this group only)', [`Strikes: ${strikes}, Reports: ${reports}`, `Level: ${level}`]);
    }
  },
  flaguser: {
    category: 'shadow', hidden: true, usage: '.flaguser (reply/mention) <reason>', example: '.flaguser @user suspicious links',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const reason = ctx.args.slice(ctx.mentions.length ? 1 : 0).join(' ') || 'No reason given';
      if (!target) return usageGuide('flaguser', '.flaguser (reply/mention) <reason>', '.flaguser @user suspicious');
      db.set('groups', key(ctx.chatJid, `flag:${target}`), { reason, time: Date.now() });
      return { text: brandedReply('USER FLAGGED', [`@${target.split('@')[0]} flagged in this group.`]), mentions: [target] };
    }
  },
  unflaguser: {
    category: 'shadow', hidden: true, usage: '.unflaguser (reply/mention)', example: '.unflaguser @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('unflaguser', '.unflaguser (reply/mention)', '.unflaguser @user');
      db.del('groups', key(ctx.chatJid, `flag:${target}`));
      return brandedReply('FLAG REMOVED', [`Flag removed for @${target.split('@')[0]}.`]);
    }
  },
  enforce: {
    category: 'shadow', hidden: true, usage: '.enforce', example: '.enforce',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const bans = db.get('banned', ctx.chatJid, []).filter(item => !item.expiresAt || Number(item.expiresAt) > Date.now());
      const blacklist = db.get('groups', key(ctx.chatJid, 'blacklist'), []);
      const watchlist = db.get('groups', key(ctx.chatJid, 'watchlist'), []);
      const flags = Object.keys(db.load('groups')).filter(name => name.startsWith(key(ctx.chatJid, 'flag:')));
      return brandedReply('ENFORCEMENT STATUS', [
        `Bot group-admin: ${ctx.isBotAdmin ? 'YES' : 'NO'}`,
        `Active bans: ${bans.length}`,
        `Blacklist entries: ${blacklist.length}`,
        `Watchlist entries: ${watchlist.length}`,
        `Flagged members: ${flags.length}`,
        'Ban and blacklist removals require bot admin permissions.',
        'Reports, strikes, watchlist and flags are group-local records.'
      ]);
    }
  },
  amnesty: {
    category: 'shadow', hidden: true, usage: '.amnesty (reply/mention)', example: '.amnesty @user',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('amnesty', '.amnesty (reply/mention)', '.amnesty @user');
      db.set('modlog', key(ctx.chatJid, `strikes:${target}`), []);
      db.set('modlog', key(ctx.chatJid, `reports:${target}`), []);
      const banned = db.get('banned', ctx.chatJid, []).filter((b) => b.jid !== target);
      db.set('banned', ctx.chatJid, banned);
      return { text: brandedReply('AMNESTY GRANTED', [`All strikes, reports and bans cleared for @${target.split('@')[0]} in this group.`]), mentions: [target] };
    }
  },

  shadowmenu: {
    category: 'shadow', hidden: true, usage: '.shadowmenu', example: '.shadowmenu',
    async run(ctx) {
      const gate = ownerGateOrReply(ctx); if (gate) return gate;
      const names = Object.keys(commands).sort();
      return brandedReply('SHADOW ENFORCEMENT CENTRE', names.map((n) => `.${n}`));
    }
  }
};

module.exports = commands;
