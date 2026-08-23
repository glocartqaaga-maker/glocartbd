import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  Edit3, 
  ShoppingBag, 
  DollarSign, 
  Loader2, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle2
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Order } from '../../types';

export const AdminCustomersTab: React.FC = () => {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList: UserProfile[] = [];
      usersSnap.forEach((d) => {
        usersList.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setCustomers(usersList);

      // Orders to calculate stats
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const ordersList: Order[] = [];
      ordersSnap.forEach((d) => {
        ordersList.push({ id: d.id, ...d.data() } as Order);
      });
      setOrders(ordersList);
    } catch (err) {
      console.warn('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleToggleCustomerStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        status: newStatus,
      });
      setCustomers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, status: newStatus } : u))
      );
      setFeedback(`Customer account status set to ${newStatus}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const getCustomerMetrics = (uid: string) => {
    const userOrders = orders.filter((o) => o.customerId === uid && o.status !== 'cancelled');
    const totalSpent = userOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    return {
      orderCount: userOrders.length,
      totalSpent,
    };
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.district?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Customer Directory
          </h2>
          <p className="text-xs text-stone-500">
            Registered customer accounts, verified orders, total purchases, and account control.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search bar */}
      <div className="relative bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by customer name, mobile number, email, or district..."
          className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
        />
        <Search className="w-4 h-4 text-stone-400 absolute left-6.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading customer directory...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-stone-400 space-y-2 text-xs">
            <Users className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-stone-700">No customers registered yet</p>
            <p className="text-stone-500">Accounts created during checkout or sign-up will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Orders & Lifetime Spend</th>
                  <th className="py-3 px-4">Role / Status</th>
                  <th className="py-3 px-4 text-right">Account Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((customer) => {
                  const { orderCount, totalSpent } = getCustomerMetrics(customer.uid);
                  const isSuspended = customer.status === 'suspended';

                  return (
                    <tr key={customer.uid} className="hover:bg-stone-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                            {customer.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{customer.name || 'Unnamed Customer'}</p>
                            <p className="text-[10px] text-stone-400 font-mono">UID: {customer.uid.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-stone-800">{customer.phone || 'No phone set'}</p>
                        <p className="text-stone-500 text-[11px]">{customer.email}</p>
                      </td>

                      {/* District */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-stone-700">
                          {customer.district || 'Dhaka'}
                        </span>
                        {customer.area && <span className="text-stone-400 block text-[10px]">{customer.area}</span>}
                      </td>

                      {/* Orders & Spend */}
                      <td className="py-3 px-4">
                        <p className="font-extrabold text-stone-950">৳{totalSpent.toLocaleString('en-BD')}</p>
                        <p className="text-stone-500 text-[11px]">{orderCount} order(s)</p>
                      </td>

                      {/* Role & Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {customer.isAdmin ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md text-[10px]">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-700 font-medium rounded-md text-[10px]">
                              Customer
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </div>
                      </td>

                      {/* Control */}
                      <td className="py-3 px-4 text-right">
                        {!customer.isAdmin && (
                          <button
                            onClick={() => handleToggleCustomerStatus(customer)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isSuspended
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                            }`}
                          >
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
