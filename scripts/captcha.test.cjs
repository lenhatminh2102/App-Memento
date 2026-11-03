const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/captcha.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { module: mod, exports: mod.exports, process: { env: {} } },
);
const { withCaptcha } = mod.exports;
test('Supabase receives the verified CAPTCHA token in options', async () => {
  let resets = 0;
  let received;
  const result = await withCaptcha(
    { getToken: async () => 'verified-hcaptcha-token', reset: () => resets++ },
    async (options) => {
      received = options.captchaToken;
      return 'signed-in';
    },
  );
  assert.equal(result, 'signed-in');
  assert.equal(received, 'verified-hcaptcha-token');
  assert.equal(resets, 1);
});
test('An invalid password or network failure still resets the single-use token', async () => {
  let resets = 0;
  await assert.rejects(
    withCaptcha({ getToken: async () => 'one-use-token', reset: () => resets++ }, async () => {
      throw new Error('invalid credentials');
    }),
    /invalid credentials/,
  );
  assert.equal(resets, 1);
});
test('Incomplete or cancelled verification never submits the password', async () => {
  let submitted = false;
  const submit = async () => {
    submitted = true;
  };
  await assert.rejects(withCaptcha({ getToken: async () => '', reset() {} }, submit), /CAPTCHA/);
  await assert.rejects(
    withCaptcha(
      {
        getToken: async () => {
          throw new Error('cancelled');
        },
        reset() {},
      },
      submit,
    ),
    /cancelled/,
  );
  assert.equal(submitted, false);
});
