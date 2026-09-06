import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  MapPin,
  Calendar,
  CreditCard
} from 'lucide-react';
import { trackOrder } from '../lib/orders';
import { Order } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber = '',
}) => {
  const [orderNumberInput, setOrderNumberInput] = useState(initialOrderNumber);
  const [phoneInput, setPhoneInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderNumber) {
      setOrderNumberInput(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  if (!isOpen) return null;

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOrder(null);

    if (!orderNumberInput.trim() || !phoneInput.trim()) {
      setErrorMsg('Please provide both your Order ID/Number and the matching Phone Number.');
      return;
    }

    setIsSearching(true);
    try {
      const foundOrder = await trackOrder(orderNumberInput, phoneInput);
      if (!foundOrder) {
        setErrorMsg('No order found matching this Order Number and Phone Number combination. Please verify your details.');
      } else {
        setOrder(foundOrder);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Tracking lookup error. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 1;
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  const currentStep = order ? getStatusStep(order.status) : 1;

  return (
    <div
      id="order-tracking-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="order-tracking-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 my-6"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                Live Parcel Tracking
              </h2>
              <p className="text-xs text-stone-500">
                Track your shipment status and courier consignment
              </p>
            </div>
          </div>
          <button
            id="btn-close-tracking-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Tracking Search Input Form */}
          <form onSubmit={handleTrackSubmit} className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Order ID or Number
                </label>
                <input
                  id="input-track-ordernum"
                  type="text"
                  required
                  value={orderNumberInput}
                  onChange={(e) => setOrderNumberInput(e.target.value)}
                  placeholder="e.g. GC-123456 or Doc ID"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="input-track-phone"
                  type="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              id="btn-search-tracking"
              type="submit"
              disabled={isSearching}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Find Order & Status</span>
            </button>
          </form>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Order Details Display */}
          {order && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Order Status Stepper */}
              <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      ORDER #{order.orderNumber}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Status: <span className="capitalize text-amber-400">{order.status}</span>
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    order.status === 'shipped' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>

                {order.status !== 'cancelled' ? (
                  <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px] sm:text-xs">
                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        currentStep >= 1 ? 'bg-amber-500 text-stone-950 shadow-md' : 'bg-stone-800 text-stone-500'
                      }`}>
                        1
                      </div>
                      <span className={currentStep >= 1 ? 'text-amber-400 font-bold' : 'text-stone-500'}>
                        Placed
                      </span>
                    </div>

                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        currentStep >= 2 ? 'bg-amber-500 text-stone-950 shadow-md' : 'bg-stone-800 text-stone-500'
                      }`}>
                        2
                      </div>
                      <span className={currentStep >= 2 ? 'text-amber-400 font-bold' : 'text-stone-500'}>
                        Processing
                      </span>
                    </div>

                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        currentStep >= 3 ? 'bg-amber-500 text-stone-950 shadow-md' : 'bg-stone-800 text-stone-500'
                      }`}>
                        3
                      </div>
                      <span className={currentStep >= 3 ? 'text-amber-400 font-bold' : 'text-stone-500'}>
                        Shipped
                      </span>
                    </div>

                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        currentStep >= 4 ? 'bg-emerald-500 text-white shadow-md' : 'bg-stone-800 text-stone-500'
                      }`}>
                        4
                      </div>
                      <span className={currentStep >= 4 ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
                        Delivered
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300">
                    This order was cancelled and inventory has been securely restored.
                  </div>
                )}
              </div>

              {/* Steadfast Courier Consignment Card */}
              {order.courier?.consignmentId && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-sky-600" />
                      Steadfast Courier Delivery
                    </span>
                    <span className="text-[10px] font-bold bg-sky-200 text-sky-900 px-2 py-0.5 rounded-md">
                      Dispatched
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-sky-900">
                    <div>
                      <p className="text-stone-500 text-[10px]">Consignment ID</p>
                      <p className="font-mono font-bold">{order.courier.consignmentId}</p>
                    </div>
                    {order.courier.trackingCode && (
                      <div>
                        <p className="text-stone-500 text-[10px]">Courier Tracking Code</p>
                        <p className="font-mono font-bold">{order.courier.trackingCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Address & Customer details */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" /> Delivery Destination
                </div>
                <div className="text-stone-600 space-y-0.5">
                  <p className="font-semibold text-stone-900">{order.customerName} ({order.phone})</p>
                  <p>{order.address}</p>
                  <p>{order.area}, {order.district}</p>
                  {order.note && <p className="text-amber-800 font-medium italic mt-1">Note: {order.note}</p>}
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Purchased Items ({order.items?.length || 0})
                </h4>
                <div className="space-y-2">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-stone-200 rounded-xl text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 bg-stone-50 rounded-lg border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 truncate">{item.name}</p>
                          <p className="text-stone-500 text-[11px]">Qty: {item.quantity} × ৳{item.price.toLocaleString('en-BD')}</p>
                        </div>
                      </div>
                      <span className="font-bold text-stone-950 shrink-0">
                        ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Billing */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>৳{order.subtotal.toLocaleString('en-BD')}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({order.couponCode || 'Promo'}):</span>
                      <span>-৳{order.discount.toLocaleString('en-BD')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>৳{order.deliveryCharge.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-stone-950 pt-1 border-t border-stone-200">
                    <span>Total Amount ({order.paymentMethod.toUpperCase()}):</span>
                    <span>৳{order.grandTotal.toLocaleString('en-BD')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
