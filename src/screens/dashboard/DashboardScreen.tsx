import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Text, Card, Switch, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggleButton } from '../../components/LanguageToggleButton';
import { WeatherCard } from '../../components/WeatherCard';
import { PulsingDot } from '../../components/PulsingDot';
import { fetchFarmWeather, WeatherData } from '../../services/weatherService';
import { SensorData, PumpStatus } from '../../types';
import { formatTimestamp, getMoistureStatus, getTemperatureStatus } from '../../utils/helpers';

const DashboardScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();

  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [pumpStatus, setPumpStatus] = useState<PumpStatus | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [pumpLoading, setPumpLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sensorLoading, setSensorLoading] = useState(true);

  // Animation values
  const pumpCardScale = useRef(new Animated.Value(1)).current;
  const cardsFadeAnim = useRef(new Animated.Value(0)).current;

  // ── Load weather ──────────────────────────────────────────
  const loadWeather = async () => {
    try {
      setWeatherLoading(true);
      const data = await fetchFarmWeather();
      setWeather(data);
    } catch {
      // ignore
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  // ── Fade in animation on load ─────────────────────────────
  useEffect(() => {
    Animated.timing(cardsFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Live sensor listener ──────────────────────────────────
  useEffect(() => {
    const sensorRef = ref(db, 'sensors/latest');
    const unsub = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val() as SensorData | null;
      setSensorData(data);
      setSensorLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Live pump status listener ─────────────────────────────
  useEffect(() => {
    const pumpRef = ref(db, 'pump/status');
    const unsub = onValue(pumpRef, (snapshot) => {
      const data = snapshot.val() as PumpStatus | null;
      setPumpStatus(data);
    });
    return () => unsub();
  }, []);

  // ── Toggle pump with scale animation ──────────────────────
  const togglePump = async () => {
    if (!user) return;
    setPumpLoading(true);

    // Subtle press animation
    Animated.sequence([
      Animated.timing(pumpCardScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pumpCardScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const newStatus: PumpStatus = {
        isOn: !pumpStatus?.isOn,
        lastChanged: Date.now(),
        changedBy: user.email ?? 'unknown',
      };
      await set(ref(db, 'pump/status'), newStatus);
    } catch {
      // silently fail — listener will keep state consistent
    } finally {
      setPumpLoading(false);
    }
  };

  // ── Pull-to-refresh ───────────────────────────────────────
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWeather();
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const displayName =
    user?.displayName ?? userProfile?.displayName ?? 'Farmer';
  const farmName = userProfile?.farmName ?? '';

  const moistureStatus = sensorData
    ? getMoistureStatus(sensorData.soilMoisture, t)
    : null;
  const tempStatus = sensorData
    ? getTemperatureStatus(sensorData.temperature, t)
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#388E3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{t('greeting')}, {displayName} 👋</Text>
          {farmName ? (
            <Text style={styles.farmLabel}>🌾 {farmName}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <LanguageToggleButton variant="glass" />
          <Text style={styles.headerEmoji}>🚜</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2E7D32']}
            tintColor="#2E7D32"
          />
        }
      >
        {/* ── Feature 2: Weather & Rain Advisory Card ── */}
        <Animated.View style={{ opacity: cardsFadeAnim }}>
          <WeatherCard weather={weather} loading={weatherLoading} />
        </Animated.View>

        {/* ── Animated Pump Control Card ── */}
        <Animated.View style={{ transform: [{ scale: pumpCardScale }], opacity: cardsFadeAnim }}>
          <Card
            style={[
              styles.pumpCard,
              pumpStatus?.isOn && styles.pumpCardActive,
            ]}
            elevation={4}
          >
            <Card.Content>
              <View style={styles.pumpHeader}>
                <View>
                  <View style={styles.pumpTitleRow}>
                    <Text style={styles.pumpTitle}>{t('pumpTitle')}</Text>
                    {pumpStatus?.isOn && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.statusRow}>
                    <PulsingDot
                      color={pumpStatus?.isOn ? '#4CAF50' : '#E53935'}
                      active={pumpStatus?.isOn ?? false}
                      size={10}
                    />
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: pumpStatus?.isOn ? '#2E7D32' : '#C62828' },
                      ]}
                    >
                      {pumpStatus?.isOn ? t('pumpRunning') : t('pumpStopped')}
                    </Text>
                  </View>
                </View>
                {pumpLoading ? (
                  <ActivityIndicator size="large" color="#2E7D32" />
                ) : (
                  <Switch
                    value={pumpStatus?.isOn ?? false}
                    onValueChange={togglePump}
                    disabled={pumpLoading}
                    color="#2E7D32"
                    style={styles.switch}
                  />
                )}
              </View>

              <Divider style={styles.divider} />

              <View style={styles.pumpMeta}>
                {pumpStatus?.lastChanged ? (
                  <>
                    <Text style={styles.metaText}>
                      ⏱️ {t('lastChanged')}: {formatTimestamp(pumpStatus.lastChanged, t)}
                    </Text>
                    <Text style={styles.metaText}>
                      👤 {t('by')}: {pumpStatus.changedBy}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.metaText}>{t('noPumpData')}</Text>
                )}
              </View>
            </Card.Content>
          </Card>
        </Animated.View>

        {/* ── Sensor Readings Grid ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('liveSensors')}</Text>
          <View style={styles.liveIndicator}>
            <PulsingDot color="#2E7D32" size={7} active={!sensorLoading} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {sensorLoading ? (
          <ActivityIndicator
            size="large"
            color="#2E7D32"
            style={{ marginTop: 32 }}
          />
        ) : (
          <Animated.View style={{ opacity: cardsFadeAnim }}>
            <View style={styles.grid}>
              {/* Soil Moisture */}
              <Card style={[styles.sensorCard, { borderTopColor: '#1565C0' }]} elevation={3}>
                <Card.Content style={styles.sensorContent}>
                  <Text style={styles.sensorEmoji}>🌱</Text>
                  <Text style={styles.sensorLabel}>{t('soilMoisture')}</Text>
                  <Text style={[styles.sensorValue, { color: '#1565C0' }]}>
                    {sensorData?.soilMoisture?.toFixed(1) ?? '--'}
                    <Text style={styles.sensorUnit}> %</Text>
                  </Text>
                  {/* Progress bar */}
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(sensorData?.soilMoisture ?? 0, 100)}%` as any,
                          backgroundColor: moistureStatus?.color ?? '#1565C0',
                        },
                      ]}
                    />
                  </View>
                  {moistureStatus && (
                    <Text style={[styles.statusChip, { color: moistureStatus.color }]}>
                      {moistureStatus.label}
                    </Text>
                  )}
                </Card.Content>
              </Card>

              {/* Temperature */}
              <Card style={[styles.sensorCard, { borderTopColor: '#E65100' }]} elevation={3}>
                <Card.Content style={styles.sensorContent}>
                  <Text style={styles.sensorEmoji}>🌡️</Text>
                  <Text style={styles.sensorLabel}>{t('temperature')}</Text>
                  <Text style={[styles.sensorValue, { color: '#E65100' }]}>
                    {sensorData?.temperature?.toFixed(1) ?? '--'}
                    <Text style={styles.sensorUnit}> °C</Text>
                  </Text>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(((sensorData?.temperature ?? 0) / 50) * 100, 100)}%` as any,
                          backgroundColor: tempStatus?.color ?? '#E65100',
                        },
                      ]}
                    />
                  </View>
                  {tempStatus && (
                    <Text style={[styles.statusChip, { color: tempStatus.color }]}>
                      {tempStatus.label}
                    </Text>
                  )}
                </Card.Content>
              </Card>

              {/* Humidity */}
              <Card style={[styles.sensorCard, { borderTopColor: '#00838F' }]} elevation={3}>
                <Card.Content style={styles.sensorContent}>
                  <Text style={styles.sensorEmoji}>💧</Text>
                  <Text style={styles.sensorLabel}>{t('humidity')}</Text>
                  <Text style={[styles.sensorValue, { color: '#00838F' }]}>
                    {sensorData?.humidity?.toFixed(1) ?? '--'}
                    <Text style={styles.sensorUnit}> %</Text>
                  </Text>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(sensorData?.humidity ?? 0, 100)}%` as any,
                          backgroundColor: '#00838F',
                        },
                      ]}
                    />
                  </View>
                </Card.Content>
              </Card>

              {/* Water Flow */}
              <Card style={[styles.sensorCard, { borderTopColor: '#1976D2' }]} elevation={3}>
                <Card.Content style={styles.sensorContent}>
                  <Text style={styles.sensorEmoji}>🚿</Text>
                  <Text style={styles.sensorLabel}>{t('waterFlow')}</Text>
                  <Text style={[styles.sensorValue, { color: '#1976D2' }]}>
                    {sensorData?.waterFlow?.toFixed(1) ?? '--'}
                    <Text style={styles.sensorUnit}> L/m</Text>
                  </Text>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(((sensorData?.waterFlow ?? 0) / 30) * 100, 100)}%` as any,
                          backgroundColor: '#1976D2',
                        },
                      ]}
                    />
                  </View>
                </Card.Content>
              </Card>
            </View>

            {sensorData?.timestamp ? (
              <Text style={styles.lastUpdated}>
                {t('lastUpdated')}: {formatTimestamp(sensorData.timestamp, t)}
              </Text>
            ) : (
              <Text style={styles.lastUpdated}>{t('waitingSensorData')}</Text>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1B5E20' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  farmLabel: {
    fontSize: 13,
    color: '#E8F5E9',
    marginTop: 3,
    fontWeight: '500',
  },
  headerEmoji: { fontSize: 32 },
  scroll: { flex: 1, backgroundColor: '#F4F6F4' },
  scrollContent: { padding: 16, paddingBottom: 36 },

  // Pump card
  pumpCard: {
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  pumpCardActive: {
    borderColor: '#A5D6A7',
    borderWidth: 1.5,
    backgroundColor: '#FAFCFA',
  },
  pumpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pumpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pumpTitle: { fontSize: 17, fontWeight: '800', color: '#1B5E20' },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 9,
    color: '#2E7D32',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5, marginLeft: 2 },
  switch: { transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }] },
  divider: { marginVertical: 12, backgroundColor: '#EEEEEE' },
  pumpMeta: {},
  metaText: { fontSize: 12, color: '#757575', marginBottom: 3 },

  // Sensor section
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E20',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
    marginLeft: 2,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorCard: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sensorContent: { alignItems: 'center', paddingVertical: 14 },
  sensorEmoji: { fontSize: 30, marginBottom: 4 },
  sensorLabel: {
    fontSize: 11,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  sensorValue: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  sensorUnit: { fontSize: 14, fontWeight: '500' },
  progressBg: {
    width: '100%',
    height: 7,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusChip: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  lastUpdated: {
    textAlign: 'center',
    color: '#9E9E9E',
    fontSize: 12,
    marginTop: 10,
  },
});

export default DashboardScreen;
