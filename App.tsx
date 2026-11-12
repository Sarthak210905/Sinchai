import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

// Custom Material Design 3 theme with green palette
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32',
    primaryContainer: '#C8E6C9',
    secondary: '#388E3C',
    secondaryContainer: '#A5D6A7',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    error: '#B71C1C',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#1B5E20' }}>
      <PaperProvider theme={theme}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="light" backgroundColor="#1B5E20" />
            <AppNavigator />
          </AuthProvider>
        </LanguageProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
