const appJson = require('./app.json');

module.exports = ({ config = {} } = {}) => {
  const expoConfig = { ...appJson.expo, ...config };
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return {
    ...expoConfig,
    plugins: [
      ...(expoConfig.plugins || []),
      ...(googleMapsApiKey ? [[
        'react-native-maps',
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
          iosGoogleMapsApiKey: googleMapsApiKey,
        },
      ]] : []),
    ],
    extra: {
      ...expoConfig.extra,
      googleMapsEnabled: Boolean(googleMapsApiKey),
    },
  };
};
