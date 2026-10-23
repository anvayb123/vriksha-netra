import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

// Configure in tree-app-frontend/.env (Expo inlines EXPO_PUBLIC_* at build time):
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxx.apps.googleusercontent.com
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com
const GOOGLE_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};
const isGoogleConfigured = Boolean(GOOGLE_IDS.webClientId || GOOGLE_IDS.androidClientId || GOOGLE_IDS.iosClientId);

function GoogleGlyph() {
  return (
    <View style={styles.glyph}>
      <Text style={styles.glyphText}>G</Text>
    </View>
  );
}

function ButtonShell({ onPress, loading, disabled, label }) {
  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading) && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#1f1f1f" /> : (
        <>
          <GoogleGlyph />
          <Text style={styles.btnText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Mounted only when client IDs exist (the Google hook throws without them)
function ConfiguredGoogleButton({ label }) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    ...GOOGLE_IDS,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken || response.params?.access_token;
      setBusy(true);
      loginWithGoogle({ idToken, accessToken })
        .catch((e) => Alert.alert('Google Sign-In Failed', e?.response?.data?.message || 'Please try again.'))
        .finally(() => setBusy(false));
    } else if (response.type === 'error') {
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Something went wrong.');
    }
  }, [response]);

  return <ButtonShell label={label} loading={busy} disabled={!request} onPress={() => promptAsync()} />;
}

export default function GoogleSignInButton({ label = 'Continue with Google' }) {
  if (!isGoogleConfigured) {
    return (
      <ButtonShell
        label={label}
        onPress={() =>
          Alert.alert(
            'Google Sign-In not configured',
            'Add your Google OAuth client IDs (EXPO_PUBLIC_GOOGLE_*_CLIENT_ID) to tree-app-frontend/.env and restart Expo.'
          )
        }
      />
    );
  }
  return <ConfiguredGoogleButton label={label} />;
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 15,
  },
  btnText: { color: '#1f1f1f', fontSize: 15, fontWeight: '700' },
  glyph: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#4285F4',
  },
  glyphText: { color: '#4285F4', fontWeight: '900', fontSize: 13, marginTop: -1 },
});
