import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Modal, ScrollView, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';

const { width } = Dimensions.get('window');

export default function PlantEncyclopediaScreen() {
  const [plants, setPlants] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      const { data } = await api.get('/plants');
      setPlants(data);
    } catch (err) {
      console.log('Failed to load plants', err);
    }
  };

  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.scientific.toLowerCase().includes(search.toLowerCase()) ||
    p.hindi.includes(search)
  );

  const typeColors = {
    Tree: '#4ade80', Shrub: '#facc15', Herb: '#60a5fa',
    Palm: '#f97316', Grass: '#a78bfa', Succulent: '#fb923c', Aquatic: '#22d3ee',
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.7} style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.plantEmoji}>🌿</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.plantScientific} numberOfLines={1}>{item.scientific}</Text>
        <Text style={styles.plantHindi} numberOfLines={1}>{item.hindi}</Text>
      </View>
      <View style={[styles.typeBadge, { backgroundColor: (typeColors[item.type] || '#4ade80') + '18' }]}>
        <Text style={[styles.typeText, { color: typeColors[item.type] || '#4ade80' }]}>{item.type}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#030a06', '#0a2315', '#030a06']} style={StyleSheet.absoluteFill} />

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search (English, Hindi, Scientific)"
          placeholderTextColor="rgba(232,245,233,0.3)"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.countText}>{filtered.length} plants found</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>No plants found</Text>
          </View>
        }
      />

      {/* Plant Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#0d1f12', '#081c10']} style={StyleSheet.absoluteFill} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalEmoji}>🌳</Text>
              <Text style={styles.modalTitle}>{selected?.name}</Text>
              <Text style={styles.modalScientific}>{selected?.scientific}</Text>
              <Text style={styles.modalHindi}>{selected?.hindi}</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Family</Text>
                <Text style={styles.detailValue}>{selected?.family}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{selected?.type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Habitat</Text>
                <Text style={styles.detailValue}>{selected?.habitat}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Uses</Text>
                <Text style={styles.detailValue}>{selected?.uses}</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030a06' },

  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#e8f5e9', fontSize: 15, paddingVertical: 12 },
  clearBtn: { color: 'rgba(232,245,233,0.4)', fontSize: 16, padding: 4 },

  countText: { fontSize: 11, color: 'rgba(232,245,233,0.3)', marginLeft: 16, marginTop: 6, marginBottom: 8 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  cardLeft: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(74,222,128,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  plantEmoji: { fontSize: 18 },
  cardContent: { flex: 1 },
  plantName: { fontSize: 15, fontWeight: '700', color: '#e8f5e9' },
  plantScientific: { fontSize: 11, color: 'rgba(232,245,233,0.4)', fontStyle: 'italic', marginTop: 1 },
  plantHindi: { fontSize: 11, color: '#4ade80', marginTop: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  typeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.5 },
  emptyText: { color: 'rgba(232,245,233,0.4)', fontSize: 15 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, maxHeight: '80%', overflow: 'hidden' },
  modalEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#e8f5e9', textAlign: 'center' },
  modalScientific: { fontSize: 14, fontStyle: 'italic', color: 'rgba(232,245,233,0.5)', textAlign: 'center', marginTop: 2 },
  modalHindi: { fontSize: 16, color: '#4ade80', textAlign: 'center', marginTop: 2, marginBottom: 20 },

  detailRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 12 },
  detailLabel: { fontSize: 10, color: '#4ade80', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
  detailValue: { fontSize: 15, color: '#e8f5e9', lineHeight: 20 },

  closeBtn: { backgroundColor: '#4ade80', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  closeBtnText: { color: '#030a06', fontSize: 16, fontWeight: '800' },
});
