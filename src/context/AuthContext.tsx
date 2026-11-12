import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';

// ─── Context shape ───────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    farmName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? '',
          farmName: '',           // loaded lazily or from DB if needed
        });
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Login ──────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  // ── Register ───────────────────────────────────────────────
  const register = async (
    email: string,
    password: string,
    displayName: string,
    farmName: string
  ): Promise<void> => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    const { uid } = credential.user;

    // Set display name on the auth profile
    await updateProfile(credential.user, { displayName: displayName.trim() });

    // Write full profile to Realtime DB
    const profile: Omit<UserProfile, 'uid'> = {
      email: email.trim(),
      displayName: displayName.trim(),
      farmName: farmName.trim(),
    };
    await set(ref(db, `users/${uid}`), profile);

    setUserProfile({ uid, ...profile });
  };

  // ── Logout ─────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
