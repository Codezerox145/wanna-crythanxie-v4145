// commands/bugDiagnostics.js
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');
const { brandedReply } = require('../lib/brand');
const { isGroupAdmin } = require('../lib/permissions');
const { BUG_SIGNATURES } = require('../lib/antibug');

const VERSION = 'v20.1.0';

const commands = {
  version: { category: 'bug', usage: '.version', example: '.version', async run() { return brandedReply('VERSION', [VERSION]); } },
  changelog: {
    category: 'bug', usage: '.changelog', example: '.changelog',
    async run() { return brandedReply('CHANGELOG', [`${VERSION} — rebuilt on a real Baileys framework: branded cards, anti-ban layer, VIP/owner-gated access, defensive antibug pipeline, Gemini AI.`]); }
  },
  checkupdate: { category: 'bug', usage: '.checkupdate', example: '.checkupdate', async run() { return brandedReply('UPDATE CHECK', [`Running ${VERSION}. Compare against your repo\'s latest tag to see if an update is available.`]); } },
  health: {
    category: 'bug', usage: '.health', example: '.health',
    async run(ctx) {
      const checks = [];
      checks.push(`Database files reachable : ${fs.existsSync(path.join(__dirname, '..', 'data')) ? 'OK' : 'MISSING'}`);
      checks.push(`Gemini key configured    : ${process.env.GEMINI_API_KEY ? 'OK' : 'MISSING'}`);
      checks.push(`Owner configured         : ${process.env.OWNER_NUMBERS ? 'OK' : 'MISSING'}`);
      checks.push(`Socket connected         : ${ctx.sock?.user ? 'OK' : 'NOT CONNECTED'}`);
      return brandedReply('HEALTH CHECK', checks);
    }
  },
  selftest: {
    category: 'bug', usage: '.selftest', example: '.selftest',
    async run(ctx) {
      const results = [];
      try { db.set('settings', '__selftest', Date.now()); results.push('Database write : OK'); } catch (e) { results.push(`Database write : FAILED (${e.message})`); }
      try { require('../lib/brand').brandedReply('x', ['y']); results.push('Branding engine : OK'); } catch (e) { results.push(`Branding engine : FAILED`); }
      results.push(`Antibug signatures loaded : ${BUG_SIGNATURES.length}`);
      return brandedReply('SELF TEST', results);
    }
  },
  debug: {
    category: 'bug', usage: '.debug', example: '.debug',
    async run(ctx) { return brandedReply('DEBUG INFO', [`Node: ${process.version}`, `Platform: ${process.platform}`, `Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`]); }
  },
  errorlog: {
    category: 'bug', usage: '.errorlog', example: '.errorlog',
    async run() {
      const log = db.get('settings', 'errorlog', []);
      if (!log.length) return brandedReply('ERROR LOG', ['No errors logged.']);
      return brandedReply('ERROR LOG', log.slice(-10).map((e) => `${new Date(e.time).toLocaleString()} — ${e.message}`));
    }
  },
  clearerrors: {
    category: 'bug', usage: '.clearerrors', example: '.clearerrors',
    async run() { db.set('settings', 'errorlog', []); return brandedReply('ERROR LOG CLEARED', ['Done.']); }
  },
  checkperms: {
    category: 'bug', usage: '.checkperms', example: '.checkperms',
    async run(ctx) {
      if (!ctx.isGroup) return brandedReply('CHECK PERMS', ['This only applies inside a group.']);
      const botIsAdmin = isGroupAdmin(ctx.participants, ctx.botJid);
      return brandedReply('PERMISSION CHECK', [`Bot is admin here: ${botIsAdmin ? 'YES' : 'NO — promote the bot for full functionality.'}`]);
    }
  },
  checkadmin: {
    category: 'bug', usage: '.checkadmin', example: '.checkadmin',
    async run(ctx) {
      const isAdmin = ctx.isGroup && isGroupAdmin(ctx.participants, ctx.sender);
      return brandedReply('ADMIN CHECK', [`You are ${isAdmin ? '' : 'NOT '}an admin in this group.`]);
    }
  },
  apistatus: {
    category: 'bug', usage: '.apistatus', example: '.apistatus',
    async run() { return brandedReply('API STATUS', [`Gemini key present: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`]); }
  },
  dbcheck: {
    category: 'bug', usage: '.dbcheck', example: '.dbcheck',
    async run() {
      const files = fs.readdirSync(path.join(__dirname, '..', 'data'));
      return brandedReply('DB CHECK', [`${files.length} data file(s) present: ${files.join(', ')}`]);
    }
  },
  memcheck: {
    category: 'bug', usage: '.memcheck', example: '.memcheck',
    async run() { return brandedReply('MEMORY', [`RSS: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`, `Heap used: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`]); }
  },
  sessioncheck: {
    category: 'bug', usage: '.sessioncheck', example: '.sessioncheck',
    async run(ctx) { return brandedReply('SESSION CHECK', [`Connected as: ${ctx.sock?.user?.id || 'unknown'}`]); }
  },
  reportbug: {
    category: 'bug', usage: '.reportbug <description>', example: '.reportbug sticker command crashes on gifs',
    async run(ctx) {
      const text = ctx.args.join(' ');
      if (!text) return brandedReply('HOW TO USE .reportbug', ['.reportbug <description>']);
      db.push('threatlog', 'bugreports', { from: ctx.sender, text, time: Date.now() }, 1000);
      return brandedReply('BUG REPORTED', ['Thanks — logged for the owner to review.']);
    }
  },
  bugscan: {
    category: 'bug', usage: '.bugscan (reply to a message)', example: '.bugscan',
    async run(ctx) {
      const { scanMessage } = require('../lib/antibug');
      const text = ctx.quotedText || '';
      const result = scanMessage(text, []);
      return brandedReply('BUG SCAN RESULT', [result ? `Threat detected: ${result}` : 'Clean — no known attack signature matched.']);
    }
  },
  buglog: {
    category: 'bug', usage: '.buglog', example: '.buglog',
    async run() {
      const log = db.get('threatlog', 'entries', []);
      if (!log.length) return brandedReply('THREAT LOG', ['No threats logged.']);
      return brandedReply('THREAT LOG', log.slice(-10).map((e) => `${new Date(e.time).toLocaleString()} — ${e.signature} (@${(e.sender||'?').split('@')[0]})`));
    }
  }
};

module.exports = commands;
