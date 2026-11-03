const { withProjectBuildGradle } = require('@expo/config-plugins');
module.exports = (config) =>
  withProjectBuildGradle(config, (next) => {
    const version = process.env.MEMENTO_ANDROID_NDK_VERSION;
    if (version) {
      if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid MEMENTO_ANDROID_NDK_VERSION');
      next.modResults.contents = next.modResults.contents.replace(
        'apply plugin: "com.facebook.react.rootproject"',
        `ext.ndkVersion = "${version}"\napply plugin: "com.facebook.react.rootproject"`,
      );
    }
    return next;
  });
