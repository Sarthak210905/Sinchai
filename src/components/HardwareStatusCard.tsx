import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Card, Text, Button, Divider, Chip, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMqtt } from '../context/MqttContext';
import { useLanguage } from '../context/LanguageContext';
import {
  MqttOutputs,
  ExtensionOutputs,
  OutputItemState,
  MqttCommand,
} from '../types';
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
    extensions,
    isStale,
    lastValidReplyTime,
    requestStatus,
    pendingCommand,
    requiresStatusRefresh,
    lastCommandOutcome,
    diagnostics,
    commissioningMode,
    setCommissioningMode,
    sendCommand,
    readStatus,
    clearDiagnostics,
  } = useMqtt();

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showLimitations, setShowLimitations] = useState(false);

  // Confirmation Modal State
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<MqttCommand | null>(null);

  const canIssueRequest = isConnected && replySubscribed && requestStatus !== 'pending';
  const canSendActuator = canIssueRequest && !requiresStatusRefresh;

  const handlePromptCommand = (cmd: MqttCommand) => {
    setSelectedCommand(cmd);
    setConfirmModalVisible(true);
  };

  const handleConfirmSend = () => {
    if (selectedCommand) {
      sendCommand(selectedCommand);
    }
    setConfirmModalVisible(false);
    setSelectedCommand(null);
  };

  // Badge styling for DO and Extension states
  const renderOutputItem = (
    label: string,
    item: OutputItemState,
    isCommissioningTarget = false,
    onPressOn?: () => void,
    onPressOff?: () => void,
    controlDisabled = false
  ) => {
    let bgColor = '#EEEEEE';
    let textColor = '#616161';
    let icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'help-circle-outline';

    if (item.state === 'ON') {
      bgColor = '#E8F5E9';
      textColor = '#2E7D32';
      icon = 'check-circle';
    } else if (item.state === 'OFF') {
      bgColor = '#FFEBEE';
      textColor = '#C62828';
      icon = 'close-circle';
    } else if (item.state === 'UNCERTAIN') {
      bgColor = '#FFF3E0';
      textColor = '#E65100';
      icon = 'alert-circle';
    }

    const sourceTag =
      item.source === 'STATUS'
        ? t('statusBadge')
        : item.source === 'ACK'
        ? t('ackBadge')
        : item.state === 'UNCERTAIN'
        ? t('uncertainBadge')
        : '';

    return (
      <View
        key={label}
        style={[
          styles.outputItem,
          { backgroundColor: bgColor },
          isCommissioningTarget && styles.commissioningTargetBorder,
        ]}
      >
        <View style={styles.outputItemHeader}>
          <Text style={styles.outputLabel}>{label}</Text>
          <MaterialCommunityIcons name={icon} size={15} color={textColor} />
        </View>

        <Text style={[styles.outputStateText, { color: textColor }]}>
          {item.state}
        </Text>

        {sourceTag ? (
          <Text style={[styles.sourceBadge, { color: textColor }]} numberOfLines={1}>
            {sourceTag}
          </Text>
        ) : null}

        {/* Action buttons if controllable */}
        {onPressOn && onPressOff && (
          <View style={styles.inlineActionRow}>
            <TouchableOpacity
              onPress={onPressOn}
              disabled={controlDisabled}
              style={[
                styles.inlineActionBtn,
                styles.inlineBtnOn,
                controlDisabled && styles.btnDisabled,
              ]}
            >
              <Text style={styles.inlineBtnText}>{t('turnOn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onPressOff}
              disabled={controlDisabled}
              style={[
                styles.inlineActionBtn,
                styles.inlineBtnOff,
                controlDisabled && styles.btnDisabled,
              ]}
            >
              <Text style={styles.inlineBtnText}>{t('turnOff')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
        return {
          text: `${t('statusPending')}${pendingCommand ? ` (${pendingCommand})` : ''}`,
          color: '#E65100',
          bg: '#FFF3E0',
        };
      case 'received':
        return { text: t('statusReceived'), color: '#2E7D32', bg: '#E8F5E9' };
      case 'timeout':
        return { text: t('statusTimeout'), color: '#C62828', bg: '#FFEBEE' };
      case 'error':
        return { text: 'Error / Rejected', color: '#B71C1C', bg: '#FFCDD2' };
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
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <MaterialCommunityIcons name="chip" size={24} color="#2E7D32" />
              <View>
                <Text style={styles.cardTitle}>{t('hardwareTitle')}</Text>
                <Text style={styles.devSubtitle}>{t('devNotice')}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setSettingsModalVisible(true)}
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

          {/* Connection Overview */}
          <View style={styles.statusRow}>
            <View style={styles.statusCol}>
              <Text style={styles.sectionLabel}>{t('homeStatusLabel')}</Text>
              <View style={[styles.badge, { backgroundColor: homeBadge.bg }]}>
                <MaterialCommunityIcons name={homeBadge.icon} size={14} color={homeBadge.color} />
                <Text style={[styles.badgeText, { color: homeBadge.color }]}>
                  {homeBadge.text}
                </Text>
              </View>
            </View>

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

          <Text style={styles.disclaimerText}>
            ℹ️ {t('homeDisclaimer')}
          </Text>

          {/* Read Status Button & Settings */}
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              icon="sync"
              onPress={() => readStatus()}
              loading={requestStatus === 'pending' && pendingCommand === 'STATUS'}
              disabled={!canIssueRequest}
              buttonColor="#2E7D32"
              textColor="#FFFFFF"
              style={styles.readStatusButton}
            >
              {t('readStatusBtn')}
            </Button>

            {!isConnected && (
              <Button
                mode="outlined"
                icon="cog"
                onPress={() => setSettingsModalVisible(true)}
                textColor="#2E7D32"
                style={styles.settingsButton}
              >
                {t('connectHardware')}
              </Button>
            )}
          </View>

          {/* Status Refresh Required Alert */}
          {requiresStatusRefresh && isConnected && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert" size={18} color="#E65100" />
              <Text style={styles.warningBoxText}>
                {t('statusRefreshRequired')}
              </Text>
            </View>
          )}

          {/* Reply Timestamp & Stale Chip */}
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

          {/* ── Section 1: DO1 Commissioning Target ── */}
          <View style={styles.commissioningSection}>
            <View style={styles.commissioningHeaderRow}>
              <View style={styles.commTitleWithIcon}>
                <MaterialCommunityIcons name="shield-check" size={18} color="#2E7D32" />
                <Text style={styles.commissioningTitle}>{t('commissioningTitle')}</Text>
              </View>
              <Chip compact style={styles.commChip}>
                COMMISSIONING
              </Chip>
            </View>

            <Text style={styles.commNoticeText}>{t('commissioningNotice')}</Text>

            {/* DO1 Card with direct controls */}
            <View style={styles.do1HighlightContainer}>
              <View style={styles.do1InfoCol}>
                <Text style={styles.do1Label}>DO1 Main Valve</Text>
                <View style={styles.do1StateRow}>
                  <Text style={[styles.do1StateText, { color: outputs.DO1.state === 'ON' ? '#2E7D32' : outputs.DO1.state === 'OFF' ? '#C62828' : '#E65100' }]}>
                    {outputs.DO1.state}
                  </Text>
                  {outputs.DO1.source !== 'NONE' && (
                    <Text style={styles.do1SourceText}>
                      ({outputs.DO1.source === 'STATUS' ? t('statusBadge') : t('ackBadge')})
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.do1ButtonsRow}>
                <Button
                  mode="contained"
                  buttonColor="#2E7D32"
                  disabled={!canSendActuator}
                  onPress={() => handlePromptCommand('DO1_ON')}
                  style={styles.commActionBtn}
                  compact
                >
                  {t('turnOn')}
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#C62828"
                  disabled={!canSendActuator}
                  onPress={() => handlePromptCommand('DO1_OFF')}
                  style={styles.commActionBtn}
                  compact
                >
                  {t('turnOff')}
                </Button>
              </View>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* ── Commissioning Lock Toggle ── */}
          <View style={styles.lockToggleRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.lockToggleTitle}>
                {commissioningMode ? t('unlockAdvancedControls') : t('lockAdvancedControls')}
              </Text>
              <Text style={styles.lockToggleDesc}>
                {commissioningMode
                  ? 'DO2–DO8, V9, V10, and ALL controls are currently locked for safety.'
                  : t('advancedUnlockedNotice')}
              </Text>
            </View>
            <Switch
              value={!commissioningMode}
              onValueChange={(unlocked) => setCommissioningMode(!unlocked)}
              color="#2E7D32"
            />
          </View>

          <Divider style={styles.divider} />

          {/* ── Section 2: DO1–DO8 Grid ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('outputsTitle')}</Text>
          </View>

          <View style={styles.outputsGrid}>
            {(['DO1', 'DO2', 'DO3', 'DO4', 'DO5', 'DO6', 'DO7', 'DO8'] as (keyof MqttOutputs)[]).map(
              (key) => {
                const isTarget = key === 'DO1';
                const isLocked = commissioningMode && !isTarget;
                return renderOutputItem(
                  key,
                  outputs[key],
                  isTarget,
                  !isLocked ? () => handlePromptCommand(`${key}_ON` as MqttCommand) : undefined,
                  !isLocked ? () => handlePromptCommand(`${key}_OFF` as MqttCommand) : undefined,
                  !canSendActuator || isLocked
                );
              }
            )}
          </View>

          <Text style={styles.disclaimerText}>
            ⚠️ {t('valveAckDisclaimer')}
          </Text>

          <Divider style={styles.divider} />

          {/* ── Section 3: Extension Valves V9 / V10 ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('extensionTitle')}</Text>
          </View>

          <View style={styles.extensionRow}>
            {(['V9', 'V10'] as (keyof ExtensionOutputs)[]).map((key) => {
              const isLocked = commissioningMode;
              return renderOutputItem(
                key,
                extensions[key],
                false,
                !isLocked ? () => handlePromptCommand(`${key}_ON` as MqttCommand) : undefined,
                !isLocked ? () => handlePromptCommand(`${key}_OFF` as MqttCommand) : undefined,
                !canSendActuator || isLocked
              );
            })}
          </View>

          <Text style={styles.disclaimerText}>
            ℹ️ {t('extensionDisclaimer')}
          </Text>

          {/* ── Section 4: ALL Commands (when unlocked) ── */}
          {!commissioningMode && (
            <View style={styles.allActionsContainer}>
              <Text style={styles.allActionsLabel}>Bulk Actuation:</Text>
              <View style={styles.allActionsRow}>
                <Button
                  mode="outlined"
                  textColor="#2E7D32"
                  style={styles.allBtn}
                  disabled={!canSendActuator}
                  onPress={() => handlePromptCommand('ALL_ON')}
                >
                  {t('allOn')}
                </Button>
                <Button
                  mode="outlined"
                  textColor="#C62828"
                  style={styles.allBtn}
                  disabled={!canSendActuator}
                  onPress={() => handlePromptCommand('ALL_OFF')}
                >
                  {t('allOff')}
                </Button>
              </View>
            </View>
          )}

          {/* ── Section 5: Last Command Result Card ── */}
          {lastCommandOutcome && (
            <View style={styles.lastOutcomeBox}>
              <View style={styles.lastOutcomeHeader}>
                <Text style={styles.lastOutcomeLabel}>{t('lastCommandLabel')}:</Text>
                <Chip compact style={styles.outcomeResultChip}>
                  {lastCommandOutcome.result}
                </Chip>
              </View>
              <Text style={styles.lastOutcomeCmd}>Command: {lastCommandOutcome.command}</Text>
              {lastCommandOutcome.detail ? (
                <Text style={styles.lastOutcomeDetail}>Detail: {lastCommandOutcome.detail}</Text>
              ) : null}
            </View>
          )}

          <Divider style={styles.divider} />

          {/* ── Section 6: Limitations Documentation Toggle ── */}
          <TouchableOpacity
            style={styles.diagToggleRow}
            onPress={() => setShowLimitations(!showLimitations)}
          >
            <View style={styles.diagToggleLeft}>
              <MaterialCommunityIcons name="information" size={18} color="#0277BD" />
              <Text style={[styles.diagToggleText, { color: '#0277BD' }]}>
                {t('limitationsTitle')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={showLimitations ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#0277BD"
            />
          </TouchableOpacity>

          {showLimitations && (
            <View style={styles.limitationsBox}>
              <Text style={styles.limitationsText}>{t('limitationsText')}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          {/* ── Section 7: Diagnostics Section Toggle ── */}
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

      {/* Confirmation Dialog */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#E65100" />
              <Text style={styles.confirmTitle}>{t('confirmCommandTitle')}</Text>
            </View>

            <Text style={styles.confirmMessage}>
              {t('confirmCommandMessage').replace('%cmd%', selectedCommand || '')}
            </Text>

            <View style={styles.confirmActions}>
              <Button
                mode="text"
                onPress={() => setConfirmModalVisible(false)}
                textColor="#757575"
              >
                {t('cancelBtn')}
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmSend}
                buttonColor="#2E7D32"
              >
                {t('confirmBtn')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* MQTT Configuration Modal */}
      <MqttConnectModal
        visible={settingsModalVisible}
        onDismiss={() => setSettingsModalVisible(false)}
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  warningBoxText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
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
  commissioningSection: {
    backgroundColor: '#F1F8E9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCEDC8',
  },
  commissioningHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commissioningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  commChip: {
    backgroundColor: '#C8E6C9',
    height: 22,
  },
  commNoticeText: {
    fontSize: 11,
    color: '#558B2F',
    lineHeight: 15,
    marginBottom: 8,
  },
  do1HighlightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  do1InfoCol: {
    flex: 1,
  },
  do1Label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  do1StateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  do1StateText: {
    fontSize: 14,
    fontWeight: '800',
  },
  do1SourceText: {
    fontSize: 10,
    color: '#757575',
  },
  do1ButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  commActionBtn: {
    borderRadius: 6,
  },
  lockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  lockToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333333',
  },
  lockToggleDesc: {
    fontSize: 11,
    color: '#757575',
    lineHeight: 15,
    marginTop: 2,
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
    gap: 6,
    marginBottom: 6,
  },
  extensionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  outputItem: {
    width: '23.5%',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  commissioningTargetBorder: {
    borderWidth: 1.5,
    borderColor: '#2E7D32',
  },
  outputItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  outputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#424242',
  },
  outputStateText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sourceBadge: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
  },
  inlineActionRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    width: '100%',
  },
  inlineActionBtn: {
    flex: 1,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  inlineBtnOn: {
    backgroundColor: '#2E7D32',
  },
  inlineBtnOff: {
    backgroundColor: '#C62828',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  inlineBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  allActionsContainer: {
    marginTop: 10,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  allActionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 6,
  },
  allActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  allBtn: {
    flex: 1,
    borderRadius: 6,
  },
  lastOutcomeBox: {
    marginTop: 12,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lastOutcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastOutcomeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#616161',
  },
  outcomeResultChip: {
    height: 22,
    backgroundColor: '#E0E0E0',
  },
  lastOutcomeCmd: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212121',
  },
  lastOutcomeDetail: {
    fontSize: 11,
    color: '#424242',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  limitationsBox: {
    backgroundColor: '#E1F5FE',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  limitationsText: {
    fontSize: 11,
    color: '#01579B',
    lineHeight: 16,
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    elevation: 6,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  confirmMessage: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
