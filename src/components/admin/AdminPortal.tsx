import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminDashboardTab } from './AdminDashboardTab';
import { AdminProductsTab } from './AdminProductsTab';
import { AdminCategoriesTab } from './AdminCategoriesTab';
import { AdminSlidersTab } from './AdminSlidersTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminCustomersTab } from './AdminCustomersTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { Category } from '../../types';
import { Lock, User, Eye, EyeOff, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';

interface AdminPortalProps {
  onExitAdmin: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExitAdmin }) => {
  const { isAdmin, loginAsAdmin, error, clearError } = useAuth();
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);

  // Admin Login gate state
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const unsub = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list: Category[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Category);
        });
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(list);
      },
      (err) => {
        console.warn('Error listening to categories in admin:', err);
      }
    );

    return () => unsub();
  }, [isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    clearError();

    if (!loginId.trim()) {
      setLoginError('Please enter your admin username or email.');
      return;
    }
    if (!password) {
      setLoginError('Please enter your admin password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginAsAdmin(loginId.trim(), password);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authenticated as Admin, show strict Admin Access Login Card
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 font-sans text-stone-100">
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white">Admin Authentication Required</h2>
            <p className="text-xs text-stone-400">
              Enter your admin credentials to access the control center.
            </p>
          </div>

          {(loginError || error) && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError || error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>Username or Email</span>
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Username / Email"
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-2.5 pr-10 bg-stone-800 border border-stone-700 rounded-xl text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Sign In to Dashboard</span>
            </button>
          </form>

          <div className="pt-2 border-t border-stone-800 text-center">
            <button
              type="button"
              onClick={onExitAdmin}
              className="text-xs text-stone-400 hover:text-amber-400 flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storefront</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onExitAdmin={onExitAdmin}
    >
      {currentTab === 'dashboard' && (
        <AdminDashboardTab onNavigateTab={(tab) => setCurrentTab(tab)} />
      )}
      {currentTab === 'products' && (
        <AdminProductsTab categories={categories} />
      )}
      {currentTab === 'categories' && (
        <AdminCategoriesTab
          categories={categories}
          onRefreshCategories={() => {}}
        />
      )}
      {currentTab === 'sliders' && <AdminSlidersTab />}
      {currentTab === 'orders' && <AdminOrdersTab />}
      {currentTab === 'customers' && <AdminCustomersTab />}
      {currentTab === 'settings' && <AdminSettingsTab />}
    </AdminLayout>
  );
};
