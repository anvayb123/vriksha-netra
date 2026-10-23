import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, ScrollView, TextInput,
  FlatList, Modal, Dimensions, Animated, Easing
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import api from '../api/client';
import PLANT_DATABASE from '../data/plantDatabase';
import { queueTreeLog } from '../utils/OfflineManager';

const { width, height } = Dimensions.get('window');
const VF_SIZE = width * 0.75;

// ─── Animated corner bracket ───────────────────────────────────────────────
function CornerBracket({ style, animated }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        ])
      ).start();
    }
  }, [animated]);
  const opacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  return <Animated.View style={[style, animated && { opacity }]} />;
}

// ─── Pulsing ring ──────────────────────────────────────────────────────────
function PulseRing({ color = '#4ade80', size = 260, delay = 0 }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 1800, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.8, duration: 0, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    />
  );
}

// ─── Scan beam ─────────────────────────────────────────────────────────────
function ScanBeam({ active }) {
  const beamY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(beamY, { toValue: VF_SIZE - 4, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(beamY, { toValue: 0, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      beamY.setValue(0);
    }
  }, [active]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.scanBeam, { transform: [{ translateY: beamY }] }]}
    />
  );
}

// ─── AI Status hint chip ───────────────────────────────────────────────────
function HintChip({ text, icon, color = '#4ade80' }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [text]);
  return (
    <Animated.View style={[styles.hintChip, { borderColor: color + '50', opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
      <Text style={styles.hintChipIcon}>{icon}</Text>
      <Text style={[styles.hintChipText, { color }]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Confidence ring ──────────────────────────────────────────────────────
function ConfidenceRing({ confidence = 0, size = 100 }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);
  const color = confidence >= 80 ? '#4ade80' : confidence >= 50 ? '#facc15' : '#f87171';
  return (
    <Animated.View style={[styles.confRingWrap, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.confRingOuter, { borderColor: color + '40', width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.confRingInner, { borderColor: color, width: size - 16, height: size - 16, borderRadius: (size - 16) / 2 }]}>
          <Text style={[styles.confPercent, { color, fontSize: size * 0.26 }]}>{confidence}%</Text>
          <Text style={[styles.confLabel, { fontSize: size * 0.12 }]}>match</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [step, setStep] = useState('mode');
  const [scanMode, setScanMode] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [plantResult, setPlantResult] = useState(null);
  const [speciesList, setSpeciesList] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [count, setCount] = useState('1');
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraHints, setCameraHints] = useState([]);
  const [location, setLocation] = useState(null);
  const [scannedTree, setScannedTree] = useState(null);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const qrLockRef = useRef(false);
  const liveIntervalRef = useRef(null);
  const hintTimerRef = useRef(null);

  // Result card slide-up animation
  const resultSlide = useRef(new Animated.Value(80)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSpecies();
    getLocation();
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    } catch (err) {
      console.log('Error fetching location:', err);
    }
  };

  const showResult = () => {
    Animated.parallel([
      Animated.spring(resultSlide, { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const loadSpecies = async () => {
    // Use local embedded database — always works, no network needed
    const mapped = PLANT_DATABASE.map(p => ({
      _id: p._id,
      name: p.name,
      commonNames: [p.name, p.hindi].filter(Boolean),
      scientificName: p.scientific,
      family: p.family,
    }));
    setSpeciesList(mapped);
  };

  // ── Camera hints cycling ─────────────────────────────────────────────────
  const startHints = () => {
    const hints = [
      { text: 'Detecting leaves...', icon: '🍃', color: '#4ade80' },
      { text: 'Good lighting ✓', icon: '☀️', color: '#facc15' },
      { text: 'Hold steady', icon: '📷', color: '#60a5fa' },
      { text: 'Analyzing plant...', icon: '🔬', color: '#a78bfa' },
    ];
    let i = 0;
    const cycle = () => {
      setCameraHints([hints[i % hints.length]]);
      i++;
      hintTimerRef.current = setTimeout(cycle, 2200);
    };
    cycle();
  };

  const stopHints = () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setCameraHints([]);
  };

  // ── Plant Identification (secure — via backend, no API key exposed) ──────
  const identifyPhoto = async (imageUri, base64Data) => {
    setStep('identifying');
    stopHints();

    try {
      let response;
      if (base64Data) {
        // Blazing-fast JSON payload with base64 — avoids React Native FormData boundary and timeout issues
        console.log('🚀 Sending base64 to /identify...');
        response = await api.post('/identify', {
          base64: base64Data,
        }, { timeout: 35000 });
      } else {
        // Fallback to FormData (without overriding Content-Type so Axios sets the correct boundary)
        console.log('📸 Sending FormData to /identify...');
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          name: 'plant.jpg',
          type: 'image/jpeg',
        });
        response = await api.post('/identify', formData, {
          timeout: 35000,
        });
      }

      const data = response.data;
      console.log('✅ Identification response:', data?.success, data?.commonName);

      if (data && (data.identified || data.success)) {
        const result = {
          identified: true,
          scientificName: data.scientificName || 'Unknown',
          commonName: data.commonName || 'Unknown',
          allCommonNames: data.allCommonNames || [],
          confidence: data.confidence || 85,
          family: data.family || 'Unknown',
          genus: data.genus || 'Unknown',
          type: data.type || 'Tree',
          healthStatus: data.healthStatus || 'Healthy',
          careTips: data.careTips || '',
          uses: data.uses || '',
          allResults: data.allResults || [],
          aiSource: data.aiSource || 'Groq Vision',
          localMatch: data.localMatch || null,
        };

        // Try to match with local species list for logging
        const commonName = data.commonName;
        let match = speciesList.find(s =>
          s.name.toLowerCase() === commonName.toLowerCase() ||
          (s.commonNames || []).some(cn => cn.toLowerCase().includes(commonName.toLowerCase()))
        );

        if (!match && data.scientificName) {
          match = speciesList.find(s =>
            s.scientificName?.toLowerCase() === data.scientificName.toLowerCase()
          );
        }

        if (match) {
          setSelectedSpecies(match);
        } else if (commonName && commonName !== 'Unknown') {
          // Dynamic species entry so it's auto-selected and displayed on Confirm screen!
          const dynamicSpecies = {
            _id: data.scientificName || commonName,
            name: commonName,
            scientificName: data.scientificName || commonName,
            commonNames: data.allCommonNames || [commonName],
            family: data.family || 'Unknown',
            isAiIdentified: true,
          };
          setSpeciesList(prev => [dynamicSpecies, ...prev.filter(p => p.name !== commonName)]);
          setSelectedSpecies(dynamicSpecies);
        }

        setPlantResult(result);
      } else {
        setPlantResult({
          identified: false,
          rawGuess: data?.message || 'Could not identify — select species manually',
        });
      }
    } catch (err) {
      console.log('Identify error:', err.message);
      const isNet = err.message?.toLowerCase().includes('network') || err.code === 'ERR_NETWORK';
      setPlantResult({
        identified: false,
        rawGuess: isNet
          ? 'Network error: ensure phone & PC are on the same Wi-Fi'
          : (err.response?.data?.message || err.message || 'Select species manually'),
      });
    }

    resultSlide.setValue(80);
    resultOpacity.setValue(0);
    setStep('result');
    setTimeout(showResult, 100);
  };

  // ── Camera actions ───────────────────────────────────────────────────────
  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
      setPhoto(result);
      await identifyPhoto(result.uri, result.base64);
    } catch (err) {
      console.log('Take picture error:', err);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhoto(asset);
        await identifyPhoto(asset.uri, asset.base64);
      }
    } catch (err) {
      console.log('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const startLiveScan = () => {
    setIsLiveScanning(true);
    startHints();
    liveIntervalRef.current = setInterval(async () => {
      if (cameraRef.current) {
        try {
          const result = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
          if (result && result.uri) {
            setPhoto(result);
            clearInterval(liveIntervalRef.current);
            liveIntervalRef.current = null;
            setIsLiveScanning(false);
            await identifyPhoto(result.uri, result.base64);
          }
        } catch (err) {
          console.log('Live scan capture failed, retrying...', err?.message);
          // Don't clear interval — keep retrying on next cycle
        }
      }
    }, 4000);
  };

  const stopLiveScan = () => {
    if (liveIntervalRef.current) { clearInterval(liveIntervalRef.current); liveIntervalRef.current = null; }
    setIsLiveScanning(false);
    stopHints();
  };

  const handleSave = async () => {
    setStep('saving');
    try {
      const formData = new FormData();
      if (photo) formData.append('photo', { uri: photo.uri, name: 'tree.jpg', type: 'image/jpeg' });
      if (selectedSpecies) formData.append('speciesId', selectedSpecies._id);
      formData.append('count', count || '1');
      if (plantResult?.commonName) formData.append('rawGuess', plantResult.commonName);
      if (plantResult?.confidence) formData.append('aiConfidence', String(plantResult.confidence));
      if (location) {
        formData.append('latitude', String(location.latitude));
        formData.append('longitude', String(location.longitude));
      }

      await api.post('/tree-logs', formData);
      Alert.alert('🌱 Tree Logged!', `${count || 1} tree(s) recorded successfully!`, [
        { text: 'Awesome!', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      // Network failed or server down — Queue it offline
      const logData = {
        photoUri: photo ? photo.uri : null,
        speciesId: selectedSpecies ? selectedSpecies._id : (plantResult?.commonName || null),
        count: count || '1',
        rawGuess: plantResult?.commonName || null,
        aiConfidence: plantResult?.confidence || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      };
      
      const queued = await queueTreeLog(logData);
      
      if (queued) {
        Alert.alert(
          '📶 Offline Mode', 
          'You seem to be offline. Your tree has been saved locally and will be synced when you have internet!', 
          [{ text: 'Got it', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Save Failed', 'Could not save the log locally. Please try again.');
        setStep('confirm');
      }
    }
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (qrLockRef.current || isScanningQr) return;
    qrLockRef.current = true;
    setIsScanningQr(true);

    try {
      let treeId = null;
      if (typeof data === 'string') {
        const match = data.match(/\/tree\/([a-fA-F0-9]{24})/);
        if (match) {
          treeId = match[1];
        } else if (data.startsWith('{')) {
          try {
            const parsed = JSON.parse(data);
            treeId = parsed.treeId || parsed._id || parsed.id;
          } catch (e) {}
        } else if (/^[a-fA-F0-9]{24}$/.test(data.trim())) {
          treeId = data.trim();
        }
      }

      if (!treeId) {
        Alert.alert(
          'QR Code Scanned',
          `Scanned Data:\n${data.slice(0, 100)}\n\nThis QR code is not recognized as an official Vriksha Netra tree tag.`,
          [{ text: 'Try Again', onPress: () => { qrLockRef.current = false; setIsScanningQr(false); } }]
        );
        return;
      }

      const res = await api.get(`/tree-logs/public/${treeId}`);
      if (res.data?.success && res.data.tree) {
        setScannedTree(res.data.tree);
      } else {
        Alert.alert('Not Found', 'No tree record found for this tag ID.', [
          { text: 'OK', onPress: () => { qrLockRef.current = false; setIsScanningQr(false); } }
        ]);
      }
    } catch (err) {
      Alert.alert('Scan Error', 'Unable to fetch tree details. Please check your network connection.', [
        { text: 'Retry', onPress: () => { qrLockRef.current = false; setIsScanningQr(false); } }
      ]);
    } finally {
      setIsScanningQr(false);
    }
  };

  const resetScan = () => {
    setStep('mode');
    setScanMode(null);
    setPhoto(null);
    setPlantResult(null);
    setSelectedSpecies(null);
    setCount('1');
    setTorchOn(false);
    stopLiveScan();
    setScannedTree(null);
    setIsScanningQr(false);
    qrLockRef.current = false;
    resultSlide.setValue(80);
    resultOpacity.setValue(0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <LinearGradient colors={['#030a06', '#0a1a0c']} style={StyleSheet.absoluteFill} />
        <View style={styles.permCard}>
          <Text style={styles.permEmoji}>📷</Text>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permDesc}>Allow camera access to scan and identify plants using AI</Text>
          <TouchableOpacity style={styles.glowBtn} onPress={requestPermission} activeOpacity={0.8}>
            <LinearGradient colors={['#4ade80', '#22c55e']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={styles.glowBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── MODE SELECTION ────────────────────────────────────────────────────────
  if (step === 'mode') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />

        {/* Decorative blobs */}
        <View style={styles.blobTL} />
        <View style={styles.blobBR} />

        <ScrollView contentContainerStyle={styles.modeScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.modeHeader}>
            <View style={styles.modeLogoRing}>
              <Text style={styles.modeLogoEmoji}>🌿</Text>
            </View>
            <Text style={styles.modeTitle}>Plant Scanner</Text>
            <Text style={styles.modeSubtitle}>AI-powered identification • PlantNet technology</Text>
          </View>

          {/* Live Scan */}
          <TouchableOpacity
            style={styles.modeBigCard}
            onPress={() => { setScanMode('live'); setStep('camera'); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#0f3d20', '#166534', '#15803d']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.modeCardGlow} />
            <View style={styles.modeCardInner}>
              <View style={styles.modeCardIconWrap}>
                <Text style={styles.modeCardIcon}>🔴</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.modeCardBadge}><Text style={styles.modeCardBadgeText}>RECOMMENDED</Text></View>
                <Text style={styles.modeCardTitle}>Live Scan</Text>
                <Text style={styles.modeCardDesc}>Auto-detects plants in real-time using continuous AI scanning</Text>
              </View>
              <Text style={styles.modeCardArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Photo Mode */}
          <TouchableOpacity
            style={styles.modeSmallCard}
            onPress={() => { setScanMode('photo'); setStep('camera'); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#0f1d3d', '#1e3a5f', '#1e40af']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={styles.modeSmallIcon}>📸</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeSmallTitle}>Take Photo</Text>
              <Text style={styles.modeSmallDesc}>Capture & identify instantly</Text>
            </View>
            <Text style={styles.modeCardArrow}>›</Text>
          </TouchableOpacity>

          {/* Gallery Mode */}
          <TouchableOpacity
            style={styles.modeSmallCard}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#2d0a2d', '#4a1942', '#7c2d7c']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={styles.modeSmallIcon}>🖼️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeSmallTitle}>From Gallery</Text>
              <Text style={styles.modeSmallDesc}>Pick an existing photo</Text>
            </View>
            <Text style={styles.modeCardArrow}>›</Text>
          </TouchableOpacity>

          {/* QR Code Mode */}
          <TouchableOpacity
            style={styles.modeSmallCard}
            onPress={() => { setScanMode('qr'); setStep('camera'); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#14331e', '#1c4d2c', '#15803d']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={styles.modeSmallIcon}>🏷️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeSmallTitle}>Scan Tree QR Tag</Text>
              <Text style={styles.modeSmallDesc}>Scan physical tag to reveal plant & volunteer info</Text>
            </View>
            <Text style={styles.modeCardArrow}>›</Text>
          </TouchableOpacity>

          <Text style={styles.modePoweredBy}>Powered by PlantNet AI • 300k+ species</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CAMERA VIEW ───────────────────────────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          ref={cameraRef}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={scanMode === 'qr' ? { barcodeTypes: ['qr'] } : undefined}
          onBarcodeScanned={scanMode === 'qr' ? handleBarcodeScanned : undefined}
        />

        {/* Full overlay */}
        <View style={[StyleSheet.absoluteFill, styles.camOverlay]}>
          {/* Top bar */}
          <SafeAreaView edges={['top']}>
            <View style={styles.camTopBar}>
              <TouchableOpacity onPress={resetScan} style={styles.camPill}>
                <Text style={styles.camPillText}>✕</Text>
              </TouchableOpacity>

              <View style={styles.camModeBadge}>
                <View style={[styles.camModeDot, { backgroundColor: scanMode === 'live' ? '#ef4444' : scanMode === 'qr' ? '#4ade80' : '#60a5fa' }]} />
                <Text style={styles.camModeText}>
                  {scanMode === 'live' ? 'LIVE SCAN' : scanMode === 'qr' ? 'QR SCANNER' : 'PHOTO MODE'}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setTorchOn(t => !t)} style={[styles.camPill, torchOn && styles.camPillActive]}>
                <Text style={styles.camPillText}>{torchOn ? '🔦' : '🔆'}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Viewfinder area */}
          <View style={styles.vfArea}>
            {/* Darkened sides */}
            <View style={styles.vfMask} />

            {/* Viewfinder box */}
            <View style={styles.vfBox}>
              {/* Pulse rings (show during live scan) */}
              {isLiveScanning && (
                <>
                  <PulseRing size={VF_SIZE + 30} delay={0} color="#4ade80" />
                  <PulseRing size={VF_SIZE + 60} delay={600} color="#4ade80" />
                </>
              )}

              {/* Animated scan beam */}
              <ScanBeam active={isLiveScanning || scanMode === 'qr'} />

              {/* Corner brackets */}
              <CornerBracket style={[styles.corner, styles.tlCorner]} animated={isLiveScanning || scanMode === 'qr'} />
              <CornerBracket style={[styles.corner, styles.trCorner]} animated={isLiveScanning || scanMode === 'qr'} />
              <CornerBracket style={[styles.corner, styles.blCorner]} animated={isLiveScanning || scanMode === 'qr'} />
              <CornerBracket style={[styles.corner, styles.brCorner]} animated={isLiveScanning || scanMode === 'qr'} />

              {/* Center crosshair */}
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
            </View>

            {/* Hint chips */}
            <View style={styles.hintChipsRow}>
              {cameraHints.map((h, i) => (
                <HintChip key={i} text={h.text} icon={h.icon} color={h.color} />
              ))}
            </View>

            {/* Status text */}
            <Text style={styles.vfStatusText}>
              {scanMode === 'qr'
                ? isScanningQr ? '⏳ Fetching tree & planter details...' : 'Align tree QR code within frame'
                : scanMode === 'live'
                ? isLiveScanning ? '🔴 Scanning — hold camera steady' : 'Tap START to begin live scan'
                : 'Center the plant in the frame'}
            </Text>
          </View>

          {/* Bottom controls */}
          <View style={styles.camBottomBar}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            {scanMode === 'qr' ? (
              <View style={styles.qrPromptWrap}>
                <Text style={styles.qrPromptIcon}>🏷️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrPromptTitle}>Point at any Tree QR Tag</Text>
                  <Text style={styles.qrPromptSub}>Automatically reads species info & volunteer who planted it</Text>
                </View>
              </View>
            ) : scanMode === 'live' ? (
              <TouchableOpacity
                style={[styles.liveBtn, isLiveScanning && styles.liveBtnActive]}
                onPress={isLiveScanning ? stopLiveScan : startLiveScan}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isLiveScanning ? ['#7f1d1d', '#ef4444'] : ['#166534', '#4ade80']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <View style={[styles.liveDot, { backgroundColor: isLiveScanning ? '#fff' : '#030a06' }]} />
                <Text style={[styles.liveBtnText, { color: isLiveScanning ? '#fff' : '#030a06' }]}>
                  {isLiveScanning ? '⏹ Stop Scanning' : '▶ Start Live Scan'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoControls}>
                <TouchableOpacity style={styles.sideBtn} onPress={pickImage} activeOpacity={0.8}>
                  <Text style={styles.sideBtnText}>🖼️</Text>
                  <Text style={styles.sideBtnLabel}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.85}>
                  <LinearGradient colors={['#4ade80', '#22c55e']} style={styles.captureGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={styles.captureInner} />
                </TouchableOpacity>

                <View style={styles.sideBtn}>
                  <Text style={styles.sideBtnText}>HD</Text>
                  <Text style={styles.sideBtnLabel}>Quality</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Scanned Tree Details Modal */}
        <Modal
          visible={!!scannedTree}
          transparent
          animationType="slide"
          onRequestClose={() => { setScannedTree(null); qrLockRef.current = false; }}
        >
          <View style={styles.qrScannedOverlay}>
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.qrScannedCard}>
              <LinearGradient colors={['#0d2818', '#030a06']} style={StyleSheet.absoluteFill} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Verification Header */}
                <View style={styles.scannedModalHeader}>
                  <View style={styles.verifiedTagBadge}>
                    <Text style={styles.verifiedTagText}>✓ VERIFIED TREE REGISTRY</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.qrModalCloseBtn}
                    onPress={() => { setScannedTree(null); qrLockRef.current = false; }}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Tree Photo / Icon */}
                <View style={styles.scannedPhotoWrap}>
                  {scannedTree?.photoUrl ? (
                    <Image source={{ uri: scannedTree.photoUrl }} style={styles.scannedPhoto} />
                  ) : (
                    <Text style={{ fontSize: 44 }}>🌳</Text>
                  )}
                </View>

                {/* Tree Title */}
                <Text style={styles.scannedTreeTitle}>{scannedTree?.treeName || 'Planted Tree'}</Text>
                <Text style={styles.scannedTreeSci}>
                  {scannedTree?.scientificName} {scannedTree?.hindiName ? `• ${scannedTree.hindiName}` : ''}
                </Text>

                {/* Planter Box */}
                <View style={styles.scannedPlanterBox}>
                  <View style={styles.scannedPlanterAvatar}>
                    <Text style={{ fontSize: 22 }}>🌱</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scannedPlanterLbl}>PLANTED WITH LOVE BY</Text>
                    <Text style={styles.scannedPlanterName}>{scannedTree?.plantedBy || 'Green Volunteer'}</Text>
                    <Text style={styles.scannedPlanterDate}>
                      📅 {scannedTree?.plantedDate ? new Date(scannedTree.plantedDate).toLocaleString() : 'Recently'}
                    </Text>
                  </View>
                </View>

                {/* Info Grid */}
                <View style={styles.scannedGrid}>
                  <View style={styles.scannedGridItem}>
                    <Text style={styles.scannedGridLbl}>DRIVE / EVENT</Text>
                    <Text style={styles.scannedGridVal}>{scannedTree?.driveName || 'Community Drive'}</Text>
                  </View>
                  <View style={styles.scannedGridItem}>
                    <Text style={styles.scannedGridLbl}>SPECIES TYPE</Text>
                    <Text style={styles.scannedGridVal}>{scannedTree?.type || 'Native Tree'}</Text>
                  </View>
                  {scannedTree?.family ? (
                    <View style={styles.scannedGridItem}>
                      <Text style={styles.scannedGridLbl}>FAMILY</Text>
                      <Text style={styles.scannedGridVal}>{scannedTree.family}</Text>
                    </View>
                  ) : null}
                  {scannedTree?.location?.coordinates ? (
                    <View style={styles.scannedGridItem}>
                      <Text style={styles.scannedGridLbl}>GPS COORDS</Text>
                      <Text style={[styles.scannedGridVal, { color: '#4ade80' }]}>
                        {scannedTree.location.coordinates[1]?.toFixed(4)}°, {scannedTree.location.coordinates[0]?.toFixed(4)}°
                      </Text>
                    </View>
                  ) : null}
                </View>

                {scannedTree?.uses ? (
                  <View style={styles.scannedUsesBox}>
                    <Text style={styles.scannedGridLbl}>ECOLOGICAL & MEDICINAL USES</Text>
                    <Text style={styles.scannedUsesVal}>{scannedTree.uses}</Text>
                  </View>
                ) : null}

                {/* Impact Strip */}
                <View style={styles.scannedImpactStrip}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.scannedImpactVal}>~22 kg/yr</Text>
                    <Text style={styles.scannedImpactLbl}>CO₂ Absorbed</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.scannedImpactVal}>100+ L/day</Text>
                    <Text style={styles.scannedImpactLbl}>Oxygen Output</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.scannedBtnRow}>
                  <TouchableOpacity
                    style={styles.scannedRescanBtn}
                    onPress={() => { setScannedTree(null); qrLockRef.current = false; }}
                  >
                    <Text style={styles.scannedRescanText}>📷 Scan Another QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.scannedDoneBtn}
                    onPress={() => { setScannedTree(null); qrLockRef.current = false; resetScan(); }}
                  >
                    <Text style={styles.scannedDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── IDENTIFYING ───────────────────────────────────────────────────────────
  if (step === 'identifying') {
    return (
      <View style={styles.container}>
        {photo && <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} blurRadius={20} />}
        <LinearGradient colors={['rgba(3,10,6,0.85)', 'rgba(3,10,6,0.95)']} style={StyleSheet.absoluteFill} />

        <View style={styles.idCenter}>
          <View style={styles.idRingOuter}>
            <View style={styles.idRingInner}>
              <ActivityIndicator size="large" color="#4ade80" />
            </View>
          </View>
          <Text style={styles.idTitle}>Identifying Plant</Text>
          <Text style={styles.idSub}>Using PlantNet AI • 300k+ species database</Text>

          <View style={styles.idSteps}>
            {['Analyzing leaf structure', 'Matching species patterns', 'Calculating confidence'].map((s, i) => (
              <View key={i} style={styles.idStep}>
                <ActivityIndicator size="small" color={i === 0 ? '#4ade80' : 'rgba(255,255,255,0.2)'} />
                <Text style={[styles.idStepText, { color: i === 0 ? '#4ade80' : 'rgba(255,255,255,0.3)' }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (step === 'result') {
    return (
      <View style={styles.container}>
        {/* Background image */}
        {photo && <Image source={{ uri: photo.uri }} style={styles.resultBg} blurRadius={15} />}
        <LinearGradient
          colors={['rgba(3,10,6,0.4)', 'rgba(3,10,6,0.92)', '#030a06']}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Top back button */}
          <View style={styles.resultTopBar}>
            <TouchableOpacity onPress={resetScan} style={styles.camPill}>
              <Text style={styles.camPillText}>← Scan Again</Text>
            </TouchableOpacity>
            <Text style={styles.resultTopLabel}>AI Result</Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Photo thumbnail */}
            {photo && (
              <View style={styles.resultPhotoWrap}>
                <Image source={{ uri: photo.uri }} style={styles.resultPhoto} />
                <LinearGradient colors={['transparent', 'rgba(3,10,6,0.9)']} style={styles.resultPhotoGrad} />
              </View>
            )}

            {/* Slide-up result card */}
            <Animated.View style={{ transform: [{ translateY: resultSlide }], opacity: resultOpacity }}>
              {plantResult?.identified ? (
                <View style={styles.resultCard}>
                  {/* Confidence ring */}
                  <View style={styles.confRow}>
                    <ConfidenceRing confidence={plantResult.confidence} size={90} />
                    <View style={{ flex: 1, paddingLeft: 16 }}>
                      <Text style={styles.resultName}>{plantResult.commonName}</Text>
                      <Text style={styles.resultSci}>{plantResult.scientificName}</Text>
                      {plantResult.aiSource && (
                        <Text style={{ color: '#4ade80', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
                          ✨ Identified by {plantResult.aiSource}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Info pills */}
                  <View style={styles.pillRow}>
                    {plantResult.family && plantResult.family !== 'Unknown' && (
                      <View style={styles.pill}><Text style={styles.pillLabel}>Family</Text><Text style={styles.pillVal}>{plantResult.family}</Text></View>
                    )}
                    {plantResult.genus && plantResult.genus !== 'Unknown' && (
                      <View style={[styles.pill, { borderColor: 'rgba(96,165,250,0.3)', backgroundColor: 'rgba(96,165,250,0.08)' }]}>
                        <Text style={[styles.pillLabel, { color: '#60a5fa' }]}>Genus</Text>
                        <Text style={styles.pillVal}>{plantResult.genus}</Text>
                      </View>
                    )}
                  </View>

                  {/* Common names */}
                  {plantResult.allCommonNames?.length > 0 && (
                    <View style={styles.commonNamesRow}>
                      {plantResult.allCommonNames.slice(0, 4).map((n, i) => (
                        <View key={i} style={styles.nameTag}>
                          <Text style={styles.nameTagText}>{n}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Health status & Hindi name */}
                  <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {plantResult.healthStatus && plantResult.healthStatus !== 'Unknown' && (
                      <View style={[styles.pill, { borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)' }]}>
                        <Text style={[styles.pillLabel, { color: '#4ade80' }]}>Condition</Text>
                        <Text style={[styles.pillVal, { color: '#4ade80' }]}>🌿 {plantResult.healthStatus}</Text>
                      </View>
                    )}
                    {plantResult.localMatch?.hindi && (
                      <View style={[styles.pill, { borderColor: '#facc15', backgroundColor: 'rgba(250,204,21,0.1)' }]}>
                        <Text style={[styles.pillLabel, { color: '#facc15' }]}>Hindi</Text>
                        <Text style={[styles.pillVal, { color: '#facc15' }]}>{plantResult.localMatch.hindi}</Text>
                      </View>
                    )}
                  </View>

                  {/* Care tips & uses if available */}
                  {(plantResult.careTips || plantResult.uses) ? (
                    <View style={{ marginTop: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10 }}>
                      {plantResult.careTips ? (
                        <View style={{ marginBottom: plantResult.uses ? 6 : 0 }}>
                          <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>💡 Care & Sunlight</Text>
                          <Text style={{ color: '#e2e8f0', fontSize: 12, marginTop: 2 }}>{plantResult.careTips}</Text>
                        </View>
                      ) : null}
                      {plantResult.uses ? (
                        <View>
                          <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>🌿 Uses & Significance</Text>
                          <Text style={{ color: '#e2e8f0', fontSize: 12, marginTop: 2 }}>{plantResult.uses}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Other possibilities */}
                  {plantResult.allResults?.length > 1 && (
                    <View style={styles.altResults}>
                      <Text style={styles.altTitle}>OTHER POSSIBILITIES</Text>
                      {plantResult.allResults.slice(1, 4).map((r, i) => (
                        <View key={i} style={styles.altRow}>
                          <View style={[styles.altBar, { width: `${r.score}%`, maxWidth: '60%' }]} />
                          <Text style={styles.altName}>{r.common || r.name}</Text>
                          <Text style={styles.altScore}>{r.score}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.resultCard, styles.warnCard]}>
                  <Text style={styles.warnEmoji}>⚠️</Text>
                  <Text style={styles.warnTitle}>Could Not Identify</Text>
                  <Text style={styles.warnDesc}>
                    {plantResult?.rawGuess ? `Best guess: ${plantResult.rawGuess}` : 'Please select the species manually below'}
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('confirm')} activeOpacity={0.85}>
                <LinearGradient colors={['#4ade80', '#22c55e']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Text style={styles.primaryBtnText}>🌱 Log This Tree</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ghostBtn} onPress={resetScan} activeOpacity={0.8}>
                <Text style={styles.ghostBtnText}>Scan Again</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── CONFIRM & SAVE ────────────────────────────────────────────────────────
  if (step === 'confirm' || step === 'saving') {
    const filteredSpecies = speciesList.filter(s =>
      s.name.toLowerCase().includes(speciesSearch.toLowerCase())
    );

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#020906', '#041410', '#020906']} style={StyleSheet.absoluteFill} />

        <ScrollView contentContainerStyle={styles.confirmScroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.confirmHeader}>
            <Text style={styles.confirmEmoji}>🌳</Text>
            <Text style={styles.confirmTitle}>Confirm & Log Tree</Text>
            <Text style={styles.confirmSub}>Review the details before saving your tree log</Text>
          </View>

          {/* Plant identified card */}
          {plantResult?.identified && (
            <BlurView intensity={20} tint="dark" style={styles.identifiedBanner}>
              <Text style={styles.identifiedIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.identifiedName}>{plantResult.commonName}</Text>
                <Text style={styles.identifiedSci}>{plantResult.scientificName} • {plantResult.confidence}% confidence</Text>
              </View>
            </BlurView>
          )}

          {/* Species field */}
          <Text style={styles.fieldLabel}>SPECIES</Text>
          <TouchableOpacity style={styles.fieldInput} onPress={() => setShowSpeciesPicker(true)} activeOpacity={0.8}>
            <Text style={selectedSpecies ? styles.fieldText : styles.fieldPlaceholder}>
              {selectedSpecies ? selectedSpecies.name : (plantResult?.commonName || '+ Select species')}
            </Text>
            <Text style={{ color: '#4ade80', fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          {/* Count field */}
          <Text style={styles.fieldLabel}>NUMBER OF TREES PLANTED</Text>
          <View style={styles.countRow}>
            <TouchableOpacity
              style={styles.countBtn}
              onPress={() => setCount(c => String(Math.max(1, parseInt(c || '1') - 1)))}
            >
              <Text style={styles.countBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.countInput}
              value={count}
              onChangeText={setCount}
              keyboardType="number-pad"
              placeholderTextColor="rgba(255,255,255,0.3)"
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.countBtn}
              onPress={() => setCount(c => String(parseInt(c || '0') + 1))}
            >
              <Text style={styles.countBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.primaryBtn, step === 'saving' && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={step === 'saving'}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#4ade80', '#22c55e']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            {step === 'saving'
              ? <ActivityIndicator color="#030a06" />
              : <Text style={styles.primaryBtnText}>💾 Save Tree Log</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('result')} activeOpacity={0.8}>
            <Text style={styles.ghostBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Species Picker Modal */}
        <Modal visible={showSpeciesPicker} animationType="slide" statusBarTranslucent>
          <SafeAreaView style={styles.modalContainer} edges={['top']}>
            <LinearGradient colors={['#020906', '#041410']} style={StyleSheet.absoluteFill} />
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitle}>Select Species</Text>
              <TouchableOpacity onPress={() => setShowSpeciesPicker(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchWrap}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search species..."
                placeholderTextColor="rgba(232,245,233,0.25)"
                value={speciesSearch}
                onChangeText={setSpeciesSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredSpecies}
              keyExtractor={(i) => i._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalRow, selectedSpecies?._id === item._id && styles.modalRowSelected]}
                  onPress={() => { setSelectedSpecies(item); setShowSpeciesPicker(false); }}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalRowLeft}>
                    <Text style={styles.modalRowEmoji}>🌿</Text>
                    <View>
                      <Text style={styles.modalRowText}>{item.name}</Text>
                      {item.commonNames?.[0] && <Text style={styles.modalRowSub}>{item.commonNames[0]}</Text>}
                    </View>
                  </View>
                  {selectedSpecies?._id === item._id && <Text style={{ color: '#4ade80', fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020906' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020906' },

  // Permission
  permCard: {
    margin: 24, padding: 32, borderRadius: 24, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.15)',
  },
  permEmoji: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 22, fontWeight: '800', color: '#e8f5e9', marginBottom: 10 },
  permDesc: { fontSize: 14, color: 'rgba(232,245,233,0.5)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  glowBtn: {
    overflow: 'hidden', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  glowBtnText: { color: '#030a06', fontSize: 16, fontWeight: '800' },

  // Blobs
  blobTL: {
    position: 'absolute', top: -80, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(74,222,128,0.05)',
  },
  blobBR: {
    position: 'absolute', bottom: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.04)',
  },

  // Mode
  modeScroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  modeHeader: { alignItems: 'center', marginBottom: 32, paddingTop: 10 },
  modeLogoRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1.5, borderColor: 'rgba(74,222,128,0.3)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  modeLogoEmoji: { fontSize: 34 },
  modeTitle: { fontSize: 26, fontWeight: '900', color: '#e8f5e9', letterSpacing: -0.5 },
  modeSubtitle: { fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 6, textAlign: 'center' },

  modeBigCard: {
    borderRadius: 22, overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
  },
  modeCardGlow: {
    position: 'absolute', top: 0, right: 0, width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(74,222,128,0.08)',
  },
  modeCardInner: { flexDirection: 'row', alignItems: 'center', padding: 22 },
  modeCardIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  modeCardIcon: { fontSize: 28 },
  modeCardBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(74,222,128,0.2)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6,
  },
  modeCardBadgeText: { color: '#4ade80', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  modeCardTitle: { fontSize: 18, fontWeight: '800', color: '#e8f5e9' },
  modeCardDesc: { fontSize: 12, color: 'rgba(232,245,233,0.55)', marginTop: 3, lineHeight: 17 },
  modeCardArrow: { fontSize: 28, color: 'rgba(255,255,255,0.4)', marginLeft: 8 },

  modeSmallCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, overflow: 'hidden', marginBottom: 12,
    paddingHorizontal: 20, paddingVertical: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modeSmallIcon: { fontSize: 28, marginRight: 16 },
  modeSmallTitle: { fontSize: 16, fontWeight: '800', color: '#e8f5e9' },
  modeSmallDesc: { fontSize: 12, color: 'rgba(232,245,233,0.5)', marginTop: 2 },
  modePoweredBy: { textAlign: 'center', color: 'rgba(232,245,233,0.2)', fontSize: 11, marginTop: 20 },

  // Camera
  camOverlay: { flexDirection: 'column', justifyContent: 'space-between' },
  camTopBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  camPill: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  camPillActive: { backgroundColor: 'rgba(250,204,21,0.25)', borderColor: 'rgba(250,204,21,0.5)' },
  camPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  camModeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  camModeDot: { width: 8, height: 8, borderRadius: 4 },
  camModeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Viewfinder
  vfArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vfMask: { position: 'absolute', ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  vfBox: {
    width: VF_SIZE, height: VF_SIZE,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute', width: 36, height: 36, borderColor: '#4ade80', borderWidth: 3,
  },
  tlCorner: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 6 },
  trCorner: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 6 },
  blCorner: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 6 },
  brCorner: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 6 },

  scanBeam: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80', shadowRadius: 12, shadowOpacity: 1, elevation: 8,
  },
  crosshairH: {
    position: 'absolute', left: '20%', right: '20%', height: 1,
    backgroundColor: 'rgba(74,222,128,0.2)',
  },
  crosshairV: {
    position: 'absolute', top: '20%', bottom: '20%', width: 1,
    backgroundColor: 'rgba(74,222,128,0.2)',
  },

  hintChipsRow: { position: 'absolute', bottom: -50, flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  hintChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  hintChipIcon: { fontSize: 14 },
  hintChipText: { fontSize: 12, fontWeight: '700' },

  vfStatusText: {
    position: 'absolute', bottom: -90,
    color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500', textAlign: 'center',
  },

  // Camera bottom
  camBottomBar: {
    height: 140, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  liveBtn: {
    overflow: 'hidden', borderRadius: 32,
    paddingHorizontal: 40, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  liveBtnActive: {},
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveBtnText: { fontSize: 16, fontWeight: '800' },
  photoControls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around', width: '100%', paddingHorizontal: 30,
  },
  sideBtn: { alignItems: 'center', width: 60 },
  sideBtnText: { fontSize: 24, marginBottom: 4 },
  sideBtnLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  captureBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  captureGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 40 },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.9)' },

  // Identifying
  idCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  idRingOuter: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  idRingInner: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.5)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.05)',
  },
  idTitle: { fontSize: 22, fontWeight: '800', color: '#e8f5e9', marginBottom: 8 },
  idSub: { fontSize: 13, color: 'rgba(232,245,233,0.4)', marginBottom: 32, textAlign: 'center' },
  idSteps: { gap: 14, width: '100%' },
  idStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  idStepText: { fontSize: 13, fontWeight: '500' },

  // Result
  resultBg: { position: 'absolute', width: '100%', height: height * 0.5 },
  resultTopBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  resultTopLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  resultScroll: { paddingHorizontal: 16, paddingBottom: 40 },
  resultPhotoWrap: { height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  resultPhoto: { width: '100%', height: '100%' },
  resultPhotoGrad: { ...StyleSheet.absoluteFillObject },

  resultCard: {
    backgroundColor: 'rgba(10,26,16,0.95)', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)',
    padding: 22, marginBottom: 16,
  },
  confRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  confRingWrap: { alignItems: 'center', justifyContent: 'center' },
  confRingOuter: {
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  confRingInner: {
    borderWidth: 3, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  confPercent: { fontWeight: '900', lineHeight: undefined },
  confLabel: { color: 'rgba(255,255,255,0.4)', fontWeight: '600', lineHeight: undefined },

  resultName: { fontSize: 22, fontWeight: '900', color: '#e8f5e9', marginBottom: 4 },
  resultSci: { fontSize: 13, fontStyle: 'italic', color: 'rgba(232,245,233,0.5)' },

  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.08)',
    padding: 12,
  },
  pillLabel: { fontSize: 10, color: '#4ade80', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  pillVal: { fontSize: 13, color: '#e8f5e9', fontWeight: '600' },

  commonNamesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  nameTag: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  nameTagText: { color: 'rgba(232,245,233,0.7)', fontSize: 12, fontWeight: '500' },

  altResults: {
    paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 10,
  },
  altTitle: { fontSize: 10, color: 'rgba(232,245,233,0.3)', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  altBar: { height: 4, backgroundColor: 'rgba(74,222,128,0.3)', borderRadius: 2 },
  altName: { flex: 1, fontSize: 13, color: 'rgba(232,245,233,0.65)' },
  altScore: { fontSize: 12, color: '#4ade80', fontWeight: '700', width: 34 },

  warnCard: { backgroundColor: 'rgba(30,20,10,0.95)', borderColor: 'rgba(250,204,21,0.2)', alignItems: 'center' },
  warnEmoji: { fontSize: 44, marginBottom: 12 },
  warnTitle: { fontSize: 20, fontWeight: '800', color: '#fbbf24', marginBottom: 8 },
  warnDesc: { fontSize: 14, color: 'rgba(232,245,233,0.55)', textAlign: 'center', lineHeight: 20 },

  primaryBtn: {
    overflow: 'hidden', borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
  },
  primaryBtnText: { color: '#030a06', fontSize: 16, fontWeight: '800' },
  ghostBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, marginBottom: 12,
  },
  ghostBtnText: { color: 'rgba(232,245,233,0.6)', fontSize: 15, fontWeight: '600' },

  // Confirm
  confirmScroll: { padding: 20, paddingBottom: 60 },
  confirmHeader: { alignItems: 'center', marginBottom: 28 },
  confirmEmoji: { fontSize: 48, marginBottom: 10 },
  confirmTitle: { fontSize: 24, fontWeight: '900', color: '#e8f5e9', marginBottom: 6 },
  confirmSub: { fontSize: 13, color: 'rgba(232,245,233,0.4)', textAlign: 'center' },

  identifiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', overflow: 'hidden',
  },
  identifiedIcon: { fontSize: 24 },
  identifiedName: { fontSize: 16, fontWeight: '700', color: '#e8f5e9' },
  identifiedSci: { fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 2 },

  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#4ade80', marginBottom: 10, letterSpacing: 1.5 },
  fieldInput: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
    padding: 18, marginBottom: 22,
  },
  fieldText: { color: '#e8f5e9', fontSize: 16, fontWeight: '600' },
  fieldPlaceholder: { color: 'rgba(232,245,233,0.3)', fontSize: 16 },

  countRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  countBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(74,222,128,0.12)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
  },
  countBtnText: { fontSize: 22, color: '#4ade80', fontWeight: '700' },
  countInput: {
    flex: 1, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', color: '#e8f5e9', fontSize: 20, fontWeight: '800',
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#020906' },
  modalTopBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#e8f5e9' },
  modalClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center',
  },
  modalCloseText: { fontSize: 14, color: '#e8f5e9', fontWeight: '700' },
  modalSearchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 12,
  },
  modalSearchIcon: { fontSize: 16 },
  modalSearchInput: { flex: 1, color: '#e8f5e9', fontSize: 15 },
  modalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
  },
  modalRowSelected: { backgroundColor: 'rgba(74,222,128,0.08)' },
  modalRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalRowEmoji: { fontSize: 22 },
  modalRowText: { fontSize: 16, color: '#e8f5e9', fontWeight: '600' },
  modalRowSub: { fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 2 },
  modalSep: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 20 },

  // QR Mode Controls
  qrPromptWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
  },
  qrPromptIcon: { fontSize: 26 },
  qrPromptTitle: { fontSize: 15, fontWeight: '800', color: '#4ade80' },
  qrPromptSub: { fontSize: 12, color: 'rgba(232,245,233,0.6)', marginTop: 2 },

  // Scanned Tree Modal
  qrScannedOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  qrScannedCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '88%',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    overflow: 'hidden',
  },
  scannedModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  verifiedTagBadge: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 1, borderColor: '#4ade80',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  verifiedTagText: { color: '#4ade80', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  qrModalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  scannedPhotoWrap: {
    width: '100%', height: 180, borderRadius: 18,
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 16,
  },
  scannedPhoto: { width: '100%', height: '100%' },

  scannedTreeTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  scannedTreeSci: { fontSize: 14, fontStyle: 'italic', color: 'rgba(232,245,233,0.6)', textAlign: 'center', marginTop: 3 },

  scannedPlanterBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
    borderRadius: 18, padding: 14, marginVertical: 16,
  },
  scannedPlanterAvatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scannedPlanterLbl: { fontSize: 10, fontWeight: '800', color: '#4ade80', letterSpacing: 1 },
  scannedPlanterName: { fontSize: 17, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  scannedPlanterDate: { fontSize: 11, color: 'rgba(232,245,233,0.5)', marginTop: 2 },

  scannedGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14,
  },
  scannedGridItem: {
    flex: 1, minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12,
  },
  scannedGridLbl: { fontSize: 9, fontWeight: '800', color: '#4ade80', letterSpacing: 1, marginBottom: 4 },
  scannedGridVal: { fontSize: 13, fontWeight: '700', color: '#e8f5e9' },

  scannedUsesBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  scannedUsesVal: { fontSize: 13, color: '#e8f5e9', lineHeight: 18, marginTop: 4 },

  scannedImpactStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14, paddingVertical: 12, marginBottom: 18,
  },
  scannedImpactVal: { fontSize: 16, fontWeight: '900', color: '#4ade80' },
  scannedImpactLbl: { fontSize: 10, color: 'rgba(232,245,233,0.5)', marginTop: 2, fontWeight: '600' },

  scannedBtnRow: { flexDirection: 'row', gap: 10 },
  scannedRescanBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  scannedRescanText: { color: '#4ade80', fontSize: 14, fontWeight: '800' },
  scannedDoneBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#4ade80',
    alignItems: 'center', justifyContent: 'center',
  },
  scannedDoneText: { color: '#020906', fontSize: 14, fontWeight: '800' },
});
