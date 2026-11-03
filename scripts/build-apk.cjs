const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../config/android.cjs');
const { run } = require('./lib/process.cjs');
const { androidEnvironment, validateArchitectures, validateSigning } = require('./lib/android.cjs');

function main() {
  const root = path.resolve(__dirname, '..');
  const env = androidEnvironment();
  const architectures = validateArchitectures(env.MEMENTO_ANDROID_ARCHITECTURES);
  validateSigning(env);
  const temp = path.join(root, '.tmp');
  fs.mkdirSync(temp, { recursive: true });
  Object.assign(env, { NODE_ENV: 'production', TEMP: temp, TMP: temp });

  // Resolve the installed Expo CLI directly: never download a CLI during a build.
  const expo = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
  run(process.execPath, [expo, 'prebuild', '--platform', 'android', '--no-install'], {
    cwd: root,
    env,
  });
  const android = path.join(root, 'android');
  fs.writeFileSync(
    path.join(android, 'local.properties'),
    'sdk.dir=' + env.ANDROID_HOME.replaceAll('\\', '/') + '\n',
  );
  const wrapper = path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  run(
    wrapper,
    [
      'assembleRelease',
      '-PreactNativeArchitectures=' + architectures,
      '--no-daemon',
      '--max-workers=' + config.workers,
    ],
    { cwd: android, env },
  );

  const output = path.join(root, 'build');
  fs.mkdirSync(output, { recursive: true });
  const apk = path.join(output, config.outputName);
  fs.copyFileSync(
    path.join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
    apk,
  );
  const digest = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
  fs.writeFileSync(apk + '.sha256', digest + '  ' + config.outputName + '\n');
  console.log('APK: ' + apk);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
