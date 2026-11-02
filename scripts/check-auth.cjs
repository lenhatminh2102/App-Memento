// One invalid-password request verifies the backend no longer demands CAPTCHA.
// This neither creates an account nor accesses a real user's password or session.
const fs = require('node:fs');
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|ANON_KEY))=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}
async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing public Supabase configuration');
  const result = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `auth-probe-${Date.now()}@example.invalid`, password: 'not-a-real-account' }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await result.json();
  if (body.error_code === 'captcha_failed' || body.code === 'captcha_failed') throw new Error('CAPTCHA is still enabled in Supabase. Disable it in Authentication > Attack Protection.');
  if (body.error_code !== 'invalid_credentials' && body.code !== 'invalid_credentials') throw new Error(`Unexpected auth response: HTTP ${result.status}, ${body.error_code || body.code || 'unknown'}`);
  console.log('PASS: Supabase validates credentials without requiring CAPTCHA. No account was created.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
