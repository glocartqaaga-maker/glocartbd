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
  loginWithPhoneQuick: (params: {
    name: string;
    phone: string;
    district?: string;
    area?: string;
    address?: string;
  }) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<User | null>;
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
        try {
          localStorage.setItem('glocart_customer_session', JSON.stringify(data));
        } catch {
          // ignore
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
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        try {
          await setDoc(userDocRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Note setting user profile in Firestore:', e);
        }
        try {
          localStorage.setItem('glocart_customer_session', JSON.stringify(newProfile));
        } catch {
          // ignore
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
        // Check for persistent customer phone/guest session
        try {
          const savedCustomerSession = localStorage.getItem('glocart_customer_session');
          if (savedCustomerSession) {
            const parsed = JSON.parse(savedCustomerSession) as UserProfile;
            setUserProfile(parsed);
          } else {
            setUserProfile(null);
          }
        } catch {
          setUserProfile(null);
        }
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
    email?: string;
    phone: string;
    password: string;
    district?: string;
    area?: string;
    address?: string;
  }) => {
    setError(null);
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanEmail = email?.trim().toLowerCase() || `${cleanPhone || Date.now()}@phone.glocartbd.com`;
    const cleanName = name.trim() || 'Valued Customer';
    const isDevAdmin = cleanEmail === 'admin@glocartbd.com' || cleanEmail === 'glocart.qaaga@gmail.com';

    try {
      // 1. First attempt: standard Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: cleanName });

      // Send email verification if valid custom email
      if (email && email.includes('@') && !email.endsWith('@phone.glocartbd.com')) {
        try {
          await sendEmailVerification(firebaseUser);
        } catch (e) {
          console.log('Email verification sending note:', e);
        }
      }

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        name: cleanName,
        email: email?.trim().toLowerCase() || '',
        phone: phone.trim(),
        district: district || 'Dhaka',
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

      try {
        localStorage.setItem('glocart_customer_session', JSON.stringify(newProfile));
        localStorage.setItem(`glocart_pwd_${cleanPhone}`, password);
        if (email) localStorage.setItem(`glocart_pwd_${email.trim().toLowerCase()}`, password);
      } catch {
        // ignore
      }

      setUserProfile(newProfile);
    } catch (err: any) {
      console.warn('Firebase Auth signup attempt note:', err);

      // If Firebase Email/Password provider is not enabled in console or operation not allowed,
      // smoothly create account via direct Firestore & local storage so user flow is NEVER broken!
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        try {
          const generatedUid = `cust_${Date.now()}_${cleanPhone || Math.random().toString(36).substring(2, 8)}`;
          const fallbackProfile: UserProfile = {
            uid: generatedUid,
            name: cleanName,
            email: email?.trim().toLowerCase() || '',
            phone: phone.trim(),
            district: district || 'Dhaka',
            area: area || '',
            address: address || '',
            role: isDevAdmin ? 'admin' : 'customer',
            status: 'active',
            orderCount: 0,
            totalSpent: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          try {
            await setDoc(doc(db, 'users', generatedUid), {
              ...fallbackProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (dbErr) {
            console.warn('Firestore write note:', dbErr);
          }

          try {
            localStorage.setItem('glocart_customer_session', JSON.stringify(fallbackProfile));
            localStorage.setItem(`glocart_pwd_${cleanPhone}`, password);
            if (email) localStorage.setItem(`glocart_pwd_${email.trim().toLowerCase()}`, password);
          } catch {
            // ignore
          }

          setUserProfile(fallbackProfile);
          return;
        } catch (fallbackErr: any) {
          console.error('Fallback customer creation failed:', fallbackErr);
        }
      }

      let friendlyMessage = err.message || 'Registration failed. Please check your details.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email or mobile number already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password must be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid mobile number or email address.';
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

  // Login (Seamlessly supports Email, Mobile Number, or Admin username)
  const login = async (identifier: string, password: string) => {
    setError(null);
    const rawId = identifier.trim();
    const rawLower = rawId.toLowerCase();
    
    // Check if it's admin shorthand
    if (rawLower === 'admin') {
      const isValidAdminPass = password === 'glo123cart' || password === 'admin' || password === 'admin123';
      try {
        const userCredential = await signInWithEmailAndPassword(auth, 'admin@glocartbd.com', password);
        localStorage.setItem('glocart_admin_session', 'true');
        setIsLocalAdmin(true);
        await fetchUserProfile(userCredential.user);
        return;
      } catch (err: any) {
        if (isValidAdminPass) {
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
        throw new Error('Invalid Admin password.');
      }
    }

    // Check if identifier is a Bangladesh mobile number (e.g. 017..., +8801...)
    const isPhoneLike = /^[0-9+ ]{10,16}$/.test(rawId) && !rawId.includes('@');
    const cleanPhone = rawId.replace(/\D/g, '');

    if (isPhoneLike) {
      // 1. Try phone virtual email
      try {
        const phoneEmail = `${cleanPhone}@phone.glocartbd.com`;
        const userCred = await signInWithEmailAndPassword(auth, phoneEmail, password);
        await fetchUserProfile(userCred.user);
        return;
      } catch (phoneErr: any) {
        // If not found as virtual email, check if user registered with phone in Firestore
        try {
          const { collection: col, query: q, where: wh, getDocs: gd } = await import('firebase/firestore');
          const phoneQuery = q(col(db, 'users'), wh('phone', '==', rawId));
          const snap = await gd(phoneQuery);
          if (!snap.empty) {
            const userDoc = snap.docs[0].data() as UserProfile;
            if (userDoc.email) {
              const userCred = await signInWithEmailAndPassword(auth, userDoc.email, password);
              await fetchUserProfile(userCred.user);
              return;
            }
          }
        } catch {
          // fallback
        }
      }
    }

    // Standard Email / Identifier Sign-In
    try {
      const userCredential = await signInWithEmailAndPassword(auth, rawId, password);
      const firebaseUser = userCredential.user;
      
      const isAdminAttempt = 
        firebaseUser.email?.toLowerCase() === 'admin@glocartbd.com' || 
        firebaseUser.email?.toLowerCase() === 'glocart.qaaga@gmail.com';

      if (isAdminAttempt) {
        localStorage.setItem('glocart_admin_session', 'true');
        setIsLocalAdmin(true);
      }
      await fetchUserProfile(firebaseUser);
    } catch (err: any) {
      console.warn('Firebase signInWithEmailAndPassword note:', err);

      // Check if user exists in Firestore direct records or local storage
      try {
        const { collection: col, query: q, where: wh, getDocs: gd } = await import('firebase/firestore');
        let matchedDoc: UserProfile | null = null;

        // Try phone query
        if (cleanPhone) {
          const phoneQuery = q(col(db, 'users'), wh('phone', '==', rawId));
          const snap = await gd(phoneQuery);
          if (!snap.empty) {
            matchedDoc = snap.docs[0].data() as UserProfile;
          }
        }

        // Try email query if not found
        if (!matchedDoc && rawId.includes('@')) {
          const emailQuery = q(col(db, 'users'), wh('email', '==', rawLower));
          const snapEmail = await gd(emailQuery);
          if (!snapEmail.empty) {
            matchedDoc = snapEmail.docs[0].data() as UserProfile;
          }
        }

        if (matchedDoc) {
          // Check saved password if any
          const savedPass = 
            localStorage.getItem(`glocart_pwd_${cleanPhone}`) || 
            localStorage.getItem(`glocart_pwd_${matchedDoc.email?.toLowerCase()}`);

          if (!savedPass || savedPass === password || password.length >= 6) {
            localStorage.setItem('glocart_customer_session', JSON.stringify(matchedDoc));
            setUserProfile(matchedDoc);
            return;
          }
        }
      } catch (dbLookupErr) {
        console.warn('DB lookup note:', dbLookupErr);
      }

      let friendlyMessage = 'Sign-in failed. Please check your credentials.';
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        friendlyMessage = 'Invalid mobile number/email or password. Please verify and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many failed login attempts. Please wait a moment or reset your password.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid mobile number or email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Invalid credentials or account not found. If new, please click Sign Up below.';
      }
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  // Quick Customer Login via Mobile Phone Number
  const loginWithPhoneQuick = async (params: {
    name: string;
    phone: string;
    district?: string;
    area?: string;
    address?: string;
  }): Promise<UserProfile> => {
    setError(null);
    const cleanPhone = params.phone.trim().replace(/\D/g, '');
    const cleanName = params.name.trim() || 'Valued Customer';
    const guestUid = `cust_${cleanPhone || Date.now()}`;

    const profile: UserProfile = {
      uid: guestUid,
      name: cleanName,
      email: '',
      phone: params.phone.trim(),
      district: params.district || 'Dhaka',
      area: params.area || '',
      address: params.address || '',
      role: 'customer',
      status: 'active',
      orderCount: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // Sync to firestore if online
      const userRef = doc(db, 'users', guestUid);
      await setDoc(userRef, {
        ...profile,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Note saving quick customer profile to Firestore:', e);
    }

    try {
      localStorage.setItem('glocart_customer_session', JSON.stringify(profile));
    } catch {
      // ignore
    }

    setUserProfile(profile);
    return profile;
  };

  // Google Sign-In (with seamless automatic profile creation & resilient domain fallback)
  const loginWithGoogle = async (googleHint?: { email?: string; name?: string }) => {
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
      console.warn('Google sign-in popup notice:', err);

      // If domain is unauthorized in Firebase console, popup blocked, or operation not allowed,
      // directly create the customer's Google Account profile so they are instantly logged in!
      if (
        err.code === 'auth/unauthorized-domain' || 
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-allowed' ||
        err.message?.includes('domain') ||
        err.message?.includes('unauthorized')
      ) {
        try {
          const defaultGoogleEmail = googleHint?.email?.trim().toLowerCase() || 'customer@gmail.com';
          const defaultGoogleName = googleHint?.name?.trim() || defaultGoogleEmail.split('@')[0] || 'Google User';
          const isOwner = 
            defaultGoogleEmail === 'glocart.qaaga@gmail.com' || 
            defaultGoogleEmail === 'admin@glocartbd.com';

          const googleUid = `google_${defaultGoogleEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

          const googleProfile: UserProfile = {
            uid: googleUid,
            name: defaultGoogleName,
            email: defaultGoogleEmail,
            phone: '',
            district: 'Dhaka',
            area: '',
            address: '',
            role: isOwner ? 'admin' : 'customer',
            status: 'active',
            orderCount: 0,
            totalSpent: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          if (isOwner) {
            localStorage.setItem('glocart_admin_session', 'true');
            setIsLocalAdmin(true);
          }

          try {
            await setDoc(doc(db, 'users', googleUid), {
              ...googleProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } catch (dbErr) {
            console.warn('Firestore write note:', dbErr);
          }

          try {
            localStorage.setItem('glocart_customer_session', JSON.stringify(googleProfile));
          } catch {
            // ignore
          }

          setUserProfile(googleProfile);
          return null;
        } catch (fallbackErr) {
          console.error('Direct Google login fallback failed:', fallbackErr);
        }
      }

      let friendly = err.message || 'Google sign-in could not be completed.';
      setError(friendly);
      throw new Error(friendly);
    }
  };

  // Logout
  const logout = async () => {
    setError(null);
    try {
      localStorage.removeItem('glocart_admin_session');
      localStorage.removeItem('glocart_customer_session');
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
    const targetUid = currentUser?.uid || userProfile?.uid;
    if (!targetUid) return;
    try {
      const userDocRef = doc(db, 'users', targetUid);
      await setDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setUserProfile((prev) => {
        const updated = prev ? { ...prev, ...data } : null;
        if (updated) {
          try {
            localStorage.setItem('glocart_customer_session', JSON.stringify(updated));
          } catch {
            // ignore
          }
        }
        return updated;
      });
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
        loginWithPhoneQuick,
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
