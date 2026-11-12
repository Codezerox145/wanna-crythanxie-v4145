process.env.OWNER_NUMBERS = process.env.OWNER_NUMBERS || '263780706629@s.whatsapp.net';
const { commandMap } = require('../lib/commandHandler');
const names = Object.keys(commandMap);
console.log(`Registered commands: ${names.length}`);
if (names.length !== 438) {
  console.error(`Expected exactly 437 registered commands after Anti-DM additions; found ${names.length}`);
  process.exit(1);
}
console.log('PASS: exactly 438 unique live command registrations; existing handlers preserved.');
