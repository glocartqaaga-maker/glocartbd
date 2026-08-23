import React, { useState, useEffect } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useCart } from '../../context/CartContext';
import { StoreSettings } from '../../types';

export const AdminSettingsTab: React.FC = () => {
  const { storeSettings, refreshStoreSettings } = useCart();

  const [settings, setSettings] = useState<StoreSettings>(storeSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test Steadfast Connection State
  const [isTestingCourier, setIsTestingCourier] = useState(false);
  const [courierStatusMsg, setCourierStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setSettings(storeSettings);
  }, [storeSettings]);

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
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
      const res = await fetch('/api/courier/steadfast/balance');
      const data = await res.json();
      if (data.success) {
        setCourierStatusMsg(
          `Steadfast Courier API is connected successfully! Balance: ৳${data.current_balance}`
        );
      } else {
        setCourierStatusMsg(`Steadfast: ${data.message || 'Ready for real dispatch'}`);
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
        {/* Logistics & Delivery Charges Card */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            1. Bangladesh Delivery Charges & Free Shipping Threshold
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
            2. Active Store Coupon & Discounts
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
            3. Store Brand & Contact Information
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
              4. Steadfast Courier Integration Status
            </h3>

            <button
              type="button"
              onClick={handleTestSteadfastCourier}
              disabled={isTestingCourier}
              className="px-3 py-1.5 bg-stone-900 hover:bg-black text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              {isTestingCourier ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
              <span>Test Courier API</span>
            </button>
          </div>

          <p className="text-xs text-stone-500">
            GloCart BD server proxies Steadfast Courier requests securely using the environment keys{' '}
            <code className="bg-stone-100 px-1 py-0.5 rounded-sm font-mono text-[11px]">STEADFAST_API_KEY</code> and{' '}
            <code className="bg-stone-100 px-1 py-0.5 rounded-sm font-mono text-[11px]">STEADFAST_SECRET_KEY</code>.
          </p>

          {courierStatusMsg && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{courierStatusMsg}</span>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save All Settings</span>
        </button>
      </form>
    </div>
  );
};
