import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { WeatherData } from '../services/weatherService';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  weather: WeatherData | null;
  loading: boolean;
}

export const WeatherCard: React.FC<Props> = ({ weather, loading }) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <Card style={styles.card} elevation={2}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.loadingText}>{t('weatherLoading')}</Text>
        </Card.Content>
      </Card>
    );
  }

  if (!weather) return null;

  const isRain = weather.weatherCondition === 'rain';
  const isHeat = weather.weatherCondition === 'heat';

  // Advisory colors & gradient
  const advisoryColors: [string, string] = isRain
    ? ['#1565C0', '#0D47A1']
    : isHeat
    ? ['#E65100', '#BF360C']
    : ['#2E7D32', '#1B5E20'];

  const advisoryTitle = isRain
    ? t('rainAlertTitle')
    : isHeat
    ? t('heatAlertTitle')
    : t('normalAlertTitle');

  const advisoryDesc = isRain
    ? t('rainAlertDesc')
    : isHeat
    ? t('heatAlertDesc')
    : t('normalAlertDesc');

  // Weather Emoji
  let weatherEmoji = '☀️';
  if (weather.weatherCode >= 51 && weather.weatherCode <= 99) {
    weatherEmoji = '🌧️';
  } else if (weather.weatherCode >= 1 && weather.weatherCode <= 3) {
    weatherEmoji = '⛅';
  } else if (weather.weatherCode === 45 || weather.weatherCode === 48) {
    weatherEmoji = '🌫️';
  }

  return (
    <Card style={styles.card} elevation={3}>
      <Card.Content style={styles.content}>
        {/* Header: Title + Location */}
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>{t('weatherTitle')}</Text>
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>📍 {weather.locationName}</Text>
          </View>
        </View>

        {/* Advisory Banner */}
        <LinearGradient
          colors={advisoryColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.advisoryBanner}
        >
          <Text style={styles.advisoryTitle}>{advisoryTitle}</Text>
          <Text style={styles.advisoryDesc}>{advisoryDesc}</Text>
        </LinearGradient>

        {/* Weather Metrics Row */}
        <View style={styles.metricsRow}>
          {/* Main Temp */}
          <View style={styles.tempCol}>
            <View style={styles.tempMainRow}>
              <Text style={styles.weatherEmoji}>{weatherEmoji}</Text>
              <Text style={styles.tempValue}>{weather.temperature}°C</Text>
            </View>
            <Text style={styles.minMaxText}>
              H: {weather.maxTemp}°C  •  L: {weather.minTemp}°C
            </Text>
          </View>

          {/* Secondary Details */}
          <View style={styles.detailsCol}>
            {/* Rain chance */}
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🌧️</Text>
              <View>
                <Text style={styles.detailLabel}>{t('rainChance')}</Text>
                <Text style={[styles.detailValue, { color: weather.rainProbability > 30 ? '#1565C0' : '#424242' }]}>
                  {weather.rainProbability}%
                </Text>
              </View>
            </View>

            {/* Wind */}
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>💨</Text>
              <View>
                <Text style={styles.detailLabel}>{t('wind')}</Text>
                <Text style={styles.detailValue}>{weather.windSpeed} km/h</Text>
              </View>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#757575',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B5E20',
  },
  locationBadge: {
    backgroundColor: '#F1F8E9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  locationText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  advisoryBanner: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  advisoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  advisoryDesc: {
    fontSize: 12,
    color: '#E8F5E9',
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FBE7',
    borderRadius: 14,
    padding: 12,
  },
  tempCol: {
    flex: 1,
  },
  tempMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherEmoji: {
    fontSize: 32,
  },
  tempValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2E7D32',
  },
  minMaxText: {
    fontSize: 11,
    color: '#616161',
    marginTop: 2,
    fontWeight: '500',
  },
  detailsCol: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    fontSize: 18,
  },
  detailLabel: {
    fontSize: 10,
    color: '#757575',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
  },
});

