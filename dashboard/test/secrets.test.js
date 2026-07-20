// Pure-logic tests for the token store and git auth helpers, using a fake
// safeStorage backend (XOR "encryption" — enough to prove round-trip + that
// what lands on disk isn't the plaintext token).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { makeSecrets, normalizeRepo, authHeaderArgs, publicRemoteUrl, redact } = require('../lib/secrets');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-secrets-'));
const tokenFile = path.join(tmp, 'github-token.enc');

let available = true;
const fakeBackend = {
  isAvailable: () => available,
  encrypt: (s) => Buffer.from([...Buffer.from(s, 'utf8')].map((b) => b ^ 0x5a)),
  decrypt: (buf) => Buffer.from([...buf].map((b) => b ^ 0x5a)).toString('utf8'),
};

const secrets = makeSecrets(fakeBackend, () => tokenFile);

// Round-trip
assert.strictEqual(secrets.has(), false, 'no token initially');
assert.strictEqual(secrets.load(), null, 'load() null when absent');
secrets.save('ghp_SECRETVALUE123');
assert.strictEqual(secrets.has(), true, 'has() true after save');
assert.strictEqual(secrets.load(), 'ghp_SECRETVALUE123', 'round-trips the token');

// On-disk bytes must not contain the plaintext token
const onDisk = fs.readFileSync(tokenFile);
assert(!onDisk.includes(Buffer.from('ghp_SECRETVALUE123')), 'plaintext token must not be on disk');

// clear
secrets.clear();
assert.strictEqual(secrets.has(), false, 'has() false after clear');
assert.strictEqual(secrets.load(), null, 'load() null after clear');
secrets.clear(); // idempotent, no throw

// save refuses when secure storage unavailable
available = false;
assert.throws(() => secrets.save('x'), /unavailable/i, 'refuses to save without secure storage');
available = true;

// normalizeRepo
assert.strictEqual(normalizeRepo('mindprints/MAI_DS_2'), 'mindprints/MAI_DS_2');
assert.strictEqual(normalizeRepo('https://github.com/mindprints/MAI_DS_2.git'), 'mindprints/MAI_DS_2');
assert.throws(() => normalizeRepo('not-a-repo'), /owner\/name/);
assert.throws(() => normalizeRepo(''), /owner\/name/);

// publicRemoteUrl carries no token
assert.strictEqual(publicRemoteUrl('mindprints/MAI_DS_2'), 'https://github.com/mindprints/MAI_DS_2.git');

// authHeaderArgs: -c http.extraHeader with base64(x-access-token:token), and
// the raw token must not appear in the argument.
const args = authHeaderArgs('ghp_ABC');
assert.strictEqual(args[0], '-c');
assert(args[1].startsWith('http.extraHeader=Authorization: Basic '), `unexpected header arg: ${args[1]}`);
const b64 = args[1].split('Basic ')[1];
assert.strictEqual(Buffer.from(b64, 'base64').toString('utf8'), 'x-access-token:ghp_ABC');
assert(!args[1].includes('ghp_ABC'), 'raw token must not appear un-encoded in git args');
assert.throws(() => authHeaderArgs(''), /No token/);

// redact scrubs the token from error text
assert.strictEqual(redact('fatal: bad creds ghp_ABC at end', 'ghp_ABC'), 'fatal: bad creds *** at end');
assert.strictEqual(redact('no token here', null), 'no token here');

console.log('SECRETS_TESTS_OK');
