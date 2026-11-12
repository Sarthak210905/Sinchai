import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Button,
  Card,
  Divider,
  Dialog,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggleButton } from '../../components/LanguageToggleButton';

const ProfileScreen: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const { t } = useLanguage();
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    user?.displayName ?? userProfile?.displayName ?? 'Farmer';
  const email = user?.email ?? '';
  const farmName = userProfile?.farmName ?? '—';

  // Build initials from display name
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setSignOutDialogVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#2E7D32', '#388E3C']} style={styles.header}>
        <Text style={styles.headerTitle}>{t('profileTitle')}</Text>
        <LanguageToggleButton variant="glass" />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar + Name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.nameText}>{displayName}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard} elevation={2}>
          <Card.Content>
            <Text style={styles.sectionLabel}>{t('accountInfo')}</Text>
            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👤</Text>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>{t('fullName')}</Text>
                <Text style={styles.infoValue}>{displayName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✉️</Text>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>{t('emailAddress')}</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🌾</Text>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>{t('farmName')}</Text>
                <Text style={styles.infoValue}>{farmName}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Device Info Card */}
        <Card style={styles.infoCard} elevation={2}>
          <Card.Content>
            <Text style={styles.sectionLabel}>{t('aboutApp')}</Text>
            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📱</Text>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>{t('appName')}</Text>
                <Text style={styles.infoValue}>Sinchai</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🔖</Text>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>{t('version')}</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🛰️</Text>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>{t('dataSource')}</Text>
                <Text style={styles.infoValue}>Firebase Realtime Database</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Button
          mode="outlined"
          onPress={() => setSignOutDialogVisible(true)}
          style={styles.signOutBtn}
          contentStyle={styles.signOutContent}
          textColor="#C62828"
          icon="logout"
        >
          {t('signOut')}
        </Button>
      </ScrollView>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={signOutDialogVisible}
          onDismiss={() => setSignOutDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="logout" color="#C62828" />
          <Dialog.Title style={styles.dialogTitle}>{t('signOutConfirmTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              {t('signOutConfirmText')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setSignOutDialogVisible(false)}
              textColor="#2E7D32"
            >
              {t('cancel')}
            </Button>
            <Button
              onPress={handleSignOut}
              loading={loggingOut}
              disabled={loggingOut}
              textColor="#C62828"
            >
              {t('signOut')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  nameText: { fontSize: 22, fontWeight: '700', color: '#1B5E20', marginTop: 12 },
  emailText: { fontSize: 14, color: '#757575', marginTop: 4 },

  infoCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  divider: { backgroundColor: '#E0E0E0', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoIcon: { fontSize: 20, marginRight: 14 },
  infoTextGroup: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#212121', marginTop: 2 },

  signOutBtn: {
    marginTop: 8,
    borderRadius: 10,
    borderColor: '#C62828',
    borderWidth: 1.5,
  },
  signOutContent: { paddingVertical: 4 },

  dialog: { borderRadius: 16 },
  dialogTitle: { textAlign: 'center', color: '#C62828' },
  dialogText: { textAlign: 'center', color: '#424242' },
});

export default ProfileScreen;
