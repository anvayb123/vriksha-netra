import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Dimensions, StatusBar, Animated, Easing
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { getQueueCount, syncOfflineLogs } from '../utils/OfflineManager';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedCounter({ value, color = '#4ade80', size = 28 }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const listener = animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeListener(listener);
  }, [value]);

  return (
    <Text style={{ fontSize: size, fontWeight: '900', color, fontVariant: ['tabular-nums'] }}>
      {display}
    </Text>
  );
}

// ─── Floating particle ───────────────────────────────────────────────────────
function FloatingLeaf({ delay, startX, size }) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      y.setValue(0);
      x.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
          Animated.timing(y, { toValue: -120, duration: 4000, useNativeDriver: true, easing: Easing.linear }),
          Animated.timing(x, { toValue: (Math.random() - 0.5) * 60, duration: 4000, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute', bottom: 0, left: startX,
        fontSize: size, transform: [{ translateY: y }, { translateX: x }],
        opacity, pointerEvents: 'none',
      }}
    >
      🌿
    </Animated.Text>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ totalTrees: 0, speciesCount: 0, drives: 0 });
  const [offlineQueue, setOfflineQueue] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const scanPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    Animated.spring(headerAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    // Scan button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, { toValue: 1.03, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(scanPulse, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    ).start();
  }, []);

  const loadData = async () => {
    try {
      const qCount = await getQueueCount();
      setOfflineQueue(qCount);
      
      const [sRes, dRes] = await Promise.all([
        api.get('/dashboard/my-stats').catch(() => ({ data: {} })),
        api.get('/drives').catch(() => ({ data: [] })),
      ]);
      setStats({
        totalTrees: sRes.data?.totalTrees || 0,
        speciesCount: sRes.data?.speciesBreakdown?.length || 0,
        drives: Array.isArray(dRes.data) ? dRes.data.length : 0,
      });
    } catch (e) { console.log('Error loading home data', e); }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const syncedCount = await syncOfflineLogs();
    setIsSyncing(false);
    
    if (syncedCount > 0) {
      alert(`Successfully synced ${syncedCount} tree(s) to the cloud! 🌍`);
      loadData(); // Reload stats to show updated tree count
    } else {
      alert('Sync failed. Please check your internet connection.');
    }
  };

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 5) return { text: 'Good night', emoji: '🌙' };
    if (h < 12) return { text: 'Good morning', emoji: '🌅' };
    if (h < 17) return { text: 'Good afternoon', emoji: '☀️' };
    if (h < 21) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
  };

  const greeting = getTimeGreeting();

  const menuItems = [
    { title: 'Encyclopedia', icon: '🌿', desc: 'Plant database', nav: 'Encyclopedia', colors: ['#0a2a1a', '#166534'], accent: '#4ade80' },
    { title: 'Leaderboard', icon: '🏆', desc: 'Rankings', nav: 'Leaderboard', colors: ['#2a1a00', '#78350f'], accent: '#facc15' },
    { title: 'History', icon: '📋', desc: 'My tree logs', nav: 'History', colors: ['#1a0a2a', '#4c1d95'], accent: '#a78bfa' },
    { title: 'Drives', icon: '📅', desc: 'Events', nav: 'Drives', colors: ['#2a0f00', '#7c2d12'], accent: '#f97316' },
    { title: 'My Stats', icon: '📊', desc: 'Progress', nav: 'Dashboard', colors: ['#001a2a', '#0e4a73'], accent: '#22d3ee' },
    { title: 'Certificate', icon: '📜', desc: 'Download', nav: 'Certificate', colors: ['#2a1a00', '#713f12'], accent: '#fbbf24' },
  ];
  if (user?.role === 'admin') {
    menuItems.push({ title: 'Admin', icon: '⚙️', desc: 'Manage', nav: 'AdminPanel', colors: ['#2a0a0a', '#7f1d1d'], accent: '#f87171' });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#020906" />
      <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />

      {/* Floating leaves */}
      {[20, 60, 110, 180, 260, 310].map((x, i) => (
        <FloatingLeaf key={i} delay={i * 700} startX={x} size={10 + (i % 3) * 4} />
      ))}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingLine}>
              <Text style={styles.greetingEmoji}>{greeting.emoji} </Text>
              <Text style={styles.greetingText}>{greeting.text},</Text>
            </Text>
            <Text style={styles.userName}>{user?.name || 'User'} 👋</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Text style={styles.logoutIcon}>⬡</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { value: stats.totalTrees, label: 'Trees', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
            { value: stats.speciesCount, label: 'Species', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
            { value: stats.drives, label: 'Drives', color: '#facc15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)' },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: stat.bg, borderColor: stat.border }]}>
              <AnimatedCounter value={stat.value} color={stat.color} />
              <Text style={[styles.statLabel, { color: stat.color + 'AA' }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* SCAN CTA */}
        <Animated.View style={{ transform: [{ scale: scanPulse }], marginBottom: 28 }}>
          <TouchableOpacity
            style={styles.scanCta}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#0a3320', '#166534', '#15803d']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {/* Glow orb */}
            <View style={styles.scanCtaGlowOrb} />
            <View style={styles.scanCtaContent}>
              <View style={styles.scanCtaIconWrap}>
                <Text style={styles.scanCtaIcon}>📷</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanCtaBadge}>AI POWERED</Text>
                <Text style={styles.scanCtaTitle}>Scan a Plant</Text>
                <Text style={styles.scanCtaDesc}>Live scan or photo • PlantNet AI • 300k+ species</Text>
              </View>
              <View style={styles.scanCtaArrowWrap}>
                <Text style={styles.scanCtaArrow}>→</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* OFFLINE SYNC BANNER */}
        {offlineQueue > 0 && (
          <TouchableOpacity 
            style={styles.syncBanner} 
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#7f1d1d', '#991b1b', '#7f1d1d']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.syncBannerIcon}>{isSyncing ? '🔄' : '📶'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncBannerTitle}>
                {isSyncing ? 'Syncing...' : `${offlineQueue} Trees Pending Sync`}
              </Text>
              <Text style={styles.syncBannerDesc}>Tap to upload saved offline logs</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.nav}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.nav)}
              activeOpacity={0.75}
            >
              <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={[styles.menuIconWrap, { backgroundColor: item.accent + '20', borderColor: item.accent + '30' }]}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
              <View style={[styles.menuAccentBar, { backgroundColor: item.accent + '60' }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>🌏 Vriksha Netra • Making Earth Greener</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 24 },
  greetingLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  greetingEmoji: { fontSize: 16 },
  greetingText: { fontSize: 14, color: 'rgba(232,245,233,0.5)', fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '900', color: '#e8f5e9', letterSpacing: -0.5 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutIcon: { fontSize: 12, color: '#fca5a5' },
  logoutText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 18, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: { fontSize: 10, marginTop: 3, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },

  scanCta: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)' },
  scanCtaGlowOrb: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(74,222,128,0.1)',
  },
  scanCtaContent: { flexDirection: 'row', alignItems: 'center', padding: 22 },
  scanCtaIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  scanCtaIcon: { fontSize: 28 },
  scanCtaBadge: { fontSize: 9, color: '#4ade80', fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  scanCtaTitle: { fontSize: 20, fontWeight: '900', color: '#e8f5e9' },
  scanCtaDesc: { fontSize: 11, color: 'rgba(232,245,233,0.5)', marginTop: 3 },
  scanCtaArrowWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(74,222,128,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  scanCtaArrow: { fontSize: 18, color: '#4ade80', fontWeight: '700' },

  syncBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
    marginBottom: 24, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', overflow: 'hidden'
  },
  syncBannerIcon: { fontSize: 24, marginRight: 12 },
  syncBannerTitle: { fontSize: 14, fontWeight: '800', color: '#fef2f2' },
  syncBannerDesc: { fontSize: 11, color: 'rgba(254,242,242,0.6)', marginTop: 2 },

  sectionTitle: { fontSize: 12, fontWeight: '800', color: 'rgba(232,245,233,0.35)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  menuCard: {
    width: CARD_WIDTH, borderRadius: 20, padding: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 130,
  },
  menuIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    borderWidth: 1,
  },
  menuIcon: { fontSize: 22 },
  menuTitle: { fontSize: 15, fontWeight: '800', color: '#e8f5e9', marginBottom: 3 },
  menuDesc: { fontSize: 11, color: 'rgba(232,245,233,0.4)' },
  menuAccentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },

  footerRow: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 11, color: 'rgba(232,245,233,0.15)', fontWeight: '500' },
});
