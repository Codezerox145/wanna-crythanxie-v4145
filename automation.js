// commands/automation.js
const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');

function requireOwner(ctx) {
  return ctx.isOwner ? null : 'This command is restricted to the bot owner.';
}

function toggleFactory(flag, label) {
  return {
    category: 'automation', usage: `.${flag} on|off`, example: `.${flag} on`,
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const v = (ctx.args[0] || '').toLowerCase();
      if (!['on', 'off'].includes(v)) return usageGuide(flag, `.${flag} on|off`, `.${flag} on`);
      db.set('settings', flag, v === 'on');
      return brandedReply(label.toUpperCase(), [`${label} is now ${v.toUpperCase()}.`]);
    }
  };
}

const commands = {
  autoread: toggleFactory('autoread', 'Auto-Read'),
  autotyping: toggleFactory('autotyping', 'Auto-Typing'),
  autorecord: toggleFactory('autorecord', 'Auto-Record'),
  alwaysonline: toggleFactory('alwaysonline', 'Always Online'),
  autoviewstatus: toggleFactory('autoviewstatus', 'Auto-View Status'),
  autoreactstatus: toggleFactory('autoreactstatus', 'Auto-React Status'),
  autobio: toggleFactory('autobio', 'Auto-Bio Rotation'),
  autorestart: toggleFactory('autorestart', 'Auto-Restart on crash'),
  autobackup: toggleFactory('autobackup', 'Auto-Backup'),
  pmblocker: toggleFactory('pmblocker', 'PM Blocker (non-owner DMs ignored)'),

  autoreact: {
    category: 'automation', usage: '.autoreact on|off [emoji]', example: '.autoreact on 🔥',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const v = (ctx.args[0] || '').toLowerCase();
      if (!['on', 'off'].includes(v)) return usageGuide('autoreact', '.autoreact on|off [emoji]', '.autoreact on 🔥');
      db.set('settings', 'autoreact', v === 'on');
      if (ctx.args[1]) db.set('settings', 'autoreactEmoji', ctx.args[1]);
      return brandedReply('AUTO-REACT', [`Auto-react is now ${v.toUpperCase()}.`]);
    }
  },
  autoreply: {
    category: 'automation', usage: '.autoreply on|off <text>', example: '.autoreply on Thanks, I will reply soon!',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const v = (ctx.args[0] || '').toLowerCase();
      if (!['on', 'off'].includes(v)) return usageGuide('autoreply', '.autoreply on|off <text>', '.autoreply on Thanks!');
      db.set('settings', 'autoreply', v === 'on');
      if (ctx.args.slice(1).join(' ')) db.set('settings', 'autoreplyText', ctx.args.slice(1).join(' '));
      return brandedReply('AUTO-REPLY', [`Auto-reply is now ${v.toUpperCase()}.`]);
    }
  },
  autoblock: {
    category: 'automation', usage: '.autoblock on|off', example: '.autoblock on',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const v = (ctx.args[0] || '').toLowerCase();
      db.set('settings', 'autoblock', v === 'on');
      return brandedReply('AUTO-BLOCK', [`Auto-block (of flagged numbers) is now ${v.toUpperCase()}.`]);
    }
  },
  autoclear: {
    category: 'automation', usage: '.autoclear on|off', example: '.autoclear on',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const v = (ctx.args[0] || '').toLowerCase();
      db.set('settings', 'autoclear', v === 'on');
      return brandedReply('AUTO-CLEAR', [`Scheduled temp-file cleanup is now ${v.toUpperCase()}.`]);
    }
  },
  setlang: {
    category: 'automation', usage: '.setlang <code>', example: '.setlang en',
    async run(ctx) {
      const err = requireOwner(ctx);
      if (err) return brandedReply('ACCESS DENIED', [err]);
      const lang = ctx.args[0];
      if (!lang) return usageGuide('setlang', '.setlang <code>', '.setlang en');
      db.set('settings', 'lang', lang);
      return brandedReply('LANGUAGE SET', [`Bot language set to "${lang}". (Replies are currently English-only; this flag is read by .translate default target.)`]);
    }
  }
};

module.exports = commands;
