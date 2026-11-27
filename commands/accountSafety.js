// Account Safety commands. Each command operates only on the WhatsApp
// account that owns the current Baileys session.
const safety = require('../server/safety');
const { brandedReply } = require('../lib/brand');

function snapshot(ctx) {
  if (!ctx.accountId) throw new Error('Account identity is unavailable for this WhatsApp session.');
  return safety.accountSnapshot(ctx.accountId);
}
function stateLabel(value) { return value ? 'PAUSED' : 'ACTIVE'; }
function duration(ms) {
  const seconds = Math.max(1, Math.round(Number(ms || 0) / 1000));
  return seconds + ' second' + (seconds === 1 ? '' : 's');
}
function pausedLines(data) {
  return [
    'Global pause       : ' + (data.global_paused ? 'ON' : 'OFF'),
    'Your account       : ' + stateLabel(data.account_paused),
    'Active sessions    : ' + data.active_sessions,
    'Automatic pauses  : ' + (data.automatic_pauses?.length || 0)
  ];
}

const commands = {
  antiban: {
    category: 'anti', usage: '.antiban', example: '.antiban',
    async run(ctx) {
      const data = snapshot(ctx);
      return brandedReply('ACCOUNT SAFETY', [
        ...pausedLines(data),
        'Minimum interval   : ' + duration(data.settings.min_interval_ms),
        'Maximum per minute : ' + data.settings.max_per_minute,
        'Duplicate blocking : ON',
        'Repeated-error pause: ' + (data.settings.pause_on_repeated_errors ? 'ON' : 'OFF'),
        'These safeguards reduce accidental bursts; no tool can guarantee immunity from WhatsApp restrictions.'
      ]);
    }
  },
  accounthealth: {
    category: 'anti', usage: '.accounthealth', example: '.accounthealth',
    async run(ctx) {
      const data = snapshot(ctx);
      const stats = data.stats || {};
      return brandedReply('ACCOUNT HEALTH', [
        ...pausedLines(data),
        'Messages accepted  : ' + (stats.sent || 0),
        'Messages blocked   : ' + (stats.blocked || 0),
        'Send failures      : ' + (stats.failed || 0),
        'Automatic pauses   : ' + (stats.auto_pauses || 0)
      ]);
    }
  },
  sendlimits: {
    category: 'anti', usage: '.sendlimits', example: '.sendlimits',
    async run(ctx) {
      const data = snapshot(ctx);
      return brandedReply('YOUR SENDING LIMITS', [
        'Minimum interval    : ' + duration(data.settings.min_interval_ms),
        'Maximum per minute  : ' + data.settings.max_per_minute,
        'Duplicate window    : ' + duration(data.settings.duplicate_window_ms),
        'Queue capacity      : ' + data.settings.max_queue,
        'Failure auto-pause  : ' + (data.settings.pause_on_repeated_errors ? 'ENABLED' : 'DISABLED'),
        'Change the interval with .ratelimit <seconds> [messages-per-minute].'
      ]);
    }
  },
  ratelimit: {
    category: 'anti', usage: '.ratelimit <seconds> [messages-per-minute]', example: '.ratelimit 4 10',
    async run(ctx) {
      const data = snapshot(ctx);
      if (!ctx.args?.length) return brandedReply('RATE LIMIT', [
        'Current interval: ' + duration(data.settings.min_interval_ms),
        'Current per-minute cap: ' + data.settings.max_per_minute,
        'Usage: .ratelimit <2-15 seconds> [4-20 messages per minute]'
      ]);
      const seconds = Number(ctx.args[0]);
      const perMinute = ctx.args[1] === undefined ? data.settings.max_per_minute : Number(ctx.args[1]);
      if (!Number.isFinite(seconds) || seconds < 2 || seconds > 15 || !Number.isInteger(perMinute) || perMinute < 4 || perMinute > 20) {
        return brandedReply('INVALID RATE LIMIT', ['Use .ratelimit <2-15 seconds> [4-20 messages per minute].']);
      }
      safety.updateAccountSettings(ctx.accountId, { minIntervalMs: Math.round(seconds * 1000), maxPerMinute: perMinute });
      const updated = snapshot(ctx);
      return brandedReply('RATE LIMIT UPDATED', [
        'Minimum interval: ' + duration(updated.settings.min_interval_ms),
        'Maximum per minute: ' + updated.settings.max_per_minute,
        'These settings apply to your connected WhatsApp sessions.'
      ]);
    }
  },
  spamguard: {
    category: 'anti', usage: '.spamguard', example: '.spamguard',
    async run(ctx) {
      const data = snapshot(ctx);
      return brandedReply('SPAM GUARD', [
        'Outbound queue       : ENABLED',
        'Duplicate detection  : ENABLED',
        'Per-minute limit     : ' + data.settings.max_per_minute,
        'Repeated-error pause : ' + (data.settings.pause_on_repeated_errors ? 'ENABLED' : 'DISABLED'),
        'Unsolicited bulk messaging is not supported. Message recipients must have opted in.'
      ]);
    }
  },
  safetypause: {
    category: 'anti', usage: '.safetypause', example: '.safetypause',
    async run(ctx) {
      snapshot(ctx);
      return {
        text: brandedReply('ACCOUNT SAFETY PAUSED', [
          'Automated outbound messages are now paused for all sessions under your account.',
          'Use .safetyresume when you are ready to resume.'
        ]),
        afterSend: () => safety.setAccountPaused(ctx.accountId, true)
      };
    }
  },
  safetyresume: {
    category: 'anti', usage: '.safetyresume', example: '.safetyresume',
    async run(ctx) {
      const data = snapshot(ctx);
      safety.setAccountPaused(ctx.accountId, false);
      return brandedReply('ACCOUNT SAFETY RESUMED', [
        data.global_paused ? 'Your account pause is cleared, but the owner global emergency pause remains active.' : 'Your account outbound automation can resume.',
        'WhatsApp restrictions and failed sends must still be handled manually.'
      ]);
    }
  },
  safetylogs: {
    category: 'anti', usage: '.safetylogs', example: '.safetylogs',
    async run(ctx) {
      snapshot(ctx);
      const events = safety.accountEvents(ctx.accountId, 8);
      if (!events.length) return brandedReply('SAFETY LOGS', ['No safety events have been recorded for this account.']);
      return brandedReply('RECENT SAFETY LOGS', events.map(item =>
        new Date(item.created_at).toLocaleString() + ' · ' + item.type.replaceAll('_', ' ') + ' · ' + item.detail
      ));
    }
  }
};

module.exports = commands;
