const config = require('../config/android.cjs');
const { run } = require('./lib/process.cjs');
const { androidEnvironment } = require('./lib/android.cjs');

try {
  run(
    process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager',
    [
      `platforms;${config.platform}`,
      `build-tools;${config.buildTools}`,
      `ndk;${process.env.MEMENTO_ANDROID_NDK_VERSION || config.ndk}`,
    ],
    { env: androidEnvironment() },
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
