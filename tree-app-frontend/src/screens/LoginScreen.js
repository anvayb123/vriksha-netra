import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Alert, Animated, Easing, Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoogleSignInButton from '../components/GoogleSignInButton';

function AnimatedInput({
  label, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, autoCapitalize, autoCorrect, rightAction
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

export default function LoginScreen({ navigation }) {
  const { login, requestPasswordReset, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Enter email, 2 = Enter code & new pass
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
      Animated.timing(formAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both your email address and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      let msg = err?.response?.data?.message;
      if (!msg) {
        if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
          msg = 'Unable to reach the server. Please verify your phone and laptop are on the same Wi-Fi and the backend server is running.';
        } else {
          msg = err?.message || 'Invalid email or password. Please try again.';
        }
      }
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async () => {
    if (!forgotEmail) {
      Alert.alert('Email required', 'Please enter your registered Gmail/email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail);
      Alert.alert('Code Sent', res.message || 'Check your Gmail for the 6-digit verification code.');
      setForgotStep(2);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not send reset code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePerformReset = async () => {
    if (!resetCode || !newPassword) {
      Alert.alert('Missing fields', 'Please enter the 6-digit code and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.');
      return;
    }
    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail, resetCode, newPassword);
      setForgotModalVisible(false);
      Alert.alert('Success', 'Your password was reset successfully! You are now logged in.');
    } catch (err) {
      Alert.alert('Reset Failed', err?.response?.data?.message || 'Incorrect or expired code. Please try again.');
    } finally {
      setForgotLoading(false);
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
          {/* Header Brand */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoAnim }]}>
            <View style={styles.logoOuterRing}>
              <View style={styles.logoInnerRing}>
                <Text style={styles.logoEmoji}>🌱</Text>
              </View>
            </View>
            <Text style={styles.appName}>Vriksha Netra</Text>
            <Text style={styles.appTagline}>AI Plant Recognition & Tree Plantation Registry</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View style={[{ opacity: formAnim, transform: [{ translateY: formTranslate }] }]}>
            <BlurView intensity={15} tint="dark" style={styles.formCard}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSub}>Sign in to track plantations & verify tree tags</Text>

              {/* 1. Continue with Google */}
              <View style={styles.googleWrap}>
                <GoogleSignInButton label="Continue with Google" />
              </View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with email</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email */}
              <AnimatedInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Password with Eye Toggle */}
              <AnimatedInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                rightAction={
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                }
              />

              {/* Forgot password link */}
              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotStep(1);
                    setForgotModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In CTA */}
              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#4ade80', '#22c55e']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                {loading
                  ? <ActivityIndicator color="#030a06" />
                  : <Text style={styles.loginBtnText}>Sign In →</Text>
                }
              </TouchableOpacity>

              {/* Create Account Link */}
              <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
                <Text style={styles.registerText}>
                  Don't have an account? <Text style={styles.registerHighlight}>Create account</Text>
                </Text>
              </TouchableOpacity>
            </BlurView>

            {/* Quick Demo Access Box */}
            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>🔑 Quick Test Credentials</Text>
              <TouchableOpacity onPress={() => { setEmail('admin@akshar.org'); setPassword('admin123'); }} activeOpacity={0.8}>
                <View style={styles.demoRow}>
                  <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>ADMIN</Text></View>
                  <Text style={styles.demoText}>admin@akshar.org / admin123</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEmail('volunteer@akshar.org'); setPassword('volunteer123'); }} activeOpacity={0.8}>
                <View style={styles.demoRow}>
                  <View style={[styles.demoBadge, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
                    <Text style={[styles.demoBadgeText, { color: '#4ade80' }]}>VOLUNTEER</Text>
                  </View>
                  <Text style={styles.demoText}>volunteer@akshar.org / volunteer123</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.demoHint}>Tap to auto-fill or enter your personal email above</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FORGOT PASSWORD MODAL ─────────────────────────────────────── */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 420 }}>
            <View style={styles.forgotCard}>
              <LinearGradient colors={['#0a2818', '#04140a']} style={StyleSheet.absoluteFill} />

              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalPill}>🔑 PASSWORD RECOVERY</Text>
                  <Text style={styles.modalTitle}>
                    {forgotStep === 1 ? 'Reset Your Password' : 'Enter 6-Digit Code'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setForgotModalVisible(false)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {forgotStep === 1 ? (
                <>
                  <Text style={styles.modalHelp}>
                    Enter the Gmail or email address associated with your account. We will send a 6-digit verification code.
                  </Text>

                  <AnimatedInput
                    label="Email Address"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="your.email@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, forgotLoading && { opacity: 0.6 }]}
                    onPress={handleSendResetCode}
                    disabled={forgotLoading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#4ade80', '#22c55e']} style={StyleSheet.absoluteFill} />
                    {forgotLoading ? (
                      <ActivityIndicator color="#030a06" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Send 6-Digit Code →</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalHelp}>
                    Enter the 6-digit code sent to <Text style={{ color: '#4ade80', fontWeight: '700' }}>{forgotEmail}</Text> and choose a new password.
                  </Text>

                  <AnimatedInput
                    label="6-Digit Verification Code"
                    value={resetCode}
                    onChangeText={setResetCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                  />

                  <AnimatedInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min 6 characters"
                    secureTextEntry
                  />

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, forgotLoading && { opacity: 0.6 }]}
                    onPress={handlePerformReset}
                    disabled={forgotLoading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#4ade80', '#22c55e']} style={StyleSheet.absoluteFill} />
                    {forgotLoading ? (
                      <ActivityIndicator color="#030a06" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Set New Password & Sign In ✓</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ marginTop: 12, alignItems: 'center' }}
                    onPress={() => setForgotStep(1)}
                  >
                    <Text style={{ color: 'rgba(232,245,233,0.5)', fontSize: 13 }}>← Re-enter email address</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 },

  blob1: {
    position: 'absolute', top: -100, left: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(74,222,128,0.05)',
  },
  blob2: {
    position: 'absolute', bottom: -80, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(96,165,250,0.04)',
  },

  logoWrap: { alignItems: 'center', marginBottom: 26 },
  logoOuterRing: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 1.5, borderColor: 'rgba(74,222,128,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  logoInnerRing: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.4)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  logoEmoji: { fontSize: 34 },
  appName: { fontSize: 28, fontWeight: '900', color: '#e8f5e9', letterSpacing: -0.5 },
  appTagline: { fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 4, textAlign: 'center' },

  formCard: {
    borderRadius: 24, padding: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
    backgroundColor: 'rgba(10,26,16,0.85)', marginBottom: 16,
  },
  formTitle: { fontSize: 22, fontWeight: '900', color: '#e8f5e9', marginBottom: 4 },
  formSub: { fontSize: 13, color: 'rgba(232,245,233,0.5)', marginBottom: 20 },

  googleWrap: { marginBottom: 16 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontSize: 11, color: 'rgba(232,245,233,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' },

  forgotRow: { alignItems: 'flex-end', marginBottom: 18, marginTop: -4 },
  forgotText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },

  loginBtn: {
    overflow: 'hidden', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  loginBtnText: { color: '#030a06', fontSize: 16, fontWeight: '900' },

  registerLink: { alignItems: 'center', marginTop: 18 },
  registerText: { color: 'rgba(232,245,233,0.5)', fontSize: 13 },
  registerHighlight: { color: '#4ade80', fontWeight: '800' },

  demoCard: {
    padding: 16, borderRadius: 18,
    backgroundColor: 'rgba(96,165,250,0.04)', borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.1)',
  },
  demoTitle: { fontSize: 11, fontWeight: '800', color: '#60a5fa', marginBottom: 10, letterSpacing: 0.5 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  demoBadge: {
    backgroundColor: 'rgba(248,113,113,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  demoBadgeText: { fontSize: 9, fontWeight: '800', color: '#f87171', letterSpacing: 1 },
  demoText: { fontSize: 12, color: 'rgba(232,245,233,0.5)', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 },
  demoHint: { fontSize: 10, color: 'rgba(232,245,233,0.25)', textAlign: 'center', marginTop: 4 },

  // Forgot Password Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  forgotCard: {
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    overflow: 'hidden',
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalPill: { fontSize: 10, fontWeight: '900', color: '#4ade80', letterSpacing: 1 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#e8f5e9', marginTop: 4 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { color: '#e8f5e9', fontSize: 15, fontWeight: '700' },
  modalHelp: { fontSize: 13, color: 'rgba(232,245,233,0.6)', lineHeight: 19, marginBottom: 18 },
  modalSubmitBtn: {
    overflow: 'hidden', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  modalSubmitText: { color: '#030a06', fontSize: 15, fontWeight: '900' },
});
