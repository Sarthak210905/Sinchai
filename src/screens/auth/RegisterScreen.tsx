import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggleButton } from '../../components/LanguageToggleButton';

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const { t } = useLanguage();

  const [displayName, setDisplayName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  const showError = (msg: string) => {
    setSnackMessage(msg);
    setSnackVisible(true);
  };

  const handleRegister = async () => {
    if (!displayName.trim()) return showError('Please enter your full name.');
    if (!farmName.trim()) return showError('Please enter your farm name.');
    if (!email.trim()) return showError('Please enter your email address.');
    if (password.length < 6) return showError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return showError('Passwords do not match.');

    setLoading(true);
    try {
      await register(email, password, displayName, farmName);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        showError('This email is already registered. Please sign in.');
      } else if (code === 'auth/invalid-email') {
        showError('The email address is not valid.');
      } else if (code === 'auth/weak-password') {
        showError('Password is too weak. Use at least 6 characters.');
      } else {
        showError(err?.message ?? 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#2E7D32', '#81C784']} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <LanguageToggleButton variant="glass" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo area */}
            <View style={styles.logoArea}>
              <Text style={styles.emoji}>🌱</Text>
              <Text style={styles.appTitle}>Sinchai</Text>
              <Text style={styles.appSubtitle}>Smart Irrigation & Farm Profile</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('createAccount')}</Text>
              <Text style={styles.cardSubtitle}>{t('createAccountSubtitle')}</Text>

              <TextInput
                label={t('fullName')}
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                autoCapitalize="words"
                left={<TextInput.Icon icon="account-outline" />}
                outlineColor="#C8E6C9"
                activeOutlineColor="#2E7D32"
                style={styles.input}
              />

              <TextInput
                label={t('farmName')}
                value={farmName}
                onChangeText={setFarmName}
                mode="outlined"
                autoCapitalize="words"
                left={<TextInput.Icon icon="sprout" />}
                outlineColor="#C8E6C9"
                activeOutlineColor="#2E7D32"
                style={styles.input}
              />

              <TextInput
                label={t('emailAddress')}
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                left={<TextInput.Icon icon="email-outline" />}
                outlineColor="#C8E6C9"
                activeOutlineColor="#2E7D32"
                style={styles.input}
              />

              <TextInput
                label={t('password')}
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={secureText}
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={secureText ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setSecureText(!secureText)}
                  />
                }
                outlineColor="#C8E6C9"
                activeOutlineColor="#2E7D32"
                style={styles.input}
              />

              <TextInput
                label={t('confirmPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={secureConfirm}
                left={<TextInput.Icon icon="lock-check-outline" />}
                right={
                  <TextInput.Icon
                    icon={secureConfirm ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setSecureConfirm(!secureConfirm)}
                  />
                }
                outlineColor="#C8E6C9"
                activeOutlineColor="#2E7D32"
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                contentStyle={styles.buttonContent}
                style={styles.button}
                buttonColor="#2E7D32"
                labelStyle={styles.buttonLabel}
              >
                {t('createAccount')}
              </Button>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.linkContainer}
              >
                <Text style={styles.linkText}>
                  Already have an account?{' '}
                  <Text style={styles.linkBold}>{t('signIn')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Snackbar
          visible={snackVisible}
          onDismiss={() => setSnackVisible(false)}
          duration={3500}
          style={styles.snackbar}
          action={{ label: 'OK', onPress: () => setSnackVisible(false) }}
        >
          {snackMessage}
        </Snackbar>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 12,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: { fontSize: 50 },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#C8E6C9',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  button: {
    borderRadius: 10,
    marginTop: 8,
  },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  linkContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: { fontSize: 13, color: '#757575' },
  linkBold: { color: '#2E7D32', fontWeight: '700' },
  snackbar: { backgroundColor: '#B71C1C' },
});

export default RegisterScreen;
