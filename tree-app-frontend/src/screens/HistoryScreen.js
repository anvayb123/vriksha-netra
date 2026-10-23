import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Animated, Easing, Image, TouchableOpacity, Modal,
  Share, Linking, Alert, Dimensions, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

function LogCard({ item, index, onOpenQR, showVolunteer = false }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: Math.min(index * 45, 500),
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 45, 500),
        useNativeDriver: true
      }),
    ]).start();
  }, []);

  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isFlagged = item.flaggedForReview;
  const planterName = item.user?.name || (typeof item.user === 'string' ? null : null);

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ translateX: slideAnim }], opacity: opacityAnim }]}>
      <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={isFlagged ? ['rgba(239,68,68,0.06)', 'transparent'] : ['rgba(74,222,128,0.05)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />

      {/* Photo or icon */}
      <View style={[styles.cardPhoto, { backgroundColor: isFlagged ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)' }]}>
        {(item.photoUrl || item.photo) ? (
          <Image source={{ uri: item.photoUrl || item.photo }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={{ fontSize: 26 }}>{isFlagged ? '🚩' : '🌳'}</Text>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.species?.name || item.aiRawGuess || 'Unidentified Plant'}
        </Text>

        {showVolunteer && planterName ? (
          <View style={styles.volunteerBadge}>
            <Text style={styles.volunteerBadgeText}>👤 Planted by {planterName}</Text>
          </View>
        ) : null}

        <Text style={styles.cardDate}>{dateStr} • {timeStr}</Text>

        <TouchableOpacity
          style={styles.qrPillBtn}
          onPress={() => onOpenQR(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.qrPillText}>🏷️ View QR Tag</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.countBig}>×{item.count || 1}</Text>
        <Text style={styles.countSub}>trees</Text>
        {isFlagged && <Text style={{ fontSize: 14, marginTop: 4 }}>🚩</Text>}
      </View>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [viewScope, setViewScope] = useState(isAdmin ? 'all' : 'my'); // 'all' | 'my'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // QR Modal states
  const [selectedTree, setSelectedTree] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    loadHistory(viewScope);
  }, [viewScope]);

  const loadHistory = async (scope = viewScope) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = (isAdmin && scope === 'all') ? '/tree-logs' : '/tree-logs/my';
      const { data } = await api.get(endpoint);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Failed to load history:', err?.message);
      setError(err?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQR = async (tree) => {
    setSelectedTree(tree);
    setQrModalVisible(true);
    setQrLoading(true);
    setQrData(null);

    try {
      const res = await api.get(`/tree-logs/${tree._id}/qr`);
      if (res.data?.success) {
        setQrData(res.data);
      } else {
        throw new Error('Failed to generate QR');
      }
    } catch (err) {
      console.log('Error generating QR:', err);
      Alert.alert('Error', 'Failed to generate QR code for this tree.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleShareQR = async () => {
    if (!qrData?.publicUrl) return;
    try {
      await Share.share({
        title: `${qrData.tree?.treeName || 'Planted Tree'} - Vriksha Netra`,
        message: `🌿 Check out this tree planted by ${qrData.tree?.plantedBy || 'Volunteer'} on Vriksha Netra:\n${qrData.publicUrl}`,
        url: qrData.publicUrl,
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  const handleOpenWeb = async () => {
    if (!qrData?.publicUrl) return;
    try {
      await Linking.openURL(qrData.publicUrl);
    } catch (err) {
      Alert.alert('Link', qrData.publicUrl);
    }
  };

  const filteredLogs = logs.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const treeName = (item.species?.name || item.aiRawGuess || '').toLowerCase();
    const volunteer = (item.user?.name || '').toLowerCase();
    const driveName = (item.drive?.name || '').toLowerCase();
    return treeName.includes(q) || volunteer.includes(q) || driveName.includes(q);
  });

  const totalTrees = filteredLogs.reduce((acc, l) => acc + (l.count || 1), 0);
  const uniqueSpecies = new Set(filteredLogs.map(l => l.species?.name).filter(Boolean)).size;
  const uniqueVolunteers = new Set(filteredLogs.map(l => l.user?._id || l.user || 'user')).size;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />

      {/* Admin Scope Switcher */}
      {isAdmin && (
        <View style={styles.adminScopeWrap}>
          <TouchableOpacity
            style={[styles.scopeBtn, viewScope === 'all' && styles.scopeBtnActive]}
            onPress={() => setViewScope('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.scopeBtnText, viewScope === 'all' && styles.scopeBtnTextActive]}>
              👥 All Volunteers ({logs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeBtn, viewScope === 'my' && styles.scopeBtnActive]}
            onPress={() => setViewScope('my')}
            activeOpacity={0.8}
          >
            <Text style={[styles.scopeBtnText, viewScope === 'my' && styles.scopeBtnTextActive]}>
              👤 My Plantings
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Input for Admin or Large lists */}
      {isAdmin && viewScope === 'all' && (
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by volunteer or tree species..."
            placeholderTextColor="rgba(232,245,233,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={styles.loadText}>Loading tree plantation history...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadCenter}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Could not load history</Text>
          <Text style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 20, paddingHorizontal: 32 }}>{error}</Text>
          <TouchableOpacity
            onPress={() => loadHistory(viewScope)}
            style={{ backgroundColor: '#4ade80', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#030a06', fontWeight: '800' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <LogCard
              item={item}
              index={index}
              onOpenQR={handleOpenQR}
              showVolunteer={isAdmin && viewScope === 'all'}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <LinearGradient colors={['#0a2818', '#05180f']} style={StyleSheet.absoluteFill} />
              <View style={styles.summaryGlow} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{filteredLogs.length}</Text>
                  <Text style={styles.summaryLabel}>Entries</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{totalTrees}</Text>
                  <Text style={styles.summaryLabel}>Total Trees</Text>
                </View>
                <View style={styles.summaryDivider} />
                {isAdmin && viewScope === 'all' ? (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#60a5fa' }]}>{uniqueVolunteers}</Text>
                    <Text style={styles.summaryLabel}>Volunteers</Text>
                  </View>
                ) : (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{uniqueSpecies}</Text>
                    <Text style={styles.summaryLabel}>Species</Text>
                  </View>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>No logs found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No tree logs matched your search terms.'
                  : 'Start planting trees and scan them to build your history!'}
              </Text>
            </View>
          }
        />
      )}

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

          <View style={styles.qrCardModal}>
            <LinearGradient
              colors={['#0a2215', '#06170d']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTagBadge}>🌱 OFFICIAL TREE QR TAG</Text>
                <Text style={styles.modalTreeName} numberOfLines={1}>
                  {qrData?.tree?.treeName || selectedTree?.species?.name || selectedTree?.aiRawGuess || 'Planted Tree'}
                </Text>
                <Text style={styles.modalScientific}>
                  {qrData?.tree?.scientificName || selectedTree?.species?.scientificName || 'Native Tree'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainerBox}>
              {qrLoading ? (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color="#4ade80" />
                  <Text style={styles.qrLoadingText}>Generating QR Code...</Text>
                </View>
              ) : qrData?.qrCodeUrl ? (
                <View style={styles.qrWhiteBadge}>
                  <Image
                    source={{ uri: qrData.qrCodeUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrScanPrompt}>Scan to view tree & volunteer</Text>
                </View>
              ) : (
                <Text style={{ color: '#ef4444' }}>Unable to load QR Code</Text>
              )}
            </View>

            <View style={styles.modalDetailsBox}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>PLANTED BY</Text>
                <Text style={styles.modalDetailVal}>
                  👤 {qrData?.tree?.plantedBy || selectedTree?.user?.name || 'Volunteer'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>DATE</Text>
                <Text style={styles.modalDetailVal}>
                  📅 {selectedTree?.createdAt ? new Date(selectedTree.createdAt).toLocaleDateString() : 'Recent'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>TAG ID</Text>
                <Text style={[styles.modalDetailVal, { color: '#4ade80', fontFamily: 'monospace' }]}>
                  #TREE-{(selectedTree?._id || '').slice(-8).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalShareBtn]}
                onPress={handleShareQR}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnText}>🔗 Share Public Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalWebBtn]}
                onPress={handleOpenWeb}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: '#4ade80' }]}>🌐 Open Page</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  loadCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadText: { color: 'rgba(232,245,233,0.4)', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 40 },

  adminScopeWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  scopeBtnActive: {
    backgroundColor: '#4ade80',
  },
  scopeBtnText: {
    color: 'rgba(232,245,233,0.6)',
    fontWeight: '700',
    fontSize: 13,
  },
  scopeBtnTextActive: {
    color: '#030a06',
    fontWeight: '900',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#e8f5e9',
    fontSize: 13,
  },
  clearBtn: { color: 'rgba(232,245,233,0.5)', fontSize: 14, padding: 4 },

  summaryCard: {
    borderRadius: 22, padding: 22, marginBottom: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)',
  },
  summaryGlow: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(74,222,128,0.1)' },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 26, fontWeight: '900', color: '#e8f5e9' },
  summaryLabel: { fontSize: 11, color: 'rgba(232,245,233,0.5)', marginTop: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.1)' },

  cardWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 20, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden',
  },
  cardPhoto: {
    width: 54, height: 54, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#e8f5e9', marginBottom: 2 },
  volunteerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(96,165,250,0.15)',
    borderColor: 'rgba(96,165,250,0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    marginBottom: 3,
  },
  volunteerBadgeText: { fontSize: 10, color: '#93c5fd', fontWeight: '700' },
  cardDate: { fontSize: 11, color: 'rgba(232,245,233,0.4)', marginTop: 2 },
  qrPillBtn: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  qrPillText: { fontSize: 10, color: '#4ade80', fontWeight: '800' },

  cardRight: { alignItems: 'center' },
  countBig: { fontSize: 20, fontWeight: '900', color: '#4ade80' },
  countSub: { fontSize: 10, color: 'rgba(74,222,128,0.6)', fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 60, marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#e8f5e9', marginBottom: 8 },
  emptyText: { color: 'rgba(232,245,233,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  qrCardModal: {
    width: '100%', maxWidth: 380,
    borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.35)',
    overflow: 'hidden',
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTagBadge: { fontSize: 10, fontWeight: '900', color: '#4ade80', letterSpacing: 1 },
  modalTreeName: { fontSize: 19, fontWeight: '900', color: '#e8f5e9', marginTop: 4 },
  modalScientific: { fontSize: 12, fontStyle: 'italic', color: 'rgba(232,245,233,0.6)' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 10,
  },
  modalCloseBtnText: { color: '#e8f5e9', fontSize: 16, fontWeight: '700' },

  qrContainerBox: { alignItems: 'center', marginVertical: 16 },
  qrLoadingBox: { height: 180, justifyContent: 'center', alignItems: 'center' },
  qrLoadingText: { color: 'rgba(232,245,233,0.6)', fontSize: 12, marginTop: 10 },
  qrWhiteBadge: {
    backgroundColor: '#ffffff', borderRadius: 16,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  qrImage: { width: 170, height: 170 },
  qrScanPrompt: { fontSize: 10, fontWeight: '800', color: '#030a06', marginTop: 6, textTransform: 'uppercase' },

  modalDetailsBox: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
    padding: 12, marginBottom: 14,
  },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  modalDetailLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(232,245,233,0.4)', letterSpacing: 0.8 },
  modalDetailVal: { fontSize: 12, fontWeight: '700', color: '#e8f5e9' },

  modalActionButtons: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalShareBtn: { backgroundColor: '#4ade80' },
  modalWebBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  modalBtnText: { fontSize: 13, fontWeight: '800', color: '#020906' },
});
