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
  Building,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BD_DISTRICTS } from '../lib/bd-locations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'forgot' | 'admin';
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
  const { signup, login, loginAsAdminQuick, loginWithGoogle, resetPassword, error, clearError, isAdmin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'admin'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');

  // Selected district areas
  const currentDistrictObj = BD_DISTRICTS.find((d) => d.name === district) || BD_DISTRICTS[0];

  if (!isOpen) return null;

  const handleTabSwitch = (newTab: 'login' | 'register' | 'forgot' | 'admin') => {
    setTab(newTab);
    setLocalError(null);
    setSuccessMessage(null);
    clearError();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await login(email, password);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    setLocalError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await loginAsAdminQuick();
      setSuccessMessage('Admin mode activated successfully!');
      setTimeout(() => {
        onSuccess?.();
        if (onOpenAdmin) {
          onOpenAdmin();
        }
        onClose();
      }, 500);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to activate admin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    // Validation
    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 11) {
      setLocalError('Please enter a valid 11-digit Bangladesh mobile number (e.g. 01711223344).');
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
      setSuccessMessage('Account created successfully! Verification email sent.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Google Sign-In failed.');
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
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 my-8"
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {tab === 'login' && 'Sign In to GloCart BD'}
              {tab === 'register' && 'Create Customer Account'}
              {tab === 'forgot' && 'Reset Password'}
              {tab === 'admin' && 'Admin Portal Access'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {tab === 'login' && 'Access your orders, cart, and profile'}
              {tab === 'register' && 'Join GloCart BD for instant checkout & tracking'}
              {tab === 'forgot' && 'Enter your registered email to receive reset link'}
              {tab === 'admin' && 'Sign in to manage products, categories, orders & settings'}
            </p>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        {tab !== 'forgot' && (
          <div className="flex border-b border-stone-200 bg-stone-100/50 p-1">
            <button
              id="tab-btn-login"
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'login'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-btn-register"
              onClick={() => handleTabSwitch('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'register'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Register
            </button>
            <button
              id="tab-btn-admin"
              onClick={() => handleTabSwitch('admin')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                tab === 'admin'
                  ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4">
          {/* Notifications */}
          {(localError || error) && (
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

          {/* ADMIN TAB */}
          {tab === 'admin' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 font-black flex items-center justify-center text-xs">
                    G
                  </div>
                  <h3 className="text-xs font-bold text-amber-950">Store Administrator Portal</h3>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Authorized access to update products, process customer orders, configure Steadfast logistics, and manage store banners.
                </p>
              </div>

              {/* 1-Click Instant Admin Sign-in */}
              <button
                id="btn-quick-admin-login"
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-stone-950 fill-stone-950" />
                    <span>1-Click Instant Admin Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <div className="relative my-2 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <span className="relative px-3 bg-white text-[11px] font-semibold text-stone-400 uppercase">
                  or sign in with password
                </span>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Admin Username or Email
                  </label>
                  <div className="relative">
                    <input
                      id="input-admin-email"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin or glocart.qaaga@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="input-admin-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="glo123cart"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin');
                      setPassword('glo123cart');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition-colors"
                  >
                    Autofill Credentials
                  </button>
                  <button
                    id="btn-admin-manual-submit"
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 px-3 bg-stone-900 hover:bg-black text-amber-400 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Log In'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email or Admin Username
                </label>
                <div className="relative">
                  <input
                    id="input-login-email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com or admin"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">Password</label>
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('forgot')}
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
                    placeholder="Enter your password"
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

              {/* Development Admin Quick Note */}
              <div className="p-2.5 bg-stone-100 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 flex items-center justify-between">
                <span>Default Admin Login: <b>admin</b> / <b>glo123cart</b></span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin');
                    setPassword('glo123cart');
                  }}
                  className="text-amber-700 font-bold hover:underline"
                >
                  Autofill
                </button>
              </div>

              {/* Social Login Separator */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <span className="relative px-3 bg-white text-[11px] font-semibold text-stone-400 uppercase">
                  or continue with
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
                <span>Sign in with Google</span>
              </button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
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
                  <label className="block text-xs font-bold text-stone-700 mb-1">BD Mobile Number</label>
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
                  <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      id="input-reg-email"
                      type="email"
                      required
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
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {tab === 'forgot' && (
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
                onClick={() => handleTabSwitch('login')}
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
