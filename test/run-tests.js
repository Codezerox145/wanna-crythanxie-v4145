// test/run-tests.js
// Runs WITHOUT a live WhatsApp connection: mocks `sock` and a believable
// `ctx` for every registered command and calls .run(). This verifies every
// command is at least syntactically correct, loads without throwing, and
// produces a branded response for its "missing args" path (the most common
// real-world trigger). It does NOT verify live WhatsApp network behavior —
// that requires an actual paired session — but it does catch the class of
// bug that would make a command crash or silently no-op.

process.env.OWNER_NUMBERS = process.env.OWNER_NUMBERS || '263780706629@s.whatsapp.net';
process.env.BOT_NAME = 'WANNA-CRY THANXIEE';
process.env.BOT_CHANNEL_LINK = 'https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z';

const assert = require('assert');
const path = require('path');

let pass = 0;
let fail = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    pass++;
  } catch (e) {
    fail++;
    failures.push({ name, error: e.message });
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    pass++;
  } catch (e) {
    fail++;
    failures.push({ name, error: e.stack });
  }
}

function mockSock() {
  const sentMessages = [];
  return {
    user: { id: '263780706629:1@s.whatsapp.net' },
    sentMessages,
    async sendMessage(jid, content) { sentMessages.push({ jid, content }); return { key: { id: 'mock' } }; },
    async groupMetadata(jid) {
      return {
        id: jid,
        subject: 'Test Group',
        desc: 'A test group',
        creation: Math.floor(Date.now() / 1000) - 100000,
        participants: [
          { id: '263780706629@s.whatsapp.net', admin: 'superadmin' },
          { id: '263711111111@s.whatsapp.net', admin: null },
          { id: '263722222222@s.whatsapp.net', admin: 'admin' }
        ]
      };
    },
    async groupParticipantsUpdate() { return []; },
    async groupSettingUpdate() { return {}; },
    async groupUpdateSubject() { return {}; },
    async groupUpdateDescription() { return {}; },
    async groupInviteCode() { return 'MOCKCODE123'; },
    async groupRevokeInvite() { return {}; },
    async groupLeave() { return {}; },
    async groupToggleEphemeral() { return {}; },
    async groupJoinApprovalMode() { return {}; },
    async presenceSubscribe() { return {}; },
    async sendPresenceUpdate() { return {}; },
    async updateProfilePicture() { return {}; },
    async updateProfileName() { return {}; },
    async updateProfileStatus() { return {}; },
    async newsletterMetadata() { return { id: 'mock-newsletter-id', name: 'Mock Channel' }; },
    async readMessages() { return {}; }
  };
}

function mockCtx(overrides = {}) {
  const sock = overrides.sock || mockSock();
  return Object.assign({
    sock,
    msg: { key: { remoteJid: '12345-group@g.us', participant: '263711111111@s.whatsapp.net', fromMe: false } },
    chatJid: '12345-group@g.us',
    isGroup: true,
    sender: '263780706629@s.whatsapp.net', // the mocked sender IS owner, to exercise the "happy path" too
    botJid: '263780706629@s.whatsapp.net',
    isOwner: true,
    args: [],
    rawText: '',
    mentions: [],
    quotedParticipant: null,
    quotedKey: null,
    quotedText: null,
    quotedMsgFull: null,
    quotedImageBuffer: null,
    participants: [
      { id: '263780706629@s.whatsapp.net', admin: 'superadmin' },
      { id: '263711111111@s.whatsapp.net', admin: null },
      { id: '263722222222@s.whatsapp.net', admin: 'admin' }
    ],
    groupMetadata: { id: '12345-group@g.us', subject: 'Test Group', desc: 'Test', creation: 1000, participants: [] }
  }, overrides);
}

async function main() {
  console.log('=== WANNA-CRY THANXIEE — automated command test ===\n');

  // ---- menu card regressions ----
  check('MIN MENU uses the requested compact THANXIEE layout and pairing shortcuts', () => {
    const menu = require('../lib/menu');
    const card = menu.mainMenu({ sender: '263711111111@s.whatsapp.net', isGroup: false }, {});
    assert.strictEqual(card.menuCard, true);
    assert(card.caption.includes('〔 WANNA-CRY THANXIEE · v20.2.2 〕'));
    assert(card.caption.includes('Status'));
    assert(card.caption.includes('Owner'));
    assert(card.caption.includes('.pair'));
    assert(card.caption.includes('.allmenu'));
  });

  check('ALLMENU lists every public command in categorized image-card sections', () => {
    const menu = require('../lib/menu');
    const commands = {
      alpha: { category: 'tools', run() {} },
      beta: { category: 'media', run() {} },
      gamma: { category: 'ai', run() {} },
      secret: { category: 'vip', run() {} }
    };
    const card = menu.renderAllMenu(commands, { isGroup: true });
    assert.strictEqual(card.menuCard, true);
    const content = [card.caption, ...card.body].join('\\n');
    for (const name of ['alpha', 'beta', 'gamma']) assert(content.includes('.' + name));
    assert(!content.includes('.secret'));
    assert(card.body.length >= 3);
  });

  // ---- lib sanity ----
  check('brand.js renders a card', () => {
    const { brandedReply } = require('../lib/brand');
    const out = brandedReply('TEST', ['line one']);
    assert(out.includes('TEST'));
    assert(out.includes('line one'));
    assert(out.includes('whatsapp.com/channel'));
  });

  check('db.js read/write roundtrip', () => {
    const db = require('../lib/db');
    db.set('settings', '__test_key', 'hello');
    assert.strictEqual(db.get('settings', '__test_key'), 'hello');
    db.del('settings', '__test_key');
  });

  check('antibug.js detects zero-width flood', () => {
    const { scanMessage } = require('../lib/antibug');
    const payload = '\u200b'.repeat(600);
    assert.strictEqual(scanMessage(payload, []), 'zero-width-flood');
  });

  check('antibug.js lets clean text through', () => {
    const { scanMessage } = require('../lib/antibug');
    assert.strictEqual(scanMessage('hello world', []), null);
  });

  check('vip passlock requires owner and supports one-use expiry', () => {
    const vip = require('../lib/vip');
    const owner = '263780706629@s.whatsapp.net';
    const issued = vip.createPasslock(owner, '1h');
    assert(issued.passlock && issued.expiresAt > Date.now());
    assert.strictEqual(vip.unlock('999999999999@s.whatsapp.net', issued.passlock).ok, false);
    assert.strictEqual(vip.unlock(owner, 'wrong-passlock').ok, false);
    assert.strictEqual(vip.unlock(owner, issued.passlock).ok, true);
    assert.strictEqual(vip.isUnlocked(), true);
    assert.strictEqual(vip.unlock(owner, issued.passlock).ok, false);
    vip.lock(owner);
    assert.strictEqual(vip.isUnlocked(), false);
  });

  check('vip passlock rejects invalid durations', () => {
    const vip = require('../lib/vip');
    assert.throws(() => vip.createPasslock('263780706629@s.whatsapp.net', 'forever'), /Use 1h/);
  });

  check('permissions.js owner check reads .env', () => {
    const { isOwner } = require('../lib/permissions');
    assert.strictEqual(isOwner('263780706629@s.whatsapp.net'), true);
    assert.strictEqual(isOwner('999999999999@s.whatsapp.net'), false);
  });

  check('menu.js renders the compact category shortcuts', () => {
    const menu = require('../lib/menu');
    assert.strictEqual(menu.CATEGORIES.length, 10);
    const rendered = menu.mainMenu(mockCtx({ isGroup: false }), require('../lib/commandHandler').commandMap);
    menu.CATEGORIES.forEach((c) => assert(rendered.includes(c.cmd), `missing ${c.cmd} in MIN MENU`));
  });

  check('menu.js hides shadow + vip categories from allmenu', () => {
    const menu = require('../lib/menu');
    const { commandMap } = require('../lib/commandHandler');
    const rendered = menu.renderAllMenu(commandMap);
    assert(!rendered.includes('SHADOW ENFORCEMENT'), 'shadow category leaked into allmenu');
    assert(!/\.ban\b/.test(rendered), 'hidden .ban leaked into allmenu');
    assert(!/\.vipgen\b/.test(rendered), 'hidden .vipgen leaked into allmenu');
  });

  check('MIN MENU contains the approved shortcuts in the requested order', () => {
    const menu = require('../lib/menu');
    const { commandMap } = require('../lib/commandHandler');
    const rendered = menu.mainMenu(mockCtx({ isGroup: false }), commandMap);
    const shortcuts = ['.groupmenu', '.securitymenu', '.botmenu', '.aimenu', '.downloadmenu', '.mediamenu', '.utilitymenu', '.communitymenu', '.channelmenu', '.diagmenu', '.allmenu'];
    let previous = -1;
    for (const shortcut of shortcuts) {
      const position = rendered.indexOf(shortcut);
      assert(position > previous, 'shortcut missing or out of order: ' + shortcut);
      previous = position;
    }
    assert(rendered.includes('Active'));
    assert(rendered.includes('Cmds'));
  });

  await checkAsync('Pair Bot returns the exact central pairing invitation', async () => {
    const { handleCommand } = require('../lib/commandHandler');
    const result = await handleCommand(mockCtx({
      isGroup: false,
      chatJid: '263780706629@s.whatsapp.net',
      sender: '263780706629@s.whatsapp.net',
      rawText: '.pair'
    }));
    assert(result && result.plainText, 'pair command did not return a plain-text invitation');
    assert(result.plainText.includes('WANNA CRY THANXIEE'));
    assert(result.plainText.includes('Powered By : THANXIEE DEV'));
    assert(result.plainText.includes('https://wanna-crythanxie-v4145-loch.vercel.app'));
    assert(result.plainText.includes('Want your own WhatsApp bot?'));
  });

  await checkAsync('plain Pair Bot request returns the same central invitation', async () => {
    const { handleCommand } = require('../lib/commandHandler');
    const result = await handleCommand(mockCtx({
      isGroup: false,
      chatJid: '263780706629@s.whatsapp.net',
      sender: '263780706629@s.whatsapp.net',
      rawText: 'Pair Bot'
    }));
    assert(result && result.plainText);
    assert(result.plainText.includes('https://wanna-crythanxie-v4145-loch.vercel.app'));
  });

  check('filters.js detects a link when antilink is on', () => {
    const db = require('../lib/db');
    const filters = require('../lib/filters');
    const groupJid = 'test-filter-group@g.us';
    db.set('groups', `${groupJid}:antilink`, true);
    const fakeMsg = { message: { conversation: 'check this out https://example.com' } };
    const violation = filters.checkViolations(groupJid, fakeMsg, 'someone@s.whatsapp.net', false);
    assert(violation && violation.includes('antilink'));
    db.set('groups', `${groupJid}:antilink`, false);
  });

  check('filters.js exempts admins', () => {
    const db = require('../lib/db');
    const filters = require('../lib/filters');
    const groupJid = 'test-filter-group-2@g.us';
    db.set('groups', `${groupJid}:antilink`, true);
    const fakeMsg = { message: { conversation: 'https://example.com' } };
    const violation = filters.checkViolations(groupJid, fakeMsg, 'admin@s.whatsapp.net', true);
    assert.strictEqual(violation, null);
  });

  await checkAsync('scheduler.js queues welcome messages with mentions and retries', async () => {
    const scheduler = require('../lib/scheduler');
    const when = scheduler.parseWhen('+30m');
    assert(when > Date.now());
    const group = 'sched-test-group@g.us';
    const member = '263711111111@s.whatsapp.net';
    const id = scheduler.addSchedule(group, 'Welcome @263711111111', Date.now() - 1, {
      title: 'WELCOME NEW MEMBER', mentions: [member], kind: 'welcome'
    });
    const list = scheduler.listSchedules(group);
    assert(list.find((s) => s.id === id && s.kind === 'welcome'));
    const sent = [];
    await scheduler.tick({ async sendMessage(jid, payload) { sent.push({ jid, payload }); } }, (title, lines) => title + ': ' + lines.join(' '));
    assert.strictEqual(sent.length, 1);
    assert.deepStrictEqual(sent[0].payload.mentions, [member]);
    assert(sent[0].payload.text.includes('WELCOME NEW MEMBER'));
    scheduler.cancelSchedule(group, id);
  });

  // ---- every command's usage-guide ("no args") path ----
  const { commandMap } = require('../lib/commandHandler');
  const names = Object.keys(commandMap);
  console.log(`Discovered ${names.length} registered commands.\n`);

  for (const name of names) {
    await checkAsync(`command .${name} runs without throwing (no-args path)`, async () => {
      const def = commandMap[name];
      const ctx = mockCtx({ args: [], mentions: [] });
      const result = await def.run(ctx);
      // A command is allowed to return null (e.g. .del, .leave) or a string
      // or an object — as long as it didn't throw, and if it returns a
      // string/text, it must be branded (carry the channel link).
      if (typeof result === 'string') {
        assert(result.includes('whatsapp.com/channel'), `${name} returned unbranded text`);
      } else if (result && result.text) {
        assert(result.text.includes('whatsapp.com/channel'), `${name} returned unbranded text`);
      }
    });
  }

  // ---- duplicate command name check across all files ----
  check('no duplicate command names across category files', () => {
    const files = [
      '../commands/groupManagement', '../commands/groupSettings', '../commands/antiSuite',
      '../commands/botControl', '../commands/automation', '../commands/aiSuite',
      '../commands/funGames', '../commands/economy', '../commands/stickerMedia',
      '../commands/downloadMenu', '../commands/profileCommunity', '../commands/toolsInfo',
      '../commands/bugDiagnostics', '../commands/vip', '../commands/shadowEnforcement'
    ];
    const seen = new Map();
    const dups = [];
    for (const f of files) {
      const mod = require(f);
      for (const name of Object.keys(mod)) {
        if (seen.has(name)) dups.push(`${name} (${seen.get(name)} vs ${f})`);
        seen.set(name, f);
      }
    }
    assert.strictEqual(dups.length, 0, `Duplicate command names found: ${dups.join(', ')}`);
  });

  // ---- shadow enforcement must be owner-gated even if called directly ----
  await checkAsync('shadow .ban refuses non-owner', async () => {
    const def = commandMap.ban;
    const ctx = mockCtx({ sender: '263711111111@s.whatsapp.net', isOwner: false, mentions: ['263711111111@s.whatsapp.net'] });
    const result = await def.run(ctx);
    const text = typeof result === 'string' ? result : result.text;
    assert(text.includes('ACCESS DENIED') || text.toLowerCase().includes('restricted'), 'non-owner was not denied');
  });

  await checkAsync('shadow .watchlist refuses non-owner', async () => {
    const def = commandMap.watchlist;
    const ctx = mockCtx({ sender: '263711111111@s.whatsapp.net', isOwner: false, mentions: ['263711111111@s.whatsapp.net'], args: ['note'] });
    const result = await def.run(ctx);
    const text = typeof result === 'string' ? result : result.text;
    assert(text.includes('ACCESS DENIED') || text.toLowerCase().includes('restricted'));
  });

  await checkAsync('vip .vipgen refuses non-owner', async () => {
    const def = commandMap.vipgen;
    const ctx = mockCtx({ sender: '263711111111@s.whatsapp.net', isOwner: false });
    const result = await def.run(ctx);
    const text = typeof result === 'string' ? result : result.text;
    assert(text.includes('ACCESS DENIED'));
  });

  console.log(`\n${pass} passed, ${fail} failed.\n`);
  if (failures.length) {
    console.log('FAILURES:');
    failures.forEach((f) => console.log(`- ${f.name}\n  ${f.error}\n`));
    process.exitCode = 1;
  } else {
    console.log('All tests passed.');
  }
}

main();
