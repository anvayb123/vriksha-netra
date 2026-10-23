import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Auto-detect computer IP from Expo packager or fallback to current Wi-Fi IP
const FALLBACK_DEV_IP = '192.168.1.9';

const getDevHost = () => {
  if (Platform.OS === 'web') {
    return 'localhost';
  }

  // 1. In Expo Go / Dev Client, detect host IP dynamically from Expo Constants
  try {
    const Constants = require('expo-constants').default;
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost || Constants?.manifest?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch (e) {
    // expo-constants optional
  }

  // 2. React Native packager scriptURL fallback
  try {
    const { NativeModules } = require('react-native');
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const host = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch (e) {
    // scriptURL optional
  }

  // 3. Android Emulator loopback
  if (Platform.OS === 'android' && !FALLBACK_DEV_IP) {
    return '10.0.2.2';
  }

  return FALLBACK_DEV_IP;
};

export const DEV_MACHINE_IP = getDevHost();
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEV_MACHINE_IP}:5000/api`;
console.log(`[API Client] Connecting to backend at: ${BASE_URL}`);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds timeout for photo uploads and syncs
});

// Har request ke saath automatically token attach ho jayega agar available hai
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Localtunnel bypass header
  config.headers['bypass-tunnel-reminder'] = 'true';
  return config;
});

// Jab backend session reject kare (expired / invalid token), app ko logout karwao
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && error.response.data?.code === 'TOKEN_INVALID' && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export default api;
