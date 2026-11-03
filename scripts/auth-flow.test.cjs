const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/authFlow.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: mod.exports, module: mod },
);
const { withAccountVerification, isVerifyingAccountAction } = mod.exports;

test('Account verification does not leave password recovery suppressed after a failed OTP', async () => {
  await assert.rejects(
    withAccountVerification(async () => {
      assert.equal(isVerifyingAccountAction(), true);
      throw new Error('invalid OTP');
    }),
    /invalid OTP/,
  );
  assert.equal(isVerifyingAccountAction(), false);
});
