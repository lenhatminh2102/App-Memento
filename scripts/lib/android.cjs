const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const config = require('../../config/android.cjs');

const SIGNING_VARIABLES = [
  'MEMENTO_KEYSTORE_FILE',
  'MEMENTO_KEYSTORE_PASSWORD',
  'MEMENTO_KEY_ALIAS',
  'MEMENTO_KEY_PASSWORD',
];

function validateArchitectures(value = config.architectures) {
  const supported = new Set(['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86']);
  const selected = value.split(',');
  if (
    !selected.length ||
    selected.some((abi) => !supported.has(abi)) ||
    new Set(selected).size !== selected.length
  )
    throw new Error('Invalid Android architectures');
  return value;
}

function validateSigning(env, required = false) {
  const supplied = SIGNING_VARIABLES.filter((name) => env[name]);
  if (!supplied.length && !required) return false;
  const missing = SIGNING_VARIABLES.filter((name) => !env[name]);
  if (missing.length)
    throw new Error(`Incomplete release signing configuration: ${missing.join(', ')}`);
  if (!fs.existsSync(env.MEMENTO_KEYSTORE_FILE)) throw new Error('Release keystore file not found');
  return true;
}

function androidEnvironment(source = process.env) {
  const env = { ...source };
  const sdk =
    env.ANDROID_HOME ||
    env.ANDROID_SDK_ROOT ||
    (process.platform === 'win32' && env.LOCALAPPDATA
      ? path.join(env.LOCALAPPDATA, 'Android', 'Sdk')
      : path.join(os.homedir(), 'Android', 'Sdk'));
  if (!fs.existsSync(sdk))
    throw new Error('Không tìm thấy Android SDK. Cài Android Studio và đặt ANDROID_HOME.');
  env.ANDROID_HOME = path.resolve(sdk);
  if (env.MEMENTO_KEYSTORE_FILE)
    env.MEMENTO_KEYSTORE_FILE = path.resolve(env.MEMENTO_KEYSTORE_FILE);
  if (!env.JAVA_HOME && process.platform === 'win32') {
    const programFiles = env.ProgramFiles || 'C:/Program Files';
    const candidates = [
      path.join(programFiles, 'Java', 'jdk-17'),
      path.join(programFiles, 'Android', 'Android Studio', 'jbr'),
    ];
    env.JAVA_HOME = candidates.find((candidate) =>
      fs.existsSync(path.join(candidate, 'bin', 'java.exe')),
    );
  }
  if (env.JAVA_HOME)
    env.PATH = `${path.join(env.JAVA_HOME, 'bin')}${path.delimiter}${env.PATH || ''}`;
  return env;
}

module.exports = { androidEnvironment, validateArchitectures, validateSigning };
