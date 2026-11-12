// lib/antiban.js
// Techniques to reduce the risk of WhatsApp flagging/banning the number.
// None of this is a guarantee — Baileys is an unofficial protocol client
// and WhatsApp can still act against automated accounts — but these are the
// standard, legitimate mitigations: don't behave like a flood bot.

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Random integer between min and max inclusive. */
function jitter(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Call before sending any outbound message to add a small, randomized human-
 * like delay instead of replying instantly every single time.
 */
async function humanDelay(min = 900, max = 2500) {
  const [safeMin, safeMax] = effectiveDelay(min, max);
  await sleep(jitter(safeMin, safeMax));
}

/**
 * Simulates "typing..." or "recording audio..." presence before sending,
 * for a duration proportional to message length (capped).
 */
async function simulatePresence(sock, jid, kind = 'composing', textLength = 40) {
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate(kind, jid); // 'composing' | 'recording'
    const dur = Math.min(4000, Math.max(800, textLength * 35));
    await sleep(dur);
    await sock.sendPresenceUpdate('paused', jid);
  } catch (_) {
    /* presence failures should never block an actual reply */
  }
}

/**
 * Per-chat sliding-window rate limiter so one chat (or one spammy user)
 * cannot force the bot to fire off dozens of replies per second.
 */
class RateLimiter {
  constructor({ windowMs = 10_000, maxPerWindow = 6 } = {}) {
    this.windowMs = windowMs;
    this.maxPerWindow = maxPerWindow;
    this.hits = new Map(); // key -> timestamps[]
  }

  allow(key) {
    const now = Date.now();
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    arr.push(now);
    this.hits.set(key, arr);
    return arr.length <= this.maxPerWindow;
  }
}

/**
 * Serializes broadcast/bulk sends (tagall, announce, broadcast) with a
 * randomized gap between each recipient so the account never fires a burst
 * of identical messages — one of the most common ban triggers.
 */
class BroadcastQueue {
  constructor({ minGapMs = 1500, maxGapMs = 4000, dailyCap = 250 } = {}) {
    this.minGapMs = minGapMs;
    this.maxGapMs = maxGapMs;
    this.dailyCap = dailyCap;
    this.sentToday = 0;
    this.dayStamp = new Date().toDateString();
  }

  _rollDay() {
    const today = new Date().toDateString();
    if (today !== this.dayStamp) {
      this.dayStamp = today;
      this.sentToday = 0;
    }
  }

  /**
   * @param {Function[]} jobs - array of async functions, each sends one message
   * @returns {Promise<{sent:number, skippedCap:number}>}
   */
  async run(jobs) {
    this._rollDay();
    let sent = 0;
    let skippedCap = 0;
    for (const job of jobs) {
      this._rollDay();
      if (this.sentToday >= this.dailyCap) {
        skippedCap += 1;
        continue;
      }
      await job();
      sent += 1;
      this.sentToday += 1;
      await sleep(jitter(this.minGapMs, this.maxGapMs));
    }
    return { sent, skippedCap };
  }
}

/** Global "slow mode" flag — if WhatsApp starts throttling us, flip this on
 * via .maintenance or automatically after repeated send errors, to widen
 * every delay in the bot without redeploying. */
const state = { slowMode: false, consecutiveSendErrors: 0 };

function reportSendResult(ok) {
  if (ok) {
    state.consecutiveSendErrors = 0;
  } else {
    state.consecutiveSendErrors += 1;
    if (state.consecutiveSendErrors >= 5) state.slowMode = true;
  }
}

function effectiveDelay(min, max) {
  return state.slowMode ? [min * 3, max * 3] : [min, max];
}

module.exports = {
  jitter,
  sleep,
  humanDelay,
  simulatePresence,
  RateLimiter,
  BroadcastQueue,
  state,
  reportSendResult,
  effectiveDelay
};
