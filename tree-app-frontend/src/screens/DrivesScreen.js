import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../api/client';

export default function DrivesScreen() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    try {
      const { data } = await api.get('/drives');
      setDrives(data);
    } catch (error) {
      console.log('Failed to load drives');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (drive) => {
    Alert.alert('Drive Joined! 🎉', `You have registered for ${drive.name}. Check your email for details.`);
  };

  const renderItem = ({ item }) => {
    const d = new Date(item.date);
    return (
      <BlurView intensity={20} tint="light" style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>📍 {item.location}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>{d.toLocaleString('default', { month: 'short' })}</Text>
            <Text style={styles.dateDay}>{d.getDate()}</Text>
          </View>
        </View>
        
        <Text style={styles.cardDesc}>{item.description}</Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.target}>Target: {item.targetTrees} trees</Text>
          <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(item)}>
            <Text style={styles.joinText}>Join Drive</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient colors={['#030a06', '#0a2315']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030a06', '#0a2315', '#030a06']} style={StyleSheet.absoluteFill} />
      
      <FlatList
        data={drives}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No upcoming drives right now. Check back soon!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030a06' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20 },
  
  card: { padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#e8f5e9', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: 'rgba(232,245,233,0.6)' },
  
  dateBox: { backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' },
  dateMonth: { fontSize: 10, color: '#4ade80', textTransform: 'uppercase', fontWeight: '800' },
  dateDay: { fontSize: 18, color: '#4ade80', fontWeight: '900' },
  
  cardDesc: { fontSize: 14, color: 'rgba(232,245,233,0.8)', marginBottom: 20, lineHeight: 20 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  target: { fontSize: 12, color: 'rgba(232,245,233,0.5)', fontWeight: '600' },
  joinBtn: { backgroundColor: '#4ade80', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  joinText: { color: '#030a06', fontSize: 14, fontWeight: '800' },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.5 },
  emptyText: { color: 'rgba(232,245,233,0.5)', fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
});
