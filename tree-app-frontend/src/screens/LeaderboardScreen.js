import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Animated, Easing, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../api/client';

const { width } = Dimensions.get('window');

// ─── Podium bar for top 3 ──────────────────────────────────────────────────
function PodiumCard({ item, rank, maxCount }) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const podiumConfig = [
    { height: 160, color: '#facc15', label: '👑', shadow: '#facc15' },
    { height: 120, color: '#94a3b8', label: '🥈', shadow: '#94a3b8' },
    { height: 90, color: '#d97706', label: '🥉', shadow: '#d97706' },
  ];
  const cfg = podiumConfig[rank];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: cfg.height, duration: 800, delay: rank * 200,
        useNativeDriver: false, easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 500, delay: rank * 200 + 300, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.podiumItem, rank === 0 && { zIndex: 3 }]}>
      <Animated.View style={{ opacity: opacityAnim, alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.podiumName, { color: cfg.color }]} numberOfLines={1}>
          {item.name?.split(' ')[0]}
        </Text>
        <Text style={styles.podiumTreeCount}>{item.total} 🌱</Text>
      </Animated.View>
      <Text style={styles.podiumMedal}>{cfg.label}</Text>
      <Animated.View
        style={[
          styles.podiumBar,
          { height: heightAnim, backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' },
        ]}
      >
        <LinearGradient
          colors={[cfg.color + '40', cfg.color + '10']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />
        <Text style={[styles.podiumRankNum, { color: cfg.color }]}>#{rank + 1}</Text>
      </Animated.View>
    </View>
  );
}

// ─── List item ─────────────────────────────────────────────────────────────
function RankItem({ item, index }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.rankItem, { transform: [{ translateX: slideAnim }], opacity: opacityAnim }]}>
      <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.rankNumWrap}>
        <Text style={styles.rankNum}>#{index + 4}</Text>
      </View>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{item.name}</Text>
        <View style={styles.rankBarBg}>
          <View style={[styles.rankBarFill, { width: `${Math.min(100, (item.total / 20) * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.rankCountWrap}>
        <Text style={styles.rankCount}>{item.total}</Text>
        <Text style={styles.rankCountLabel}>trees</Text>
      </View>
    </Animated.View>
  );
}

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLeaderboard();
    Animated.spring(titleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data } = await api.get('/dashboard/leaderboard');
      setLeaders(data);
    } catch (err) { console.log('Failed to load leaderboard', err); }
    finally { setLoading(false); }
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#020906', '#041410']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadText}>Loading rankings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#020906', '#1a1200', '#020906']} style={StyleSheet.absoluteFill} />

      {/* Glow orbs */}
      <View style={styles.goldGlowTL} />
      <View style={styles.goldGlowBR} />

      <FlatList
        data={rest}
        keyExtractor={(item, i) => `${item.name}-${i}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Title */}
            <Animated.View style={[styles.headerWrap, { opacity: titleAnim, transform: [{ scale: titleAnim }] }]}>
              <Text style={styles.crownEmoji}>👑</Text>
              <Text style={styles.headerTitle}>Hall of Champions</Text>
              <Text style={styles.headerSub}>Top planters making Earth greener</Text>
            </Animated.View>

            {/* Podium */}
            {top3.length >= 2 && (
              <View style={styles.podiumRow}>
                {/* 2nd place (left) */}
                {top3[1] && <PodiumCard item={top3[1]} rank={1} />}
                {/* 1st place (center, elevated) */}
                {top3[0] && (
                  <View style={styles.podiumCenterWrap}>
                    <PodiumCard item={top3[0]} rank={0} />
                  </View>
                )}
                {/* 3rd place (right) */}
                {top3[2] && <PodiumCard item={top3[2]} rank={2} />}
              </View>
            )}

            {/* Section label */}
            {rest.length > 0 && (
              <Text style={styles.restLabel}>MORE CHAMPIONS</Text>
            )}
          </>
        }
        renderItem={({ item, index }) => <RankItem item={item} index={index} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          leaders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyText}>No rankings yet. Be the first to plant!</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  loadCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadText: { color: 'rgba(232,245,233,0.4)', fontSize: 14 },

  goldGlowTL: { position: 'absolute', top: -60, left: '30%', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(250,204,21,0.05)' },
  goldGlowBR: { position: 'absolute', bottom: 100, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(250,204,21,0.04)' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  headerWrap: { alignItems: 'center', paddingTop: 20, marginBottom: 32 },
  crownEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#facc15', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(232,245,233,0.4)', marginTop: 6 },

  // Podium
  podiumRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    marginBottom: 32, gap: 8,
  },
  podiumCenterWrap: { marginBottom: 16, zIndex: 3 },
  podiumItem: { alignItems: 'center', flex: 1, maxWidth: (width - 40) / 3 },
  podiumName: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  podiumTreeCount: { fontSize: 11, color: 'rgba(232,245,233,0.5)', marginTop: 2 },
  podiumMedal: { fontSize: 28, marginBottom: 6 },
  podiumBar: {
    width: '90%', borderWidth: 1, borderRadius: 8,
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 10, overflow: 'hidden',
  },
  podiumRankNum: { fontSize: 22, fontWeight: '900' },

  // Rest list
  restLabel: {
    fontSize: 10, color: 'rgba(232,245,233,0.25)', fontWeight: '800',
    letterSpacing: 2, marginBottom: 14,
  },
  rankItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 18, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  rankNumWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  rankNum: { fontSize: 13, fontWeight: '800', color: 'rgba(232,245,233,0.4)' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: '700', color: '#e8f5e9', marginBottom: 6 },
  rankBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  rankBarFill: { height: '100%', backgroundColor: '#4ade80', borderRadius: 2 },
  rankCountWrap: { alignItems: 'center' },
  rankCount: { fontSize: 18, fontWeight: '900', color: '#4ade80' },
  rankCountLabel: { fontSize: 10, color: 'rgba(232,245,233,0.3)', marginTop: 1 },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyText: { color: 'rgba(232,245,233,0.4)', fontSize: 15, textAlign: 'center' },
});
