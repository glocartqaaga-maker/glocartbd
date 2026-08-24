import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Globe,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BD_DISTRICTS } from '../lib/bd-locations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'forgot';
  onSuccess?: () => void;
  onOpenAdmin?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onSuccess,
  onOpenAdmin,
}) => {
  const { 
    signup, 
    login, 
    loginWithGoogle, 
    resetPassword, 
    error, 
    clearError,
    isAdmin 
  } = useAuth();
  
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'forgot'>(
    initialTab === 'register' ? 'register' : initialTab === 'forgot' ? 'forgot' : 'login'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');

  // Selected district areas
  const currentDistrictObj = BD_DISTRICTS.find((d) => d.name === district) || BD_DISTRICTS[0];

  if (!isOpen) return null;

  const handleSwitchMode = (mode: 'login' | 'register' | 'forgot') => {
    setViewMode(mode);
    setLocalError(null);
    setSuccessMessage(null);
    clearError();
  };

  const isDomainAuthError = 
    localError === 'GOOGLE_UNAUTHORIZED_DOMAIN' || 
    error === 'GOOGLE_UNAUTHORIZED_DOMAIN' ||
    localError?.includes('domain authorization') ||
    error?.includes('domain authorization');

  const handleCopyCurrentDomain = () => {
    try {
      const hostname = window.location.hostname;
      navigator.clipboard.writeText(hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // fallback
    }
  };

  // Unified Sign In handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setLocalError('Please enter your Mobile Number or Email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(cleanId, password);
      
      const cleanLower = cleanId.toLowerCase();
      const isTryingAdmin = 
        cleanLower === 'admin' || 
        cleanLower === 'admin@glocartbd.com' || 
        cleanLower === 'glocart.qaaga@gmail.com' ||
        password === 'glo123cart';

      setSuccessMessage('Signed in successfully!');
      
      setTimeout(() => {
        onSuccess?.();
        // Auto open admin dashboard if admin signs in
        if (isTryingAdmin && onOpenAdmin) {
          onOpenAdmin();
        }
        onClose();
      }, 400);
    } catch (err: any) {
      setLocalError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 11) {
      setLocalError('Please enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        name,
        email,
        phone,
        password,
        district,
        area: area || currentDistrictObj.areas[0] || '',
        address,
      });
      setSuccessMessage('Account created successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setSuccessMessage('Password reset link sent to your email inbox.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMessage('Google sign-in successful!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 400);
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 my-6"
      >
        {/* Modal Header */}
        <div className="p-5 pb-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {viewMode === 'login' && 'Sign In'}
              {viewMode === 'register' && 'Create Account'}
              {viewMode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {viewMode === 'login' && 'Enter your Mobile Number or Email and Password'}
              {viewMode === 'register' && 'Sign up to place orders and track delivery'}
              {viewMode === 'forgot' && 'Enter your email to receive a password reset link'}
            </p>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Domain Authorization Notice Banner for Google Auth */}
          {isDomainAuthError && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <Globe className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Google Sign-In Domain Authorization
                  </h4>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                    এই ডোমেনটি ফায়ারবেস কনসোলের <b>Authorized Domains</b>-এ যুক্ত করুন অথবা মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে সরাসরি সাইন-ইন করুন।
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-amber-200 text-xs">
                <span className="font-mono text-stone-700 text-[11px] truncate select-all">{window.location.hostname}</span>
                <button
                  type="button"
                  onClick={handleCopyCurrentDomain}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-[11px] shrink-0 transition-colors flex items-center gap-1"
                >
                  {copiedDomain ? <Check className="w-3 h-3 text-stone-950" /> : <Copy className="w-3 h-3" />}
                  {copiedDomain ? 'Copied' : 'Copy Domain'}
                </button>
              </div>
            </div>
          )}

          {/* Standard Notifications */}
          {!isDomainAuthError && (localError || error) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. SIGN IN VIEW */}
          {viewMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <input
                    id="input-login-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="017XXXXXXXX or name@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">Password</label>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot')}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </button>

              {/* Social Login Separator */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <span className="relative px-3 bg-white text-[11px] font-semibold text-stone-400 uppercase">
                  or
                </span>
              </div>

              {/* Google Sign-In */}
              <button
                id="btn-google-signin"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 shadow-2xs flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google Account</span>
              </button>

              {/* Bottom Sign Up Link */}
              <div className="pt-2 text-center text-xs text-stone-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  id="btn-switch-to-signup"
                  onClick={() => handleSwitchMode('register')}
                  className="text-amber-700 hover:text-amber-900 font-bold underline ml-1"
                >
                  Sign Up
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGN UP (REGISTER) VIEW */}
          {viewMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Name (আপনার নাম) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Hossain"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <UserIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-reg-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                    />
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Email Address <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                    />
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">District</label>
                  <select
                    id="input-reg-district"
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      const dObj = BD_DISTRICTS.find((d) => d.name === e.target.value);
                      setArea(dObj?.areas[0] || '');
                    }}
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  >
                    {BD_DISTRICTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name} {d.isDhaka ? '(Inside Dhaka)' : '(Outside Dhaka)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Area / Thana</label>
                  <input
                    id="input-reg-area"
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Banani / Dhanmondi"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Address</label>
                <div className="relative">
                  <input
                    id="input-reg-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, Road, Block, Landmark..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Password</label>
                  <input
                    id="input-reg-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 chars"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Confirm Password</label>
                  <input
                    id="input-reg-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                id="btn-submit-register"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>

              {/* Bottom Sign In Link */}
              <div className="pt-2 text-center text-xs text-stone-600">
                Already have an account?{' '}
                <button
                  type="button"
                  id="btn-switch-to-signin"
                  onClick={() => handleSwitchMode('login')}
                  className="text-amber-700 hover:text-amber-900 font-bold underline ml-1"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD VIEW */}
          {viewMode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    id="input-forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                id="btn-submit-forgot"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="w-full text-center text-xs font-semibold text-stone-600 hover:text-stone-900 py-1"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
