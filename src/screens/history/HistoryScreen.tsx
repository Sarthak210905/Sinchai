import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from '../../firebase/config';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggleButton } from '../../components/LanguageToggleButton';
import { SensorData } from '../../types';
import { formatTimestamp } from '../../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

const HistoryScreen: React.FC = () => {
  const { t } = useLanguage();
  const [history, setHistory] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const historyRef = query(
      ref(db, 'sensors/history'),
      orderByChild('timestamp'),
      limitToLast(10)
    );

    const unsub = onValue(historyRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const entries: SensorData[] = Object.values(val) as SensorData[];
        entries.sort((a, b) => a.timestamp - b.timestamp);
        setHistory(entries);
      } else {
        setHistory([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ── Chart data ──────────────────────────────────────────
  const labels =
    history.length > 0
      ? history.map((h) => {
          const d = new Date(h.timestamp);
          return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        })
      : ['--'];

  const moistureData = history.length > 0 ? history.map((h) => h.soilMoisture) : [0];
  const tempData = history.length > 0 ? history.map((h) => h.temperature) : [0];
  const humidityData = history.length > 0 ? history.map((h) => h.humidity) : [0];

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(97, 97, 97, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2E7D32',
    },
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#2E7D32', '#388E3C']} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('historyTitle')}</Text>
          <Text style={styles.headerSub}>{t('historySubtitle')}</Text>
        </View>
        <LanguageToggleButton variant="glass" />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2E7D32"
            style={{ marginTop: 48 }}
          />
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyText}>{t('noHistory')}</Text>
            <Text style={styles.emptySubText}>{t('noHistoryDesc')}</Text>
          </View>
        ) : (
          <>
            {/* Soil Moisture Chart */}
            <Card style={styles.chartCard} elevation={2}>
              <Card.Content>
                <Text style={styles.chartTitle}>🌱 {t('soilMoisture')} (%)</Text>
                <LineChart
                  data={{
                    labels,
                    datasets: [{ data: moistureData, color: () => '#1565C0', strokeWidth: 2 }],
                  }}
                  width={CHART_WIDTH - 32}
                  height={180}
                  chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(21, 101, 192, ${o})` }}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines
                  withVerticalLabels
                />
              </Card.Content>
            </Card>

            {/* Temperature Chart */}
            <Card style={styles.chartCard} elevation={2}>
              <Card.Content>
                <Text style={styles.chartTitle}>🌡️ {t('temperature')} (°C)</Text>
                <LineChart
                  data={{
                    labels,
                    datasets: [{ data: tempData, color: () => '#E65100', strokeWidth: 2 }],
                  }}
                  width={CHART_WIDTH - 32}
                  height={180}
                  chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(230, 81, 0, ${o})` }}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines
                />
              </Card.Content>
            </Card>

            {/* Humidity Chart */}
            <Card style={styles.chartCard} elevation={2}>
              <Card.Content>
                <Text style={styles.chartTitle}>💧 {t('humidity')} (%)</Text>
                <LineChart
                  data={{
                    labels,
                    datasets: [{ data: humidityData, color: () => '#00838F', strokeWidth: 2 }],
                  }}
                  width={CHART_WIDTH - 32}
                  height={180}
                  chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(0, 131, 143, ${o})` }}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines
                />
              </Card.Content>
            </Card>

            {/* Reading List */}
            <Text style={styles.sectionTitle}>{t('allReadings')}</Text>
            {[...history].reverse().map((item, index) => (
              <Card key={item.timestamp + index} style={styles.readingCard} elevation={1}>
                <Card.Content>
                  <Text style={styles.readingTimestamp}>
                    🕐 {formatTimestamp(item.timestamp, t)}
                  </Text>
                  <Divider style={styles.readingDivider} />
                  <View style={styles.readingGrid}>
                    <View style={styles.readingItem}>
                      <Text style={styles.readingEmoji}>🌱</Text>
                      <Text style={styles.readingValue}>
                        {item.soilMoisture.toFixed(1)}%
                      </Text>
                      <Text style={styles.readingLabel}>{t('moistureShort')}</Text>
                    </View>
                    <View style={styles.readingItem}>
                      <Text style={styles.readingEmoji}>🌡️</Text>
                      <Text style={styles.readingValue}>
                        {item.temperature.toFixed(1)}°C
                      </Text>
                      <Text style={styles.readingLabel}>{t('tempShort')}</Text>
                    </View>
                    <View style={styles.readingItem}>
                      <Text style={styles.readingEmoji}>💧</Text>
                      <Text style={styles.readingValue}>
                        {item.humidity.toFixed(1)}%
                      </Text>
                      <Text style={styles.readingLabel}>{t('humidityShort')}</Text>
                    </View>
                    <View style={styles.readingItem}>
                      <Text style={styles.readingEmoji}>🚿</Text>
                      <Text style={styles.readingValue}>
                        {item.waterFlow.toFixed(1)}
                      </Text>
                      <Text style={styles.readingLabel}>{t('flowShort')}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </>
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
    padding: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  headerLeft: { flex: 1, paddingRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: '#C8E6C9', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#424242', marginTop: 12 },
  emptySubText: { fontSize: 13, color: '#9E9E9E', textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },

  chartCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#1B5E20', marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -8 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 12,
    marginTop: 4,
  },
  readingCard: {
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  readingTimestamp: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  readingDivider: { backgroundColor: '#E0E0E0', marginBottom: 10 },
  readingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readingItem: { alignItems: 'center', flex: 1 },
  readingEmoji: { fontSize: 20, marginBottom: 2 },
  readingValue: { fontSize: 14, fontWeight: '700', color: '#212121' },
  readingLabel: { fontSize: 10, color: '#9E9E9E', textTransform: 'uppercase', marginTop: 2 },
});

export default HistoryScreen;
