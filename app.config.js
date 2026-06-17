const base = require('./app.json');

module.exports = () => ({
  expo: {
    ...base.expo,
    ios: {
      ...base.expo.ios,
      bundleIdentifier: 'com.abbanmustafa.worldcupnyc'
    },
    android: {
      ...base.expo.android,
      package: 'com.abbanmustafa.worldcupnyc'
    },
    plugins: base.expo.plugins ?? []
  }
});
