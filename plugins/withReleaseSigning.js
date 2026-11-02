const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = config => withAppBuildGradle(config, next => {
  if (!process.env.MEMENTO_KEYSTORE_FILE) return next;
  const marker = '    buildTypes {';
  if (!next.modResults.contents.includes(marker)) throw new Error('Android buildTypes block not found');
  next.modResults.contents = next.modResults.contents.replace(marker, `    signingConfigs {
        release {
            storeFile file(System.getenv("MEMENTO_KEYSTORE_FILE"))
            storePassword System.getenv("MEMENTO_KEYSTORE_PASSWORD")
            keyAlias System.getenv("MEMENTO_KEY_ALIAS")
            keyPassword System.getenv("MEMENTO_KEY_PASSWORD")
        }
    }
${marker}`).replace(/(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
  return next;
});
