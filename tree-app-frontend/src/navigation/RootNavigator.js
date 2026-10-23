import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import DrivesScreen from '../screens/DrivesScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import PlantEncyclopediaScreen from '../screens/PlantEncyclopediaScreen';
import CertificateScreen from '../screens/CertificateScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';

const Stack = createNativeStackNavigator();

// Premium header style shared across all screens
const HEADER_OPTS = {
  headerStyle: {
    backgroundColor: '#020906',
  },
  headerTintColor: '#4ade80',
  headerTitleStyle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#e8f5e9',
  },
  headerBackTitleVisible: false,
  headerShadowVisible: false,
};

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />
        <View style={styles.splashLogoRing}>
          <Text style={styles.splashEmoji}>🌿</Text>
        </View>
        <Text style={styles.splashTitle}>Vriksha Netra</Text>
        <ActivityIndicator size="small" color="#4ade80" style={{ marginTop: 32 }} />
        <Text style={styles.splashSub}>Loading your green world...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={HEADER_OPTS}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                title: 'Join Vriksha Netra',
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Encyclopedia"
              component={PlantEncyclopediaScreen}
              options={{ title: '🌿 Plant Encyclopedia' }}
            />
            <Stack.Screen
              name="Drives"
              component={DrivesScreen}
              options={{ title: '📅 Plantation Drives' }}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{ title: '📋 My Tree Logs' }}
            />
            <Stack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{ title: '🏆 Leaderboard' }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: '📊 My Statistics' }}
            />
            <Stack.Screen
              name="Certificate"
              component={CertificateScreen}
              options={{ title: '📜 My Certificate' }}
            />
            <Stack.Screen
              name="AdminPanel"
              component={AdminPanelScreen}
              options={{ title: '⚙️ Admin Panel' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashLogoRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.3)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.08)', marginBottom: 16,
  },
  splashEmoji: { fontSize: 44 },
  splashTitle: { fontSize: 28, fontWeight: '900', color: '#e8f5e9', letterSpacing: -0.5 },
  splashSub: { fontSize: 13, color: 'rgba(232,245,233,0.3)', marginTop: 10 },
});
