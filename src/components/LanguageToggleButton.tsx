import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  variant?: 'light' | 'dark' | 'glass';
}

export const LanguageToggleButton: React.FC<Props> = ({ variant = 'glass' }) => {
  const { language, toggleLanguage } = useLanguage();

  const isGlass = variant === 'glass';
  const isLight = variant === 'light';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggleLanguage}
      style={[
        styles.button,
        isGlass && styles.glassButton,
        isLight && styles.lightButton,
      ]}
    >
      <Text style={styles.globe}>🌐</Text>
      <Text
        style={[
          styles.text,
          isGlass && styles.glassText,
          isLight && styles.lightText,
        ]}
      >
        {language === 'hi' ? 'English' : 'हिंदी'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  glassButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  lightButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  globe: {
    fontSize: 13,
    marginRight: 5,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  glassText: {
    color: '#FFFFFF',
  },
  lightText: {
    color: '#2E7D32',
  },
});

