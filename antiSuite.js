// commands/antiSuite.js
// These commands TOGGLE settings that lib/filters.js reads on every incoming
// group message (see index.js wiring). Real enforcement, not cosmetic flags.

const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');
const { isGroupAdmin } = require('../lib/permissions');

async function requireAdmin(ctx) {
  if (!ctx.isGroup) return 'This command only works inside a group.';
  if (!isGroupAdmin(ctx.participants, ctx.sender) && !ctx.isOwner) return 'Only group admins can use this.';
  return null;
}

function toggleFactory(flagName, label) {
  return {
    category: 'anti',
    usage: `.${flagName} on|off`,
    example: `.${flagName} on`,
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const arg = (ctx.args[0] || '').toLowerCase();
      if (arg !== 'on' && arg !== 'off') return usageGuide(flagName, `.${flagName} on|off`, `.${flagName} on`);
      db.set('groups', `${ctx.chatJid}:${flagName}`, arg === 'on');
      return brandedReply(label.toUpperCase(), [`${label} is now ${arg.toUpperCase()}.`]);
    }
  };
}

const commands = {
  antilink: toggleFactory('antilink', 'Anti-Link'),
  antispam: toggleFactory('antispam', 'Anti-Spam'),
  antibadword: toggleFactory('antibadword', 'Anti-Badword'),
  antiforward: toggleFactory('antiforward', 'Anti-Forward'),
  antiviewonce: toggleFactory('antiviewonce', 'Anti-ViewOnce'),
  antimedia: toggleFactory('antimedia', 'Anti-Media'),
  antisticker: toggleFactory('antisticker', 'Anti-Sticker'),
  antilongtext: toggleFactory('antilongtext', 'Anti-Longtext'),
  antimention: toggleFactory('antimention', 'Anti-Mention'),
  antiinvite: toggleFactory('antiinvite', 'Anti-Invite'),
  antivoice: toggleFactory('antivoice', 'Anti-Voice'),
  antidocument: toggleFactory('antidocument', 'Anti-Document'),
  anticontact: toggleFactory('anticontact', 'Anti-Contact'),
  antilocation: toggleFactory('antilocation', 'Anti-Location'),
  anticaps: toggleFactory('anticaps', 'Anti-Caps'),
  antitagall: toggleFactory('antitagall', 'Anti-Tagall'),
  antipromote: toggleFactory('antipromote', 'Anti-Promote-Abuse'),
  antidemote: toggleFactory('antidemote', 'Anti-Demote-Abuse'),
  antidelete: toggleFactory('antidelete', 'Anti-Delete (logs deleted msgs)'),

  setwarnlimit: {
    category: 'anti', usage: '.setwarnlimit <number>', example: '.setwarnlimit 3',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const n = parseInt(ctx.args[0], 10);
      if (!n || n < 1) return usageGuide('setwarnlimit', '.setwarnlimit <number>', '.setwarnlimit 3');
      db.set('settings', `warnlimit:${ctx.chatJid}`, n);
      return brandedReply('WARN LIMIT SET', [`Users are removed after ${n} warning(s).`]);
    }
  },
  addbadword: {
    category: 'anti', usage: '.addbadword <word>', example: '.addbadword badword',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const word = (ctx.args[0] || '').toLowerCase();
      if (!word) return usageGuide('addbadword', '.addbadword <word>', '.addbadword spamword');
      const list = db.get('groups', `${ctx.chatJid}:badwords`, []);
      if (!list.includes(word)) list.push(word);
      db.set('groups', `${ctx.chatJid}:badwords`, list);
      return brandedReply('BADWORD ADDED', [`"${word}" added to the filter list (${list.length} total).`]);
    }
  },
  delbadword: {
    category: 'anti', usage: '.delbadword <word>', example: '.delbadword spamword',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const word = (ctx.args[0] || '').toLowerCase();
      const list = db.get('groups', `${ctx.chatJid}:badwords`, []).filter((w) => w !== word);
      db.set('groups', `${ctx.chatJid}:badwords`, list);
      return brandedReply('BADWORD REMOVED', [`"${word}" removed (${list.length} remaining).`]);
    }
  },
  listbadword: {
    category: 'anti', usage: '.listbadword', example: '.listbadword',
    async run(ctx) {
      const list = db.get('groups', `${ctx.chatJid}:badwords`, []);
      return brandedReply('BADWORD LIST', list.length ? list : ['No badwords configured.']);
    }
  },
  whitelist: {
    category: 'anti', usage: '.whitelist (reply/mention)', example: '.whitelist @user',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('whitelist', '.whitelist (reply/mention)', '.whitelist @user');
      const list = db.get('groups', `${ctx.chatJid}:whitelist`, []);
      if (!list.includes(target)) list.push(target);
      db.set('groups', `${ctx.chatJid}:whitelist`, list);
      return brandedReply('WHITELISTED', [`@${target.split('@')[0]} is now exempt from anti-filters.`]);
    }
  },
  unwhitelist: {
    category: 'anti', usage: '.unwhitelist (reply/mention)', example: '.unwhitelist @user',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      const list = db.get('groups', `${ctx.chatJid}:whitelist`, []).filter((j) => j !== target);
      db.set('groups', `${ctx.chatJid}:whitelist`, list);
      return brandedReply('WHITELIST REMOVED', ['Updated.']);
    }
  },
  listwhitelist: {
    category: 'anti', usage: '.listwhitelist', example: '.listwhitelist',
    async run(ctx) {
      const list = db.get('groups', `${ctx.chatJid}:whitelist`, []);
      return { text: brandedReply('WHITELIST', list.length ? list.map((j) => `@${j.split('@')[0]}`) : ['Empty.']), mentions: list };
    }
  },
  antiaction: {
    category: 'anti', usage: '.antiaction warn|kick|mute', example: '.antiaction kick',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const action = (ctx.args[0] || '').toLowerCase();
      if (!['warn', 'kick', 'mute'].includes(action)) return usageGuide('antiaction', '.antiaction warn|kick|mute', '.antiaction kick');
      db.set('groups', `${ctx.chatJid}:antiaction`, action);
      return brandedReply('ANTI-ACTION SET', [`Violations will now trigger: ${action}.`]);
    }
  },
  antipreset: {
    category: 'anti', usage: '.antipreset strict|normal|off', example: '.antipreset strict',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const preset = (ctx.args[0] || '').toLowerCase();
      const presets = {
        strict: ['antilink', 'antispam', 'antibadword', 'antiinvite', 'antimention', 'anticaps'],
        normal: ['antilink', 'antispam'],
        off: []
      };
      if (!presets[preset]) return usageGuide('antipreset', '.antipreset strict|normal|off', '.antipreset strict');
      ['antilink', 'antispam', 'antibadword', 'antiinvite', 'antimention', 'anticaps'].forEach((f) =>
        db.set('groups', `${ctx.chatJid}:${f}`, presets[preset].includes(f))
      );
      return brandedReply('ANTI-PRESET APPLIED', [`Preset "${preset}" applied.`]);
    }
  },
  antireset: {
    category: 'anti', usage: '.antireset', example: '.antireset',
    async run(ctx) {
      const err = await requireAdmin(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const flags = ['antilink','antispam','antibadword','antiforward','antiviewonce','antimedia','antisticker','antilongtext','antimention','antiinvite','antivoice','antidocument','anticontact','antilocation','anticaps'];
      flags.forEach((f) => db.set('groups', `${ctx.chatJid}:${f}`, false));
      return brandedReply('ANTI-SUITE RESET', ['All anti-filters turned OFF for this group.']);
    }
  },
  antisecmenu: {
    category: 'anti', usage: '.antisecmenu', example: '.antisecmenu',
    async run(ctx) {
      const flags = ['antilink','antispam','antibadword','antiforward','antiviewonce','antimedia','antisticker','antilongtext','antimention','antiinvite','antivoice','antidocument','anticontact','antilocation','anticaps','antidelete','antitagall','antipromote','antidemote'];
      const lines = flags.map((f) => `${f} : ${db.get('groups', `${ctx.chatJid}:${f}`, false) ? 'ON' : 'OFF'}`);
      return brandedReply('ANTI-SUITE STATUS', lines);
    }
  }
};

module.exports = commands;
