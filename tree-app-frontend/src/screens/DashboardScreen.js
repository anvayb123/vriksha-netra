import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, Easing, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../api/client';

const { width } = Dimensions.get('window');

// ─── Arc progress ring ──────────────────────────────────────────────────────
function StatRing({ value, max = 100, color, size = 110, label, sublabel }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
    const listener = animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeListener(listener);
  }, [value]);

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <View style={[styles.ringOuter, { width: size, height: size, borderRadius: size / 2, borderColor: color + '20' }]}>
        <View style={[styles.ringInner, {
          width: size - 18, height: size - 18, borderRadius: (size - 18) / 2,
          borderColor: color, backgroundColor: color + '0A',
        }]}>
          <Text style={[styles.ringValue, { color, fontSize: size * 0.27 }]}>{display}</Text>
          <Text style={[styles.ringLabel, { fontSize: size * 0.12 }]}>{sublabel}</Text>
        </View>
      </View>
      <Text style={[styles.ringTitle, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Species bar ────────────────────────────────────────────────────────────
function SpeciesBar({ name, count, maxCount, index }) {
  const barAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(barAnim, { toValue: 1, duration: 800, delay: index * 100, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const colors = ['#4ade80', '#60a5fa', '#a78bfa', '#f97316', '#facc15', '#22d3ee'];
  const color = colors[index % colors.length];

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] });

  return (
    <Animated.View style={[styles.speciesRow, { transform: [{ translateX: slideAnim }], opacity: opacityAnim }]}>
      <View style={styles.speciesLeft}>
        <View style={[styles.speciesDot, { backgroundColor: color }]} />
        <Text style={styles.speciesName} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.speciesBarWrap}>
        <Animated.View style={[styles.speciesBarFill, { width: barWidth, backgroundColor: color }]} />
      </View>
      <Text style={[styles.speciesCount, { color }]}>{count}</Text>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStats();
    Animated.spring(headerAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/dashboard/my-stats');
      setStats(data);
    } catch { console.log('Failed to load stats'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#020906', '#041410']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={styles.loadText}>Loading your stats...</Text>
        </View>
      </View>
    );
  }

  const totalTrees = stats?.totalTrees || 0;
  const species = stats?.speciesBreakdown || [];
  const maxSpeciesCount = species.length > 0 ? Math.max(...species.map(s => s.count)) : 1;
  const co2 = Math.round(totalTrees * 22); // ~22kg CO2 per tree/year

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero banner */}
        <Animated.View style={[styles.heroBanner, { opacity: headerAnim, transform: [{ scale: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          <LinearGradient colors={['#0a3320', '#166534', '#15803d']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.heroGlowOrb} />
          <Text style={styles.heroEmoji}>🌳</Text>
          <Text style={styles.heroNumber}>{totalTrees}</Text>
          <Text style={styles.heroLabel}>Total Trees Planted</Text>
          <Text style={styles.heroSub}>You're making a real impact!</Text>
        </Animated.View>

        {/* Stat rings row */}
        <View style={styles.ringsRow}>
          <StatRing value={species.length} max={50} color="#60a5fa" size={100} label="Species" sublabel="unique" />
          <StatRing value={Math.min(99, totalTrees)} max={99} color="#4ade80" size={100} label="Trees" sublabel="logged" />
          <StatRing value={Math.min(co2, 9999)} max={9999} color="#a78bfa" size={100} label="CO₂" sublabel="kg/yr" />
        </View>

        {/* Species breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌿 Species Breakdown</Text>
          {species.length > 0 ? (
            species.map((item, i) => (
              <SpeciesBar key={i} name={item.name} count={item.count} maxCount={maxSpeciesCount} index={i} />
            ))
          ) : (
            <BlurView intensity={15} tint="dark" style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyText}>No trees logged yet.</Text>
              <Text style={styles.emptyHint}>Scan your first plant to get started!</Text>
            </BlurView>
          )}
        </View>

        {/* Impact metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 Your Environmental Impact</Text>
          <View style={styles.impactGrid}>
            {[
              { icon: '💨', value: `${co2} kg`, label: 'CO₂ absorbed/yr', color: '#4ade80' },
              { icon: '💧', value: `${totalTrees * 45}L`, label: 'Water filtered/yr', color: '#60a5fa' },
              { icon: '🦋', value: `${species.length} spp`, label: 'Biodiversity', color: '#a78bfa' },
              { icon: '🌡️', value: `−${(totalTrees * 0.8).toFixed(1)}°`, label: 'Local temp reduction', color: '#34d399' },
            ].map((m, i) => (
              <View key={i} style={[styles.impactCard, { borderColor: m.color + '30' }]}>
                <Text style={styles.impactIcon}>{m.icon}</Text>
                <Text style={[styles.impactValue, { color: m.color }]}>{m.value}</Text>
                <Text style={styles.impactLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  loadCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadText: { color: 'rgba(232,245,233,0.4)', fontSize: 14 },
  content: { padding: 20, paddingBottom: 40 },

  heroBanner: {
    borderRadius: 24, padding: 32, alignItems: 'center',
    marginBottom: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
  },
  heroGlowOrb: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(74,222,128,0.15)',
  },
  heroEmoji: { fontSize: 44, marginBottom: 8 },
  heroNumber: { fontSize: 76, fontWeight: '900', color: '#e8f5e9', lineHeight: 82 },
  heroLabel: { fontSize: 14, color: '#4ade80', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(232,245,233,0.5)', marginTop: 6 },

  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 28 },
  ringWrap: { alignItems: 'center' },
  ringOuter: { borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  ringInner: { borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  ringValue: { fontWeight: '900', lineHeight: undefined },
  ringLabel: { color: 'rgba(232,245,233,0.4)', fontWeight: '600' },
  ringTitle: { fontSize: 11, fontWeight: '800', marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#e8f5e9', marginBottom: 16 },

  speciesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  speciesLeft: { flexDirection: 'row', alignItems: 'center', width: 110, gap: 8 },
  speciesDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  speciesName: { fontSize: 13, color: '#e8f5e9', fontWeight: '600', flex: 1 },
  speciesBarWrap: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  speciesBarFill: { height: '100%', borderRadius: 4 },
  speciesCount: { width: 28, fontSize: 13, fontWeight: '800', textAlign: 'right' },

  emptyCard: {
    padding: 28, borderRadius: 18, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: 'rgba(232,245,233,0.5)', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyHint: { color: 'rgba(232,245,233,0.3)', fontSize: 13 },

  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  impactCard: {
    width: (width - 52) / 2, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
    padding: 18, alignItems: 'center',
  },
  impactIcon: { fontSize: 28, marginBottom: 8 },
  impactValue: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  impactLabel: { fontSize: 11, color: 'rgba(232,245,233,0.4)', textAlign: 'center', fontWeight: '600' },
});
