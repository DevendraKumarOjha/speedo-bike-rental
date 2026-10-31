module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    ...(process.env.EXPO_PUBLIC_API_URL
      ? { apiBaseUrl: process.env.EXPO_PUBLIC_API_URL }
      : {}),
  },
});
