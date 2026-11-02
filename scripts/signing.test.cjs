const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const moduleStub = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../plugins/withReleaseSigning.js'), 'utf8'), {
  module: moduleStub,
  require: () => ({ withAppBuildGradle: (config, modify) => modify(config) }),
  process: { env: { MEMENTO_KEYSTORE_FILE: '/test/release.jks' } },
});
const fixture = `android {
    signingConfigs { debug { storeFile file('debug.keystore') } }
    buildTypes {
        debug { signingConfig signingConfigs.debug }
        release { signingConfig signingConfigs.debug }
    }
}`;
function apply(contents) { return moduleStub.exports({ modResults: { contents } }).modResults.contents; }
test('Release APK uses the private release key and debug keeps its own key', () => {
  const text = apply(fixture);
  const types = text.slice(text.indexOf('    buildTypes {'));
  assert.match(types, /debug\s*\{\s*signingConfig signingConfigs\.debug/);
  assert.match(types, /release\s*\{\s*signingConfig signingConfigs\.release/);
});
test('Repeated prebuild does not duplicate the signing configuration', () => {
  const once = apply(fixture);
  assert.equal(apply(once), once);
});
