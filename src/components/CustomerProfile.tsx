import React, { useState, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Save, 
  Loader2, 
  AlertCircle,
  Building
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BD_DISTRICTS } from '../lib/bd-locations';
import { Order } from '../types';

interface CustomerProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackSpecificOrder: (orderNumber: string) => void;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  isOpen,
  onClose,
  onTrackSpecificOrder,
}) => {
  const { currentUser, userProfile, updateCustomerProfile, resendVerification } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('orders');
  
  // Profile editing form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Orders history
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setDistrict(userProfile.district || 'Dhaka');
      setArea(userProfile.area || '');
      setAddress(userProfile.address || '');
    }
  }, [userProfile]);

  // Fetch customer orders from Firestore
  useEffect(() => {
    if (!isOpen || (!currentUser && !userProfile)) return;

    const fetchCustomerOrders = async () => {
      setLoadingOrders(true);
      const uid = currentUser?.uid || userProfile?.uid;
      const customerPhone = userProfile?.phone?.trim();

      try {
        const list: Order[] = [];
        const seenIds = new Set<string>();

        // 1. Query by customerId
        if (uid) {
          try {
            const qUid = query(
              collection(db, 'orders'),
              where('customerId', '==', uid)
            );
            const snapUid = await getDocs(qUid);
            snapUid.forEach((doc) => {
              if (!seenIds.has(doc.id)) {
                seenIds.add(doc.id);
                list.push({ id: doc.id, ...doc.data() } as Order);
              }
            });
          } catch (e) {
            console.warn('Orders query by customerId note:', e);
          }
        }

        // 2. Query by phone number if available
        if (customerPhone) {
          try {
            const qPhone = query(
              collection(db, 'orders'),
              where('phone', '==', customerPhone)
            );
            const snapPhone = await getDocs(qPhone);
            snapPhone.forEach((doc) => {
              if (!seenIds.has(doc.id)) {
                seenIds.add(doc.id);
                list.push({ id: doc.id, ...doc.data() } as Order);
              }
            });
          } catch (e) {
            console.warn('Orders query by phone note:', e);
          }
        }

        // Sort newest first in memory
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setOrders(list);
      } catch (err) {
        console.warn('Error fetching customer orders:', err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchCustomerOrders();
  }, [isOpen, currentUser, userProfile]);

  if (!isOpen || (!currentUser && !userProfile)) return null;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateCustomerProfile({
        name,
        phone,
        district,
        area,
        address,
      });
      setFeedback('Profile updated successfully!');
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      setFeedback('Failed to update profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendVerify = async () => {
    try {
      await resendVerification();
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      id="customer-profile-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="customer-profile-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl md:max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 my-6 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm shadow-md">
              {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                {userProfile?.name || 'Customer Account'}
              </h2>
              <p className="text-xs text-stone-500">
                {userProfile?.phone || currentUser?.email || userProfile?.email || 'Verified Customer'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 p-1">
          <button
            id="tab-profile-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-white text-stone-950 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <span>My Order History ({orders.length})</span>
          </button>

          <button
            id="tab-profile-edit"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-white text-stone-950 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <UserIcon className="w-4 h-4 text-amber-600" />
            <span>Profile & Address</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {loadingOrders ? (
                <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <p className="text-xs">Loading order history...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-bold text-stone-700">No orders placed yet</p>
                  <p className="text-xs text-stone-500">Your placed orders will show here with real-time status.</p>
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase">
                          Order Number
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">
                          {ord.orderNumber}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full capitalize ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          ord.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                          ord.status === 'shipped' ? 'bg-sky-100 text-sky-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.status}
                        </span>

                        <button
                          onClick={() => {
                            onClose();
                            onTrackSpecificOrder(ord.orderNumber);
                          }}
                          className="px-3 py-1 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3 text-amber-400" /> Track
                        </button>
                      </div>
                    </div>

                    {/* Items snippet */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 shrink-0 bg-white p-1.5 rounded-lg border border-stone-200 text-xs">
                          <img
                            src={it.image}
                            alt={it.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-md object-cover"
                          />
                          <span className="font-semibold text-stone-800 text-[11px] truncate max-w-[120px]">
                            {it.name}
                          </span>
                          <span className="text-[10px] text-stone-500 font-bold">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-200">
                      <span>Destination: <b>{ord.district}</b></span>
                      <span className="font-bold text-stone-950 text-sm">
                        Total: ৳{ord.grandTotal.toLocaleString('en-BD')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PROFILE EDIT TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4">
              {feedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* Email Verification status */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-stone-800">Email Verification</p>
                  <p className="text-[11px] text-stone-500">
                    {currentUser.emailVerified ? 'Your email is verified ✓' : 'Email verification is recommended.'}
                  </p>
                </div>
                {!currentUser.emailVerified && (
                  <button
                    type="button"
                    onClick={handleSendVerify}
                    className="px-3 py-1.5 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition-colors"
                  >
                    {verificationSent ? 'Verification Sent!' : 'Send Verification'}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <UserIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                    />
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">District</label>
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
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Area / Thana</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Uttara / Banani"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Default Delivery Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House, Road, Block..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="py-3 px-6 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile Changes</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
