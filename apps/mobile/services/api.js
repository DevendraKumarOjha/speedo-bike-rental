
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PRODUCTION_API_URL = 'https://api.speedoryde.com/api';
const API_PORT = 3002;

const getHostFromUri = (uri) => {
  if (typeof uri !== 'string' || !uri) {
    return null;
  }

  const address = uri
    .replace(/^[a-z][a-z\d+.-]*:\/\//i, '')
    .split(/[/?#]/, 1)[0];

  if (!address) {
    return null;
  }

  if (address.startsWith('[')) {
    const closingBracket = address.indexOf(']');
    return closingBracket > 0
      ? address.slice(1, closingBracket)
      : null;
  }

  return address.split(':')[0] || null;
};

const getExpoHost = () => {
  const hostUris = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
    Constants.linkingUri,
  ];

  for (const hostUri of hostUris) {
    const host = getHostFromUri(hostUri);
    if (host) {
      return host;
    }
  }

  return null;
};

const expoHost = getExpoHost();
const formattedExpoHost = expoHost?.includes(':')
  ? `[${expoHost}]`
  : expoHost;

// Select the default URL for the current environment.
const getDefaultBaseURL = () => {
  // Production builds always use the hosted API.
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  // Expo Go on a physical device: use the computer hosting Expo.
  if (formattedExpoHost) {
    return `http://${formattedExpoHost}:${API_PORT}/api`;
  }

  // Android emulator can reach the host computer through this address.
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  // iOS simulator running locally on the same computer.
  return `http://localhost:${API_PORT}/api`;
};

// Allow an explicit URL override during development.
// Production builds always use the production API.
const configuredApiURL =
  typeof process.env.EXPO_PUBLIC_API_URL === 'string' &&
  process.env.EXPO_PUBLIC_API_URL.trim()
    ? process.env.EXPO_PUBLIC_API_URL.trim()
    : typeof Constants.expoConfig?.extra?.apiBaseUrl === 'string' &&
        Constants.expoConfig.extra.apiBaseUrl.trim()
      ? Constants.expoConfig.extra.apiBaseUrl.trim()
      : null;
const apiBaseURL =
  !__DEV__
    ? PRODUCTION_API_URL
    : configuredApiURL ||
      getDefaultBaseURL();

if (__DEV__) {
  console.info(`[API] Using ${apiBaseURL}`);
}

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export default api;