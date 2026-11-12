// ============================================================
// Firebase Configuration for Sinchai
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  Auth,
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkSo2Rf8QhSntbhBUOngPlyXKSj3VsiD4",
  authDomain: "sinchai-2025.firebaseapp.com",
  databaseURL: "https://sinchai-2025-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sinchai-2025",
  storageBucket: "sinchai-2025.firebasestorage.app",
  messagingSenderId: "283561368568",
  appId: "1:283561368568:web:9b61affcf5f3bba006140d",
  measurementId: "G-ECJNC9ETHP"
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with React Native persistence
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e: any) {
  auth = getAuth(app);
}

export { auth };
export const db = getDatabase(app);
export default app;
