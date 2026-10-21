import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoHostUri = Constants.expoConfig?.hostUri;
const expoHost = expoHostUri
  ? new URL(`http://${expoHostUri}`).hostname
  : null;
const normalizedExpoHost = expoHost?.replace(/^\[|\]$/g, '');
const formattedExpoHost = normalizedExpoHost?.includes(':')
  ? `[${normalizedExpoHost}]`
  : normalizedExpoHost;

// Expo's development host is reachable from physical devices and emulators.
const defaultBaseURL =
  formattedExpoHost
    ? `http://${formattedExpoHost}:3002/api`
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:3002/api'
      : 'http://localhost:3002/api';

const apiBaseURL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  defaultBaseURL;

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
});

export default api;
