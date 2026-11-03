const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateArchitectures, validateSigning } = require('./lib/android.cjs');
const { assertCertificate } = require('./lib/certificates.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { run } = require('./lib/process.cjs');

test(
  'Windows batch launchers preserve workspace paths and arguments containing spaces',
  { skip: process.platform !== 'win32' },
  (t) => {
    const temp = path.resolve(__dirname, '../.tmp');
    fs.mkdirSync(temp, { recursive: true });
    const file = path.join(temp, `build argument check ${process.pid}.cmd`);
    fs.writeFileSync(file, '@echo off\r\necho %~1\r\n');
    t.after(() => fs.unlinkSync(file));
    const result = run(file, ['value with spaces'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(result.stdout.trim(), 'value with spaces');
  },
);

test('Build rejects unsupported or command-like ABI arguments before invoking Gradle', () => {
  assert.equal(validateArchitectures('arm64-v8a,armeabi-v7a'), 'arm64-v8a,armeabi-v7a');
  for (const value of ['', 'arm64-v8a,arm64-v8a', 'arm64-v8a --other-task', 'mips'])
    assert.throws(() => validateArchitectures(value));
});
test('A partial release signing setup cannot silently fall back to the debug key', () => {
  assert.equal(validateSigning({}), false);
  assert.throws(() => validateSigning({ MEMENTO_KEY_ALIAS: 'release' }), /Incomplete/);
  assert.throws(() => validateSigning({}, true), /Incomplete/);
});
test('APK certificate verification supports both old and new Android tool output', () => {
  const digest = 'a'.repeat(64);
  assert.doesNotThrow(() =>
    assertCertificate(`Signer #1 certificate SHA-256 digest: ${digest}`, digest),
  );
  assert.doesNotThrow(() =>
    assertCertificate(
      `V2 Signer: certificate SHA-256 digest: ${digest}\nV3.0 Signer: certificate SHA-256 digest: ${digest}`,
      digest,
    ),
  );
  assert.throws(
    () => assertCertificate(`Signer #1 certificate SHA-256 digest: ${'b'.repeat(64)}`, digest),
    /mismatch/,
  );
  assert.throws(() => assertCertificate('Missing signer certificate', digest), /mismatch/);
});
