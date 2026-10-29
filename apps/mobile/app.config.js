const appConfig = require('./app.json');

module.exports = {
  ...appConfig,
  expo: {
    ...appConfig.expo,
    extra: {
      ...appConfig.expo.extra,
      apiBaseUrl:
        process.env.EXPO_PUBLIC_API_URL || 'https://api.speedoryde.com/api',
    },
  },
};
