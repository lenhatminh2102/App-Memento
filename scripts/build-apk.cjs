const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
// Keep task-generated build caches on the workspace drive.
const temp = path.join(root, '.tmp');
fs.mkdirSync(temp, { recursive: true });
process.env.TEMP = temp;
process.env.TMP = temp;
process.env.NODE_ENV = 'production';
if (!process.env.JAVA_HOME && process.platform === 'win32') {
  const jbr = path.join(process.env.ProgramFiles || 'C:/Program Files', 'Android', 'Android Studio', 'jbr');
  if (fs.existsSync(jbr)) process.env.JAVA_HOME = jbr;
}
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install']);
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
if (!sdk || !fs.existsSync(sdk)) throw new Error('Không tìm thấy Android SDK. Cài Android Studio và đặt ANDROID_HOME.');
fs.writeFileSync(path.join(root, 'android', 'local.properties'), `sdk.dir=${sdk.replaceAll('\\', '/')}\n`);
// Release JS is embedded into the APK and does not need Metro or a localhost server.
const architectures = process.env.MEMENTO_ANDROID_ARCHITECTURES || 'arm64-v8a,armeabi-v7a';
if (!/^(arm64-v8a|armeabi-v7a|x86_64|x86)(,(arm64-v8a|armeabi-v7a|x86_64|x86))*$/.test(architectures)) throw new Error('Invalid Android architectures');
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleRelease', `-PreactNativeArchitectures=${architectures}`, '--no-daemon', '--max-workers=2'], path.join(root, 'android'));
const source = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.copyFileSync(source, path.join(root, 'build', 'memento.apk'));
console.log('APK: ' + path.join(root, 'build', 'memento.apk'));
