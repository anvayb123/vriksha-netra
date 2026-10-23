import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Animated, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

function AnimatedInput({
  label, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, autoCapitalize = 'none', autoCorrect = false, rightAction,
  textContentType, autoComplete
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', 'rgba(74,222,128,0.6)'],
  });
  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.04)', 'rgba(74,222,128,0.05)'],
  });

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={inputStyles.label}>{label}</Text>
      <Animated.View style={[inputStyles.inputWrap, { borderColor, backgroundColor: bgColor }]}>
        <TextInput
          style={inputStyles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(232,245,233,0.25)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          textContentType={textContentType}
          autoComplete={autoComplete}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightAction ? (
          <View style={inputStyles.rightActionBox}>{rightAction}</View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', color: '#4ade80', marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' },
  inputWrap: { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, padding: 16, color: '#e8f5e9', fontSize: 16 },
  rightActionBox: { paddingRight: 14 },
});

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
      Animated.timing(formAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please fill in your name, email, and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(trimmedName, trimmedEmail, password);
    } catch (error) {
      let msg = typeof error?.response?.data === 'string'
        ? error.response.data
        : error?.response?.data?.message || error?.response?.data?.error;

      if (!msg) {
        if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
          msg = 'Unable to reach the server. Please verify your phone and laptop are on the same Wi-Fi and the backend server is running.';
        } else if (error?.code === 'ECONNABORTED') {
          msg = 'Connection timed out. Please verify your network and server status.';
        } else {
          msg = error?.message || 'Could not complete registration. Please try again.';
        }
      }
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const formTranslate = formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoAnim }]}>
            <View style={styles.logoRing}>
              <Text style={styles.logoEmoji}>🌿</Text>
            </View>
            <Text style={styles.appName}>Join the Mission</Text>
            <Text style={styles.appTagline}>Help us plant and track millions of trees across India</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View style={{ opacity: formAnim, transform: [{ translateY: formTranslate }] }}>
            <BlurView intensity={15} tint="dark" style={styles.formCard}>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSub}>Start your volunteer journey today</Text>

              {/* Google Sign Up */}
              <View style={styles.googleWrap}>
                <GoogleSignInButton label="Sign up with Google" />
              </View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or register with email</Text>
                <View style={styles.dividerLine} />
              </View>

              <AnimatedInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Anvay Bhonde"
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
                autoComplete="name"
              />

              <AnimatedInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
              />

              <AnimatedInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                rightAction={
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                }
              />

              {/* Password strength */}
              {password.length > 0 && (
                <View style={styles.strengthWrap}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.strengthBar, {
                      backgroundColor: password.length >= i * 4
                        ? (i === 3 ? '#4ade80' : i === 2 ? '#facc15' : '#f87171')
                        : 'rgba(255,255,255,0.08)',
                    }]} />
                  ))}
                  <Text style={styles.strengthLabel}>
                    {password.length < 4 ? 'Weak' : password.length < 8 ? 'Good' : 'Strong'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.registerBtn, loading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#4ade80', '#22c55e']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                {loading
                  ? <ActivityIndicator color="#030a06" />
                  : <Text style={styles.registerBtnText}>Create Account →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => {
                  if (navigation?.canGoBack && navigation.canGoBack()) {
                    navigation.goBack();
                  } else if (navigation?.navigate) {
                    navigation.navigate('Login');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginHighlight}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 },

  blob1: { position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(74,222,128,0.06)' },
  blob2: { position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(96,165,250,0.04)' },

  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.3)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.08)', marginBottom: 14,
  },
  logoEmoji: { fontSize: 34 },
  appName: { fontSize: 26, fontWeight: '900', color: '#e8f5e9', letterSpacing: -0.5 },
  appTagline: { fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 4, textAlign: 'center' },

  formCard: {
    borderRadius: 24, padding: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
    backgroundColor: 'rgba(10,26,16,0.85)',
  },
  formTitle: { fontSize: 22, fontWeight: '900', color: '#e8f5e9', marginBottom: 4 },
  formSub: { fontSize: 13, color: 'rgba(232,245,233,0.5)', marginBottom: 18 },

  googleWrap: { marginBottom: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontSize: 11, color: 'rgba(232,245,233,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, marginTop: -6 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, color: 'rgba(232,245,233,0.5)', fontWeight: '700', marginLeft: 4, width: 44 },

  registerBtn: {
    overflow: 'hidden', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  registerBtnText: { color: '#030a06', fontSize: 16, fontWeight: '900' },

  loginLink: { alignItems: 'center', marginTop: 18 },
  loginText: { color: 'rgba(232,245,233,0.5)', fontSize: 13 },
  loginHighlight: { color: '#4ade80', fontWeight: '800' },
});
