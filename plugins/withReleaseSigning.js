const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = (config) =>
  withAppBuildGradle(config, (next) => {
    if (!process.env.MEMENTO_KEYSTORE_FILE) return next;
    const marker = '    buildTypes {';
    if (!next.modResults.contents.includes(marker))
      throw new Error('Android buildTypes block not found');
    let source = next.modResults.contents;
    if (!source.includes('storeFile file(System.getenv("MEMENTO_KEYSTORE_FILE"))'))
      source = source.replace(
        marker,
        `    signingConfigs {
        release {
            storeFile file(System.getenv("MEMENTO_KEYSTORE_FILE"))
            storePassword System.getenv("MEMENTO_KEYSTORE_PASSWORD")
            keyAlias System.getenv("MEMENTO_KEY_ALIAS")
            keyPassword System.getenv("MEMENTO_KEY_PASSWORD")
        }
    }
${marker}`,
      );
    const at = source.indexOf(marker);
    const before = source.slice(0, at);
    const after = source
      .slice(at)
      .replace(
        /(debug\s*\{[\s\S]*?)signingConfig signingConfigs\.release/,
        '$1signingConfig signingConfigs.debug',
      )
      .replace(
        /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.(?:debug|release)/,
        '$1signingConfig signingConfigs.release',
      );
    if (!/release\s*\{[\s\S]*?signingConfig signingConfigs\.release/.test(after))
      throw new Error('Release signing block not found');
    next.modResults.contents = before + after;
    return next;
  });
