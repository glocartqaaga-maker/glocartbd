import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Tag, 
  Sparkles,
  Truck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface CartDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onProceedCheckout?: () => void;
  onProceedToCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  onProceedCheckout, 
  onProceedToCheckout 
}) => {
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    subtotal, 
    discount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    storeSettings
  } = useCart();
  const { currentUser } = useAuth();
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  const shouldShow = isOpen !== undefined ? isOpen : isCartOpen;
  if (!shouldShow) return null;

  const handleClose = () => {
    setIsCartOpen(false);
    if (onClose) onClose();
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    if (onClose) onClose();
    if (typeof onProceedToCheckout === 'function') {
      onProceedToCheckout();
    } else if (typeof onProceedCheckout === 'function') {
      onProceedCheckout();
    }
  };

  const freeShippingThreshold = storeSettings.freeShippingThreshold || 2000;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const result = applyCoupon(couponInput);
    setCouponFeedback({
      msg: result.message,
      isError: !result.success,
    });
    if (result.success) {
      setCouponInput('');
    }
  };

  return (
    <div 
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        id="cart-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-stone-200"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-stone-900">Your Cart</h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
          <button
            id="btn-close-cart-drawer"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100/60">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              {remainingForFreeShipping === 0
                ? '🎉 Congratulations! Free Shipping Unlocked!'
                : `Add ৳${remainingForFreeShipping.toLocaleString('en-BD')} more for FREE shipping!`}
            </span>
            <span className="text-[11px] text-amber-800 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-amber-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-700">Your shopping cart is empty</p>
                <p className="text-xs text-stone-500 mt-1">Discover popular items and start adding!</p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold transition-all"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.productId}
                id={`cart-item-${item.productId}`}
                className="flex items-center gap-3 p-3 bg-stone-50/80 hover:bg-stone-50 rounded-2xl border border-stone-200/70 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs font-semibold text-stone-900 truncate leading-snug">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-stone-950">
                      ৳{item.price.toLocaleString('en-BD')}
                    </span>
                    {item.oldPrice && item.oldPrice > item.price && (
                      <span className="text-[10px] text-stone-400 line-through">
                        ৳{item.oldPrice.toLocaleString('en-BD')}
                      </span>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="px-2 py-1 text-stone-600 hover:bg-stone-100"
                        title="Decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-stone-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="px-2 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                        title="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer & Checkout Action */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/90 space-y-3">
            {/* Coupon Code Box */}
            <form onSubmit={handleApplyCoupon} className="space-y-1">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    Coupon '{appliedCoupon}' Applied (-৳{discount})
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-emerald-700 hover:text-emerald-900 font-bold underline text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Enter promo coupon (e.g. GLOCART10)"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 uppercase placeholder:normal-case focus:outline-hidden"
                    />
                    <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                  >
                    Apply
                  </button>
                </div>
              )}

              {couponFeedback && (
                <p className={`text-[11px] font-medium ${couponFeedback.isError ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {couponFeedback.msg}
                </p>
              )}
            </form>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-stone-600 pt-1 border-t border-stone-200">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-stone-900">৳{subtotal.toLocaleString('en-BD')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span>-৳{discount.toLocaleString('en-BD')}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>Delivery Charge</span>
                <span>Calculated at checkout (Dhaka ৳60 / Outside ৳120)</span>
              </div>
              <div className="flex justify-between text-sm font-black text-stone-950 pt-1.5 border-t border-stone-200">
                <span>Estimated Total</span>
                <span>৳{(subtotal - discount).toLocaleString('en-BD')}</span>
              </div>
            </div>

            {/* Proceed to Checkout Trigger */}
            <button
              id="btn-proceed-checkout"
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 hover:scale-101 active:scale-99 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
