const base = require('./app.json');

const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

module.exports = () => ({
  expo: {
    ...base.expo,
    ios: {
      ...base.expo.ios,
      bundleIdentifier: 'com.abbanmustafa.worldcupnyc'
    },
    android: {
      ...base.expo.android,
      package: 'com.abbanmustafa.worldcupnyc',
      config: {
        ...base.expo.android.config,
        ...(androidGoogleMapsApiKey
          ? {
              googleMaps: {
                ...base.expo.android.config?.googleMaps,
                apiKey: androidGoogleMapsApiKey
              }
            }
          : {})
      }
    },
    plugins: base.expo.plugins ?? []
  }
});
