import React from 'react';
import { CheckCircle2, ShoppingBag, Truck, ArrowRight, Copy, Check } from 'lucide-react';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderInfo: { orderId: string; orderNumber: string } | null;
  onOpenTracking: (orderNumber: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderInfo,
  onOpenTracking,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !orderInfo) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(orderInfo.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="order-success-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="order-success-card"
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 text-center p-6 sm:p-8 animate-in zoom-in-95 duration-250 space-y-5"
      >
        {/* Celebration Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-stone-950">
            Order Placed Successfully!
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Thank you for shopping with GloCart <span className="text-orange-500 font-bold">BD</span>. We are preparing your package for dispatch.
          </p>
        </div>

        {/* Order Number Box */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
          <p className="text-xs font-semibold text-stone-500">YOUR ORDER NUMBER</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg sm:text-xl font-black text-amber-600 tracking-wider">
              {orderInfo.orderNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
              title="Copy Order Number"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-stone-400">
            Keep this number to track your parcel with your phone number.
          </p>
        </div>

        {/* Delivery Details Note */}
        <div className="text-left p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-amber-600" /> Fast Courier Delivery:
          </p>
          <p className="text-[11px] text-amber-900">
            • Inside Dhaka: 24 - 48 Hours
            <br />
            • Outside Dhaka (All 64 Districts): 2 - 3 Days via Steadfast Courier
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            id="btn-success-track"
            onClick={() => {
              onClose();
              onOpenTracking(orderInfo.orderNumber);
            }}
            className="py-3 px-4 bg-stone-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Track Order</span>
          </button>

          <button
            id="btn-success-continue"
            onClick={onClose}
            className="py-3 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>
    </div>
  );
};
