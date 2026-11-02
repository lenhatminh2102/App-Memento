const fs = require('node:fs');
const path = require('node:path');
const config = require('./app.json').expo;
const services = path.join(__dirname, 'google-services.json');
module.exports = {
  ...config,
  android: { ...config.android, ...(fs.existsSync(services) ? { googleServicesFile: './google-services.json' } : {}) },
  plugins: [...config.plugins, 'expo-notifications', 'expo-system-ui', './plugins/withLocalNdk', './plugins/withReleaseSigning'],
};
