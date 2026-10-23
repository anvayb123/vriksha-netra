import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Linking, Share, Dimensions, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { BASE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function CertificateScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/dashboard/my-stats');
      setStats(data);
    } catch (error) {
      // Use demo fallback
      setStats({ totalTrees: 0, speciesBreakdown: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const treeCount = stats?.totalTrees || 0;
    if (treeCount === 0) {
      Alert.alert('Plant trees first!', 'You need to plant at least 1 tree to get a certificate.');
      return;
    }

    setGenerating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      // The backend serves a GET route that streams a PDF
      const certUrl = BASE_URL.replace('/api', '') + '/api/certificate?token=' + token;
      
      const canOpen = await Linking.canOpenURL(certUrl);
      if (canOpen) {
        await Linking.openURL(certUrl);
      } else {
        Alert.alert('Download', 'Opening certificate in browser...');
        await Linking.openURL(certUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate certificate. Make sure the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🌱 I've planted ${stats?.totalTrees || 0} trees with Vriksha Netra! Join the green revolution!`,
      });
    } catch (error) {
      console.log('Share failed');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <LinearGradient colors={['#030a06', '#0a2315']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#4ade80" />
      </SafeAreaView>
    );
  }

  const treeCount = stats?.totalTrees || 0;
  const speciesCount = stats?.speciesBreakdown?.length || 0;
  const canDownload = treeCount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#030a06', '#0a2315', '#030a06']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Certificate Preview */}
        <View style={styles.certCard}>
          <LinearGradient
            colors={['#1a1a00', '#2a2a05']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.certBorder}>
            <Text style={styles.certBadge}>🏆</Text>
            <Text style={styles.certTitle}>CERTIFICATE</Text>
            <Text style={styles.certSubtitle}>OF CONTRIBUTION</Text>

            <View style={styles.certDivider} />

            <Text style={styles.certPresented}>Presented to</Text>
            <Text style={styles.certName}>{user?.name || 'Volunteer'}</Text>

            <View style={styles.certStatsRow}>
              <View style={styles.certStatBox}>
                <Text style={styles.certStatNum}>{treeCount}</Text>
                <Text style={styles.certStatLabel}>Trees Planted</Text>
              </View>
              <View style={styles.certStatDivider} />
              <View style={styles.certStatBox}>
                <Text style={styles.certStatNum}>{speciesCount}</Text>
                <Text style={styles.certStatLabel}>Species</Text>
              </View>
            </View>

            <Text style={styles.certBody}>
              For contributing to earth's green cover through the Vriksha Netra initiative.
            </Text>

            <Text style={styles.certOrg}>Akshar Bharati NGO</Text>
          </View>
        </View>

        {/* Download Button */}
        <TouchableOpacity
          style={[styles.downloadBtn, !canDownload && styles.downloadBtnDisabled]}
          onPress={handleDownload}
          disabled={generating || !canDownload}
          activeOpacity={0.8}
        >
          {generating ? (
            <ActivityIndicator color="#030a06" />
          ) : (
            <Text style={styles.downloadText}>
              {canDownload ? 'Download PDF Certificate' : 'Plant trees to unlock certificate'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Share Button */}
        {canDownload && (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
            <Text style={styles.shareBtnText}>Share my achievement 🌍</Text>
          </TouchableOpacity>
        )}

        {/* Info */}
        {!canDownload && (
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Start scanning and logging trees to earn your certificate!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030a06' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030a06' },
  scroll: { padding: 16, paddingBottom: 40 },

  // Certificate Card
  certCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  certBorder: { padding: 28, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,215,0,0.15)', borderRadius: 18, margin: 4 },
  certBadge: { fontSize: 48, marginBottom: 12 },
  certTitle: { fontSize: 22, fontWeight: '900', color: '#ffd700', letterSpacing: 4 },
  certSubtitle: { fontSize: 11, color: 'rgba(255,215,0,0.5)', letterSpacing: 3, marginTop: 4, fontWeight: '600' },
  certDivider: { width: 60, height: 2, backgroundColor: 'rgba(255,215,0,0.3)', marginVertical: 20 },
  certPresented: { fontSize: 12, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', letterSpacing: 2 },
  certName: { fontSize: 28, fontWeight: '700', color: '#e8f5e9', marginTop: 6, marginBottom: 20, textAlign: 'center' },
  certStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  certStatBox: { alignItems: 'center', paddingHorizontal: 24 },
  certStatNum: { fontSize: 32, fontWeight: '900', color: '#4ade80' },
  certStatLabel: { fontSize: 10, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', marginTop: 2, fontWeight: '600' },
  certStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  certBody: { fontSize: 13, color: 'rgba(232,245,233,0.6)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10, marginBottom: 16 },
  certOrg: { fontSize: 11, color: 'rgba(255,215,0,0.4)', fontWeight: '700', letterSpacing: 1 },

  // Buttons
  downloadBtn: { backgroundColor: '#4ade80', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  downloadBtnDisabled: { backgroundColor: 'rgba(74,222,128,0.15)' },
  downloadText: { color: '#030a06', fontSize: 16, fontWeight: '800' },
  shareBtn: { padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  shareBtnText: { color: '#e8f5e9', fontSize: 15, fontWeight: '600' },

  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: 'rgba(96,165,250,0.08)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.15)', marginTop: 8 },
  infoIcon: { fontSize: 24, marginRight: 12 },
  infoText: { flex: 1, fontSize: 13, color: 'rgba(232,245,233,0.6)', lineHeight: 20 },
});
