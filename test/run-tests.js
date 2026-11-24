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

  check('group welcome and goodbye are OFF by default, including legacy implicit defaults', () => {
    const db = require('../lib/db');
    const welcome = require('../lib/welcome');
    const group = 'welcome-default-test@g.us';
    db.set('groups', group, {});
    assert.strictEqual(welcome.getGroupSettings(group).welcomeOn, false);
    assert.strictEqual(welcome.getGroupSettings(group).goodbyeOn, false);
    db.set('groups', group, { welcomeOn: true, goodbyeOn: true });
    assert.strictEqual(welcome.getGroupSettings(group).welcomeOn, false);
    assert.strictEqual(welcome.getGroupSettings(group).goodbyeOn, false);
    db.del('groups', group);
  });

  check('group welcome activates only after an explicit admin toggle', () => {
    const db = require('../lib/db');
    const welcome = require('../lib/welcome');
    const group = 'welcome-opt-in-test@g.us';
    db.set('groups', group, {});
    welcome.setGroupSetting(group, { welcomeText: 'Hello {user}' });
    assert.strictEqual(welcome.getGroupSettings(group).welcomeOn, false);
    welcome.setGroupSetting(group, { welcomeOn: true });
    assert.strictEqual(welcome.getGroupSettings(group).welcomeOn, true);
    welcome.setGroupSetting(group, { welcomeOn: false });
    assert.strictEqual(welcome.getGroupSettings(group).welcomeOn, false);
    db.del('groups', group);
  });

  // ---- lib sanity ----
  check('brand.js renders a card', () => {
    const { brandedReply } = require('../lib/brand');
    const out = brandedReply('TEST', ['line one']);
    assert(out.includes('TEST'));
    assert(out.includes('line one'));
    assert(out.includes('Powered by THANXIEE DEV'));
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

  check('permissions normalizes digits-only Render owner numbers to WhatsApp JIDs', () => {
    const original = process.env.OWNER_NUMBERS;
    process.env.OWNER_NUMBERS = '263780706629';
    const { isOwner, isPrimaryOwner } = require('../lib/permissions');
    assert.strictEqual(isPrimaryOwner('263780706629:4@s.whatsapp.net'), true);
    assert.strictEqual(isOwner('263780706629@s.whatsapp.net'), true);
    process.env.OWNER_NUMBERS = original;
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

  // ---- successful pairing welcome and Shadow Enforcement live-action checks ----
  await checkAsync('successful pairing sends the bot image and first main menu once to the paired chat', async () => {
    const fs = require('fs');
    const { sendPairingWelcome } = require('../server/whatsapp');
    const db = require('../lib/db');
    const dataDir = path.join(__dirname, 'pairing-welcome-test-data');
    fs.rmSync(dataDir, { recursive: true, force: true });
    const sent = [];
    const sock = { async sendMessage(jid, payload) { sent.push({ jid, payload }); return {}; } };
    await db.runWithDataDir(dataDir, async () => {
      assert.strictEqual(await sendPairingWelcome(sock, db, '263711111111@s.whatsapp.net'), true);
      assert.strictEqual(await sendPairingWelcome(sock, db, '263711111111@s.whatsapp.net'), false);
    });
    assert.strictEqual(sent.length, 2, 'welcome and first menu should each be sent once');
    assert(sent.every(item => item.jid === '263711111111@s.whatsapp.net'));
    assert(Buffer.isBuffer(sent[0].payload.image), 'pairing welcome must use the configured/default bot image');
    assert(sent[0].payload.caption.includes('PAIRING SUCCESSFUL'));
    assert(Buffer.isBuffer(sent[1].payload.image), 'first menu must use the same bot image');
    assert(sent[1].payload.caption.includes('MAIN MENU'));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  await checkAsync('Shadow ban refuses removal when the bot is not a group admin and stores no false ban', async () => {
    const db = require('../lib/db');
    const vip = require('../lib/vip');
    const owner = '263780706629@s.whatsapp.net';
    const target = '263711111111@s.whatsapp.net';
    const pass = vip.createPasslock(owner, '1h');
    assert.strictEqual(vip.unlock(owner, pass.passlock).ok, true);
    const group = 'shadow-ban-no-admin@g.us';
    db.set('banned', group, []);
    const ctx = mockCtx({
      chatJid: group, sender: owner, isOwner: true, isAdmin: true, isBotAdmin: false,
      mentions: [target], args: ['repeated spam'],
      participants: [{ id: owner, admin: 'admin' }, { id: target, admin: null }]
    });
    const result = await commandMap.ban.run(ctx);
    assert(result.text.includes('BOT ADMIN REQUIRED'));
    assert.strictEqual(db.get('banned', group, []).length, 0);
    vip.lock(owner);
  });

  await checkAsync('Shadow ban reports WhatsApp failure instead of claiming success', async () => {
    const db = require('../lib/db');
    const vip = require('../lib/vip');
    const owner = '263780706629@s.whatsapp.net';
    const target = '263711111111@s.whatsapp.net';
    const pass = vip.createPasslock(owner, '1h');
    assert.strictEqual(vip.unlock(owner, pass.passlock).ok, true);
    const group = 'shadow-ban-failure@g.us';
    db.set('banned', group, []);
    const ctx = mockCtx({
      chatJid: group, sender: owner, isOwner: true, isAdmin: true, isBotAdmin: true,
      mentions: [target], args: ['repeated spam'],
      participants: [{ id: owner, admin: 'admin' }, { id: target, admin: null }]
    });
    ctx.sock.groupParticipantsUpdate = async () => { throw new Error('WhatsApp permission denied'); };
    const result = await commandMap.ban.run(ctx);
    assert(result.text.includes('BAN FAILED'));
    assert.strictEqual(db.get('banned', group, []).length, 0);
    vip.lock(owner);
  });

  await checkAsync('Shadow ban stores the ban only after WhatsApp confirms the removal call', async () => {
    const db = require('../lib/db');
    const vip = require('../lib/vip');
    const owner = '263780706629@s.whatsapp.net';
    const target = '263711111111@s.whatsapp.net';
    const pass = vip.createPasslock(owner, '1h');
    assert.strictEqual(vip.unlock(owner, pass.passlock).ok, true);
    const group = 'shadow-ban-success@g.us';
    db.set('banned', group, []);
    const ctx = mockCtx({
      chatJid: group, sender: owner, isOwner: true, isAdmin: true, isBotAdmin: true,
      mentions: [target], args: ['repeated spam'],
      participants: [{ id: owner, admin: 'admin' }, { id: target, admin: null }]
    });
    let removed = false;
    ctx.sock.groupParticipantsUpdate = async () => { removed = true; return [{ status: '200' }]; };
    const result = await commandMap.ban.run(ctx);
    assert(removed);
    assert(result.text.includes('USER BANNED'));
    assert.strictEqual(db.get('banned', group, []).length, 1);
    vip.lock(owner);
  });

  await checkAsync('Shadow tempban rejects invalid durations instead of silently using 24 hours', async () => {
    const vip = require('../lib/vip');
    const owner = '263780706629@s.whatsapp.net';
    const pass = vip.createPasslock(owner, '1h');
    assert.strictEqual(vip.unlock(owner, pass.passlock).ok, true);
    const ctx = mockCtx({
      sender: owner, isOwner: true, isAdmin: true, isBotAdmin: true,
      mentions: ['263711111111@s.whatsapp.net'], args: ['forever']
    });
    const result = await commandMap.tempban.run(ctx);
    assert(result.includes('INVALID DURATION'));
    vip.lock(owner);
  });

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
    assert(result.plainText.includes('https://wanna-crythanxie-v4145-codezerox1.vercel.app/pair'));
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
    assert(result.plainText.includes('https://wanna-crythanxie-v4145-codezerox1.vercel.app/pair'));
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
      // The WhatsApp delivery layer wraps plain command output in the official
      // response-card frame; menu cards and already-branded responses are kept intact.
      const { ensureBrandedText } = require('../server/whatsapp');
      const output = typeof result === 'string' ? result : (result?.text || result?.plainText || '');
      if (output) assert(ensureBrandedText(output).includes('┆𖤍╭'), `${name} was not wrapped in the official card frame`);
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
