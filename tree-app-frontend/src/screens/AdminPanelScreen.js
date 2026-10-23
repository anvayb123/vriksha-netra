import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Alert, TouchableOpacity, TextInput, Image, Modal,
  ScrollView, Share, Linking, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';

const { width } = Dimensions.get('window');

export default function AdminPanelScreen() {
  const [activeTab, setActiveTab] = useState('planted'); // 'planted' | 'database' | 'flagged'
  const [loading, setLoading] = useState(true);

  // Data states
  const [allTreeLogs, setAllTreeLogs] = useState([]);
  const [flaggedLogs, setFlaggedLogs] = useState([]);
  const [speciesList, setSpeciesList] = useState([]);
  const [plantDb, setPlantDb] = useState([]);

  // Search queries
  const [treeSearch, setTreeSearch] = useState('');
  const [plantSearch, setPlantSearch] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState('ALL');

  // QR Modal states
  const [selectedTree, setSelectedTree] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [logsRes, flaggedRes, speciesRes, plantsRes] = await Promise.all([
        api.get('/tree-logs').catch(() => ({ data: [] })),
        api.get('/admin/flagged').catch(() => ({ data: [] })),
        api.get('/species').catch(() => ({ data: [] })),
        api.get('/plants').catch(() => ({ data: [] })),
      ]);

      setAllTreeLogs(logsRes.data || []);
      setFlaggedLogs(flaggedRes.data || []);
      setSpeciesList(speciesRes.data || []);
      setPlantDb(plantsRes.data || []);
    } catch (err) {
      console.log('Failed to load admin data:', err);
      Alert.alert('Notice', 'Could not refresh some admin data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Generate & View QR Tag ──────────────────────────────────────────────
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

  // ─── Review Flagged Logs ─────────────────────────────────────────────────
  const handleResolve = async (logId, action) => {
    try {
      let resolvedSpeciesId = null;
      if (action === 'approve') {
        resolvedSpeciesId = speciesList[0]?._id;
      }

      await api.put(`/admin/review/${logId}`, {
        action,
        resolvedSpeciesId,
      });

      Alert.alert('Success', `Log ${action}d successfully`);
      loadAllAdminData();
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve log');
    }
  };

  // ─── Filtered Data ────────────────────────────────────────────────────────
  const filteredTreeLogs = allTreeLogs.filter((t) => {
    if (selectedVolunteer !== 'ALL') {
      const uId = String(t.user?._id || t.user || '');
      if (uId !== selectedVolunteer) return false;
    }
    const q = treeSearch.toLowerCase();
    const treeName = (t.species?.name || t.aiRawGuess || '').toLowerCase();
    const volunteer = (t.user?.name || '').toLowerCase();
    const email = (t.user?.email || '').toLowerCase();
    const drive = (t.drive?.name || '').toLowerCase();
    return treeName.includes(q) || volunteer.includes(q) || email.includes(q) || drive.includes(q);
  });

  const volunteerList = Array.from(
    new Map(
      allTreeLogs
        .filter((t) => t.user)
        .map((t) => [String(t.user._id || t.user), t.user?.name || 'Volunteer'])
    ).entries()
  );

  const filteredPlants = plantDb.filter((p) => {
    const q = plantSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.scientific.toLowerCase().includes(q) ||
      (p.hindi && p.hindi.includes(q))
    );
  });

  // Unique volunteer count
  const uniqueVolunteersCount = new Set(allTreeLogs.map((t) => t.user?._id || t.user)).size;

  // ─── Render Planted Tree Item ─────────────────────────────────────────────
  const renderPlantedTreeItem = ({ item }) => {
    const treeName = item.species?.name || item.aiRawGuess || 'Native Tree';
    const scientificName = item.species?.scientificName || '';
    const volunteerName = item.user?.name || 'Volunteer';
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const driveName = item.drive?.name || 'Independent Plantation';

    return (
      <View style={styles.treeCard}>
        <View style={styles.treeCardHeader}>
          <View style={styles.treePhotoWrap}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.treePhoto} />
            ) : (
              <Text style={styles.treeEmoji}>🌳</Text>
            )}
          </View>
          <View style={styles.treeMainInfo}>
            <Text style={styles.treeTitle} numberOfLines={1}>{treeName}</Text>
            {scientificName ? (
              <Text style={styles.treeScientific} numberOfLines={1}>{scientificName}</Text>
            ) : null}
            <View style={styles.planterRow}>
              <Text style={styles.planterBadge}>👤 {volunteerName}</Text>
              <Text style={styles.treeDate}>{dateStr}</Text>
            </View>
          </View>
        </View>

        <View style={styles.treeMetaRow}>
          <Text style={styles.treeMetaText} numberOfLines={1}>📍 {driveName}</Text>
          <Text style={styles.treeCountBadge}>×{item.count || 1} planted</Text>
        </View>

        {/* Generate / View QR Tag Button */}
        <TouchableOpacity
          style={styles.qrActionBtn}
          onPress={() => handleOpenQR(item)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#15803d', '#16a34a', '#22c55e']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.qrActionBtnIcon}>🏷️</Text>
          <Text style={styles.qrActionBtnText}>Generate & View QR Tag</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Render Botanical Plant Database Item ────────────────────────────────
  const renderPlantDbItem = ({ item }) => (
    <View style={styles.plantDbCard}>
      <View style={styles.plantDbLeft}>
        <Text style={{ fontSize: 24 }}>🌿</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.plantDbName}>{item.name}</Text>
        <Text style={styles.plantDbScientific}>{item.scientific} {item.hindi ? `• ${item.hindi}` : ''}</Text>
        <Text style={styles.plantDbUses} numberOfLines={2}>Uses: {item.uses || 'Ornamental, ecological'}</Text>
      </View>
      <View style={styles.plantTypePill}>
        <Text style={styles.plantTypePillText}>{item.type || 'Tree'}</Text>
      </View>
    </View>
  );

  // ─── Render Flagged Review Item ──────────────────────────────────────────
  const renderFlaggedItem = ({ item }) => (
    <BlurView intensity={20} tint="light" style={styles.flaggedCard}>
      <View style={styles.flaggedHeader}>
        <Text style={styles.flaggedTitle}>🚩 Flagged for Low Confidence</Text>
        <Text style={styles.flaggedDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.flaggedText}>
        AI Guess: <Text style={styles.flaggedHighlight}>{item.aiRawGuess || 'Unidentified'}</Text>
      </Text>
      <Text style={styles.flaggedText}>Planted by: {item.user?.name || 'Unknown'}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn]}
          onPress={() => handleResolve(item._id, 'reject')}
        >
          <Text style={styles.btnRejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.approveBtn]}
          onPress={() => handleResolve(item._id, 'approve')}
        >
          <Text style={styles.btnApproveText}>Approve as {speciesList[0]?.name || 'Tree'}</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Loading Admin Control Center...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />

      {/* Header & Stats Banner */}
      <View style={styles.headerArea}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>⚙️ Admin Control</Text>
            <Text style={styles.headerSubtitle}>Tree Plantation Registry & QR Tagging</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadAllAdminData}>
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Executive Stats Row */}
        <View style={styles.statsStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{allTreeLogs.length}</Text>
            <Text style={styles.statLbl}>Planted Trees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#60a5fa' }]}>{uniqueVolunteersCount}</Text>
            <Text style={styles.statLbl}>Volunteers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#facc15' }]}>{plantDb.length}</Text>
            <Text style={styles.statLbl}>Plant Species</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: flaggedLogs.length > 0 ? '#f87171' : '#4ade80' }]}>
              {flaggedLogs.length}
            </Text>
            <Text style={styles.statLbl}>Flagged</Text>
          </View>
        </View>

        {/* Segmented Tabs */}
        <View style={styles.tabsWrap}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'planted' && styles.tabBtnActive]}
            onPress={() => setActiveTab('planted')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'planted' && styles.tabBtnTextActive]}>
              📋 HISTORY ({allTreeLogs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'database' && styles.tabBtnActive]}
            onPress={() => setActiveTab('database')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'database' && styles.tabBtnTextActive]}>
              📚 Database ({plantDb.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'flagged' && styles.tabBtnActive]}
            onPress={() => setActiveTab('flagged')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'flagged' && styles.tabBtnTextActive]}>
              🚩 Flagged ({flaggedLogs.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── TAB 1: Planted Trees & QR Tags ─────────────────────────────── */}
      {activeTab === 'planted' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by tree, volunteer, or drive..."
              placeholderTextColor="rgba(232,245,233,0.3)"
              value={treeSearch}
              onChangeText={setTreeSearch}
            />
            {treeSearch.length > 0 && (
              <TouchableOpacity onPress={() => setTreeSearch('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Volunteer Filter Chips */}
          <View style={{ marginBottom: 10 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.volunteerChipsScroll}
            >
              <TouchableOpacity
                style={[styles.volChip, selectedVolunteer === 'ALL' && styles.volChipActive]}
                onPress={() => setSelectedVolunteer('ALL')}
              >
                <Text style={[styles.volChipText, selectedVolunteer === 'ALL' && styles.volChipTextActive]}>
                  👥 All Volunteers ({allTreeLogs.length})
                </Text>
              </TouchableOpacity>
              {volunteerList.map(([id, name]) => {
                const count = allTreeLogs.filter((t) => String(t.user?._id || t.user) === id).length;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.volChip, selectedVolunteer === id && styles.volChipActive]}
                    onPress={() => setSelectedVolunteer(id)}
                  >
                    <Text style={[styles.volChipText, selectedVolunteer === id && styles.volChipTextActive]}>
                      👤 {name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={filteredTreeLogs}
            keyExtractor={(item) => item._id}
            renderItem={renderPlantedTreeItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={styles.emptyText}>No planted trees match your search</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ── TAB 2: Botanical Plant Database ────────────────────────────── */}
      {activeTab === 'database' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search plant encyclopedia..."
              placeholderTextColor="rgba(232,245,233,0.3)"
              value={plantSearch}
              onChangeText={setPlantSearch}
            />
            {plantSearch.length > 0 && (
              <TouchableOpacity onPress={() => setPlantSearch('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredPlants}
            keyExtractor={(item, idx) => `${item.name}-${idx}`}
            renderItem={renderPlantDbItem}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {/* ── TAB 3: Flagged Reviews ─────────────────────────────────────── */}
      {activeTab === 'flagged' && (
        <FlatList
          data={flaggedLogs}
          keyExtractor={(item) => item._id}
          renderItem={renderFlaggedItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyText}>All caught up! No flagged logs to review.</Text>
            </View>
          }
        />
      )}

      {/* ── QR CODE MODAL ──────────────────────────────────────────────── */}
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

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTagBadge}>🏷️ OFFICIAL TREE REGISTRY TAG</Text>
                <Text style={styles.modalTreeName} numberOfLines={1}>
                  {qrData?.tree?.treeName || selectedTree?.species?.name || 'Planted Tree'}
                </Text>
                <Text style={styles.modalScientific}>
                  {qrData?.tree?.scientificName || selectedTree?.species?.scientificName || 'Native Species'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* QR Display Area */}
            <View style={styles.qrContainerBox}>
              {qrLoading ? (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color="#4ade80" />
                  <Text style={styles.qrLoadingText}>Generating High-Res QR Code...</Text>
                </View>
              ) : qrData?.qrCodeUrl ? (
                <View style={styles.qrWhiteBadge}>
                  <Image
                    source={{ uri: qrData.qrCodeUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrScanPrompt}>Scan with any camera or app</Text>
                </View>
              ) : (
                <Text style={{ color: '#ef4444' }}>Unable to load QR Code</Text>
              )}
            </View>

            {/* Planter & Tree Meta Details */}
            <View style={styles.modalDetailsBox}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>PLANTED BY</Text>
                <Text style={styles.modalDetailVal}>
                  👤 {qrData?.tree?.plantedBy || selectedTree?.user?.name || 'Green Volunteer'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>DATE & TIME</Text>
                <Text style={styles.modalDetailVal}>
                  📅 {selectedTree?.createdAt ? new Date(selectedTree.createdAt).toLocaleString() : 'Recent'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>TAG IDENTIFIER</Text>
                <Text style={[styles.modalDetailVal, { color: '#4ade80', fontFamily: 'monospace' }]}>
                  #TREE-{(selectedTree?._id || '').slice(-8).toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalShareBtn]}
                onPress={handleShareQR}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnText}>🔗 Share Public Tag</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalWebBtn]}
                onPress={handleOpenWeb}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: '#4ade80' }]}>🌐 Open Web Page</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020906' },
  loadingText: { color: 'rgba(232,245,233,0.6)', marginTop: 14, fontSize: 14 },

  headerArea: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#e8f5e9', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: 'rgba(232,245,233,0.5)', marginTop: 2 },
  refreshBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
  },
  refreshBtnText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 18, fontWeight: '900', color: '#4ade80' },
  statLbl: { fontSize: 10, color: 'rgba(232,245,233,0.5)', marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },

  tabsWrap: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  tabBtnActive: { backgroundColor: 'rgba(74,222,128,0.18)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.35)' },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(232,245,233,0.4)' },
  tabBtnTextActive: { color: '#4ade80' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 10, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: '#e8f5e9', fontSize: 14, paddingVertical: 10 },
  clearBtn: { color: 'rgba(232,245,233,0.4)', fontSize: 14, padding: 4 },

  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Planted Tree Card
  treeCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.15)',
  },
  treeCardHeader: { flexDirection: 'row', alignItems: 'center' },
  treePhotoWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginRight: 12,
  },
  treePhoto: { width: '100%', height: '100%' },
  treeEmoji: { fontSize: 26 },
  treeMainInfo: { flex: 1 },
  treeTitle: { fontSize: 16, fontWeight: '800', color: '#e8f5e9' },
  treeScientific: { fontSize: 12, fontStyle: 'italic', color: 'rgba(232,245,233,0.5)', marginTop: 1 },
  planterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  planterBadge: {
    fontSize: 11, fontWeight: '700', color: '#4ade80',
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  treeDate: { fontSize: 11, color: 'rgba(232,245,233,0.4)' },
  treeMetaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  treeMetaText: { fontSize: 12, color: 'rgba(232,245,233,0.5)', flex: 1 },
  treeCountBadge: { fontSize: 11, fontWeight: '800', color: '#facc15' },

  qrActionBtn: {
    marginTop: 12, borderRadius: 12, overflow: 'hidden',
    paddingVertical: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  qrActionBtnIcon: { fontSize: 16 },
  qrActionBtnText: { color: '#020906', fontSize: 13, fontWeight: '800' },

  // Plant Database Card
  plantDbCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  plantDbLeft: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(74,222,128,0.08)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  plantDbName: { fontSize: 15, fontWeight: '800', color: '#e8f5e9' },
  plantDbScientific: { fontSize: 11, color: 'rgba(232,245,233,0.5)', fontStyle: 'italic', marginTop: 2 },
  plantDbUses: { fontSize: 11, color: '#4ade80', marginTop: 4 },
  plantTypePill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, backgroundColor: 'rgba(74,222,128,0.12)',
    marginLeft: 8,
  },
  plantTypePillText: { fontSize: 9, fontWeight: '800', color: '#4ade80', textTransform: 'uppercase' },

  // Flagged card
  flaggedCard: {
    padding: 16, borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)',
    backgroundColor: 'rgba(250,204,21,0.05)',
  },
  flaggedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  flaggedTitle: { fontSize: 14, fontWeight: '800', color: '#facc15' },
  flaggedDate: { fontSize: 11, color: 'rgba(232,245,233,0.5)' },
  flaggedText: { fontSize: 13, color: '#e8f5e9', marginBottom: 4 },
  flaggedHighlight: { fontWeight: '800', color: '#facc15' },
  actionRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  rejectBtn: { borderWidth: 1, borderColor: '#ef4444', backgroundColor: 'transparent' },
  approveBtn: { backgroundColor: '#4ade80' },
  btnRejectText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },
  btnApproveText: { color: '#030a06', fontSize: 13, fontWeight: '800' },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyEmoji: { fontSize: 40, opacity: 0.5, marginBottom: 12 },
  emptyText: { color: 'rgba(232,245,233,0.4)', fontSize: 14 },

  // QR Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  qrCardModal: {
    width: '100%', maxWidth: 400,
    borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.35)',
    overflow: 'hidden',
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTagBadge: { fontSize: 10, fontWeight: '900', color: '#4ade80', letterSpacing: 1 },
  modalTreeName: { fontSize: 22, fontWeight: '900', color: '#e8f5e9', marginTop: 4 },
  modalScientific: { fontSize: 13, fontStyle: 'italic', color: 'rgba(232,245,233,0.6)' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseBtnText: { color: '#e8f5e9', fontSize: 16, fontWeight: '700' },

  qrContainerBox: { alignItems: 'center', marginVertical: 18 },
  qrLoadingBox: { height: 210, justifyContent: 'center', alignItems: 'center' },
  qrLoadingText: { color: 'rgba(232,245,233,0.6)', fontSize: 12, marginTop: 10 },
  qrWhiteBadge: {
    backgroundColor: '#ffffff', borderRadius: 18,
    padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  qrImage: { width: 190, height: 190 },
  qrScanPrompt: { fontSize: 10, fontWeight: '800', color: '#030a06', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  modalDetailsBox: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    padding: 12, marginBottom: 16,
  },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  modalDetailLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(232,245,233,0.4)', letterSpacing: 0.8 },
  modalDetailVal: { fontSize: 12, fontWeight: '700', color: '#e8f5e9' },

  modalActionButtons: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalShareBtn: { backgroundColor: '#4ade80' },
  modalWebBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  modalBtnText: { fontSize: 13, fontWeight: '800', color: '#020906' },

  volunteerChipsScroll: { paddingHorizontal: 16, gap: 8 },
  volChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  volChipActive: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: 'rgba(74,222,128,0.4)',
  },
  volChipText: { fontSize: 12, color: 'rgba(232,245,233,0.5)', fontWeight: '600' },
  volChipTextActive: { color: '#4ade80', fontWeight: '800' },
});
