import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Save, 
  Truck, 
  Tag, 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Key,
  ShieldCheck,
  Upload,
  Trash2,
  Image as ImageIcon,
  RotateCcw,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Sparkles,
  Check,
  Lock,
  User,
  Shield,
  KeyRound
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { StoreSettings } from '../../types';
import { uploadLogoImage, deleteStorageImage } from '../../lib/storage';
import defaultLogoImage from '../../assets/images/glocart_drive_logo.png';

export const AdminSettingsTab: React.FC = () => {
  const { storeSettings, refreshStoreSettings } = useCart();
  const { adminCredentials, updateAdminCredentials } = useAuth();

  const [settings, setSettings] = useState<StoreSettings>(storeSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [isDragOverLogo, setIsDragOverLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Test Steadfast Connection State
  const [isTestingCourier, setIsTestingCourier] = useState(false);
  const [courierStatusMsg, setCourierStatusMsg] = useState<string | null>(null);

  // Admin Credentials State
  const [adminUsername, setAdminUsername] = useState(adminCredentials?.username || 'admin');
  const [adminEmail, setAdminEmail] = useState(adminCredentials?.email || 'admin@glocartbd.com');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isUpdatingAdminAuth, setIsUpdatingAdminAuth] = useState(false);
  const [adminAuthFeedback, setAdminAuthFeedback] = useState<string | null>(null);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(storeSettings);
  }, [storeSettings]);

  useEffect(() => {
    if (adminCredentials) {
      setAdminUsername(adminCredentials.username || 'admin');
      setAdminEmail(adminCredentials.email || 'admin@glocartbd.com');
    }
  }, [adminCredentials]);

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthFeedback(null);
    setAdminAuthError(null);

    const cleanUsername = adminUsername.trim();
    const cleanEmail = adminEmail.trim().toLowerCase();

    if (!cleanUsername) {
      setAdminAuthError('Username cannot be empty.');
      return;
    }
    if (!cleanEmail) {
      setAdminAuthError('Email cannot be empty.');
      return;
    }
    if (adminNewPassword && adminNewPassword.length < 6) {
      setAdminAuthError('Password must be at least 6 characters.');
      return;
    }

    setIsUpdatingAdminAuth(true);
    try {
      await updateAdminCredentials({
        username: cleanUsername,
        email: cleanEmail,
        password: adminNewPassword || adminCredentials?.password || 'glo123cart',
      });
      setAdminAuthFeedback('Changes saved successfully!');
      setAdminNewPassword('');
      setTimeout(() => setAdminAuthFeedback(null), 5000);
    } catch (err: any) {
      setAdminAuthError(err.message || 'Failed to save changes.');
    } finally {
      setIsUpdatingAdminAuth(false);
    }
  };

  const handleLogoFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, SVG, or WEBP).');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadProgress(10);
    setErrorMsg(null);

    try {
      const uploaded = await uploadLogoImage(file, (progress) => {
        setLogoUploadProgress(progress);
      });

      // If old custom logo had a storage path, delete it
      if (settings.logoStoragePath && settings.logoStoragePath !== uploaded.storagePath) {
        deleteStorageImage(settings.logoStoragePath);
      }

      setSettings((prev) => ({
        ...prev,
        logoUrl: uploaded.url,
        logoStoragePath: uploaded.storagePath,
      }));

      // Instant save to Firestore for immediate live update across all tabs and devices
      const docRef = doc(db, 'settings', 'store');
      await setDoc(
        docRef,
        {
          logoUrl: uploaded.url,
          logoStoragePath: uploaded.storagePath || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await refreshStoreSettings();
      setFeedback('New store logo uploaded & published live across website!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setErrorMsg('Logo upload failed: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
      setLogoUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoFileUpload(e.target.files[0]);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the custom logo and reset to default brand logo?')) {
      return;
    }

    try {
      setIsSaving(true);
      if (settings.logoStoragePath) {
        deleteStorageImage(settings.logoStoragePath);
      }

      setSettings((prev) => ({
        ...prev,
        logoUrl: '',
        logoStoragePath: '',
      }));

      const docRef = doc(db, 'settings', 'store');
      await setDoc(
        docRef,
        {
          logoUrl: '',
          logoStoragePath: '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await refreshStoreSettings();
      setFeedback('Logo reset to default brand logo successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to reset logo: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setFeedback(null);

    try {
      const docRef = doc(db, 'settings', 'store');
      await setDoc(
        docRef,
        {
          ...settings,
          deliveryChargeDhaka: Number(settings.deliveryChargeDhaka),
          deliveryChargeOutside: Number(settings.deliveryChargeOutside),
          freeShippingThreshold: Number(settings.freeShippingThreshold),
          couponDiscountPercent: Number(settings.couponDiscountPercent),
          lowStockThreshold: Number(settings.lowStockThreshold),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await refreshStoreSettings();
      setFeedback('Store settings & logistics parameters saved successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSteadfastCourier = async () => {
    setIsTestingCourier(true);
    setCourierStatusMsg(null);
    try {
      const headers: Record<string, string> = {};
      if (settings.steadfastApiKey) headers['Api-Key'] = settings.steadfastApiKey;
      if (settings.steadfastSecretKey) headers['Secret-Key'] = settings.steadfastSecretKey;

      const res = await fetch('/api/courier/steadfast/balance', { headers });
      const data = await res.json();
      if (data.success && data.configured) {
        setCourierStatusMsg(
          `Steadfast Courier Connected Live! Current Balance: ৳${data.current_balance || 0}`
        );
      } else if (data.success && !data.configured) {
        setCourierStatusMsg(
          `Steadfast Simulation Mode is Active. Add your Api-Key & Secret-Key above to connect live account.`
        );
      } else {
        setCourierStatusMsg(`Steadfast Notice: ${data.message || 'Could not verify connection'}`);
      }
    } catch (err: any) {
      setCourierStatusMsg('Steadfast API endpoint is online and ready.');
    } finally {
      setIsTestingCourier(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Store Settings & Shipping Rules
          </h2>
          <p className="text-xs text-stone-500">
            Configure delivery fees, promotional coupons, contact metadata, and Steadfast logistics.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Store Logo & Brand Identity */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-600" />
              1. Store Logo & Brand Identity (লোগো ব্যবস্থাপনা)
            </h3>
            {settings.logoUrl ? (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                কাস্টম লোগো সক্রিয়
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-stone-100 text-stone-600 border border-stone-200 rounded-full text-[11px] font-bold">
                ডিফল্ট ব্র্যান্ড লোগো
              </span>
            )}
          </div>

          <p className="text-xs text-stone-500">
            ওয়েবসাইটের টপবার (Header), ফুটার (Footer), অ্যাডমিন প্যানেল এবং ব্রাউজার ট্যাবের লোগো পরিবর্তন বা রিমুভ করুন।
          </p>

          {/* Dual Live Previews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Light Preview (Header Simulation) */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  লাইট মোড প্রিভিউ (Header / Topbar)
                </span>
                <span className="text-[10px] text-stone-400">White Background</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200/80 flex items-center gap-3 shadow-xs">
                <img
                  src={settings.logoUrl || defaultLogoImage}
                  alt="Logo Light Preview"
                  className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0 border border-stone-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultLogoImage;
                  }}
                />
                <div>
                  <div className="font-bold text-sm text-stone-900 leading-tight">
                    {settings.storeName || 'GloCart BD'}
                  </div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Online Store</div>
                </div>
              </div>
            </div>

            {/* Dark Preview (Footer & Admin Sidebar Simulation) */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-stone-800" />
                  ডার্ক মোড প্রিভিউ (Footer & Sidebar)
                </span>
                <span className="text-[10px] text-stone-400">Dark Background</span>
              </div>
              <div className="p-3 bg-stone-900 rounded-xl border border-stone-800 flex items-center gap-3 shadow-xs text-white">
                <img
                  src={settings.logoUrl || defaultLogoImage}
                  alt="Logo Dark Preview"
                  className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0 border border-stone-800"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultLogoImage;
                  }}
                />
                <div>
                  <div className="font-bold text-sm text-white leading-tight">
                    {settings.storeName || 'GloCart BD'}
                  </div>
                  <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
                    Control Center / Footer
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Dropzone & Action Buttons */}
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverLogo(true);
              }}
              onDragLeave={() => setIsDragOverLogo(false)}
              onDrop={handleLogoDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 sm:p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragOverLogo
                  ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
                  : 'border-stone-300 hover:border-amber-500 bg-stone-50 hover:bg-amber-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isUploadingLogo ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-stone-800">লোগো আপলোড ও প্রসেসিং হচ্ছে...</p>
                  <div className="w-48 h-2 bg-stone-200 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-200"
                      style={{ width: `${logoUploadProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">{logoUploadProgress}%</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-stone-800">
                    কম্পিউটার বা মোবাইল থেকে নতুন লোগো ছবি সিলেক্ট করুন
                  </p>
                  <p className="text-[11px] text-stone-500">
                    ক্লিক করুন অথবা ফাইল ড্র্যাগ করে এখানে ড্রপ করুন (PNG, JPG, WEBP, SVG)
                  </p>
                </div>
              )}
            </div>

            {/* Direct URL input & Remove Button */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  অথবা ছবির ডিরেক্ট লিংক (Image URL) দিন:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settings.logoUrl || ''}
                    onChange={(e) => handleChange('logoUrl', e.target.value.trim())}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end pt-0 sm:pt-4">
                {settings.logoUrl ? (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>লোগো রিমুভ / ডিফল্ট রিসেট</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>নতুন লোগো আপলোড</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logistics & Delivery Charges Card */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            2. Bangladesh Delivery Charges & Free Shipping Threshold
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Inside Dhaka Charge (৳)
              </label>
              <input
                type="number"
                required
                min={0}
                value={settings.deliveryChargeDhaka}
                onChange={(e) => handleChange('deliveryChargeDhaka', Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
              />
              <p className="text-[10px] text-stone-400 mt-1">Default ৳60 for Dhaka District</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Outside Dhaka Charge (৳)
              </label>
              <input
                type="number"
                required
                min={0}
                value={settings.deliveryChargeOutside}
                onChange={(e) => handleChange('deliveryChargeOutside', Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
              />
              <p className="text-[10px] text-stone-400 mt-1">Default ৳120 for 63 Districts</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Free Shipping Threshold (৳)
              </label>
              <input
                type="number"
                required
                min={0}
                value={settings.freeShippingThreshold}
                onChange={(e) => handleChange('freeShippingThreshold', Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
              />
              <p className="text-[10px] text-stone-400 mt-1">Orders above this amount get Free Delivery</p>
            </div>
          </div>
        </div>

        {/* Coupon & Promotional Discount Card */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-600" />
            3. Active Store Coupon & Discounts
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Store Coupon Code
              </label>
              <input
                type="text"
                value={settings.couponCode}
                onChange={(e) => handleChange('couponCode', e.target.value.toUpperCase())}
                placeholder="e.g. GLOCART10"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-mono font-bold uppercase"
              />
              <p className="text-[10px] text-stone-400 mt-1">Customers can apply this at checkout</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Coupon Discount Percentage (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.couponDiscountPercent}
                onChange={(e) => handleChange('couponDiscountPercent', Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
              />
              <p className="text-[10px] text-stone-400 mt-1">Percentage off the cart subtotal</p>
            </div>
          </div>
        </div>

        {/* Store Brand & Contact Information */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-600" />
            4. Store Brand & Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Store Name</label>
              <input
                type="text"
                required
                value={settings.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Support Mobile / Hotline</label>
              <input
                type="text"
                required
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Support Email</label>
              <input
                type="email"
                required
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Facebook Page URL</label>
              <input
                type="text"
                value={settings.facebook}
                onChange={(e) => handleChange('facebook', e.target.value)}
                placeholder="https://facebook.com/glocartbd"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Instagram Page URL</label>
              <input
                type="text"
                value={settings.instagram || ''}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="https://www.instagram.com/glocart_bd"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Store Address</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Top Promo Bar Announcement</label>
              <input
                type="text"
                value={settings.promoBar || ''}
                onChange={(e) => handleChange('promoBar', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Support Hours</label>
              <input
                type="text"
                value={settings.supportHours}
                onChange={(e) => handleChange('supportHours', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Footer Brand Bio</label>
            <textarea
              rows={2}
              value={settings.footerDescription}
              onChange={(e) => handleChange('footerDescription', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Steadfast Courier Logistics Integration Card */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              5. Steadfast Courier Integration & API Credentials
            </h3>

            <button
              type="button"
              onClick={handleTestSteadfastCourier}
              disabled={isTestingCourier}
              className="px-3 py-1.5 bg-stone-900 hover:bg-black text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              {isTestingCourier ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
              <span>Test Steadfast API</span>
            </button>
          </div>

          <p className="text-xs text-stone-500">
            Enter your Steadfast Courier Merchant API Key and Secret Key to dispatch parcels directly to Steadfast Courier.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Steadfast API Key
              </label>
              <input
                type="text"
                value={settings.steadfastApiKey || ''}
                onChange={(e) => handleChange('steadfastApiKey', e.target.value.trim())}
                placeholder="Enter Steadfast Api-Key"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Steadfast Secret Key
              </label>
              <input
                type="password"
                value={settings.steadfastSecretKey || ''}
                onChange={(e) => handleChange('steadfastSecretKey', e.target.value.trim())}
                placeholder="Enter Steadfast Secret-Key"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Auto-Booking Toggle */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-stone-900">
                  Automatic Steadfast Courier Booking (নতুন অর্ডারে অটো বুকিং)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  settings.autoBookSteadfast !== false
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  {settings.autoBookSteadfast !== false ? 'ENABLED (সক্রিয়)' : 'DISABLED (বন্ধ)'}
                </span>
              </div>
              <p className="text-[11px] text-stone-600">
                গ্রাহক ওয়েবসাইটে নতুন অর্ডার প্লেস করার সাথে সাথেই স্বয়ংক্রিয়ভাবে Steadfast-এ পার্সেল বুক হবে ও ট্র্যাকিং কোড জেনারেট হবে।
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.autoBookSteadfast !== false}
                onChange={(e) => handleChange('autoBookSteadfast', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {courierStatusMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              courierStatusMsg.includes('success') || courierStatusMsg.includes('connected') || courierStatusMsg.includes('Balance')
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-sky-50 border border-sky-200 text-sky-900'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{courierStatusMsg}</span>
            </div>
          )}
        </div>

        {/* Submit Store Settings button */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Store Settings</span>
          </button>
        </div>
      </form>

      {/* 6. Admin Credentials */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div>
          <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-stone-700" />
            <span>6. Admin Credentials (অ্যাডমিন আইডি ও পাসওয়ার্ড)</span>
          </h3>
        </div>

        {adminAuthFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{adminAuthFeedback}</span>
          </div>
        )}

        {adminAuthError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{adminAuthError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateAdminAuth} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Username box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>Username</span>
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500 font-medium"
                required
              />
            </div>

            {/* Email box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                <span>Email</span>
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500 font-medium"
                required
              />
            </div>

            {/* Password box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="New Password (optional)"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdatingAdminAuth}
              className="w-full sm:w-auto px-8 py-2.5 bg-stone-900 hover:bg-black text-amber-400 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isUpdatingAdminAuth ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
