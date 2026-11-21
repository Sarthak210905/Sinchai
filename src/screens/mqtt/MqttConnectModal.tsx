import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, Card, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMqtt } from '../../context/MqttContext';
import { useLanguage } from '../../context/LanguageContext';
import { BROKER_CONFIG } from '../../services/mqttService';

interface MqttConnectModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const MqttConnectModal: React.FC<MqttConnectModalProps> = ({ visible, onDismiss }) => {
  const { t } = useLanguage();
  const { isConnected, isConnecting, connect, disconnect } = useMqtt();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleConnect = () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage(t('requiredFields'));
      return;
    }
    setErrorMessage('');
    connect(username.trim(), password);
    onDismiss();
  };

  const handleDisconnect = () => {
    disconnect();
    setUsername('');
    setPassword('');
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="developer-board" size={24} color="#2E7D32" />
              <Text style={styles.title}>{t('mqttSettingsTitle')}</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color="#616161" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Development Mode Notice Card */}
            <Card style={styles.noticeCard}>
              <Card.Content style={styles.noticeContent}>
                <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#E65100" />
                <View style={styles.noticeTextContainer}>
                  <Text style={styles.noticeTitle}>Development Connection Only</Text>
                  <Text style={styles.noticeDesc}>{t('mqttSettingsNotice')}</Text>
                </View>
              </Card.Content>
            </Card>

            {/* Firmware Limitations Banner */}
            <View style={styles.firmwareBanner}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#0277BD" />
              <Text style={styles.firmwareBannerText}>{t('onlyStatusSupported')}</Text>
            </View>

            {/* Broker Info */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('brokerHost')}:</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                {BROKER_CONFIG.host}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('brokerPort')}:</Text>
              <Text style={styles.infoValue}>{BROKER_CONFIG.port} (WSS / TLS)</Text>
            </View>

            {/* Inputs (Shown if disconnected) */}
            {!isConnected ? (
              <View style={styles.formContainer}>
                <TextInput
                  label={t('mqttUsername')}
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('enterUsername')}
                  style={styles.input}
                  left={<TextInput.Icon icon="account" />}
                />

                <TextInput
                  label={t('mqttPassword')}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('enterPassword')}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />

                {errorMessage ? (
                  <HelperText type="error" visible={!!errorMessage}>
                    {errorMessage}
                  </HelperText>
                ) : null}

                <Button
                  mode="contained"
                  onPress={handleConnect}
                  loading={isConnecting}
                  disabled={isConnecting}
                  style={styles.actionBtn}
                  buttonColor="#2E7D32"
                  icon="connection"
                >
                  {isConnecting ? t('brokerConnecting') : t('connect')}
                </Button>
              </View>
            ) : (
              <View style={styles.connectedBox}>
                <View style={styles.statusBadge}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#2E7D32" />
                  <Text style={styles.statusBadgeText}>{t('brokerConnected')}</Text>
                </View>
                <Text style={styles.sessionNotice}>
                  Session is active with in-memory credentials.
                </Text>
                <Button
                  mode="contained"
                  onPress={handleDisconnect}
                  style={[styles.actionBtn, { marginTop: 16 }]}
                  buttonColor="#C62828"
                  icon="power"
                >
                  {t('disconnect')}
                </Button>
              </View>
            )}

            <Button mode="text" onPress={onDismiss} style={{ marginTop: 8 }}>
              {t('close')}
            </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  scrollContent: {
    padding: 20,
  },
  noticeCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    marginBottom: 14,
  },
  noticeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 2,
  },
  noticeDesc: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 16,
  },
  firmwareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  firmwareBannerText: {
    fontSize: 12,
    color: '#01579B',
    flex: 1,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '600',
    maxWidth: '65%',
  },
  formContainer: {
    marginTop: 14,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  connectedBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  sessionNotice: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
  },
});
