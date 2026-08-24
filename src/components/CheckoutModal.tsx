import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  Mail, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  CreditCard,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { BD_DISTRICTS } from '../lib/bd-locations';
import { createOrderAtomically } from '../lib/orders';
import { OrderItem } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderInfo: { orderId: string; orderNumber: string }) => void;
  onRequireLogin: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  onRequireLogin,
}) => {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();
  const { 
    cartItems, 
    subtotal, 
    discount, 
    appliedCoupon, 
    calculateDeliveryCharge, 
    clearCart,
    storeSettings
  } = useCart();

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  
  // Loading & error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (userProfile) {
      if (userProfile.name && !customerName) setCustomerName(userProfile.name);
      if (userProfile.phone && !phone) setPhone(userProfile.phone);
      if (userProfile.email && !email) setEmail(userProfile.email);
      if (userProfile.district) setDistrict(userProfile.district);
      if (userProfile.area && !area) setArea(userProfile.area);
      if (userProfile.address && !address) setAddress(userProfile.address);
    } else if (currentUser?.email && !email) {
      setEmail(currentUser.email);
    }
  }, [userProfile, currentUser]);

  if (!isOpen) return null;

  // Calculate live numbers
  const deliveryCharge = calculateDeliveryCharge(district);
  const grandTotal = Math.max(0, subtotal - discount + deliveryCharge);
  const currentDistrictObj = BD_DISTRICTS.find((d) => d.name === district) || BD_DISTRICTS[0];

  const handleGoogleSignInInline = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle({
        email: email || undefined,
        name: customerName || undefined,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validations
    if (!customerName.trim()) {
      setErrorMessage('Please enter your name for delivery.');
      return;
    }
    
    const digitsOnly = phone.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 10) {
      setErrorMessage('Please provide a valid mobile number (e.g. 017XXXXXXXX) for delivery confirmation.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Please provide your complete delivery street and house address.');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty. Please add products to checkout.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems: OrderItem[] = cartItems.map((item) => {
        const oi: Record<string, any> = {
          productId: item.productId || '',
          name: item.name || 'Product',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          image: item.image || '',
        };
        if (item.oldPrice !== undefined && item.oldPrice !== null && !isNaN(Number(item.oldPrice))) {
          oi.oldPrice = Number(item.oldPrice);
        }
        return oi as OrderItem;
      });

      const result = await createOrderAtomically({
        customerId: currentUser?.uid || `guest_${Date.now()}`,
        customerName,
        phone,
        email: email || currentUser?.email || '',
        district,
        area: area || currentDistrictObj.areas[0] || '',
        address,
        note,
        items: orderItems,
        subtotal,
        deliveryCharge,
        discount,
        grandTotal,
        couponCode: appliedCoupon || '',
        paymentMethod,
      });

      clearCart();
      onClose();
      onOrderSuccess({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="checkout-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="checkout-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl md:max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 my-6"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                Complete Your Order
              </h2>
              <p className="text-xs text-stone-500">
                Safe delivery & fast dispatch across Bangladesh
              </p>
            </div>
          </div>
          <button
            id="btn-close-checkout-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Auth State: Show user info when logged in, or Sign In banner when guest */}
          {(currentUser || userProfile) ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={userProfile?.name || currentUser.displayName || 'User'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-2xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs shrink-0 border-2 border-emerald-400">
                    {(userProfile?.name || currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-stone-900 text-xs sm:text-sm">
                      {userProfile?.name || currentUser?.displayName || 'Valued Customer'}
                    </p>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {userProfile?.phone || currentUser?.email || userProfile?.email || 'Logged In Account'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-100/90 font-bold px-2.5 py-1 rounded-lg border border-emerald-300/60 shrink-0">
                Verified Account
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-stone-800">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                  <UserIcon className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">Sign in for faster checkout & saved address</p>
                  <p className="text-[11px] text-stone-500">Or complete your order directly as a customer below</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="btn-checkout-inline-google"
                  type="button"
                  onClick={handleGoogleSignInInline}
                  disabled={isGoogleLoading}
                  className="flex-1 sm:flex-initial py-2 px-3 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Google Sign In</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onRequireLogin}
                  className="px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
                >
                  Password Sign In
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Delivery Details Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              1. Delivery Address Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Asif Ahmed"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <UserIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  District <span className="text-rose-500">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    const d = BD_DISTRICTS.find((item) => item.name === e.target.value);
                    setArea(d?.areas[0] || '');
                  }}
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                >
                  {BD_DISTRICTS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} {d.isDhaka ? '(Dhaka ৳60)' : '(Outside ৳120)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Area / Thana
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Dhanmondi / Agrabad"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email (for updates)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Full Street & House Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No, Road No, Sector, Block, Apartment No, Landmark..."
                className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Special Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Please call before arriving / Leave with security"
                className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              2. Select Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* COD */}
              <label
                className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[10px] font-bold uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                    Popular
                  </span>
                </div>
                <p className="text-xs font-bold text-stone-900">Cash on Delivery</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Pay in cash to courier rider</p>
              </label>

              {/* bKash */}
              <label
                className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                  paymentMethod === 'bkash'
                    ? 'border-pink-600 bg-pink-50/40 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === 'bkash'}
                    onChange={() => setPaymentMethod('bkash')}
                    className="text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-md">
                    bKash
                  </span>
                </div>
                <p className="text-xs font-bold text-stone-900">bKash Payment</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Pay via bKash personal/merchant</p>
              </label>

              {/* Nagad */}
              <label
                className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                  paymentMethod === 'nagad'
                    ? 'border-orange-600 bg-orange-50/40 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === 'nagad'}
                    onChange={() => setPaymentMethod('nagad')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                    Nagad
                  </span>
                </div>
                <p className="text-xs font-bold text-stone-900">Nagad Payment</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Pay via Nagad wallet</p>
              </label>
            </div>

            {/* bKash / Nagad instructions if selected */}
            {paymentMethod === 'bkash' && (
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-xs text-pink-900 space-y-1">
                <p className="font-bold">bKash Send Money / Payment Number: {storeSettings.phone}</p>
                <p className="text-[11px] text-pink-800">Please send ৳{grandTotal.toLocaleString('en-BD')} with reference 'GloCart' and keep your TrxID ready when courier delivers.</p>
              </div>
            )}
            {paymentMethod === 'nagad' && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 space-y-1">
                <p className="font-bold">Nagad Send Money Number: {storeSettings.phone}</p>
                <p className="text-[11px] text-orange-800">Please send ৳{grandTotal.toLocaleString('en-BD')} with reference 'GloCart'.</p>
              </div>
            )}
          </div>

          {/* Order Summary Breakdown */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Order Summary ({cartItems.length} items)
            </h4>

            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-stone-900">৳{subtotal.toLocaleString('en-BD')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount ({appliedCoupon}):</span>
                  <span className="font-semibold">-৳{discount.toLocaleString('en-BD')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charge ({district}):</span>
                <span className="font-semibold text-stone-900">
                  {deliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    `৳${deliveryCharge}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-black text-stone-950 pt-2 border-t border-stone-200">
                <span>Grand Total:</span>
                <span>৳{grandTotal.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-confirm-order"
            type="submit"
            disabled={isSubmitting || cartItems.length === 0}
            className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-amber-500/25 transition-all hover:scale-101 active:scale-99 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Confirming Order & Stock...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-stone-950" />
                <span>Place Order (৳{grandTotal.toLocaleString('en-BD')})</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
