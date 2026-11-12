// commands/profileCommunity.js
const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');

function getProfile(jid) {
  return db.get('users', `${jid}:profile`, { xp: 0, bio: '', reputation: 0 });
}
function setProfile(jid, p) { db.set('users', `${jid}:profile`, p); }
function levelFromXp(xp) { return Math.floor(xp / 100) + 1; }

const commands = {
  profile: {
    category: 'profile', usage: '.profile', example: '.profile',
    async run(ctx) {
      const p = getProfile(ctx.sender);
      return brandedReply('PROFILE', [
        `User  : @${ctx.sender.split('@')[0]}`,
        `Level : ${levelFromXp(p.xp)}`,
        `XP    : ${p.xp}`,
        `Rep   : ${p.reputation}`,
        `Bio   : ${p.bio || 'not set'}`
      ]);
    }
  },
  rank: {
    category: 'profile', usage: '.rank', example: '.rank',
    async run(ctx) { const p = getProfile(ctx.sender); return brandedReply('RANK', [`Level ${levelFromXp(p.xp)} (${p.xp} XP)`]); }
  },
  level: {
    category: 'profile', usage: '.level', example: '.level',
    async run(ctx) { const p = getProfile(ctx.sender); return brandedReply('LEVEL', [`${levelFromXp(p.xp)}`]); }
  },
  xp: {
    category: 'profile', usage: '.xp', example: '.xp',
    async run(ctx) { const p = getProfile(ctx.sender); return brandedReply('XP', [`${p.xp} XP`]); }
  },
  bio: {
    category: 'profile', usage: '.bio', example: '.bio',
    async run(ctx) { const p = getProfile(ctx.sender); return brandedReply('BIO', [p.bio || 'Not set — use .setbio <text>']); }
  },
  setbio: {
    category: 'profile', usage: '.setbio <text>', example: '.setbio coffee addict',
    async run(ctx) {
      const text = ctx.args.join(' ');
      if (!text) return usageGuide('setbio', '.setbio <text>', '.setbio coffee addict');
      const p = getProfile(ctx.sender);
      p.bio = text;
      setProfile(ctx.sender, p);
      return brandedReply('BIO UPDATED', [text]);
    }
  },
  badge: {
    category: 'profile', usage: '.badge', example: '.badge',
    async run(ctx) {
      const p = getProfile(ctx.sender);
      const badges = [];
      if (p.xp >= 500) badges.push('🏆 Veteran');
      if (p.reputation >= 10) badges.push('🌟 Well-liked');
      return brandedReply('BADGES', badges.length ? badges : ['No badges yet — stay active!']);
    }
  },
  reputation: {
    category: 'profile', usage: '.reputation', example: '.reputation',
    async run(ctx) { const p = getProfile(ctx.sender); return brandedReply('REPUTATION', [`${p.reputation} points`]); }
  },
  rep: {
    category: 'profile', usage: '.rep (reply/mention)', example: '.rep @user',
    async run(ctx) {
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('rep', '.rep (reply/mention)', '.rep @user');
      const p = getProfile(target);
      p.reputation += 1;
      setProfile(target, p);
      return { text: brandedReply('REPUTATION +1', [`@${target.split('@')[0]} now has ${p.reputation} reputation.`]), mentions: [target] };
    }
  },
  thanks: {
    category: 'profile', usage: '.thanks (reply/mention)', example: '.thanks @user',
    async run(ctx) {
      const target = ctx.mentions[0] || ctx.quotedParticipant;
      if (!target) return usageGuide('thanks', '.thanks (reply/mention)', '.thanks @user');
      const p = getProfile(target);
      p.reputation += 1;
      setProfile(target, p);
      return { text: brandedReply('THANKS SENT', [`@${target.split('@')[0]} was thanked!`]), mentions: [target] };
    }
  },
  inventory: {
    category: 'profile', usage: '.inventory', example: '.inventory',
    async run() { return brandedReply('INVENTORY', ['Empty — purchase items with .shop and .buy.']); }
  },
  achievements: {
    category: 'profile', usage: '.achievements', example: '.achievements',
    async run(ctx) {
      const p = getProfile(ctx.sender);
      return brandedReply('ACHIEVEMENTS', [`XP milestones reached: ${Math.floor(p.xp / 100)}`]);
    }
  },
  badges: {
    category: 'profile', usage: '.badges', example: '.badges',
    async run(ctx) { const p = getProfile(ctx.sender); return brandedReply('BADGES', [p.xp >= 500 ? '🏆 Veteran' : 'No badges yet.']); }
  },
  xpleaderboard: {
    category: 'profile', usage: '.xpleaderboard', example: '.xpleaderboard',
    async run() {
      const users = db.get('users', undefined, {});
      const ranked = Object.entries(users)
        .filter(([k]) => k.endsWith(':profile'))
        .map(([k, v]) => ({ jid: k.replace(':profile', ''), xp: v.xp }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10);
      if (!ranked.length) return brandedReply('XP LEADERBOARD', ['No data yet.']);
      return { text: brandedReply('XP LEADERBOARD', ranked.map((r, i) => `${i + 1}. @${r.jid.split('@')[0]} — ${r.xp} XP`)), mentions: ranked.map((r) => r.jid) };
    }
  },
  weeklywinner: {
    category: 'profile', usage: '.weeklywinner', example: '.weeklywinner',
    async run() {
      const users = db.get('users', undefined, {});
      const ranked = Object.entries(users)
        .filter(([k]) => k.endsWith(':profile'))
        .map(([k, v]) => ({ jid: k.replace(':profile', ''), rep: v.reputation }))
        .sort((a, b) => b.rep - a.rep);
      if (!ranked.length || !ranked[0].rep) return brandedReply('WEEKLY WINNER', ['Not enough activity yet this week.']);
      return { text: brandedReply('WEEKLY WINNER', [`@${ranked[0].jid.split('@')[0]} with ${ranked[0].rep} reputation points!`]), mentions: [ranked[0].jid] };
    }
  },
  dailyreward: {
    category: 'profile', usage: '.dailyreward', example: '.dailyreward',
    async run(ctx) {
      const p = getProfile(ctx.sender);
      p.xp += 10;
      setProfile(ctx.sender, p);
      return brandedReply('DAILY XP REWARD', [`+10 XP! Total: ${p.xp} XP (Level ${levelFromXp(p.xp)})`]);
    }
  }
};

module.exports = commands;
