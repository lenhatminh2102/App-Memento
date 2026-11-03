// Keep SDK installation, APK compilation and signature verification aligned.
module.exports = Object.freeze({
  platform: 'android-37.0',
  buildTools: '37.0.0',
  ndk: '27.1.12297006',
  architectures: 'arm64-v8a,armeabi-v7a',
  workers: 2,
  outputName: 'memento.apk',
});
