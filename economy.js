// commands/economy.js
const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');

function getWallet(jid) {
  return db.get('users', `${jid}:wallet`, { balance: 100, lastDaily: 0, lastWork: 0 });
}
function setWallet(jid, w) {
  db.set('users', `${jid}:wallet`, w);
}

const commands = {
  balance: {
    category: 'economy', usage: '.balance', example: '.balance',
    async run(ctx) { const w = getWallet(ctx.sender); return brandedReply('WALLET BALANCE', [`$${w.balance}`]); }
  },
  wallet: {
    category: 'economy', usage: '.wallet', example: '.wallet',
    async run(ctx) { const w = getWallet(ctx.sender); return brandedReply('WALLET', [`Balance: $${w.balance}`]); }
  },
  daily: {
    category: 'economy', usage: '.daily', example: '.daily',
    async run(ctx) {
      const w = getWallet(ctx.sender);
      const now = Date.now();
      if (now - w.lastDaily < 86_400_000) {
        const remaining = 86_400_000 - (now - w.lastDaily);
        return brandedReply('DAILY ALREADY CLAIMED', [`Come back in ${Math.ceil(remaining / 3_600_000)}h.`]);
      }
      w.balance += 50;
      w.lastDaily = now;
      setWallet(ctx.sender, w);
      return brandedReply('DAILY REWARD', [`+$50! New balance: $${w.balance}`]);
    }
  },
  work: {
    category: 'economy', usage: '.work', example: '.work',
    async run(ctx) {
      const w = getWallet(ctx.sender);
      const now = Date.now();
      if (now - w.lastWork < 3_600_000) return brandedReply('STILL TIRED', ['You can work again in a bit — once per hour.']);
      const earned = 10 + Math.floor(Math.random() * 30);
      w.balance += earned;
      w.lastWork = now;
      setWallet(ctx.sender, w);
      return brandedReply('WORK COMPLETE', [`You earned $${earned}. New balance: $${w.balance}`]);
    }
  },
  transfer: {
    category: 'economy', usage: '.transfer @user <amount>', example: '.transfer @user 20',
    async run(ctx) {
      const target = ctx.mentions[0];
      const amount = parseInt(ctx.args[1] || ctx.args[0], 10);
      if (!target || !amount || amount <= 0) return usageGuide('transfer', '.transfer @user <amount>', '.transfer @user 20');
      const sender = getWallet(ctx.sender);
      if (sender.balance < amount) return brandedReply('INSUFFICIENT FUNDS', [`You only have $${sender.balance}.`]);
      sender.balance -= amount;
      setWallet(ctx.sender, sender);
      const recv = getWallet(target);
      recv.balance += amount;
      setWallet(target, recv);
      return { text: brandedReply('TRANSFER COMPLETE', [`Sent $${amount} to @${target.split('@')[0]}.`]), mentions: [target] };
    }
  },
  deposit: {
    category: 'economy', usage: '.deposit <amount>', example: '.deposit 50',
    async run(ctx) {
      const amount = parseInt(ctx.args[0], 10);
      if (!amount) return usageGuide('deposit', '.deposit <amount>', '.deposit 50');
      const w = getWallet(ctx.sender);
      if (w.balance < amount) return brandedReply('INSUFFICIENT FUNDS', [`You only have $${w.balance}.`]);
      w.balance -= amount;
      w.bank = (w.bank || 0) + amount;
      setWallet(ctx.sender, w);
      return brandedReply('DEPOSITED', [`$${amount} moved to savings. Wallet: $${w.balance}, Bank: $${w.bank}`]);
    }
  },
  shop: {
    category: 'economy', usage: '.shop', example: '.shop',
    async run() {
      return brandedReply('SHOP', ['1. VIP Badge — $500', '2. Custom Title — $300', '3. Lucky Charm — $150', 'Use .buy <item number>']);
    }
  },
  buy: {
    category: 'economy', usage: '.buy <item number>', example: '.buy 1',
    async run(ctx) {
      const prices = { 1: 500, 2: 300, 3: 150 };
      const item = ctx.args[0];
      if (!prices[item]) return usageGuide('buy', '.buy <item number>', '.buy 1');
      const w = getWallet(ctx.sender);
      if (w.balance < prices[item]) return brandedReply('INSUFFICIENT FUNDS', [`You need $${prices[item]}, you have $${w.balance}.`]);
      w.balance -= prices[item];
      setWallet(ctx.sender, w);
      return brandedReply('PURCHASE COMPLETE', [`Item ${item} purchased. Balance: $${w.balance}`]);
    }
  },
  sell: {
    category: 'economy', usage: '.sell <item number>', example: '.sell 1',
    async run(ctx) {
      return brandedReply('SELL', ['Inventory/sell system placeholder — wire to a real item table if needed.']);
    }
  },
  leaderboard: {
    category: 'economy', usage: '.leaderboard', example: '.leaderboard',
    async run() {
      const users = db.get('users', undefined, {});
      const wallets = Object.entries(users)
        .filter(([k]) => k.endsWith(':wallet'))
        .map(([k, v]) => ({ jid: k.replace(':wallet', ''), balance: v.balance }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);
      if (!wallets.length) return brandedReply('LEADERBOARD', ['No data yet.']);
      const lines = wallets.map((w, i) => `${i + 1}. @${w.jid.split('@')[0]} — $${w.balance}`);
      return { text: brandedReply('LEADERBOARD', lines), mentions: wallets.map((w) => w.jid) };
    }
  }
};

module.exports = commands;
