const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../config/android.cjs');
const { run } = require('./lib/process.cjs');
const { androidEnvironment, validateSigning } = require('./lib/android.cjs');
const { assertCertificate } = require('./lib/certificates.cjs');

try {
  const root = path.resolve(__dirname, '..');
  const env = androidEnvironment();
  validateSigning(env, true);
  const certificate = run(
    'keytool',
    [
      '-exportcert',
      '-keystore',
      env.MEMENTO_KEYSTORE_FILE,
      '-alias',
      env.MEMENTO_KEY_ALIAS,
      '-storepass:env',
      'MEMENTO_KEYSTORE_PASSWORD',
    ],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  ).stdout;
  const expected = crypto.createHash('sha256').update(certificate).digest('hex');
  const executable = process.platform === 'win32' ? 'apksigner.bat' : 'apksigner';
  const apkSigner = path.join(env.ANDROID_HOME, 'build-tools', config.buildTools, executable);
  const output = run(
    apkSigner,
    ['verify', '--print-certs', path.join(root, 'build', config.outputName)],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).stdout;
  fs.writeFileSync(path.join(root, 'build', 'signature.txt'), output);
  assertCertificate(output, expected);
  console.log(`Verified release certificate SHA-256: ${expected}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
