import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Text, Button, Divider, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMqtt } from '../context/MqttContext';
import { useLanguage } from '../context/LanguageContext';
import { MqttOutputState, MqttOutputs } from '../types';
import { formatTimestamp } from '../utils/helpers';
import { MqttConnectModal } from '../screens/mqtt/MqttConnectModal';

export const HardwareStatusCard: React.FC = () => {
  const { t } = useLanguage();
  const {
    isConnected,
    isConnecting,
    replySubscribed,
    homeStatus,
    outputs,
    isStale,
    lastValidReplyTime,
    requestStatus,
    diagnostics,
    readStatus,
    clearDiagnostics,
  } = useMqtt();

  const [modalVisible, setModalVisible] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Can request status only when connected, reply topic is subscribed, and not currently pending
  const canReadStatus = isConnected && replySubscribed && requestStatus !== 'pending';

  // Helper for DO badge styling
  const renderOutputChip = (key: keyof MqttOutputs, state: MqttOutputState) => {
    let bgColor = '#EEEEEE';
    let textColor = '#616161';
    let icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'help-circle-outline';

    if (state === 'ON') {
      bgColor = '#E8F5E9';
      textColor = '#2E7D32';
      icon = 'check-circle';
    } else if (state === 'OFF') {
      bgColor = '#FFEBEE';
      textColor = '#C62828';
      icon = 'close-circle';
    }

    return (
      <View key={key} style={[styles.outputItem, { backgroundColor: bgColor }]}>
        <View style={styles.outputItemHeader}>
          <Text style={styles.outputLabel}>{key}</Text>
          <MaterialCommunityIcons name={icon} size={16} color={textColor} />
        </View>
        <Text style={[styles.outputStateText, { color: textColor }]}>
          {state}
        </Text>
      </View>
    );
  };

  // Home ESP32 status presentation
  const getHomeBadge = () => {
    if (homeStatus === 'online') {
      return { text: t('homeOnline'), color: '#2E7D32', bg: '#E8F5E9', icon: 'wifi-check' as const };
    }
    if (homeStatus === 'offline') {
      return { text: t('homeOffline'), color: '#C62828', bg: '#FFEBEE', icon: 'wifi-off' as const };
    }
    return { text: t('homeUnknown'), color: '#757575', bg: '#F5F5F5', icon: 'wifi-alert' as const };
  };

  // Request status presentation
  const getRequestBadge = () => {
    switch (requestStatus) {
      case 'pending':
        return { text: t('statusPending'), color: '#E65100', bg: '#FFF3E0' };
      case 'received':
        return { text: t('statusReceived'), color: '#2E7D32', bg: '#E8F5E9' };
      case 'timeout':
        return { text: t('statusTimeout'), color: '#C62828', bg: '#FFEBEE' };
      default:
        return { text: t('statusIdle'), color: '#616161', bg: '#F5F5F5' };
    }
  };

  const homeBadge = getHomeBadge();
  const reqBadge = getRequestBadge();

  return (
    <>
      <Card style={styles.card}>
        <Card.Content>
          {/* Top Bar: Title & Connection indicator */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <MaterialCommunityIcons name="chip" size={24} color="#2E7D32" />
              <View>
                <Text style={styles.cardTitle}>{t('hardwareTitle')}</Text>
                <Text style={styles.devSubtitle}>{t('devNotice')}</Text>
              </View>
            </View>

            {/* App-to-Broker Indicator Button */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={[
                styles.brokerPill,
                { backgroundColor: isConnected ? '#E8F5E9' : '#FFEBEE' },
              ]}
            >
              <View
                style={[
                  styles.brokerDot,
                  { backgroundColor: isConnected ? '#2E7D32' : '#C62828' },
                ]}
              />
              <Text
                style={[
                  styles.brokerPillText,
                  { color: isConnected ? '#2E7D32' : '#C62828' },
                ]}
              >
                {isConnecting
                  ? t('brokerConnecting')
                  : isConnected
                  ? t('brokerConnected')
                  : t('brokerDisconnected')}
              </Text>
            </TouchableOpacity>
          </View>

          <Divider style={styles.divider} />

          {/* Connection Overview: Home ESP32 & Request State */}
          <View style={styles.statusRow}>
            {/* Home ESP32 Connection */}
            <View style={styles.statusCol}>
              <Text style={styles.sectionLabel}>{t('homeStatusLabel')}</Text>
              <View style={[styles.badge, { backgroundColor: homeBadge.bg }]}>
                <MaterialCommunityIcons name={homeBadge.icon} size={14} color={homeBadge.color} />
                <Text style={[styles.badgeText, { color: homeBadge.color }]}>
                  {homeBadge.text}
                </Text>
              </View>
            </View>

            {/* Request State */}
            <View style={styles.statusCol}>
              <Text style={styles.sectionLabel}>Request State</Text>
              <View style={[styles.badge, { backgroundColor: reqBadge.bg }]}>
                {requestStatus === 'pending' ? (
                  <ActivityIndicator size={12} color={reqBadge.color} style={{ marginRight: 4 }} />
                ) : null}
                <Text style={[styles.badgeText, { color: reqBadge.color }]}>
                  {reqBadge.text}
                </Text>
              </View>
            </View>
          </View>

          {/* Home Status Disclaimer Notice */}
          <Text style={styles.disclaimerText}>
            ℹ️ {t('homeDisclaimer')}
          </Text>

          {/* Read Status Button & Last Reply Time */}
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              icon="sync"
              onPress={() => readStatus()}
              loading={requestStatus === 'pending'}
              disabled={!canReadStatus}
              buttonColor="#2E7D32"
              textColor="#FFFFFF"
              style={styles.readStatusButton}
            >
              {requestStatus === 'pending' ? t('readingStatus') : t('readStatusBtn')}
            </Button>

            {!isConnected && (
              <Button
                mode="outlined"
                icon="cog"
                onPress={() => setModalVisible(true)}
                textColor="#2E7D32"
                style={styles.settingsButton}
              >
                {t('connectHardware')}
              </Button>
            )}
          </View>

          {/* Reply Timestamp & Stale Warning */}
          <View style={styles.timestampRow}>
            <Text style={styles.timestampLabel}>
              {t('lastReplyLabel')}:{' '}
              <Text style={styles.timestampValue}>
                {lastValidReplyTime ? formatTimestamp(lastValidReplyTime) : t('noRepliesYet')}
              </Text>
            </Text>
            {isStale && (
              <Chip
                compact
                style={styles.staleChip}
                textStyle={styles.staleChipText}
                icon="clock-alert-outline"
              >
                {t('staleBadge')}
              </Chip>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* DO1 - DO8 Output States Grid */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('outputsTitle')}</Text>
          </View>

          <View style={styles.outputsGrid}>
            {(['DO1', 'DO2', 'DO3', 'DO4', 'DO5', 'DO6', 'DO7', 'DO8'] as (keyof MqttOutputs)[]).map(
              (key) => renderOutputChip(key, outputs[key])
            )}
          </View>

          {/* Valve Logic Disclaimer */}
          <Text style={styles.disclaimerText}>
            ⚠️ {t('valveDisclaimer')}
          </Text>

          <Divider style={styles.divider} />

          {/* Extension Valves V9 / V10 Notice */}
          <View style={styles.v9Row}>
            <View style={styles.v9TitleRow}>
              <MaterialCommunityIcons name="power-plug-off-outline" size={18} color="#757575" />
              <Text style={styles.v9Title}>{t('v9v10Title')}</Text>
            </View>
            <Text style={styles.v9Unavailable}>{t('v9v10Unavailable')}</Text>
          </View>

          <Divider style={styles.divider} />

          {/* Diagnostics Section Toggle */}
          <TouchableOpacity
            style={styles.diagToggleRow}
            onPress={() => setShowDiagnostics(!showDiagnostics)}
          >
            <View style={styles.diagToggleLeft}>
              <MaterialCommunityIcons name="clipboard-pulse-outline" size={18} color="#616161" />
              <Text style={styles.diagToggleText}>{t('diagnosticsTitle')}</Text>
              {diagnostics.length > 0 && (
                <View style={styles.diagCountBadge}>
                  <Text style={styles.diagCountText}>{diagnostics.length}</Text>
                </View>
              )}
            </View>
            <MaterialCommunityIcons
              name={showDiagnostics ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#616161"
            />
          </TouchableOpacity>

          {/* Expanded Diagnostics Log */}
          {showDiagnostics && (
            <View style={styles.diagContainer}>
              <View style={styles.diagHeader}>
                <Text style={styles.diagHeaderTitle}>Events ({diagnostics.length})</Text>
                {diagnostics.length > 0 && (
                  <TouchableOpacity onPress={clearDiagnostics}>
                    <Text style={styles.clearDiagText}>{t('clearDiagnostics')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {diagnostics.length === 0 ? (
                <Text style={styles.noDiagText}>{t('noDiagnostics')}</Text>
              ) : (
                <View style={styles.diagList}>
                  {diagnostics.slice(0, 10).map((item) => (
                    <View key={item.id} style={styles.diagItem}>
                      <View style={styles.diagItemTop}>
                        <Text style={[styles.diagTypeTag, getDiagTypeStyle(item.type)]}>
                          {item.type.toUpperCase()}
                        </Text>
                        <Text style={styles.diagTime}>
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={styles.diagMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Connection Modal */}
      <MqttConnectModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
      />
    </>
  );
};

const getDiagTypeStyle = (type: string) => {
  switch (type) {
    case 'error':
      return { backgroundColor: '#FFEBEE', color: '#C62828' };
    case 'warn':
      return { backgroundColor: '#FFF3E0', color: '#E65100' };
    case 'tx':
      return { backgroundColor: '#E3F2FD', color: '#1565C0' };
    case 'rx':
      return { backgroundColor: '#E8F5E9', color: '#2E7D32' };
    default:
      return { backgroundColor: '#F5F5F5', color: '#616161' };
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },
  devSubtitle: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '500',
  },
  brokerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  brokerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  brokerPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusCol: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#757575',
    lineHeight: 15,
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  readStatusButton: {
    flex: 1,
    borderRadius: 8,
  },
  settingsButton: {
    borderRadius: 8,
    borderColor: '#2E7D32',
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  timestampLabel: {
    fontSize: 12,
    color: '#757575',
  },
  timestampValue: {
    fontWeight: '600',
    color: '#212121',
  },
  staleChip: {
    backgroundColor: '#FFF3E0',
    height: 24,
  },
  staleChipText: {
    fontSize: 10,
    color: '#E65100',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
  },
  outputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  outputItem: {
    width: '23%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  outputItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  outputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#424242',
  },
  outputStateText: {
    fontSize: 12,
    fontWeight: '800',
  },
  v9Row: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  v9TitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  v9Title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#616161',
  },
  v9Unavailable: {
    fontSize: 11,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  diagToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  diagToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diagToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#616161',
  },
  diagCountBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  diagCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#424242',
  },
  diagContainer: {
    marginTop: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  diagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diagHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757575',
  },
  clearDiagText: {
    fontSize: 11,
    color: '#C62828',
    fontWeight: '600',
  },
  noDiagText: {
    fontSize: 11,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  diagList: {
    gap: 6,
  },
  diagItem: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  diagItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  diagTypeTag: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  diagTime: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  diagMessage: {
    fontSize: 11,
    color: '#424242',
    fontFamily: 'monospace',
  },
});
