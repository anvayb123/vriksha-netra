import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api, { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext();

const deviceInfo = `Vriksha Netra app • ${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS} ${Platform.Version ?? ''}`.trim();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    loadStoredUser();
  }, []);

  const saveSession = async (data) => {
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const loadStoredUser = async () => {
    // Safety timeout — never hang on loading forever
    const safetyTimer = setTimeout(() => setLoading(false), 3000);
    try {
      // Purge legacy offline "demo" accounts — they caused sessions to be
      // attributed to the wrong user on the server.
      await AsyncStorage.removeItem('demoUsers');

      const storedUser = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');

      if (!storedUser || !token || token.startsWith('demo-token')) {
        await AsyncStorage.multiRemove(['token', 'user']);
        return;
      }

      setUser(JSON.parse(storedUser));

      // Re-validate with the server so the displayed identity is always correct
      try {
        const { data } = await api.get('/auth/me', { timeout: 8000 });
        const fresh = { ...JSON.parse(storedUser), ...data, token };
        await AsyncStorage.setItem('user', JSON.stringify(fresh));
        setUser(fresh);
      } catch (e) {
        // 401 is handled by the interceptor (auto logout). Network errors: keep cached session.
      }
    } catch (e) {
      console.log('Auth load error:', e);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
      deviceInfo,
    });
    return saveSession(data);
  };

  const loginWithGoogle = async ({ idToken, accessToken }) => {
    const { data } = await api.post('/auth/google', { idToken, accessToken, deviceInfo });
    return saveSession(data);
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    return saveSession(data);
  };

  const requestPasswordReset = async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
    return data;
  };

  const resetPassword = async (email, code, newPassword) => {
    const { data } = await api.post('/auth/reset-password', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
      newPassword,
    });
    return saveSession(data); // auto sign-in after reset
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithGoogle, register, logout, requestPasswordReset, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
