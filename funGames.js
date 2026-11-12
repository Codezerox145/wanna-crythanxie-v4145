// commands/funGames.js
const { brandedReply, usageGuide } = require('../lib/brand');

const TRUTHS = [
  "What's the most embarrassing thing you've done in public?",
  "What's a secret you've never told your best friend?",
  "What's your biggest fear?",
  "What's the worst lie you've ever told?",
  "Who was your first crush?"
];
const DARES = [
  'Send a voice note singing the chorus of your favorite song.',
  'Text your crush "I have something to tell you" (just kidding, don\'t!)',
  'Change your profile picture to something silly for 1 hour.',
  'Type your next 3 messages in all caps.',
  'Send the 5th photo in your gallery.'
];
const RIDDLES = [
  { q: 'What has keys but opens no locks?', a: 'A piano' },
  { q: 'What gets wetter the more it dries?', a: 'A towel' },
  { q: 'What has a head and a tail but no body?', a: 'A coin' },
  { q: 'The more you take, the more you leave behind. What am I?', a: 'Footsteps' }
];
const EIGHTBALL = ['Yes, definitely.', 'Ask again later.', 'Very doubtful.', 'Without a doubt.', 'My sources say no.', 'Most likely.', 'Cannot predict now.'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const commands = {
  truth: { category: 'fun', usage: '.truth', example: '.truth', async run() { return brandedReply('TRUTH', [pick(TRUTHS)]); } },
  dare: { category: 'fun', usage: '.dare', example: '.dare', async run() { return brandedReply('DARE', [pick(DARES)]); } },
  riddle: {
    category: 'fun', usage: '.riddle', example: '.riddle',
    async run() { const r = pick(RIDDLES); return brandedReply('RIDDLE', [r.q, '', '(reply with your guess, or .riddle again for a new one)']); }
  },
  '8ball': {
    category: 'fun', usage: '.8ball <question>', example: '.8ball will it rain today?',
    async run(ctx) {
      if (!ctx.args.length) return usageGuide('8ball', '.8ball <question>', '.8ball will it rain today?');
      return brandedReply('MAGIC 8-BALL', [pick(EIGHTBALL)]);
    }
  },
  dice: {
    category: 'fun', usage: '.dice', example: '.dice',
    async run() { return brandedReply('DICE ROLL', [`You rolled a ${1 + Math.floor(Math.random() * 6)}!`]); }
  },
  guess: {
    category: 'fun', usage: '.guess <1-10>', example: '.guess 7',
    async run(ctx) {
      const n = parseInt(ctx.args[0], 10);
      if (!n || n < 1 || n > 10) return usageGuide('guess', '.guess <number 1-10>', '.guess 7');
      const answer = 1 + Math.floor(Math.random() * 10);
      return brandedReply('GUESS THE NUMBER', [n === answer ? `Correct! It was ${answer}.` : `Wrong, it was ${answer}. Try again!`]);
    }
  },
  ship: {
    category: 'fun', usage: '.ship @user1 @user2', example: '.ship @a @b',
    async run(ctx) {
      if (ctx.mentions.length < 2) return usageGuide('ship', '.ship @user1 @user2', '.ship @alice @bob');
      const pct = Math.floor(Math.random() * 101);
      return { text: brandedReply('SHIP RESULT', [`@${ctx.mentions[0].split('@')[0]} + @${ctx.mentions[1].split('@')[0]} = ${pct}% compatible!`]), mentions: ctx.mentions.slice(0, 2) };
    }
  },
  slot: {
    category: 'fun', usage: '.slot', example: '.slot',
    async run() {
      const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
      const roll = [pick(symbols), pick(symbols), pick(symbols)];
      const win = roll[0] === roll[1] && roll[1] === roll[2];
      return brandedReply('SLOT MACHINE', [roll.join(' | '), win ? 'JACKPOT! 🎉' : 'No match — try again!']);
    }
  },
  tictactoe: {
    category: 'fun', usage: '.tictactoe @opponent', example: '.tictactoe @user',
    async run(ctx) {
      if (!ctx.mentions.length) return usageGuide('tictactoe', '.tictactoe @opponent', '.tictactoe @user');
      return brandedReply('TIC-TAC-TOE', [`@${ctx.sender.split('@')[0]} challenged @${ctx.mentions[0].split('@')[0]}!`, 'Full turn-based board state isn\'t wired up in this build — this starts the challenge card only.']);
    }
  }
};

module.exports = commands;
