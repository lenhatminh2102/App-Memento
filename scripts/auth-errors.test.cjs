const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
const code = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/lib/authErrors.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInNewContext(code, { exports: mod.exports, module: mod });
const { authErrorMessage, assertAuthSuccess } = mod.exports;
test('CAPTCHA rejection is distinguished from incorrect credentials', () => {
  assert.match(
    authErrorMessage({ code: 'captcha_failed', message: 'request disallowed' }),
    /xác minh lại/,
  );
  assert.match(authErrorMessage({ code: 'invalid_credentials' }), /mật khẩu chưa đúng/);
});
test('Auth error codes are preserved when converting an SDK failure to visible text', () => {
  assert.throws(() => assertAuthSuccess({ code: 'captcha_failed' }), /CAPTCHA/);
  assert.doesNotThrow(() => assertAuthSuccess(null));
});
test('Network errors provide a useful retry message', () => {
  assert.match(authErrorMessage(new Error('Failed to fetch')), /Kiểm tra mạng/);
});
