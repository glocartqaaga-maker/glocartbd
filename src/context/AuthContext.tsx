import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signup: (params: {
    name: string;
    email: string;
    phone: string;
    password: string;
    district?: string;
    area?: string;
    address?: string;
  }) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  loginAsAdminQuick: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateCustomerProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLocalAdmin, setIsLocalAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('glocart_admin_session') === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Fetch or sync user profile from Firestore
  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      const isDevAdminEmail = 
        firebaseUser.email?.toLowerCase() === 'admin@glocartbd.com' || 
        firebaseUser.email?.toLowerCase() === 'glocart.qaaga@gmail.com';

      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as UserProfile;
        // If email is an authorized admin email, ensure admin role
        if (isDevAdminEmail && data.role !== 'admin') {
          try {
            await updateDoc(userDocRef, { role: 'admin' });
          } catch (e) {
            console.warn('Note updating admin role in Firestore:', e);
          }
          data.role = 'admin';
        }
        setUserProfile(data);
      } else {
        // Create initial profile for newly authenticated users (e.g. Google Sign-In or initial admin)
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || (isDevAdminEmail ? 'GloCart Admin' : firebaseUser.email?.split('@')[0]) || 'Valued Customer',
          email: firebaseUser.email || (isDevAdminEmail ? 'admin@glocartbd.com' : ''),
          phone: firebaseUser.phoneNumber || (isDevAdminEmail ? '+8801711000000' : ''),
          role: isDevAdminEmail ? 'admin' : 'customer',
          status: 'active',
          orderCount: 0,
          totalSpent: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        try {
          await setDoc(userDocRef, newProfile);
        } catch (e) {
          console.warn('Note setting user profile in Firestore:', e);
        }
        setUserProfile(newProfile);
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else if (isLocalAdmin) {
        setUserProfile({
          uid: 'admin_local_master',
          name: 'GloCart Administrator',
          email: 'admin@glocartbd.com',
          phone: '+8801711000000',
          role: 'admin',
          status: 'active',
          orderCount: 0,
          totalSpent: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLocalAdmin]);

  // Customer / User Registration
  const signup = async ({
    name,
    email,
    phone,
    password,
    district,
    area,
    address,
  }: {
    name: string;
    email: string;
    phone: string;
    password: string;
    district?: string;
    area?: string;
    address?: string;
  }) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: name.trim() });

      // Send email verification
      try {
        await sendEmailVerification(firebaseUser);
      } catch (e) {
        console.log('Email verification sending note:', e);
      }

      const isDevAdmin = email.trim().toLowerCase() === 'admin@glocartbd.com' || email.trim().toLowerCase() === 'glocart.qaaga@gmail.com';

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        district: district || '',
        area: area || '',
        address: address || '',
        role: isDevAdmin ? 'admin' : 'customer',
        status: 'active',
        orderCount: 0,
        totalSpent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      } catch (e) {
        console.warn('Note setting profile in Firestore:', e);
      }
      setUserProfile(newProfile);
    } catch (err: any) {
      let friendlyMessage = err.message || 'Registration failed. Please check your details.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email address already exists. Please login instead.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password must be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      }
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  // Instant Quick Admin Login
  const loginAsAdminQuick = async () => {
    setError(null);
    try {
      localStorage.setItem('glocart_admin_session', 'true');
      setIsLocalAdmin(true);
      const adminProfile: UserProfile = {
        uid: 'admin_local_master',
        name: 'GloCart Administrator',
        email: 'admin@glocartbd.com',
        phone: '+8801711000000',
        role: 'admin',
        status: 'active',
        orderCount: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUserProfile(adminProfile);
    } catch (e: any) {
      setError(e.message || 'Failed to activate Admin mode.');
    }
  };

  // Login (Supports email, default dev username "admin", and robust admin fallback)
  const login = async (identifier: string, password: string) => {
    setError(null);
    const rawId = identifier.trim().toLowerCase();
    let emailToUse = rawId;
    
    // Support default development admin login username 'admin'
    if (rawId === 'admin') {
      emailToUse = 'admin@glocartbd.com';
    }

    const isAdminAttempt = 
      emailToUse === 'admin@glocartbd.com' || 
      rawId === 'admin' || 
      emailToUse === 'glocart.qaaga@gmail.com';

    const isValidAdminPass = password === 'glo123cart' || password === 'admin' || password === 'admin123';

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const firebaseUser = userCredential.user;
      if (isAdminAttempt) {
        localStorage.setItem('glocart_admin_session', 'true');
        setIsLocalAdmin(true);
      }
      await fetchUserProfile(firebaseUser);
    } catch (err: any) {
      // If admin credentials match, smoothly grant Admin access even if email auth is not active
      if (isAdminAttempt && isValidAdminPass) {
        localStorage.setItem('glocart_admin_session', 'true');
        setIsLocalAdmin(true);
        const adminProfile: UserProfile = {
          uid: 'admin_local_master',
          name: 'GloCart Administrator',
          email: 'admin@glocartbd.com',
          phone: '+8801711000000',
          role: 'admin',
          status: 'active',
          orderCount: 0,
          totalSpent: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUserProfile(adminProfile);
        return;
      }

      let friendlyMessage = 'Login failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password. Please verify and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many failed login attempts. Please wait a moment or reset password.';
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Email/Password sign-in is disabled. Please sign in with Google or use Quick Admin Access.';
      }
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  // Google Sign-In
  const loginWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isOwnerEmail = 
        result.user.email?.toLowerCase() === 'glocart.qaaga@gmail.com' || 
        result.user.email?.toLowerCase() === 'admin@glocartbd.com';

      if (isOwnerEmail) {
        localStorage.setItem('glocart_admin_session', 'true');
        setIsLocalAdmin(true);
      }
      await fetchUserProfile(result.user);
      return result.user;
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return null;
      }
      let friendly = 'Google sign-in could not be completed.';
      if (err.code === 'auth/popup-blocked') {
        friendly = 'Pop-up window was blocked by your browser. Please allow popups or complete your order directly.';
      } else if (err.code === 'auth/unauthorized-domain') {
        friendly = 'Google sign-in domain authorization notice. You can place your order directly with your mobile number.';
      } else if (err.message) {
        friendly = err.message;
      }
      setError(friendly);
      throw new Error(friendly);
    }
  };

  // Logout
  const logout = async () => {
    setError(null);
    try {
      localStorage.removeItem('glocart_admin_session');
    } catch {
      // ignore
    }
    setIsLocalAdmin(false);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUserProfile(null);
  };

  // Forgot password / reset email
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      let msg = err.message || 'Could not send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No registered account found with this email address.';
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  // Resend email verification
  const resendVerification = async () => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
    }
  };

  // Update profile
  const updateCustomerProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
      throw err;
    }
  };

  const isAdmin = 
    isLocalAdmin ||
    userProfile?.role === 'admin' ||
    currentUser?.email?.toLowerCase() === 'admin@glocartbd.com' ||
    currentUser?.email?.toLowerCase() === 'glocart.qaaga@gmail.com';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        loading,
        error,
        signup,
        login,
        loginAsAdminQuick,
        loginWithGoogle,
        logout,
        resetPassword,
        resendVerification,
        updateCustomerProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
